import * as THREE from 'three';
import { Vec3 } from '../utils/math'; // Assuming Vec3 is defined in this path

// Define a basic Vec3 class if it's not available, for standalone functionality.
// If you have this defined elsewhere, you can remove this class.
if (typeof Vec3 === 'undefined') {
    class Vec3_Class {
        x: number;
        y: number;
        z: number;
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
    }
    (globalThis as any).Vec3 = Vec3_Class;
}


export interface RenderObject {
  id: string;
  mesh: THREE.Mesh;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color: Vec3;
  selected: boolean;
  visible: boolean;
  originalMaterial?: THREE.Material;
  meshData?: any;
}

export interface LightSettings {
  ambient: {
    intensity: number;
    color: [number, number, number];
  };
  directional: {
    intensity: number;
    color: [number, number, number];
    position: [number, number, number];
  };
  point: {
    intensity: number;
    color: [number, number, number];
    position: [number, number, number];
  };
}

export interface GridSettings {
  size: number;
  divisions: number;
  opacity: number;
  visible: boolean;
  snapEnabled: boolean;
  color: Vec3;
}

export class ThreeRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private objects: Map<string, RenderObject> = new Map();
  private lights: {
    ambient: THREE.AmbientLight;
    directional: THREE.DirectionalLight;
    point: THREE.PointLight;
  };
  private gridHelpers: THREE.GridHelper[] = [];
  private axes: THREE.AxesHelper | null = null;
  private gridSettings: GridSettings;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1e);

    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.lights = {
      ambient: new THREE.AmbientLight(0xffffff, 0.2),
      directional: new THREE.DirectionalLight(0xffffff, 0.8),
      point: new THREE.PointLight(0xffffff, 0.5, 100)
    };

    this.lights.directional.position.set(10, 10, 10);
    this.lights.directional.castShadow = true;
    this.lights.directional.shadow.mapSize.width = 2048;
    this.lights.directional.shadow.mapSize.height = 2048;
    this.lights.directional.shadow.camera.near = 0.5;
    this.lights.directional.shadow.camera.far = 50;

    this.lights.point.position.set(5, 5, 5);
    this.lights.point.castShadow = true;

    this.scene.add(this.lights.ambient);
    this.scene.add(this.lights.directional);
    this.scene.add(this.lights.point);

    this.gridSettings = {
      size: 10,
      divisions: 20,
      opacity: 0.3,
      visible: true,
      snapEnabled: true,
      color: new Vec3(0.5, 0.5, 0.5)
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.createGridHelpers();
    this.createAxes();
  }

  /**
   * Clears any existing grids and creates a single XZ grid helper based on grid settings.
   * The XZ grid lies flat on the "floor" of the scene.
   */
  private createGridHelpers(): void {
    // Clear any existing grid helpers from the scene and the local array
    this.gridHelpers.forEach(grid => this.scene.remove(grid));
    this.gridHelpers = [];

    // If the grid is not supposed to be visible, we stop here.
    if (!this.gridSettings.visible) {
      return;
    }

    const size = this.gridSettings.size * 2;
    const divisions = this.gridSettings.divisions;
    const color = new THREE.Color(
      this.gridSettings.color.x,
      this.gridSettings.color.y,
      this.gridSettings.color.z
    );

    // Create only the XZ plane grid (the "floor" grid)
    const gridXZ = new THREE.GridHelper(size, divisions, color, color);
    const material = gridXZ.material as THREE.LineBasicMaterial;
    material.opacity = this.gridSettings.opacity;
    material.transparent = true;
    gridXZ.visible = this.gridSettings.visible;

    this.scene.add(gridXZ);
    this.gridHelpers.push(gridXZ);
  }

  private createAxes(): void {
    if (this.axes) {
      this.scene.remove(this.axes);
    }
    this.axes = new THREE.AxesHelper(this.gridSettings.size);
    this.scene.add(this.axes);
  }

  addObject(id: string, geometry: THREE.BufferGeometry, color: Vec3): void {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color.x, color.y, color.z),
      shininess: 100,
      specular: 0x222222
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { id };

    const renderObject: RenderObject = {
      id,
      mesh,
      position: new Vec3(0, 0, 0),
      rotation: new Vec3(0, 0, 0),
      scale: new Vec3(1, 1, 1),
      color,
      selected: false,
      visible: true,
      originalMaterial: material
    };

    this.objects.set(id, renderObject);
    this.scene.add(mesh);
  }

  removeObject(id: string): void {
    const obj = this.objects.get(id);
    if (obj) {
      this.scene.remove(obj.mesh);
      obj.mesh.geometry.dispose();
      if (obj.mesh.material instanceof THREE.Material) {
        obj.mesh.material.dispose();
      }
      this.objects.delete(id);
    }
  }

  duplicateObject(id: string): string | null {
    const obj = this.objects.get(id);
    if (!obj) return null;

    const newId = `${id.split('-')[0]}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newGeometry = obj.mesh.geometry.clone();

    this.addObject(newId, newGeometry, obj.color);

    this.updateObject(newId, {
      position: new Vec3(obj.position.x + 1, obj.position.y, obj.position.z + 1),
      rotation: obj.rotation,
      scale: obj.scale
    });

    return newId;
  }

  updateObject(id: string, updates: Partial<RenderObject>): void {
    const obj = this.objects.get(id);
    if (!obj) return;

    if (updates.position) {
      obj.position = updates.position;
      obj.mesh.position.set(updates.position.x, updates.position.y, updates.position.z);
    }

    if (updates.rotation) {
      obj.rotation = updates.rotation;
      obj.mesh.rotation.set(updates.rotation.x, updates.rotation.y, updates.rotation.z);
    }

    if (updates.scale) {
      obj.scale = updates.scale;
      obj.mesh.scale.set(updates.scale.x, updates.scale.y, updates.scale.z);
    }

    if (updates.color) {
      obj.color = updates.color;
      const material = obj.mesh.material as THREE.MeshPhongMaterial;
      material.color.setRGB(updates.color.x, updates.color.y, updates.color.z);
    }

    if (updates.visible !== undefined) {
      obj.visible = updates.visible;
      obj.mesh.visible = updates.visible;
    }

    if (updates.selected !== undefined) {
      obj.selected = updates.selected;
      this.updateSelectionHighlight(obj);
    }
  }

  private updateSelectionHighlight(obj: RenderObject): void {
    const material = obj.mesh.material as THREE.MeshPhongMaterial;
    if (obj.selected) {
      material.emissive.setHex(0x004080);
      material.emissiveIntensity = 0.3;
    } else {
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
    }
  }

  setLightSettings(settings: LightSettings): void {
    this.lights.ambient.color.setRGB(...settings.ambient.color);
    this.lights.ambient.intensity = settings.ambient.intensity;

    this.lights.directional.color.setRGB(...settings.directional.color);
    this.lights.directional.intensity = settings.directional.intensity;
    this.lights.directional.position.set(...settings.directional.position);

    this.lights.point.color.setRGB(...settings.point.color);
    this.lights.point.intensity = settings.point.intensity;
    this.lights.point.position.set(...settings.point.position);
  }

  updateLighting(settings: LightSettings): void {
    this.setLightSettings(settings);
  }

  updateGridSettings(settings: GridSettings): void {
    this.gridSettings = { ...this.gridSettings, ...settings };
    this.createGridHelpers();
    this.createAxes();
  }

  updateCamera(position: Vec3, target: Vec3): void {
    this.camera.position.set(position.x, position.y, position.z);
    this.camera.lookAt(target.x, target.y, target.z);
    this.camera.updateProjectionMatrix();
  }

  getObjects(): RenderObject[] {
    return Array.from(this.objects.values());
  }

  getSelectedMesh(): THREE.Mesh | null {
    for (const obj of this.objects.values()) {
      if (obj.selected) {
        return obj.mesh;
      }
    }
    return null;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose(): void {
    this.objects.forEach(obj => {
      obj.mesh.geometry.dispose();
      if (obj.mesh.material instanceof THREE.Material) {
        obj.mesh.material.dispose();
      }
      this.scene.remove(obj.mesh);
    });
    this.objects.clear();

    this.gridHelpers.forEach(grid => this.scene.remove(grid));
    this.gridHelpers = [];

    if (this.axes) {
      this.scene.remove(this.axes);
      this.axes = null;
    }

    this.renderer.dispose();
  }

  getObjectAtPoint(x: number, y: number): string | null {
    const canvasBounds = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((x - canvasBounds.left) / canvasBounds.width) * 2 - 1;
    this.mouse.y = -((y - canvasBounds.top) / canvasBounds.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      Array.from(this.objects.values()).map(obj => obj.mesh),
      true
    );

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const id = mesh.userData.id;
      return id || null;
    }

    return null;
  }

  getIntersectionPoint(x: number, y: number): Vec3 | null {
    const canvasBounds = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((x - canvasBounds.left) / canvasBounds.width) * 2 - 1;
    this.mouse.y = -((y - canvasBounds.top) / canvasBounds.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      return new Vec3(intersectPoint.x, intersectPoint.y, intersectPoint.z);
    }

    return null;
  }

  snapToGrid(point: Vec3): Vec3 {
    if (!this.gridSettings.snapEnabled) return point;

    const size = this.gridSettings.size;
    const divisions = this.gridSettings.divisions;
    const step = (size * 2) / divisions;

    const snap = (v: number) => Math.round(v / step) * step;

    return new Vec3(snap(point.x), snap(point.y), snap(point.z));
  }
}

import * as THREE from 'three';
import { Vec3 } from '../utils/math'; // Assuming Vec3 is defined in this path

// Define a basic Vec3 class if it's not available, for standalone functionality.
// If you have this defined elsewhere, you can remove this class.
// This check ensures it won't be redefined if it already exists globally or is imported.
if (typeof (globalThis as any).Vec3 === 'undefined') {
    class Vec3_Class {
        x: number;
        y: number;
        z: number;
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }

        clone(): Vec3_Class {
            return new Vec3_Class(this.x, this.y, this.z);
        }

        copy(v: Vec3_Class): this {
            this.x = v.x;
            this.y = v.y;
            this.z = v.z;
            return this;
        }

        add(v: Vec3_Class): this {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
            return this;
        }

        subtract(v: Vec3_Class): this {
            this.x -= v.x;
            this.y -= v.y;
            this.z -= v.z;
            return this;
        }

        multiplyScalar(s: number): this {
            this.x *= s;
            this.y *= s;
            this.z *= s;
            return this;
        }

        normalize(): this {
            const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
            if (length > 0) {
                this.x /= length;
                this.y /= length;
                this.z /= length;
            }
            return this;
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
        // Set thresholds for line and point intersections to make them easier to pick
        this.raycaster.params.Line = { threshold: 0.1 };
        this.raycaster.params.Points = { threshold: 0.1 };


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

        const size = this.gridSettings.size * 20;
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
        this.axes = new THREE.AxesHelper(this.gridSettings.size * 10);
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
        mesh.userData = { id }; // Store the custom ID in userData

        const renderObject: RenderObject = {
            id,
            mesh,
            position: new Vec3(0, 0, 0),
            rotation: new Vec3(0, 0, 0),
            scale: new Vec3(1, 1, 1),
            color,
            selected: false,
            visible: true,
            originalMaterial: material // Store original material to revert selection highlight
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

    /**
     * Estimates the pixel size of an object on the screen.
     * This helps determine a dynamic click tolerance for smaller objects.
     */
    private _getObjectScreenSize(mesh: THREE.Mesh): number {
        if (!mesh.geometry.boundingBox) {
            mesh.geometry.computeBoundingBox();
        }
        const box = mesh.geometry.boundingBox!;
        const center = new THREE.Vector3();
        box.getCenter(center);
        mesh.localToWorld(center); // Convert mesh's local center to world coordinates

        const tempSphere = new THREE.Sphere();
        box.getBoundingSphere(tempSphere);
        tempSphere.applyMatrix4(mesh.matrixWorld); // Transform the bounding sphere to world space

        const distance = this.camera.position.distanceTo(tempSphere.center);
        const radius = tempSphere.radius;

        // Calculate visible height/width of sphere in world units at the object's distance
        // This is simplified; for true screen size, you'd project bounding box corners.
        // For a sphere, its projected radius in screen space is more accurate.
        const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
        const halfHeightAtDistance = Math.tan(fovRad / 2) * distance;
        const screenHeightWorld = halfHeightAtDistance * 2;
        const screenWidthWorld = screenHeightWorld * this.camera.aspect;

        const pixelHeight = (radius * 2 / screenHeightWorld) * this.renderer.domElement.clientHeight;
        const pixelWidth = (radius * 2 / screenWidthWorld) * this.renderer.domElement.clientWidth;

        return Math.max(pixelHeight, pixelWidth); // Return the larger dimension for tolerance
    }


    /**
     * Gets the ID of the object clicked at the given screen coordinates.
     * This version includes a screen-space tolerance for easier selection of small objects.
     */
    getObjectAtPoint(x: number, y: number): string | null {
        const canvasBounds = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((x - canvasBounds.left) / canvasBounds.width) * 2 - 1;
        this.mouse.y = -((y - canvasBounds.top) / canvasBounds.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const clickableMeshes = Array.from(this.objects.values()).map(obj => obj.mesh);

        let closestObjectId: string | null = null;
        let minDistance = Infinity; // For closest actual intersection

        const baseClickTolerance = 900; // Base pixel tolerance for selection, adjust as needed

        // First, check for objects that are "near" the click in screen space
        for (const mesh of clickableMeshes) {
            if (!mesh.userData || !mesh.userData.id || !mesh.visible) {
                continue;
            }

            // Project the mesh's center to screen space
            const worldPosition = new THREE.Vector3();
            mesh.getWorldPosition(worldPosition); // Get the mesh's world position
            const screenPosition = worldPosition.project(this.camera);

            const screenX = (screenPosition.x * 0.5 + 0.5) * canvasBounds.width;
            const screenY = (-screenPosition.y * 0.5 + 0.5) * canvasBounds.height;

            const distToCenterSq = (screenX - x) * (screenX - x) + (screenY - y) * (screenY - y);

            const objectScreenSize = this._getObjectScreenSize(mesh);
            // Dynamic tolerance: smaller objects get a larger effective click area
            const effectiveTolerance = Math.max(baseClickTolerance, objectScreenSize * 0.5); // 50% of object's screen size or base tolerance

            if (distToCenterSq <= effectiveTolerance * effectiveTolerance) {
                // If within screen-space tolerance, perform a precise raycast on this object
                const intersects = this.raycaster.intersectObject(mesh, true);
                if (intersects.length > 0) {
                    const distance = intersects[0].distance;
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestObjectId = mesh.userData.id;
                    }
                }
            }
        }

        if (closestObjectId) {
            return closestObjectId;
        }

        // Fallback: If no object was found within the screen-space tolerance,
        // perform a direct raycast on all objects to catch precise clicks on large objects.
        const directIntersects = this.raycaster.intersectObjects(clickableMeshes, true);

        if (directIntersects.length > 0) {
            const mesh = directIntersects[0].object as THREE.Mesh;
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

        // Attempt to intersect with existing objects first for surface snapping
        const objectsToIntersect = Array.from(this.objects.values())
            .filter(obj => obj.visible) // Only intersect with visible objects
            .map(obj => obj.mesh);

        const intersects = this.raycaster.intersectObjects(objectsToIntersect, true);

        if (intersects.length > 0) {
            // Return the first intersection point found on an object
            const intersection = intersects[0];
            return new Vec3(intersection.point.x, intersection.point.y, intersection.point.z);
        }

        // Fallback to intersecting with an invisible plane (e.g., ground plane) if no object is hit
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // XZ plane at Y=0
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, intersectPoint);

        if (intersectPoint) {
            return new Vec3(intersectPoint.x, intersectPoint.y, intersectPoint.z);
        }

        return null;
    }

    snapToGrid(point: Vec3): Vec3 {
        if (!this.gridSettings.snapEnabled) return point;

        // The grid size and divisions define the step
        // Assuming the grid is centered at 0,0,0 and spans size*2 in X and Z
        const step = (this.gridSettings.size * 2) / this.gridSettings.divisions;

        const snap = (v: number) => {
            // Apply a small epsilon to avoid floating point issues near exact half-steps
            return Math.round(v / step + Number.EPSILON) * step;
        };

        return new Vec3(snap(point.x), snap(point.y), snap(point.z));
    }
}

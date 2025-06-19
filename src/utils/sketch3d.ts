import * as THREE from 'three';
import { Vec3 } from './math';

export interface SketchPoint3D {
  position: THREE.Vector3;
  id: string;
  onSurface?: boolean;
  surfaceNormal?: THREE.Vector3;
}

export interface SketchShape3D {
  type: 'line' | 'rectangle' | 'circle' | 'polygon' | 'spline';
  points: SketchPoint3D[];
  id: string;
  closed: boolean;
  workplane?: THREE.Plane;
  normal?: THREE.Vector3;
}

export class SketchEngine3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private shapes: SketchShape3D[] = [];
  private currentTool: string = 'line';
  private sketchMode: 'surface' | 'plane' | 'free' = 'surface';
  private isDrawing: boolean = false;
  private currentShape: SketchShape3D | null = null;
  private workplane: THREE.Mesh | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  
  private snapToGrid: boolean = true;
  private gridSize: number = 0.5;
  private workplaneVisible: boolean = true;
  
  private sketchLines: THREE.Line[] = [];
  private sketchMeshes: THREE.Mesh[] = [];
  private previewLine: THREE.Line | null = null;
  private previewMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  // Event handlers that will be called from Viewport3D
  handleClick(event: MouseEvent): boolean {
    this.updateMousePosition(event);
    
    if (!this.workplane && (this.sketchMode === 'surface' || this.sketchMode === 'plane')) {
      return this.createWorkplane();
    } else if (this.workplane) {
      this.addSketchPoint();
      return true;
    }
    return false;
  }

  handleMouseDown(event: MouseEvent): boolean {
    if (event.button === 0 && this.workplane) { // Left click
      this.updateMousePosition(event);
      this.startDrawing();
      return true;
    }
    return false;
  }

  handleMouseMove(event: MouseEvent): boolean {
    this.updateMousePosition(event);
    
    if (this.isDrawing && this.currentShape) {
      this.updatePreview();
      return true;
    }
    return false;
  }

  handleMouseUp(event: MouseEvent): boolean {
    if (event.button === 0 && this.isDrawing) { // Left click
      this.finishDrawing();
      return true;
    }
    return false;
  }

  handleDoubleClick(event: MouseEvent): boolean {
    if (this.currentTool === 'polygon' && this.currentShape) {
      this.finishPolygon();
      return true;
    }
    return false;
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private createWorkplane(): boolean {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    if (this.sketchMode === 'surface') {
      // Get all meshes in the scene (excluding existing workplane and grid)
      const meshes = this.scene.children.filter(child => 
        child instanceof THREE.Mesh && 
        child !== this.workplane && 
        child !== this.gridHelper &&
        !this.sketchLines.includes(child as any) &&
        !this.sketchMeshes.includes(child)
      ) as THREE.Mesh[];
      
      const intersects = this.raycaster.intersectObjects(meshes);
      
      if (intersects.length > 0) {
        const intersection = intersects[0];
        const point = intersection.point;
        const normal = intersection.face?.normal || new THREE.Vector3(0, 1, 0);
        
        // Transform normal to world space
        const worldNormal = normal.clone().transformDirection(intersection.object.matrixWorld);
        
        this.createWorkplaneAt(point, worldNormal);
        return true;
      }
    } else if (this.sketchMode === 'plane') {
      // Create workplane at a fixed distance from camera
      const distance = 5;
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      
      const point = this.camera.position.clone().add(direction.multiplyScalar(distance));
      const normal = direction.negate();
      
      this.createWorkplaneAt(point, normal);
      return true;
    }
    
    return false;
  }

  private createWorkplaneAt(position: THREE.Vector3, normal: THREE.Vector3): void {
    // Remove existing workplane
    this.clearWorkplane();
    
    // Create workplane geometry
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: this.workplaneVisible ? 0.2 : 0,
      side: THREE.DoubleSide
    });
    
    this.workplane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.workplane.position.copy(position);
    this.workplane.lookAt(position.clone().add(normal));
    
    // Create grid helper
    this.gridHelper = new THREE.GridHelper(10, 10 / this.gridSize, 0x4ade80, 0x4ade80);
    this.gridHelper.position.copy(position);
    this.gridHelper.lookAt(position.clone().add(normal));
    
    // Make grid helper match workplane orientation
    this.gridHelper.rotation.copy(this.workplane.rotation);
    
    this.scene.add(this.workplane);
    if (this.workplaneVisible) {
      this.scene.add(this.gridHelper);
    }
  }

  private clearWorkplane(): void {
    if (this.workplane) {
      this.scene.remove(this.workplane);
      this.workplane = null;
    }
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper = null;
    }
  }

  private startDrawing(): void {
    if (!this.workplane) return;
    
    const point = this.getWorkplaneIntersection();
    if (!point) return;
    
    this.isDrawing = true;
    
    switch (this.currentTool) {
      case 'line':
        this.startLine(point);
        break;
      case 'rectangle':
        this.startRectangle(point);
        break;
      case 'circle':
        this.startCircle(point);
        break;
      case 'polygon':
        this.addPolygonPoint(point);
        break;
      case 'spline':
        this.startSpline(point);
        break;
    }
  }

  private finishDrawing(): void {
    if (!this.isDrawing || !this.currentShape) return;
    
    const point = this.getWorkplaneIntersection();
    if (!point) return;
    
    switch (this.currentTool) {
      case 'line':
        this.finishLine(point);
        break;
      case 'rectangle':
        this.finishRectangle(point);
        break;
      case 'circle':
        this.finishCircle(point);
        break;
      case 'spline':
        this.addSplinePoint(point);
        break;
    }
    
    this.isDrawing = false;
  }

  private getWorkplaneIntersection(): THREE.Vector3 | null {
    if (!this.workplane) return null;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.workplane);
    
    if (intersects.length > 0) {
      let point = intersects[0].point;
      
      if (this.snapToGrid) {
        point = this.snapPointToGrid(point);
      }
      
      return point;
    }
    
    return null;
  }

  private snapPointToGrid(point: THREE.Vector3): THREE.Vector3 {
    if (!this.workplane) return point;
    
    // Convert world point to workplane local coordinates
    const localPoint = this.workplane.worldToLocal(point.clone());
    
    // Snap to grid
    localPoint.x = Math.round(localPoint.x / this.gridSize) * this.gridSize;
    localPoint.y = Math.round(localPoint.y / this.gridSize) * this.gridSize;
    localPoint.z = 0; // Keep on workplane
    
    // Convert back to world coordinates
    return this.workplane.localToWorld(localPoint);
  }

  private startLine(startPoint: THREE.Vector3): void {
    this.currentShape = {
      type: 'line',
      points: [{
        position: startPoint.clone(),
        id: `point-${Date.now()}`,
        onSurface: true
      }],
      id: `line-${Date.now()}`,
      closed: false
    };
  }

  private finishLine(endPoint: THREE.Vector3): void {
    if (!this.currentShape) return;
    
    this.currentShape.points.push({
      position: endPoint.clone(),
      id: `point-${Date.now()}`,
      onSurface: true
    });
    
    this.createSketchLine(this.currentShape);
    this.shapes.push(this.currentShape);
    this.currentShape = null;
  }

  private startRectangle(startPoint: THREE.Vector3): void {
    this.currentShape = {
      type: 'rectangle',
      points: [{
        position: startPoint.clone(),
        id: `point-${Date.now()}`,
        onSurface: true
      }],
      id: `rect-${Date.now()}`,
      closed: true
    };
  }

  private finishRectangle(endPoint: THREE.Vector3): void {
    if (!this.currentShape) return;
    
    const startPoint = this.currentShape.points[0].position;
    
    // Create rectangle points
    this.currentShape.points = [
      this.currentShape.points[0],
      {
        position: new THREE.Vector3(endPoint.x, startPoint.y, startPoint.z),
        id: `point-${Date.now()}`,
        onSurface: true
      },
      {
        position: endPoint.clone(),
        id: `point-${Date.now()}`,
        onSurface: true
      },
      {
        position: new THREE.Vector3(startPoint.x, endPoint.y, startPoint.z),
        id: `point-${Date.now()}`,
        onSurface: true
      }
    ];
    
    this.createSketchLine(this.currentShape);
    this.shapes.push(this.currentShape);
    this.currentShape = null;
  }

  private startCircle(centerPoint: THREE.Vector3): void {
    this.currentShape = {
      type: 'circle',
      points: [{
        position: centerPoint.clone(),
        id: `point-${Date.now()}`,
        onSurface: true
      }],
      id: `circle-${Date.now()}`,
      closed: true
    };
  }

  private finishCircle(edgePoint: THREE.Vector3): void {
    if (!this.currentShape) return;
    
    this.currentShape.points.push({
      position: edgePoint.clone(),
      id: `point-${Date.now()}`,
      onSurface: true
    });
    
    this.createSketchCircle(this.currentShape);
    this.shapes.push(this.currentShape);
    this.currentShape = null;
  }

  private addPolygonPoint(point: THREE.Vector3): void {
    if (!this.currentShape) {
      this.currentShape = {
        type: 'polygon',
        points: [],
        id: `polygon-${Date.now()}`,
        closed: false
      };
    }
    
    this.currentShape.points.push({
      position: point.clone(),
      id: `point-${Date.now()}`,
      onSurface: true
    });
    
    this.updatePolygonPreview();
  }

  private finishPolygon(): void {
    if (!this.currentShape || this.currentShape.points.length < 3) return;
    
    this.currentShape.closed = true;
    this.createSketchLine(this.currentShape);
    this.shapes.push(this.currentShape);
    this.currentShape = null;
    this.clearPreview();
  }

  private startSpline(startPoint: THREE.Vector3): void {
    this.currentShape = {
      type: 'spline',
      points: [{
        position: startPoint.clone(),
        id: `point-${Date.now()}`,
        onSurface: true
      }],
      id: `spline-${Date.now()}`,
      closed: false
    };
  }

  private addSplinePoint(point: THREE.Vector3): void {
    if (!this.currentShape) return;
    
    this.currentShape.points.push({
      position: point.clone(),
      id: `point-${Date.now()}`,
      onSurface: true
    });
    
    this.updateSplinePreview();
  }

  private createSketchLine(shape: SketchShape3D): void {
    const points = shape.points.map(p => p.position);
    
    if (shape.closed && points.length > 2) {
      // Close the shape
      points.push(points[0]);
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      linewidth: 3
    });
    
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.sketchLines.push(line);
  }

  private createSketchCircle(shape: SketchShape3D): void {
    if (shape.points.length < 2) return;
    
    const center = shape.points[0].position;
    const edge = shape.points[1].position;
    const radius = center.distanceTo(edge);
    
    // Create circle outline
    const circleGeometry = new THREE.RingGeometry(radius * 0.98, radius * 1.02, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.position.copy(center);
    
    if (this.workplane) {
      circle.rotation.copy(this.workplane.rotation);
    }
    
    this.scene.add(circle);
    this.sketchMeshes.push(circle);
  }

  private updatePreview(): void {
    if (!this.currentShape) return;
    
    const point = this.getWorkplaneIntersection();
    if (!point) return;
    
    switch (this.currentTool) {
      case 'line':
        this.updateLinePreview(point);
        break;
      case 'rectangle':
        this.updateRectanglePreview(point);
        break;
      case 'circle':
        this.updateCirclePreview(point);
        break;
    }
  }

  private updateLinePreview(endPoint: THREE.Vector3): void {
    if (!this.currentShape) return;
    
    this.clearPreview();
    
    const startPoint = this.currentShape.points[0].position;
    const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const material = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.5
    });
    
    this.previewLine = new THREE.Line(geometry, material);
    this.scene.add(this.previewLine);
  }

  private updateRectanglePreview(endPoint: THREE.Vector3): void {
    if (!this.currentShape) return;
    
    this.clearPreview();
    
    const startPoint = this.currentShape.points[0].position;
    const points = [
      startPoint,
      new THREE.Vector3(endPoint.x, startPoint.y, startPoint.z),
      endPoint,
      new THREE.Vector3(startPoint.x, endPoint.y, startPoint.z),
      startPoint
    ];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.5
    });
    
    this.previewLine = new THREE.Line(geometry, material);
    this.scene.add(this.previewLine);
  }

  private updateCirclePreview(edgePoint: THREE.Vector3): void {
    if (!this.currentShape) return;
    
    this.clearPreview();
    
    const center = this.currentShape.points[0].position;
    const radius = center.distanceTo(edgePoint);
    
    const geometry = new THREE.RingGeometry(radius * 0.98, radius * 1.02, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    const circle = new THREE.Mesh(geometry, material);
    circle.position.copy(center);
    
    if (this.workplane) {
      circle.rotation.copy(this.workplane.rotation);
    }
    
    this.scene.add(circle);
    this.previewMesh = circle;
  }

  private updatePolygonPreview(): void {
    if (!this.currentShape || this.currentShape.points.length < 2) return;
    
    this.clearPreview();
    
    const points = this.currentShape.points.map(p => p.position);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.7
    });
    
    this.previewLine = new THREE.Line(geometry, material);
    this.scene.add(this.previewLine);
  }

  private updateSplinePreview(): void {
    if (!this.currentShape || this.currentShape.points.length < 2) return;
    
    this.clearPreview();
    
    const points = this.currentShape.points.map(p => p.position);
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
    const material = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.7
    });
    
    this.previewLine = new THREE.Line(geometry, material);
    this.scene.add(this.previewLine);
  }

  private clearPreview(): void {
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine = null;
    }
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh = null;
    }
  }

  // Public methods
  setTool(tool: string): void {
    this.currentTool = tool;
    this.finishCurrentSketch();
  }

  setSketchMode(mode: 'surface' | 'plane' | 'free'): void {
    this.sketchMode = mode;
    this.clearWorkplane();
  }

  setSnapToGrid(snap: boolean): void {
    this.snapToGrid = snap;
  }

  setGridSize(size: number): void {
    this.gridSize = size;
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      // Recreate grid with new size
      if (this.workplane && this.workplaneVisible) {
        this.gridHelper = new THREE.GridHelper(10, 10 / this.gridSize, 0x4ade80, 0x4ade80);
        this.gridHelper.position.copy(this.workplane.position);
        this.gridHelper.rotation.copy(this.workplane.rotation);
        this.scene.add(this.gridHelper);
      }
    }
  }

  setWorkplaneVisible(visible: boolean): void {
    this.workplaneVisible = visible;
    
    if (this.workplane) {
      const material = this.workplane.material as THREE.MeshBasicMaterial;
      material.opacity = visible ? 0.2 : 0;
    }
    
    if (this.gridHelper) {
      this.gridHelper.visible = visible;
    }
  }

  finishCurrentSketch(): void {
    if (this.currentShape) {
      if (this.currentTool === 'polygon' && this.currentShape.points.length >= 3) {
        this.finishPolygon();
      } else if (this.currentTool === 'spline' && this.currentShape.points.length >= 2) {
        this.createSketchLine(this.currentShape);
        this.shapes.push(this.currentShape);
        this.currentShape = null;
      }
    }
    this.clearPreview();
    this.isDrawing = false;
  }

  getShapes(): SketchShape3D[] {
    return [...this.shapes];
  }

  clear(): void {
    this.shapes = [];
    this.currentShape = null;
    this.isDrawing = false;
    
    // Remove all sketch lines and meshes
    this.sketchLines.forEach(line => this.scene.remove(line));
    this.sketchLines = [];
    
    this.sketchMeshes.forEach(mesh => this.scene.remove(mesh));
    this.sketchMeshes = [];
    
    this.clearPreview();
    this.clearWorkplane();
  }

  dispose(): void {
    this.clear();
  }
}
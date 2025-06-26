import * as THREE from 'three';

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
  private sketchPoints: THREE.Mesh[] = [];

  // Drawing state
  private startPoint: THREE.Vector3 | null = null;
  private isDragging: boolean = false;
  private hasWorkplane: boolean = false;

  // Multi-line drawing state for connected lines
  private multiLinePoints: THREE.Vector3[] = [];
  private isMultiLineMode: boolean = false;

  private clearWorkplane(): void {
    if (this.workplane) {
      this.scene.remove(this.workplane);
      this.workplane.geometry.dispose();
      (this.workplane.material as THREE.Material).dispose();
      this.workplane = null;
    }
  
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      (this.gridHelper.material as THREE.Material).dispose();
      this.gridHelper = null;
    }
  
    this.hasWorkplane = false;
    console.log('Workplane cleared');
  }

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  // Main event handlers
  handleClick(event: MouseEvent): boolean {
    this.updateMousePosition(event);

    // Ignore click if currently dragging (to avoid conflicts)
    if (this.isDragging) return false;

    if (!this.hasWorkplane) {
      return this.createWorkplane();
    }

    switch (this.currentTool) {
      case 'line':
        return this.handleLineClick();
      case 'rectangle':
        // rectangle uses drag only, ignore click
        return false;
      case 'circle':
        // circle uses drag only, ignore click
        return false;
      case 'polygon':
        return this.handlePolygonClick();
      default:
        return false;
    }
  }

  // Start dragging for rectangle or circle
  handleMouseDown(event: MouseEvent): boolean {
    if (event.button !== 0 || !this.hasWorkplane) return false;

    this.updateMousePosition(event);

    if (this.currentTool === 'rectangle' || this.currentTool === 'circle') {
      return this.startDragOperation();
    }

    return false;
  }

  // Update preview during dragging
  handleMouseMove(event: MouseEvent): boolean {
    this.updateMousePosition(event);

    if (this.isDragging && this.hasWorkplane) {
      this.updateDragPreview();
      return true;
    }

    // Show preview for multi-line mode
    if (this.isMultiLineMode && this.multiLinePoints.length > 0) {
      this.updateMultiLinePreview();
      return true;
    }

    return false;
  }

  // Finish drawing shape on mouse up if dragging
  handleMouseUp(event: MouseEvent): boolean {
    if (this.isDragging && this.hasWorkplane) {
      this.finishDragOperation();
      return true;
    }
    return false;
  }

  handleDoubleClick(event: MouseEvent): boolean {
    if (this.currentTool === 'polygon' && this.currentShape) {
      this.finishPolygon();
      return true;
    }
    
    // Double-click to finish multi-line drawing
    if (this.currentTool === 'line' && this.isMultiLineMode && this.multiLinePoints.length >= 2) {
      this.finishMultiLine();
      return true;
    }
    
    return false;
  }

  // Tool-specific handlers
  private handleLineClick(): boolean {
    const point = this.getWorkplaneIntersection();
    if (!point) return false;

    if (!this.isMultiLineMode) {
      // Start multi-line mode
      this.isMultiLineMode = true;
      this.multiLinePoints = [point.clone()];
      this.addSketchPoint(point);
      console.log('Started multi-line drawing at:', point);
    } else {
      // Add point to multi-line
      this.multiLinePoints.push(point.clone());
      this.addSketchPoint(point);
      this.updateMultiLinePreview();
      console.log('Added point to multi-line:', point);
    }
    
    return true;
  }

  private handlePolygonClick(): boolean {
    const point = this.getWorkplaneIntersection();
    if (!point) return false;

    if (!this.currentShape) {
      this.currentShape = {
        type: 'polygon',
        points: [{
          position: point.clone(),
          id: `point-${Date.now()}`,
          onSurface: true
        }],
        id: `polygon-${Date.now()}`,
        closed: false
      };
      this.addSketchPoint(point);
      console.log('Started polygon at:', point);
    } else {
      this.currentShape.points.push({
        position: point.clone(),
        id: `point-${Date.now()}`,
        onSurface: true
      });
      this.addSketchPoint(point);
      this.updatePolygonPreview();
    }
    return true;
  }

  // Drag operations
  private startDragOperation(): boolean {
    const point = this.getWorkplaneIntersection();
    if (!point) return false;
  
    this.startPoint = point.clone();
    this.isDragging = true;
  
    this.clearPreview();
    this.addSketchPoint(point);
    console.log(`Started dragging ${this.currentTool} at:`, point);
    return true;
  }

  private updateDragPreview(): void {
    if (!this.startPoint) return;
    const currentPoint = this.getWorkplaneIntersection();
    if (!currentPoint) return;
  
    this.clearPreview();
  
    if (this.currentTool === 'rectangle') {
      this.createRectanglePreview(this.startPoint, currentPoint);
    } else if (this.currentTool === 'circle') {
      this.createCirclePreview(this.startPoint, currentPoint);
    }
  }
  
  private finishDragOperation(): void {
    if (!this.startPoint) return;
  
    const endPoint = this.getWorkplaneIntersection();
    if (!endPoint) {
      console.warn('No end point found on drag finish!');
      this.isDragging = false;
      this.startPoint = null;
      this.clearPreview();
      return;
    }
  
    console.log('Drag finished from', this.startPoint, 'to', endPoint);
  
    // Check distance threshold to avoid zero-area shapes
    if (this.startPoint.distanceTo(endPoint) < 0.01) {
      console.warn("Drag distance too small; ignoring shape creation.");
      this.isDragging = false;
      this.startPoint = null;
      this.clearPreview();
      return;
    }
  
    if (this.currentTool === 'rectangle') {
      this.finishRectangle(endPoint);
    } else if (this.currentTool === 'circle') {
      this.finishCircle(endPoint);
    }
  
    this.isDragging = false;
    this.startPoint = null;
    this.clearPreview();
  }

  // Multi-line drawing methods
  private updateMultiLinePreview(): void {
    if (this.multiLinePoints.length === 0) return;
    
    const currentPoint = this.getWorkplaneIntersection();
    if (!currentPoint) return;

    this.clearPreview();

    // Create preview line from last point to current mouse position
    const previewPoints = [...this.multiLinePoints, currentPoint];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(previewPoints);
    const material = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.7,
      linewidth: 2
    });

    this.previewLine = new THREE.Line(geometry, material);
    this.scene.add(this.previewLine);
  }

  private finishMultiLine(): void {
    if (this.multiLinePoints.length < 2) return;

    // Create a closed polygon from the multi-line points
    const shape: SketchShape3D = {
      type: 'polygon', // Changed from 'line' to 'polygon' for extrusion
      points: this.multiLinePoints.map((pos, i) => ({
        position: pos.clone(),
        id: `point-${Date.now()}-${i}`,
        onSurface: true
      })),
      id: `multiline-${Date.now()}`,
      closed: true // Mark as closed for extrusion
    };

    this.createSketchLine(shape);
    this.shapes.push(shape);
    console.log('Created multi-line shape (as closed polygon):', shape);

    // Reset multi-line state
    this.isMultiLineMode = false;
    this.multiLinePoints = [];
    this.clearPreview();
  }

  // Shape completion methods
  private finishRectangle(endPoint: THREE.Vector3): void {
    if (!this.startPoint) return;

    const start = this.startPoint;
    const end = endPoint;

    // Convert to local workplane coordinates for rectangle corner calculation
    const startLocal = this.worldToWorkplane(start);
    const endLocal = this.worldToWorkplane(end);

    const corners = [
      new THREE.Vector3(startLocal.x, startLocal.y, 0),
      new THREE.Vector3(endLocal.x, startLocal.y, 0),
      new THREE.Vector3(endLocal.x, endLocal.y, 0),
      new THREE.Vector3(startLocal.x, endLocal.y, 0)
    ];

    const worldCorners = corners.map(corner => this.workplaneToWorld(corner));

    const shape: SketchShape3D = {
      type: 'rectangle',
      points: worldCorners.map((pos, i) => ({
        position: pos,
        id: `point-${Date.now()}-${i}`,
        onSurface: true
      })),
      id: `rect-${Date.now()}`,
      closed: true
    };

    worldCorners.forEach(corner => this.addSketchPoint(corner));
    this.createSketchLine(shape);
    this.shapes.push(shape);
    console.log('Created rectangle shape:', shape);
  }

  private finishCircle(edgePoint: THREE.Vector3): void {
    if (!this.startPoint) return;

    const shape: SketchShape3D = {
      type: 'circle',
      points: [
        {
          position: this.startPoint.clone(),
          id: `point-${Date.now()}`,
          onSurface: true
        },
        {
          position: edgePoint.clone(),
          id: `point-${Date.now()}`,
          onSurface: true
        }
      ],
      id: `circle-${Date.now()}`,
      closed: true
    };

    this.addSketchPoint(edgePoint);
    this.createSketchCircle(shape);
    this.shapes.push(shape);
    console.log('Created circle:', shape);
  }

  private finishPolygon(): void {
    if (!this.currentShape || this.currentShape.points.length < 3) return;

    this.currentShape.closed = true;
    this.createSketchLine(this.currentShape);
    this.shapes.push(this.currentShape);
    console.log('Created polygon:', this.currentShape);
    this.currentShape = null;
    this.clearPreview();
  }

  // Preview methods
  private createRectanglePreview(start: THREE.Vector3, end: THREE.Vector3): void {
    const startLocal = this.worldToWorkplane(start);
    const endLocal = this.worldToWorkplane(end);
  
    const corners = [
      new THREE.Vector3(startLocal.x, startLocal.y, 0),
      new THREE.Vector3(endLocal.x, startLocal.y, 0),
      new THREE.Vector3(endLocal.x, endLocal.y, 0),
      new THREE.Vector3(startLocal.x, endLocal.y, 0),
      new THREE.Vector3(startLocal.x, startLocal.y, 0), // close rectangle
    ];
  
    const worldCorners = corners.map(corner => this.workplaneToWorld(corner));
  
    const geometry = new THREE.BufferGeometry().setFromPoints(worldCorners);
    const material = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.7,
      linewidth: 2,
    });
  
    this.previewLine = new THREE.Line(geometry, material);
    this.scene.add(this.previewLine);
  }
  
  private createCirclePreview(center: THREE.Vector3, edge: THREE.Vector3): void {
    const radius = center.distanceTo(edge);

    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }

    const curve = new THREE.EllipseCurve(
      0, 0,
      radius, radius,
      0, 2 * Math.PI,
      false,
      0
    );

    const points = curve.getPoints(64);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.7,
      linewidth: 2
    });

    this.previewLine = new THREE.Line(geometry, material);
    this.previewLine.position.copy(center);

    if (this.workplane) {
      this.previewLine.rotation.copy(this.workplane.rotation);
    }

    this.scene.add(this.previewLine);
  }

  private updatePolygonPreview(): void {
    if (!this.currentShape) return;
    this.clearPreview();

    const pointsWorld = this.currentShape.points.map(p => p.position.clone());
    // For preview, close the loop visually
    pointsWorld.push(pointsWorld[0].clone());

    const geometry = new THREE.BufferGeometry().setFromPoints(pointsWorld);
    const material = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.7,
      linewidth: 2
    });

    this.previewLine = new THREE.Line(geometry, material);
    this.scene.add(this.previewLine);
  }

  // Sketch helpers
  private createSketchLine(shape: SketchShape3D): void {
    const points = shape.points.map(p => p.position.clone());
    if (shape.closed) {
      points.push(points[0].clone()); // closes the loop
    }
  
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
    const line = new THREE.Line(geometry, material);
  
    this.scene.add(line);
    this.sketchLines.push(line);
  }
  
  private createSketchCircle(shape: SketchShape3D): void {
    const center = shape.points[0].position;
    const edge = shape.points[1].position;
    const radius = center.distanceTo(edge);

    const curve = new THREE.EllipseCurve(
      0, 0,
      radius, radius,
      0, 2 * Math.PI,
      false,
      0
    );

    const points = curve.getPoints(64);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });

    const circle = new THREE.Line(geometry, material);
    circle.position.copy(center);

    if (this.workplane) {
      circle.rotation.copy(this.workplane.rotation);
    }

    this.scene.add(circle);
    this.sketchLines.push(circle);
  }

  private addSketchPoint(position: THREE.Vector3): void {
    const geometry = new THREE.SphereGeometry(0.02, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const pointMesh = new THREE.Mesh(geometry, material);
    pointMesh.position.copy(position);
    this.scene.add(pointMesh);
    this.sketchPoints.push(pointMesh);
  }

  // Workplane helpers
  private createWorkplane(): boolean {
    if (this.hasWorkplane) return false;

    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xcccccc, 
      side: THREE.DoubleSide, 
      transparent: true, 
      opacity: 0.4 
    });
    this.workplane = new THREE.Mesh(geometry, material);
    this.workplane.rotation.x = -Math.PI / 2; // horizontal plane
    this.scene.add(this.workplane);

    this.gridHelper = new THREE.GridHelper(10, 20, 0x888888, 0x444444);
    this.gridHelper.rotation.x = -Math.PI / 2;
    this.scene.add(this.gridHelper);

    this.hasWorkplane = true;
    console.log('Workplane created');
    return true;
  }

  private getWorkplaneIntersection(): THREE.Vector3 | null {
    if (!this.workplane) return null;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.workplane);
    if (intersects.length === 0) return null;

    let point = intersects[0].point.clone();

    if (this.snapToGrid) {
      point = this.snapVectorToGrid(point);
    }

    return point;
  }

  private snapVectorToGrid(vec: THREE.Vector3): THREE.Vector3 {
    const snapped = vec.clone();
    snapped.x = Math.round(snapped.x / this.gridSize) * this.gridSize;
    // Do NOT snap y; keep original y coordinate on the workplane
    snapped.y = vec.y;
    snapped.z = Math.round(snapped.z / this.gridSize) * this.gridSize;
    return snapped;
  }

  private clearPreview(): void {
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh.geometry.dispose();
      (this.previewMesh.material as THREE.Material).dispose();
      this.previewMesh = null;
    }
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  private worldToWorkplane(worldPos: THREE.Vector3): THREE.Vector3 {
    if (!this.workplane) return worldPos.clone();
    const local = worldPos.clone();
    this.workplane.worldToLocal(local);
    return local;
  }

  private workplaneToWorld(localPos: THREE.Vector3): THREE.Vector3 {
    if (!this.workplane) return localPos.clone();
    const world = localPos.clone();
    this.workplane.localToWorld(world);
    return world;
  }

  // Public methods
  setTool(tool: string): void {
    this.currentTool = tool;
    this.finishCurrentSketch();
    console.log('Set tool to:', tool);
  }

  setSketchMode(mode: 'surface' | 'plane' | 'free'): void {
    this.sketchMode = mode;
    this.clearWorkplane();
    console.log('Set sketch mode to:', mode);
  }

  setSnapToGrid(snap: boolean): void {
    this.snapToGrid = snap;
  }

  setGridSize(size: number): void {
    this.gridSize = size;
    if (this.gridHelper && this.workplane) {
      this.scene.remove(this.gridHelper);
      
      this.gridHelper = new THREE.GridHelper(10, 10 / this.gridSize, 0x4ade80, 0x4ade80);
      this.gridHelper.position.copy(this.workplane.position);
      this.gridHelper.rotation.copy(this.workplane.rotation);
      
      const gridMaterial = this.gridHelper.material as THREE.LineBasicMaterial;
      gridMaterial.transparent = true;
      gridMaterial.opacity = 0.3;
      
      if (this.workplaneVisible) {
        this.scene.add(this.gridHelper);
      }
    }
  }

  setWorkplaneVisible(visible: boolean): void {
    this.workplaneVisible = visible;
    
    if (this.workplane) {
      const material = this.workplane.material as THREE.MeshBasicMaterial;
      material.opacity = visible ? 0.15 : 0;
    }
    
    if (this.gridHelper) {
      this.gridHelper.visible = visible;
    }
  }

  finishCurrentSketch(): void {
    if (this.currentShape && this.currentTool === 'polygon' && this.currentShape.points.length >= 3) {
      this.finishPolygon();
    }
    
    // Finish multi-line if in progress
    if (this.isMultiLineMode && this.multiLinePoints.length >= 2) {
      this.finishMultiLine();
    }
    
    this.clearPreview();
    this.isDrawing = false;
    this.isDragging = false;
    this.startPoint = null;
    this.currentShape = null;
    this.isMultiLineMode = false;
    this.multiLinePoints = [];
  }

  getShapes(): SketchShape3D[] {
    return [...this.shapes];
  }

  clear(): void {
    this.shapes = [];
    this.currentShape = null;
    this.isDrawing = false;
    this.isDragging = false;
    this.startPoint = null;
    this.isMultiLineMode = false;
    this.multiLinePoints = [];
    
    // Remove all sketch elements
    this.sketchLines.forEach(line => {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.sketchLines = [];
    
    this.sketchMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.sketchMeshes = [];
    
    this.sketchPoints.forEach(point => {
      this.scene.remove(point);
      point.geometry.dispose();
      (point.material as THREE.Material).dispose();
    });
    this.sketchPoints = [];
    
    this.clearPreview();
    this.clearWorkplane();
    
    console.log('Cleared all sketches');
  }

  dispose(): void {
    this.clear();
  }
}
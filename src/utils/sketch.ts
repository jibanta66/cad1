// 2D Sketching utilities for CAD
export interface SketchPoint {
  x: number;
  y: number;
  id: string;
}

export interface SketchLine {
  start: SketchPoint;
  end: SketchPoint;
  id: string;
}

export interface SketchShape {
  type: 'line' | 'rectangle' | 'circle' | 'polygon';
  points: SketchPoint[];
  id: string;
  closed: boolean;
}

export class SketchEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private shapes: SketchShape[] = [];
  private currentTool: string = 'line';
  private isDrawing: boolean = false;
  private currentShape: SketchShape | null = null;
  private gridSize: number = 20;
  private snapToGrid: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    this.ctx = ctx;
    this.setupCanvas();
    this.attachEventListeners();
  }

  private setupCanvas(): void {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = 2;
  }

  private attachEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    this.canvas.addEventListener('contextmenu', e => e.preventDefault()); // prevent right-click menu
  }

  private onMouseDown = (e: MouseEvent): void => {
    const { offsetX, offsetY, button } = e;
    if (this.currentTool === 'polygon') {
      if (!this.isDrawing) {
        // Start polygon
        this.startDrawing(offsetX, offsetY);
      } else if (button === 0) {
        // Left click adds a point
        this.addPolygonPoint(offsetX, offsetY);
      } else if (button === 2) {
        // Right click finishes polygon
        this.finishPolygon();
      }
    } else {
      if (button === 0) { // left button
        this.startDrawing(offsetX, offsetY);
      }
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDrawing) return;
    const { offsetX, offsetY } = e;
    this.updateDrawing(offsetX, offsetY);
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (this.currentTool !== 'polygon' && this.isDrawing) {
      this.finishDrawing();
    }
  };

  private onDoubleClick = (e: MouseEvent): void => {
    if (this.currentTool === 'polygon' && this.isDrawing) {
      this.finishPolygon();
    }
  };

  setTool(tool: string): void {
    this.currentTool = tool;
    this.isDrawing = false;
    this.currentShape = null;
  }

  private snapPoint(x: number, y: number): SketchPoint {
    if (this.snapToGrid) {
      x = Math.round(x / this.gridSize) * this.gridSize;
      y = Math.round(y / this.gridSize) * this.gridSize;
    }
    return { x, y, id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` };
  }

  startDrawing(x: number, y: number): void {
    const point = this.snapPoint(x, y);
    this.isDrawing = true;

    switch (this.currentTool) {
      case 'line':
        this.currentShape = {
          type: 'line',
          points: [point],
          id: `line-${Date.now()}`,
          closed: false
        };
        break;
      case 'rectangle':
        this.currentShape = {
          type: 'rectangle',
          points: [point],
          id: `rect-${Date.now()}`,
          closed: true
        };
        break;
      case 'circle':
        this.currentShape = {
          type: 'circle',
          points: [point],
          id: `circle-${Date.now()}`,
          closed: true
        };
        break;
      case 'polygon':
        this.currentShape = {
          type: 'polygon',
          points: [point],
          id: `polygon-${Date.now()}`,
          closed: false
        };
        break;
    }

    this.render();
  }

  addPolygonPoint(x: number, y: number): void {
    if (!this.currentShape || this.currentShape.type !== 'polygon') return;
    const point = this.snapPoint(x, y);
    this.currentShape.points.push(point);
    this.render();
  }

  updateDrawing(x: number, y: number): void {
    if (!this.isDrawing || !this.currentShape) return;

    const point = this.snapPoint(x, y);

    switch (this.currentTool) {
      case 'line':
        if (this.currentShape.points.length === 1) {
          this.currentShape.points.push(point);
        } else {
          this.currentShape.points[1] = point;
        }
        break;
      case 'rectangle':
        if (this.currentShape.points.length === 1) {
          const start = this.currentShape.points[0];
          this.currentShape.points = [
            start,
            { x: point.x, y: start.y, id: `point-${Date.now()}` },
            point,
            { x: start.x, y: point.y, id: `point-${Date.now()}` }
          ];
        } else {
          const start = this.currentShape.points[0];
          this.currentShape.points[1] = { x: point.x, y: start.y, id: this.currentShape.points[1].id };
          this.currentShape.points[2] = point;
          this.currentShape.points[3] = { x: start.x, y: point.y, id: this.currentShape.points[3].id };
        }
        break;
      case 'circle':
        if (this.currentShape.points.length === 1) {
          this.currentShape.points.push(point);
        } else {
          this.currentShape.points[1] = point;
        }
        break;
      case 'polygon':
        // polygons update only when adding points or finishing
        break;
    }

    this.render();
  }

  finishDrawing(): void {
    if (!this.currentShape) return;

    if (this.currentTool !== 'polygon') {
      this.shapes.push(this.currentShape);
      this.currentShape = null;
      this.isDrawing = false;
    }
    
    this.render();
  }

  finishPolygon(): void {
    if (this.currentShape && this.currentShape.type === 'polygon') {
      if (this.currentShape.points.length >= 3) {
        this.currentShape.closed = true;
        this.shapes.push(this.currentShape);
      }
      this.currentShape = null;
      this.isDrawing = false;
      this.render();
    }
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 0.5;

    for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  private drawShape(shape: SketchShape): void {
    this.ctx.strokeStyle = '#4ade80';
    this.ctx.lineWidth = 2;

    switch (shape.type) {
      case 'line':
        if (shape.points.length >= 2) {
          this.ctx.beginPath();
          this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
          this.ctx.lineTo(shape.points[1].x, shape.points[1].y);
          this.ctx.stroke();
        }
        break;
      case 'rectangle':
        if (shape.points.length >= 4) {
          this.ctx.beginPath();
          this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
          shape.points.forEach((point, i) => {
            if (i > 0) this.ctx.lineTo(point.x, point.y);
          });
          this.ctx.closePath();
          this.ctx.stroke();
        }
        break;
      case 'circle':
        if (shape.points.length >= 2) {
          const center = shape.points[0];
          const edge = shape.points[1];
          const radius = Math.sqrt(
            Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
          );
          this.ctx.beginPath();
          this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
          this.ctx.stroke();
        }
        break;
      case 'polygon':
        if (shape.points.length >= 2) {
          this.ctx.beginPath();
          this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
          shape.points.slice(1).forEach(point => {
            this.ctx.lineTo(point.x, point.y);
          });
          if (shape.closed) {
            this.ctx.closePath();
          }
          this.ctx.stroke();
        }
        break;
    }
  }

  render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grid
    this.drawGrid();
    
    // Draw all shapes
    this.shapes.forEach(shape => this.drawShape(shape));
    
    // Draw current shape being drawn
    if (this.currentShape) {
      this.ctx.strokeStyle = '#60a5fa';
      this.drawShape(this.currentShape);
    }
  }

  getShapes(): SketchShape[] {
    return [...this.shapes];
  }

  clear(): void {
    this.shapes = [];
    this.currentShape = null;
    this.isDrawing = false;
    this.render();
  }

  setSnapToGrid(snap: boolean): void {
    this.snapToGrid = snap;
  }

  setGridSize(size: number): void {
    this.gridSize = size;
    this.render();
  }
}

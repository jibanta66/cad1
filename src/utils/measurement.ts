// Measurement utilities for CAD
import { Vec3 } from './math';

export interface Measurement {
  id: string;
  type: 'distance' | 'angle' | 'area';
  points: Vec3[];
  value: number;
  unit: string;
  label: string;
  timestamp: number;
}

export class MeasurementEngine {
  private measurements: Measurement[] = [];
  private activeTool: string | null = null;
  private tempPoints: Vec3[] = [];

  setActiveTool(tool: string | null): void {
    this.activeTool = tool;
    this.tempPoints = [];
  }

  addPoint(point: Vec3): Measurement | null {
    this.tempPoints.push(point);

    switch (this.activeTool) {
      case 'distance':
        if (this.tempPoints.length === 2) {
          const measurement = this.createDistanceMeasurement(this.tempPoints);
          this.measurements.push(measurement);
          this.tempPoints = [];
          return measurement;
        }
        break;
      case 'angle':
        if (this.tempPoints.length === 3) {
          const measurement = this.createAngleMeasurement(this.tempPoints);
          this.measurements.push(measurement);
          this.tempPoints = [];
          return measurement;
        }
        break;
      case 'area':
        // Area measurement requires at least 3 points and manual completion
        if (this.tempPoints.length >= 3) {
          // Return null to indicate more points can be added
          return null;
        }
        break;
    }

    return null;
  }

  finishAreaMeasurement(): Measurement | null {
    if (this.activeTool === 'area' && this.tempPoints.length >= 3) {
      const measurement = this.createAreaMeasurement(this.tempPoints);
      this.measurements.push(measurement);
      this.tempPoints = [];
      return measurement;
    }
    return null;
  }

  private createDistanceMeasurement(points: Vec3[]): Measurement {
    const [p1, p2] = points;
    const distance = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) +
      Math.pow(p2.y - p1.y, 2) +
      Math.pow(p2.z - p1.z, 2)
    );

    return {
      id: `distance-${Date.now()}`,
      type: 'distance',
      points: [...points],
      value: distance,
      unit: 'units',
      label: `Distance: ${distance.toFixed(2)} units`,
      timestamp: Date.now()
    };
  }

  private createAngleMeasurement(points: Vec3[]): Measurement {
    const [p1, p2, p3] = points;
    
    // Create vectors from center point (p2) to the other points
    const v1 = Vec3.subtract(p1, p2);
    const v2 = Vec3.subtract(p3, p2);
    
    // Calculate angle using dot product
    const dot = Vec3.dot(v1, v2);
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
    
    const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
    const angleDegrees = (angle * 180) / Math.PI;

    return {
      id: `angle-${Date.now()}`,
      type: 'angle',
      points: [...points],
      value: angleDegrees,
      unit: 'degrees',
      label: `Angle: ${angleDegrees.toFixed(1)}°`,
      timestamp: Date.now()
    };
  }

  private createAreaMeasurement(points: Vec3[]): Measurement {
    // Calculate area using shoelace formula (for 2D projection)
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    area = Math.abs(area) / 2;

    return {
      id: `area-${Date.now()}`,
      type: 'area',
      points: [...points],
      value: area,
      unit: 'square units',
      label: `Area: ${area.toFixed(2)} sq units`,
      timestamp: Date.now()
    };
  }

  getMeasurements(): Measurement[] {
    return [...this.measurements];
  }

  deleteMeasurement(id: string): void {
    this.measurements = this.measurements.filter(m => m.id !== id);
  }

  clearAll(): void {
    this.measurements = [];
    this.tempPoints = [];
  }

  getTempPoints(): Vec3[] {
    return [...this.tempPoints];
  }

  getActiveTool(): string | null {
    return this.activeTool;
  }
}
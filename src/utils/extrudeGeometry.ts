import * as THREE from 'three';
import { SketchShape3D } from '../utils/sketch3d';

export interface ExtrusionSettings {
  depth: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
}

export class ExtrusionEngine {
  static extrudeSketch(shapes: SketchShape3D[], settings: ExtrusionSettings): THREE.BufferGeometry {
    if (shapes.length === 0) {
      console.warn('No shapes to extrude');
      return new THREE.BoxGeometry(1, 1, 1); // Fallback
    }

    console.log('Extruding shapes:', shapes);

    // Convert 3D sketch shapes to Three.js shapes
    const threeShapes: THREE.Shape[] = [];

    shapes.forEach(shape => {
      console.log(`Processing shape: ${shape.type} with ${shape.points.length} points`);
      
      if (shape.points.length >= 2) {
        const threeShape = new THREE.Shape();
        
        // Project 3D points to 2D for extrusion
        const points2D = this.projectTo2D(shape.points.map(p => p.position));
        
        console.log('Projected 2D points:', points2D);
        
        if (points2D.length > 0) {
          threeShape.moveTo(points2D[0].x, points2D[0].y);

          for (let i = 1; i < points2D.length; i++) {
            const point = points2D[i];
            threeShape.lineTo(point.x, point.y);
          }

          // Close the shape if it's marked as closed or if it's a rectangle/circle
          if (shape.closed || shape.type === 'rectangle' || shape.type === 'circle') {
            threeShape.lineTo(points2D[0].x, points2D[0].y);
          }

          threeShapes.push(threeShape);
        }
      }
    });

    if (threeShapes.length === 0) {
      console.warn('No valid shapes for extrusion');
      return new THREE.BoxGeometry(1, 1, 1); // Fallback
    }

    // Create extrude geometry
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: settings.depth,
      bevelEnabled: settings.bevelEnabled,
      bevelThickness: settings.bevelThickness,
      bevelSize: settings.bevelSize,
      bevelSegments: settings.bevelSegments
    };

    console.log('Extrude settings:', extrudeSettings);

    try {
      // Use the first shape for extrusion
      const geometry = new THREE.ExtrudeGeometry(threeShapes[0], extrudeSettings);
      
      // Center the geometry
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
      }

      console.log('Extrusion successful');
      return geometry;
    } catch (error) {
      console.error('Extrusion failed:', error);
      return new THREE.BoxGeometry(1, 1, 1); // Fallback
    }
  }

  private static projectTo2D(points3D: THREE.Vector3[]): THREE.Vector2[] {
    if (points3D.length < 2) return [];

    console.log('Input 3D points:', points3D);

    // Calculate the best-fit plane for the points
    const center = new THREE.Vector3();
    points3D.forEach(p => center.add(p));
    center.divideScalar(points3D.length);

    // Use the first two points to establish initial axes
    const v1 = points3D[1].clone().sub(points3D[0]).normalize();
    let v2 = new THREE.Vector3();
    
    // Find a point that's not collinear to establish the second axis
    for (let i = 2; i < points3D.length; i++) {
      const temp = points3D[i].clone().sub(points3D[0]);
      v2.crossVectors(v1, temp);
      if (v2.length() > 0.001) {
        v2.normalize();
        break;
      }
    }
    
    // If all points are collinear or we only have 2 points, create an arbitrary perpendicular vector
    if (v2.length() < 0.001) {
      if (Math.abs(v1.y) < 0.9) {
        v2.set(0, 1, 0);
      } else {
        v2.set(1, 0, 0);
      }
      v2.crossVectors(v1, v2).normalize();
    }

    // Project points onto the 2D plane
    const points2D: THREE.Vector2[] = [];
    points3D.forEach(point => {
      const relative = point.clone().sub(center);
      const x = relative.dot(v1);
      const y = relative.dot(v2);
      points2D.push(new THREE.Vector2(x, y));
    });

    console.log('Projected 2D points:', points2D);
    return points2D;
  }

  static createExtrusionPresets(): { [key: string]: ExtrusionSettings } {
    return {
      simple: {
        depth: 1,
        bevelEnabled: false,
        bevelThickness: 0,
        bevelSize: 0,
        bevelSegments: 1
      },
      beveled: {
        depth: 1,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 3
      },
      deep: {
        depth: 2,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 2
      }
    };
  }
}
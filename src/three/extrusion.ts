import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface SketchPoint3D {
  x: number;
  y: number;
  z: number;
  id: string;
}

export interface SketchShape3D {
  type: 'line' | 'rectangle' | 'circle' | 'polygon';
  points: SketchPoint3D[];
  id: string;
  closed: boolean;
}

export interface ExtrusionSettings {
  depth: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
}

export class ExtrusionEngine {
  static extrudeSketch(shapes: SketchShape3D[], settings: ExtrusionSettings): THREE.BufferGeometry {
    if (!shapes.length) {
      return new THREE.BoxGeometry(1, 1, 1); // fallback
    }

    const geometries: THREE.BufferGeometry[] = [];

    for (const shape of shapes) {
      if (!shape.closed || shape.points.length < 3) continue;

      const pts3D = shape.points.map(p => new THREE.Vector3(p.x, p.y, p.z));

      // Get local plane normal
      const normal = this.computeNormal(pts3D);
      if (!normal) continue;

      // Local basis
      const u = new THREE.Vector3().subVectors(pts3D[1], pts3D[0]).normalize();
      const v = new THREE.Vector3().crossVectors(normal, u).normalize();

      // Flatten to 2D
      const origin = pts3D[0];
      const to2D = new THREE.Matrix4().makeBasis(u, v, normal).invert();
      const shape2D = new THREE.Shape();
      pts3D.forEach((p, i) => {
        const proj = p.clone().sub(origin).applyMatrix4(to2D);
        if (i === 0) shape2D.moveTo(proj.x, proj.y);
        else shape2D.lineTo(proj.x, proj.y);
      });

      // Extrude
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: settings.depth,
        bevelEnabled: settings.bevelEnabled,
        bevelThickness: settings.bevelThickness,
        bevelSize: settings.bevelSize,
        bevelSegments: settings.bevelSegments,
      };
      const geometry = new THREE.ExtrudeGeometry(shape2D, extrudeSettings);

      // Transform back to 3D world space
      const toWorld = new THREE.Matrix4().makeBasis(u, v, normal).setPosition(origin);
      geometry.applyMatrix4(toWorld);

      geometries.push(geometry);
    }

    if (geometries.length === 0) {
      return new THREE.BoxGeometry(1, 1, 1); // fallback if all failed
    }

    const finalGeometry = mergeGeometries(geometries, false);
    finalGeometry.computeVertexNormals();
    finalGeometry.computeBoundingBox();
    return finalGeometry;
  }

  static computeNormal(points: THREE.Vector3[]): THREE.Vector3 | null {
    if (points.length < 3) return null;
    const a = points[0];
    for (let i = 1; i < points.length - 1; i++) {
      const b = points[i];
      const c = points[i + 1];
      const ab = new THREE.Vector3().subVectors(b, a);
      const ac = new THREE.Vector3().subVectors(c, a);
      const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();
      if (normal.lengthSq() > 1e-6) return normal;
    }
    return null;
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

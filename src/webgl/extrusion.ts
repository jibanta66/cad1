// 3D Extrusion engine for converting 2D sketches to 3D objects
import { MeshData } from './primitives';
import { SketchShape } from '../utils/sketch';

export interface ExtrusionSettings {
  height: number;
  taper: number; // 0 = no taper, 1 = full taper
  twist: number; // rotation in radians
  segments: number; // number of segments along height
}

export class ExtrusionEngine {
  static extrudeSketch(shapes: SketchShape[], settings: ExtrusionSettings): MeshData {
    const vertices: number[] = [];
    const normals: number[] = [];
    const texCoords: number[] = [];
    const indices: number[] = [];

    let vertexIndex = 0;

    shapes.forEach(shape => {
      if (shape.closed && shape.points.length >= 3) {
        const extrudedMesh = this.extrudeShape(shape, settings);
        
        // Merge vertices
        for (let i = 0; i < extrudedMesh.vertices.length; i += 3) {
          vertices.push(
            extrudedMesh.vertices[i],
            extrudedMesh.vertices[i + 1],
            extrudedMesh.vertices[i + 2]
          );
        }

        // Merge normals
        for (let i = 0; i < extrudedMesh.normals.length; i += 3) {
          normals.push(
            extrudedMesh.normals[i],
            extrudedMesh.normals[i + 1],
            extrudedMesh.normals[i + 2]
          );
        }

        // Merge texture coordinates
        for (let i = 0; i < extrudedMesh.texCoords.length; i += 2) {
          texCoords.push(
            extrudedMesh.texCoords[i],
            extrudedMesh.texCoords[i + 1]
          );
        }

        // Merge indices with offset
        for (let i = 0; i < extrudedMesh.indices.length; i++) {
          indices.push(extrudedMesh.indices[i] + vertexIndex);
        }

        vertexIndex += extrudedMesh.vertices.length / 3;
      }
    });

    return {
      vertices: new Float32Array(vertices),
      normals: new Float32Array(normals),
      texCoords: new Float32Array(texCoords),
      indices: new Uint16Array(indices)
    };
  }

  private static extrudeShape(shape: SketchShape, settings: ExtrusionSettings): MeshData {
    const { height, taper, twist, segments } = settings;
    const points = shape.points;
    const vertices: number[] = [];
    const normals: number[] = [];
    const texCoords: number[] = [];
    const indices: number[] = [];

    // Convert 2D points to 3D (assuming sketch is on XZ plane)
    const profile3D = points.map(p => ({ x: p.x / 100, y: 0, z: p.y / 100 })); // Scale down from canvas coordinates

    // Generate vertices for each segment
    for (let seg = 0; seg <= segments; seg++) {
      const t = seg / segments;
      const y = t * height;
      const scale = 1 - (taper * t);
      const rotation = twist * t;

      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);

      profile3D.forEach((point, i) => {
        // Apply scaling and rotation
        const x = (point.x * cos - point.z * sin) * scale;
        const z = (point.x * sin + point.z * cos) * scale;

        vertices.push(x, y, z);

        // Calculate normal (simplified)
        if (seg === 0) {
          normals.push(0, -1, 0); // Bottom face
        } else if (seg === segments) {
          normals.push(0, 1, 0); // Top face
        } else {
          // Side face normal (simplified)
          const nextPoint = profile3D[(i + 1) % profile3D.length];
          const nx = -(nextPoint.z - point.z);
          const nz = nextPoint.x - point.x;
          const length = Math.sqrt(nx * nx + nz * nz);
          normals.push(nx / length, 0, nz / length);
        }

        texCoords.push(i / profile3D.length, t);
      });
    }

    // Generate indices
    const pointCount = profile3D.length;

    // Side faces
    for (let seg = 0; seg < segments; seg++) {
      for (let i = 0; i < pointCount; i++) {
        const next = (i + 1) % pointCount;
        
        const current = seg * pointCount + i;
        const currentNext = seg * pointCount + next;
        const upper = (seg + 1) * pointCount + i;
        const upperNext = (seg + 1) * pointCount + next;

        // Two triangles per quad
        indices.push(current, upper, currentNext);
        indices.push(currentNext, upper, upperNext);
      }
    }

    // Bottom face (if not tapered completely)
    if (taper < 1) {
      const bottomCenter = vertices.length / 3;
      vertices.push(0, 0, 0);
      normals.push(0, -1, 0);
      texCoords.push(0.5, 0.5);

      for (let i = 0; i < pointCount; i++) {
        const next = (i + 1) % pointCount;
        indices.push(bottomCenter, next, i);
      }
    }

    // Top face (if not tapered completely)
    if (taper < 1) {
      const topCenter = vertices.length / 3;
      vertices.push(0, height, 0);
      normals.push(0, 1, 0);
      texCoords.push(0.5, 0.5);

      const topStart = segments * pointCount;
      for (let i = 0; i < pointCount; i++) {
        const next = (i + 1) % pointCount;
        indices.push(topCenter, topStart + i, topStart + next);
      }
    }

    return {
      vertices: new Float32Array(vertices),
      normals: new Float32Array(normals),
      texCoords: new Float32Array(texCoords),
      indices: new Uint16Array(indices)
    };
  }

  static createExtrusionPresets(): { [key: string]: ExtrusionSettings } {
    return {
      simple: { height: 1, taper: 0, twist: 0, segments: 1 },
      tapered: { height: 2, taper: 0.5, twist: 0, segments: 4 },
      twisted: { height: 3, taper: 0, twist: Math.PI / 2, segments: 8 },
      complex: { height: 2.5, taper: 0.3, twist: Math.PI / 4, segments: 6 }
    };
  }
}
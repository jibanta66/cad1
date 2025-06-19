// 3D Primitive shapes for CAD
export interface MeshData {
  vertices: Float32Array;
  normals: Float32Array;
  texCoords: Float32Array;
  indices: Uint16Array;
}

export function createCube(size: number = 1): MeshData {
  const s = size / 2;
  
  const vertices = new Float32Array([
    // Front face
    -s, -s,  s,  s, -s,  s,  s,  s,  s, -s,  s,  s,
    // Back face
    -s, -s, -s, -s,  s, -s,  s,  s, -s,  s, -s, -s,
    // Top face
    -s,  s, -s, -s,  s,  s,  s,  s,  s,  s,  s, -s,
    // Bottom face
    -s, -s, -s,  s, -s, -s,  s, -s,  s, -s, -s,  s,
    // Right face
     s, -s, -s,  s,  s, -s,  s,  s,  s,  s, -s,  s,
    // Left face
    -s, -s, -s, -s, -s,  s, -s,  s,  s, -s,  s, -s,
  ]);

  const normals = new Float32Array([
    // Front face
     0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,
    // Back face
     0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,
    // Top face
     0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,
    // Bottom face
     0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,
    // Right face
     1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,
    // Left face
    -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0,
  ]);

  const texCoords = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1,  // Front
    1, 0, 1, 1, 0, 1, 0, 0,  // Back
    0, 1, 0, 0, 1, 0, 1, 1,  // Top
    1, 1, 0, 1, 0, 0, 1, 0,  // Bottom
    1, 0, 1, 1, 0, 1, 0, 0,  // Right
    0, 0, 1, 0, 1, 1, 0, 1,  // Left
  ]);

  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3,   // front
     4,  5,  6,   4,  6,  7,   // back
     8,  9, 10,   8, 10, 11,   // top
    12, 13, 14,  12, 14, 15,   // bottom
    16, 17, 18,  16, 18, 19,   // right
    20, 21, 22,  20, 22, 23,   // left
  ]);

  return { vertices, normals, texCoords, indices };
}

export function createSphere(radius: number = 1, segments: number = 32): MeshData {
  const vertices: number[] = [];
  const normals: number[] = [];
  const texCoords: number[] = [];
  const indices: number[] = [];

  for (let lat = 0; lat <= segments; lat++) {
    const theta = lat * Math.PI / segments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= segments; lon++) {
      const phi = lon * 2 * Math.PI / segments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;

      vertices.push(radius * x, radius * y, radius * z);
      normals.push(x, y, z);
      texCoords.push(lon / segments, lat / segments);
    }
  }

  for (let lat = 0; lat < segments; lat++) {
    for (let lon = 0; lon < segments; lon++) {
      const first = lat * (segments + 1) + lon;
      const second = first + segments + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    texCoords: new Float32Array(texCoords),
    indices: new Uint16Array(indices)
  };
}

export function createCylinder(radius: number = 1, height: number = 2, segments: number = 32): MeshData {
  const vertices: number[] = [];
  const normals: number[] = [];
  const texCoords: number[] = [];
  const indices: number[] = [];

  const halfHeight = height / 2;

  // Side vertices
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Top vertex
    vertices.push(x, halfHeight, z);
    normals.push(x / radius, 0, z / radius);
    texCoords.push(i / segments, 1);

    // Bottom vertex
    vertices.push(x, -halfHeight, z);
    normals.push(x / radius, 0, z / radius);
    texCoords.push(i / segments, 0);
  }

  // Side indices
  for (let i = 0; i < segments; i++) {
    const top1 = i * 2;
    const bottom1 = i * 2 + 1;
    const top2 = (i + 1) * 2;
    const bottom2 = (i + 1) * 2 + 1;

    indices.push(top1, bottom1, top2);
    indices.push(bottom1, bottom2, top2);
  }

  // Top and bottom caps
  const topCenterIndex = vertices.length / 3;
  vertices.push(0, halfHeight, 0);
  normals.push(0, 1, 0);
  texCoords.push(0.5, 0.5);

  const bottomCenterIndex = topCenterIndex + 1;
  vertices.push(0, -halfHeight, 0);
  normals.push(0, -1, 0);
  texCoords.push(0.5, 0.5);

  // Add cap vertices and indices
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    
    // Top cap
    indices.push(topCenterIndex, i * 2, next * 2);
    
    // Bottom cap
    indices.push(bottomCenterIndex, next * 2 + 1, i * 2 + 1);
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    texCoords: new Float32Array(texCoords),
    indices: new Uint16Array(indices)
  };
}
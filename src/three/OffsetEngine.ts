import * as THREE from 'three';

export class OffsetEngine {
  static offsetFace(geometry: THREE.BufferGeometry, faceIndex: number, offset: number): THREE.BufferGeometry {
    const newGeometry = geometry.clone();
    const positions = newGeometry.attributes.position;
    const normals = newGeometry.attributes.normal;

    if (!positions || !normals) return newGeometry;

    // Get face vertices (assuming triangulated geometry)
    const faceStart = faceIndex * 3;
    
    for (let i = 0; i < 3; i++) {
      const vertexIndex = faceStart + i;
      const x = positions.getX(vertexIndex);
      const y = positions.getY(vertexIndex);
      const z = positions.getZ(vertexIndex);
      
      const nx = normals.getX(vertexIndex);
      const ny = normals.getY(vertexIndex);
      const nz = normals.getZ(vertexIndex);

      positions.setXYZ(
        vertexIndex,
        x + nx * offset,
        y + ny * offset,
        z + nz * offset
      );
    }

    positions.needsUpdate = true;
    newGeometry.computeVertexNormals();
    
    return newGeometry;
  }

  static offsetBody(geometry: THREE.BufferGeometry, offset: number): THREE.BufferGeometry {
    const newGeometry = geometry.clone();
    const positions = newGeometry.attributes.position;
    const normals = newGeometry.attributes.normal;

    if (!positions || !normals) return newGeometry;

    // Offset all vertices along their normals
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const nx = normals.getX(i);
      const ny = normals.getY(i);
      const nz = normals.getZ(i);

      positions.setXYZ(
        i,
        x + nx * offset,
        y + ny * offset,
        z + nz * offset
      );
    }

    positions.needsUpdate = true;
    newGeometry.computeVertexNormals();
    
    return newGeometry;
  }

  static createShell(geometry: THREE.BufferGeometry, thickness: number): THREE.BufferGeometry {
    // Create inner and outer surfaces
    const outerGeometry = this.offsetBody(geometry, thickness / 2);
    const innerGeometry = this.offsetBody(geometry, -thickness / 2);

    // Flip inner geometry normals
    const innerNormals = innerGeometry.attributes.normal;
    for (let i = 0; i < innerNormals.count; i++) {
      innerNormals.setXYZ(
        i,
        -innerNormals.getX(i),
        -innerNormals.getY(i),
        -innerNormals.getZ(i)
      );
    }

    // Combine geometries (simplified - in practice you'd need to handle edges)
    const mergedGeometry = new THREE.BufferGeometry();
    
    // This is a simplified merge - a full implementation would properly connect edges
    const outerPositions = outerGeometry.attributes.position.array;
    const innerPositions = innerGeometry.attributes.position.array;
    
    const combinedPositions = new Float32Array(outerPositions.length + innerPositions.length);
    combinedPositions.set(outerPositions, 0);
    combinedPositions.set(innerPositions, outerPositions.length);
    
    mergedGeometry.setAttribute('position', new THREE.BufferAttribute(combinedPositions, 3));
    mergedGeometry.computeVertexNormals();
    
    return mergedGeometry;
  }
}
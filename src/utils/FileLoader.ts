import * as THREE from 'three';

export interface ImportedFile {
  name: string;
  geometry: THREE.BufferGeometry;
  material?: THREE.Material;
  size: number;
  format: string;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  file: string;
}

export class FileLoader {
  private static instance: FileLoader;

  public static getInstance(): FileLoader {
    if (!FileLoader.instance) {
      FileLoader.instance = new FileLoader();
    }
    return FileLoader.instance;
  }

  private constructor() {}

  public async loadFiles(
    files: FileList,
    onProgress?: (progress: LoadProgress) => void,
    onError?: (error: string, file: string) => void
  ): Promise<ImportedFile[]> {
    const results: ImportedFile[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];

      try {
        onProgress?.({
          loaded: i,
          total: totalFiles,
          file: file.name,
        });

        const importedFile = await this.loadSingleFile(file);
        if (importedFile) {
          // Provide default material if missing
          if (!importedFile.material) {
            importedFile.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
          }
          results.push(importedFile);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onError?.(errorMessage, file.name);
        console.error(`Failed to load ${file.name}:`, error);
      }
    }

    onProgress?.({
      loaded: totalFiles,
      total: totalFiles,
      file: 'Complete',
    });

    return results;
  }

  private async loadSingleFile(file: File): Promise<ImportedFile | null> {
    const extension = file.name.toLowerCase().split('.').pop() || '';
    switch (extension) {
      case 'obj': {
        const content = await this.readFileAsText(file);
        return this.loadOBJ(file.name, content, file.size);
      }
      case 'stl': {
        const buffer = await this.readFileAsArrayBuffer(file);
        return this.loadSTL(file.name, buffer, file.size);
      }
      case 'ply': {
        const content = await this.readFileAsText(file);
        return this.loadPLY(file.name, content, file.size);
      }
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file as text'));
      reader.readAsText(file);
    });
  }

  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file as array buffer'));
      reader.readAsArrayBuffer(file);
    });
  }

  private loadOBJ(filename: string, content: string, size: number): ImportedFile {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    const vertexPositions: THREE.Vector3[] = [];
    const vertexNormals: THREE.Vector3[] = [];
    const vertexUVs: THREE.Vector2[] = [];

    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (!parts.length) continue;

      switch (parts[0]) {
        case 'v':
          if (parts.length >= 4)
            vertexPositions.push(new THREE.Vector3(+parts[1], +parts[2], +parts[3]));
          break;
        case 'vn':
          if (parts.length >= 4)
            vertexNormals.push(new THREE.Vector3(+parts[1], +parts[2], +parts[3]));
          break;
        case 'vt':
          if (parts.length >= 3)
            vertexUVs.push(new THREE.Vector2(+parts[1], +parts[2]));
          break;
        case 'f':
          if (parts.length < 4) break; // faces need at least 3 vertices

          // Triangulate face (fan triangulation)
          const faceVertices = parts.slice(1);
          for (let i = 1; i < faceVertices.length - 1; i++) {
            const triVerts = [faceVertices[0], faceVertices[i], faceVertices[i + 1]];
            for (const v of triVerts) {
              const { vertex, uv, normal } = this.parseOBJFaceVertex(v);

              const pos = vertexPositions[vertex - 1];
              if (!pos) continue;
              positions.push(pos.x, pos.y, pos.z);

              if (normal && vertexNormals[normal - 1]) {
                const n = vertexNormals[normal - 1];
                normals.push(n.x, n.y, n.z);
              }

              if (uv && vertexUVs[uv - 1]) {
                const uvCoord = vertexUVs[uv - 1];
                uvs.push(uvCoord.x, uvCoord.y);
              }
            }
          }
          break;
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    if (normals.length === positions.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    } else {
      geometry.computeVertexNormals();
    }

    if (uvs.length > 0) {
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }

    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const center = geometry.boundingBox.getCenter(new THREE.Vector3());
      geometry.translate(-center.x, -center.y, -center.z);
    }

    return {
      name: filename,
      geometry,
      size,
      format: 'OBJ',
    };
  }

  private parseOBJFaceVertex(vertex: string): { vertex: number; uv?: number; normal?: number } {
    const parts = vertex.split('/');
    return {
      vertex: parseInt(parts[0]) || 0,
      uv: parts[1] ? parseInt(parts[1]) : undefined,
      normal: parts[2] ? parseInt(parts[2]) : undefined,
    };
  }

  private loadSTL(filename: string, buffer: ArrayBuffer, size: number): ImportedFile {
    const geometry = new THREE.BufferGeometry();

    // Detect ASCII or binary STL by checking header
    const isASCII = this.isASCIISTL(buffer);

    if (isASCII) {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(buffer);
      return this.parseASCIISTL(filename, text, size);
    } else {
      return this.parseBinarySTL(filename, buffer, size);
    }
  }

  private isASCIISTL(buffer: ArrayBuffer): boolean {
    // ASCII STL usually starts with "solid" and does not contain null bytes near the start
    const decoder = new TextDecoder('utf-8');
    const header = decoder.decode(buffer.slice(0, 80));
    if (!header.toLowerCase().startsWith('solid')) return false;

    // Check if buffer contains null bytes indicating binary STL
    const uint8 = new Uint8Array(buffer);
    for (let i = 0; i < 80; i++) {
      if (uint8[i] === 0) return false;
    }
    return true;
  }

  private parseASCIISTL(filename: string, text: string, size: number): ImportedFile {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const normals: number[] = [];

    const lines = text.split(/\r?\n/);
    let currentNormal = new THREE.Vector3();

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('facet normal')) {
        const parts = trimmed.split(/\s+/);
        currentNormal.set(+parts[2], +parts[3], +parts[4]);
      } else if (trimmed.startsWith('vertex')) {
        const parts = trimmed.split(/\s+/);
        vertices.push(+parts[1], +parts[2], +parts[3]);
        normals.push(currentNormal.x, currentNormal.y, currentNormal.z);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    if (normals.length === vertices.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    } else {
      geometry.computeVertexNormals();
    }

    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const center = geometry.boundingBox.getCenter(new THREE.Vector3());
      geometry.translate(-center.x, -center.y, -center.z);
    }

    return {
      name: filename,
      geometry,
      size,
      format: 'STL (ASCII)',
    };
  }

  private parseBinarySTL(filename: string, buffer: ArrayBuffer, size: number): ImportedFile {
    const geometry = new THREE.BufferGeometry();

    const dataView = new DataView(buffer);
    const facesCount = dataView.getUint32(80, true);
    const vertices: number[] = [];
    const normals: number[] = [];

    let offset = 84;
    for (let i = 0; i < facesCount; i++) {
      // Normal vector
      const nx = dataView.getFloat32(offset, true);
      const ny = dataView.getFloat32(offset + 4, true);
      const nz = dataView.getFloat32(offset + 8, true);
      offset += 12;

      // 3 vertices
      for (let v = 0; v < 3; v++) {
        const x = dataView.getFloat32(offset, true);
        const y = dataView.getFloat32(offset + 4, true);
        const z = dataView.getFloat32(offset + 8, true);
        offset += 12;
        vertices.push(x, y, z);
        normals.push(nx, ny, nz);
      }

      // Skip attribute byte count
      offset += 2;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    if (normals.length === vertices.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    } else {
      geometry.computeVertexNormals();
    }

    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const center = geometry.boundingBox.getCenter(new THREE.Vector3());
      geometry.translate(-center.x, -center.y, -center.z);
    }

    return {
      name: filename,
      geometry,
      size,
      format: 'STL (Binary)',
    };
  }

  private loadPLY(filename: string, content: string, size: number): ImportedFile {
    const geometry = new THREE.BufferGeometry();

    const lines = content.split(/\r?\n/);
    let vertexCount = 0;
    let faceCount = 0;
    let headerEnded = false;
    let currentLine = 0;

    // Parse header
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('element vertex')) {
        vertexCount = parseInt(line.split(/\s+/)[2]);
      } else if (line.startsWith('element face')) {
        faceCount = parseInt(line.split(/\s+/)[2]);
      } else if (line === 'end_header') {
        currentLine = i + 1;
        headerEnded = true;
        break;
      }
    }

    if (!headerEnded) {
      throw new Error('Invalid PLY file: no end_header found');
    }

    // Parse vertices
    const positions: number[] = [];
    for (let i = 0; i < vertexCount; i++) {
      const line = lines[currentLine + i].trim();
      const parts = line.split(/\s+/);
      if (parts.length < 3) throw new Error('Invalid vertex line in PLY');
      positions.push(+parts[0], +parts[1], +parts[2]);
    }

    // Parse faces
    const indices: number[] = [];
    for (let i = 0; i < faceCount; i++) {
      const line = lines[currentLine + vertexCount + i].trim();
      const parts = line.split(/\s+/).map(Number);
      const n = parts[0];
      if (n === 3) {
        indices.push(parts[1], parts[2], parts[3]);
      } else if (n === 4) {
        // triangulate quad
        indices.push(parts[1], parts[2], parts[3]);
        indices.push(parts[1], parts[3], parts[4]);
      } else {
        // ignore polygons with more than 4 vertices for now
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (indices.length > 0) {
      geometry.setIndex(indices);
    }

    geometry.computeVertexNormals();

    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const center = geometry.boundingBox.getCenter(new THREE.Vector3());
      geometry.translate(-center.x, -center.y, -center.z);
    }

    return {
      name: filename,
      geometry,
      size,
      format: 'PLY',
    };
  }

  public getSupportedFormats(): string[] {
    return ['obj', 'stl', 'ply'];
  }

  public getFormatDescription(format: string): string {
    const descriptions: Record<string, string> = {
      obj: 'Wavefront OBJ - Common 3D format with material support',
      stl: 'Stereolithography - 3D printing format',
      ply: 'Polygon File Format - Research and scanning format',
    };
    return descriptions[format.toLowerCase()] || 'Unknown format';
  }
}

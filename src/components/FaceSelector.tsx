import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Vec3 } from '../utils/math';

export interface SelectedFace {
  faceIndex: number;
  objectId: string;
  normal: THREE.Vector3;
  center: THREE.Vector3;
  vertices: THREE.Vector3[];
  edges: Array<{ start: THREE.Vector3; end: THREE.Vector3 }>;
}

export interface FaceSelectorProps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  objects: Array<{ id: string; mesh: THREE.Mesh }>;
  onFaceSelected?: (face: SelectedFace | null) => void;
  enabled: boolean;
}

export class FaceSelector {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private objects: Array<{ id: string; mesh: THREE.Mesh }>;
  
  private selectedFace: SelectedFace | null = null;
  private faceHighlight: THREE.Mesh | null = null;
  private edgeHighlights: THREE.LineSegments[] = [];
  private onFaceSelected?: (face: SelectedFace | null) => void;
  
  private enabled: boolean = false;

  constructor(props: FaceSelectorProps) {
    this.scene = props.scene;
    this.camera = props.camera;
    this.renderer = props.renderer;
    this.objects = props.objects;
    this.onFaceSelected = props.onFaceSelected;
    this.enabled = props.enabled;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearSelection();
    }
  }

  public updateObjects(objects: Array<{ id: string; mesh: THREE.Mesh }>): void {
    this.objects = objects;
  }

  public handleClick(event: MouseEvent): boolean {
    if (!this.enabled) return false;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = this.objects.map(obj => obj.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const mesh = intersection.object as THREE.Mesh;
      const objectId = this.objects.find(obj => obj.mesh === mesh)?.id;
      
      if (objectId && intersection.face) {
        const face = this.createSelectedFace(mesh, intersection, objectId);
        this.selectFace(face);
        return true;
      }
    }

    this.clearSelection();
    return false;
  }

  private createSelectedFace(mesh: THREE.Mesh, intersection: THREE.Intersection, objectId: string): SelectedFace {
    const face = intersection.face!;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute('position');
    
    // Get face vertices in world coordinates
    const vertices: THREE.Vector3[] = [];
    const indices = [face.a, face.b, face.c];
    
    indices.forEach(index => {
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(positionAttribute, index);
      vertex.applyMatrix4(mesh.matrixWorld);
      vertices.push(vertex);
    });

    // Calculate face center
    const center = new THREE.Vector3();
    vertices.forEach(v => center.add(v));
    center.divideScalar(vertices.length);

    // Get face normal in world coordinates
    const normal = face.normal.clone();
    normal.transformDirection(mesh.matrixWorld);
    normal.normalize();

    // Create edges
    const edges = [
      { start: vertices[0].clone(), end: vertices[1].clone() },
      { start: vertices[1].clone(), end: vertices[2].clone() },
      { start: vertices[2].clone(), end: vertices[0].clone() }
    ];

    return {
      faceIndex: intersection.faceIndex || 0,
      objectId,
      normal,
      center,
      vertices,
      edges
    };
  }

  private selectFace(face: SelectedFace): void {
    this.clearSelection();
    this.selectedFace = face;
    this.createFaceHighlight(face);
    this.createEdgeHighlights(face);
    this.onFaceSelected?.(face);
  }

  private createFaceHighlight(face: SelectedFace): void {
    // Create a transparent highlight for the face
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(9); // 3 vertices * 3 components
    
    face.vertices.forEach((vertex, i) => {
      positions[i * 3] = vertex.x;
      positions[i * 3 + 1] = vertex.y;
      positions[i * 3 + 2] = vertex.z;
    });
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthTest: false
    });
    
    this.faceHighlight = new THREE.Mesh(geometry, material);
    this.scene.add(this.faceHighlight);
  }

  private createEdgeHighlights(face: SelectedFace): void {
    face.edges.forEach(edge => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        edge.start.x, edge.start.y, edge.start.z,
        edge.end.x, edge.end.y, edge.end.z
      ]);
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const material = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        linewidth: 4,
        transparent: true,
        opacity: 0.8
      });
      
      const line = new THREE.LineSegments(geometry, material);
      this.edgeHighlights.push(line);
      this.scene.add(line);
    });
  }

  public clearSelection(): void {
    if (this.faceHighlight) {
      this.scene.remove(this.faceHighlight);
      this.faceHighlight.geometry.dispose();
      (this.faceHighlight.material as THREE.Material).dispose();
      this.faceHighlight = null;
    }

    this.edgeHighlights.forEach(line => {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.edgeHighlights = [];

    this.selectedFace = null;
    this.onFaceSelected?.(null);
  }

  public getSelectedFace(): SelectedFace | null {
    return this.selectedFace;
  }

  public dispose(): void {
    this.clearSelection();
  }
}
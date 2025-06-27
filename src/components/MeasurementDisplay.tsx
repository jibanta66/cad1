import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Vec3 } from '../utils/math';

export interface MeasurementLine {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  distance: number;
  label: string;
  color?: number;
}

export interface MeasurementDisplayProps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  measurements: MeasurementLine[];
  onMeasurementClick?: (id: string) => void;
}

export class MeasurementDisplay {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private measurements: MeasurementLine[] = [];
  private measurementObjects: Map<string, {
    line: THREE.Line;
    label: THREE.Sprite;
    points: THREE.Points;
  }> = new Map();

  constructor(props: MeasurementDisplayProps) {
    this.scene = props.scene;
    this.camera = props.camera;
    this.renderer = props.renderer;
  }

  public updateMeasurements(measurements: MeasurementLine[]): void {
    // Clear existing measurements
    this.clearAllMeasurements();
    
    // Add new measurements
    measurements.forEach(measurement => {
      this.addMeasurement(measurement);
    });
    
    this.measurements = measurements;
  }

  private addMeasurement(measurement: MeasurementLine): void {
    const color = measurement.color || 0xff6b35;
    
    // Create measurement line
    const lineGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      measurement.start.x, measurement.start.y, measurement.start.z,
      measurement.end.x, measurement.end.y, measurement.end.z
    ]);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const lineMaterial = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 3,
      transparent: true,
      opacity: 0.9
    });
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(line);

    // Create measurement points
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const pointsMaterial = new THREE.PointsMaterial({
      color: color,
      size: 8,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9
    });
    
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    this.scene.add(points);

    // Create text label
    const label = this.createTextSprite(measurement.label, color);
    
    // Position label at midpoint
    const midpoint = new THREE.Vector3()
      .addVectors(measurement.start, measurement.end)
      .multiplyScalar(0.5);
    
    // Offset label slightly above the line
    const offset = new THREE.Vector3(0, 0.2, 0);
    label.position.copy(midpoint.add(offset));
    
    this.scene.add(label);

    // Store references
    this.measurementObjects.set(measurement.id, {
      line,
      label,
      points
    });
  }

  private createTextSprite(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    // Set canvas size
    canvas.width = 256;
    canvas.height = 64;
    
    // Configure text style
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.font = 'Bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add background
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text
    context.fillStyle = '#ffffff';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1, 0.25, 1); // Adjust scale as needed
    
    return sprite;
  }

  private clearAllMeasurements(): void {
    this.measurementObjects.forEach(({ line, label, points }) => {
      this.scene.remove(line);
      this.scene.remove(label);
      this.scene.remove(points);
      
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      
      label.material.map?.dispose();
      label.material.dispose();
      
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    });
    
    this.measurementObjects.clear();
  }

  public dispose(): void {
    this.clearAllMeasurements();
  }
}
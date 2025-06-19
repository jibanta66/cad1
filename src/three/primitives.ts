import * as THREE from 'three';

export function createCubeGeometry(size: number = 1): THREE.BufferGeometry {
  return new THREE.BoxGeometry(size, size, size);
}

export function createSphereGeometry(radius: number = 1, segments: number = 32): THREE.BufferGeometry {
  return new THREE.SphereGeometry(radius, segments, segments);
}

export function createCylinderGeometry(radius: number = 1, height: number = 2, segments: number = 32): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(radius, radius, height, segments);
}

export function createPlaneGeometry(width: number = 1, height: number = 1): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(width, height);
}

export function createTorusGeometry(radius: number = 1, tube: number = 0.4, radialSegments: number = 16, tubularSegments: number = 100): THREE.BufferGeometry {
  return new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
}

export function createConeGeometry(radius: number = 1, height: number = 2, segments: number = 32): THREE.BufferGeometry {
  return new THREE.ConeGeometry(radius, height, segments);
}
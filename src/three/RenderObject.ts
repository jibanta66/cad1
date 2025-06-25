import * as THREE from 'three';
import { Vec3 } from '../utils/math';

export interface RenderObject {
  id: string;
  mesh: THREE.Mesh;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color: Vec3;
  selected: boolean;
  visible: boolean;
  originalMaterial?: THREE.Material;
}

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import debounce from 'lodash.debounce';

interface TransformGizmoProps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  selectedObject: THREE.Object3D | null;
  mode: 'translate' | 'rotate' | 'scale';
  onTransformStart?: () => void;
  onTransformEnd?: () => void;
  onTransform?: (object: THREE.Object3D) => void;
}

export const TransformGizmo: React.FC<TransformGizmoProps> = ({
  scene,
  camera,
  renderer,
  selectedObject,
  mode,
  onTransformStart,
  onTransformEnd,
  onTransform,
}) => {
  const controlsRef = useRef<TransformControls | null>(null);

  useEffect(() => {
    if (!scene || !camera || !renderer?.domElement) return;

    const controls = new TransformControls(camera, renderer.domElement);
    controlsRef.current = controls;

    // Listen for drag start/end
    const handleDragChange = (event: THREE.Event) => {
      const isDragging = (event as any).value as boolean;
      if (isDragging) {
        onTransformStart?.();
      } else {
        onTransformEnd?.();
      }
    };

    // Debounced transform event
    const handleChange = debounce(() => {
      if (selectedObject) {
        onTransform?.(selectedObject);
      }
    }, 50);

    controls.addEventListener('dragging-changed', handleDragChange);
    controls.addEventListener('change', handleChange);

    scene.add(controls);

    return () => {
      controls.removeEventListener('dragging-changed', handleDragChange);
      controls.removeEventListener('change', handleChange);
      scene.remove(controls);
      controls.dispose();
    };
  }, [scene, camera, renderer, onTransformStart, onTransformEnd, onTransform, selectedObject]);

  // Update mode
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.setMode(mode);
    }
  }, [mode]);

  // Attach/detach selected object
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (selectedObject) {
      // Ensure selectedObject is in scene graph
      if (!selectedObject.parent) {
        console.warn('TransformControls: selectedObject has no parent, cannot attach.');
        controls.detach();
        controls.visible = false;
        return;
      }
      controls.attach(selectedObject);
      controls.visible = true;
    } else {
      controls.detach();
      controls.visible = false;
    }

    return () => {
      if (controls) {
        controls.detach();
        controls.visible = false;
      }
    };
  }, [selectedObject]);

  return null;
};

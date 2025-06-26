import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
// Removed: import debounce from 'lodash.debounce'; // This import is no longer needed

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
    // Ensure scene, camera, and renderer are available before initializing controls
    if (!scene || !camera || !renderer?.domElement) return;

    // Create new TransformControls instance
    const controls = new TransformControls(camera, renderer.domElement);
    controlsRef.current = controls;

    // Event listener for when dragging starts or ends
    const handleDragChange = (event: THREE.Event) => {
      // The 'value' property indicates if dragging is active
      const isDragging = (event as any).value as boolean;
      if (isDragging) {
        // Callback for when transformation dragging starts
        onTransformStart?.();
      } else {
        // Callback for when transformation dragging ends
        onTransformEnd?.();
      }
    };

    // Transformation event: This will now fire immediately without debounce
    const handleChange = () => {
      if (selectedObject) {
        // Call the onTransform prop with the transformed object
        // This will allow the parent component to update its state immediately
        onTransform?.(selectedObject);
      }
    };

    // Add event listeners to the TransformControls instance
    controls.addEventListener('dragging-changed', handleDragChange);
    controls.addEventListener('change', handleChange); // No debounce here

    // Add the controls to the scene so it's rendered
    scene.add(controls);

    // Cleanup function: remove event listeners and dispose of controls when component unmounts or dependencies change
    return () => {
      controls.removeEventListener('dragging-changed', handleDragChange);
      controls.removeEventListener('change', handleChange);
      scene.remove(controls);
      controls.dispose(); // Important for releasing resources
    };
  }, [scene, camera, renderer, onTransformStart, onTransformEnd, onTransform, selectedObject]); // Re-run effect if these dependencies change

  // Effect to update the transformation mode (translate, rotate, scale)
  useEffect(() => {
    if (controlsRef.current) {
      // Set the mode of the TransformControls based on the 'mode' prop
      controlsRef.current.setMode(mode);
    }
  }, [mode]); // Re-run effect if the mode changes

  // Effect to attach or detach the selected object to the TransformControls
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return; // If controls are not yet initialized, exit

    if (selectedObject) {
      // Before attaching, ensure the selected object is part of the scene graph
      // This prevents errors if an object is passed that's not fully added to the scene
      if (!selectedObject.parent) {
        console.warn('TransformControls: selectedObject has no parent, cannot attach.');
        controls.detach(); // Detach any previously attached object
        controls.visible = false; // Make controls invisible if no valid object to attach
        return;
      }
      // Attach the selected 3D object to the TransformControls
      controls.attach(selectedObject);
      controls.visible = true; // Make controls visible
    } else {
      // If no object is selected, detach any existing object and hide controls
      controls.detach();
      controls.visible = false;
    }

    // Cleanup function for this effect: ensure controls are detached when component unmounts or selectedObject changes
    return () => {
      if (controls) {
        controls.detach();
        controls.visible = false;
      }
    };
  }, [selectedObject]); // Re-run effect if the selected object changes

  // This component doesn't render any DOM elements itself, it primarily manages the Three.js TransformControls
  return null;
};

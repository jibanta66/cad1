import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { ThreeRenderer, RenderObject, LightSettings, GridSettings } from '../three/ThreeRenderer';
import { TransformGizmo } from './TransformGizmo';
import { Vec3 } from '../utils/math';

interface Viewport3DProps {
  objects: RenderObject[];
  selectedObjectId: string | null;
  onObjectSelect: (id: string | null) => void;
  onCameraUpdate?: (position: Vec3, target: Vec3) => void;
  lightSettings: LightSettings;
  gridSettings: GridSettings;
  onMeasurementPoint?: (point: Vec3) => void;
  measurementActive?: boolean;
  transformMode: 'translate' | 'rotate' | 'scale';
  onSetTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  onObjectTransform?: (id: string, transform: { position?: Vec3; rotation?: Vec3; scale?: Vec3 }) => void;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  objects,
  selectedObjectId,
  onObjectSelect,
  onCameraUpdate,
  lightSettings,
  gridSettings,
  onMeasurementPoint,
  measurementActive = false,
  transformMode,
  onSetTransformMode,
  onObjectTransform
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ThreeRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [cameraControlsEnabled, setCameraControlsEnabled] = useState(true);

  // Camera state
  const cameraRef = useRef({
    distance: 15,
    azimuth: 0,
    elevation: Math.PI / 4,
    target: new Vec3(0, 0, 0),
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  // Update camera position and call callback
  const updateCamera = useCallback(() => {
    const camera = cameraRef.current;
    const position = new Vec3(
      camera.target.x + camera.distance * Math.cos(camera.elevation) * Math.cos(camera.azimuth),
      camera.target.y + camera.distance * Math.sin(camera.elevation),
      camera.target.z + camera.distance * Math.cos(camera.elevation) * Math.sin(camera.azimuth)
    );

    if (rendererRef.current) {
      rendererRef.current.updateCamera(position, camera.target);
    }

    onCameraUpdate?.(position, camera.target);
  }, [onCameraUpdate]);

  // Mouse event handlers for orbit controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (measurementActive || !cameraControlsEnabled) return;

    cameraRef.current.isDragging = true;
    cameraRef.current.lastMouseX = e.clientX;
    cameraRef.current.lastMouseY = e.clientY;
  }, [measurementActive, cameraControlsEnabled]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cameraRef.current.isDragging || measurementActive || !cameraControlsEnabled) return;

    const deltaX = e.clientX - cameraRef.current.lastMouseX;
    const deltaY = e.clientY - cameraRef.current.lastMouseY;

    cameraRef.current.azimuth -= deltaX * 0.01;
    cameraRef.current.elevation = Math.max(
      -Math.PI / 2 + 0.1,
      Math.min(Math.PI / 2 - 0.1, cameraRef.current.elevation - deltaY * 0.01)
    );

    cameraRef.current.lastMouseX = e.clientX;
    cameraRef.current.lastMouseY = e.clientY;

    updateCamera();
  }, [updateCamera, measurementActive, cameraControlsEnabled]);

  const handleMouseUp = useCallback(() => {
    cameraRef.current.isDragging = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    cameraRef.current.distance = Math.max(
      2,
      Math.min(50, cameraRef.current.distance + e.deltaY * 0.01)
    );
    updateCamera();
  }, [updateCamera]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (cameraRef.current.isDragging || !rendererRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (measurementActive && onMeasurementPoint) {
      const worldPoint = rendererRef.current.getIntersectionPoint(x, y);
      if (worldPoint) {
        const snappedPoint = rendererRef.current.snapToGrid(worldPoint);
        onMeasurementPoint(snappedPoint);
      }
    } else {
      const objectId = rendererRef.current.getObjectAtPoint(x, y);
      onObjectSelect(objectId);
    }
  }, [measurementActive, onMeasurementPoint, onObjectSelect]);

  // Handlers for TransformGizmo interaction
  const handleTransformStart = useCallback(() => {
    setCameraControlsEnabled(false);
  }, []);

  const handleTransformEnd = useCallback(() => {
    setCameraControlsEnabled(true);
  }, []);

  const handleTransform = useCallback((object: THREE.Object3D) => {
    if (!selectedObjectId || !onObjectTransform) return;

    const position = new Vec3(object.position.x, object.position.y, object.position.z);
    const rotation = new Vec3(object.rotation.x, object.rotation.y, object.rotation.z);
    const scale = new Vec3(object.scale.x, object.scale.y, object.scale.z);

    onObjectTransform(selectedObjectId, { position, rotation, scale });
  }, [selectedObjectId, onObjectTransform]);

  // Render loop
  const render = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.render();
    }
    animationFrameRef.current = requestAnimationFrame(render);
  }, []);

  // Initialize ThreeRenderer once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      rendererRef.current = new ThreeRenderer(canvas);
      updateCamera();
      setIsInitialized(true);
      render();
    } catch (error) {
      console.error('Failed to initialize Three.js:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [render, updateCamera]);

  // Incrementally update objects on changes
  useEffect(() => {
    if (!rendererRef.current || !isInitialized) return;

    const existingObjects = rendererRef.current.getObjects();
    const existingIds = new Set(existingObjects.map(obj => obj.id));
    const incomingIds = new Set(objects.map(obj => obj.id));

    // Remove objects no longer present
    existingObjects.forEach(obj => {
      if (!incomingIds.has(obj.id)) {
        rendererRef.current!.removeObject(obj.id);
      }
    });

    // Add or update objects
    objects.forEach(obj => {
      if (obj.mesh && obj.mesh.geometry) {
        if (!existingIds.has(obj.id)) {
          rendererRef.current!.addObject(obj.id, obj.mesh.geometry, obj.color);
        }
        rendererRef.current!.updateObject(obj.id, {
          position: obj.position,
          rotation: obj.rotation,
          scale: obj.scale,
          color: obj.color,
          selected: obj.id === selectedObjectId,
          visible: obj.visible
        });
      }
    });
  }, [objects, selectedObjectId, isInitialized]);

  // Update lighting and grid settings
  useEffect(() => {
    if (rendererRef.current && isInitialized) {
      rendererRef.current.updateLighting(lightSettings);
    }
  }, [lightSettings, isInitialized]);

  useEffect(() => {
    if (rendererRef.current && isInitialized) {
      rendererRef.current.updateGridSettings(gridSettings);
    }
  }, [gridSettings, isInitialized]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && rendererRef.current) {
        const rect = canvas.getBoundingClientRect();
        rendererRef.current.resize(rect.width, rect.height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts for transform mode (R, S, G)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'r' || e.key === 'R') {
        onSetTransformMode('rotate');
      } else if (e.key === 's' || e.key === 'S') {
        onSetTransformMode('scale');
      } else if (e.key === 'g' || e.key === 'G') {
        onSetTransformMode('translate');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSetTransformMode]);

  // Determine cursor style
  const getCursorStyle = () => {
    if (measurementActive) return 'cursor-crosshair';
    if (cameraRef.current.isDragging) return 'cursor-grabbing';
    if (!cameraControlsEnabled) return 'cursor-default';
    return 'cursor-grab';
  };

  // Selected mesh for TransformGizmo
  const selectedMesh = rendererRef.current?.getSelectedMesh() || null;

  return (
    <div className="w-full h-full relative bg-gray-900">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${getCursorStyle()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      />

      {/* Transform Gizmo */}
      {isInitialized && rendererRef.current && selectedMesh && (
        <TransformGizmo
          scene={rendererRef.current.getScene()}
          camera={rendererRef.current.getCamera()}
          renderer={rendererRef.current.getRenderer()}
          selectedObject={selectedMesh}
          mode={transformMode}
          onTransformStart={handleTransformStart}
          onTransformEnd={handleTransformEnd}
          onTransform={handleTransform}
        />
      )}
    </div>
  );
};
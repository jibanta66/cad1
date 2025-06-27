import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { FaceSelector, SelectedFace } from './FaceSelector';
import { MeasurementDisplay, MeasurementLine } from './MeasurementDisplay';
import { Vec3 } from '../utils/math';

export interface FaceMeasurementToolProps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  objects: Array<{ id: string; mesh: THREE.Mesh }>;
  enabled: boolean;
  onMeasurementChange?: (measurements: MeasurementLine[]) => void;
}

export const FaceMeasurementTool: React.FC<FaceMeasurementToolProps> = ({
  scene,
  camera,
  renderer,
  objects,
  enabled,
  onMeasurementChange
}) => {
  const faceSelectorRef = useRef<FaceSelector | null>(null);
  const measurementDisplayRef = useRef<MeasurementDisplay | null>(null);
  const [selectedFaces, setSelectedFaces] = useState<SelectedFace[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementLine[]>([]);
  const [measurementMode, setMeasurementMode] = useState<'distance' | 'angle' | 'area'>('distance');

  // Initialize face selector and measurement display
  useEffect(() => {
    if (!faceSelectorRef.current) {
      faceSelectorRef.current = new FaceSelector({
        scene,
        camera,
        renderer,
        objects,
        enabled,
        onFaceSelected: handleFaceSelected
      });
    }

    if (!measurementDisplayRef.current) {
      measurementDisplayRef.current = new MeasurementDisplay({
        scene,
        camera,
        renderer,
        measurements: []
      });
    }

    return () => {
      faceSelectorRef.current?.dispose();
      measurementDisplayRef.current?.dispose();
    };
  }, [scene, camera, renderer]);

  // Update enabled state
  useEffect(() => {
    faceSelectorRef.current?.setEnabled(enabled);
  }, [enabled]);

  // Update objects
  useEffect(() => {
    faceSelectorRef.current?.updateObjects(objects);
  }, [objects]);

  // Update measurements display
  useEffect(() => {
    measurementDisplayRef.current?.updateMeasurements(measurements);
    onMeasurementChange?.(measurements);
  }, [measurements, onMeasurementChange]);

  const handleFaceSelected = (face: SelectedFace | null) => {
    if (!face) {
      setSelectedFaces([]);
      return;
    }

    setSelectedFaces(prev => {
      const newFaces = [...prev, face];
      
      // Auto-create measurements based on mode
      if (measurementMode === 'distance' && newFaces.length === 2) {
        createDistanceMeasurement(newFaces[0], newFaces[1]);
        return []; // Clear selection after measurement
      }
      
      return newFaces;
    });
  };

  const createDistanceMeasurement = (face1: SelectedFace, face2: SelectedFace) => {
    const distance = face1.center.distanceTo(face2.center);
    const distanceInMm = distance * 1000; // Convert to mm (assuming units are in meters)
    
    const measurement: MeasurementLine = {
      id: `distance-${Date.now()}`,
      start: face1.center,
      end: face2.center,
      distance: distanceInMm,
      label: `${distanceInMm.toFixed(1)} mm`,
      color: 0xff6b35
    };

    setMeasurements(prev => [...prev, measurement]);
  };

  const handleCanvasClick = (event: MouseEvent) => {
    if (enabled) {
      faceSelectorRef.current?.handleClick(event);
    }
  };

  // Attach event listeners
  useEffect(() => {
    const canvas = renderer.domElement;
    canvas.addEventListener('click', handleCanvasClick);
    
    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [enabled, renderer]);

  const clearMeasurements = () => {
    setMeasurements([]);
    setSelectedFaces([]);
    faceSelectorRef.current?.clearSelection();
  };

  const deleteMeasurement = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-95 rounded-lg p-3 text-white text-sm max-w-xs">
      {enabled && (
        <>
          <div className="font-semibold mb-2 text-green-400">Face Measurement Mode</div>
          
          <div className="space-y-2 mb-3">
            <div className="text-xs text-gray-300">
              • Click faces to select them
              • Selected faces show green highlight
              • Distance measured between face centers
            </div>
            
            {selectedFaces.length > 0 && (
              <div className="text-xs text-blue-400">
                Selected faces: {selectedFaces.length}
                {measurementMode === 'distance' && selectedFaces.length === 1 && (
                  <div>Click another face to measure distance</div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-400">
              Measurements: {measurements.length}
            </div>
            
            {measurements.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {measurements.map(measurement => (
                  <div key={measurement.id} className="flex items-center justify-between text-xs bg-gray-700 p-2 rounded">
                    <span className="text-orange-300">{measurement.label}</span>
                    <button
                      onClick={() => deleteMeasurement(measurement.id)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {measurements.length > 0 && (
              <button
                onClick={clearMeasurements}
                className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
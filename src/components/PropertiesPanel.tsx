import React from 'react';
import { RenderObject } from '../webgl/renderer';

interface PropertiesPanelProps {
  selectedObject: RenderObject | null;
  onObjectUpdate: (id: string, updates: Partial<RenderObject>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedObject,
  onObjectUpdate
}) => {
  if (!selectedObject) {
    return (
      <div className="bg-gray-800 text-white p-4 flex items-center justify-center h-full">
        <div className="text-center text-gray-400">
          <div className="text-lg mb-2">No Object Selected</div>
          <div className="text-sm">Select an object to edit its properties</div>
        </div>
      </div>
    );
  }

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    onObjectUpdate(selectedObject.id, {
      position: {
        ...selectedObject.position,
        [axis]: value
      }
    });
  };

  const handleRotationChange = (axis: 'x' | 'y' | 'z', value: number) => {
    onObjectUpdate(selectedObject.id, {
      rotation: {
        ...selectedObject.rotation,
        [axis]: (value * Math.PI) / 180 // Convert degrees to radians
      }
    });
  };

  const handleScaleChange = (axis: 'x' | 'y' | 'z', value: number) => {
    onObjectUpdate(selectedObject.id, {
      scale: {
        ...selectedObject.scale,
        [axis]: Math.max(0.1, value)
      }
    });
  };

  const handleColorChange = (axis: 'x' | 'y' | 'z', value: number) => {
    onObjectUpdate(selectedObject.id, {
      color: {
        ...selectedObject.color,
        [axis]: Math.max(0, Math.min(1, value))
      }
    });
  };

  return (
    <div className="bg-gray-800 text-white p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Object Properties</h2>
        <div className="text-sm text-gray-400 bg-gray-700 px-3 py-2 rounded">
          ID: {selectedObject.id}
        </div>
      </div>

      {/* Position */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 text-blue-400">Position</h3>
        <div className="space-y-3">
          {(['x', 'y', 'z'] as const).map(axis => (
            <div key={axis} className="flex items-center gap-3">
              <label className="w-4 text-sm font-mono uppercase">{axis}</label>
              <input
                type="number"
                step="0.1"
                value={selectedObject.position[axis].toFixed(2)}
                onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value) || 0)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rotation */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 text-purple-400">Rotation (degrees)</h3>
        <div className="space-y-3">
          {(['x', 'y', 'z'] as const).map(axis => (
            <div key={axis} className="flex items-center gap-3">
              <label className="w-4 text-sm font-mono uppercase">{axis}</label>
              <input
                type="number"
                step="5"
                value={((selectedObject.rotation[axis] * 180) / Math.PI).toFixed(1)}
                onChange={(e) => handleRotationChange(axis, parseFloat(e.target.value) || 0)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Scale */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 text-green-400">Scale</h3>
        <div className="space-y-3">
          {(['x', 'y', 'z'] as const).map(axis => (
            <div key={axis} className="flex items-center gap-3">
              <label className="w-4 text-sm font-mono uppercase">{axis}</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={selectedObject.scale[axis].toFixed(2)}
                onChange={(e) => handleScaleChange(axis, parseFloat(e.target.value) || 0.1)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 text-orange-400">Color (RGB)</h3>
        <div className="space-y-3">
          {(['x', 'y', 'z'] as const).map((axis, index) => (
            <div key={axis} className="flex items-center gap-3">
              <label className="w-4 text-sm font-mono uppercase">
                {['R', 'G', 'B'][index]}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedObject.color[axis]}
                onChange={(e) => handleColorChange(axis, parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-xs text-gray-400">
                {(selectedObject.color[axis] * 255).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Color preview */}
        <div 
          className="mt-3 w-full h-8 rounded border border-gray-600"
          style={{
            backgroundColor: `rgb(${(selectedObject.color.x * 255).toFixed(0)}, ${(selectedObject.color.y * 255).toFixed(0)}, ${(selectedObject.color.z * 255).toFixed(0)})`
          }}
        />
      </div>
    </div>
  );
};
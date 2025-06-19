import React, { useState } from 'react';
import { X, Square, Circle, Minus, Hexagon as Polygon, Grid, Target, RotateCw, Plane, Layers } from 'lucide-react';

interface AdvancedSketchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onExtrude: (shapes: any[]) => void;
  onToolChange: (tool: string) => void;
  onModeChange: (mode: 'surface' | 'plane' | 'free') => void;
  onSettingsChange: (settings: any) => void;
  activeTool: string;
  sketchMode: 'surface' | 'plane' | 'free';
  snapToGrid: boolean;
  gridSize: number;
  workplaneVisible: boolean;
  currentShapes: any[];
}

export const AdvancedSketchPanel: React.FC<AdvancedSketchPanelProps> = ({
  isOpen,
  onClose,
  onExtrude,
  onToolChange,
  onModeChange,
  onSettingsChange,
  activeTool,
  sketchMode,
  snapToGrid,
  gridSize,
  workplaneVisible,
  currentShapes
}) => {
  const handleExtrude = () => {
    if (currentShapes.length > 0) {
      onExtrude(currentShapes);
      onClose();
    }
  };

  const handleClear = () => {
    // This will be handled by the parent component
    onSettingsChange({ clearSketch: true });
  };

  const handleFinishSketch = () => {
    // This will be handled by the parent component
    onSettingsChange({ finishSketch: true });
  };

  const tools = [
    { id: 'line', icon: Minus, label: 'Line', description: 'Draw straight lines' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', description: 'Draw rectangles' },
    { id: 'circle', icon: Circle, label: 'Circle', description: 'Draw circles' },
    { id: 'polygon', icon: Polygon, label: 'Polygon', description: 'Draw custom polygons' },
    { id: 'spline', icon: RotateCw, label: 'Spline', description: 'Draw curved lines' }
  ];

  const sketchModes = [
    { id: 'surface', icon: Layers, label: 'On Surface', description: 'Sketch on object surfaces' },
    { id: 'plane', icon: Plane, label: 'Work Plane', description: 'Create custom work planes' },
    { id: 'free', icon: Target, label: 'Free Space', description: 'Sketch in 3D space' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-none">
      <div className="pointer-events-auto">
        {/* Floating Control Panel */}
        <div className="fixed top-4 left-4 bg-gray-900 bg-opacity-95 rounded-xl shadow-2xl border border-gray-700 p-4 max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">3D Sketch Mode</h2>
              <p className="text-xs text-gray-400">Draw on surfaces or in space</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sketch Mode Selection */}
          <div className="mb-4">
            <span className="text-xs text-gray-300 font-medium block mb-2">Sketch Mode:</span>
            <div className="grid grid-cols-3 gap-1">
              {sketchModes.map(mode => {
                const IconComponent = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => onModeChange(mode.id as 'surface' | 'plane' | 'free')}
                    className={`
                      flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all text-xs
                      ${sketchMode === mode.id 
                        ? 'bg-purple-600 text-white shadow-lg' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }
                    `}
                    title={mode.description}
                  >
                    <IconComponent size={14} />
                    <span className="text-xs">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drawing Tools */}
          <div className="mb-4">
            <span className="text-xs text-gray-300 font-medium block mb-2">Tools:</span>
            <div className="grid grid-cols-5 gap-1">
              {tools.map(tool => {
                const IconComponent = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onToolChange(tool.id)}
                    className={`
                      flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all
                      ${activeTool === tool.id 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }
                    `}
                    title={tool.description}
                  >
                    <IconComponent size={14} />
                    <span className="text-xs">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings */}
          <div className="mb-4 space-y-3">
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => onSettingsChange({ snapToGrid: e.target.checked })}
                className="rounded"
              />
              <Grid size={12} />
              Snap to Grid
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300">Grid Size:</span>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={gridSize}
                onChange={(e) => onSettingsChange({ gridSize: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs text-gray-400 w-8">{gridSize.toFixed(1)}</span>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={workplaneVisible}
                onChange={(e) => onSettingsChange({ workplaneVisible: e.target.checked })}
                className="rounded"
              />
              <Plane size={12} />
              Show Workplane
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleFinishSketch}
              className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-xs"
            >
              Finish
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs"
            >
              Clear
            </button>
            <button
              onClick={handleExtrude}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs font-medium"
            >
              Extrude
            </button>
          </div>
        </div>

        {/* Instructions Overlay */}
        <div className="fixed bottom-4 left-4 bg-gray-900 bg-opacity-95 rounded-lg p-3 text-white text-xs max-w-sm">
          <div className="font-medium mb-2">3D Sketching Instructions:</div>
          <div className="text-gray-300 space-y-1">
            {sketchMode === 'surface' && (
              <>
                <div>• Click on any object surface to create a sketch plane</div>
                <div>• The sketch plane will align with the surface normal</div>
                <div>• Draw directly on the surface</div>
              </>
            )}
            {sketchMode === 'plane' && (
              <>
                <div>• Click to place a custom work plane</div>
                <div>• Use camera view to orient the plane</div>
                <div>• Sketch on the custom plane</div>
              </>
            )}
            {sketchMode === 'free' && (
              <>
                <div>• Sketch freely in 3D space</div>
                <div>• No surface constraints</div>
                <div>• Use for complex 3D curves</div>
              </>
            )}
          </div>
        </div>

        {/* Tool Status */}
        <div className="fixed top-4 right-4 bg-gray-900 bg-opacity-95 rounded-lg p-3 text-white text-xs">
          <div className="font-medium mb-2">Active: {tools.find(t => t.id === activeTool)?.label}</div>
          <div className="text-gray-300 space-y-1">
            <div>Mode: {sketchModes.find(m => m.id === sketchMode)?.label}</div>
            <div>Grid: {snapToGrid ? 'On' : 'Off'} ({gridSize})</div>
            <div>Workplane: {workplaneVisible ? 'Visible' : 'Hidden'}</div>
            <div>Shapes: {currentShapes.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
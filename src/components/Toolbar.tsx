import React from 'react';
import { 
  Box, Circle, Cylinder, Trash2, Move, RotateCcw, Scale, 
  PenTool, Ruler, Lightbulb, Grid, Target, Layers, Plane, Upload
} from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onAddPrimitive: (type: string) => void;
  onDeleteSelected: () => void;
  onOpenSketch: () => void;
  onOpenImport: () => void;
  onToggleMeasurement: () => void;
  onToggleLighting: () => void;
  onToggleGrid: () => void;
  hasSelection: boolean;
  measurementActive: boolean;
  lightingPanelOpen: boolean;
  gridPanelOpen: boolean;
  sketchMode?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  onAddPrimitive,
  onDeleteSelected,
  onOpenSketch,
  onOpenImport,
  onToggleMeasurement,
  onToggleLighting,
  onToggleGrid,
  hasSelection,
  measurementActive,
  lightingPanelOpen,
  gridPanelOpen,
  sketchMode = false
}) => {
  const basicTools = [
    { id: 'select', icon: Move, label: 'Select' },
    { id: 'face-select', icon: Target, label: 'Face Select', description: 'Select and measure faces' },
    { id: 'rotate', icon: RotateCcw, label: 'Rotate' },
    { id: 'scale', icon: Scale, label: 'Scale' },
  ];

  const primitives = [
    { id: 'cube', icon: Box, label: 'Cube' },
    { id: 'sphere', icon: Circle, label: 'Sphere' },
    { id: 'cylinder', icon: Cylinder, label: 'Cylinder' },
  ];

  const advancedTools = [
    { 
      id: 'sketch', 
      icon: sketchMode ? Plane : PenTool, 
      label: sketchMode ? '3D Sketch Active' : '3D Sketch',
      action: onOpenSketch,
      active: sketchMode,
      description: sketchMode ? 'Exit sketch mode' : '3D sketching on any surface'
    },
    { 
      id: 'import', 
      icon: Upload, 
      label: 'Import 3D',
      action: onOpenImport,
      description: 'Import OBJ, STL, PLY files'
    },
    { 
      id: 'measurement', 
      icon: Ruler, 
      label: 'Measurements',
      action: onToggleMeasurement,
      active: measurementActive,
      description: 'Distance, angle, and area tools'
    },
    { 
      id: 'lighting', 
      icon: Lightbulb, 
      label: 'Lighting',
      action: onToggleLighting,
      active: lightingPanelOpen,
      description: 'Scene lighting controls'
    },
    { 
      id: 'grid', 
      icon: Grid, 
      label: 'Grid',
      action: onToggleGrid,
      active: gridPanelOpen,
      description: 'Grid and snapping settings'
    }
  ];

  return (
    <div className="bg-gray-800 text-white p-4 flex flex-col gap-6 overflow-y-auto">
      {/* Basic Tools */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-gray-300 flex items-center gap-2">
          <Move size={16} />
          Basic Tools
        </h3>
        <div className="flex flex-col gap-2">
          {basicTools.map(tool => {
            const IconComponent = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                disabled={sketchMode && tool.id !== 'select'}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                  ${sketchMode && tool.id !== 'select'
                    ? 'text-gray-500 cursor-not-allowed' 
                    : activeTool === tool.id 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
                title={tool.description}
              >
                <IconComponent size={18} />
                <span className="text-sm">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primitives */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-gray-300 flex items-center gap-2">
          <Box size={16} />
          Add Shapes
        </h3>
        <div className="flex flex-col gap-2">
          {primitives.map(primitive => {
            const IconComponent = primitive.icon;
            return (
              <button
                key={primitive.id}
                onClick={() => onAddPrimitive(primitive.id)}
                disabled={sketchMode}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                  border
                  ${sketchMode
                    ? 'text-gray-500 border-gray-600 cursor-not-allowed'
                    : 'text-gray-300 hover:bg-purple-600 hover:text-white border-gray-600 hover:border-purple-500'
                  }
                `}
              >
                <IconComponent size={18} />
                <span className="text-sm">{primitive.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Tools */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-gray-300 flex items-center gap-2">
          <Layers size={16} />
          Advanced Tools
        </h3>
        <div className="flex flex-col gap-2">
          {advancedTools.map(tool => {
            const IconComponent = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={tool.action}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group
                  ${tool.active 
                    ? tool.id === 'sketch' 
                      ? 'bg-purple-600 text-white border-purple-500' 
                      : 'bg-green-600 text-white border-green-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white border-gray-600 hover:border-gray-500'
                  }
                  border
                `}
                title={tool.description}
              >
                <IconComponent size={18} />
                <div className="flex-1 text-left">
                  <div className="text-sm">{tool.label}</div>
                  <div className="text-xs opacity-75 group-hover:opacity-100 transition-opacity">
                    {tool.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-gray-300 flex items-center gap-2">
          <Target size={16} />
          Actions
        </h3>
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection || sketchMode}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full
            ${hasSelection && !sketchMode
              ? 'text-red-300 hover:bg-red-600 hover:text-white border border-red-500'
              : 'text-gray-500 border border-gray-600 cursor-not-allowed'
            }
          `}
        >
          <Trash2 size={18} />
          <span className="text-sm">Delete Selected</span>
        </button>
      </div>

      {/* Face Selection Info */}
      {activeTool === 'face-select' && (
        <div className="mt-auto pt-4 border-t border-gray-700">
          <div className="bg-blue-900 bg-opacity-50 rounded-lg p-3 border border-blue-700">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-blue-400" />
              <span className="text-sm font-semibold text-blue-300">Face Selection Mode</span>
            </div>
            <div className="text-xs text-blue-200 space-y-1">
              <div>• Click faces to select and highlight</div>
              <div>• Edges are highlighted in green</div>
              <div>• Measure distance between faces</div>
              <div>• Measurements shown in mm</div>
            </div>
          </div>
        </div>
      )}

      {/* Sketch Mode Info */}
      {sketchMode && (
        <div className="mt-auto pt-4 border-t border-gray-700">
          <div className="bg-purple-900 bg-opacity-50 rounded-lg p-3 border border-purple-700">
            <div className="flex items-center gap-2 mb-2">
              <Plane size={16} className="text-purple-400" />
              <span className="text-sm font-semibold text-purple-300">3D Sketch Mode</span>
            </div>
            <div className="text-xs text-purple-200 space-y-1">
              <div>• Click surfaces to create workplanes</div>
              <div>• Draw at any angle</div>
              <div>• Multi-surface sketching</div>
              <div>• Extrude to create 3D geometry</div>
            </div>
          </div>
        </div>
      )}

      {/* Tool Tips */}
      {!sketchMode && activeTool !== 'face-select' && (
        <div className="mt-auto pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            <div className="font-semibold text-gray-300 mb-2">Quick Tips:</div>
            <div className="space-y-1">
              <div>• Use Face Select for precise measurements</div>
              <div>• Use 3D Sketch for custom shapes</div>
              <div>• Import 3D files for complex models</div>
              <div>• Adjust lighting for better views</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
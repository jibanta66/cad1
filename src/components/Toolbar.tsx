import React from 'react';
import { 
  Box, Circle, Cylinder, Trash2, Move, RotateCcw, Scale, 
  PenTool, Ruler, Lightbulb, Grid, Target, Layers
} from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onAddPrimitive: (type: string) => void;
  onDeleteSelected: () => void;
  onOpenSketch: () => void;
  onToggleMeasurement: () => void;
  onToggleLighting: () => void;
  onToggleGrid: () => void;
  hasSelection: boolean;
  measurementActive: boolean;
  lightingPanelOpen: boolean;
  gridPanelOpen: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  onAddPrimitive,
  onDeleteSelected,
  onOpenSketch,
  onToggleMeasurement,
  onToggleLighting,
  onToggleGrid,
  hasSelection,
  measurementActive,
  lightingPanelOpen,
  gridPanelOpen
}) => {
  const basicTools = [
    { id: 'select', icon: Move, label: 'Select' },
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
      icon: PenTool, 
      label: 'Sketch & Extrude',
      action: onOpenSketch,
      description: '2D sketching with 3D extrusion'
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
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                  ${activeTool === tool.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
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
                className="
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                  text-gray-300 hover:bg-purple-600 hover:text-white
                  border border-gray-600 hover:border-purple-500
                "
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
                    ? 'bg-green-600 text-white border-green-500' 
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
          disabled={!hasSelection}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full
            ${hasSelection
              ? 'text-red-300 hover:bg-red-600 hover:text-white border border-red-500'
              : 'text-gray-500 border border-gray-600 cursor-not-allowed'
            }
          `}
        >
          <Trash2 size={18} />
          <span className="text-sm">Delete Selected</span>
        </button>
      </div>

      {/* Tool Tips */}
      <div className="mt-auto pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          <div className="font-semibold text-gray-300 mb-2">Quick Tips:</div>
          <div className="space-y-1">
            <div>• Use Sketch for custom shapes</div>
            <div>• Measure with precision tools</div>
            <div>• Adjust lighting for better views</div>
            <div>• Enable grid for alignment</div>
          </div>
        </div>
      </div>
    </div>
  );
};
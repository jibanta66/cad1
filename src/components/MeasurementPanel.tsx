import React from 'react';
import { Ruler, Triangle, Square, Trash2, Target } from 'lucide-react';
import { Measurement } from '../utils/measurement';

interface MeasurementPanelProps {
  measurements: Measurement[];
  activeTool: string | null;
  onToolChange: (tool: string | null) => void;
  onDeleteMeasurement: (id: string) => void;
  onClearAll: () => void;
  tempPoints: number;
}

export const MeasurementPanel: React.FC<MeasurementPanelProps> = ({
  measurements,
  activeTool,
  onToolChange,
  onDeleteMeasurement,
  onClearAll,
  tempPoints
}) => {
  const tools = [
    { id: 'distance', icon: Ruler, label: 'Distance', points: 2 },
    { id: 'angle', icon: Triangle, label: 'Angle', points: 3 },
    { id: 'area', icon: Square, label: 'Area', points: '3+' }
  ];

  const formatValue = (measurement: Measurement): string => {
    switch (measurement.type) {
      case 'distance':
        return `${measurement.value.toFixed(2)} ${measurement.unit}`;
      case 'angle':
        return `${measurement.value.toFixed(1)}°`;
      case 'area':
        return `${measurement.value.toFixed(2)} ${measurement.unit}`;
      default:
        return measurement.label;
    }
  };

  const getStatusText = (): string => {
    if (!activeTool) return 'Select a measurement tool';
    
    const tool = tools.find(t => t.id === activeTool);
    if (!tool) return '';

    if (activeTool === 'area') {
      if (tempPoints === 0) return 'Click points to define area boundary';
      if (tempPoints < 3) return `Click ${3 - tempPoints} more points (minimum 3)`;
      return `${tempPoints} points selected. Click "Finish Area" or add more points`;
    } else {
      const needed = typeof tool.points === 'number' ? tool.points - tempPoints : 0;
      if (needed > 0) return `Click ${needed} more point${needed > 1 ? 's' : ''}`;
      return 'Measurement complete';
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target size={20} />
          Measurement Tools
        </h2>

        {/* Tool Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-blue-400">Tools</h3>
          <div className="space-y-2">
            {tools.map(tool => {
              const IconComponent = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                    ${activeTool === tool.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }
                  `}
                >
                  <IconComponent size={18} />
                  <span className="flex-1 text-left">{tool.label}</span>
                  <span className="text-xs opacity-75">
                    {tool.points} pts
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        {activeTool && (
          <div className="mb-6 p-3 bg-blue-900 bg-opacity-50 rounded-lg border border-blue-700">
            <div className="text-sm text-blue-200">
              {getStatusText()}
            </div>
            {tempPoints > 0 && (
              <div className="text-xs text-blue-300 mt-1">
                Points selected: {tempPoints}
              </div>
            )}
          </div>
        )}

        {/* Active Measurements */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-green-400">Measurements</h3>
            {measurements.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {measurements.length === 0 ? (
            <div className="text-center text-gray-400 py-4 text-sm">
              No measurements yet
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {measurements.map(measurement => {
                const IconComponent = tools.find(t => t.id === measurement.type)?.icon || Ruler;
                return (
                  <div
                    key={measurement.id}
                    className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg"
                  >
                    <IconComponent size={16} className="text-green-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {formatValue(measurement)}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        {measurement.type}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteMeasurement(measurement.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-400 space-y-2">
          <div className="font-semibold text-gray-300">How to measure:</div>
          <div><strong>Distance:</strong> Click two points</div>
          <div><strong>Angle:</strong> Click three points (vertex in middle)</div>
          <div><strong>Area:</strong> Click points to form a polygon, then finish</div>
        </div>

        {/* Statistics */}
        {measurements.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              <div>Total Measurements: {measurements.length}</div>
              <div>Distance: {measurements.filter(m => m.type === 'distance').length}</div>
              <div>Angle: {measurements.filter(m => m.type === 'angle').length}</div>
              <div>Area: {measurements.filter(m => m.type === 'area').length}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
import React from 'react';
import { Sun, Lightbulb, Zap, RotateCcw } from 'lucide-react';

interface LightSettings {
  ambient: {
    intensity: number;
    color: [number, number, number];
  };
  directional: {
    intensity: number;
    color: [number, number, number];
    position: [number, number, number];
  };
  point: {
    intensity: number;
    color: [number, number, number];
    position: [number, number, number];
  };
}

interface LightingPanelProps {
  settings: LightSettings;
  onSettingsChange: (settings: LightSettings) => void;
}

export const LightingPanel: React.FC<LightingPanelProps> = ({
  settings,
  onSettingsChange
}) => {
  const updateAmbient = (updates: Partial<LightSettings['ambient']>) => {
    onSettingsChange({
      ...settings,
      ambient: { ...settings.ambient, ...updates }
    });
  };

  const updateDirectional = (updates: Partial<LightSettings['directional']>) => {
    onSettingsChange({
      ...settings,
      directional: { ...settings.directional, ...updates }
    });
  };

  const updatePoint = (updates: Partial<LightSettings['point']>) => {
    onSettingsChange({
      ...settings,
      point: { ...settings.point, ...updates }
    });
  };

  const applyPreset = (preset: string) => {
    const presets: { [key: string]: LightSettings } = {
      default: {
        ambient: { intensity: 0.2, color: [1, 1, 1] },
        directional: { intensity: 0.8, color: [1, 1, 1], position: [10, 10, 10] },
        point: { intensity: 0.5, color: [1, 1, 1], position: [5, 5, 5] }
      },
      studio: {
        ambient: { intensity: 0.3, color: [0.9, 0.95, 1] },
        directional: { intensity: 1.2, color: [1, 0.95, 0.8], position: [15, 20, 10] },
        point: { intensity: 0.8, color: [0.8, 0.9, 1], position: [-10, 15, 8] }
      },
      dramatic: {
        ambient: { intensity: 0.1, color: [0.5, 0.5, 0.8] },
        directional: { intensity: 1.5, color: [1, 0.8, 0.6], position: [20, 30, -10] },
        point: { intensity: 1.0, color: [0.8, 0.4, 0.2], position: [0, 10, 15] }
      }
    };

    if (presets[preset]) {
      onSettingsChange(presets[preset]);
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lightbulb size={20} />
          Lighting Controls
        </h2>

        {/* Presets */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-blue-400">Presets</h3>
          <div className="grid grid-cols-3 gap-2">
            {['default', 'studio', 'dramatic'].map(preset => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm capitalize transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Ambient Light */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-yellow-400 flex items-center gap-2">
            <Sun size={16} />
            Ambient Light
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Intensity</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.ambient.intensity}
                onChange={(e) => updateAmbient({ intensity: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-xs text-gray-400">{settings.ambient.intensity.toFixed(1)}</span>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Color</label>
              <div className="grid grid-cols-3 gap-2">
                {(['R', 'G', 'B'] as const).map((channel, index) => (
                  <div key={channel}>
                    <label className="block text-xs text-gray-500 mb-1">{channel}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.ambient.color[index]}
                      onChange={(e) => {
                        const newColor = [...settings.ambient.color] as [number, number, number];
                        newColor[index] = parseFloat(e.target.value);
                        updateAmbient({ color: newColor });
                      }}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Directional Light */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-orange-400 flex items-center gap-2">
            <Zap size={16} />
            Directional Light
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Intensity</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.directional.intensity}
                onChange={(e) => updateDirectional({ intensity: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-xs text-gray-400">{settings.directional.intensity.toFixed(1)}</span>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Position</label>
              <div className="grid grid-cols-3 gap-2">
                {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                  <div key={axis}>
                    <label className="block text-xs text-gray-500 mb-1">{axis}</label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="1"
                      value={settings.directional.position[index]}
                      onChange={(e) => {
                        const newPos = [...settings.directional.position] as [number, number, number];
                        newPos[index] = parseFloat(e.target.value);
                        updateDirectional({ position: newPos });
                      }}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-500">{settings.directional.position[index]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Point Light */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-purple-400 flex items-center gap-2">
            <Lightbulb size={16} />
            Point Light
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Intensity</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.point.intensity}
                onChange={(e) => updatePoint({ intensity: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-xs text-gray-400">{settings.point.intensity.toFixed(1)}</span>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Position</label>
              <div className="grid grid-cols-3 gap-2">
                {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                  <div key={axis}>
                    <label className="block text-xs text-gray-500 mb-1">{axis}</label>
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      step="1"
                      value={settings.point.position[index]}
                      onChange={(e) => {
                        const newPos = [...settings.point.position] as [number, number, number];
                        newPos[index] = parseFloat(e.target.value);
                        updatePoint({ position: newPos });
                      }}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-500">{settings.point.position[index]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => applyPreset('default')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
        >
          <RotateCcw size={16} />
          Reset to Default
        </button>
      </div>
    </div>
  );
};
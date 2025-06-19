import React from 'react';
import { Grid, Eye, EyeOff, Magnet, RotateCcw } from 'lucide-react';
import { GridSettings } from '../webgl/grid';

interface GridPanelProps {
  settings: GridSettings;
  onSettingsChange: (settings: GridSettings) => void;
}

export const GridPanel: React.FC<GridPanelProps> = ({
  settings,
  onSettingsChange
}) => {
  const updateSettings = (updates: Partial<GridSettings>) => {
    onSettingsChange({ ...settings, ...updates });
  };

  const applyPreset = (preset: string) => {
    const presets: { [key: string]: Partial<GridSettings> } = {
      fine: { size: 5, divisions: 50, opacity: 0.2 },
      medium: { size: 10, divisions: 20, opacity: 0.3 },
      coarse: { size: 20, divisions: 10, opacity: 0.4 }
    };

    if (presets[preset]) {
      updateSettings(presets[preset]);
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Grid size={20} />
          Grid Controls
        </h2>

        {/* Visibility Toggle */}
        <div className="mb-6">
          <button
            onClick={() => updateSettings({ visible: !settings.visible })}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all
              ${settings.visible 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }
            `}
          >
            {settings.visible ? <Eye size={18} /> : <EyeOff size={18} />}
            {settings.visible ? 'Grid Visible' : 'Grid Hidden'}
          </button>
        </div>

        {/* Snap Toggle */}
        <div className="mb-6">
          <button
            onClick={() => updateSettings({ snapEnabled: !settings.snapEnabled })}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all
              ${settings.snapEnabled 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }
            `}
          >
            <Magnet size={18} />
            {settings.snapEnabled ? 'Snap Enabled' : 'Snap Disabled'}
          </button>
        </div>

        {/* Grid Size */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-blue-400">Grid Size</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Size (units)</label>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={settings.size}
                onChange={(e) => updateSettings({ size: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span className="font-mono">{settings.size}</span>
                <span>50</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Divisions */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-purple-400">Grid Divisions</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Divisions per side</label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={settings.divisions}
                onChange={(e) => updateSettings({ divisions: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5</span>
                <span className="font-mono">{settings.divisions}</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Opacity */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-green-400">Appearance</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Opacity</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.opacity}
                onChange={(e) => updateSettings({ opacity: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10%</span>
                <span className="font-mono">{Math.round(settings.opacity * 100)}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Color */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-orange-400">Grid Color</h3>
          <div className="space-y-3">
            {(['R', 'G', 'B'] as const).map((channel, index) => (
              <div key={channel}>
                <label className="block text-xs text-gray-400 mb-1">{channel} Channel</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.color[['x', 'y', 'z'][index] as 'x' | 'y' | 'z']}
                  onChange={(e) => {
                    const newColor = { ...settings.color };
                    newColor[['x', 'y', 'z'][index] as 'x' | 'y' | 'z'] = parseFloat(e.target.value);
                    updateSettings({ color: newColor });
                  }}
                  className="w-full"
                />
                <span className="text-xs text-gray-400">
                  {Math.round(settings.color[['x', 'y', 'z'][index] as 'x' | 'y' | 'z'] * 255)}
                </span>
              </div>
            ))}
          </div>
          
          {/* Color preview */}
          <div 
            className="mt-3 w-full h-6 rounded border border-gray-600"
            style={{
              backgroundColor: `rgb(${Math.round(settings.color.x * 255)}, ${Math.round(settings.color.y * 255)}, ${Math.round(settings.color.z * 255)})`
            }}
          />
        </div>

        {/* Presets */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-yellow-400">Presets</h3>
          <div className="grid grid-cols-3 gap-2">
            {['fine', 'medium', 'coarse'].map(preset => (
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

        {/* Reset Button */}
        <button
          onClick={() => updateSettings({
            size: 10,
            divisions: 20,
            opacity: 0.3,
            visible: true,
            snapEnabled: true,
            color: { x: 0.5, y: 0.5, z: 0.5 }
          })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
        >
          <RotateCcw size={16} />
          Reset to Default
        </button>

        {/* Grid Info */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 space-y-1">
            <div>Total Lines: {(settings.divisions + 1) * 2}</div>
            <div>Grid Spacing: {(settings.size * 2) / settings.divisions} units</div>
            <div>Coverage: {settings.size * 2} × {settings.size * 2} units</div>
          </div>
        </div>
      </div>
    </div>
  );
};
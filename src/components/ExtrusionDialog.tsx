import React, { useState } from 'react';
import { X, Zap, Settings } from 'lucide-react';
import { ExtrusionOptions } from '../utils/extruder';

interface ExtrusionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExtrude: (options: ExtrusionOptions) => void;
  shapeCount: number;
}

export const ExtrusionDialog: React.FC<ExtrusionDialogProps> = ({
  isOpen,
  onClose,
  onExtrude,
  shapeCount
}) => {
  const [options, setOptions] = useState<ExtrusionOptions>({
    depth: 1.0,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.01,
    bevelSegments: 3,
  });

  const handleExtrude = () => {
    onExtrude(options);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Extrude Shapes</h2>
              <p className="text-sm text-gray-400">Convert 2D sketches to 3D objects</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Shape count info */}
        <div className="mb-6 p-3 bg-gray-800 rounded-lg border border-gray-600">
          <p className="text-white text-sm">
            <span className="font-semibold text-blue-400">{shapeCount}</span> shape{shapeCount !== 1 ? 's' : ''} selected for extrusion
          </p>
        </div>

        {/* Extrusion Options */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Extrusion Depth
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={options.depth}
                onChange={(e) => setOptions(prev => ({ ...prev, depth: parseFloat(e.target.value) }))}
                className="flex-1"
              />
              <div className="w-16 px-2 py-1 bg-gray-800 rounded text-white text-sm text-center">
                {options.depth.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Bevel Options</span>
            </div>
            
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={options.bevelEnabled}
                onChange={(e) => setOptions(prev => ({ ...prev, bevelEnabled: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-gray-300">Enable Beveling</span>
            </label>

            {options.bevelEnabled && (
              <div className="space-y-3 ml-6">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Bevel Thickness</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.01"
                      max="0.1"
                      step="0.01"
                      value={options.bevelThickness}
                      onChange={(e) => setOptions(prev => ({ ...prev, bevelThickness: parseFloat(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-400 w-12">{options.bevelThickness?.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Bevel Size</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.005"
                      max="0.05"
                      step="0.005"
                      value={options.bevelSize}
                      onChange={(e) => setOptions(prev => ({ ...prev, bevelSize: parseFloat(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-400 w-12">{options.bevelSize?.toFixed(3)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Bevel Segments</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      value={options.bevelSegments}
                      onChange={(e) => setOptions(prev => ({ ...prev, bevelSegments: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-400 w-12">{options.bevelSegments}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExtrude}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Zap size={16} />
            Extrude
          </button>
        </div>
      </div>
    </div>
  );
};
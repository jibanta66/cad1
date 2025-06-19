import React from 'react';
import { 
  Move, RotateCcw, Scale, Copy, Trash2, Eye, EyeOff, 
  Layers, Minus, Plus, FlipHorizontal, FlipVertical,
  CornerUpRight, CornerDownLeft, Maximize2
} from 'lucide-react';

interface ContextToolbarProps {
  selectedObjectId: string | null;
  transformMode: 'translate' | 'rotate' | 'scale';
  onTransformModeChange: (mode: 'translate' | 'rotate' | 'scale') => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onOffsetFace: () => void;
  onOffsetBody: () => void;
  onMirrorX: () => void;
  onMirrorY: () => void;
  onMirrorZ: () => void;
  onResetTransform: () => void;
  isVisible: boolean;
}

export const ContextToolbar: React.FC<ContextToolbarProps> = ({
  selectedObjectId,
  transformMode,
  onTransformModeChange,
  onDuplicate,
  onDelete,
  onToggleVisibility,
  onOffsetFace,
  onOffsetBody,
  onMirrorX,
  onMirrorY,
  onMirrorZ,
  onResetTransform,
  isVisible
}) => {
  if (!selectedObjectId) return null;

  const transformTools = [
    { 
      id: 'translate', 
      icon: Move, 
      label: 'Move (G)', 
      shortcut: 'G',
      active: transformMode === 'translate'
    },
    { 
      id: 'rotate', 
      icon: RotateCcw, 
      label: 'Rotate (R)', 
      shortcut: 'R',
      active: transformMode === 'rotate'
    },
    { 
      id: 'scale', 
      icon: Scale, 
      label: 'Scale (S)', 
      shortcut: 'S',
      active: transformMode === 'scale'
    }
  ];

  const actionTools = [
    { icon: Copy, label: 'Duplicate', action: onDuplicate },
    { icon: isVisible ? Eye : EyeOff, label: 'Toggle Visibility', action: onToggleVisibility },
    { icon: Trash2, label: 'Delete', action: onDelete, danger: true }
  ];

  const offsetTools = [
    { icon: CornerUpRight, label: 'Offset Face', action: onOffsetFace },
    { icon: Maximize2, label: 'Offset Body', action: onOffsetBody }
  ];

  const mirrorTools = [
    { icon: FlipHorizontal, label: 'Mirror X', action: onMirrorX },
    { icon: FlipVertical, label: 'Mirror Y', action: onMirrorY },
    { icon: Layers, label: 'Mirror Z', action: onMirrorZ }
  ];

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-2">
        <div className="flex items-center gap-1">
          {/* Transform Tools */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-600">
            {transformTools.map(tool => {
              const IconComponent = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => onTransformModeChange(tool.id as 'translate' | 'rotate' | 'scale')}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                    ${tool.active 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                  title={tool.label}
                >
                  <IconComponent size={18} />
                  <span className="text-xs font-mono opacity-75">{tool.shortcut}</span>
                </button>
              );
            })}
          </div>

          {/* Offset Tools */}
          <div className="flex items-center gap-1 px-2 border-r border-gray-600">
            {offsetTools.map((tool, index) => {
              const IconComponent = tool.icon;
              return (
                <button
                  key={index}
                  onClick={tool.action}
                  className="flex items-center gap-1 px-2 py-2 rounded-lg text-gray-300 hover:bg-purple-600 hover:text-white transition-all duration-200"
                  title={tool.label}
                >
                  <IconComponent size={16} />
                </button>
              );
            })}
          </div>

          {/* Mirror Tools */}
          <div className="flex items-center gap-1 px-2 border-r border-gray-600">
            {mirrorTools.map((tool, index) => {
              const IconComponent = tool.icon;
              return (
                <button
                  key={index}
                  onClick={tool.action}
                  className="flex items-center gap-1 px-2 py-2 rounded-lg text-gray-300 hover:bg-green-600 hover:text-white transition-all duration-200"
                  title={tool.label}
                >
                  <IconComponent size={16} />
                </button>
              );
            })}
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1 pl-2">
            {actionTools.map((tool, index) => {
              const IconComponent = tool.icon;
              return (
                <button
                  key={index}
                  onClick={tool.action}
                  className={`
                    flex items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200
                    ${tool.danger 
                      ? 'text-gray-300 hover:bg-red-600 hover:text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                  title={tool.label}
                >
                  <IconComponent size={16} />
                </button>
              );
            })}
          </div>

          {/* Reset Transform */}
          <div className="pl-2 border-l border-gray-600">
            <button
              onClick={onResetTransform}
              className="flex items-center gap-1 px-2 py-2 rounded-lg text-gray-300 hover:bg-orange-600 hover:text-white transition-all duration-200"
              title="Reset Transform"
            >
              <CornerDownLeft size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
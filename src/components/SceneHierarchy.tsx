import React from 'react';
import { RenderObject } from '../webgl/renderer';
import { Eye, EyeOff, Box, Circle, Cylinder } from 'lucide-react';

interface SceneHierarchyProps {
  objects: RenderObject[];
  selectedObjectId: string | null;
  onObjectSelect: (id: string) => void;
  onObjectVisibilityToggle: (id: string) => void;
}

export const SceneHierarchy: React.FC<SceneHierarchyProps> = ({
  objects,
  selectedObjectId,
  onObjectSelect,
  onObjectVisibilityToggle
}) => {
  const getObjectIcon = (id: string) => {
    if (id.includes('cube')) return Box;
    if (id.includes('sphere')) return Circle;
    if (id.includes('cylinder')) return Cylinder;
    return Box;
  };

  const getObjectName = (id: string) => {
    const parts = id.split('-');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-md text-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">Scene Hierarchy</h2>
      
      {objects.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <div className="text-sm">No objects in scene</div>
          <div className="text-xs mt-1">Add shapes to get started</div>
        </div>
      ) : (
        <div className="space-y-1">
          {objects.map(obj => {
            const IconComponent = getObjectIcon(obj.id);
            const isSelected = selectedObjectId === obj.id;
            
            return (
              <div
                key={obj.id}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200
                  ${isSelected 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-gray-700 text-gray-300'
                  }
                `}
                onClick={() => onObjectSelect(obj.id)}
              >
                <IconComponent size={14} />
                <span className="flex-1 text-sm truncate">
                  {getObjectName(obj.id)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onObjectVisibilityToggle(obj.id);
                  }}
                  className="opacity-50 hover:opacity-100 transition-opacity"
                >
                  <Eye size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Scene stats */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          <div>Objects: {objects.length}</div>
          <div>Selected: {selectedObjectId ? getObjectName(selectedObjectId) : 'None'}</div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onTransformModeChange: (mode: 'translate' | 'rotate' | 'scale') => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onDeselect: () => void;
  selectedObjectId: string | null;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  onTransformModeChange,
  onDuplicate,
  onDelete,
  onSelectAll,
  onDeselect,
  selectedObjectId
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();
      const ctrlOrCmd = event.ctrlKey || event.metaKey;

      // Transform shortcuts
      if (selectedObjectId) {
        switch (key) {
          case 'g':
            event.preventDefault();
            onTransformModeChange('translate');
            break;
          case 'r':
            event.preventDefault();
            onTransformModeChange('rotate');
            break;
          case 's':
            if (!ctrlOrCmd) { // Avoid conflict with Ctrl+S (save)
              event.preventDefault();
              onTransformModeChange('scale');
            }
            break;
          case 'delete':
          case 'backspace':
            event.preventDefault();
            onDelete();
            break;
        }
      }

      // Global shortcuts
      if (ctrlOrCmd) {
        switch (key) {
          case 'd':
            event.preventDefault();
            onDuplicate();
            break;
          case 'a':
            event.preventDefault();
            onSelectAll();
            break;
        }
      }

      // Escape to deselect
      if (key === 'escape') {
        event.preventDefault();
        onDeselect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, onTransformModeChange, onDuplicate, onDelete, onSelectAll, onDeselect]);

  return null; // This component doesn't render anything
};
// components/CollapsiblePanel.tsx
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react'; // Assuming you have lucide-react

interface CollapsiblePanelProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  minimizedIcon?: React.ReactNode;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  isOpen,
  onToggle,
  children,
  className = '',
  minimizedIcon,
}) => {
  return (
    <div className={`bg-gray-800 border-b border-gray-700 ${className}`}>
      <div
        className="flex items-center justify-between p-3 cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors"
        onClick={onToggle}
      >
        <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
        {isOpen ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </div>
      {isOpen && <div className="p-3">{children}</div>}
      {!isOpen && minimizedIcon && (
        <div
          className="p-3 flex justify-center items-center cursor-pointer hover:bg-gray-600 transition-colors"
          onClick={onToggle}
          title={title}
        >
          {minimizedIcon}
        </div>
      )}
    </div>
  );
};
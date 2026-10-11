import React from 'react';
import { Layers, Sliders, Palette, BookOpen } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';

export const LeftIconRail: React.FC = () => {
  return (
    <aside className="left-icon-rail" aria-label="Tool rail placeholder">
      {/* 24x24 Logo Slot */}
      <div className="left-rail-logo">
        <span>L</span>
      </div>
      <div className="left-rail-divider" />
      {/* 4 disabled icon buttons at 16px */}
      <div className="left-rail-actions">
        <Tooltip text="Coming in a later phase">
          <button 
            className="rail-icon-btn" 
            disabled 
          >
            <Sliders size={16} />
          </button>
        </Tooltip>
        <Tooltip text="Coming in a later phase">
          <button 
            className="rail-icon-btn" 
            disabled 
          >
            <Palette size={16} />
          </button>
        </Tooltip>
        <Tooltip text="Coming in a later phase">
          <button 
            className="rail-icon-btn" 
            disabled 
          >
            <Layers size={16} />
          </button>
        </Tooltip>
        <Tooltip text="Coming in a later phase">
          <button 
            className="rail-icon-btn" 
            disabled 
          >
            <BookOpen size={16} />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
};

import React from 'react';
import { Layers, Sliders, Palette, BookOpen } from 'lucide-react';

export const LeftIconRail: React.FC = () => {
  return (
    <aside className="left-icon-rail" aria-label="Tool rail placeholder">
      {/* 24x24 Logo Slot */}
      <div className="left-rail-logo" title="Logo placeholder [NEW - placeholder; logo asset TBD by user]">
        <span>L</span>
      </div>
      <div className="left-rail-divider" />
      {/* 4 disabled icon buttons at 16px */}
      <div className="left-rail-actions">
        <button 
          className="rail-icon-btn" 
          disabled 
          title="Coming in a later phase"
        >
          <Sliders size={16} />
        </button>
        <button 
          className="rail-icon-btn" 
          disabled 
          title="Coming in a later phase"
        >
          <Palette size={16} />
        </button>
        <button 
          className="rail-icon-btn" 
          disabled 
          title="Coming in a later phase"
        >
          <Layers size={16} />
        </button>
        <button 
          className="rail-icon-btn" 
          disabled 
          title="Coming in a later phase"
        >
          <BookOpen size={16} />
        </button>
      </div>
    </aside>
  );
};

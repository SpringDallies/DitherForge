import React from 'react';
import { History, Layers, BookOpen, Settings, Info } from 'lucide-react';

export const LeftIconRail: React.FC = () => {
  return (
    <aside className="left-icon-rail" aria-label="Tool rail placeholder">
      <div className="left-rail-logo" title="Logo placeholder (Phase 6/7)">
        <span>LOGO</span>
      </div>
      <div className="left-rail-divider" />
      <div className="left-rail-actions">
        <button className="rail-icon-btn" disabled title="Coming in a later phase">
          <History size={16} />
        </button>
        <button className="rail-icon-btn" disabled title="Coming in a later phase">
          <Layers size={16} />
        </button>
        <button className="rail-icon-btn" disabled title="Coming in a later phase">
          <BookOpen size={16} />
        </button>
        <button className="rail-icon-btn" disabled title="Coming in a later phase">
          <Settings size={16} />
        </button>
        <button className="rail-icon-btn" disabled title="Coming in a later phase">
          <Info size={16} />
        </button>
      </div>
    </aside>
  );
};

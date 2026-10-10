import React from 'react';
import { useAppStore } from '../../state/useAppStore';
import { Maximize2 } from 'lucide-react';

export const BottomControlStrip: React.FC = () => {
  const updateMode = useAppStore((state) => state.updateMode);
  const setUpdateMode = useAppStore((state) => state.setUpdateMode);
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const lastRenderMs = useAppStore((state) => state.lastRenderMs);

  return (
    <footer className="bottom-control-strip">
      {/* Left: Segmented Switch [ Precise | Live | Settle ] */}
      <div className="segmented-switch" role="group" aria-label="Update Mode">
        <button
          className={`switch-btn ${updateMode === 'precise' ? 'active' : ''}`}
          onClick={() => setUpdateMode('precise')}
          title="Precise Mode: Immediate full-precision render per change"
        >
          Precise
        </button>
        <button
          className={`switch-btn ${updateMode === 'live' ? 'active' : ''}`}
          onClick={() => setUpdateMode('live')}
          title="Live Mode: Throttled interactive preview with responsive feedback"
        >
          Live
        </button>
        <button
          className={`switch-btn ${updateMode === 'settle' ? 'active' : ''}`}
          onClick={() => setUpdateMode('settle')}
          title="Settle Mode: Low-res interactive dragging, full calculation on release"
        >
          Settle
        </button>
      </div>

      {/* Center: Status Text "WxH • zoom% • last render ms" */}
      <div className="status-text-center">
        <span>400x300</span>
        <span className="dot-sep">•</span>
        <span>{Math.round(zoom)}%</span>
        <span className="dot-sep">•</span>
        <span>render: {lastRenderMs > 0 ? `${lastRenderMs.toFixed(1)} ms` : '< 1 ms'}</span>
      </div>

      {/* Right: Zoom controls (Fit 0, 1:1 1) */}
      <div className="zoom-controls-group">
        <button
          className="zoom-btn"
          onClick={() => setZoom(100)}
          title="Fit view to window (Key: 0)"
        >
          <Maximize2 size={12} /> Fit <span className="kbd-shortcut">0</span>
        </button>
        <button
          className="zoom-btn"
          onClick={() => setZoom(100)}
          title="1:1 Pixel Native Resolution (Key: 1)"
        >
          1:1 <span className="kbd-shortcut">1</span>
        </button>
      </div>
    </footer>
  );
};

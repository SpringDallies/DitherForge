import React from 'react';
import { useAppStore } from '../../state/useAppStore';
import { Maximize2 } from 'lucide-react';

export const BottomControlStrip: React.FC = () => {
  const updateMode = useAppStore((state) => state.updateMode);
  const setUpdateMode = useAppStore((state) => state.setUpdateMode);
  const zoom = useAppStore((state) => state.zoom);
  const fitToViewport = useAppStore((state) => state.fitToViewport);
  const resetZoom = useAppStore((state) => state.resetZoom);
  const imageWidth = useAppStore((state) => state.imageWidth);
  const imageHeight = useAppStore((state) => state.imageHeight);
  const lastRenderMs = useAppStore((state) => state.lastRenderMs);

  const handleFit = () => {
    const canvasArea = document.querySelector('.canvas-area');
    if (canvasArea) {
      fitToViewport(canvasArea.clientWidth, canvasArea.clientHeight);
    } else {
      fitToViewport(window.innerWidth - 400, window.innerHeight - 100);
    }
  };

  return (
    <footer className="bottom-control-strip">
      {/* Left: Segmented Switch [ Precise | Live | Settle ] */}
      <div className="segmented-switch" role="group" aria-label="Update Mode">
        <button
          className={`switch-btn ${updateMode === 'precise' ? 'active' : ''}`}
          onClick={() => setUpdateMode('precise')}
          title="Precise Mode: Full-resolution render on every change"
        >
          Precise
        </button>
        <button
          className={`switch-btn ${updateMode === 'live' ? 'active' : ''}`}
          onClick={() => setUpdateMode('live')}
          title="Live Mode: Responsive fast proxy during slider drags, full on release"
        >
          Live
        </button>
        <button
          className={`switch-btn ${updateMode === 'settle' ? 'active' : ''}`}
          onClick={() => setUpdateMode('settle')}
          title="Settle Mode: Debounces slider movements (180ms), full-res on idle"
        >
          Settle
        </button>
      </div>

      {/* Center: Real Status Text "WxH • zoom% • last render ms" */}
      <div className="status-text-center">
        <span>{imageWidth > 0 ? `${imageWidth}x${imageHeight}` : 'No Image'}</span>
        <span className="dot-sep">•</span>
        <span>{Math.round(zoom)}%</span>
        <span className="dot-sep">•</span>
        <span>render: {lastRenderMs > 0 ? `${lastRenderMs.toFixed(1)} ms` : '< 1 ms'}</span>
      </div>

      {/* Right: Zoom controls (Fit 0, 1:1 1) */}
      <div className="zoom-controls-group">
        <button
          className="zoom-btn"
          onClick={handleFit}
          title="Fit view to viewport (Key: 0)"
        >
          <Maximize2 size={12} /> Fit <span className="kbd-shortcut">0</span>
        </button>
        <button
          className="zoom-btn"
          onClick={resetZoom}
          title="1:1 Native Resolution (Key: 1)"
        >
          1:1 <span className="kbd-shortcut">1</span>
        </button>
      </div>
    </footer>
  );
};

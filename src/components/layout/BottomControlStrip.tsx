import React from 'react';
import { useAppStore } from '../../state/useAppStore';
import { Grid } from 'lucide-react';

export const BottomControlStrip: React.FC = () => {
  const updateMode = useAppStore((state) => state.updateMode);
  const setUpdateMode = useAppStore((state) => state.setUpdateMode);
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
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

  const handleZoomIn = () => {
    setZoom(Math.min(1000, zoom * 1.25));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(10, zoom * 0.8));
  };

  return (
    <footer className="bottom-control-strip">
      {/* Left: Status text */}
      <div className="strip-status">
        <span>{imageWidth > 0 ? `${imageWidth}×${imageHeight}` : 'Ready'}</span>
        <span className="dot-sep">•</span>
        <span>{lastRenderMs > 0 ? `${lastRenderMs.toFixed(1)}ms` : '<1ms'}</span>
      </div>

      {/* Center: "VIEWPORT:" label + segmented switch [ Precise | Live | Settle ] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="strip-viewport-label">VIEWPORT:</span>
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
      </div>

      {/* Right: Zoom controls (- 100% + ↻) and small placeholder icons */}
      <div className="strip-actions">
        <button
          className="zoom-btn"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
        >
          -
        </button>
        <button
          className="zoom-btn"
          onClick={resetZoom}
          title="1:1 Native Resolution (Key: 1)"
        >
          {Math.round(zoom)}%
        </button>
        <button
          className="zoom-btn"
          onClick={handleZoomIn}
          title="Zoom In (+)"
        >
          +
        </button>
        <button
          className="zoom-btn"
          onClick={handleFit}
          title="Fit view to viewport (Key: 0)"
        >
          ↻
        </button>
        <button
          className="zoom-btn"
          disabled
          title="Pixel grid overlay (Phase 7)"
          style={{ opacity: 0.4, cursor: 'not-allowed', marginLeft: '4px' }}
        >
          <Grid size={11} />
        </button>
      </div>
    </footer>
  );
};

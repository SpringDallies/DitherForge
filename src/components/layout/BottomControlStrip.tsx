import React from 'react';
import { useAppStore } from '../../state/useAppStore';
import { Tooltip } from '../common/Tooltip';

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
    setZoom(Math.min(3200, Math.round(zoom + 10)));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(10, Math.round(zoom - 10)));
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
          <Tooltip text="Precise Mode: Full-resolution render on every change" side="top">
            <button
              className={`switch-btn ${updateMode === 'precise' ? 'active' : ''}`}
              onClick={() => setUpdateMode('precise')}
            >
              Precise
            </button>
          </Tooltip>
          <Tooltip text="Live Mode: Responsive fast proxy during slider drags, full on release" side="top">
            <button
              className={`switch-btn ${updateMode === 'live' ? 'active' : ''}`}
              onClick={() => setUpdateMode('live')}
            >
              Live
            </button>
          </Tooltip>
          <Tooltip text="Settle Mode: Debounces slider movements (180ms), full-res on idle" side="top">
            <button
              className={`switch-btn ${updateMode === 'settle' ? 'active' : ''}`}
              onClick={() => setUpdateMode('settle')}
            >
              Settle
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right: Zoom controls (- 100% + ↻) and small placeholder icons */}
      <div className="strip-actions">
        <Tooltip text="Zoom Out (-10%)" side="top">
          <button
            className="zoom-btn"
            onClick={handleZoomOut}
          >
            -
          </button>
        </Tooltip>
        <Tooltip text="Reset Zoom to 100% (Key: 1)" side="top">
          <button
            className="zoom-btn"
            onClick={resetZoom}
            style={{ minWidth: '44px', textAlign: 'center' }}
          >
            {Math.round(zoom)}%
          </button>
        </Tooltip>
        <Tooltip text="Zoom In (+10%)" side="top">
          <button
            className="zoom-btn"
            onClick={handleZoomIn}
          >
            +
          </button>
        </Tooltip>
        <Tooltip text="1:1 Native Resolution (Key: 1)" side="top">
          <button
            className="zoom-btn"
            onClick={resetZoom}
          >
            1:1
          </button>
        </Tooltip>
        <Tooltip text="Fit view to viewport (Key: 0)" side="top">
          <button
            className="zoom-btn"
            onClick={handleFit}
          >
            Fit
          </button>
        </Tooltip>
        <Tooltip text="Reset zoom and pan to defaults" side="top">
          <button
            className="zoom-btn"
            onClick={resetZoom}
          >
            ↺
          </button>
        </Tooltip>
      </div>
    </footer>
  );
};

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface TerminalWindowProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  defaultSize?: { w: number; h: number };
  minSize?: { w: number; h: number };
  disableResize?: boolean;
  backgroundUrl?: string | null;
  className?: string;
  dataModal?: string;
  ariaLabelledBy?: string;
  children: React.ReactNode;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  title,
  isOpen,
  onClose,
  defaultSize = { w: 430, h: 184 },
  minSize = { w: 300, h: 176 },
  disableResize = false,
  backgroundUrl = null,
  className = '',
  dataModal,
  ariaLabelledBy,
  children,
}) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>(defaultSize);
  const [minimized, setMinimized] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setMinimized(false);
      return;
    }
    setPos((prev) =>
      prev ?? {
        x: Math.max(16, Math.round((window.innerWidth - Math.min(size.w, window.innerWidth - 32)) / 2)),
        y: Math.max(48, Math.round((window.innerHeight - Math.min(size.h, window.innerHeight - 64)) / 2)),
      }
    );
  }, [isOpen, size.w, size.h]);

  if (!isOpen) return null;

  const resolvedW = Math.min(size.w, Math.max(minSize.w, window.innerWidth - 24));
  const resolvedH = Math.min(size.h, Math.max(minSize.h, window.innerHeight - 56));
  const resolvedPos = pos ?? {
    x: Math.max(12, Math.round((window.innerWidth - resolvedW) / 2)),
    y: Math.max(44, Math.round((window.innerHeight - resolvedH) / 2)),
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const base = resolvedPos;
    const onMove = (ev: MouseEvent) => {
      const nextX = Math.max(0, Math.min(window.innerWidth - 120, Math.round(base.x + (ev.clientX - startX))));
      const nextY = Math.max(0, Math.min(window.innerHeight - 36, Math.round(base.y + (ev.clientY - startY))));
      setPos({ x: nextX, y: nextY });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleResizeStart = (axis: 'x' | 'y' | 'xy', e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = resolvedW;
    const startH = resolvedH;
    document.body.style.cursor = axis === 'x' ? 'ew-resize' : axis === 'y' ? 'ns-resize' : 'nwse-resize';
    const onMove = (ev: MouseEvent) => {
      setSize((prev) => ({
        w: axis === 'y' ? prev.w : Math.max(minSize.w, Math.min(window.innerWidth - 24, Math.round(startW + (ev.clientX - startX)))),
        h: axis === 'x' ? prev.h : Math.max(minSize.h, Math.min(window.innerHeight - 56, Math.round(startH + (ev.clientY - startY)))),
      }));
    };
    const onUp = () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return createPortal(
    <div
      className={`export-exe-window df-tw-window ${className}`.trim()}
      data-df-modal={dataModal}
      style={{
        left: `${resolvedPos.x}px`,
        top: `${resolvedPos.y}px`,
        width: `${resolvedW}px`,
        height: minimized ? '32px' : `${resolvedH}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
    >
      {backgroundUrl && (
        <div className="export-exe-bg-wrap">
          <img className="export-exe-bg-img" src={backgroundUrl} alt="" draggable={false} />
          <div className="export-exe-bg-scrim" />
        </div>
      )}

      <div className="export-exe-titlebar" onMouseDown={handleDragStart}>
        <span id={ariaLabelledBy} className="export-exe-title">{title}</span>
        <div className="export-exe-win-controls">
          <button
            type="button"
            className="export-exe-win-btn"
            aria-label={minimized ? 'Restore window' : 'Minimize window'}
            title={minimized ? 'Restore' : 'Minimize'}
            onClick={() => setMinimized((v) => !v)}
          >
            -
          </button>
          <button
            type="button"
            className="export-exe-win-btn"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            X
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="export-exe-body">
          <div className="export-exe-panel">
            {children}
          </div>
        </div>
      )}

      {!minimized && !disableResize && (
        <>
          <div className="export-exe-resize-right" onMouseDown={(e) => handleResizeStart('x', e)} />
          <div className="export-exe-resize-bottom" onMouseDown={(e) => handleResizeStart('y', e)} />
          <div className="export-exe-resize-corner" onMouseDown={(e) => handleResizeStart('xy', e)} />
        </>
      )}
    </div>,
    document.body
  );
};

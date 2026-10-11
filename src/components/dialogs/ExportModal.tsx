import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-dialog" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '480px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span id="export-dialog-title">Export…</span>
          </div>
          <Tooltip text="Close dialog">
            <button className="tool-icon-btn" onClick={onClose} aria-label="Close dialog">
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div 
            style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--bg-tertiary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-cyan)'
            }}
          >
            <Download size={22} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: 'var(--text-main)' }}>
            Export dialog coming soon
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Full multi-format export interface is planned for Phase 7.2. All engine exporters (PNG, JPG, WebP, SVG Contours, and Unicode Character Grids) are fully implemented in the engine.
          </p>
          <button
            type="button"
            className="btn-default"
            onClick={onClose}
            style={{ padding: '6px 24px', margin: '0 auto' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

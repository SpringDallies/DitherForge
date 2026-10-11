import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Info, ShieldCheck, Sparkles } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
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
        style={{ maxWidth: '440px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span id="about-dialog-title">About DitherForge</span>
          </div>
          <Tooltip text="Close dialog">
            <button className="tool-icon-btn" onClick={onClose} aria-label="Close dialog">
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        <div className="modal-body" style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div 
            style={{ 
              width: '52px', 
              height: '52px', 
              borderRadius: '12px', 
              backgroundColor: 'var(--bg-tertiary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 14px',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-cyan)'
            }}
          >
            <img src="/assets/logo-mark.png" alt="DitherForge" style={{ height: "28px", width: "auto" }} />
          </div>

          <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>
            DitherForge 1.0.0
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Retro Synthesis & Precision Dithering Suite
          </p>

          <div 
            style={{ 
              backgroundColor: 'var(--bg-primary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-sm)',
              padding: '14px 16px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>•</span>
              <span>63 dithering algorithms, 14 palettes, 9 effects</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>•</span>
              <span>Engine: clean-room. UI: our own.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>•</span>
              <span>Built with React + Vite + Tauri</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>Dual-licensed under MIT & Apache 2.0</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

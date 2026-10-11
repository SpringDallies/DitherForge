import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Keyboard, Search } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { SHORTCUTS } from '../../constants/shortcuts';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

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

  const categories = ['File', 'Edit', 'View', 'Navigation', 'Algorithms'] as const;

  const filteredShortcuts = SHORTCUTS.filter(s => 
    s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-dialog" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-dialog-title"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span id="shortcuts-dialog-title">Keyboard Shortcuts</span>
          </div>
          <Tooltip text="Close dialog">
            <button className="tool-icon-btn" onClick={onClose} aria-label="Close dialog">
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Filter shortcuts by name, key, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div className="modal-body" style={{ padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto' }}>
          {categories.map((category) => {
            const items = filteredShortcuts.filter((s) => s.category === category);
            if (items.length === 0) return null;

            return (
              <div key={category} style={{ marginBottom: '20px' }}>
                <h4 
                  style={{ 
                    margin: '0 0 8px', 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.06em', 
                    color: 'var(--accent-cyan)' 
                  }}
                >
                  {category}
                </h4>
                <div 
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden'
                  }}
                >
                  {items.map((item, idx) => (
                    <div 
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderBottom: idx < items.length - 1 ? '1px solid var(--border-color)' : 'none',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item.label}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{item.description}</span>
                      </div>
                      {item.shortcut ? (
                        <kbd className="shortcut-kbd">
                          {item.shortcut}
                        </kbd>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontStyle: 'italic' }}>
                          —
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
              No matching shortcuts found
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
// Import frozen algorithm registry UNCHANGED
// @ts-ignore
import { ALGORITHM_REGISTRY } from '../dither-engine/algorithms.js';
import { X, Search, BookOpen } from 'lucide-react';
import { Tooltip } from './common/Tooltip';

interface AlgorithmReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlgorithmReferenceModal: React.FC<AlgorithmReferenceModalProps> = ({ isOpen, onClose }) => {
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

  const filtered = ALGORITHM_REGISTRY.filter((a: any) => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span>Algorithm Reference Manual (63 Models)</span>
          </div>
          <Tooltip text="Close dialog">
            <button className="tool-icon-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search algorithms by name, id, category, or mathematical kernel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map((algo: any, index: number) => (
              <div 
                key={algo.id} 
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)', 
                  padding: '10px 12px', 
                  borderRadius: '5px' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', fontSize: '0.75rem' }}>
                      #{index + 1}
                    </span>
                    <strong style={{ color: 'var(--text-main)' }}>{algo.name}</strong>
                    <code style={{ fontSize: '0.72rem', background: 'var(--bg-primary)', padding: '2px 5px', borderRadius: '3px', color: 'var(--accent-cyan)' }}>
                      {algo.id}
                    </code>
                  </div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    {algo.category}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {algo.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * SaveProjectModal.tsx
 * Dialog prompting the user for a project name before saving a .ditherforge project file.
 * Automatically dispatches a success toast upon export.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../state/useAppStore';
import { exportProjectFile } from '../../utils/projectPersistence';
import { TerminalWindow } from '../common/TerminalWindow';
import { getStoredSettings } from './SettingsDialog';
import { Save, X } from 'lucide-react';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  isOpen,
  onClose
}) => {
  const imageFileName = useAppStore((state) => state.imageFileName);
  const addToast = useAppStore((state) => state.addToast);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const getSuggestedName = () => {
    if (imageFileName && typeof imageFileName === 'string') {
      const base = imageFileName.replace(/\.[^/.]+$/, '').trim();
      if (base) return `${base}_project`;
    }
    return 'my_dither_project';
  };

  const [projectName, setProjectName] = useState<string>(getSuggestedName);

  // Reset name and auto-select input whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      const initial = getSuggestedName();
      setProjectName(initial);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, imageFileName]);

  // Handle global Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = () => {
    const finalName = projectName.trim() || 'project';
    const storeState = useAppStore.getState();
    exportProjectFile(storeState, finalName);
    addToast(`${finalName} is saved, in your downloads folder`, 'success');
    onClose();
  };

  if (!isOpen) return null;

  const isTerminal = (getStoredSettings().uiSkin || 'default') === 'terminal';

  const saveContent = (
    <>
        {/* Modal Body */}
        <div className="modal-body" style={{ padding: isTerminal ? '0' : '18px 20px' }}>
          <label
            htmlFor="save-project-name-input"
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-dim)',
              marginBottom: '8px'
            }}
          >
            Project Name
          </label>
          <input
            ref={inputRef}
            id="save-project-name-input"
            type="text"
            className="export-input"
            value={projectName}
            placeholder="Enter project name..."
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            style={{
              height: '36px',
              fontSize: '0.86rem',
              borderRadius: 'var(--radius-md)'
            }}
          />
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              marginTop: '8px'
            }}
          >
            Will be saved as <strong>{projectName.trim() || 'project'}.ditherforge</strong> in your Downloads folder.
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: isTerminal ? '12px 0 0' : '12px 20px',
            borderTop: '1px solid var(--border-color)',
            background: isTerminal ? 'transparent' : 'var(--bg-secondary)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: isTerminal ? '12px' : undefined
          }}
        >
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            style={{
              width: 'auto',
              minWidth: '130px',
              background: 'var(--accent-primary)',
              color: 'var(--text-on-accent, #ffffff)',
              border: 'none',
              borderRadius: 'var(--radius-pill, 999px)',
              fontWeight: 600
            }}
          >
            <Save size={14} />
            <span>Save Project</span>
          </button>
        </div>
    </>
  );

  if (isTerminal) {
    return (
      <TerminalWindow
        title="Save.exe"
        isOpen={isOpen}
        onClose={onClose}
        defaultSize={{ w: 410, h: 230 }}
        minSize={{ w: 320, h: 190 }}
        className="df-tw-scroll"
        dataModal="save-project"
        ariaLabelledBy="save-project-title"
      >
        {saveContent}
      </TerminalWindow>
    );
  }

  return createPortal(
    <div
      className="modal-backdrop"
      style={{
        background: 'rgba(0, 0, 0, 0.70)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog save-project-dialog"
        data-df-modal="save-project"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-project-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={16} style={{ color: 'var(--accent-primary)' }} />
            <span id="save-project-title" style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)' }}>
              Save Project
            </span>
          </div>
          <button className="tool-icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>
        {saveContent}
      </div>
    </div>,
    document.body
  );
};

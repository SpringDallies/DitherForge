import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { Dropdown } from '../common/Dropdown';
import { useAppStore } from '../../state/useAppStore';

export interface DitherForgeSettings {
  defaultUpdateMode: 'precise' | 'live' | 'settle';
  language: string;
  defaultExportFormat: 'png' | 'jpg' | 'webp' | 'svg';
  recentFilesLimit: number;
}

export const DEFAULT_SETTINGS: DitherForgeSettings = {
  defaultUpdateMode: 'precise',
  language: 'en',
  defaultExportFormat: 'png',
  recentFilesLimit: 8,
};

const SETTINGS_STORAGE_KEY = 'ditherforge_settings';

export function getStoredSettings(): DitherForgeSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: DitherForgeSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<DitherForgeSettings>(getStoredSettings);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);
  const setShowAlgorithmDescriptions = useAppStore((state) => state.setShowAlgorithmDescriptions);

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredSettings());
      setPurgeMsg(null);
    }
  }, [isOpen]);

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

  const updateSetting = <K extends keyof DitherForgeSettings>(key: K, value: DitherForgeSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveStoredSettings(next);
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    saveStoredSettings(DEFAULT_SETTINGS);
    setPurgeMsg('Settings reset to default');
    setTimeout(() => setPurgeMsg(null), 3000);
  };

  const handlePurgeTempFiles = () => {
    try {
      const protectedKeys = ['ditherforge_settings', 'ditherforge_favorites'];
      const keysToPurge: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !protectedKeys.includes(key)) {
          keysToPurge.push(key);
        }
      }

      if (keysToPurge.length === 0) {
        setPurgeMsg('Nothing to purge');
      } else {
        keysToPurge.forEach(k => localStorage.removeItem(k));
        setPurgeMsg(`Purged ${keysToPurge.length} temporary item(s)`);
      }
      setTimeout(() => setPurgeMsg(null), 3500);
    } catch {
      setPurgeMsg('Error accessing storage');
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-dialog settings-dialog" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span id="settings-dialog-title" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Settings
            </span>
          </div>
          <button className="tool-icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px' }}>
          {/* Section: GENERAL */}
          <div className="settings-section">
            <div className="settings-section-title">GENERAL</div>
            
            <div className="settings-row">
              <span className="settings-label">Default update mode</span>
              <Dropdown
                width={130}
                value={settings.defaultUpdateMode}
                onChange={(val) => updateSetting('defaultUpdateMode', val as 'precise' | 'live' | 'settle')}
                items={[
                  { id: 'precise', label: 'Precise' },
                  { id: 'live', label: 'Live' },
                  { id: 'settle', label: 'Settle' }
                ]}
              />
            </div>

            <div className="settings-row">
              <span className="settings-label">Language</span>
              <Tooltip text="Coming soon" side="left">
                <div style={{ width: 130 }}>
                  <Dropdown
                    disabled
                    width={130}
                    value={settings.language}
                    onChange={() => {}}
                    items={[
                      { id: 'en', label: 'English' }
                    ]}
                  />
                </div>
              </Tooltip>
            </div>
          </div>

          {/* Section: FILES */}
          <div className="settings-section">
            <div className="settings-section-title">FILES</div>

            <div className="settings-row">
              <span className="settings-label">Default export format</span>
              <Dropdown
                width={130}
                value={settings.defaultExportFormat}
                onChange={(val) => updateSetting('defaultExportFormat', val as 'png' | 'jpg' | 'webp' | 'svg')}
                items={[
                  { id: 'png', label: 'PNG' },
                  { id: 'jpg', label: 'JPG' },
                  { id: 'webp', label: 'WebP' },
                  { id: 'svg', label: 'SVG' }
                ]}
              />
            </div>

            <div className="settings-row">
              <span className="settings-label">Export folder</span>
              <span className="settings-readonly-text">(n/a � browser)</span>
            </div>

            <div className="settings-row">
              <span className="settings-label">Recent files limit</span>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.recentFilesLimit}
                onChange={(e) => updateSetting('recentFilesLimit', Math.max(1, parseInt(e.target.value) || 8))}
                className="settings-number-input"
                aria-label="Recent files limit"
              />
            </div>
          </div>

          {/* Section: STORAGE */}
          <div className="settings-section">
            <div className="settings-section-title">STORAGE</div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Purge temp files</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Clear cached sessions, recent files, and temporary buffers
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {purgeMsg && <span className="settings-status-msg">{purgeMsg}</span>}
                <button
                  type="button"
                  className="btn-default"
                  onClick={handlePurgeTempFiles}
                  style={{ minWidth: '70px', padding: '4px 12px' }}
                >
                  Purge
                </button>
              </div>
            </div>
          </div>

          {/* Section: ABOUT */}
          <div className="settings-section">
            <div className="settings-section-title">ABOUT</div>

            <div className="settings-row">
              <span className="settings-label">Version</span>
              <span className="settings-readonly-text">1.0.0</span>
            </div>

            <div className="settings-row">
              <span className="settings-label">Engine</span>
              <span className="settings-readonly-text">63 algorithms</span>
            </div>

            <div className="settings-row">
              <span className="settings-label">Built with</span>
              <span className="settings-readonly-text">React + Vite</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-tertiary)' }}>
          <button
            type="button"
            className="btn-subtle"
            onClick={handleResetDefaults}
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

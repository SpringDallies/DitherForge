import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { Dropdown } from '../common/Dropdown';
// @ts-ignore
import { ALGORITHM_REGISTRY } from '../../dither-engine/algorithms.js';

export interface DitherForgeSettings {
  defaultUpdateMode: 'precise' | 'live' | 'settle';
  liveProxyEnabled: boolean;
  language: string;
  defaultExportFormat: 'png' | 'jpg' | 'webp' | 'svg';
  recentFilesLimit: number;
  smoothScroll: boolean;
  scrollTightness: number;
  scrollDuration: number;
  glassBlur: boolean;
  glassBlurRadius: number;
  glassOpacity: number;
  topbarGlass: boolean;
  shadows: boolean;
  animations: boolean;
}

export const DEFAULT_SETTINGS: DitherForgeSettings = {
  defaultUpdateMode: 'precise',
  liveProxyEnabled: false,
  language: 'en',
  defaultExportFormat: 'png',
  recentFilesLimit: 8,
  smoothScroll: true,
  scrollTightness: 0.25,
  scrollDuration: 1.2,
  glassBlur: true,
  glassBlurRadius: 16,
  glassOpacity: 0.82,
  topbarGlass: true,
  shadows: true,
  animations: true,
};

const SETTINGS_STORAGE_KEY = 'ditherforge_settings';

export function applyPerformanceSettings(settings: DitherForgeSettings): void {
  if (typeof document === 'undefined') return;
  const isGlass = settings.glassBlur !== false;
  const isTopbarGlass = isGlass && settings.topbarGlass !== false;
  document.documentElement.setAttribute('data-glass-blur', isGlass ? 'true' : 'false');
  document.documentElement.setAttribute('data-topbar-glass', isTopbarGlass ? 'true' : 'false');
  document.documentElement.setAttribute('data-shadows', settings.shadows !== false ? 'true' : 'false');
  document.documentElement.setAttribute('data-animations', settings.animations !== false ? 'true' : 'false');

  const blurRadius = settings.glassBlurRadius ?? 16;
  const opacity = settings.glassOpacity ?? 0.82;
  document.documentElement.style.setProperty('--glass-blur-radius', `${blurRadius}px`);
  document.documentElement.style.setProperty('--glass-opacity', `${Math.round(opacity * 100)}%`);
}

export function areAnimationsEnabled(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.getAttribute('data-animations') !== 'false';
}

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
    applyPerformanceSettings(settings);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ditherforge_settings_changed', { detail: settings }));
    }
  } catch {}
}

if (typeof document !== 'undefined') {
  applyPerformanceSettings(getStoredSettings());
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<DitherForgeSettings>(getStoredSettings);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

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
            <Settings size={16} style={{ color: 'var(--text-dim)' }} />
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
              <div>
                <div className="settings-label">Enable live drag proxy</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Faster slider drags on large images; preview is blurry while dragging.
                </div>
              </div>
              <Dropdown
                width={130}
                value={settings.liveProxyEnabled ? 'on' : 'off'}
                onChange={(val) => updateSetting('liveProxyEnabled', val === 'on')}
                items={[
                  { id: 'off', label: 'Off' },
                  { id: 'on', label: 'On' }
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

          {/* Section: PERFORMANCE */}
          <div className="settings-section">
            <div className="settings-section-title">PERFORMANCE</div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Glass blur effect</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Frosted-glass backdrop blur on floating panels and overlays.
                </div>
              </div>
              <Dropdown
                width={130}
                value={settings.glassBlur !== false ? 'enabled' : 'disabled'}
                onChange={(val) => updateSetting('glassBlur', val === 'enabled')}
                items={[
                  { id: 'enabled', label: 'Enabled' },
                  { id: 'disabled', label: 'Disabled' }
                ]}
              />
            </div>

            <div 
              className="settings-row"
              style={{
                opacity: settings.glassBlur !== false ? 1 : 0.45,
                pointerEvents: settings.glassBlur !== false ? 'auto' : 'none',
                transition: 'opacity 0.15s ease'
              }}
            >
              <div style={{ flex: 1, paddingRight: '16px' }}>
                <div className="settings-label">Glass blur strength</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Backdrop blur radius for frosted glass panels.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '180px', flexShrink: 0, paddingRight: '6px' }}>
                <input
                  type="range"
                  className="control-slider"
                  min="0"
                  max="40"
                  step="1"
                  value={settings.glassBlurRadius ?? 16}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    '--slider-fill': `${((settings.glassBlurRadius ?? 16) / 40) * 100}%`
                  } as React.CSSProperties}
                  onChange={(e) => updateSetting('glassBlurRadius', parseInt(e.target.value, 10))}
                  aria-label="Glass blur strength"
                />
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'right', color: 'var(--text-main)', flexShrink: 0 }}>
                  {settings.glassBlurRadius ?? 16}px
                </span>
              </div>
            </div>

            <div 
              className="settings-row"
              style={{
                opacity: settings.glassBlur !== false ? 1 : 0.45,
                pointerEvents: settings.glassBlur !== false ? 'auto' : 'none',
                transition: 'opacity 0.15s ease'
              }}
            >
              <div style={{ flex: 1, paddingRight: '16px' }}>
                <div className="settings-label">Glass opacity</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Surface opacity and tint of translucent panels.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '180px', flexShrink: 0, paddingRight: '6px' }}>
                <input
                  type="range"
                  className="control-slider"
                  min="0.30"
                  max="0.98"
                  step="0.02"
                  value={settings.glassOpacity ?? 0.82}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    '--slider-fill': `${(((settings.glassOpacity ?? 0.82) - 0.30) / 0.68) * 100}%`
                  } as React.CSSProperties}
                  onChange={(e) => updateSetting('glassOpacity', parseFloat(e.target.value))}
                  aria-label="Glass opacity"
                />
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'right', color: 'var(--text-main)', flexShrink: 0 }}>
                  {Math.round((settings.glassOpacity ?? 0.82) * 100)}%
                </span>
              </div>
            </div>

            <div 
              className="settings-row"
              style={{
                opacity: settings.glassBlur !== false ? 1 : 0.45,
                pointerEvents: settings.glassBlur !== false ? 'auto' : 'none',
                transition: 'opacity 0.15s ease'
              }}
            >
              <div style={{ flex: 1, paddingRight: '16px' }}>
                <div className="settings-label">Topbar glass effect</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Apply frosted-glass translucency and blur to the top navigation bar.
                </div>
              </div>
              <Dropdown
                width={130}
                value={settings.topbarGlass !== false ? 'enabled' : 'disabled'}
                onChange={(val) => updateSetting('topbarGlass', val === 'enabled')}
                items={[
                  { id: 'enabled', label: 'Enabled' },
                  { id: 'disabled', label: 'Disabled' }
                ]}
              />
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Drop shadows</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Subtle drop shadows on floating panels, dropdowns, and dialogs.
                </div>
              </div>
              <Dropdown
                width={130}
                value={settings.shadows !== false ? 'enabled' : 'disabled'}
                onChange={(val) => updateSetting('shadows', val === 'enabled')}
                items={[
                  { id: 'enabled', label: 'Enabled' },
                  { id: 'disabled', label: 'Disabled' }
                ]}
              />
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">UI animations</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Smooth transitions and fades when opening, closing, or navigating menus and color pickers.
                </div>
              </div>
              <Dropdown
                width={130}
                value={settings.animations !== false ? 'enabled' : 'disabled'}
                onChange={(val) => updateSetting('animations', val === 'enabled')}
                items={[
                  { id: 'enabled', label: 'Enabled' },
                  { id: 'disabled', label: 'Disabled' }
                ]}
              />
            </div>
          </div>

          {/* Section: EXPERIMENTAL */}
          <div className="settings-section">
            <div className="settings-section-title">EXPERIMENTAL</div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Smooth scrolling (Lenis)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Inertial smooth scrolling for panels and menus.
                </div>
              </div>
              <Dropdown
                width={130}
                value={settings.smoothScroll !== false ? 'enabled' : 'disabled'}
                onChange={(val) => updateSetting('smoothScroll', val === 'enabled')}
                items={[
                  { id: 'enabled', label: 'Enabled' },
                  { id: 'disabled', label: 'Disabled' }
                ]}
              />
            </div>

            <div 
              className="settings-row"
              style={{
                opacity: settings.smoothScroll !== false ? 1 : 0.45,
                pointerEvents: settings.smoothScroll !== false ? 'auto' : 'none',
                transition: 'opacity 0.15s ease'
              }}
            >
              <div style={{ flex: 1, paddingRight: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="settings-label">Scroll tightness</span>
                  <span style={{
                    fontSize: '0.62rem',
                    textTransform: 'uppercase',
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'color-mix(in srgb, var(--status-warning) 15%, transparent)',
                    color: 'var(--status-warning)',
                    fontWeight: 600,
                    letterSpacing: '0.04em'
                  }}>
                    Experimental
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Higher values make smooth scrolling snappier and tighter
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '180px', flexShrink: 0, paddingRight: '6px' }}>
                <input
                  type="range"
                  className="control-slider"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={settings.scrollTightness ?? 0.25}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    '--slider-fill': `${(((settings.scrollTightness ?? 0.25) - 0.05) / 0.95) * 100}%`
                  } as React.CSSProperties}
                  onChange={(e) => updateSetting('scrollTightness', parseFloat(e.target.value))}
                  aria-label="Scroll tightness"
                />
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'right', color: 'var(--text-main)', flexShrink: 0 }}>
                  {Math.round((settings.scrollTightness ?? 0.25) * 100)}%
                </span>
              </div>
            </div>

            <div 
              className="settings-row"
              style={{
                opacity: settings.smoothScroll !== false ? 1 : 0.45,
                pointerEvents: settings.smoothScroll !== false ? 'auto' : 'none',
                transition: 'opacity 0.15s ease'
              }}
            >
              <div style={{ flex: 1, paddingRight: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="settings-label">Scroll duration</span>
                  <span style={{
                    fontSize: '0.62rem',
                    textTransform: 'uppercase',
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'color-mix(in srgb, var(--status-warning) 15%, transparent)',
                    color: 'var(--status-warning)',
                    fontWeight: 600,
                    letterSpacing: '0.04em'
                  }}>
                    Experimental
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Duration in seconds for smooth wheel scrolls
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '180px', flexShrink: 0, paddingRight: '6px' }}>
                <input
                  type="range"
                  className="control-slider"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={settings.scrollDuration ?? 1.2}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    '--slider-fill': `${(((settings.scrollDuration ?? 1.2) - 0.1) / 2.9) * 100}%`
                  } as React.CSSProperties}
                  onChange={(e) => updateSetting('scrollDuration', parseFloat(e.target.value))}
                  aria-label="Scroll duration"
                />
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'right', color: 'var(--text-main)', flexShrink: 0 }}>
                  {(settings.scrollDuration ?? 1.2).toFixed(1)}s
                </span>
              </div>
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
              <span className="settings-readonly-text">(n/a — browser)</span>
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
              <span className="settings-readonly-text">2.0</span>
            </div>

            <div className="settings-row">
              <span className="settings-label">Engine</span>
              <span className="settings-readonly-text">{ALGORITHM_REGISTRY.length} algorithms</span>
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

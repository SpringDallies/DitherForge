import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings } from 'lucide-react';
import { Dropdown } from '../common/Dropdown';
import { useAppStore } from '../../state/useAppStore';
import { EngineBridge } from '../../services/EngineBridge';
import { invoke } from '@tauri-apps/api/core';
// @ts-ignore
import { ALGORITHM_REGISTRY } from '../../dither-engine/algorithms.js';

export interface DitherForgeSettings {
  defaultUpdateMode: 'precise' | 'live' | 'settle';
  liveProxyEnabled: boolean;
  language: string;
  defaultExportFormat: 'png' | 'jpg' | 'webp' | 'svg';
  exportFolder?: string;
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
  highQualityZoom: boolean;
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
  highQualityZoom: true,
};

const SETTINGS_STORAGE_KEY = 'ditherforge_settings';

export function applyPerformanceSettings(settings: DitherForgeSettings): void {
  if (typeof document === 'undefined') return;
  // Glass blur is disabled on Linux — WebKitGTK doesn't support backdrop-filter properly
  const isLinux = typeof navigator !== 'undefined' && /linux/i.test(navigator.platform);
  const isGlass = !isLinux && settings.glassBlur !== false;
  const isTopbarGlass = isGlass && settings.topbarGlass !== false;
  document.documentElement.setAttribute('data-glass-blur', isGlass ? 'true' : 'false');
  document.documentElement.setAttribute('data-topbar-glass', isTopbarGlass ? 'true' : 'false');
  document.documentElement.setAttribute('data-shadows', settings.shadows !== false ? 'true' : 'false');
  document.documentElement.setAttribute('data-animations', settings.animations !== false ? 'true' : 'false');
  document.documentElement.setAttribute('data-high-quality-zoom', settings.highQualityZoom !== false ? 'true' : 'false');

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
  const [defaultExportDir, setDefaultExportDir] = useState<string>('Downloads');
  const [showDevLogs, setShowDevLogs] = useState<boolean>(false);

  const activeBackend = useAppStore((state) => state.activeBackend);
  const backendError = useAppStore((state) => state.backendError);
  const lastRenderMs = useAppStore((state) => state.lastRenderMs);
  const devLogs = useAppStore((state) => state.devLogs);
  const clearDevLogs = useAppStore((state) => state.clearDevLogs);
  const addDevLog = useAppStore((state) => state.addDevLog);
  const [logFilter, setLogFilter] = useState<Record<string, boolean>>({
    rust: true,
    ipc: true,
    dither: true,
    system: true,
    render: true
  });

  const toggleLogCategory = (cat: string) => {
    setLogFilter((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filteredLogs = devLogs.filter((entry) => logFilter[entry.category] !== false);

  const availableCategories = [...new Set(devLogs.map((e) => e.category))];

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredSettings());
      setPurgeMsg(null);
      if (EngineBridge.isTauri()) {
        EngineBridge.getDefaultExportDirectory().then((dir) => {
          if (dir) setDefaultExportDir(dir);
        }).catch(() => {});
      }
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

  const handlePurgeTempFiles = async () => {
    try {
      if (EngineBridge.isTauri()) {
        await invoke('purge_temp_cache');
      }
      setPurgeMsg('Temporary caches purged');
      setTimeout(() => setPurgeMsg(null), 3500);
    } catch {
      setPurgeMsg('Error purging temporary caches');
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
            </div>
          </div>

          {/* Section: PERFORMANCE */}
          <div className="settings-section">
            <div className="settings-section-title">PERFORMANCE</div>

            {typeof navigator === 'undefined' || !/linux/i.test(navigator.platform) && (
              <>
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
              </>
            )}

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

            <div className="settings-row">
              <div>
                <div className="settings-label">High-quality zoom</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Smooths dither patterns when zoomed out below 100% to eliminate moiré artifacts while keeping zoom-in pixelated.
                </div>
              </div>
              <Dropdown
                width={130}
                value={settings.highQualityZoom !== false ? 'enabled' : 'disabled'}
                onChange={(val) => updateSetting('highQualityZoom', val === 'enabled')}
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

            <div className="settings-row" style={{ alignItems: 'flex-start' }}>
              <div>
                <span className="settings-label">Export folder</span>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px', maxWidth: '280px', wordBreak: 'break-all' }}>
                  {EngineBridge.isTauri()
                    ? (settings.exportFolder || `${defaultExportDir} (Default)`)
                    : '(n/a — browser downloads)'}
                </div>
              </div>
              {EngineBridge.isTauri() && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="action-btn"
                    style={{ fontSize: '0.75rem', padding: '4px 10px', height: '28px' }}
                    onClick={async () => {
                      const folder = await EngineBridge.selectExportDirectory();
                      if (folder) {
                        updateSetting('exportFolder', folder);
                      }
                    }}
                  >
                    Browse...
                  </button>
                  {settings.exportFolder && (
                    <button
                      type="button"
                      className="action-btn"
                      style={{ fontSize: '0.75rem', padding: '4px 8px', height: '28px', color: 'var(--text-muted)' }}
                      title="Reset to default Downloads folder"
                      onClick={() => updateSetting('exportFolder', undefined as any)}
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
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

          {/* Section: VIDEO ENGINE */}
          <div className="settings-section">
            <div className="settings-section-title">VIDEO ENGINE</div>

            <div className="settings-row">
              <div>
                <div className="settings-label">FFmpeg Native Backend</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Video decoding, H.264 / VP9 encoding, and audio synchronization
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-default"
                  onClick={() => {
                    useAppStore.getState().setIsFfmpegModalOpen(true);
                  }}
                  style={{ minWidth: '70px', padding: '4px 12px' }}
                >
                  Configure
                </button>
              </div>
            </div>
          </div>

          {/* Section: DEVELOPER */}
          <div className="settings-section">
            <div className="settings-section-title">DEVELOPER SETTINGS</div>

            <div className="settings-row">
              <span className="settings-label">Build mode</span>
              <span className="settings-readonly-text">
                {import.meta.env.PROD ? 'Release' : 'Development'}
              </span>
            </div>

            <div className="settings-row">
              <span className="settings-label">Rust opt level</span>
              <span className="settings-readonly-text">
                {import.meta.env.PROD ? 'opt-level 3 (LTO thin)' : 'opt-level 1'}
              </span>
            </div>

            <div className="settings-row">
              <span className="settings-label">Platform</span>
              <span className="settings-readonly-text">
                {navigator.platform}
              </span>
            </div>

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
              <span className="settings-readonly-text">React + Vite + Rust</span>
            </div>

            <div className="settings-row">
              <span className="settings-label">Active backend</span>
              <span className="settings-readonly-text">
                {activeBackend === 'rust' ? 'Rust' : activeBackend === 'js-fallback' ? 'JavaScript (Fallback)' : 'JavaScript'}
              </span>
            </div>

            <div className="settings-row">
              <span className="settings-label">Last render time</span>
              <span className="settings-readonly-text">
                {lastRenderMs > 0 ? `${lastRenderMs.toFixed(1)} ms` : '< 1 ms'}
              </span>
            </div>

            <div className="settings-row">
              <span className="settings-label">Backend error</span>
              <span className="settings-readonly-text">
                {backendError ?? 'None'}
              </span>
            </div>

            <div className="settings-row settings-row-actions">
              <button type="button" className="btn-subtle" onClick={() => setShowDevLogs(true)}>
                View Logs
              </button>
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

      {/* Developer logs popup */}
      {showDevLogs && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            e.stopPropagation();
            setShowDevLogs(false);
          }}
          style={{ zIndex: 200 }}
        >
          <div
            className="modal-dialog settings-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dev-logs-title"
            style={{
              width: '560px',
              maxWidth: '92vw',
              maxHeight: '75vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-dim)' }}>{filteredLogs.length} entries</span>
                <span id="dev-logs-title" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  Developer Logs
                </span>
              </div>
              <button className="tool-icon-btn" onClick={() => setShowDevLogs(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div
              className="modal-body"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              {/* Category filter chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                {availableCategories.map((cat) => (
                  <button key={cat} type="button" onClick={() => toggleLogCategory(cat)} style={{ padding: '2px 8px', fontSize: '0.65rem', borderRadius: '4px', border: `1px solid ${logFilter[cat] !== false ? 'var(--border-focus)' : 'var(--border-color)'}`, backgroundColor: logFilter[cat] !== false ? 'var(--bg-hover)' : 'transparent', color: logFilter[cat] !== false ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer' }}>{cat}</button>
                ))}
                <button type="button" onClick={() => { const allOn = Object.values(logFilter).every((v) => v !== false); setLogFilter(Object.fromEntries(Object.keys(logFilter).map((k) => [k, !allOn]))); }} style={{ padding: '2px 8px', fontSize: '0.65rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>Toggle All</button>
              </div>

              {filteredLogs.length === 0 ? (
                <span className="dev-log-empty">No logs match current filters</span>
              ) : (
                filteredLogs.map((entry, i) => (
                  <div key={i} className={`dev-log-entry dev-log-${entry.level}`} style={{ marginBottom: '2px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <span className="dev-log-time" style={{ flexShrink: 0 }}>{entry.time}</span>
                    <span className={`dev-log-level dev-log-level-${entry.level}`} style={{ flexShrink: 0, width: '52px' }}>{entry.level.toUpperCase()}</span>
                    <span style={{ flexShrink: 0, fontSize: '0.65rem', color: 'var(--text-muted)', backgroundColor: 'color-mix(in srgb, var(--text-dim) 15%, transparent)', padding: '1px 6px', borderRadius: '3px', marginTop: '1px' }}>{entry.category}</span>
                    <span className="dev-log-msg" style={{ flex: 1 }}>{entry.msg}</span>
                    {entry.durationMs !== undefined && <span style={{ flexShrink: 0, fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '6px', whiteSpace: 'nowrap' }}>{entry.durationMs.toFixed(1)}ms</span>}
                  </div>
                ))
              )}
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn-subtle"
                onClick={() => {
                  const text = filteredLogs.map((e) => `[${e.time}] [${e.category}] ${e.level.toUpperCase()}: ${e.msg}`).join('\n');
                  navigator.clipboard.writeText(text);
                }}
              >
                Copy all
              </button>
              <button type="button" className="btn-subtle" onClick={clearDevLogs}>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

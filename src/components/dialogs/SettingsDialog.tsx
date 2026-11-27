import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings } from 'lucide-react';
import { Dropdown } from '../common/Dropdown';
import { TerminalWindow } from '../common/TerminalWindow';
import { useAppStore } from '../../state/useAppStore';
import { EngineBridge } from '../../services/EngineBridge';
import { invoke } from '@tauri-apps/api/core';
// @ts-ignore
import { ALGORITHM_REGISTRY } from '../../dither-engine/algorithms.js';

export type LogoSharpness = 'pixelated' | 'crisp' | 'smooth';
export type LogoDitherStyle = 'bayer4' | 'bayer2' | 'bayer8' | 'halftone' | 'scanline' | 'checker' | 'none';
export type LogoMode = '3d' | '2d' | 'none';
export type LogoCursorReact = 'direct' | 'sidebar' | 'global' | 'off';

export const UI_SKINS = [
  { id: 'default', label: 'Default Studio' },
  { id: 'terminal', label: 'Terminal' }
];

export interface DitherForgeSettings {
  defaultUpdateMode: 'live' | 'debounce';
  language: string;
  defaultExportFormat: 'png' | 'jpg' | 'webp' | 'svg';
  exportFolder?: string;
  recentFilesLimit: number;
  smoothScroll: boolean;
  scrollFade: boolean;
  sliderHolder: boolean;
  scrollTightness: number;
  scrollDuration: number;
  glassBlur: boolean;
  glassBlurRadius: number;
  glassOpacity: number;
  topbarGlass: boolean;
  shadows: boolean;
  animations: boolean;
  highQualityZoom: boolean;
  uiSkin: string;
  // 3D / 2D Anvil Logo Settings
  logoMode: LogoMode;
  logoResolution: 64 | 128 | 256 | 512;
  logoSharpness: LogoSharpness;
  logoDitherStyle: LogoDitherStyle;
  logoColorSteps: number;
  logoDitherStrength: number;
  logoSpeed: number;
  logoWiggle: number;
  logoCursorReact: LogoCursorReact;
  logoCursorSensitivity: number;
  logoInteractiveClick: boolean;
  logoPeriodicShine: boolean;
}

export const DEFAULT_SETTINGS: DitherForgeSettings = {
  defaultUpdateMode: 'live',
  language: 'en',
  defaultExportFormat: 'png',
  recentFilesLimit: 8,
  smoothScroll: true,
  scrollFade: true,
  sliderHolder: true,
  scrollTightness: 0.25,
  scrollDuration: 1.2,
  glassBlur: true,
  glassBlurRadius: 16,
  glassOpacity: 0.82,
  topbarGlass: true,
  shadows: true,
  animations: true,
  highQualityZoom: true,
  uiSkin: 'default',
  // Default Logo Settings
  logoMode: '2d',
  logoDitherStyle: 'none',
  logoSharpness: 'smooth',
  logoResolution: 256,
  logoColorSteps: 16,
  logoDitherStrength: 2.0,
  logoSpeed: 0.05,
  logoWiggle: 0.0,
  logoCursorReact: 'sidebar',
  logoCursorSensitivity: 0.4,
  logoInteractiveClick: true,
  logoPeriodicShine: true,
};

const SETTINGS_STORAGE_KEY = 'ditherforge_settings';
const SETTINGS_VERSION = 3;

export function applyPerformanceSettings(settings: DitherForgeSettings): void {
  if (typeof document === 'undefined') return;
  const isLinux =
    document.documentElement.getAttribute('data-platform') === 'linux' ||
    (typeof navigator !== 'undefined' && /linux/i.test(navigator.platform));
  const isGlass = !isLinux && settings.glassBlur !== false;
  const isTopbarGlass = isGlass && settings.topbarGlass !== false;
  document.documentElement.setAttribute('data-glass-blur', isGlass ? 'true' : 'false');
  document.documentElement.setAttribute('data-topbar-glass', isTopbarGlass ? 'true' : 'false');
  document.documentElement.setAttribute('data-shadows', settings.shadows !== false ? 'true' : 'false');
  document.documentElement.setAttribute('data-animations', settings.animations !== false ? 'true' : 'false');
  document.documentElement.setAttribute('data-high-quality-zoom', settings.highQualityZoom !== false ? 'true' : 'false');
  document.documentElement.setAttribute('data-scroll-fade', settings.scrollFade !== false ? 'true' : 'false');
  document.documentElement.setAttribute('data-slider-holder', settings.sliderHolder !== false ? 'true' : 'false');
  document.documentElement.setAttribute('data-ui-skin', settings.uiSkin || 'default');

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
      if (parsed._v === SETTINGS_VERSION) {
        const defaultUpdateMode = parsed.defaultUpdateMode === 'live' || parsed.defaultUpdateMode === 'debounce'
          ? parsed.defaultUpdateMode
          : DEFAULT_SETTINGS.defaultUpdateMode;
        const defaultLogoMode: LogoMode = parsed.uiSkin === 'terminal' ? 'none' : DEFAULT_SETTINGS.logoMode;
        const logoMode = parsed.logoMode === '2d' || parsed.logoMode === '3d' || parsed.logoMode === 'none'
          ? parsed.logoMode
          : defaultLogoMode;
        return { ...DEFAULT_SETTINGS, ...parsed, defaultUpdateMode, logoMode };
      }
      // Migrate to v3 logo defaults (2D default) while preserving user's non-logo preferences
      const migrated = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        defaultUpdateMode: parsed.defaultUpdateMode === 'live' || parsed.defaultUpdateMode === 'debounce'
          ? parsed.defaultUpdateMode
          : DEFAULT_SETTINGS.defaultUpdateMode,
        logoMode: DEFAULT_SETTINGS.logoMode,
        logoDitherStyle: DEFAULT_SETTINGS.logoDitherStyle,
        logoSharpness: DEFAULT_SETTINGS.logoSharpness,
        logoResolution: DEFAULT_SETTINGS.logoResolution,
        logoColorSteps: DEFAULT_SETTINGS.logoColorSteps,
        logoDitherStrength: DEFAULT_SETTINGS.logoDitherStrength,
        logoSpeed: DEFAULT_SETTINGS.logoSpeed,
        logoWiggle: DEFAULT_SETTINGS.logoWiggle,
        logoCursorReact: DEFAULT_SETTINGS.logoCursorReact,
        logoCursorSensitivity: DEFAULT_SETTINGS.logoCursorSensitivity,
        logoInteractiveClick: DEFAULT_SETTINGS.logoInteractiveClick,
        logoPeriodicShine: DEFAULT_SETTINGS.logoPeriodicShine,
        _v: SETTINGS_VERSION,
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function withUiSkinDefaults(prev: DitherForgeSettings, nextSkin: string): DitherForgeSettings {
  const logoMode: LogoMode =
    nextSkin === 'terminal'
      ? 'none'
      : prev.uiSkin === 'terminal' && prev.logoMode === 'none'
      ? '2d'
      : prev.logoMode;
  return { ...prev, uiSkin: nextSkin, logoMode };
}

export function saveStoredSettings(settings: DitherForgeSettings): void {
  try {
    const payload = { ...settings, _v: SETTINGS_VERSION };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
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
  const [openSettingMenu, setOpenSettingMenu] = useState<string | null>(null);

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
      setOpenSettingMenu(null);
      if (EngineBridge.isTauri()) {
        EngineBridge.getDefaultExportDirectory().then((dir) => {
          if (dir) setDefaultExportDir(dir);
        }).catch(() => {});
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!openSettingMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.settings-exe-value-wrap')) {
        setOpenSettingMenu(null);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [openSettingMenu]);

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

  const isTerminal = (settings.uiSkin ?? 'default') === 'terminal';

  const settingsContent = (
    <>
        {/* Body */}
        <div className="modal-body" style={{ padding: isTerminal ? '0' : '20px' }}>
          {/* Section: GENERAL */}
          <div className="settings-section">
            <div className="settings-section-title">GENERAL</div>
            
            <div className="settings-row">
              <span className="settings-label">Default update mode</span>
              <Dropdown
                width={130}
                value={settings.defaultUpdateMode}
                onChange={(val) => updateSetting('defaultUpdateMode', val as 'live' | 'debounce')}
                items={[
                  { id: 'live', label: 'Live' },
                  { id: 'debounce', label: 'Debounce' }
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

            {!(
              typeof document !== 'undefined' &&
              (document.documentElement.getAttribute('data-platform') === 'linux' ||
                (typeof navigator !== 'undefined' && /linux/i.test(navigator.platform)))
            ) && (
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

          {/* Section: VIDEO SETTINGS */}
          {EngineBridge.isTauri() && (
            <div className="settings-section">
              <div className="settings-section-title">VIDEO SETTINGS</div>
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
          )}

          {/* Section: MISC */}
          <div className="settings-section">
            <div className="settings-section-title">MISC</div>

            <div className="settings-row">
              <div>
                <div className="settings-label">UI skin (layout theme)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Switch the structural UI layout and control geometry independently of colour schemes.
                </div>
              </div>
              <Dropdown
                width={176}
                value={settings.uiSkin ?? 'default'}
                onChange={(val) => {
                  const next = withUiSkinDefaults(settings, val);
                  setSettings(next);
                  saveStoredSettings(next);
                }}
                items={UI_SKINS}
              />
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Logo mode (2D / 3D / None)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Switch between the interactive 3D extruded anvil, a flat 2D silhouette logo, or no sidebar logo.
                </div>
              </div>
              <Dropdown
                width={176}
                value={settings.logoMode ?? '2d'}
                onChange={(val) => updateSetting('logoMode', val as LogoMode)}
                items={[
                  { id: '2d', label: '2D Flat Logo' },
                  { id: '3d', label: '3D Anvil' },
                  { id: 'none', label: 'No Logo' }
                ]}
              />
            </div>

            {settings.logoMode === '3d' && (
              <>
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Logo dither style</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Shader dither pattern applied across the 3D anvil's metallic quantization bands.
                    </div>
                  </div>
                  <Dropdown
                    width={176}
                    value={settings.logoDitherStyle ?? 'none'}
                    onChange={(val) => updateSetting('logoDitherStyle', val as LogoDitherStyle)}
                    items={[
                      { id: 'bayer4', label: 'Bayer 4x4' },
                      { id: 'bayer2', label: 'Bayer 2x2' },
                      { id: 'bayer8', label: 'Bayer 8x8' },
                      { id: 'halftone', label: 'Halftone Dot' },
                      { id: 'scanline', label: 'Scanlines' },
                      { id: 'checker', label: 'Checkerboard' },
                      { id: 'none', label: 'Smooth (No Dither)' }
                    ]}
                  />
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-label">Edge sharpness & filtering</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Pixelated keeps raw dither pixels; Smooth enables hardware anti-aliasing.
                    </div>
                  </div>
                  <Dropdown
                    width={176}
                    value={settings.logoSharpness ?? 'pixelated'}
                    onChange={(val) => updateSetting('logoSharpness', val as LogoSharpness)}
                    items={[
                      { id: 'pixelated', label: 'Pixelated (Retro)' },
                      { id: 'crisp', label: 'Crisp Edges' },
                      { id: 'smooth', label: 'Smooth (MSAA)' }
                    ]}
                  />
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-label">Render resolution</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Internal WebGL canvas grid density (lower = chunkier pixels, higher = finer detail).
                    </div>
                  </div>
                  <Dropdown
                    width={176}
                    value={String(settings.logoResolution ?? 128)}
                    onChange={(val) => updateSetting('logoResolution', parseInt(val, 10) as 64 | 128 | 256 | 512)}
                    items={[
                      { id: '64', label: '64 × 64 (Chunky)' },
                      { id: '128', label: '128 × 128 (Default)' },
                      { id: '256', label: '256 × 256 (Sharp)' },
                      { id: '512', label: '512 × 512 (Ultra)' }
                    ]}
                  />
                </div>

                <div className="settings-row">
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <div className="settings-label">Shading bands (Posterize steps)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Number of metallic tone steps on the anvil surface.
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '180px', flexShrink: 0, paddingRight: '6px' }}>
                    <input
                      type="range"
                      className="control-slider"
                      min="2"
                      max="16"
                      step="1"
                      value={settings.logoColorSteps ?? 5}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        '--slider-fill': `${(((settings.logoColorSteps ?? 5) - 2) / 14) * 100}%`
                      } as React.CSSProperties}
                      onChange={(e) => updateSetting('logoColorSteps', parseInt(e.target.value, 10))}
                    />
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'right', color: 'var(--text-main)' }}>
                      {settings.logoColorSteps ?? 5}
                    </span>
                  </div>
                </div>

                <div className="settings-row">
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <div className="settings-label">Dither spread strength</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Intensity of the dither transition between shading bands.
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '180px', flexShrink: 0, paddingRight: '6px' }}>
                    <input
                      type="range"
                      className="control-slider"
                      min="0"
                      max="2"
                      step="0.05"
                      value={settings.logoDitherStrength ?? 1.0}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        '--slider-fill': `${((settings.logoDitherStrength ?? 1.0) / 2.0) * 100}%`
                      } as React.CSSProperties}
                      onChange={(e) => updateSetting('logoDitherStrength', parseFloat(e.target.value))}
                    />
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'right', color: 'var(--text-main)' }}>
                      {Math.round((settings.logoDitherStrength ?? 1.0) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="settings-row">
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <div className="settings-label">Animation speed</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      How fast or slow the anvil breathes, drifts, and orbits light (0% = frozen).
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '180px', flexShrink: 0, paddingRight: '6px' }}>
                    <input
                      type="range"
                      className="control-slider"
                      min="0"
                      max="3"
                      step="0.05"
                      value={settings.logoSpeed ?? 1.0}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        '--slider-fill': `${((settings.logoSpeed ?? 1.0) / 3.0) * 100}%`
                      } as React.CSSProperties}
                      onChange={(e) => updateSetting('logoSpeed', parseFloat(e.target.value))}
                    />
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'right', color: 'var(--text-main)' }}>
                      {Math.round((settings.logoSpeed ?? 1.0) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="settings-row">
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <div className="settings-label">Wiggle & float amount</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Amplitude of idle organic rotation, bobbing, and breathing scale.
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '180px', flexShrink: 0, paddingRight: '6px' }}>
                    <input
                      type="range"
                      className="control-slider"
                      min="0"
                      max="3"
                      step="0.05"
                      value={settings.logoWiggle ?? 1.0}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        '--slider-fill': `${((settings.logoWiggle ?? 1.0) / 3.0) * 100}%`
                      } as React.CSSProperties}
                      onChange={(e) => updateSetting('logoWiggle', parseFloat(e.target.value))}
                    />
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'right', color: 'var(--text-main)' }}>
                      {Math.round((settings.logoWiggle ?? 1.0) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-label">Cursor hover tracking</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Choose whether the anvil follows the pointer across the window, only in the sidebar, or not at all.
                    </div>
                  </div>
                  <Dropdown
                    width={176}
                    value={settings.logoCursorReact ?? 'direct'}
                    onChange={(val) => updateSetting('logoCursorReact', val as LogoCursorReact)}
                    items={[
                      { id: 'direct', label: 'Direct Hover Only' },
                      { id: 'sidebar', label: 'Near Sidebar' },
                      { id: 'global', label: 'Global (Window)' },
                      { id: 'off', label: 'Off' }
                    ]}
                  />
                </div>

                <div
                  className="settings-row"
                  style={{
                    opacity: (settings.logoCursorReact ?? 'direct') !== 'off' ? 1 : 0.45,
                    pointerEvents: (settings.logoCursorReact ?? 'direct') !== 'off' ? 'auto' : 'none',
                    transition: 'opacity 0.15s ease'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <div className="settings-label">Cursor tracking sensitivity</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      How strongly the anvil tilts toward the hovered cursor position.
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '180px', flexShrink: 0, paddingRight: '6px' }}>
                    <input
                      type="range"
                      className="control-slider"
                      min="0.1"
                      max="2.5"
                      step="0.05"
                      value={settings.logoCursorSensitivity ?? 0.4}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        '--slider-fill': `${(((settings.logoCursorSensitivity ?? 0.4) - 0.1) / 2.4) * 100}%`
                      } as React.CSSProperties}
                      onChange={(e) => updateSetting('logoCursorSensitivity', parseFloat(e.target.value))}
                    />
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'right', color: 'var(--text-main)' }}>
                      {Math.round((settings.logoCursorSensitivity ?? 0.4) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-label">Click sparks, recoil & blush</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Spawn 3D forge sparks, spring recoil, glowing blush rods, and steam when clicking the anvil.
                    </div>
                  </div>
                  <Dropdown
                    width={176}
                    value={settings.logoInteractiveClick !== false ? 'enabled' : 'disabled'}
                    onChange={(val) => updateSetting('logoInteractiveClick', val === 'enabled')}
                    items={[
                      { id: 'enabled', label: 'Enabled' },
                      { id: 'disabled', label: 'Disabled' }
                    ]}
                  />
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-label">Periodic metallic glint sweep</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Occasional diagonal specular light band sweeping across the anvil face.
                    </div>
                  </div>
                  <Dropdown
                    width={176}
                    value={settings.logoPeriodicShine !== false ? 'enabled' : 'disabled'}
                    onChange={(val) => updateSetting('logoPeriodicShine', val === 'enabled')}
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

            <div className="settings-row">
              <div>
                <div className="settings-label">Scroll fade</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Softly fade overflowing content at the top and bottom of scrollable panels.
                </div>
              </div>
              <Dropdown
                width={130}
                value={settings.scrollFade !== false ? 'enabled' : 'disabled'}
                onChange={(val) => updateSetting('scrollFade', val === 'enabled')}
                items={[
                  { id: 'enabled', label: 'Enabled' },
                  { id: 'disabled', label: 'Disabled' }
                ]}
              />
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Slider holder</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Show the draggable grip handle on sliders.
                </div>
              </div>
              <Dropdown
                width={130}
                value={settings.sliderHolder !== false ? 'enabled' : 'disabled'}
                onChange={(val) => updateSetting('sliderHolder', val === 'enabled')}
                items={[
                  { id: 'enabled', label: 'Enabled' },
                  { id: 'disabled', label: 'Disabled' }
                ]}
              />
            </div>

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

            {EngineBridge.isTauri() && (
              <div className="settings-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <span className="settings-label">Export folder</span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px', maxWidth: '280px', wordBreak: 'break-all' }}>
                    {settings.exportFolder || `${defaultExportDir} (Default)`}
                  </div>
                </div>
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
              </div>
            )
            }

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
              <span className="settings-readonly-text">v2</span>
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
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: isTerminal ? '12px 0 0' : '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: isTerminal ? 'transparent' : 'var(--bg-tertiary)', gap: '10px', marginTop: isTerminal ? '12px' : undefined }}>
          <button type="button" className="btn-subtle" onClick={() => setShowDevLogs(true)}>
            View Logs
          </button>
          <button
            type="button"
            className="btn-subtle"
            onClick={handleResetDefaults}
          >
            Reset to Default
          </button>
        </div>
    </>
  );

  const devLogsContent = (
    <>
            <div
              className="modal-body"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: isTerminal ? '0' : '16px 20px',
                backgroundColor: isTerminal ? 'transparent' : 'var(--bg-secondary)',
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
            <div className="modal-footer" style={{ padding: isTerminal ? '12px 0 0' : '12px 20px', borderTop: '1px solid var(--border-color)', background: isTerminal ? 'transparent' : 'var(--bg-tertiary)', display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: isTerminal ? '12px' : undefined }}>
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
    </>
  );

  if (isTerminal) {
    const isLinuxPlatform =
      typeof document !== 'undefined' &&
      (document.documentElement.getAttribute('data-platform') === 'linux' ||
        (typeof navigator !== 'undefined' && /linux/i.test(navigator.platform)));

    const renderSelectRow = (
      id: string,
      label: string,
      value: string,
      items: { id: string; label: string }[],
      onSelect: (val: string) => void,
      disabled = false
    ) => {
      const activeLabel = items.find((i) => i.id === value)?.label ?? value;
      const isBinary = items.length === 2;
      return (
        <div className={`settings-exe-row ${disabled ? 'disabled' : ''}`}>
          <span className="settings-exe-label">{label}</span>
          <span className="settings-exe-dots" />
          <div className="settings-exe-value-wrap">
            <button
              type="button"
              className="settings-exe-link"
              onClick={() => {
                if (isBinary) {
                  const nextOpt = items[0].id === value ? items[1] : items[0];
                  onSelect(nextOpt.id);
                  setOpenSettingMenu(null);
                } else {
                  setOpenSettingMenu((cur) => (cur === id ? null : id));
                }
              }}
            >
              {activeLabel}
            </button>
            {!isBinary && openSettingMenu === id && (
              <div className="export-exe-opt-menu">
                {items.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`export-exe-opt-item ${value === opt.id ? 'active' : ''}`}
                    onClick={() => {
                      onSelect(opt.id);
                      setOpenSettingMenu(null);
                    }}
                  >
                    <span>{opt.label}</span>
                    {value === opt.id && <span>*</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    };

    const renderToggleRow = (
      label: string,
      enabled: boolean,
      onToggle: (next: boolean) => void,
      disabled = false
    ) => (
      <div className={`settings-exe-row ${disabled ? 'disabled' : ''}`}>
        <span className="settings-exe-label">{label}</span>
        <span className="settings-exe-dots" />
        <div className="settings-exe-value-wrap">
          <button
            type="button"
            className="settings-exe-link"
            onClick={() => onToggle(!enabled)}
          >
            {enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>
    );

    const renderReadonlyRow = (label: string, valueText: string) => (
      <div className="settings-exe-row">
        <span className="settings-exe-label">{label}</span>
        <span className="settings-exe-dots" />
        <span className="settings-exe-readonly">{valueText}</span>
      </div>
    );

    const renderSlider = (
      label: string,
      valueText: string,
      min: number,
      max: number,
      step: number,
      value: number,
      fillPct: number,
      onChange: (val: number) => void,
      disabled = false
    ) => (
      <div className={`settings-exe-slider-block ${disabled ? 'disabled' : ''}`}>
        <div className="settings-exe-label">{label}</div>
        <div className="settings-exe-slider-row">
          <input
            type="range"
            className="control-slider settings-exe-slider"
            min={min}
            max={max}
            step={step}
            value={value}
            style={{ flex: 1, minWidth: 0, '--slider-fill': `${fillPct}%` } as React.CSSProperties}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            aria-label={label}
          />
          <span className="settings-exe-slider-val">{valueText}</span>
        </div>
      </div>
    );

    return (
      <>
        <TerminalWindow
          title="Settings.exe"
          isOpen={isOpen}
          onClose={onClose}
          defaultSize={{ w: 540, h: 560 }}
          minSize={{ w: 380, h: 300 }}
          disableResize={openSettingMenu !== null}
          className="df-tw-scroll df-settings-exe"
          dataModal="settings"
          ariaLabelledBy="settings-dialog-title"
        >
          <div className="settings-exe-scroll">
            <div className="settings-exe-section-title first">general</div>
            {renderSelectRow(
              'viewportMode',
              'Viewport mode',
              settings.defaultUpdateMode,
              [
                { id: 'live', label: 'Live' },
                { id: 'debounce', label: 'Debounce' }
              ],
              (val) => updateSetting('defaultUpdateMode', val as 'live' | 'debounce')
            )}
            {renderReadonlyRow('Language', 'English')}

            <div className="settings-exe-section-title">performance</div>
            {!isLinuxPlatform && (
              <>
                {renderToggleRow('Glass Blur', settings.glassBlur !== false, (v) => updateSetting('glassBlur', v))}
                {renderSlider(
                  'Glass Blur Strength',
                  `${settings.glassBlurRadius ?? 16}px`,
                  0,
                  40,
                  1,
                  settings.glassBlurRadius ?? 16,
                  ((settings.glassBlurRadius ?? 16) / 40) * 100,
                  (v) => updateSetting('glassBlurRadius', Math.round(v)),
                  settings.glassBlur === false
                )}
                {renderSlider(
                  'Glass Opacity',
                  `${Math.round((settings.glassOpacity ?? 0.82) * 100)}%`,
                  0.3,
                  0.98,
                  0.02,
                  settings.glassOpacity ?? 0.82,
                  (((settings.glassOpacity ?? 0.82) - 0.3) / 0.68) * 100,
                  (v) => updateSetting('glassOpacity', v),
                  settings.glassBlur === false
                )}
                {renderToggleRow(
                  'Topbar Glass',
                  settings.topbarGlass !== false,
                  (v) => updateSetting('topbarGlass', v),
                  settings.glassBlur === false
                )}
              </>
            )}
            {renderToggleRow('Drop Shadows', settings.shadows !== false, (v) => updateSetting('shadows', v))}
            {renderToggleRow('Ui Animations', settings.animations !== false, (v) => updateSetting('animations', v))}
            {renderToggleRow('High Zoom', settings.highQualityZoom !== false, (v) => updateSetting('highQualityZoom', v))}

            {EngineBridge.isTauri() && (
              <>
                <div className="settings-exe-section-title">video</div>
                <div className="settings-exe-row">
                  <span className="settings-exe-label">FFmpeg Backend</span>
                  <span className="settings-exe-dots" />
                  <div className="settings-exe-value-wrap">
                    <button
                      type="button"
                      className="settings-exe-link"
                      onClick={() => useAppStore.getState().setIsFfmpegModalOpen(true)}
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="settings-exe-section-title">misc</div>
            {renderSelectRow(
              'uiSkin',
              'Ui Skin',
              settings.uiSkin ?? 'default',
              UI_SKINS,
              (val) => {
                const next = withUiSkinDefaults(settings, val);
                setSettings(next);
                saveStoredSettings(next);
              }
            )}
            {renderSelectRow(
              'logoMode',
              'Logo',
              settings.logoMode ?? 'none',
              [
                { id: '2d', label: '2D' },
                { id: '3d', label: '3D' },
                { id: 'none', label: 'None' }
              ],
              (val) => updateSetting('logoMode', val as LogoMode)
            )}
            {settings.logoMode === '3d' && (
              <>
                {renderSelectRow(
                  'logoDitherStyle',
                  'Logo Dither',
                  settings.logoDitherStyle ?? 'none',
                  [
                    { id: 'bayer4', label: 'Bayer 4x4' },
                    { id: 'bayer2', label: 'Bayer 2x2' },
                    { id: 'bayer8', label: 'Bayer 8x8' },
                    { id: 'halftone', label: 'Halftone' },
                    { id: 'scanline', label: 'Scanlines' },
                    { id: 'checker', label: 'Checker' },
                    { id: 'none', label: 'Smooth' }
                  ],
                  (val) => updateSetting('logoDitherStyle', val as LogoDitherStyle)
                )}
                {renderSelectRow(
                  'logoSharpness',
                  'Logo Sharpness',
                  settings.logoSharpness ?? 'pixelated',
                  [
                    { id: 'pixelated', label: 'Pixelated' },
                    { id: 'crisp', label: 'Crisp' },
                    { id: 'smooth', label: 'Smooth' }
                  ],
                  (val) => updateSetting('logoSharpness', val as LogoSharpness)
                )}
                {renderSelectRow(
                  'logoResolution',
                  'Logo Resolution',
                  String(settings.logoResolution ?? 128),
                  [
                    { id: '64', label: '64' },
                    { id: '128', label: '128' },
                    { id: '256', label: '256' },
                    { id: '512', label: '512' }
                  ],
                  (val) => updateSetting('logoResolution', parseInt(val, 10) as 64 | 128 | 256 | 512)
                )}
                {renderSlider(
                  'Shading Bands',
                  String(settings.logoColorSteps ?? 5),
                  2,
                  16,
                  1,
                  settings.logoColorSteps ?? 5,
                  (((settings.logoColorSteps ?? 5) - 2) / 14) * 100,
                  (v) => updateSetting('logoColorSteps', Math.round(v))
                )}
                {renderSlider(
                  'Dither Spread',
                  `${Math.round((settings.logoDitherStrength ?? 1.0) * 100)}%`,
                  0,
                  2,
                  0.05,
                  settings.logoDitherStrength ?? 1.0,
                  ((settings.logoDitherStrength ?? 1.0) / 2.0) * 100,
                  (v) => updateSetting('logoDitherStrength', v)
                )}
                {renderSlider(
                  'Animation Speed',
                  `${Math.round((settings.logoSpeed ?? 1.0) * 100)}%`,
                  0,
                  3,
                  0.05,
                  settings.logoSpeed ?? 1.0,
                  ((settings.logoSpeed ?? 1.0) / 3.0) * 100,
                  (v) => updateSetting('logoSpeed', v)
                )}
                {renderSlider(
                  'Wiggle Amount',
                  `${Math.round((settings.logoWiggle ?? 1.0) * 100)}%`,
                  0,
                  3,
                  0.05,
                  settings.logoWiggle ?? 1.0,
                  ((settings.logoWiggle ?? 1.0) / 3.0) * 100,
                  (v) => updateSetting('logoWiggle', v)
                )}
                {renderSelectRow(
                  'logoCursorReact',
                  'Cursor Tracking',
                  settings.logoCursorReact ?? 'direct',
                  [
                    { id: 'direct', label: 'Direct' },
                    { id: 'sidebar', label: 'Sidebar' },
                    { id: 'global', label: 'Global' },
                    { id: 'off', label: 'Off' }
                  ],
                  (val) => updateSetting('logoCursorReact', val as LogoCursorReact)
                )}
                {renderSlider(
                  'Cursor Sensitivity',
                  `${Math.round((settings.logoCursorSensitivity ?? 0.4) * 100)}%`,
                  0.1,
                  2.5,
                  0.05,
                  settings.logoCursorSensitivity ?? 0.4,
                  (((settings.logoCursorSensitivity ?? 0.4) - 0.1) / 2.4) * 100,
                  (v) => updateSetting('logoCursorSensitivity', v),
                  (settings.logoCursorReact ?? 'direct') === 'off'
                )}
                {renderToggleRow(
                  'Click Sparks',
                  settings.logoInteractiveClick !== false,
                  (v) => updateSetting('logoInteractiveClick', v)
                )}
                {renderToggleRow(
                  'Metallic Glint',
                  settings.logoPeriodicShine !== false,
                  (v) => updateSetting('logoPeriodicShine', v)
                )}
              </>
            )}

            {renderSelectRow(
              'smoothScroll',
              'Scroll',
              settings.smoothScroll !== false ? 'lenis' : 'native',
              [
                { id: 'lenis', label: 'Lenis' },
                { id: 'native', label: 'Native' }
              ],
              (val) => updateSetting('smoothScroll', val === 'lenis')
            )}
            {renderSlider(
              'Scroll Tightness',
              `${Math.round((settings.scrollTightness ?? 0.25) * 100)}%`,
              0.05,
              1.0,
              0.05,
              settings.scrollTightness ?? 0.25,
              (((settings.scrollTightness ?? 0.25) - 0.05) / 0.95) * 100,
              (v) => updateSetting('scrollTightness', v),
              settings.smoothScroll === false
            )}
            {renderSlider(
              'Scroll Duration',
              `${(settings.scrollDuration ?? 1.2).toFixed(1)}s`,
              0.1,
              3.0,
              0.1,
              settings.scrollDuration ?? 1.2,
              (((settings.scrollDuration ?? 1.2) - 0.1) / 2.9) * 100,
              (v) => updateSetting('scrollDuration', v),
              settings.smoothScroll === false
            )}
            {renderToggleRow('Scroll Fade', settings.scrollFade !== false, (v) => updateSetting('scrollFade', v))}
            {renderToggleRow('Slider Holder', settings.sliderHolder !== false, (v) => updateSetting('sliderHolder', v))}

            {renderSelectRow(
              'defaultExportFormat',
              'Default Format',
              settings.defaultExportFormat,
              [
                { id: 'png', label: 'PNG' },
                { id: 'jpg', label: 'JPG' },
                { id: 'webp', label: 'WebP' },
                { id: 'svg', label: 'SVG' }
              ],
              (val) => updateSetting('defaultExportFormat', val as 'png' | 'jpg' | 'webp' | 'svg')
            )}

            {EngineBridge.isTauri() && (
              <div className="settings-exe-row">
                <span className="settings-exe-label">Export Folder</span>
                <span className="settings-exe-dots" />
                <div className="settings-exe-value-wrap">
                  <button
                    type="button"
                    className="settings-exe-link"
                    title={settings.exportFolder || `${defaultExportDir} (Default)`}
                    onClick={async () => {
                      const folder = await EngineBridge.selectExportDirectory();
                      if (folder) updateSetting('exportFolder', folder);
                    }}
                  >
                    Browse...
                  </button>
                  {settings.exportFolder && (
                    <button
                      type="button"
                      className="settings-exe-link"
                      onClick={() => updateSetting('exportFolder', undefined as any)}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="settings-exe-row">
              <span className="settings-exe-label">Recent Files Limit</span>
              <span className="settings-exe-dots" />
              <input
                type="number"
                min={1}
                max={50}
                value={settings.recentFilesLimit}
                onChange={(e) => updateSetting('recentFilesLimit', Math.max(1, parseInt(e.target.value, 10) || 8))}
                className="settings-exe-num"
                aria-label="Recent files limit"
              />
            </div>

            <div className="settings-exe-section-title">developer</div>
            {renderReadonlyRow('Build Mode', import.meta.env.PROD ? 'Release' : 'Development')}
            {renderReadonlyRow('Platform', navigator.platform)}
            {renderReadonlyRow('Version', 'v2')}
            {renderReadonlyRow('Engine', `${ALGORITHM_REGISTRY.length} algorithms`)}
            {renderReadonlyRow(
              'Active Backend',
              activeBackend === 'rust' ? 'Rust' : activeBackend === 'js-fallback' ? 'JS (Fallback)' : 'JavaScript'
            )}
            {renderReadonlyRow('Last Render', lastRenderMs > 0 ? `${lastRenderMs.toFixed(1)} ms` : '< 1 ms')}
            {renderReadonlyRow('Backend Error', backendError ?? 'None')}
            <div className="settings-exe-row">
              <span className="settings-exe-label">Purge Temp Files</span>
              <span className="settings-exe-dots" />
              <div className="settings-exe-value-wrap">
                {purgeMsg && <span className="settings-exe-readonly">{purgeMsg}</span>}
                <button type="button" className="settings-exe-link" onClick={handlePurgeTempFiles}>
                  Purge
                </button>
              </div>
            </div>
          </div>

          <div className="settings-exe-footer">
            <button type="button" className="settings-exe-btn" onClick={() => setShowDevLogs(true)}>
              View Logs
            </button>
            <button type="button" className="settings-exe-btn" onClick={handleResetDefaults}>
              Reset to Default
            </button>
          </div>
        </TerminalWindow>
        {showDevLogs && (
          <TerminalWindow
            title="Logs.exe"
            isOpen={showDevLogs}
            onClose={() => setShowDevLogs(false)}
            defaultSize={{ w: 560, h: 460 }}
            minSize={{ w: 360, h: 260 }}
            className="df-tw-scroll df-settings-exe"
            dataModal="dev-logs"
            ariaLabelledBy="dev-logs-title"
          >
            <div className="settings-exe-log-filters">
              {availableCategories.map((cat) => {
                const active = logFilter[cat] !== false;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`settings-exe-btn ${active ? 'active' : 'muted'}`}
                    onClick={() => toggleLogCategory(cat)}
                  >
                    {cat}
                  </button>
                );
              })}
              <button
                type="button"
                className="settings-exe-btn muted"
                onClick={() => {
                  const allOn = Object.values(logFilter).every((v) => v !== false);
                  setLogFilter(Object.fromEntries(Object.keys(logFilter).map((k) => [k, !allOn])));
                }}
              >
                Toggle All
              </button>
            </div>
            <div className="settings-exe-scroll">
              {filteredLogs.length === 0 ? (
                <span className="dev-log-empty">No logs match current filters</span>
              ) : (
                filteredLogs.map((entry, i) => (
                  <div key={i} className={`dev-log-entry dev-log-${entry.level}`} style={{ marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span className="dev-log-time" style={{ flexShrink: 0 }}>{entry.time}</span>
                    <span className={`dev-log-level dev-log-level-${entry.level}`} style={{ flexShrink: 0, width: '48px' }}>{entry.level.toUpperCase()}</span>
                    <span style={{ flexShrink: 0, fontSize: '0.72rem', color: 'var(--tm-text-muted)' }}>[{entry.category}]</span>
                    <span className="dev-log-msg" style={{ flex: 1 }}>{entry.msg}</span>
                    {entry.durationMs !== undefined && <span style={{ flexShrink: 0, fontSize: '0.72rem', color: 'var(--tm-text-muted)', marginLeft: '6px', whiteSpace: 'nowrap' }}>{entry.durationMs.toFixed(1)}ms</span>}
                  </div>
                ))
              )}
            </div>
            <div className="settings-exe-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="settings-exe-btn"
                onClick={() => {
                  const text = filteredLogs.map((e) => `[${e.time}] [${e.category}] ${e.level.toUpperCase()}: ${e.msg}`).join('\n');
                  navigator.clipboard.writeText(text);
                }}
              >
                Copy all
              </button>
              <button type="button" className="settings-exe-btn" onClick={clearDevLogs}>
                Clear
              </button>
            </div>
          </TerminalWindow>
        )}
      </>
    );
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-dialog settings-dialog" 
        data-df-modal="settings"
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
        {settingsContent}
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
            {devLogsContent}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

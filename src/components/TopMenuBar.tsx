import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../state/useAppStore';
import { ExportModal } from './dialogs/ExportModal';
// @ts-ignore
import { copyCanvasToClipboard } from '../dither-engine/exporters.js';
import {
  FolderOpen,
  Sparkles,
  Copy,
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  ChevronRight
} from 'lucide-react';

interface TopMenuBarProps {
  onOpenManual?: () => void;
  onOpenSettings?: () => void;
}

type MenuType = 'file' | 'edit' | 'view' | null;

const THEMES = [
  { id: 'light_pro', label: 'Light Pro' },
  { id: 'dark_pro', label: 'Dark Pro' },
  { id: 'nord', label: 'Nord' },
  { id: 'evergreen', label: 'Evergreen' },
  { id: 'gruvbox', label: 'Gruvbox' },
  { id: 'catppuccin_mocha', label: 'Catppuccin Mocha' },
  { id: 'tokyo_night', label: 'Tokyo Night' },
  { id: 'solarized_dark', label: 'Solarized Dark' },
  { id: 'one_dark', label: 'One Dark' },
];

export const TopMenuBar: React.FC<TopMenuBarProps> = ({ onOpenSettings }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);
  const [isThemesSubmenuOpen, setIsThemesSubmenuOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const activeTheme = useAppStore((state) => state.activeTheme);
  const setActiveTheme = useAppStore((state) => state.setActiveTheme);
  const toggleFullScreen = useAppStore((state) => state.toggleFullScreen);
  const showBeforeAfter = useAppStore((state) => state.showBeforeAfter);
  const toggleBeforeAfter = useAppStore((state) => state.toggleBeforeAfter);
  const imageWidth = useAppStore((state) => state.imageWidth);
  const imageHeight = useAppStore((state) => state.imageHeight);
  const lastRenderMs = useAppStore((state) => state.lastRenderMs);

  // Cycling 3-part VIEWPORT pill states + Video 2-part pill states
  const previewQuality = useAppStore((state) => state.previewQuality);
  const cyclePreviewQuality = useAppStore((state) => state.cyclePreviewQuality);
  const viewportUpdateMode = useAppStore((state) => state.viewportUpdateMode);
  const toggleViewportUpdateMode = useAppStore((state) => state.toggleViewportUpdateMode);
  const appMode = useAppStore((state) => state.appMode);
  const hasConfiguredAnimation = useAppStore((state) => state.hasConfiguredAnimation);
  const toggleAppMode = useAppStore((state) => state.toggleAppMode);
  const videoPlaybackMode = useAppStore((state) => state.videoPlaybackMode);
  const toggleVideoPlaybackMode = useAppStore((state) => state.toggleVideoPlaybackMode);
  const videoRenderMode = useAppStore((state) => state.videoRenderMode);
  const toggleVideoRenderMode = useAppStore((state) => state.toggleVideoRenderMode);

  const loadImageFromData = useAppStore((state) => state.loadImageFromData);
  const loadSampleImage = useAppStore((state) => state.loadSampleImage);
  const clearImage = useAppStore((state) => state.clearImage);
  const resetAll = useAppStore((state) => state.resetAll);
  const resetCurrentAlgoParams = useAppStore((state) => state.resetCurrentAlgoParams);
  const resetAllAdjustments = useAppStore((state) => state.resetAllAdjustments);
  const fitToViewport = useAppStore((state) => state.fitToViewport);
  const resetZoom = useAppStore((state) => state.resetZoom);
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);

  const handleOpenFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCopyClipboard = useCallback(() => {
    const canvas = document.querySelector('canvas.preview-canvas') as HTMLCanvasElement;
    if (canvas) {
      copyCanvasToClipboard(canvas).catch((err: any) => {
        console.warn('Copy to clipboard failed:', err);
      });
    }
  }, []);

  const handleFit = useCallback(() => {
    const canvasArea = document.querySelector('.canvas-area');
    const sWidth = useAppStore.getState().sidebarWidth;
    if (canvasArea) {
      fitToViewport(canvasArea.clientWidth - (sWidth + 14), canvasArea.clientHeight - 38);
    } else {
      fitToViewport(window.innerWidth - (sWidth + 14), window.innerHeight - 38);
    }
  }, [fitToViewport]);

  const handleZoomIn = useCallback(() => {
    setZoom(Math.min(3200, Math.round(zoom + 20)));
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(Math.max(10, Math.round(zoom - 20)));
  }, [zoom, setZoom]);

  useEffect(() => {
    const handleWindowClick = () => {
      setActiveMenu(null);
      setIsThemesSubmenuOpen(false);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeMenu) {
        e.preventDefault();
        setActiveMenu(null);
        setIsThemesSubmenuOpen(false);
        return;
      }
      const target = e.target as HTMLElement;
      if (!target) return;
      const tag = target.tagName;
      if (
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        tag === 'BUTTON' || tag === 'A' ||
        target.isContentEditable ||
        target.closest('button, a, input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'o') { e.preventDefault(); handleOpenFileDialog(); return; }
        if (e.key.toLowerCase() === 'c' && !window.getSelection()?.toString()) { e.preventDefault(); handleCopyClipboard(); return; }
        if (e.key.toLowerCase() === 'e') { e.preventDefault(); setIsExportOpen(true); return; }
        if (e.key === '=' || e.key === '+') { e.preventDefault(); handleZoomIn(); return; }
        if (e.key === '-') { e.preventDefault(); handleZoomOut(); return; }
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '0') { e.preventDefault(); handleFit(); return; }
        if (e.key === '1') { e.preventDefault(); resetZoom(); return; }
        if (e.key === '\\') { e.preventDefault(); toggleBeforeAfter(); return; }
        if (e.key === '=' || e.key === '+') { e.preventDefault(); handleZoomIn(); return; }
        if (e.key === '-' || e.key === '_') { e.preventDefault(); handleZoomOut(); return; }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeMenu, handleOpenFileDialog, handleCopyClipboard, handleZoomIn, handleZoomOut, handleFit, resetZoom, toggleBeforeAfter]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = img.naturalWidth;
        offscreen.height = img.naturalHeight;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
        loadImageFromData(imgData, file.name);
        const canvasArea = document.querySelector('.canvas-area');
        if (canvasArea) {
          fitToViewport(canvasArea.clientWidth, canvasArea.clientHeight);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleMenu = (menu: MenuType) => {
    setActiveMenu((curr) => (curr === menu ? null : menu));
    setIsThemesSubmenuOpen(false);
  };

  const qualityLabel = previewQuality === 'full' ? 'Full' : previewQuality === 'mid' ? 'Mid' : 'Low';
  const updateLabel = viewportUpdateMode === 'live' ? 'Live' : 'Debounce';
  const modeLabel = appMode === 'animation' ? 'Animated' : 'Still';
  const playbackLabel = videoPlaybackMode === 'standard' ? 'Standard' : 'Looped';
  const renderLabel = videoRenderMode === 'quick' ? 'Quick' : 'Rendered';

  return (
    <header className="top-menu-bar">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Left: File | Edit | View pill */}
      <nav className="menu-dropdowns" onClick={(e) => e.stopPropagation()}>
        <div className="topbar-menu-pill">
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`menu-btn ${activeMenu === 'file' ? 'active' : ''}`}
              onClick={() => toggleMenu('file')}
              onMouseEnter={() => activeMenu && activeMenu !== 'file' && setActiveMenu('file')}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className="dropdown-menu-popover" role="menu">
                <button className="dropdown-menu-item" onClick={() => { handleOpenFileDialog(); setActiveMenu(null); }}>
                  <FolderOpen size={13} /><span>Open Image…</span><span className="menu-shortcut">Ctrl+O</span>
                </button>
                <button className="dropdown-menu-item" onClick={() => { loadSampleImage(); setActiveMenu(null); }}>
                  <Sparkles size={13} /><span>Load Calibration Pattern</span>
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-menu-item" onClick={() => { handleCopyClipboard(); setActiveMenu(null); }}>
                  <Copy size={13} /><span>Copy Result to Clipboard</span><span className="menu-shortcut">Ctrl+C</span>
                </button>
                <button className="dropdown-menu-item" onClick={() => { setIsExportOpen(true); setActiveMenu(null); }}>
                  <Download size={13} /><span>Export…</span><span className="menu-shortcut">Ctrl+E</span>
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-menu-item" onClick={() => { clearImage(); setActiveMenu(null); }}>
                  <span>Close Image</span>
                </button>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`menu-btn ${activeMenu === 'edit' ? 'active' : ''}`}
              onClick={() => toggleMenu('edit')}
              onMouseEnter={() => activeMenu && activeMenu !== 'edit' && setActiveMenu('edit')}
            >
              Edit
            </button>
            {activeMenu === 'edit' && (
              <div className="dropdown-menu-popover" role="menu">
                <button className="dropdown-menu-item" onClick={() => { resetAllAdjustments(); setActiveMenu(null); }}>
                  <RotateCcw size={13} /><span>Reset Adjustments</span>
                </button>
                <button className="dropdown-menu-item" onClick={() => { resetCurrentAlgoParams(); setActiveMenu(null); }}>
                  <RotateCcw size={13} /><span>Reset Algorithm Parameters</span>
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-menu-item" onClick={() => { resetAll(); setActiveMenu(null); }}>
                  <RotateCcw size={13} /><span>Reset All</span>
                </button>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`menu-btn ${activeMenu === 'view' ? 'active' : ''}`}
              onClick={() => toggleMenu('view')}
              onMouseEnter={() => activeMenu && activeMenu !== 'view' && setActiveMenu('view')}
            >
              View
            </button>
            {activeMenu === 'view' && (
              <div className="dropdown-menu-popover" role="menu">
                <button className="dropdown-menu-item" onClick={() => { handleZoomIn(); setActiveMenu(null); }}>
                  <ZoomIn size={13} /><span>Zoom In</span><span className="menu-shortcut">Ctrl+=</span>
                </button>
                <button className="dropdown-menu-item" onClick={() => { handleZoomOut(); setActiveMenu(null); }}>
                  <ZoomOut size={13} /><span>Zoom Out</span><span className="menu-shortcut">Ctrl+-</span>
                </button>
                <button className="dropdown-menu-item" onClick={() => { handleFit(); setActiveMenu(null); }}>
                  <Maximize2 size={13} /><span>Fit to Viewport</span><span className="menu-shortcut">0</span>
                </button>
                <button className="dropdown-menu-item" onClick={() => { resetZoom(); setActiveMenu(null); }}>
                  <span>Actual Size</span><span className="menu-shortcut">1</span>
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-menu-item" onClick={() => { toggleBeforeAfter(); setActiveMenu(null); }}>
                  <span>Toggle Compare</span><span className="menu-shortcut">\</span>
                </button>
                <button className="dropdown-menu-item" onClick={() => { toggleFullScreen(); setActiveMenu(null); }}>
                  <span>Toggle Fullscreen</span><span className="menu-shortcut">F11</span>
                </button>
                <div className="dropdown-divider" />
                <div
                  className={`dropdown-menu-item dropdown-submenu-trigger ${isThemesSubmenuOpen ? 'active' : ''}`}
                  onMouseEnter={() => setIsThemesSubmenuOpen(true)}
                  onMouseLeave={() => setIsThemesSubmenuOpen(false)}
                >
                  <span>Themes</span>
                  <ChevronRight size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                  <div className={`dropdown-menu-popover dropdown-submenu-popover ${isThemesSubmenuOpen ? 'open' : ''}`}>
                    {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        className="dropdown-menu-item"
                        onClick={() => { setActiveTheme(theme.id); setActiveMenu(null); setIsThemesSubmenuOpen(false); }}
                      >
                        <span style={{ width: '14px', display: 'inline-flex', alignItems: 'center' }}>
                          {activeTheme === theme.id && <Check size={13} style={{ color: 'var(--text-main)' }} />}
                        </span>
                        <span>{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Center: Single 3-part cycling VIEWPORT pill + Video pill in Animation mode */}
      <div className="topbar-center-controls">
        <div className="topbar-control-group">
          <span className="strip-viewport-label">VIEWPORT:</span>
          <div className="segmented-switch topbar-viewport-switch" role="group" aria-label="Viewport Configuration">
            <button
              type="button"
              className="switch-btn"
              onClick={toggleViewportUpdateMode}
              title="Click to toggle Live / Debounce update mode"
            >
              {updateLabel}
            </button>
            <button
              type="button"
              className="switch-btn"
              onClick={cyclePreviewQuality}
              title="Click to cycle Full / Low / Mid preview quality"
            >
              {qualityLabel}
            </button>
            <button
              type="button"
              className="switch-btn"
              onClick={toggleAppMode}
              title="Click to toggle Still / Animated mode"
            >
              {modeLabel}
            </button>
          </div>
        </div>

        {appMode === 'animation' && hasConfiguredAnimation && (
          <div className="topbar-control-group" style={{ marginLeft: '18px' }}>
            <span className="strip-viewport-label" style={{ textTransform: 'none' }}>Video:</span>
            <div className="segmented-switch topbar-viewport-switch" role="group" aria-label="Video Configuration">
              <button
                type="button"
                className="switch-btn"
                onClick={toggleVideoPlaybackMode}
                title="Click to toggle Standard / Looped playback"
              >
                {playbackLabel}
              </button>
              <button
                type="button"
                className="switch-btn"
                onClick={toggleVideoRenderMode}
                title="Click to toggle Quick / Rendered mode"
              >
                {renderLabel}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Dimensions & Render Time + Compare | Grid pill + Settings pill */}
      <div className="top-right-controls">
        <div className="topbar-status-text">
          <span>{imageWidth > 0 ? `${imageWidth}×${imageHeight}` : 'Ready'}</span>
          <span>{lastRenderMs > 0 ? `${lastRenderMs.toFixed(1)}ms` : '<1ms'}</span>
        </div>

        <div className="segmented-switch topbar-compare-grid-switch" role="group" aria-label="Viewport Overlays">
          <button
            type="button"
            className={`switch-btn ${showBeforeAfter ? 'active' : ''}`}
            onClick={toggleBeforeAfter}
          >
            Compare
          </button>
          <button
            type="button"
            className="switch-btn"
            disabled
          >
            Grid
          </button>
        </div>

        <button
          type="button"
          className="topbar-settings-pill"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </div>

      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </header>
  );
};

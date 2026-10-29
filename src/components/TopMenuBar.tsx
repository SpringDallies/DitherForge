import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Tooltip } from './common/Tooltip';
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
  ChevronRight,
  Columns,
  Grid,
  Settings
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

export const TopMenuBar: React.FC<TopMenuBarProps> = ({ onOpenManual, onOpenSettings }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isThemesSubmenuOpen, setIsThemesSubmenuOpen] = useState<boolean>(false);

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Trigger refs for focus management
  const fileBtnRef = useRef<HTMLButtonElement | null>(null);
  const editBtnRef = useRef<HTMLButtonElement | null>(null);
  const viewBtnRef = useRef<HTMLButtonElement | null>(null);

  const activeTheme = useAppStore((state) => state.activeTheme);
  const setActiveTheme = useAppStore((state) => state.setActiveTheme);
  const toggleFullScreen = useAppStore((state) => state.toggleFullScreen);
  const showBeforeAfter = useAppStore((state) => state.showBeforeAfter);
  const toggleBeforeAfter = useAppStore((state) => state.toggleBeforeAfter);
  const imageWidth = useAppStore((state) => state.imageWidth);
  const imageHeight = useAppStore((state) => state.imageHeight);
  const lastRenderMs = useAppStore((state) => state.lastRenderMs);
  const updateMode = useAppStore((state) => state.updateMode);
  const setUpdateMode = useAppStore((state) => state.setUpdateMode);

  const loadImageFromData = useAppStore((state) => state.loadImageFromData);
  const loadSampleImage = useAppStore((state) => state.loadSampleImage);
  const clearImage = useAppStore((state) => state.clearImage);
  const resetAll = useAppStore((state) => state.resetAll);
  const resetCurrentAlgoParams = useAppStore((state) => state.resetCurrentAlgoParams);
  const fitToViewport = useAppStore((state) => state.fitToViewport);
  const resetZoom = useAppStore((state) => state.resetZoom);
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);

  const resetAllAdjustments = useAppStore((state) => state.resetAllAdjustments);

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
    if (canvasArea) {
      fitToViewport(canvasArea.clientWidth, canvasArea.clientHeight);
    } else {
      fitToViewport(window.innerWidth - 400, window.innerHeight - 100);
    }
  }, [fitToViewport]);

  const handleZoomIn = useCallback(() => {
    setZoom(Math.min(3200, Math.round(zoom + 20)));
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(Math.max(10, Math.round(zoom - 20)));
  }, [zoom, setZoom]);

  const handleResetAdjustments = useCallback(() => {
    resetAllAdjustments();
  }, [resetAllAdjustments]);

  // Close menus on click outside
  useEffect(() => {
    const handleWindowClick = () => {
      setActiveMenu(null);
      setFocusedIndex(-1);
      setIsThemesSubmenuOpen(false);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Menu lists definitions for keyboard navigation
  const menusOrder: MenuType[] = ['file', 'edit', 'view'];

  // Global keyboard shortcuts (Alt+F/E/V, Ctrl+O, Ctrl+C, Ctrl+E, Ctrl+=/-, 0, 1, \)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Alt + Key Menu navigation
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          setActiveMenu((curr) => (curr === 'file' ? null : 'file'));
          setFocusedIndex(0);
          setIsThemesSubmenuOpen(false);
          return;
        }
        if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          setActiveMenu((curr) => (curr === 'edit' ? null : 'edit'));
          setFocusedIndex(0);
          setIsThemesSubmenuOpen(false);
          return;
        }
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          setActiveMenu((curr) => (curr === 'view' ? null : 'view'));
          setFocusedIndex(0);
          setIsThemesSubmenuOpen(false);
          return;
        }
      }

      // Esc closes open menu
      if (e.key === 'Escape') {
        if (activeMenu) {
          e.preventDefault();
          const closedMenu = activeMenu;
          setActiveMenu(null);
          setFocusedIndex(-1);
          setIsThemesSubmenuOpen(false);
          // Return focus to the trigger
          if (closedMenu === 'file') fileBtnRef.current?.focus();
          else if (closedMenu === 'edit') editBtnRef.current?.focus();
          else if (closedMenu === 'view') viewBtnRef.current?.focus();
          return;
        }
      }

      // If a UI control is focused, don't trigger canvas shortcuts
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

      // Ctrl / Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          handleOpenFileDialog();
          return;
        }
        if (e.key.toLowerCase() === 'c' && !window.getSelection()?.toString()) {
          e.preventDefault();
          handleCopyClipboard();
          return;
        }
        if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          setIsExportOpen(true);
          return;
        }
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
          return;
        }
      }

      // Single-key shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '0') {
          e.preventDefault();
          handleFit();
          return;
        }
        if (e.key === '1') {
          e.preventDefault();
          resetZoom();
          return;
        }
        if (e.key === '\\') {
          e.preventDefault();
          toggleBeforeAfter();
          return;
        }
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
          return;
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          handleZoomOut();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    activeMenu,
    handleOpenFileDialog,
    handleCopyClipboard,
    handleZoomIn,
    handleZoomOut,
    handleFit,
    resetZoom,
    toggleBeforeAfter
  ]);

  // Menu arrow key navigation when a menu is open
  const handleMenuKeyDown = (e: React.KeyboardEvent, menuType: MenuType) => {
    if (!activeMenu) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      // If on themes item in view menu, open themes submenu
      if (menuType === 'view' && focusedIndex === 6) {
        setIsThemesSubmenuOpen(true);
        return;
      }
      // Otherwise switch to next menu in bar
      const currentIndex = menusOrder.indexOf(menuType);
      const nextMenu = menusOrder[(currentIndex + 1) % menusOrder.length];
      setActiveMenu(nextMenu);
      setFocusedIndex(0);
      setIsThemesSubmenuOpen(false);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (isThemesSubmenuOpen) {
        setIsThemesSubmenuOpen(false);
        return;
      }
      const currentIndex = menusOrder.indexOf(menuType);
      const prevMenu = menusOrder[(currentIndex - 1 + menusOrder.length) % menusOrder.length];
      setActiveMenu(prevMenu);
      setFocusedIndex(0);
      setIsThemesSubmenuOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const count = getMenuItemCount(menuType);
      setFocusedIndex((prev) => (prev + 1) % count);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const count = getMenuItemCount(menuType);
      setFocusedIndex((prev) => (prev - 1 + count) % count);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerMenuItem(menuType, focusedIndex);
    }
  };

  const getMenuItemCount = (menu: MenuType): number => {
    switch (menu) {
      case 'file': return 5;
      case 'edit': return 5;
      case 'view': return 7;
      default: return 0;
    }
  };

  const triggerMenuItem = (menu: MenuType, index: number) => {
    if (menu === 'file') {
      if (index === 0) { handleOpenFileDialog(); setActiveMenu(null); }
      else if (index === 1) { loadSampleImage(); handleFit(); setActiveMenu(null); }
      else if (index === 2) { handleCopyClipboard(); setActiveMenu(null); }
      else if (index === 3) { setIsExportOpen(true); setActiveMenu(null); }
      else if (index === 4) { clearImage(); setActiveMenu(null); }
    } else if (menu === 'edit') {
      // 0 & 1 are Undo/Redo (disabled)
      if (index === 2) { handleResetAdjustments(); setActiveMenu(null); }
      else if (index === 3) { resetCurrentAlgoParams(); setActiveMenu(null); }
      else if (index === 4) { resetAll(); setActiveMenu(null); }
    } else if (menu === 'view') {
      if (index === 0) { handleZoomIn(); setActiveMenu(null); }
      else if (index === 1) { handleZoomOut(); setActiveMenu(null); }
      else if (index === 2) { handleFit(); setActiveMenu(null); }
      else if (index === 3) { resetZoom(); setActiveMenu(null); }
      else if (index === 4) { toggleBeforeAfter(); setActiveMenu(null); }
      else if (index === 5) { toggleFullScreen(); setActiveMenu(null); }
      else if (index === 6) { setIsThemesSubmenuOpen(!isThemesSubmenuOpen); }
    }
  };

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
    if (activeMenu === menu) {
      setActiveMenu(null);
      setFocusedIndex(-1);
    } else {
      setActiveMenu(menu);
      setFocusedIndex(0);
      setIsThemesSubmenuOpen(false);
    }
  };

  const handleMenuTriggerHover = (menu: MenuType) => {
    // If a menu is already open, hovering another label switches to it (standard desktop UX)
    if (activeMenu && activeMenu !== menu) {
      setActiveMenu(menu);
      setFocusedIndex(0);
      setIsThemesSubmenuOpen(false);
    }
  };

  return (
    <header className="top-menu-bar">
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      <nav className="menu-dropdowns" onClick={(e) => e.stopPropagation()}>
        {/* 1. FILE MENU */}
        <div style={{ position: 'relative' }}>
          <button 
            ref={fileBtnRef}
            className={`menu-btn ${activeMenu === 'file' ? 'active' : ''}`}
            onClick={() => toggleMenu('file')}
            onMouseEnter={() => handleMenuTriggerHover('file')}
            onKeyDown={(e) => handleMenuKeyDown(e, 'file')}
            aria-haspopup="menu"
            aria-expanded={activeMenu === 'file'}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div 
              className="dropdown-menu-popover" 
              role="menu"
              tabIndex={-1}
              onKeyDown={(e) => handleMenuKeyDown(e, 'file')}
            >
              <button 
                className={`dropdown-menu-item ${focusedIndex === 0 ? 'focused' : ''}`}
                onClick={() => { handleOpenFileDialog(); setActiveMenu(null); }}
                onMouseEnter={() => setFocusedIndex(0)}
                role="menuitem"
              >
                <FolderOpen size={13} />
                <span>Open Image…</span>
                <span className="menu-shortcut">Ctrl+O</span>
              </button>

              <button 
                className={`dropdown-menu-item ${focusedIndex === 1 ? 'focused' : ''}`}
                onClick={() => { loadSampleImage(); handleFit(); setActiveMenu(null); }}
                onMouseEnter={() => setFocusedIndex(1)}
                role="menuitem"
              >
                <Sparkles size={13} />
                <span>Load Calibration Pattern</span>
              </button>

              <div className="dropdown-divider" />

              <button 
                className={`dropdown-menu-item ${focusedIndex === 2 ? 'focused' : ''}`}
                onClick={() => { handleCopyClipboard(); setActiveMenu(null); }}
                onMouseEnter={() => setFocusedIndex(2)}
                role="menuitem"
              >
                <Copy size={13} />
                <span>Copy Result to Clipboard</span>
                <span className="menu-shortcut">Ctrl+C</span>
              </button>

              <button 
                className={`dropdown-menu-item ${focusedIndex === 3 ? 'focused' : ''}`}
                onClick={() => { setIsExportOpen(true); setActiveMenu(null); }}
                onMouseEnter={() => setFocusedIndex(3)}
                role="menuitem"
              >
                <Download size={13} />
                <span>Export…</span>
                <span className="menu-shortcut">Ctrl+E</span>
              </button>

              <div className="dropdown-divider" />

              <button 
                className={`dropdown-menu-item ${focusedIndex === 4 ? 'focused' : ''}`}
                onClick={() => { clearImage(); setActiveMenu(null); }}
                onMouseEnter={() => setFocusedIndex(4)}
                role="menuitem"
              >
                <span>Close Image</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. EDIT MENU */}
        <div style={{ position: 'relative' }}>
          <button 
            ref={editBtnRef}
            className={`menu-btn ${activeMenu === 'edit' ? 'active' : ''}`}
            onClick={() => toggleMenu('edit')}
            onMouseEnter={() => handleMenuTriggerHover('edit')}
            onKeyDown={(e) => handleMenuKeyDown(e, 'edit')}
            aria-haspopup="menu"
            aria-expanded={activeMenu === 'edit'}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div 
              className="dropdown-menu-popover" 
              role="menu"
              tabIndex={-1}
              onKeyDown={(e) => handleMenuKeyDown(e, 'edit')}
            >
              <button 
                className={`dropdown-menu-item ${focusedIndex === 0 ? 'focused' : ''}`}
                disabled
                title="Not implemented"
                role="menuitem"
              >
                <span>Undo</span>
                <span className="menu-shortcut">Ctrl+Z</span>
              </button>

              <button 
                className={`dropdown-menu-item ${focusedIndex === 1 ? 'focused' : ''}`}
                disabled
                title="Not implemented"
                role="menuitem"
              >
                <span>Redo</span>
                <span className="menu-shortcut">Ctrl+Y</span>
              </button>

              <div className="dropdown-divider" />

              <button 
                className={`dropdown-menu-item ${focusedIndex === 2 ? 'focused' : ''}`}
                onClick={() => { handleResetAdjustments(); setActiveMenu(null); }}
                onMouseEnter={() => setFocusedIndex(2)}
                role="menuitem"
              >
                <RotateCcw size={13} />
                <span>Reset Adjustments</span>
              </button>

              <button 
                className={`dropdown-menu-item ${focusedIndex === 3 ? 'focused' : ''}`}
                onClick={() => { resetCurrentAlgoParams(); setActiveMenu(null); }}
                onMouseEnter={() => setFocusedIndex(3)}
                role="menuitem"
              >
                <RotateCcw size={13} />
                <span>Reset Algorithm Parameters</span>
              </button>

              <div className="dropdown-divider" />

              <button 
                className={`dropdown-menu-item ${focusedIndex === 4 ? 'focused' : ''}`}
                onClick={() => { resetAll(); setActiveMenu(null); }}
                onMouseEnter={() => setFocusedIndex(4)}
                role="menuitem"
              >
                <RotateCcw size={13} />
                <span>Reset All</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. VIEW MENU */}
        <div style={{ position: 'relative' }}>
          <button 
            ref={viewBtnRef}
            className={`menu-btn ${activeMenu === 'view' ? 'active' : ''}`}
            onClick={() => toggleMenu('view')}
            onMouseEnter={() => handleMenuTriggerHover('view')}
            onKeyDown={(e) => handleMenuKeyDown(e, 'view')}
            aria-haspopup="menu"
            aria-expanded={activeMenu === 'view'}
          >
            View
          </button>
          {activeMenu === 'view' && (
            <div 
              className="dropdown-menu-popover" 
              role="menu"
              tabIndex={-1}
              onKeyDown={(e) => handleMenuKeyDown(e, 'view')}
            >
              <button 
                className={`dropdown-menu-item ${focusedIndex === 0 ? 'focused' : ''}`}
                onClick={() => { handleZoomIn(); setActiveMenu(null); }}
                onMouseEnter={() => { setFocusedIndex(0); setIsThemesSubmenuOpen(false); }}
                role="menuitem"
              >
                <ZoomIn size={13} />
                <span>Zoom In</span>
                <span className="menu-shortcut">Ctrl+=</span>
              </button>

              <button 
                className={`dropdown-menu-item ${focusedIndex === 1 ? 'focused' : ''}`}
                onClick={() => { handleZoomOut(); setActiveMenu(null); }}
                onMouseEnter={() => { setFocusedIndex(1); setIsThemesSubmenuOpen(false); }}
                role="menuitem"
              >
                <ZoomOut size={13} />
                <span>Zoom Out</span>
                <span className="menu-shortcut">Ctrl+-</span>
              </button>

              <button 
                className={`dropdown-menu-item ${focusedIndex === 2 ? 'focused' : ''}`}
                onClick={() => { handleFit(); setActiveMenu(null); }}
                onMouseEnter={() => { setFocusedIndex(2); setIsThemesSubmenuOpen(false); }}
                role="menuitem"
              >
                <Maximize2 size={13} />
                <span>Fit to Viewport</span>
                <span className="menu-shortcut">0</span>
              </button>

              <button 
                className={`dropdown-menu-item ${focusedIndex === 3 ? 'focused' : ''}`}
                onClick={() => { resetZoom(); setActiveMenu(null); }}
                onMouseEnter={() => { setFocusedIndex(3); setIsThemesSubmenuOpen(false); }}
                role="menuitem"
              >
                <span>Actual Size</span>
                <span className="menu-shortcut">1</span>
              </button>

              <div className="dropdown-divider" />

              <button 
                className={`dropdown-menu-item ${focusedIndex === 4 ? 'focused' : ''}`}
                onClick={() => { toggleBeforeAfter(); setActiveMenu(null); }}
                onMouseEnter={() => { setFocusedIndex(4); setIsThemesSubmenuOpen(false); }}
                role="menuitem"
              >
                <span>Toggle Compare</span>
                <span className="menu-shortcut">\</span>
              </button>

              <button 
                className={`dropdown-menu-item ${focusedIndex === 5 ? 'focused' : ''}`}
                onClick={() => { toggleFullScreen(); setActiveMenu(null); }}
                onMouseEnter={() => { setFocusedIndex(5); setIsThemesSubmenuOpen(false); }}
                role="menuitem"
              >
                <span>Toggle Fullscreen</span>
                <span className="menu-shortcut">F11</span>
              </button>

              <div className="dropdown-divider" />

              {/* Themes Submenu */}
              <div 
                className={`dropdown-menu-item dropdown-submenu-trigger ${focusedIndex === 6 ? 'focused' : ''} ${isThemesSubmenuOpen ? 'active' : ''}`}
                onMouseEnter={() => { setFocusedIndex(6); setIsThemesSubmenuOpen(true); }}
                onClick={() => setIsThemesSubmenuOpen(!isThemesSubmenuOpen)}
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={isThemesSubmenuOpen}
              >
                <span>Themes</span>
                <ChevronRight size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                <div 
                  className={`dropdown-menu-popover dropdown-submenu-popover ${isThemesSubmenuOpen ? 'open' : ''}`} 
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => setIsThemesSubmenuOpen(true)}
                  onMouseLeave={() => setIsThemesSubmenuOpen(false)}
                >
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      className="dropdown-menu-item"
                      onClick={() => {
                        setActiveTheme(theme.id);
                        setActiveMenu(null);
                        setIsThemesSubmenuOpen(false);
                      }}
                      role="menuitemradio"
                      aria-checked={activeTheme === theme.id}
                    >
                      <span style={{ width: '14px', display: 'inline-flex', alignItems: 'center' }}>
                        {activeTheme === theme.id && <Check size={13} style={{ color: 'var(--accent-cyan)' }} />}
                      </span>
                      <span>{theme.label}</span>
                    </button>
                  ))}
                </div>
                {isThemesSubmenuOpen && (
                  <div className="submenu-safe-triangle-overlay">
                    <svg className="submenu-safe-triangle-polygon" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <polygon points="0,0 100,0 50,100" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Center Viewport Mode Switcher */}
      <div 
        className="topbar-viewport-mode" 
        style={{ 
          position: 'absolute', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px' 
        }}
      >
        <span className="strip-viewport-label" style={{ fontSize: '0.68rem' }}>VIEWPORT:</span>
        <div className="segmented-switch" role="group" aria-label="Update Mode">
          <Tooltip text="Precise Mode: Full-resolution render on every change" side="bottom">
            <button
              className={`switch-btn ${updateMode === 'precise' ? 'active' : ''}`}
              onClick={() => setUpdateMode('precise')}
              style={{ padding: '0 8px', fontSize: '0.68rem' }}
            >
              Precise
            </button>
          </Tooltip>
          <Tooltip text="Live Mode: Responsive fast proxy during slider drags, full on release" side="bottom">
            <button
              className={`switch-btn ${updateMode === 'live' ? 'active' : ''}`}
              onClick={() => setUpdateMode('live')}
              style={{ padding: '0 8px', fontSize: '0.68rem' }}
            >
              Live
            </button>
          </Tooltip>
          <Tooltip text="Settle Mode: Debounces slider movements (180ms), full-res on idle" side="bottom">
            <button
              className={`switch-btn ${updateMode === 'settle' ? 'active' : ''}`}
              onClick={() => setUpdateMode('settle')}
              style={{ padding: '0 8px', fontSize: '0.68rem' }}
            >
              Settle
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Top Bar Controls: Status info + Viewport toggles (Compare / Grid) */}
      <div className="top-right-controls">
        <div className="strip-status" style={{ marginRight: '4px' }}>
          <span>{imageWidth > 0 ? `${imageWidth}×${imageHeight}` : 'Ready'}</span>
          <span className="dot-sep">•</span>
          <span>{lastRenderMs > 0 ? `${lastRenderMs.toFixed(1)}ms` : '<1ms'}</span>
        </div>

        <Tooltip text="Toggle Split-Screen Compare View (Key: \)" side="bottom">
          <button 
            className={`tool-icon-btn ${showBeforeAfter ? 'active' : ''}`} 
            onClick={toggleBeforeAfter}
          >
            <Columns size={13} /> Compare
          </button>
        </Tooltip>

        <Tooltip text="Pixel-grid overlay (Phase 7)" side="bottom">
          <button 
            className="tool-icon-btn" 
            disabled={true}
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
            <Grid size={13} /> Grid
          </button>
        </Tooltip>

        <Tooltip text="Settings" side="bottom">
          <button 
            className="tool-icon-btn topbar-settings-btn" 
            onClick={onOpenSettings}
            style={{ height: '22px', width: '24px', padding: 0, justifyContent: 'center' }}
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>
        </Tooltip>
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </header>
  );
};

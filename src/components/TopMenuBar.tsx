import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Dropdown } from './common/Dropdown';
import { Tooltip } from './common/Tooltip';
import { useAppStore } from '../state/useAppStore';
import { ExportModal } from './dialogs/ExportModal';
import { AboutModal } from './dialogs/AboutModal';
import { ShortcutsModal } from './dialogs/ShortcutsModal';
// @ts-ignore
import { copyCanvasToClipboard } from '../dither-engine/exporters.js';
import { 
  FolderOpen, 
  Sparkles, 
  Copy,
  Download, 
  RotateCcw, 
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  ChevronRight,
  Keyboard,
  BookOpen,
  Info,
  Settings
} from 'lucide-react';

interface TopMenuBarProps {
  onOpenManual: () => void;
  onOpenSettings?: () => void;
}

type MenuType = 'file' | 'edit' | 'view' | 'help' | null;

const THEMES = [
  { id: 'dark_pro', label: 'Dark Pro' },
  { id: 'crt_green', label: 'CRT Phosphor' },
  { id: 'cyberpunk_neon', label: 'Cyberpunk Neon' },
  { id: 'gameboy_olive', label: 'GameBoy Olive' },
  { id: 'retro_mac', label: 'Retro Mac OS' },
  { id: 'vaporwave_pink', label: 'Vaporwave' },
];

export const TopMenuBar: React.FC<TopMenuBarProps> = ({ onOpenManual, onOpenSettings }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isThemesSubmenuOpen, setIsThemesSubmenuOpen] = useState<boolean>(false);

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Trigger refs for focus management
  const fileBtnRef = useRef<HTMLButtonElement | null>(null);
  const editBtnRef = useRef<HTMLButtonElement | null>(null);
  const viewBtnRef = useRef<HTMLButtonElement | null>(null);
  const helpBtnRef = useRef<HTMLButtonElement | null>(null);

  const activeTheme = useAppStore((state) => state.activeTheme);
  const setActiveTheme = useAppStore((state) => state.setActiveTheme);
  const isFullScreen = useAppStore((state) => state.isFullScreen);
  const toggleFullScreen = useAppStore((state) => state.toggleFullScreen);

  const loadImageFromData = useAppStore((state) => state.loadImageFromData);
  const loadSampleImage = useAppStore((state) => state.loadSampleImage);
  const clearImage = useAppStore((state) => state.clearImage);
  const resetAll = useAppStore((state) => state.resetAll);
  const resetCurrentAlgoParams = useAppStore((state) => state.resetCurrentAlgoParams);
  const fitToViewport = useAppStore((state) => state.fitToViewport);
  const resetZoom = useAppStore((state) => state.resetZoom);
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const toggleBeforeAfter = useAppStore((state) => state.toggleBeforeAfter);

  const setBrightness = useAppStore((state) => state.setBrightness);
  const setContrast = useAppStore((state) => state.setContrast);
  const setSaturation = useAppStore((state) => state.setSaturation);
  const setGamma = useAppStore((state) => state.setGamma);
  const setDepth = useAppStore((state) => state.setDepth);

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
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setGamma(1.0);
    setDepth(8);
  }, [setBrightness, setContrast, setSaturation, setGamma, setDepth]);

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
  const menusOrder: MenuType[] = ['file', 'edit', 'view', 'help'];

  // Global keyboard shortcuts (Alt+F/E/V/H, Ctrl+O, Ctrl+C, Ctrl+E, Ctrl+=/-, 0, 1, \)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

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
        if (e.key.toLowerCase() === 'h') {
          e.preventDefault();
          setActiveMenu((curr) => (curr === 'help' ? null : 'help'));
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
          else if (closedMenu === 'help') helpBtnRef.current?.focus();
          return;
        }
      }

      // If an input is focused, don't trigger canvas shortcuts
      if (isInput) return;

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
      case 'help': return 3;
      default: return 0;
    }
  };

  const triggerMenuItem = (menu: MenuType, index: number) => {
    if (menu === 'file') {
      if (index === 0) { handleOpenFileDialog(); setActiveMenu(null); }
      else if (index === 1) { loadSampleImage(); setActiveMenu(null); }
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
    } else if (menu === 'help') {
      if (index === 0) { setIsShortcutsOpen(true); setActiveMenu(null); }
      else if (index === 1) { onOpenManual(); setActiveMenu(null); }
      else if (index === 2) { setIsAboutOpen(true); setActiveMenu(null); }
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
        const ctx = offscreen.getContext('2d')!;
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
                onClick={() => { loadSampleImage(); setActiveMenu(null); }}
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
              <Tooltip text="Coming in 7.3" side="right" style={{ width: '100%' }}>
                <button 
                  className={`dropdown-menu-item ${focusedIndex === 0 ? 'focused' : ''}`}
                  disabled
                  role="menuitem"
                >
                  <span>Undo</span>
                  <span className="menu-shortcut">Ctrl+Z</span>
                </button>
              </Tooltip>

              <Tooltip text="Coming in 7.3" side="right" style={{ width: '100%' }}>
                <button 
                  className={`dropdown-menu-item ${focusedIndex === 1 ? 'focused' : ''}`}
                  disabled
                  role="menuitem"
                >
                  <span>Redo</span>
                  <span className="menu-shortcut">Ctrl+Y</span>
                </button>
              </Tooltip>

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
                onMouseLeave={() => setIsThemesSubmenuOpen(false)}
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
              </div>
            </div>
          )}
        </div>

        {/* 4. HELP MENU */}
        <div style={{ position: 'relative' }}>
          <button 
            ref={helpBtnRef}
            className={`menu-btn ${activeMenu === 'help' ? 'active' : ''}`}
            onClick={() => toggleMenu('help')}
            onMouseEnter={() => handleMenuTriggerHover('help')}
            onKeyDown={(e) => handleMenuKeyDown(e, 'help')}
            aria-haspopup="menu"
            aria-expanded={activeMenu === 'help'}
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <div 
              className="dropdown-menu-popover" 
              role="menu"
              tabIndex={-1}
              onKeyDown={(e) => handleMenuKeyDown(e, 'help')}
            >
              <button 
                className={`dropdown-menu-item ${focusedIndex === 0 ? 'focused' : ''}`}
                onClick={() => { setIsShortcutsOpen(true); setActiveMenu(null); }}
                onMouseEnter={() => setFocusedIndex(0)}
                role="menuitem"
              >
                <Keyboard size={13} />
                <span>Keyboard Shortcuts</span>
              </button>

              <button 
                className={`dropdown-menu-item ${focusedIndex === 1 ? 'focused' : ''}`}
                onClick={() => { onOpenManual(); setActiveMenu(null); }}
                onMouseEnter={() => setFocusedIndex(1)}
                role="menuitem"
              >
                <BookOpen size={13} />
                <span>Algorithm Reference</span>
              </button>

              <div className="dropdown-divider" />

              <button 
                className={`dropdown-menu-item ${focusedIndex === 2 ? 'focused' : ''}`}
                onClick={() => { setIsAboutOpen(true); setActiveMenu(null); }}
                onMouseEnter={() => setFocusedIndex(2)}
                role="menuitem"
              >
                <Info size={13} />
                <span>About DitherForge</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Far-Right Compact Cluster: Theme selector + Fullscreen */}
      <div className="top-right-controls">
        <Dropdown
          className="theme-dropdown-compact"
          width={160}
          value={activeTheme}
          onChange={(newTheme) => setActiveTheme(newTheme)}
          items={[
            { id: 'dark_pro', label: 'Dark Pro' },
            { id: 'crt_green', label: 'CRT Phosphor' },
            { id: 'cyberpunk_neon', label: 'Cyberpunk Neon' },
            { id: 'gameboy_olive', label: 'GameBoy Olive' },
            { id: 'retro_mac', label: 'Retro Mac OS' },
            { id: 'vaporwave_pink', label: 'Vaporwave' },
          ]}
        />

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

        <Tooltip text={isFullScreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"} side="bottom">
          <button 
            className="tool-icon-btn" 
            onClick={toggleFullScreen}
            style={{ height: '22px', width: '24px', padding: 0, justifyContent: 'center' }}
          >
            {isFullScreen ? <Minimize size={12} /> : <Maximize size={12} />}
          </button>
        </Tooltip>
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </header>
  );
};

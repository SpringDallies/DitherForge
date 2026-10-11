import React, { useRef, useState, useEffect } from 'react';
import { Logo } from './common/Logo';
import { Dropdown } from './common/Dropdown';
import { Tooltip } from './common/Tooltip';
import { useAppStore } from '../state/useAppStore';
import { 
  FolderOpen, 
  Sparkles, 
  Download, 
  RotateCcw, 
  Maximize,
  Minimize
} from 'lucide-react';

interface TopMenuBarProps {
  onOpenManual: () => void;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({ onOpenManual }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const activeTheme = useAppStore((state) => state.activeTheme);
  const setActiveTheme = useAppStore((state) => state.setActiveTheme);
  const isFullScreen = useAppStore((state) => state.isFullScreen);
  const toggleFullScreen = useAppStore((state) => state.toggleFullScreen);

  const loadImageFromData = useAppStore((state) => state.loadImageFromData);
  const loadSampleImage = useAppStore((state) => state.loadSampleImage);
  const clearImage = useAppStore((state) => state.clearImage);
  const resetAll = useAppStore((state) => state.resetAll);
  const fitToViewport = useAppStore((state) => state.fitToViewport);
  const resetZoom = useAppStore((state) => state.resetZoom);

  // Close open dropdown menus on click outside
  useEffect(() => {
    const handleWindowClick = () => {
      setActiveMenu(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
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

  const handleFit = () => {
    const canvasArea = document.querySelector('.canvas-area');
    if (canvasArea) {
      fitToViewport(canvasArea.clientWidth, canvasArea.clientHeight);
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

      <div className="brand-section">
        <Logo variant="mark" size={20} />
      </div>

      <nav className="menu-dropdowns" onClick={(e) => e.stopPropagation()}>
        {/* File Menu */}
        <div style={{ position: 'relative' }}>
          <Tooltip text="File operations" side="bottom">
            <button 
              className={`menu-btn ${activeMenu === 'file' ? 'active' : ''}`}
              onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
            >
              File
            </button>
          </Tooltip>
          {activeMenu === 'file' && (
            <div className="dropdown-menu-popover">
              <button 
                className="dropdown-menu-item"
                onClick={() => {
                  handleOpenFileDialog();
                  setActiveMenu(null);
                }}
              >
                <FolderOpen size={13} /> Open Image... <span className="menu-shortcut">Ctrl+O</span>
              </button>
              <button 
                className="dropdown-menu-item"
                onClick={() => {
                  loadSampleImage();
                  setActiveMenu(null);
                }}
              >
                <Sparkles size={13} /> Load Calibration Pattern
              </button>
              <div className="dropdown-divider" />
              <button 
                className="dropdown-menu-item"
                onClick={() => {
                  clearImage();
                  setActiveMenu(null);
                }}
              >
                Close Image
              </button>
              <div className="dropdown-divider" />
              <Tooltip text="Coming in Phase 7" side="right" style={{ width: '100%' }}>
                <button 
                  className="dropdown-menu-item"
                  disabled
                  style={{ width: '100%' }}
                >
                  <Download size={13} /> Export Image... <span className="menu-shortcut">Phase 7</span>
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div style={{ position: 'relative' }}>
          <Tooltip text="Edit operations" side="bottom">
            <button 
              className={`menu-btn ${activeMenu === 'edit' ? 'active' : ''}`}
              onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
            >
              Edit
            </button>
          </Tooltip>
          {activeMenu === 'edit' && (
            <div className="dropdown-menu-popover">
              <Tooltip text="Coming in Phase 6" side="right" style={{ width: '100%' }}>
                <button 
                  className="dropdown-menu-item"
                  disabled
                  style={{ width: '100%' }}
                >
                  Undo <span className="menu-shortcut">Ctrl+Z</span>
                </button>
              </Tooltip>
              <Tooltip text="Coming in Phase 6" side="right" style={{ width: '100%' }}>
                <button 
                  className="dropdown-menu-item"
                  disabled
                  style={{ width: '100%' }}
                >
                  Redo <span className="menu-shortcut">Ctrl+Y</span>
                </button>
              </Tooltip>
              <div className="dropdown-divider" />
              <button 
                className="dropdown-menu-item"
                onClick={() => {
                  resetAll();
                  setActiveMenu(null);
                }}
              >
                <RotateCcw size={13} /> Reset All Parameters
              </button>
            </div>
          )}
        </div>

        {/* View Menu */}
        <div style={{ position: 'relative' }}>
          <Tooltip text="View options" side="bottom">
            <button 
              className={`menu-btn ${activeMenu === 'view' ? 'active' : ''}`}
              onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
            >
              View
            </button>
          </Tooltip>
          {activeMenu === 'view' && (
            <div className="dropdown-menu-popover">
              <button 
                className="dropdown-menu-item"
                onClick={() => {
                  handleFit();
                  setActiveMenu(null);
                }}
              >
                Fit to Viewport <span className="menu-shortcut">0</span>
              </button>
              <button 
                className="dropdown-menu-item"
                onClick={() => {
                  resetZoom();
                  setActiveMenu(null);
                }}
              >
                1:1 Native Scale <span className="menu-shortcut">1</span>
              </button>
              <div className="dropdown-divider" />
              <button 
                className="dropdown-menu-item"
                onClick={() => {
                  toggleFullScreen();
                  setActiveMenu(null);
                }}
              >
                Toggle Fullscreen <span className="menu-shortcut">F11</span>
              </button>
            </div>
          )}
        </div>

        {/* Help Menu */}
        <Tooltip text="Algorithm Reference Manual" side="bottom">
          <button 
            className="menu-btn" 
            onClick={onOpenManual}
          >
            Help
          </button>
        </Tooltip>
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
    </header>
  );
};

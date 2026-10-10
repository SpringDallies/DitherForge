import React, { useRef, useState, useEffect } from 'react';
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
  const resetAll = useAppStore((state) => state.resetAll);
  const loadSampleImage = useAppStore((state) => state.loadSampleImage);
  const loadImageFromData = useAppStore((state) => state.loadImageFromData);
  const clearImage = useAppStore((state) => state.clearImage);
  const fitToViewport = useAppStore((state) => state.fitToViewport);
  const resetZoom = useAppStore((state) => state.resetZoom);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
        loadImageFromData(imgData, file.name);
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
    } else {
      fitToViewport(window.innerWidth - 400, window.innerHeight - 100);
    }
  };

  return (
    <header className="top-menu-bar">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/png, image/jpeg, image/webp, image/gif, image/bmp" 
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Left-aligned plain-text menus only */}
      <nav className="menu-dropdowns" onClick={(e) => e.stopPropagation()}>
        {/* File Menu */}
        <div style={{ position: 'relative' }}>
          <button 
            className={`menu-btn ${activeMenu === 'file' ? 'active' : ''}`}
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
            title="File operations"
          >
            File
          </button>
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
              <button 
                className="dropdown-menu-item"
                disabled
                title="Coming in Phase 7"
              >
                <Download size={13} /> Export Image... <span className="menu-shortcut">Phase 7</span>
              </button>
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div style={{ position: 'relative' }}>
          <button 
            className={`menu-btn ${activeMenu === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
            title="Edit operations"
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div className="dropdown-menu-popover">
              <button 
                className="dropdown-menu-item"
                disabled
                title="Coming in Phase 6"
              >
                Undo <span className="menu-shortcut">Ctrl+Z</span>
              </button>
              <button 
                className="dropdown-menu-item"
                disabled
                title="Coming in Phase 6"
              >
                Redo <span className="menu-shortcut">Ctrl+Y</span>
              </button>
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
          <button 
            className={`menu-btn ${activeMenu === 'view' ? 'active' : ''}`}
            onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
            title="View options"
          >
            View
          </button>
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
        <button 
          className="menu-btn" 
          onClick={onOpenManual} 
          title="Algorithm Reference Manual"
        >
          Help
        </button>
      </nav>

      {/* Far-Right Compact Cluster: Theme selector + Fullscreen */}
      <div className="top-right-controls">
        <select 
          className="control-select" 
          value={activeTheme} 
          onChange={(e) => setActiveTheme(e.target.value)}
          title="Switch theme design tokens"
          style={{ height: '22px', fontSize: '0.7rem' }}
        >
          <option value="dark_pro">Dark Pro</option>
          <option value="crt_green">CRT Phosphor</option>
          <option value="cyberpunk_neon">Cyberpunk Neon</option>
          <option value="gameboy_olive">GameBoy Olive</option>
          <option value="retro_mac">Retro Mac OS</option>
          <option value="vaporwave_pink">Vaporwave</option>
        </select>

        <button 
          className="tool-icon-btn" 
          onClick={toggleFullScreen}
          title={isFullScreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
          style={{ height: '22px', width: '24px', padding: 0, justifyContent: 'center' }}
        >
          {isFullScreen ? <Minimize size={12} /> : <Maximize size={12} />}
        </button>
      </div>
    </header>
  );
};

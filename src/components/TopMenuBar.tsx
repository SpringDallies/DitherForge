import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../state/useAppStore';
import { 
  FolderOpen, 
  Sparkles, 
  Download, 
  RotateCcw, 
  Palette,
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
    // Reset input value so re-selecting same file triggers change
    e.target.value = '';
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

      <div className="brand-section">
        <div className="brand-logo">
          <div className="brand-icon">▦</div>
          <span>DitherForge</span>
        </div>

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
                <div className="menu-divider" />
                <button 
                  className="dropdown-menu-item"
                  onClick={() => {
                    clearImage();
                    setActiveMenu(null);
                  }}
                >
                  Close Image
                </button>
                <div className="menu-divider" />
                <button 
                  className="dropdown-menu-item disabled"
                  title="Coming in Phase 7"
                >
                  <Download size={13} /> Export... <span className="menu-shortcut">Phase 7</span>
                </button>
              </div>
            )}
          </div>

          <button className="menu-btn" title="Undo, redo & history (Coming in Phase 6)" style={{ cursor: 'default', opacity: 0.85 }}>Edit</button>
          <button className="menu-btn" title="Curated presets (Coming in Phase 6)" style={{ cursor: 'default', opacity: 0.85 }}>Presets</button>
          <button className="menu-btn" title="Extras & timeline (Coming in Phase 6)" style={{ cursor: 'default', opacity: 0.85 }}>Extras</button>
          <button className="menu-btn" onClick={onOpenManual} title="Algorithm Reference Manual">
            Help
          </button>
        </nav>
      </div>

      <div className="quick-actions">
        <button 
          className="action-btn" 
          onClick={handleOpenFileDialog}
          title="Open source image (Ctrl+O)"
        >
          <FolderOpen size={13} /> Open
        </button>
        <button 
          className="action-btn" 
          onClick={loadSampleImage}
          title="Load built-in calibration pattern"
        >
          <Sparkles size={13} /> Sample
        </button>
        <button 
          className="action-btn primary" 
          disabled
          title="Export frame (Coming in Phase 7)"
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          <Download size={13} /> Export
        </button>
        <button className="action-btn" onClick={resetAll} title="Reset all sliders and tweaks">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <div className="top-right-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Palette size={13} style={{ color: 'var(--text-muted)' }} />
          <select 
            className="control-select" 
            value={activeTheme} 
            onChange={(e) => setActiveTheme(e.target.value)}
            title="Switch theme design tokens"
          >
            <option value="dark_pro">Dark Pro</option>
            <option value="crt_green">CRT Phosphor</option>
            <option value="cyberpunk_neon">Cyberpunk Neon</option>
            <option value="gameboy_olive">GameBoy Olive</option>
            <option value="retro_mac">Retro Mac OS</option>
            <option value="vaporwave_pink">Vaporwave</option>
          </select>
        </div>

        <button 
          className="tool-icon-btn" 
          onClick={toggleFullScreen}
          title={isFullScreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
        >
          {isFullScreen ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
      </div>
    </header>
  );
};

import React from 'react';
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
  const activeTheme = useAppStore((state) => state.activeTheme);
  const setActiveTheme = useAppStore((state) => state.setActiveTheme);
  const isFullScreen = useAppStore((state) => state.isFullScreen);
  const toggleFullScreen = useAppStore((state) => state.toggleFullScreen);
  const resetAll = useAppStore((state) => state.resetAll);

  return (
    <header className="top-menu-bar">
      <div className="brand-section">
        <div className="brand-logo">
          <div className="brand-icon">▦</div>
          <span>DitherForge</span>
        </div>

        <nav className="menu-dropdowns">
          <button className="menu-btn" title="File operations (Coming in Phase 6)" style={{ cursor: 'default', opacity: 0.85 }}>File</button>
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
          disabled
          title="Open source image (Coming in Phase 2)"
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          <FolderOpen size={13} /> Open
        </button>
        <button 
          className="action-btn" 
          onClick={resetAll}
          title="Reload built-in sample test pattern"
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

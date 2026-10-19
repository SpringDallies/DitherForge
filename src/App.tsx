import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles/shell.css';
import './styles/logo.css';
import './styles/loading.css';
import { useAppStore } from './state/useAppStore';
import { TopMenuBar } from './components/TopMenuBar';
import { CenterViewport } from './components/CenterViewport';
import { RightSidebar } from './components/layout/RightSidebar';
import { AlgorithmReferenceModal } from './components/AlgorithmReferenceModal';
import { Tooltip } from './components/common/Tooltip';
import './styles/preferences.css';
import { SettingsDialog, getStoredSettings } from './components/dialogs/SettingsDialog';

export const App: React.FC = () => {
  const activeTheme = useAppStore((state) => state.activeTheme);
  const isFullScreen = useAppStore((state) => state.isFullScreen);
  const toggleFullScreen = useAppStore((state) => state.toggleFullScreen);
  const isManualOpen = useAppStore((state) => state.isManualOpen);
  const setIsManualOpen = useAppStore((state) => state.setIsManualOpen);
  const setSidebarWidth = useAppStore((state) => state.setSidebarWidth);
  const isSidebarCollapsed = useAppStore((state) => state.isSidebarCollapsed);

  const [isPeekOpen, setIsPeekOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('settings') === 'true');

  // Seed default update mode from settings if update_mode is unset in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ditherforge_update_mode');
      if (!stored) {
        const settings = getStoredSettings();
        if (settings.defaultUpdateMode) {
          useAppStore.getState().setUpdateMode(settings.defaultUpdateMode);
        }
      }
    } catch {}
  }, []);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const peekTimerRef = useRef<number | null>(null);

  // App boot: dismiss static boot-loader once fonts are ready & painted
  useEffect(() => {
    let active = true;
    let raf2: number | null = null;
    const finishBoot = () => {
      if (active) {
        const loader = document.getElementById('boot-loader');
        if (loader) loader.remove();
      }
    };

    // Remove boot-loader as soon as React mounts and paints the first frame
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(finishBoot);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(finishBoot).catch(finishBoot);
    }

    return () => {
      active = false;
      cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
    };
  }, []);

  // Sync theme with document root & body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    document.body.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  // Bind F11 to Full-Screen toggle (Requirement #3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullScreen();
      }
      if (e.key === 'Escape' && isFullScreen) {
        toggleFullScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, toggleFullScreen]);

  // Draggable Splitter mouse handlers (Requirement #4)
  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  }, []);

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter, setSidebarWidth]);

  // Edge-peek logic in full-screen mode
  const handleMouseEnterPeek = () => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    setIsPeekOpen(true);
  };

  const handleMouseLeavePeek = () => {
    peekTimerRef.current = window.setTimeout(() => {
      setIsPeekOpen(false);
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    };
  }, []);

  return (
    <div
      className={`app-container ${isFullScreen ? 'fullscreen' : ''} ${isPeekOpen ? 'peek-open' : ''}`}
      data-theme={activeTheme}
    >
      {/* Full-screen Edge-Peek Zone */}
      {isFullScreen && (
        <div
          className="fullscreen-peek-zone"
          onMouseEnter={handleMouseEnterPeek}
          onMouseLeave={handleMouseLeavePeek}
        >
          {!isPeekOpen && (
            <div className="fullscreen-peek-tab" onClick={() => setIsPeekOpen(true)}>
              MENU  
            </div>
          )}
        </div>
      )}

      {/* Top Menu Bar */}
      <div onMouseEnter={handleMouseEnterPeek} onMouseLeave={handleMouseLeavePeek}>
        <TopMenuBar 
          onOpenManual={() => setIsManualOpen(true)} 
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      {/* Main Workspace Layout */}
      <div className="workspace-container">
        {/* Viewport (takes remaining width, canvas centered) */}
        <CenterViewport />

        {/* 4px Draggable Splitter */}
        {!isSidebarCollapsed && (
          <Tooltip text="Drag to resize sidebar (persisted)">
            <div
              className={`splitter ${isDraggingSplitter ? 'dragging' : ''}`}
              onMouseDown={handleSplitterMouseDown}
            />
          </Tooltip>
        )}

        {/* Single Right Panel (Algorithm, Adjustments, Palette, Effects Stack) */}
        <RightSidebar />
      </div>

      {/* Algorithm Reference Manual Modal */}
      <AlgorithmReferenceModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      {/* Preferences / Settings Modal */}
      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

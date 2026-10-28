import React, { useState, useEffect, useRef } from 'react';
import './styles/shell.css';
import './styles/logo.css';
import './styles/loading.css';
import { useAppStore } from './state/useAppStore';
import { TopMenuBar } from './components/TopMenuBar';
import { CenterViewport } from './components/CenterViewport';
import { RightSidebar } from './components/layout/RightSidebar';
import { AlgorithmReferenceModal } from './components/AlgorithmReferenceModal';
import './styles/preferences.css';
import { SettingsDialog, getStoredSettings, applyPerformanceSettings } from './components/dialogs/SettingsDialog';

export const App: React.FC = () => {
  const activeTheme = useAppStore((state) => state.activeTheme);
  const isFullScreen = useAppStore((state) => state.isFullScreen);
  const toggleFullScreen = useAppStore((state) => state.toggleFullScreen);
  const isManualOpen = useAppStore((state) => state.isManualOpen);
  const setIsManualOpen = useAppStore((state) => state.setIsManualOpen);
  const sidebarWidth = useAppStore((state) => state.sidebarWidth);

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
  const peekTimerRef = useRef<number | null>(null);

  // App boot: dismiss boot-loader only after everything is fully loaded
  useEffect(() => {
    let active = true;
    let cleanupDone = false;

    const finishBoot = () => {
      if (active && !cleanupDone) {
        cleanupDone = true;
        const loader = document.getElementById('boot-loader');
        if (loader) loader.remove();
      }
    };

    const checkAllLoaded = () => {
          // Wait for fonts
          const fontsReady = document.fonts?.ready ? document.fonts.ready : Promise.resolve();

          // Wait for all images in the document to load
          const images = Array.from(document.images);
          const imagesLoaded = Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.onload = img.onerror = resolve;
            });
          }));

          // Wait for next paint after everything else
          const nextPaint = new Promise(resolve => requestAnimationFrame(resolve));

          Promise.all([fontsReady, imagesLoaded, nextPaint])
            .then(finishBoot)
            .catch(finishBoot);
        };

    // Start checking after React has mounted and painted
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(checkAllLoaded);
    });

    return () => {
      active = false;
      cancelAnimationFrame(raf1);
    };
  }, []);

  // Sync theme with document root & body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    document.body.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  // Sync performance settings (glass blur & shadows) with document root
  useEffect(() => {
    applyPerformanceSettings(getStoredSettings());

    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        applyPerformanceSettings(customEvent.detail);
      }
    };
    window.addEventListener('ditherforge_settings_changed', handleSettingsChanged);
    return () => window.removeEventListener('ditherforge_settings_changed', handleSettingsChanged);
  }, []);

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
      <div 
        className="workspace-container"
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      >
        {/* Viewport (takes remaining width, canvas centered) */}
        <CenterViewport />

        {/* Single Right Floating Card (Algorithm, Adjustments, Palette, Effects Stack) */}
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

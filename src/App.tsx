import React, { useState, useEffect, useRef } from 'react';
import './styles/shell.css';
import './styles/logo.css';
import './styles/loading.css';
import { useAppStore } from './state/useAppStore';
import { TopMenuBar } from './components/TopMenuBar';
import { CenterViewport } from './components/CenterViewport';
import { RightSidebar } from './components/layout/RightSidebar';
import { AppContextMenu } from './components/AppContextMenu';
import { AlgorithmReferenceModal } from './components/AlgorithmReferenceModal';
import './styles/preferences.css';
import { SettingsDialog, getStoredSettings, applyPerformanceSettings } from './components/dialogs/SettingsDialog';
import { FfmpegInstallModal } from './components/dialogs/FfmpegInstallModal';
import { ffmpegService } from './services/ffmpegService';
import { EngineBridge } from './services/EngineBridge';

export const App: React.FC = () => {
  const activeTheme = useAppStore((state) => state.activeTheme);
  const isFullScreen = useAppStore((state) => state.isFullScreen);
  const toggleFullScreen = useAppStore((state) => state.toggleFullScreen);
  const isManualOpen = useAppStore((state) => state.isManualOpen);
  const setIsManualOpen = useAppStore((state) => state.setIsManualOpen);
  const sidebarWidth = useAppStore((state) => state.sidebarWidth);
  const appMode = useAppStore((state) => state.appMode);
  const isFfmpegModalOpen = useAppStore((state) => state.isFfmpegModalOpen);
  const setIsFfmpegModalOpen = useAppStore((state) => state.setIsFfmpegModalOpen);
  const ffmpegStatus = useAppStore((state) => state.ffmpegStatus);
  const setFfmpegStatus = useAppStore((state) => state.setFfmpegStatus);
  const setActiveBackend = useAppStore((state) => state.setActiveBackend);
  const setBackendError = useAppStore((state) => state.setBackendError);

  // Proactively probe Rust IPC on startup so the first real render isn't also
  // the first IPC probe. Stored in Zustand so the UI can show a fallback chip.
  useEffect(() => {
    if (!EngineBridge.isTauri()) {
      setActiveBackend('js');
      setBackendError(null);
      return;
    }
    EngineBridge.isRustAvailable()
      .then((ok) => {
        setActiveBackend(ok ? 'rust' : 'js');
        if (!ok) setBackendError('Rust IPC probe failed');
      })
      .catch((err) => {
        setActiveBackend('js');
        setBackendError(String(err ?? 'Rust IPC probe error'));
      });
  }, []);

  // Proactively query FFmpeg status on startup in Tauri desktop mode
  useEffect(() => {
    if (ffmpegService.isTauri()) {
      ffmpegService.getStatus().then((status) => {
        setFfmpegStatus(status);
      });
    }
  }, []);

  // When switching to Animation Mode:
  // 1. Check whether FFmpeg is installed and executable via `check_ffmpeg_status`.
  // 2. If available, initialize native video pipeline.
  // 3. If missing, display in-app installation prompt.
  useEffect(() => {
    if (appMode !== 'animation') return;
    if (ffmpegService.isTauri()) {
      ffmpegService.getStatus().then((status) => {
        setFfmpegStatus(status);
        if (!status.ffmpeg_available) {
          setIsFfmpegModalOpen(true);
        }
      });
    }
  }, [appMode]);

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
        const w = window as any;
        const invokeFn = w.__TAURI_INTERNALS__?.invoke || w.__TAURI__?.core?.invoke;
        if (typeof invokeFn === 'function') {
          invokeFn('show_main_window').catch(() => {});
        }
        const loader = document.getElementById('boot-loader');
        if (loader) {
          loader.style.transition = 'opacity 120ms ease-out';
          loader.style.opacity = '0';
          setTimeout(() => loader.remove(), 130);
        }
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

    // Safety timeout: dismiss boot-loader even if external resources hang
    const safetyTimer = setTimeout(finishBoot, 1000);

    // Start checking after React has mounted and painted
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(checkAllLoaded);
    });

    return () => {
      active = false;
      clearTimeout(safetyTimer);
      cancelAnimationFrame(raf1);
    };
  }, []);

  // Sync theme with document root & body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    document.body.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  // Detect platform for CSS targeting (Linux disables glass blur)
  useEffect(() => {
    const platform = typeof navigator !== 'undefined' ? navigator.platform : '';
    if (/linux/i.test(platform)) {
      document.documentElement.setAttribute('data-platform', 'linux');
    } else if (/win/i.test(platform)) {
      document.documentElement.setAttribute('data-platform', 'windows');
    } else if (/mac/i.test(platform)) {
      document.documentElement.setAttribute('data-platform', 'macos');
    }
  }, []);

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

  // Global Clipboard Image Paste Handler (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target?.tagName) || target?.isContentEditable) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
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
                useAppStore.getState().loadImageFromData(imgData, file.name || 'Pasted Image');
                const canvasArea = document.querySelector('.canvas-area');
                const sWidth = useAppStore.getState().sidebarWidth;
                if (canvasArea) {
                  useAppStore.getState().fitToViewport(canvasArea.clientWidth - (sWidth + 14), canvasArea.clientHeight - 38);
                }
              };
              img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
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
      <div 
        className="topbar-wrapper"
        onMouseEnter={handleMouseEnterPeek} 
        onMouseLeave={handleMouseLeavePeek}
      >
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

      {/* FFmpeg Video Engine Installation / Status Modal */}
      <FfmpegInstallModal
        isOpen={isFfmpegModalOpen}
        onClose={() => setIsFfmpegModalOpen(false)}
        status={ffmpegStatus}
        onRefresh={async () => {
          const s = await ffmpegService.getStatus(true);
          setFfmpegStatus(s);
        }}
      />

      {/* Global Application Right-Click Context Menu */}
      <AppContextMenu
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenManual={() => setIsManualOpen(true)}
      />
    </div>
  );
};

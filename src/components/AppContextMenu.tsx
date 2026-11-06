import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../state/useAppStore';
// @ts-ignore
import { copyCanvasToClipboard } from '../dither-engine/exporters.js';
import { getExportCanvas } from '../utils/animationExport';
import {
  Copy,
  Clipboard,
  FolderOpen,
  Download,
  Sparkles,
  Maximize2,
  ZoomIn,
  MoveHorizontal,
  RotateCcw,
  RefreshCw,
  Play,
  Pause,
  Plus,
  SkipBack,
  SkipForward,
  Settings,
  BookOpen,
  Check,
  Trash2,
  Sliders,
  Undo,
  Redo
} from 'lucide-react';

export interface AppContextMenuProps {
  onOpenSettings?: () => void;
  onOpenManual?: () => void;
}

export const AppContextMenu: React.FC<AppContextMenuProps> = ({
  onOpenSettings,
  onOpenManual
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const appMode = useAppStore((s) => s.appMode);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const togglePlay = useAppStore((s) => s.togglePlay);
  const duration = useAppStore((s) => s.duration);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const addAnimationTrack = useAppStore((s) => s.addAnimationTrack);
  const canUndo = useAppStore((s) => s.canUndo);
  const canRedo = useAppStore((s) => s.canRedo);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const showBeforeAfter = useAppStore((s) => s.showBeforeAfter);
  const toggleBeforeAfter = useAppStore((s) => s.toggleBeforeAfter);
  const fitToViewport = useAppStore((s) => s.fitToViewport);
  const resetZoom = useAppStore((s) => s.resetZoom);
  const resetAllAdjustments = useAppStore((s) => s.resetAllAdjustments);
  const resetCurrentAlgoParams = useAppStore((s) => s.resetCurrentAlgoParams);
  const resetAll = useAppStore((s) => s.resetAll);
  const loadSampleImage = useAppStore((s) => s.loadSampleImage);
  const loadImageFromData = useAppStore((s) => s.loadImageFromData);
  const setIsExportOpen = useAppStore((s) => s.setIsExportOpen);
  const setIsManualOpen = useAppStore((s) => s.setIsManualOpen);
  const [contextType, setContextType] = useState<'app' | 'timeline'>('app');
  const selectedTrackId = useAppStore((s) => s.selectedTrackId);
  const setSelectedTrackId = useAppStore((s) => s.setSelectedTrackId);
  const animationTracks = useAppStore((s) => s.animationTracks);
  const duplicateAnimationTrack = useAppStore((s) => s.duplicateAnimationTrack);
  const removeAnimationTrack = useAppStore((s) => s.removeAnimationTrack);
  const stepFrame = useAppStore((s) => s.stepFrame);
  const setIsCreateAnimationPopupOpen = useAppStore((s) => s.setIsCreateAnimationPopupOpen);

  const selectedTrack = animationTracks.find((t) => t.id === selectedTrackId);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Listen for contextmenu across the application
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // If already handled/prevented, do not open application context menu
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // Allow native browser menu inside editable text inputs
      if (
        ['INPUT', 'TEXTAREA'].includes(target.tagName) ||
        target.isContentEditable ||
        target.closest('input, textarea, [contenteditable="true"]')
      ) {
        return;
      }

      // If inside property editor popup or track context menu, ignore
      if (
        target.closest('.df-floating-property-editor')
      ) {
        return;
      }

      const isTimelineClick = Boolean(
        target.closest('.df-floating-timeline-group') ||
        target.closest('.df-timeline-body-card') ||
        target.closest('.df-playback-pill') ||
        target.closest('.df-playback-plus-btn') ||
        target.closest('.df-timeline-coord-stage') ||
        target.closest('.df-tracks-lanes') ||
        target.closest('.df-track-lane') ||
        target.closest('.df-track-bar')
      );

      e.preventDefault();

      // Close any open track context menu in timeline
      window.dispatchEvent(new CustomEvent('close_track_context_menu'));

      const menuWidth = 250;
      const isAnim = useAppStore.getState().appMode === 'animation';
      const approxHeight = isTimelineClick ? 360 : (isAnim ? 480 : 360);

      const clampedX = Math.max(10, Math.min(window.innerWidth - menuWidth - 12, e.clientX));
      const clampedY = Math.max(10, Math.min(window.innerHeight - approxHeight - 12, e.clientY));

      setContextType(isTimelineClick ? 'timeline' : 'app');
      setPosition({ x: clampedX, y: clampedY });
      setIsOpen(true);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Listen to close requests from timeline track context menu
  useEffect(() => {
    const handleCloseAppMenu = () => setIsOpen(false);
    window.addEventListener('close_app_context_menu', handleCloseAppMenu);
    return () => window.removeEventListener('close_app_context_menu', handleCloseAppMenu);
  }, []);

  // Close on outside mousedown or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', closeMenu);
    };
  }, [isOpen, closeMenu]);

  // Actions
  const handleCopyResult = useCallback(() => {
    const canvas = getExportCanvas();
    if (canvas) {
      copyCanvasToClipboard(canvas)
        .then(() => {
          setCopiedFeedback(true);
          setTimeout(() => {
            setCopiedFeedback(false);
            closeMenu();
          }, 450);
        })
        .catch((err: any) => {
          console.warn('Copy to clipboard failed:', err);
          closeMenu();
        });
    } else {
      closeMenu();
    }
  }, [closeMenu]);

  const handlePasteImage = useCallback(async () => {
    closeMenu();
    try {
      if (!navigator.clipboard?.read) return;
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
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
                loadImageFromData(imgData, 'Pasted Image');
                const canvasArea = document.querySelector('.canvas-area');
                const sWidth = useAppStore.getState().sidebarWidth;
                if (canvasArea) {
                  fitToViewport(canvasArea.clientWidth - (sWidth + 14), canvasArea.clientHeight - 38);
                }
              };
              img.src = event.target?.result as string;
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Paste failed:', err);
    }
  }, [closeMenu, loadImageFromData, fitToViewport]);

  const handleOpenFile = useCallback(() => {
    closeMenu();
    fileInputRef.current?.click();
  }, [closeMenu]);

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
        const sWidth = useAppStore.getState().sidebarWidth;
        if (canvasArea) {
          fitToViewport(canvasArea.clientWidth - (sWidth + 14), canvasArea.clientHeight - 38);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFit = useCallback(() => {
    closeMenu();
    const canvasArea = document.querySelector('.canvas-area');
    const sWidth = useAppStore.getState().sidebarWidth;
    if (canvasArea) {
      fitToViewport(canvasArea.clientWidth - (sWidth + 14), canvasArea.clientHeight - 38);
    } else {
      fitToViewport(window.innerWidth - (sWidth + 14), window.innerHeight - 38);
    }
  }, [closeMenu, fitToViewport]);

  if (!isOpen) return null;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      <div
        ref={menuRef}
        className="df-app-context-menu"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {contextType === 'timeline' ? (
          <>
            <div className="df-app-context-section-label">Timeline</div>

            {selectedTrack && (
              <>
                <button
                  type="button"
                  className="df-app-context-item"
                  onClick={() => {
                    closeMenu();
                    duplicateAnimationTrack(selectedTrack.id);
                  }}
                >
                  <div className="df-app-context-left">
                    <Copy size={14} />
                    <span>Duplicate Track</span>
                  </div>
                  <span className="df-app-context-shortcut">Ctrl+D</span>
                </button>

                <button
                  type="button"
                  className="df-app-context-item danger"
                  onClick={() => {
                    closeMenu();
                    removeAnimationTrack(selectedTrack.id);
                    setSelectedTrackId(null);
                  }}
                >
                  <div className="df-app-context-left" style={{ color: '#fb4934' }}>
                    <Trash2 size={14} />
                    <span>Delete Track</span>
                  </div>
                  <span className="df-app-context-shortcut">Del</span>
                </button>

                <div className="df-app-context-divider" />
              </>
            )}

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                togglePlay();
              }}
            >
              <div className="df-app-context-left">
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </div>
              <span className="df-app-context-shortcut">Space</span>
            </button>

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                addAnimationTrack();
              }}
            >
              <div className="df-app-context-left">
                <Plus size={14} />
                <span>Add Track</span>
              </div>
              <span className="df-app-context-shortcut">T</span>
            </button>

            <div className="df-app-context-divider" />

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                stepFrame(-1);
              }}
            >
              <div className="df-app-context-left">
                <SkipBack size={14} />
                <span>Previous Frame</span>
              </div>
              <span className="df-app-context-shortcut">Left</span>
            </button>

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                stepFrame(1);
              }}
            >
              <div className="df-app-context-left">
                <SkipForward size={14} />
                <span>Next Frame</span>
              </div>
              <span className="df-app-context-shortcut">Right</span>
            </button>

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                setCurrentTime(0);
              }}
            >
              <div className="df-app-context-left">
                <SkipBack size={14} />
                <span>Jump to Start</span>
              </div>
              <span className="df-app-context-shortcut">Home</span>
            </button>

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                setCurrentTime(duration);
              }}
            >
              <div className="df-app-context-left">
                <SkipForward size={14} />
                <span>Jump to End</span>
              </div>
              <span className="df-app-context-shortcut">End</span>
            </button>

            <div className="df-app-context-divider" />

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                setIsCreateAnimationPopupOpen(true);
              }}
            >
              <div className="df-app-context-left">
                <Sliders size={14} />
                <span>Timeline Settings (FPS & Duration)…</span>
              </div>
            </button>

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                setIsExportOpen(true);
              }}
            >
              <div className="df-app-context-left">
                <Download size={14} />
                <span>Export Animation / GIF…</span>
              </div>
              <span className="df-app-context-shortcut">Ctrl+E</span>
            </button>

            {animationTracks.length > 0 && (
              <>
                <div className="df-app-context-divider" />
                <button
                  type="button"
                  className="df-app-context-item"
                  style={{ color: '#fb4934' }}
                  onClick={() => {
                    closeMenu();
                    animationTracks.forEach((t) => removeAnimationTrack(t.id));
                    setSelectedTrackId(null);
                  }}
                >
                  <div className="df-app-context-left" style={{ color: '#fb4934' }}>
                    <Trash2 size={14} />
                    <span>Clear All Tracks</span>
                  </div>
                </button>
              </>
            )}
          </>
        ) : (
          <>
        {/* Section 1: File & Clipboard */}
        <button
          type="button"
          className="df-app-context-item"
          onClick={handleCopyResult}
        >
          <div className="df-app-context-left">
            {copiedFeedback ? <Check size={14} style={{ color: '#b8bb26' }} /> : <Copy size={14} />}
            <span>{copiedFeedback ? 'Copied to Clipboard!' : 'Copy Result'}</span>
          </div>
          <span className="df-app-context-shortcut">Ctrl+C</span>
        </button>

        <button
          type="button"
          className="df-app-context-item"
          onClick={handlePasteImage}
        >
          <div className="df-app-context-left">
            <Clipboard size={14} />
            <span>Paste Image</span>
          </div>
          <span className="df-app-context-shortcut">Ctrl+V</span>
        </button>

        <button
          type="button"
          className="df-app-context-item"
          onClick={handleOpenFile}
        >
          <div className="df-app-context-left">
            <FolderOpen size={14} />
            <span>Open Image…</span>
          </div>
          <span className="df-app-context-shortcut">Ctrl+O</span>
        </button>

        <button
          type="button"
          className="df-app-context-item"
          onClick={() => {
            closeMenu();
            setIsExportOpen(true);
          }}
        >
          <div className="df-app-context-left">
            <Download size={14} />
            <span>Export…</span>
          </div>
          <span className="df-app-context-shortcut">Ctrl+E</span>
        </button>

        <button
          type="button"
          className="df-app-context-item"
          onClick={() => {
            closeMenu();
            loadSampleImage();
          }}
        >
          <div className="df-app-context-left">
            <Sparkles size={14} />
            <span>Load Calibration Pattern</span>
          </div>
        </button>

        <div className="df-app-context-divider" />

        {/* Section 2: View Navigation */}
        <button
          type="button"
          className="df-app-context-item"
          onClick={handleFit}
        >
          <div className="df-app-context-left">
            <Maximize2 size={14} />
            <span>Fit to Viewport</span>
          </div>
          <span className="df-app-context-shortcut">0</span>
        </button>

        <button
          type="button"
          className="df-app-context-item"
          onClick={() => {
            closeMenu();
            resetZoom();
          }}
        >
          <div className="df-app-context-left">
            <ZoomIn size={14} />
            <span>Actual Size (100%)</span>
          </div>
          <span className="df-app-context-shortcut">1</span>
        </button>

        <button
          type="button"
          className="df-app-context-item"
          onClick={() => {
            closeMenu();
            toggleBeforeAfter();
          }}
        >
          <div className="df-app-context-left">
            <MoveHorizontal size={14} />
            <span>Toggle Compare</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {showBeforeAfter && <Check size={12} style={{ color: 'var(--text-main)' }} />}
            <span className="df-app-context-shortcut">\</span>
          </div>
        </button>

        <div className="df-app-context-divider" />

        {/* Section: Undo / Redo */}
        <button
          type="button"
          className="df-app-context-item"
          disabled={!canUndo}
          onClick={() => {
            closeMenu();
            undo();
          }}
        >
          <div className="df-app-context-left">
            <Undo size={14} />
            <span>Undo</span>
          </div>
          <span className="df-app-context-shortcut">Ctrl+Z</span>
        </button>

        <button
          type="button"
          className="df-app-context-item"
          disabled={!canRedo}
          onClick={() => {
            closeMenu();
            redo();
          }}
        >
          <div className="df-app-context-left">
            <Redo size={14} />
            <span>Redo</span>
          </div>
          <span className="df-app-context-shortcut">Ctrl+Shift+Z</span>
        </button>

        <div className="df-app-context-divider" />

        {/* Section 3: Reset Controls */}
        <button
          type="button"
          className="df-app-context-item"
          onClick={() => {
            closeMenu();
            resetAllAdjustments();
          }}
        >
          <div className="df-app-context-left">
            <RotateCcw size={14} />
            <span>Reset Adjustments</span>
          </div>
        </button>

        <button
          type="button"
          className="df-app-context-item"
          onClick={() => {
            closeMenu();
            resetCurrentAlgoParams();
          }}
        >
          <div className="df-app-context-left">
            <RotateCcw size={14} />
            <span>Reset Algorithm Parameters</span>
          </div>
        </button>

        <button
          type="button"
          className="df-app-context-item"
          onClick={() => {
            closeMenu();
            resetAll();
          }}
        >
          <div className="df-app-context-left">
            <RefreshCw size={14} />
            <span>Reset All</span>
          </div>
        </button>

        {/* Section 4: Animation Controls (active in animation mode) */}
        {appMode === 'animation' && (
          <>
            <div className="df-app-context-divider" />
            <div className="df-app-context-section-label">Animation</div>

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                togglePlay();
              }}
            >
              <div className="df-app-context-left">
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </div>
              <span className="df-app-context-shortcut">Space</span>
            </button>

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                addAnimationTrack();
              }}
            >
              <div className="df-app-context-left">
                <Plus size={14} />
                <span>Add Track</span>
              </div>
              <span className="df-app-context-shortcut">T</span>
            </button>

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                setCurrentTime(0);
              }}
            >
              <div className="df-app-context-left">
                <SkipBack size={14} />
                <span>Jump to Start</span>
              </div>
              <span className="df-app-context-shortcut">Home</span>
            </button>

            <button
              type="button"
              className="df-app-context-item"
              onClick={() => {
                closeMenu();
                setCurrentTime(duration);
              }}
            >
              <div className="df-app-context-left">
                <SkipForward size={14} />
                <span>Jump to End</span>
              </div>
              <span className="df-app-context-shortcut">End</span>
            </button>
          </>
        )}

        <div className="df-app-context-divider" />

        {/* Section 5: Preferences & Manual */}
        <button
          type="button"
          className="df-app-context-item"
          onClick={() => {
            closeMenu();
            if (onOpenSettings) onOpenSettings();
          }}
        >
          <div className="df-app-context-left">
            <Settings size={14} />
            <span>Preferences…</span>
          </div>
        </button>

        <button
          type="button"
          className="df-app-context-item"
          onClick={() => {
            closeMenu();
            if (onOpenManual) onOpenManual();
            else setIsManualOpen(true);
          }}
        >
          <div className="df-app-context-left">
            <BookOpen size={14} />
            <span>Algorithm Manual…</span>
          </div>
        </button>
      </>
        )}
      </div>
    </>
  );
};

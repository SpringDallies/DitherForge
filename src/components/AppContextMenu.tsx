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
  const [menuSize, setMenuSize] = useState<{ w: number; h: number } | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const justRightClickedRef = useRef(false);

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
        closeMenu();
        return;
      }

      // If inside property editor popup or track context menu, ignore
      if (
        target.closest('.df-floating-property-editor')
      ) {
        closeMenu();
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
      e.stopImmediatePropagation();
      justRightClickedRef.current = true;
      setTimeout(() => { justRightClickedRef.current = false; }, 100);

      // Close any open track context menu in timeline
      window.dispatchEvent(new CustomEvent('close_track_context_menu'));

      const menuWidth = 250;
      const isAnim = useAppStore.getState().appMode === 'animation';
      const approxHeight = isTimelineClick ? (isAnim ? 360 : 220) : (isAnim ? 480 : 220);
      const width = menuSize?.w || menuWidth;
      const height = menuSize?.h || approxHeight;
      const pad = 12;

      const clampedX = Math.max(pad, Math.min(window.innerWidth - width - pad, e.clientX));
      const clampedY = Math.max(pad, Math.min(window.innerHeight - height - pad, e.clientY));

      setContextType(isTimelineClick ? 'timeline' : 'app');
      setPosition({ x: clampedX, y: clampedY });
      setIsOpen(true);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, [closeMenu, menuSize]);

  // Measure actual menu size after it opens so clamping uses real dimensions
  // instead of hardcoded estimates. Prevents clipping against window edges,
  // especially in animation mode where the menu is taller and wider.
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    setMenuSize({ w: rect.width, h: rect.height });
  }, [isOpen]);

  // Reposition after measuring so the first open also stays in bounds
  useEffect(() => {
    if (!isOpen || !menuSize || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let nextX = position.x;
    let nextY = position.y;
    const pad = 12;

    if (rect.left < pad) nextX = pad;
    if (rect.right > window.innerWidth - pad) nextX = window.innerWidth - rect.width - pad;
    if (rect.top < pad) nextY = pad;
    if (rect.bottom > window.innerHeight - pad) nextY = window.innerHeight - rect.height - pad;

    if (nextX !== position.x || nextY !== position.y) {
      setPosition({ x: nextX, y: nextY });
    }
  }, [menuSize, isOpen, position]);

  // Listen to close requests from timeline track context menu
  useEffect(() => {
    const handleCloseAppMenu = () => setIsOpen(false);
    window.addEventListener('close_app_context_menu', handleCloseAppMenu);
    return () => window.removeEventListener('close_app_context_menu', handleCloseAppMenu);
  }, []);

  // Close on outside interaction or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideInteraction = (e: MouseEvent | PointerEvent) => {
      // Don't close on right-click; handleContextMenu will reposition the menu seamlessly
      if (e.button === 2) return;

      // Suppress the left-click event that fires right after a right-click
      if (e.type === 'click' && justRightClickedRef.current) {
        justRightClickedRef.current = false;
        e.stopImmediatePropagation();
        return;
      }

      const isInside = Boolean(
        menuRef.current &&
        e.target instanceof Node &&
        menuRef.current.contains(e.target)
      );

      if (!isInside) {
        closeMenu();
        // Stop propagation during capture phase so dismissing the context menu
        // does not inadvertently trigger canvas dragging or accidental clicks underneath.
        e.stopPropagation();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    // Use capture phase (true) so listeners fire before any child component's
    // preventDefault() or stopPropagation() can suppress event delivery.
    window.addEventListener('pointerdown', handleOutsideInteraction, true);
    window.addEventListener('mousedown', handleOutsideInteraction, true);
    window.addEventListener('click', handleOutsideInteraction, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('pointerdown', handleOutsideInteraction, true);
      window.removeEventListener('mousedown', handleOutsideInteraction, true);
      window.removeEventListener('click', handleOutsideInteraction, true);
      window.removeEventListener('keydown', handleKeyDown, true);
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
          </>
        )
      }
      </div>
    </>
  );
};

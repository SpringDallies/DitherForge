import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  useAppStore,
  AnimationCategory,
  EasingMode,
  ANIMATABLE_PROPERTIES,
  getDynamicStyleAnimatableProps
} from '../state/useAppStore';
import { Dropdown } from './common/Dropdown';
// @ts-ignore
import { applyDitherAlgorithm, applyTweaks } from '../dither-engine/algorithms.js';
// @ts-ignore
import { applyEffectStack } from '../dither-engine/effect-stack.js';
// @ts-ignore
import { BUILTIN_PALETTES } from '../dither-engine/palettes.js';
import { createProxyImageData } from '../utils/samplePattern';
import {
  UploadCloud,
  FolderOpen,
  Sparkles,
  MoveHorizontal,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Plus,
  Trash2,
  Copy
} from 'lucide-react';

function applyEasing(t: number, mode: EasingMode): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (mode) {
    case 'easeIn':
      return clamped * clamped;
    case 'easeOut':
      return 1 - (1 - clamped) * (1 - clamped);
    case 'easeInOut':
      return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    case 'pulse':
      return Math.sin(clamped * Math.PI);
    case 'step':
      return clamped < 0.999 ? 0 : 1;
    default:
      return clamped;
  }
}

function formatTimecode(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

const getSliderFill = (val: number, min: number, max: number): React.CSSProperties => {
  const pct = Math.max(0, Math.min(100, ((val - min) / Math.max(0.0001, max - min)) * 100));
  return { '--slider-fill': `${pct.toFixed(1)}%` } as React.CSSProperties;
};

function shiftRgbHue(r: number, g: number, b: number, deg: number): [number, number, number] {
  if (!deg) return [r, g, b];
  const rad = (deg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const sq13 = Math.sqrt(1 / 3);
  const m00 = cosA + (1 - cosA) / 3;
  const m01 = (1 / 3) * (1 - cosA) - sq13 * sinA;
  const m02 = (1 / 3) * (1 - cosA) + sq13 * sinA;
  const m10 = (1 / 3) * (1 - cosA) + sq13 * sinA;
  const m11 = cosA + (1 / 3) * (1 - cosA);
  const m12 = (1 / 3) * (1 - cosA) - sq13 * sinA;
  const m20 = (1 / 3) * (1 - cosA) - sq13 * sinA;
  const m21 = (1 / 3) * (1 - cosA) + sq13 * sinA;
  const m22 = cosA + (1 / 3) * (1 - cosA);
  return [
    Math.max(0, Math.min(255, Math.round(r * m00 + g * m01 + b * m02))),
    Math.max(0, Math.min(255, Math.round(r * m10 + g * m11 + b * m12))),
    Math.max(0, Math.min(255, Math.round(r * m20 + g * m21 + b * m22)))
  ];
}

// Fast Separable Box Blur + Denoise + Highlight pass on RGBA buffer
function applyExtendedAdjustments(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  blurRadius: number,
  denoiseStrength: number,
  highlightAmount: number
) {
  // 1. Highlight adjustment (targets bright luminances smoothly)
  if (highlightAmount !== 0) {
    const hFactor = (highlightAmount / 100) * 90;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const weight = lum * lum;
      const delta = hFactor * weight;
      data[i] = Math.max(0, Math.min(255, r + delta));
      data[i + 1] = Math.max(0, Math.min(255, g + delta));
      data[i + 2] = Math.max(0, Math.min(255, b + delta));
    }
  }

  // 2. Separable Box Blur + Denoise smoothing
  const totalBlur = Math.round(blurRadius + (denoiseStrength / 100) * 3);
  if (totalBlur >= 1) {
    const rad = Math.min(20, totalBlur);
    const temp = new Uint8ClampedArray(data.length);
    const blend = blurRadius > 0 ? 1.0 : Math.min(0.85, denoiseStrength / 100);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      const rowOff = y * width;
      for (let x = 0; x < width; x++) {
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        const x0 = Math.max(0, x - rad);
        const x1 = Math.min(width - 1, x + rad);
        for (let k = x0; k <= x1; k++) {
          const idx = (rowOff + k) * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          count++;
        }
        const outIdx = (rowOff + x) * 4;
        temp[outIdx] = rSum / count;
        temp[outIdx + 1] = gSum / count;
        temp[outIdx + 2] = bSum / count;
        temp[outIdx + 3] = data[outIdx + 3];
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      const y0 = Math.max(0, y - rad);
      const y1 = Math.min(height - 1, y + rad);
      for (let x = 0; x < width; x++) {
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let k = y0; k <= y1; k++) {
          const idx = (k * width + x) * 4;
          rSum += temp[idx];
          gSum += temp[idx + 1];
          bSum += temp[idx + 2];
          count++;
        }
        const outIdx = (y * width + x) * 4;
        const br = rSum / count;
        const bg = gSum / count;
        const bb = bSum / count;
        data[outIdx] = data[outIdx] * (1 - blend) + br * blend;
        data[outIdx + 1] = data[outIdx + 1] * (1 - blend) + bg * blend;
        data[outIdx + 2] = data[outIdx + 2] * (1 - blend) + bb * blend;
      }
    }
  }
}

export const CenterViewport: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timelineInnerRef = useRef<HTMLDivElement | null>(null);
  const timelineGroupRef = useRef<HTMLDivElement | null>(null);
  const playheadDomRef = useRef<HTMLDivElement | null>(null);
  const floatingEditorRef = useRef<HTMLDivElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrubRafRef = useRef<number | null>(null);

  const hasImage = useAppStore((state) => state.hasImage);
  const sourceImageData = useAppStore((state) => state.sourceImageData);
  const sourceVideoUrl = useAppStore((state) => state.sourceVideoUrl);
  const loadImageFromData = useAppStore((state) => state.loadImageFromData);
  const loadVideoSource = useAppStore((state) => state.loadVideoSource);
  const loadSampleImage = useAppStore((state) => state.loadSampleImage);

  const algorithmId = useAppStore((state) => state.algorithmId);
  const algoParams = useAppStore((state) => state.algoParams);
  const brightness = useAppStore((state) => state.brightness);
  const contrast = useAppStore((state) => state.contrast);
  const saturation = useAppStore((state) => state.saturation);
  const hue = useAppStore((state) => state.hue);
  const gamma = useAppStore((state) => state.gamma);
  const blur = useAppStore((state) => state.blur);
  const denoise = useAppStore((state) => state.denoise);
  const highlight = useAppStore((state) => state.highlight);
  const depth = useAppStore((state) => state.depth);
  const workingPalette = useAppStore((state) => state.workingPalette);
  const paletteDepth = useAppStore((state) => state.paletteDepth);
  const effects = useAppStore((state) => state.effects);
  const previewPaletteId = useAppStore((state) => state.previewPaletteId);
  const savedPalettes = useAppStore((state) => state.savedPalettes);

  const previewQuality = useAppStore((state) => state.previewQuality);
  const viewportUpdateMode = useAppStore((state) => state.viewportUpdateMode);
  const appMode = useAppStore((state) => state.appMode);
  const setAppMode = useAppStore((state) => state.setAppMode);
  const videoPlaybackMode = useAppStore((state) => state.videoPlaybackMode);
  const videoRenderMode = useAppStore((state) => state.videoRenderMode);

  const hasConfiguredAnimation = useAppStore((state) => state.hasConfiguredAnimation);
  const setHasConfiguredAnimation = useAppStore((state) => state.setHasConfiguredAnimation);
  const isCreateAnimationPopupOpen = useAppStore((state) => state.isCreateAnimationPopupOpen);
  const setIsCreateAnimationPopupOpen = useAppStore((state) => state.setIsCreateAnimationPopupOpen);

  const isPlaying = useAppStore((state) => state.isPlaying);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const currentTime = useAppStore((state) => state.currentTime);
  const setCurrentTime = useAppStore((state) => state.setCurrentTime);
  const duration = useAppStore((state) => state.duration);
  const setDuration = useAppStore((state) => state.setDuration);
  const fps = useAppStore((state) => state.fps);
  const setFps = useAppStore((state) => state.setFps);
  const stepFrame = useAppStore((state) => state.stepFrame);
  const animationTracks = useAppStore((state) => state.animationTracks);
  const selectedTrackId = useAppStore((state) => state.selectedTrackId);
  const setSelectedTrackId = useAppStore((state) => state.setSelectedTrackId);
  const addAnimationTrack = useAppStore((state) => state.addAnimationTrack);
  const duplicateAnimationTrack = useAppStore((state) => state.duplicateAnimationTrack);
  const updateAnimationTrack = useAppStore((state) => state.updateAnimationTrack);
  const removeAnimationTrack = useAppStore((state) => state.removeAnimationTrack);

  const isDraggingSlider = useAppStore((state) => state.isDraggingSlider);
  const setLastRenderMs = useAppStore((state) => state.setLastRenderMs);

  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const panX = useAppStore((state) => state.panX);
  const panY = useAppStore((state) => state.panY);
  const setPan = useAppStore((state) => state.setPan);
  const fitToViewport = useAppStore((state) => state.fitToViewport);
  const sidebarWidth = useAppStore((state) => state.sidebarWidth);

  const showBeforeAfter = useAppStore((state) => state.showBeforeAfter);
  const isOriginalView = useAppStore((state) => state.isOriginalView);
  const splitRatio = useAppStore((state) => state.splitRatio);
  const setSplitRatio = useAppStore((state) => state.setSplitRatio);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, startPanX: 0, startPanY: 0 });
  const panStartRef = useRef({ x: 0, y: 0, startPanX: 0, startPanY: 0 });

  const isElementUI = useCallback((el: Element | null): boolean => {
    if (!el) return false;
    if (el.closest(
      '.right-sidebar, ' +
      '.topbar-wrapper, ' +
      '.top-menu-bar, ' +
      '.fullscreen-peek-zone, ' +
      '.fullscreen-peek-tab, ' +
      '.df-floating-timeline-group, ' +
      '.df-floating-property-editor, ' +
      '.df-floating-editor-card, ' +
      '.df-create-anim-backdrop, ' +
      '.df-create-anim-popup, ' +
      '.split-divider-overlay, ' +
      '.modal-backdrop, ' +
      '.modal-dialog, ' +
      '.settings-modal, ' +
      '.export-modal, ' +
      '.dropdown-menu-popover, ' +
      '.dropdown-submenu-popover, ' +
      '.custom-dropdown-panel, ' +
      '.algo-listbox-panel, ' +
      '.tooltip, ' +
      '.themed-tooltip-panel, ' +
      '.unified-action-pill, ' +
      '[role="dialog"], ' +
      '[role="menu"], ' +
      'button, ' +
      'input, ' +
      'select, ' +
      'textarea'
    )) {
      return true;
    }
    if (containerRef.current && !containerRef.current.contains(el)) {
      return true;
    }
    return false;
  }, []);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [isScrubbingTimeline, setIsScrubbingTimeline] = useState(false);
  const [draggingTrackBar, setDraggingTrackBar] = useState<{
    id: string;
    mode: 'move' | 'start' | 'end';
    startX: number;
    origStart: number;
    origEnd: number;
    wasAlreadySelected: boolean;
    didMove: boolean;
  } | null>(null);

  // Default markerZoomLevel = 3 => 16 intervals (17 markers: 5 major, 4 medium, 8 minor matching image_4dd51b.png 1:1!)
  const [markerZoomLevel, setMarkerZoomLevel] = useState<number>(3);

  const [popupFpsInput, setPopupFpsInput] = useState<string>('30');
  const [popupDurationInput, setPopupDurationInput] = useState<string>('15s');

  const [trackContextMenu, setTrackContextMenu] = useState<{
    trackId: string;
    x: number;
    y: number;
  } | null>(null);

  const lastRenderSignatureRef = useRef<string>('');

  useEffect(() => {
    if (!trackContextMenu) return;
    const handleClose = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('.df-track-context-menu')) return;
      setTrackContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTrackContextMenu(null);
    };
    window.addEventListener('mousedown', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [trackContextMenu]);

  // Pre-rendered frame cache for Video: "Rendered" mode
  const renderedFramesCacheRef = useRef<Map<number, ImageData>>(new Map());

  useEffect(() => {
    if (isCreateAnimationPopupOpen) {
      setPopupFpsInput(String(fps || 30));
      setPopupDurationInput(`${Math.round(duration || 15)}s`);
    }
  }, [isCreateAnimationPopupOpen, fps, duration]);

  // Invalidate pre-rendered cache when parameters or tracks change
  useEffect(() => {
    renderedFramesCacheRef.current.clear();
    lastRenderSignatureRef.current = '';
  }, [
    sourceImageData,
    algorithmId,
    algoParams,
    brightness,
    contrast,
    saturation,
    hue,
    gamma,
    blur,
    denoise,
    highlight,
    depth,
    workingPalette,
    paletteDepth,
    effects,
    animationTracks,
    duration,
    fps
  ]);

  // Sync HTMLVideoElement frame if a video file was imported
  useEffect(() => {
    if (!sourceVideoUrl) {
      videoElRef.current = null;
      return;
    }
    const vid = document.createElement('video');
    vid.src = sourceVideoUrl;
    vid.muted = true;
    vid.playsInline = true;
    vid.crossOrigin = 'anonymous';
    videoElRef.current = vid;
    return () => {
      vid.pause();
      vid.src = '';
    };
  }, [sourceVideoUrl]);

  const currentParams = algoParams[algorithmId] ?? {
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 1.0,
    serpentine: false,
    noiseAmount: 0.0
  };

  const dynamicStyleProps = useMemo(
    () => getDynamicStyleAnimatableProps(algorithmId),
    [algorithmId]
  );

  const handleConfirmCreateAnimation = useCallback(() => {
    const parsedFps = Math.max(1, Math.min(120, parseInt(popupFpsInput, 10) || 30));
    const numericDur = parseFloat(popupDurationInput.replace(/[^0-9.]/g, ''));
    const parsedDur = Math.max(1, !isNaN(numericDur) && numericDur > 0 ? numericDur : 15);

    setFps(parsedFps);
    setDuration(parsedDur);
    setCurrentTime(0);
    setHasConfiguredAnimation(true);
    setIsCreateAnimationPopupOpen(false);
  }, [popupFpsInput, popupDurationInput, setFps, setDuration, setCurrentTime, setHasConfiguredAnimation, setIsCreateAnimationPopupOpen]);

  // On mount, ensure initial image is fitted & centered in the visible workspace between topbar and rightbar
  useEffect(() => {
    if (!containerRef.current || !hasImage || !sourceImageData) return;
    const availW = containerRef.current.clientWidth - (sidebarWidth + 14);
    const availH = containerRef.current.clientHeight - 38;
    if (availW > 100 && availH > 100) {
      fitToViewport(availW, availH);
    }
  }, []);

  // Native { passive: false } Wheel Listener on Timeline so Ctrl + Wheel adjusts marker subdivisions instead of browser zoom
  useEffect(() => {
    const el = timelineGroupRef.current;
    if (!el || appMode !== 'animation' || !hasConfiguredAnimation) return;

    const handleNativeTimelineWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 1 : -1;
        setMarkerZoomLevel((prev) => Math.max(1, Math.min(5, prev + delta)));
      }
    };

    el.addEventListener('wheel', handleNativeTimelineWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleNativeTimelineWheel);
  }, [appMode, hasConfiguredAnimation]);

  // Playback loop rAF
  useEffect(() => {
    if (appMode !== 'animation' || !isPlaying) return;
    let lastTs = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      const state = useAppStore.getState();
      let nextTime = state.currentTime + dt;
      if (nextTime >= state.duration) {
        if (state.videoPlaybackMode === 'looped') {
          nextTime = nextTime % state.duration;
          state.setCurrentTime(nextTime);
          animId = requestAnimationFrame(tick);
        } else {
          state.setCurrentTime(state.duration);
          state.setIsPlaying(false);
        }
      } else {
        state.setCurrentTime(nextTime);
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [appMode, isPlaying, videoPlaybackMode]);

  // Full Timeline Keyboard Controls (Space/K for Play/Pause, Arrows/J/L for Frames, Home/End, Up/Down for Tracks, T for Add Track)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable ||
          target.closest('input, textarea, select, [contenteditable="true"]')
        )
      ) {
        return;
      }

      if (appMode !== 'animation' || !hasConfiguredAnimation) return;

      // 1. Play / Pause (Space or K)
      if ((e.code === 'Space' || e.key.toLowerCase() === 'k') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        togglePlay();
        return;
      }

      // 2. Step Backward / Forward (Left/Right Arrows or J/L)
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          if (e.shiftKey) {
            const next = Math.max(0, currentTime - 1.0);
            setCurrentTime(Number(next.toFixed(4)));
          } else {
            stepFrame(-1);
          }
          return;
        }
      }

      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          if (e.shiftKey) {
            const next = Math.min(duration, currentTime + 1.0);
            setCurrentTime(Number(next.toFixed(4)));
          } else {
            stepFrame(1);
          }
          return;
        }
      }

      // 3. Jump to Start / End (Home / End)
      if (e.key === 'Home') {
        e.preventDefault();
        setCurrentTime(0);
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        setCurrentTime(duration);
        return;
      }

      // 4. Jump playhead to start/end of selected track ([ or ])
      if (selectedTrackId && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const curTrack = animationTracks.find((t) => t.id === selectedTrackId);
        if (curTrack) {
          if (e.key === '[') {
            e.preventDefault();
            setCurrentTime(curTrack.startTime);
            return;
          }
          if (e.key === ']') {
            e.preventDefault();
            setCurrentTime(curTrack.endTime);
            return;
          }
        }
      }

      // 5. Select Previous / Next Track (Up / Down Arrows)
      if (e.key === 'ArrowUp' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (animationTracks.length > 0) {
          e.preventDefault();
          if (!selectedTrackId) {
            setSelectedTrackId(animationTracks[animationTracks.length - 1].id);
          } else {
            const idx = animationTracks.findIndex((t) => t.id === selectedTrackId);
            if (idx > 0) {
              setSelectedTrackId(animationTracks[idx - 1].id);
            } else {
              setSelectedTrackId(animationTracks[animationTracks.length - 1].id);
            }
          }
          return;
        }
      }

      if (e.key === 'ArrowDown' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (animationTracks.length > 0) {
          e.preventDefault();
          if (!selectedTrackId) {
            setSelectedTrackId(animationTracks[0].id);
          } else {
            const idx = animationTracks.findIndex((t) => t.id === selectedTrackId);
            if (idx >= 0 && idx < animationTracks.length - 1) {
              setSelectedTrackId(animationTracks[idx + 1].id);
            } else {
              setSelectedTrackId(animationTracks[0].id);
            }
          }
          return;
        }
      }

      // 6. Add Animated Property Track ('t' or 'T')
      if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        addAnimationTrack();
        return;
      }

      // 7. Track Escape, Delete, Duplicate
      if (e.key === 'Escape' && selectedTrackId) {
        setSelectedTrackId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTrackId) {
        e.preventDefault();
        removeAnimationTrack(selectedTrackId);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedTrackId) {
        e.preventDefault();
        duplicateAnimationTrack(selectedTrackId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedTrackId,
    appMode,
    hasConfiguredAnimation,
    togglePlay,
    stepFrame,
    currentTime,
    duration,
    setCurrentTime,
    animationTracks,
    setSelectedTrackId,
    removeAnimationTrack,
    duplicateAnimationTrack,
    addAnimationTrack
  ]);

  // Split Divider Dragging
  useEffect(() => {
    if (!isDraggingSplitter) return;
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const relativeX = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.02, Math.min(0.98, relativeX)));
    };
    const handleWindowMouseUp = () => setIsDraggingSplitter(false);
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDraggingSplitter, setSplitRatio]);

  // Window-level Canvas Panning Handler with Instant UI Cancellation
  useEffect(() => {
    if (!isPanning) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      // 1. If mouse button is no longer held (left button 1 or middle button 4), cancel pan!
      const isButtonHeld = (e.buttons & 1) !== 0 || (e.buttons & 4) !== 0;
      if (!isButtonHeld) {
        setIsPanning(false);
        return;
      }

      // 2. If cursor moves over any UI element, cancel drag immediately!
      const targetEl = e.target instanceof Element ? e.target : (e.target as Node)?.parentElement;
      const pointEl = document.elementFromPoint(e.clientX, e.clientY);
      if (isElementUI(targetEl) || isElementUI(pointEl) || !pointEl) {
        setIsPanning(false);
        return;
      }

      // 3. Pan canvas smoothly
      const start = panStartRef.current;
      setPan(start.startPanX + (e.clientX - start.x), start.startPanY + (e.clientY - start.y));
    };

    const handleWindowMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isPanning, isElementUI, setPan]);

  // Pointer-Centered Wheel Zoom on Main Canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      const state = useAppStore.getState();
      const newZoom = Math.max(10, Math.min(3200, Math.round(state.zoom * factor)));
      if (newZoom === state.zoom) return;
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - (rect.left + rect.width / 2);
      const cursorY = e.clientY - (rect.top + rect.height / 2);
      const zoomRatio = newZoom / state.zoom;
      const newPanX = Math.round(cursorX - (cursorX - state.panX) * zoomRatio);
      const newPanY = Math.round(cursorY - (cursorY - state.panY) * zoomRatio);
      setZoom(newZoom);
      setPan(newPanX, newPanY);
    };
    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleNativeWheel);
  }, [setZoom, setPan]);

  // Handle Both Image and MP4/Video File Drops & Imports!
  const processMediaFile = useCallback((file: File) => {
    if (file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.preload = 'auto';
      vid.muted = true;
      vid.playsInline = true;
      vid.src = url;
      vid.onloadeddata = () => {
        vid.currentTime = 0;
      };
      vid.onseeked = () => {
        const w = vid.videoWidth || 640;
        const h = vid.videoHeight || 360;
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const ctx = off.getContext('2d');
        if (ctx) {
          ctx.drawImage(vid, 0, 0, w, h);
          const firstFrame = ctx.getImageData(0, 0, w, h);
          loadVideoSource(url, firstFrame, vid.duration || 10, file.name);
          if (containerRef.current) {
            fitToViewport(containerRef.current.clientWidth - (sidebarWidth + 14), containerRef.current.clientHeight - 38);
          }
        }
        vid.onseeked = null;
      };
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
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
        if (containerRef.current) {
          fitToViewport(containerRef.current.clientWidth - (sidebarWidth + 14), containerRef.current.clientHeight - 38);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [loadImageFromData, loadVideoSource, fitToViewport, sidebarWidth]);

  const workBufferRef = useRef<Uint8ClampedArray | null>(null);
  const compositeBufferRef = useRef<Uint8ClampedArray | null>(null);
  const proxyCacheRef = useRef<{ source: ImageData; low: ImageData; mid: ImageData } | null>(null);
  const proxyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const executeRenderPipeline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImageData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fullWidth = sourceImageData.width;
    const fullHeight = sourceImageData.height;
    if (canvas.width !== fullWidth || canvas.height !== fullHeight) {
      canvas.width = fullWidth;
      canvas.height = fullHeight;
    }

    // Video: "Rendered" vs "Quick" behavior
    // In "Rendered" mode, frames are pre-rendered at full resolution and cached by frame index for instant playback!
    const frameIndex = appMode === 'animation' ? Math.round(currentTime * fps) : 0;
    if (appMode === 'animation' && videoRenderMode === 'rendered' && !showBeforeAfter && !isOriginalView && !sourceVideoUrl) {
      const cachedFrame = renderedFramesCacheRef.current.get(frameIndex);
      if (cachedFrame && cachedFrame.width === fullWidth && cachedFrame.height === fullHeight) {
        ctx.putImageData(cachedFrame, 0, 0);
        return;
      }
    }

    let effectiveQuality = previewQuality;
    if (appMode === 'animation') {
      if (videoRenderMode === 'rendered') {
        effectiveQuality = 'full';
      } else if (isPlaying && videoRenderMode === 'quick' && effectiveQuality === 'full') {
        effectiveQuality = 'mid';
      }
    }

    // If a video source is active, grab current video frame if ready
    let activeBaseImage = sourceImageData;
    if (sourceVideoUrl && videoElRef.current && videoElRef.current.readyState >= 2) {
      const vid = videoElRef.current;
      if (Math.abs(vid.currentTime - currentTime) > 0.04) {
        vid.currentTime = currentTime % (vid.duration || duration || 1);
      }
      if (!videoCanvasRef.current) {
        videoCanvasRef.current = document.createElement('canvas');
      }
      const vCan = videoCanvasRef.current;
      if (vCan.width !== fullWidth || vCan.height !== fullHeight) {
        vCan.width = fullWidth;
        vCan.height = fullHeight;
      }
      const vCtx = vCan.getContext('2d');
      if (vCtx) {
        vCtx.drawImage(vid, 0, 0, fullWidth, fullHeight);
        activeBaseImage = vCtx.getImageData(0, 0, fullWidth, fullHeight);
      }
    }

    if (!sourceVideoUrl && proxyCacheRef.current?.source !== activeBaseImage) {
      proxyCacheRef.current = {
        source: activeBaseImage,
        low: createProxyImageData(activeBaseImage, 320).data,
        mid: createProxyImageData(activeBaseImage, 640).data
      };
    }

    let renderSource = activeBaseImage;
    if (!sourceVideoUrl && proxyCacheRef.current) {
      if (effectiveQuality === 'low') renderSource = proxyCacheRef.current.low;
      else if (effectiveQuality === 'mid') renderSource = proxyCacheRef.current.mid;
    }

    let effBrightness = brightness;
    let effContrast = contrast;
    let effSaturation = saturation;
    let effHue = hue;
    let effGamma = gamma;
    let effBlur = blur;
    let effDenoise = denoise;
    let effHighlight = highlight;
    let effDepth = depth;
    let effPaletteDepth = paletteDepth;
    let effPaletteHueShift = 0;
    let effPaletteCycle = 0;
    const effAlgoParams: Record<string, any> = { ...currentParams };
    const effEffects = effects.map((e) => ({ ...e, params: { ...e.params } }));
    let animatedNoiseActive = false;

    if (appMode === 'animation') {
      for (const track of animationTracks) {
        if (!track.category || !track.property) continue;
        if (currentTime >= track.startTime && currentTime <= track.endTime) {
          const span = Math.max(0.001, track.endTime - track.startTime);
          const rawProgress = (currentTime - track.startTime) / span;
          const eased = applyEasing(rawProgress, track.easing);
          const val = track.fromValue + (track.toValue - track.fromValue) * eased;

          if (track.category === 'adjustments') {
            if (track.property === 'brightness') effBrightness = val;
            else if (track.property === 'contrast') effContrast = val;
            else if (track.property === 'saturation') effSaturation = val;
            else if (track.property === 'hue') effHue = val;
            else if (track.property === 'gamma') effGamma = val;
            else if (track.property === 'blur') effBlur = val;
            else if (track.property === 'denoise') effDenoise = val;
            else if (track.property === 'highlight') effHighlight = val;
            else if (track.property === 'depth') effDepth = Math.round(val);
          } else if (track.category === 'style') {
            if (track.property === 'depth') {
              effDepth = Math.round(val);
            } else {
              effAlgoParams[track.property] = val;
              if (track.property === 'noiseAmount' || track.property === 'noise' || track.property === 'randomVal') {
                effAlgoParams.noiseAmount = val;
                effAlgoParams.noise = val;
                effAlgoParams.randomVal = val;
                animatedNoiseActive = true;
              }
            }
          } else if (track.category === 'effects') {
            const [effectId, paramKey] = track.property.split('.');
            const targetEffect = effEffects.find((e) => e.id === effectId);
            if (targetEffect && paramKey) {
              targetEffect.enabled = true;
              targetEffect.params[paramKey] = val;
            }
          } else if (track.category === 'palette') {
            if (track.property === 'paletteDepth') effPaletteDepth = Math.max(2, Math.round(val));
            else if (track.property === 'paletteHueShift') effPaletteHueShift = val;
            else if (track.property === 'paletteCycle') effPaletteCycle = Math.round(val);
          }
        }
      }
    }

    const paletteSig = (previewPaletteId || '') + ':' + (workingPalette?.length || 0) + ':' + (effPaletteDepth || 0) + ':' + effPaletteHueShift.toFixed(2) + ':' + effPaletteCycle;
    const renderSig = [
      sourceImageData.width,
      sourceImageData.height,
      sourceImageData.data[0],
      algorithmId,
      effectiveQuality,
      effBrightness.toFixed(2),
      effContrast.toFixed(2),
      effSaturation.toFixed(2),
      effHue.toFixed(2),
      effGamma.toFixed(2),
      effBlur.toFixed(2),
      effDenoise.toFixed(2),
      effHighlight.toFixed(2),
      effDepth,
      paletteSig,
      showBeforeAfter,
      splitRatio.toFixed(3),
      isOriginalView,
      JSON.stringify(effAlgoParams),
      JSON.stringify(effEffects),
      sourceVideoUrl ? Math.round(currentTime * 30) : '',
      animatedNoiseActive ? frameIndex : ''
    ].join('::');

    if (renderSig === lastRenderSignatureRef.current) {
      return;
    }
    lastRenderSignatureRef.current = renderSig;

    const width = renderSource.width;
    const height = renderSource.height;
    const len = renderSource.data.length;

    if (!workBufferRef.current || workBufferRef.current.length !== len) {
      workBufferRef.current = new Uint8ClampedArray(len);
    }
    workBufferRef.current.set(renderSource.data);
    const workingData = workBufferRef.current;

    const t0 = performance.now();

    applyTweaks(workingData, width, height, {
      brightness: effBrightness / 100,
      contrast: effContrast / 100,
      saturation: effSaturation / 100,
      gamma: effGamma,
      hue: effHue
    });

    if (effBlur > 0 || effDenoise > 0 || effHighlight !== 0) {
      applyExtendedAdjustments(workingData, width, height, effBlur, effDenoise, effHighlight);
    }

    const activeNoiseVal = Number(effAlgoParams.noiseAmount ?? effAlgoParams.noise ?? 0);
    if ((animatedNoiseActive || activeNoiseVal > 0) && activeNoiseVal > 0) {
      const seedOffset = (animatedNoiseActive && appMode === 'animation') ? frameIndex * 1337 : 42;
      const amp = activeNoiseVal * 110;
      for (let i = 0; i < len; i += 4) {
        const hash = Math.sin((i >> 2) * 12.9898 + seedOffset) * 43758.5453;
        const n = ((hash - Math.floor(hash)) - 0.5) * amp;
        workingData[i] = Math.max(0, Math.min(255, workingData[i] + n));
        workingData[i + 1] = Math.max(0, Math.min(255, workingData[i + 1] + n));
        workingData[i + 2] = Math.max(0, Math.min(255, workingData[i + 2] + n));
      }
    }

    const getEffectivePalette = (): number[][] => {
      let base: number[][];
      if (previewPaletteId) {
        const previewPal =
          BUILTIN_PALETTES.find((p: any) => p.id === previewPaletteId) ||
          savedPalettes.find((p) => p.id === previewPaletteId);
        base = previewPal ? previewPal.colors : workingPalette;
      } else {
        base = workingPalette && workingPalette.length > 0 ? workingPalette : BUILTIN_PALETTES[0].colors;
      }
      let sliced = base.slice(0, Math.max(2, Math.min(effPaletteDepth || base.length, base.length)));
      if (effPaletteCycle !== 0 && sliced.length > 1) {
        const shift = ((effPaletteCycle % sliced.length) + sliced.length) % sliced.length;
        sliced = [...sliced.slice(shift), ...sliced.slice(0, shift)];
      }
      if (effPaletteHueShift !== 0) {
        sliced = sliced.map((c) => {
          const [nr, ng, nb] = shiftRgbHue(c[0], c[1], c[2], effPaletteHueShift);
          return [nr, ng, nb, c[3] ?? 255];
        });
      }
      return sliced;
    };

    const palette = getEffectivePalette();
    const ditherImageData = new ImageData(workingData as any, width, height);
    const effNoise = effAlgoParams.noiseAmount ?? effAlgoParams.noise ?? 0;
    const mappedControls = {
      ...effAlgoParams,
      bleed: (effAlgoParams.bleedFraction ?? 0) / 100,
      smoothing: effAlgoParams.smoothingFactor,
      scale: effAlgoParams.scale ?? 1.0,
      noise: effNoise,
      noiseAmount: effNoise,
      randomVal: effNoise,
      errorStrength: effAlgoParams.diffusionStrength ?? 1.0,
      strength: effAlgoParams.diffusionStrength ?? 1.0
    };

    applyDitherAlgorithm(ditherImageData, {
      algorithmId,
      palette,
      ...mappedControls,
      controls: mappedControls,
      threshold: effAlgoParams.threshold ?? 0.5,
      scale: mappedControls.scale,
      bleed: mappedControls.bleed,
      smoothing: mappedControls.smoothing,
      diffusionStrength: effAlgoParams.diffusionStrength ?? 1.0,
      serpentine: effAlgoParams.serpentine ?? false,
      noiseAmount: effNoise,
      noise: effNoise,
      depth: effDepth,
      temporalSeed: (animatedNoiseActive && appMode === 'animation') ? frameIndex : 0,
      offsetX: effAlgoParams.offsetX ?? 0,
      offsetY: effAlgoParams.offsetY ?? 0
    });

    applyEffectStack(ditherImageData, effEffects);
    setLastRenderMs(performance.now() - t0);

    // Store in Rendered frame cache when Video: Rendered mode is active
    if (appMode === 'animation' && videoRenderMode === 'rendered' && width === fullWidth && height === fullHeight && !sourceVideoUrl) {
      if (renderedFramesCacheRef.current.size < 360) {
        renderedFramesCacheRef.current.set(
          frameIndex,
          new ImageData(new Uint8ClampedArray(ditherImageData.data), fullWidth, fullHeight)
        );
      }
    }

    const drawToCanvas = (imgData: ImageData) => {
      if (width === fullWidth && height === fullHeight) {
        ctx.putImageData(imgData, 0, 0);
      } else {
        if (!proxyCanvasRef.current) {
          proxyCanvasRef.current = document.createElement('canvas');
        }
        const offscreen = proxyCanvasRef.current;
        if (offscreen.width !== width || offscreen.height !== height) {
          offscreen.width = width;
          offscreen.height = height;
        }
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          offCtx.putImageData(imgData, 0, 0);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(offscreen, 0, 0, fullWidth, fullHeight);
        }
      }
    };

    if (isOriginalView) {
      drawToCanvas(new ImageData(new Uint8ClampedArray(renderSource.data), width, height));
    } else if (showBeforeAfter) {
      if (!compositeBufferRef.current || compositeBufferRef.current.length !== len) {
        compositeBufferRef.current = new Uint8ClampedArray(len);
      }
      compositeBufferRef.current.set(workingData);
      const comp = compositeBufferRef.current;
      const splitX = Math.round(width * splitRatio);
      const originalData = renderSource.data;
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < splitX; x++) {
          const idx = (rowOffset + x) * 4;
          comp[idx] = originalData[idx];
          comp[idx + 1] = originalData[idx + 1];
          comp[idx + 2] = originalData[idx + 2];
          comp[idx + 3] = originalData[idx + 3];
        }
      }
      drawToCanvas(new ImageData(comp as any, width, height));
    } else {
      drawToCanvas(ditherImageData);
    }
  }, [
    sourceImageData,
    sourceVideoUrl,
    previewQuality,
    appMode,
    videoRenderMode,
    isPlaying,
    currentTime,
    duration,
    fps,
    animationTracks,
    brightness,
    contrast,
    saturation,
    hue,
    gamma,
    blur,
    denoise,
    highlight,
    depth,
    workingPalette,
    previewPaletteId,
    savedPalettes,
    paletteDepth,
    algorithmId,
    currentParams,
    isOriginalView,
    showBeforeAfter,
    splitRatio,
    effects,
    setLastRenderMs
  ]);

  useEffect(() => {
    if (!sourceImageData) return;
    if (viewportUpdateMode === 'debounce' && !isPlaying && !isScrubbingTimeline) {
      if (isDraggingSlider) return;
      const timer = window.setTimeout(() => {
        executeRenderPipeline();
      }, 140);
      return () => clearTimeout(timer);
    }
    executeRenderPipeline();
  }, [
    sourceImageData,
    viewportUpdateMode,
    isDraggingSlider,
    isPlaying,
    isScrubbingTimeline,
    executeRenderPipeline
  ]);

  // Default markerZoomLevel = 3 => 16 subdivisions (17 ticks total: 5 major, 4 medium, 8 minor matching image_4dd51b.png!)
  const subdivisions = useMemo(() => 4 * Math.pow(2, markerZoomLevel - 1), [markerZoomLevel]);

  const rulerTicks = useMemo(() => {
    const count = subdivisions + 1;
    return Array.from({ length: count }, (_, idx) => {
      const pct = (idx / subdivisions) * 100;
      const timeVal = (idx / subdivisions) * duration;
      const isMajor = idx % Math.max(1, subdivisions / 4) === 0;
      const isMedium = !isMajor && idx % Math.max(1, subdivisions / 8) === 0;
      return { idx, pct, timeVal, isMajor, isMedium };
    });
  }, [subdivisions, duration]);

  // Ultra-smooth 60fps Playhead Scrubbing with subtle magnetic clip to ruler markers!
  const updateScrubFromClientX = useCallback((clientX: number, disableClip = false) => {
    const el = timelineInnerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const usableW = Math.max(1, rect.width);
    let ratio = Math.max(0, Math.min(1, (clientX - rect.left) / usableW));

    // Subtle magnetic clip onto ruler markers (within 0.65% of any marker)
    if (!disableClip) {
      const nearestTickIdx = Math.round(ratio * subdivisions);
      const tickRatio = nearestTickIdx / subdivisions;
      if (Math.abs(ratio - tickRatio) < 0.0065) {
        ratio = tickRatio;
      }
    }

    // Immediately update playhead DOM position with zero React latency
    if (playheadDomRef.current) {
      playheadDomRef.current.style.left = `${ratio * 100}%`;
    }

    const nextTime = ratio * duration;
    if (scrubRafRef.current !== null) {
      cancelAnimationFrame(scrubRafRef.current);
    }
    scrubRafRef.current = requestAnimationFrame(() => {
      setCurrentTime(nextTime);
      scrubRafRef.current = null;
    });
  }, [duration, subdivisions, setCurrentTime]);

  useEffect(() => {
    if (!isScrubbingTimeline) return;
    const onMove = (e: MouseEvent) => updateScrubFromClientX(e.clientX, e.shiftKey);
    const onUp = () => setIsScrubbingTimeline(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isScrubbingTimeline, updateScrubFromClientX]);

  // Magnetic Snapping for Track Bars onto Dynamic Ruler Markers, Playhead, and Track Edges
  const snapTimeValue = useCallback((val: number, ignoreTrackId: string, disableSnap: boolean) => {
    const clamped = Math.max(0, Math.min(duration, val));
    if (disableSnap) return Number(clamped.toFixed(2));
    const stepTime = duration / subdivisions;
    const threshold = Math.min(duration * 0.018, stepTime * 0.38);

    const targets: number[] = [currentTime];
    for (const tick of rulerTicks) {
      targets.push(tick.timeVal);
    }
    for (const tr of animationTracks) {
      if (tr.id === ignoreTrackId) continue;
      targets.push(tr.startTime, tr.endTime);
    }
    let best = clamped;
    let bestDist = threshold;
    for (const target of targets) {
      const dist = Math.abs(clamped - target);
      if (dist <= bestDist) {
        bestDist = dist;
        best = target;
      }
    }
    return Number(best.toFixed(2));
  }, [duration, subdivisions, currentTime, rulerTicks, animationTracks]);

  // Track Bar Dragging, Resizing & Click-to-Close Toggle
  useEffect(() => {
    if (!draggingTrackBar) return;
    const onMove = (e: MouseEvent) => {
      const el = timelineInnerRef.current;
      if (!el) return;
      const dx = e.clientX - draggingTrackBar.startX;
      if (Math.abs(dx) > 3 && !draggingTrackBar.didMove) {
        setDraggingTrackBar((prev) => (prev ? { ...prev, didMove: true } : null));
      }
      const rect = el.getBoundingClientRect();
      const usableW = Math.max(1, rect.width);
      const dt = (dx / usableW) * duration;
      const minSpan = Math.max(0.1, Number((duration * 0.03).toFixed(2)));

      if (draggingTrackBar.mode === 'move') {
        const len = draggingTrackBar.origEnd - draggingTrackBar.origStart;
        let nextStart = Math.max(0, Math.min(duration - len, draggingTrackBar.origStart + dt));
        nextStart = snapTimeValue(nextStart, draggingTrackBar.id, e.shiftKey);
        nextStart = Math.max(0, Math.min(duration - len, nextStart));
        updateAnimationTrack(draggingTrackBar.id, {
          startTime: Number(nextStart.toFixed(2)),
          endTime: Number((nextStart + len).toFixed(2))
        });
      } else if (draggingTrackBar.mode === 'start') {
        const rawStart = Math.max(0, Math.min(draggingTrackBar.origEnd - minSpan, draggingTrackBar.origStart + dt));
        const snappedStart = Math.max(0, Math.min(draggingTrackBar.origEnd - minSpan, snapTimeValue(rawStart, draggingTrackBar.id, e.shiftKey)));
        updateAnimationTrack(draggingTrackBar.id, { startTime: snappedStart });
      } else if (draggingTrackBar.mode === 'end') {
        const rawEnd = Math.min(duration, Math.max(draggingTrackBar.origStart + minSpan, draggingTrackBar.origEnd + dt));
        const snappedEnd = Math.min(duration, Math.max(draggingTrackBar.origStart + minSpan, snapTimeValue(rawEnd, draggingTrackBar.id, e.shiftKey)));
        updateAnimationTrack(draggingTrackBar.id, { endTime: snappedEnd });
      }
    };
    const onUp = (e: MouseEvent) => {
      const moved = Math.abs(e.clientX - draggingTrackBar.startX) > 3 || draggingTrackBar.didMove;
      if (!moved && draggingTrackBar.mode === 'move' && draggingTrackBar.wasAlreadySelected) {
        setSelectedTrackId(null);
      }
      setDraggingTrackBar(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingTrackBar, duration, snapTimeValue, updateAnimationTrack, setSelectedTrackId]);

  const selectedTrack = animationTracks.find((t) => t.id === selectedTrackId) || null;
  const playheadPercent = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;

  const activeCat: AnimationCategory = selectedTrack?.category || 'adjustments';
  const selectedPropList = useMemo(() => {
    if (activeCat === 'style') return dynamicStyleProps;
    return ANIMATABLE_PROPERTIES[activeCat] || ANIMATABLE_PROPERTIES.adjustments;
  }, [activeCat, dynamicStyleProps]);

  const selectedPropMeta = selectedTrack?.property
    ? selectedPropList.find((p) => p.id === selectedTrack.property) || { min: 0, max: 1, step: 0.05 }
    : { min: 0, max: 1, step: 0.05 };

  return (
    <main
      className="center-viewport"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files?.[0]) processMediaFile(e.dataTransfer.files[0]);
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/mp4,video/webm,video/quicktime,video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) processMediaFile(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {/* 1. Full-Bleed Workspace Image Area */}
      <div
        ref={containerRef}
        className="canvas-area"
        style={{
          cursor: isDraggingSplitter ? 'ew-resize' : isPanning ? 'grabbing' : 'default'
        }}
        onMouseDown={(e) => {
          if (
            selectedTrackId &&
            floatingEditorRef.current &&
            !floatingEditorRef.current.contains(e.target as Node) &&
            !timelineGroupRef.current?.contains(e.target as Node)
          ) {
            setSelectedTrackId(null);
          }
          if (e.button === 1 || e.button === 0) {
            if (isDraggingSplitter) return;
            const targetEl = e.target instanceof Element ? e.target : (e.target as Node)?.parentElement;
            if (isElementUI(targetEl)) return;
            const startData = { x: e.clientX, y: e.clientY, startPanX: panX, startPanY: panY };
            panStartRef.current = startData;
            setPanStart(startData);
            setIsPanning(true);
          }
        }}
      >
        {!hasImage || !sourceImageData ? (
          <div className={`viewport-dropzone ${isDragOver ? 'drag-active' : ''}`}>
            <div className="dropzone-icon"><UploadCloud size={32} /></div>
            <div className="dropzone-title">Drop an image or MP4 video here to dither</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="action-btn primary" onClick={() => fileInputRef.current?.click()}>
                <FolderOpen size={13} /> Open Media
              </button>
              <button className="action-btn" onClick={loadSampleImage}>
                <Sparkles size={13} /> Calibration Pattern
              </button>
            </div>
          </div>
        ) : (
          <div
            className="canvas-unframed-stage"
            style={{
              position: 'relative',
              display: 'inline-block',
              transform: `translate(${panX}px, ${panY}px) scale(${zoom / 100})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.05s ease-out',
              userSelect: 'none'
            }}
          >
            <canvas
              ref={canvasRef}
              id="mainViewportCanvas"
              className="preview-canvas"
            />

            {!isOriginalView && showBeforeAfter && canvasRef.current && (
              <>
                <div className="compare-badge before" style={{ transform: `scale(${100 / Math.max(50, zoom)})`, transformOrigin: 'top left' }}>
                  ORIGINAL
                </div>
                <div className="compare-badge after" style={{ transform: `scale(${100 / Math.max(50, zoom)})`, transformOrigin: 'top right' }}>
                  DITHERED
                </div>
                <div
                  className="split-divider-overlay"
                  style={{ left: `${splitRatio * 100}%` }}
                  onMouseDown={(e) => { e.stopPropagation(); setIsDraggingSplitter(true); }}
                >
                  <div className="split-handle"><MoveHorizontal size={12} /></div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. Create Animation Popup — Shown FIRST on switching to Animation mode BEFORE the timeline appears */}
      {appMode === 'animation' && isCreateAnimationPopupOpen &&
        createPortal(
          <div
            className="df-create-anim-backdrop"
            onClick={() => {
              setIsCreateAnimationPopupOpen(false);
              if (!hasConfiguredAnimation) {
                setAppMode('still');
              }
            }}
          >
            <div
              className="df-create-anim-popup"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="df-create-anim-top-row">
                <div className="df-create-anim-field">
                  <span className="df-create-anim-label">FPS</span>
                  <input
                    type="text"
                    className="df-create-anim-pill-input"
                    value={popupFpsInput}
                    onChange={(e) => setPopupFpsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmCreateAnimation();
                    }}
                  />
                </div>
                <div className="df-create-anim-field">
                  <span className="df-create-anim-label">Duration</span>
                  <input
                    type="text"
                    className="df-create-anim-pill-input"
                    value={popupDurationInput}
                    onChange={(e) => setPopupDurationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmCreateAnimation();
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="df-create-anim-submit-btn"
                onClick={handleConfirmCreateAnimation}
              >
                Create
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* 3. Floating Playback Controls, Circular + Button & Timeline Card */}
      {appMode === 'animation' && hasConfiguredAnimation && (
        <>
          <div
            ref={timelineGroupRef}
            className="df-floating-timeline-group"
            style={{ right: `${sidebarWidth + 28}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Property Editor Popup - In-line directly above play buttons & + */}
            {selectedTrack && (
              <aside
                ref={floatingEditorRef}
                className="df-floating-property-editor"
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTrackContextMenu({
                    trackId: selectedTrack.id,
                    x: e.clientX,
                    y: e.clientY
                  });
                }}
              >
                <div className="df-editor-field-group">
                  <label className="df-editor-label">Category</label>
                  <Dropdown
                    id="anim-track-category-dropdown"
                    className="df-editor-dropdown"
                    width="100%"
                    placeholder="Select category..."
                    value={selectedTrack.category || ''}
                    onChange={(val) => {
                      const nextCat = val as AnimationCategory;
                      const list = nextCat === 'style' ? dynamicStyleProps : ANIMATABLE_PROPERTIES[nextCat];
                      const firstProp = list[0];
                      if (!firstProp) return;
                      updateAnimationTrack(selectedTrack.id, {
                        category: nextCat,
                        property: firstProp.id,
                        label: firstProp.label,
                        fromValue: firstProp.defaultFrom,
                        toValue: firstProp.defaultTo
                      });
                    }}
                    items={[
                      { id: 'adjustments', label: 'Adjustments' },
                      { id: 'style', label: 'Styles' },
                      { id: 'effects', label: 'Effects Stack' },
                      { id: 'palette', label: 'Colour Palette' }
                    ]}
                  />
                </div>

                <div className="df-editor-field-group">
                  <label className="df-editor-label">Property</label>
                  <Dropdown
                    id="anim-track-property-dropdown"
                    className="df-editor-dropdown"
                    width="100%"
                    placeholder="No effect"
                    value={selectedTrack.property || ''}
                    onChange={(propId) => {
                      const cat: AnimationCategory = selectedTrack.category || 'adjustments';
                      const list = cat === 'style' ? dynamicStyleProps : ANIMATABLE_PROPERTIES[cat];
                      const meta = list.find((p) => p.id === propId);
                      if (!meta) return;
                      updateAnimationTrack(selectedTrack.id, {
                        category: cat,
                        property: meta.id,
                        label: meta.label,
                        fromValue: meta.defaultFrom,
                        toValue: meta.defaultTo
                      });
                    }}
                    items={selectedPropList.map((p) => ({
                      id: p.id,
                      label: p.label
                    }))}
                  />
                </div>

                <div className="df-editor-slider-group">
                  <div className="df-editor-label-row">
                    <label className="df-editor-label">From</label>
                    <span className="df-editor-val-readout">{selectedTrack.fromValue}</span>
                  </div>
                  <div className="df-editor-slider-row">
                    <span className="df-editor-bound">{selectedPropMeta.min}</span>
                    <input
                      type="range"
                      className="control-slider df-editor-range"
                      min={selectedPropMeta.min}
                      max={selectedPropMeta.max}
                      step={selectedPropMeta.step}
                      value={selectedTrack.fromValue}
                      style={getSliderFill(selectedTrack.fromValue, selectedPropMeta.min, selectedPropMeta.max)}
                      onChange={(e) => updateAnimationTrack(selectedTrack.id, { fromValue: parseFloat(e.target.value) })}
                    />
                    <span className="df-editor-bound">{selectedPropMeta.max}</span>
                  </div>
                </div>

                <div className="df-editor-slider-group">
                  <div className="df-editor-label-row">
                    <label className="df-editor-label">To</label>
                    <span className="df-editor-val-readout">{selectedTrack.toValue}</span>
                  </div>
                  <div className="df-editor-slider-row">
                    <span className="df-editor-bound">{selectedPropMeta.min}</span>
                    <input
                      type="range"
                      className="control-slider df-editor-range"
                      min={selectedPropMeta.min}
                      max={selectedPropMeta.max}
                      step={selectedPropMeta.step}
                      value={selectedTrack.toValue}
                      style={getSliderFill(selectedTrack.toValue, selectedPropMeta.min, selectedPropMeta.max)}
                      onChange={(e) => updateAnimationTrack(selectedTrack.id, { toValue: parseFloat(e.target.value) })}
                    />
                    <span className="df-editor-bound">{selectedPropMeta.max}</span>
                  </div>
                </div>

                <div className="df-editor-field-group">
                  <label className="df-editor-label">Easing</label>
                  <Dropdown
                    id="anim-track-easing-dropdown"
                    className="df-editor-dropdown"
                    width="100%"
                    direction="up"
                    value={selectedTrack.easing}
                    onChange={(val) => updateAnimationTrack(selectedTrack.id, { easing: val as EasingMode })}
                    items={[
                      { id: 'linear', label: 'Linear' },
                      { id: 'easeIn', label: 'Ease In' },
                      { id: 'easeOut', label: 'Ease Out' },
                      { id: 'easeInOut', label: 'Ease In Out' },
                      { id: 'pulse', label: 'Pulse' },
                      { id: 'step', label: 'Hold (Step)' }
                    ]}
                  />
                </div>

              </aside>
            )}

            <div className="df-timeline-top-row">
              <div className="df-playback-left-cluster">
                <div className="df-playback-pill">
                  <span
                    className="df-timecode-readout"
                    onClick={() => setIsCreateAnimationPopupOpen(true)}
                    title="Click to configure FPS & Duration"
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="df-timecode-current">{formatTimecode(currentTime)}</span>
                    <span className="df-timecode-max"> / {formatTimecode(duration)}</span>
                  </span>
                  <div className="df-transport-cluster">
                    <button
                      type="button"
                      className="df-transport-btn"
                      onClick={() => stepFrame(-1)}
                      title="Previous Frame (Left Arrow / J, Shift+Left: -1s)"
                      aria-label="Previous Frame"
                    >
                      <SkipBack size={16} fill="currentColor" />
                    </button>
                    <button
                      type="button"
                      className="df-transport-btn play-btn"
                      onClick={togglePlay}
                      title={isPlaying ? 'Pause (Space / K)' : 'Play (Space / K)'}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>
                    <button
                      type="button"
                      className="df-transport-btn"
                      onClick={() => stepFrame(1)}
                      title="Next Frame (Right Arrow / L, Shift+Right: +1s)"
                      aria-label="Next Frame"
                    >
                      <SkipForward size={16} fill="currentColor" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="df-playback-plus-btn"
                  onClick={() => addAnimationTrack()}
                  title="Add animated property track (T)"
                  aria-label="Add animated property track"
                >
                  <Plus size={18} strokeWidth={2.4} />
                </button>
              </div>
            </div>

            {/* Dedicated Floating Timeline Card */}
            <div
              className="df-timeline-body-card"
              onMouseDown={(e) => {
                if (!(e.target as HTMLElement).closest('.df-track-bar')) {
                  setIsScrubbingTimeline(true);
                  updateScrubFromClientX(e.clientX, e.shiftKey);
                }
              }}
            >
              <div className="df-timeline-fullspan-row">
                <span className="df-ruler-time-edge start">{formatTimecode(0)}</span>

                {/* Unified 0% to 100% Coordinate Stage */}
                <div
                  ref={timelineInnerRef}
                  className="df-timeline-coord-stage"
                >
                  {/* Ruler Ticks: Positioned by exact percentage so 0% and 100% align dead-center with playhead */}
                  <div className="df-ruler-ticks">
                    {rulerTicks.map((t) => (
                      <span
                        key={t.idx}
                        className={`df-ruler-tick ${t.isMajor ? 'major' : t.isMedium ? 'medium' : 'minor'}`}
                        style={{ left: `${t.pct}%` }}
                      />
                    ))}
                  </div>

                  {/* Playhead with Circular Cap — 0% is exact center of first marker, 100% is exact center of last marker */}
                  <div
                    ref={playheadDomRef}
                    className="df-playhead-line"
                    style={{ left: `${playheadPercent}%` }}
                  >
                    <div className="df-playhead-cap" />
                  </div>

                  {/* Vertically Scrollable Track Lanes */}
                  <div className="df-tracks-lanes" data-lenis-prevent>
                    {animationTracks.map((track) => {
                      const leftPct = Math.max(0, Math.min(100, (track.startTime / duration) * 100));
                      const widthPct = Math.max(2, Math.min(100 - leftPct, ((track.endTime - track.startTime) / duration) * 100));
                      const isSelected = track.id === selectedTrackId;

                      return (
                        <div key={track.id} className="df-track-lane">
                          <div
                            className={`df-track-bar ${isSelected ? 'selected' : ''}`}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedTrackId(track.id);
                              setTrackContextMenu({
                                trackId: track.id,
                                x: e.clientX,
                                y: e.clientY
                              });
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const wasAlreadySelected = selectedTrackId === track.id;
                              if (!wasAlreadySelected) {
                                setSelectedTrackId(track.id);
                              }
                              setDraggingTrackBar({
                                id: track.id,
                                mode: 'move',
                                startX: e.clientX,
                                origStart: track.startTime,
                                origEnd: track.endTime,
                                wasAlreadySelected,
                                didMove: false
                              });
                            }}
                          >
                            <span
                              className={`df-track-handle left ${draggingTrackBar?.id === track.id && draggingTrackBar.mode === 'start' ? 'active' : ''}`}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedTrackId(track.id);
                                setDraggingTrackBar({
                                  id: track.id,
                                  mode: 'start',
                                  startX: e.clientX,
                                  origStart: track.startTime,
                                  origEnd: track.endTime,
                                  wasAlreadySelected: false,
                                  didMove: true
                                });
                              }}
                            >
                              <span className="df-track-handle-grip" />
                            </span>

                            <span className="df-track-bar-label">{track.label}</span>

                            <span
                              className={`df-track-handle right ${draggingTrackBar?.id === track.id && draggingTrackBar.mode === 'end' ? 'active' : ''}`}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedTrackId(track.id);
                                setDraggingTrackBar({
                                  id: track.id,
                                  mode: 'end',
                                  startX: e.clientX,
                                  origStart: track.startTime,
                                  origEnd: track.endTime,
                                  wasAlreadySelected: false,
                                  didMove: true
                                });
                              }}
                            >
                              <span className="df-track-handle-grip" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <span className="df-ruler-time-edge end">{formatTimecode(duration)}</span>
              </div>
            </div>
          </div>


          {trackContextMenu && (
            <div
              className="df-track-context-menu"
              style={{
                left: `${Math.min(window.innerWidth - 180, trackContextMenu.x)}px`,
                top: `${Math.min(window.innerHeight - 100, trackContextMenu.y)}px`
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="df-context-menu-item danger"
                onClick={() => {
                  removeAnimationTrack(trackContextMenu.trackId);
                  if (selectedTrackId === trackContextMenu.trackId) {
                    setSelectedTrackId(null);
                  }
                  setTrackContextMenu(null);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trash2 size={13} />
                  <span>Delete Track</span>
                </div>
                <span className="df-context-shortcut">Del</span>
              </button>
              <button
                type="button"
                className="df-context-menu-item"
                onClick={() => {
                  duplicateAnimationTrack(trackContextMenu.trackId);
                  setTrackContextMenu(null);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Copy size={13} />
                  <span>Duplicate</span>
                </div>
                <span className="df-context-shortcut">Ctrl+D</span>
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
};

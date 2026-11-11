import React, { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  useAppStore,
  AnimationCategory,
  EasingMode,
  ANIMATABLE_PROPERTIES,
  getDynamicStyleAnimatableProps
} from '../state/useAppStore';
import { Dropdown } from './common/Dropdown';
import { getStoredSettings, DitherForgeSettings } from './dialogs/SettingsDialog';
import { downsampleAreaGamma } from '../utils/areaDownsample';
// @ts-ignore
import { applyDitherAlgorithm } from '../dither-engine/algorithms.js';
import { EngineBridge } from '../services/EngineBridge';
import { applyTweaksFast, rotateHueHsvPixel } from '../utils/fastTweaks';
import { applyEffectPipeline } from '../effects';
// @ts-ignore
import { BUILTIN_PALETTES } from '../dither-engine/palettes.js';
import {
  UploadCloud,
  FolderOpen,
  Sparkles,
  MoveHorizontal,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Plus
} from 'lucide-react';

// Maximum memory budget for pre-rendered animation frames in "Rendered" mode: 128 MB
const MAX_RENDERED_CACHE_BYTES = 128 * 1024 * 1024;

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
      return clamped < 0.5 ? 0 : 1;
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

interface TrackNumInputProps {
  value: number;
  min?: number;
  step?: number;
  onChange: (val: number) => void;
}

const TrackNumInput: React.FC<TrackNumInputProps> = ({
  value,
  min,
  step,
  onChange
}) => {
  const [localText, setLocalText] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalText(String(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-" || /^-?\d*\.?\d*$/.test(raw)) {
      setLocalText(raw);
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && isFinite(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localText);
    if (isNaN(parsed) || !isFinite(parsed)) {
      setLocalText(String(value));
    } else {
      const finalVal = min !== undefined ? Math.max(min, parsed) : parsed;
      setLocalText(String(finalVal));
      onChange(finalVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const current = parseFloat(localText);
      const base = !isNaN(current) && isFinite(current) ? current : value;
      const mult = e.shiftKey ? 10 : 1;
      const delta = (step || 1) * mult;
      const next = Math.round((base + delta) * 10000) / 10000;
      const finalVal = min !== undefined ? Math.max(min, next) : next;
      setLocalText(String(finalVal));
      onChange(finalVal);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const current = parseFloat(localText);
      const base = !isNaN(current) && isFinite(current) ? current : value;
      const mult = e.shiftKey ? 10 : 1;
      const delta = (step || 1) * mult;
      const next = Math.round((base - delta) * 10000) / 10000;
      const finalVal = min !== undefined ? Math.max(min, next) : next;
      setLocalText(String(finalVal));
      onChange(finalVal);
    } else if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className="control-num-input"
      value={localText}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
};

function createScaledProxyImageData(source: ImageData, scale: number): ImageData {
  const targetW = Math.max(16, Math.round(source.width * scale));
  const targetH = Math.max(16, Math.round(source.height * scale));

  if (targetW >= source.width && targetH >= source.height) {
    return source;
  }

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = source.width;
  srcCanvas.height = source.height;
  const sCtx = srcCanvas.getContext("2d");
  if (!sCtx) return source;
  sCtx.putImageData(source, 0, 0);

  const proxyCanvas = document.createElement("canvas");
  proxyCanvas.width = targetW;
  proxyCanvas.height = targetH;
  const pCtx = proxyCanvas.getContext("2d");
  if (!pCtx) return source;
  pCtx.imageSmoothingEnabled = true;
  pCtx.drawImage(srcCanvas, 0, 0, targetW, targetH);

  return pCtx.getImageData(0, 0, targetW, targetH);
}

function downsampleBuffer(
  src: Uint8ClampedArray | Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  if (dstW * 2 === srcW && dstH * 2 === srcH) {
    for (let dy = 0; dy < dstH; dy++) {
      const row0 = dy * 2 * srcW * 4;
      const row1 = (dy * 2 + 1) * srcW * 4;
      const dstRow = dy * dstW * 4;
      for (let dx = 0; dx < dstW; dx++) {
        const sx = dx * 2;
        const i00 = row0 + sx * 4;
        const i01 = row0 + (sx + 1) * 4;
        const i10 = row1 + sx * 4;
        const i11 = row1 + (sx + 1) * 4;
        const dIdx = dstRow + dx * 4;
        dst[dIdx] = (src[i00] + src[i01] + src[i10] + src[i11]) >> 2;
        dst[dIdx + 1] = (src[i00 + 1] + src[i01 + 1] + src[i10 + 1] + src[i11 + 1]) >> 2;
        dst[dIdx + 2] = (src[i00 + 2] + src[i01 + 2] + src[i10 + 2] + src[i11 + 2]) >> 2;
        dst[dIdx + 3] = (src[i00 + 3] + src[i01 + 3] + src[i10 + 3] + src[i11 + 3]) >> 2;
      }
    }
    return dst;
  }
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;
  for (let dy = 0; dy < dstH; dy++) {
    const sy = Math.min(srcH - 1, Math.floor(dy * yRatio));
    const srcRow = sy * srcW * 4;
    const dstRow = dy * dstW * 4;
    for (let dx = 0; dx < dstW; dx++) {
      const sx = Math.min(srcW - 1, Math.floor(dx * xRatio));
      const sIdx = srcRow + sx * 4;
      const dIdx = dstRow + dx * 4;
      dst[dIdx] = src[sIdx];
      dst[dIdx + 1] = src[sIdx + 1];
      dst[dIdx + 2] = src[sIdx + 2];
      dst[dIdx + 3] = src[sIdx + 3];
    }
  }
  return dst;
}

function shiftRgbHue(r: number, g: number, b: number, deg: number): [number, number, number] {
  return rotateHueHsvPixel(r, g, b, deg);
}

// Reusable scratch buffer for viewport separable box blur to avoid per-frame allocations
let viewportBlurScratch: Uint8ClampedArray | null = null;

// Fast O(1)-per-pixel Sliding-Window Separable Box Blur + Denoise + Highlight pass on RGBA buffer
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

  // 2. Separable Box Blur + Denoise smoothing (O(1) sliding window per pixel)
  const totalBlur = Math.round(blurRadius + (denoiseStrength / 100) * 3);
  if (totalBlur >= 1 && width > 0 && height > 0) {
    const rad = Math.min(20, totalBlur);
    if (!viewportBlurScratch || viewportBlurScratch.length !== data.length) {
      viewportBlurScratch = new Uint8ClampedArray(data.length);
    }
    const temp = viewportBlurScratch;
    const blend = blurRadius > 0 ? 1.0 : Math.min(0.85, denoiseStrength / 100);

    // Horizontal pass with sliding window
    for (let y = 0; y < height; y++) {
      const rowOff = y * width * 4;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      const initX1 = Math.min(width - 1, rad);
      for (let k = 0; k <= initX1; k++) {
        const idx = rowOff + k * 4;
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
        count++;
      }

      for (let x = 0; x < width; x++) {
        const outIdx = rowOff + x * 4;
        temp[outIdx] = rSum / count;
        temp[outIdx + 1] = gSum / count;
        temp[outIdx + 2] = bSum / count;
        temp[outIdx + 3] = data[outIdx + 3];

        const removeX = x - rad;
        if (removeX >= 0) {
          const remIdx = rowOff + removeX * 4;
          rSum -= data[remIdx];
          gSum -= data[remIdx + 1];
          bSum -= data[remIdx + 2];
          count--;
        }
        const addX = x + rad + 1;
        if (addX < width) {
          const addIdx = rowOff + addX * 4;
          rSum += data[addIdx];
          gSum += data[addIdx + 1];
          bSum += data[addIdx + 2];
          count++;
        }
      }
    }

    // Vertical pass with sliding window
    const stride = width * 4;
    const invBlend = 1 - blend;
    for (let x = 0; x < width; x++) {
      const colOff = x * 4;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      const initY1 = Math.min(height - 1, rad);
      for (let k = 0; k <= initY1; k++) {
        const idx = k * stride + colOff;
        rSum += temp[idx];
        gSum += temp[idx + 1];
        bSum += temp[idx + 2];
        count++;
      }

      for (let y = 0; y < height; y++) {
        const outIdx = y * stride + colOff;
        const br = rSum / count;
        const bg = gSum / count;
        const bb = bSum / count;
        data[outIdx] = data[outIdx] * invBlend + br * blend;
        data[outIdx + 1] = data[outIdx + 1] * invBlend + bg * blend;
        data[outIdx + 2] = data[outIdx + 2] * invBlend + bb * blend;

        const removeY = y - rad;
        if (removeY >= 0) {
          const remIdx = removeY * stride + colOff;
          rSum -= temp[remIdx];
          gSum -= temp[remIdx + 1];
          bSum -= temp[remIdx + 2];
          count--;
        }
        const addY = y + rad + 1;
        if (addY < height) {
          const addIdx = addY * stride + colOff;
          rSum += temp[addIdx];
          gSum += temp[addIdx + 1];
          bSum += temp[addIdx + 2];
          count++;
        }
      }
    }
  }
}

export const CenterViewport: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timelineInnerRef = useRef<HTMLDivElement | null>(null);
  const timelineGroupRef = useRef<HTMLDivElement | null>(null);
  const playheadDomRef = useRef<HTMLDivElement | null>(null);
  const floatingEditorRef = useRef<HTMLDivElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrubRafRef = useRef<number | null>(null);
  const trackDragRafRef = useRef<number | null>(null);
  const lastRenderMsUpdateWallRef = useRef<number>(0);

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
  const paletteFlipped = useAppStore((state) => state.paletteFlipped);
  const paletteInverted = useAppStore((state) => state.paletteInverted);
  const effects = useAppStore((state) => state.effects);
  const previewPaletteId = useAppStore((state) => state.previewPaletteId);
  const savedPalettes = useAppStore((state) => state.savedPalettes);

  const previewQuality = useAppStore((state) => state.previewQuality);
  const viewportUpdateMode = useAppStore((state) => state.viewportUpdateMode);
  const appMode = useAppStore((state) => state.appMode);
  const setAppMode = useAppStore((state) => state.setAppMode);
  const videoPlaybackMode = useAppStore((state) => state.videoPlaybackMode);
  const videoRenderMode = useAppStore((state) => state.videoRenderMode);
  const previewMode = useAppStore((state) => state.previewMode ?? state.videoRenderMode);

  const hasConfiguredAnimation = useAppStore((state) => state.hasConfiguredAnimation);
  const setHasConfiguredAnimation = useAppStore((state) => state.setHasConfiguredAnimation);
  const isCreateAnimationPopupOpen = useAppStore((state) => state.isCreateAnimationPopupOpen);
  const setIsCreateAnimationPopupOpen = useAppStore((state) => state.setIsCreateAnimationPopupOpen);

  const isPlaying = useAppStore((state) => state.isPlaying);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const playbackSpeed = useAppStore((state) => state.playbackSpeed);
  const setPlaybackSpeed = useAppStore((state) => state.setPlaybackSpeed);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement | null>(null);
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
  const setIsDraggingSlider = useAppStore((state) => state.setIsDraggingSlider);
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

  const [highQualityZoom, setHighQualityZoom] = useState<boolean>(() => {
    return getStoredSettings().highQualityZoom !== false;
  });

  useEffect(() => {
    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<DitherForgeSettings>;
      if (customEvent.detail && typeof customEvent.detail.highQualityZoom === 'boolean') {
        setHighQualityZoom(customEvent.detail.highQualityZoom);
      } else {
        setHighQualityZoom(getStoredSettings().highQualityZoom !== false);
      }
    };
    window.addEventListener('ditherforge_settings_changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('ditherforge_settings_changed', handleSettingsChanged);
    };
  }, []);

  const isSmoothDownscale = highQualityZoom && zoom < 100;
  const imageRenderingValue = isSmoothDownscale ? 'auto' : 'pixelated';

  const [isDragOver, setIsDragOver] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panRef = useRef({ x: panX, y: panY });
  const rafIdRef = useRef<number | null>(null);
  const [isWheelZooming, setIsWheelZooming] = useState(false);
  const wheelZoomTimeoutRef = useRef<number | null>(null);
  const isRenderingFrameRef = useRef(false);
  const timecodeCurrentRef = useRef<HTMLSpanElement | null>(null);
  const lastRenderedFullImageRef = useRef<ImageData | null>(null);

  useEffect(() => {
    if (!isDraggingRef.current) {
      panRef.current = { x: panX, y: panY };
    }
  }, [panX, panY]);

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

  // Default markerZoomLevel = 3 => 16 intervals (17 markers: 5 major, 4 medium, 8 minor)
  const [markerZoomLevel, setMarkerZoomLevel] = useState<number>(3);
  const [popupFpsInput, setPopupFpsInput] = useState<string>('30');
  const [popupDurationInput, setPopupDurationInput] = useState<string>('15s');

  const lastRenderSignatureRef = useRef<string>('');
  // Pre-rendered frame cache for Video: "Rendered" mode (bounded by MAX_RENDERED_CACHE_BYTES)
  const renderedFramesCacheRef = useRef<Map<number, ImageData>>(new Map());
  const renderedCacheBytesRef = useRef<number>(0);
  // Cached pre-dither adjustments buffer to avoid full-resolution recomputation when only algorithm/style params animate
  const adjustedBaseBufferRef = useRef<Uint8ClampedArray | null>(null);
  const lastAdjustmentsSigRef = useRef<string>('');
  const executeRenderPipelineRef = useRef<(overrideTime?: number) => Promise<void> | void>(() => {});

  useEffect(() => {
    if (isCreateAnimationPopupOpen) {
      setPopupFpsInput(String(fps || 30));
      setPopupDurationInput(`${Math.round(duration || 15)}s`);
    }
  }, [isCreateAnimationPopupOpen, fps, duration]);

  // Invalidate pre-rendered frame cache when parameters or tracks change.
  // Note: adjustedBaseBufferRef is NOT cleared when animationTracks/algoParams/effects/palette change,
  // because adjustmentsSig inside executeRenderPipeline accurately tracks whether upstream adjustments changed!
  useEffect(() => {
    renderedFramesCacheRef.current.clear();
    renderedCacheBytesRef.current = 0;
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
    previewPaletteId,
    savedPalettes,
    paletteDepth,
    effects,
    videoRenderMode,
    previewQuality,
    animationTracks,
    duration,
    fps
  ]);

  // Only clear adjustedBaseBufferRef when actual source image dimensions/pixels change
  useEffect(() => {
    lastAdjustmentsSigRef.current = '';
    adjustedBaseBufferRef.current = null;
  }, [sourceImageData, sourceVideoUrl]);

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
    vid.preload = 'auto';

    // When an asynchronous video seek finishes, re-run the render pipeline so the new video frame is drawn
    const handleSeeked = () => {
      lastRenderSignatureRef.current = '';
      lastAdjustmentsSigRef.current = '';
      executeRenderPipelineRef.current();
    };
    vid.addEventListener('seeked', handleSeeked);
    videoElRef.current = vid;

    return () => {
      vid.removeEventListener('seeked', handleSeeked);
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

  // Close speed popover on outside click
  useEffect(() => {
    if (!isSpeedMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setIsSpeedMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleClickOutside, true);
    window.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      window.removeEventListener('pointerdown', handleClickOutside, true);
      window.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isSpeedMenuOpen]);

  // Time-based Playback Clock with Frame-Quantized Direct Render & Throttled Zustand Updates
  useEffect(() => {
    if (appMode !== 'animation' || !isPlaying) return;
    let lastTs = performance.now();
    let localTime = useAppStore.getState().currentTime;
    let lastStoreTime = localTime;
    let lastFrameIdx = Math.round(localTime * (useAppStore.getState().fps || 30));
    let animId: number;

    const tick = async (now: number) => {
      const state = useAppStore.getState();
      if (!state.isPlaying || state.appMode !== 'animation') return;

      // If external action (e.g., Home/End/Scrub) changed currentTime, resync local clock
      if (Math.abs(state.currentTime - lastStoreTime) > 0.0005) {
        localTime = state.currentTime;
      }

      // Clamp single-frame dt to 0.25s max so slow frames or background tabs don't jump wildly
      const rawDt = Math.max(0, (now - lastTs) / 1000);
      const dt = Math.min(0.25, rawDt);
      lastTs = now;

      const speed = state.playbackSpeed || 1;
      const dur = Math.max(0.1, state.duration || 15);
      const activeFps = Math.max(1, state.fps || 30);
      let nextTime = localTime + dt * speed;

      if (nextTime >= dur) {
        if (state.videoPlaybackMode === 'looped') {
          nextTime = nextTime % dur;
          localTime = nextTime;
          lastStoreTime = Number(nextTime.toFixed(4));
          lastFrameIdx = Math.round(nextTime * activeFps);
          if (playheadDomRef.current) {
            playheadDomRef.current.style.left = `${(nextTime / dur) * 100}%`;
          }
          if (timecodeCurrentRef.current) {
            timecodeCurrentRef.current.textContent = formatTimecode(nextTime);
          }
          state.setCurrentTime(lastStoreTime);
          animId = requestAnimationFrame(tick);
        } else {
          localTime = dur;
          lastStoreTime = dur;
          if (playheadDomRef.current) {
            playheadDomRef.current.style.left = '100%';
          }
          if (timecodeCurrentRef.current) {
            timecodeCurrentRef.current.textContent = formatTimecode(dur);
          }
          state.setCurrentTime(dur);
          state.setIsPlaying(false);
        }
        return;
      }

      localTime = nextTime;

      // Update playhead DOM position directly at display refresh rate (zero React overhead)
      if (playheadDomRef.current) {
        playheadDomRef.current.style.left = `${Math.max(0, Math.min(100, (nextTime / dur) * 100))}%`;
      }
      if (timecodeCurrentRef.current) {
        timecodeCurrentRef.current.textContent = formatTimecode(nextTime);
      }

      // Only execute frame dither if we crossed a discrete timeline frame boundary
      const nextFrameIdx = Math.round(nextTime * activeFps);
      if (nextFrameIdx !== lastFrameIdx) {
        lastFrameIdx = nextFrameIdx;

        // Guard against IPC pileup: if previous frame is still processing in Rust, skip frame tick
        if (!isRenderingFrameRef.current) {
          isRenderingFrameRef.current = true;
          try {
            await executeRenderPipelineRef.current(nextTime);
          } finally {
            isRenderingFrameRef.current = false;
          }
        }

        // Throttle React state updates to every 4th frame (~7-8 fps instead of 30-60 fps)
        if (nextFrameIdx % 4 === 0) {
          lastStoreTime = Number(nextTime.toFixed(4));
          state.setCurrentTime(lastStoreTime);
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      // Sync exact final time on pause
      useAppStore.getState().setCurrentTime(Number(localTime.toFixed(4)));
    };
  }, [appMode, isPlaying, videoPlaybackMode]);

  // Full Timeline Keyboard Controls (Space/K for Play/Pause, Arrows/J/L for Frames, Home/End, Up/Down for Tracks, T for Add Track)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appMode !== 'animation') return;

      const target = e.target as HTMLElement | null;

      // 1. Play / Pause (Space or K)
      // Must NOT scroll right sidebar; must toggle playback even when focused/cursor in timeline property popup or right sidebar
      if ((e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' || e.key.toLowerCase() === 'k') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const isEditingText = Boolean(
          target &&
          !target.closest('.df-floating-property-editor') &&
          (
            target.closest('.modal-dialog, .df-create-anim-dialog, .dialog-modal') ||
            (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text' && target.id === 'style-search-input') ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
          )
        );

        if (!isEditingText) {
          e.preventDefault();
          e.stopPropagation();
          togglePlay();
          return;
        }
      }

      // For non-Space timeline controls, ignore if focused inside inputs/textareas/selects
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

      if (!hasConfiguredAnimation) return;

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
      if (e.key === 'ArrowDown' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
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
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
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

  // Unified Pointer-Event Viewport Panning with Pointer Capture & RAF Compositing
  const handleViewportPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (
      selectedTrackId &&
      floatingEditorRef.current &&
      !floatingEditorRef.current.contains(e.target as Node) &&
      !timelineGroupRef.current?.contains(e.target as Node)
    ) {
      setSelectedTrackId(null);
    }
    if (e.button !== 0 && e.button !== 1) return;
    if (isDraggingSplitter) return;
    const targetEl = e.target instanceof Element ? e.target : (e.target as Node)?.parentElement;
    if (isElementUI(targetEl)) return;

    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  }, [isDraggingSplitter, selectedTrackId, setSelectedTrackId]);

  const handleViewportPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    panRef.current = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (stageRef.current) {
          const currentZoom = useAppStore.getState().zoom;
          stageRef.current.style.transform = 
            `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0) scale(${currentZoom / 100})`;
        }
        rafIdRef.current = null;
      });
    }
  }, []);

  const handleViewportPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (containerRef.current) {
      containerRef.current.style.cursor = '';
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    // Sync final position back to store once on release
    setPan(panRef.current.x, panRef.current.y);
  }, [setPan]);

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

      let unpannedStageCenterX: number;
      let unpannedStageCenterY: number;

      if (stageRef.current) {
        const stageRect = stageRef.current.getBoundingClientRect();
        unpannedStageCenterX = (stageRect.left + stageRect.width / 2) - state.panX;
        unpannedStageCenterY = (stageRect.top + stageRect.height / 2) - state.panY;
      } else {
        const rect = container.getBoundingClientRect();
        const padRight = state.sidebarWidth + 14;
        const padTop = 38;
        const padBottom = (state.appMode === 'animation' && state.hasConfiguredAnimation) ? 252 : 0;
        unpannedStageCenterX = rect.left + (rect.width - padRight) / 2;
        unpannedStageCenterY = rect.top + padTop + (rect.height - padTop - padBottom) / 2;
      }

      const cursorX = e.clientX - unpannedStageCenterX;
      const cursorY = e.clientY - unpannedStageCenterY;

      const zoomRatio = newZoom / state.zoom;
      const newPanX = Math.round(cursorX - (cursorX - state.panX) * zoomRatio);
      const newPanY = Math.round(cursorY - (cursorY - state.panY) * zoomRatio);

      setIsWheelZooming(true);
      if (wheelZoomTimeoutRef.current) {
        clearTimeout(wheelZoomTimeoutRef.current);
      }
      wheelZoomTimeoutRef.current = window.setTimeout(() => {
        setIsWheelZooming(false);
        wheelZoomTimeoutRef.current = null;
      }, 80);

      setZoom(newZoom);
      setPan(newPanX, newPanY);
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
      if (wheelZoomTimeoutRef.current) {
        clearTimeout(wheelZoomTimeoutRef.current);
      }
    };
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
  const proxyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const proxyCacheRef = useRef<{ source: ImageData; low: ImageData; mid: ImageData } | null>(null);
  const renderNonceRef = useRef<number>(0);
  const isRenderingRef = useRef<boolean>(false);
  const pendingRenderRef = useRef<boolean>(false);

  const executeRenderPipeline = useCallback(async (overrideTime?: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImageData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isRenderingRef.current) {
      pendingRenderRef.current = true;
      return;
    }
    isRenderingRef.current = true;

    try {
      const currentNonce = ++renderNonceRef.current;

    const fullWidth = sourceImageData.width;
    const fullHeight = sourceImageData.height;

    if (canvas.width !== fullWidth || canvas.height !== fullHeight) {
      canvas.width = fullWidth;
      canvas.height = fullHeight;
    }

    const activeTime = typeof overrideTime === 'number' ? overrideTime : useAppStore.getState().currentTime;

    // Video: "Rendered" vs "Quick" behavior
    // In "Rendered" mode, frames are pre-rendered at full resolution and cached by frame index with LRU byte eviction!
    const frameIndex = appMode === 'animation' ? Math.round(activeTime * fps) : 0;
    if (appMode === 'animation' && videoRenderMode === 'rendered' && !showBeforeAfter && !isOriginalView && !sourceVideoUrl) {
      const cache = renderedFramesCacheRef.current;
      const cachedFrame = cache.get(frameIndex);
      if (cachedFrame && cachedFrame.width === fullWidth && cachedFrame.height === fullHeight) {
        // Refresh LRU order
        cache.delete(frameIndex);
        cache.set(frameIndex, cachedFrame);
        ctx.putImageData(cachedFrame, 0, 0);
        lastRenderedFullImageRef.current = cachedFrame;
        return;
      }
    }

    const isQuick = appMode === 'animation' && (videoRenderMode === 'quick' || previewMode === 'quick') && isPlaying;
    let effectiveQuality = previewQuality;
    if (appMode === 'animation' && (videoRenderMode === 'rendered' || previewMode === 'rendered')) {
      effectiveQuality = 'full';
    }

    // If a video source is active, grab current video frame if ready
    let activeBaseImage = sourceImageData;
    if (sourceVideoUrl && videoElRef.current && videoElRef.current.readyState >= 2) {
      const vid = videoElRef.current;
      const targetVidTime = activeTime % (vid.duration || duration || 1);
      if (!vid.seeking && Math.abs(vid.currentTime - targetVidTime) > 0.04) {
        vid.currentTime = targetVidTime;
      }
      if (!videoCanvasRef.current) {
        videoCanvasRef.current = document.createElement('canvas');
      }
      const vCan = videoCanvasRef.current;
      let targetW = fullWidth;
      let targetH = fullHeight;
      if (effectiveQuality === 'low') {
        const s = Math.min(0.25, 640 / Math.max(fullWidth, fullHeight));
        targetW = Math.max(16, Math.round(fullWidth * s));
        targetH = Math.max(16, Math.round(fullHeight * s));
      } else if (effectiveQuality === 'mid') {
        const s = Math.min(0.50, 1280 / Math.max(fullWidth, fullHeight));
        targetW = Math.max(16, Math.round(fullWidth * s));
        targetH = Math.max(16, Math.round(fullHeight * s));
      }
      if (vCan.width !== targetW || vCan.height !== targetH) {
        vCan.width = targetW;
        vCan.height = targetH;
      }
      const vCtx = vCan.getContext('2d', { willReadFrequently: true });
      if (vCtx) {
        vCtx.clearRect(0, 0, targetW, targetH);
        vCtx.drawImage(vid, 0, 0, targetW, targetH);
        activeBaseImage = vCtx.getImageData(0, 0, targetW, targetH);
      }
    }

    let renderSource = activeBaseImage;
    if (isQuick) {
      const qW = Math.max(1, Math.round(activeBaseImage.width * 0.5));
      const qH = Math.max(1, Math.round(activeBaseImage.height * 0.5));
      const downBuf = downsampleBuffer(activeBaseImage.data, activeBaseImage.width, activeBaseImage.height, qW, qH);
      renderSource = new ImageData(downBuf, qW, qH);
    } else if (!sourceVideoUrl) {
      if (!proxyCacheRef.current || proxyCacheRef.current.source !== activeBaseImage) {
        const lowScale = Math.min(0.25, 640 / Math.max(fullWidth, fullHeight));
        const midScale = Math.min(0.50, 1280 / Math.max(fullWidth, fullHeight));
        proxyCacheRef.current = {
          source: activeBaseImage,
          low: createScaledProxyImageData(activeBaseImage, lowScale),
          mid: createScaledProxyImageData(activeBaseImage, midScale)
        };
      }
      if (effectiveQuality === 'low' && proxyCacheRef.current) {
        renderSource = proxyCacheRef.current.low;
      } else if (effectiveQuality === 'mid' && proxyCacheRef.current) {
        renderSource = proxyCacheRef.current.mid;
      }
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
    const effEffects = isQuick ? [] : effects.map((e) => ({ ...e, params: { ...e.params } }));
    let animatedNoiseActive = false;

    if (appMode === 'animation') {
      for (const track of animationTracks) {
        if (!track.category || !track.property) continue;
        if (activeTime >= track.startTime && activeTime <= track.endTime) {
          const span = Math.max(0.001, track.endTime - track.startTime);
          const rawProgress = (activeTime - track.startTime) / span;
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

    const paletteSig =
      (previewPaletteId || '') +
      ':' +
      (workingPalette?.length || 0) +
      ':' +
      (effPaletteDepth || 0) +
      ':' +
      effPaletteHueShift.toFixed(2) +
      ':' +
      effPaletteCycle +
      ':' +
      paletteFlipped +
      ':' +
      paletteInverted;

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
      sourceVideoUrl ? Math.round(activeTime * 30) : '',
      appMode === 'animation' ? frameIndex : (animatedNoiseActive ? frameIndex : '')
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

    // Avoid unnecessary full-resolution recomputation:
    // If only Threshold or algorithm/style/effect params are changing, reuse the pre-dither adjusted buffer!
    const adjustmentsSig = [
      width,
      height,
      sourceVideoUrl
        ? activeTime.toFixed(2)
        : sourceImageData.data[0] + '_' + sourceImageData.data[Math.min(100, len - 1)],
      effBrightness.toFixed(3),
      effContrast.toFixed(3),
      effSaturation.toFixed(3),
      effHue.toFixed(3),
      effGamma.toFixed(3),
      effBlur.toFixed(3),
      effDenoise.toFixed(3),
      effHighlight.toFixed(3)
    ].join('::');

    const t0 = performance.now();

    if (
      adjustedBaseBufferRef.current &&
      adjustedBaseBufferRef.current.length === len &&
      lastAdjustmentsSigRef.current === adjustmentsSig
    ) {
      // Unaffected intermediate processing result reused!
      workBufferRef.current.set(adjustedBaseBufferRef.current);
    } else {
      if (!adjustedBaseBufferRef.current || adjustedBaseBufferRef.current.length !== len) {
        adjustedBaseBufferRef.current = new Uint8ClampedArray(len);
      }
      adjustedBaseBufferRef.current.set(renderSource.data);

      applyTweaksFast(adjustedBaseBufferRef.current, width, height, {
        brightness: effBrightness / 100,
        contrast: effContrast / 100,
        saturation: effSaturation / 100,
        gamma: effGamma,
        hue: effHue
      });

      if (effBlur > 0 || effDenoise > 0 || effHighlight !== 0) {
        applyExtendedAdjustments(
          adjustedBaseBufferRef.current,
          width,
          height,
          effBlur,
          effDenoise,
          effHighlight
        );
      }

      lastAdjustmentsSigRef.current = adjustmentsSig;
      workBufferRef.current.set(adjustedBaseBufferRef.current);
    }

    const workingData = workBufferRef.current;

    const activeNoiseVal = Number(effAlgoParams.noiseAmount ?? effAlgoParams.noise ?? 0);
    if ((animatedNoiseActive || activeNoiseVal > 0) && activeNoiseVal > 0) {
      const seedOffset = animatedNoiseActive && appMode === 'animation' ? frameIndex * 1337 : 42;
      const amp = activeNoiseVal * 110;
      for (let i = 0; i < len; i += 4) {
        const hash = Math.sin((i >> 2) * 12.9898 + seedOffset) * 43758.5453;
        const n = (hash - Math.floor(hash) - 0.5) * amp;
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
        base =
          workingPalette && workingPalette.length > 0 ? workingPalette : BUILTIN_PALETTES[0].colors;
      }
      let sliced = base.slice(
        0,
        Math.max(2, Math.min(effPaletteDepth || base.length, base.length))
      );
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

    const bridgeResult = await EngineBridge.dither(ditherImageData, {
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
      temporalSeed: animatedNoiseActive && appMode === 'animation' ? frameIndex : 0,
      offsetX: effAlgoParams.offsetX ?? 0,
      offsetY: effAlgoParams.offsetY ?? 0
    });

    if (currentNonce !== renderNonceRef.current) {
      return;
    }

    applyEffectPipeline(ditherImageData, effEffects, {
      frameIndex,
      time: currentTime,
      fps
    });

    const elapsedMs = performance.now() - t0;
    const nowWall = performance.now();
    // Throttle Zustand store updates of lastRenderMs during active playback/scrubbing to avoid TopMenuBar re-render storms
    if (!isPlaying && !isScrubbingTimeline) {
      lastRenderMsUpdateWallRef.current = nowWall;
      setLastRenderMs(elapsedMs);
      useAppStore.getState().setActiveBackend(bridgeResult.backend);
      useAppStore.getState().setBackendError(EngineBridge.lastError);
    } else if (nowWall - lastRenderMsUpdateWallRef.current >= 200) {
      lastRenderMsUpdateWallRef.current = nowWall;
      setLastRenderMs(elapsedMs);
      useAppStore.getState().setActiveBackend(bridgeResult.backend);
      useAppStore.getState().setBackendError(EngineBridge.lastError);
    }

    // Store in Rendered frame cache when Video: Rendered mode is active (strictly bounded to 128 MB)
    if (
      appMode === 'animation' &&
      videoRenderMode === 'rendered' &&
      width === fullWidth &&
      height === fullHeight &&
      !sourceVideoUrl
    ) {
      const frameBytes = len;
      if (frameBytes <= MAX_RENDERED_CACHE_BYTES) {
        const cache = renderedFramesCacheRef.current;
        if (cache.has(frameIndex)) {
          cache.delete(frameIndex);
          renderedCacheBytesRef.current = Math.max(0, renderedCacheBytesRef.current - frameBytes);
        }
        while (
          cache.size > 0 &&
          (renderedCacheBytesRef.current + frameBytes > MAX_RENDERED_CACHE_BYTES || cache.size >= 360)
        ) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey === undefined) break;
          const evicted = cache.get(oldestKey);
          cache.delete(oldestKey);
          if (evicted) {
            renderedCacheBytesRef.current = Math.max(
              0,
              renderedCacheBytesRef.current - evicted.data.byteLength
            );
          }
        }
        cache.set(
          frameIndex,
          new ImageData(new Uint8ClampedArray(ditherImageData.data), fullWidth, fullHeight)
        );
        renderedCacheBytesRef.current += frameBytes;
      }
    }

    const drawToCanvas = (imgData: ImageData) => {
      if (width === fullWidth && height === fullHeight) {
        lastRenderedFullImageRef.current = imgData;
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
          lastRenderedFullImageRef.current = ctx.getImageData(0, 0, fullWidth, fullHeight);
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
        for (let x = splitX; x < width; x++) {
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
  } finally {
    isRenderingRef.current = false;
    if (pendingRenderRef.current) {
      pendingRenderRef.current = false;
      requestAnimationFrame(() => {
        executeRenderPipelineRef.current();
      });
    }
  }
  }, [
    sourceImageData,
    sourceVideoUrl,
    previewQuality,
    appMode,
    videoRenderMode,
    previewMode,
    isPlaying,
    isScrubbingTimeline,
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

  executeRenderPipelineRef.current = executeRenderPipeline;

  useEffect(() => {
    if (!sourceImageData) return;
    if (isPlaying) return; // Dedicated animation loop drives playback ticks directly
    if (viewportUpdateMode === 'debounce' && !isScrubbingTimeline) {
      if (isDraggingSlider) return;
      const timer = window.setTimeout(() => {
        executeRenderPipeline();
      }, 140);
      return () => clearTimeout(timer);
    }
    if (isDraggingSlider) {
      let rafId = requestAnimationFrame(() => {
        executeRenderPipeline();
      });
      return () => cancelAnimationFrame(rafId);
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

  // Default markerZoomLevel = 3 => 16 subdivisions (17 ticks total: 5 major, 4 medium, 8 minor)
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
  const updateScrubFromClientX = useCallback((clientX: number, disableClip = false, flushImmediate = false) => {
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
      scrubRafRef.current = null;
    }
    if (flushImmediate) {
      setCurrentTime(nextTime);
    } else {
      scrubRafRef.current = requestAnimationFrame(() => {
        setCurrentTime(nextTime);
        scrubRafRef.current = null;
      });
    }
  }, [duration, subdivisions, setCurrentTime]);

  useEffect(() => {
    if (!isScrubbingTimeline) return;
    const onMove = (e: MouseEvent) => updateScrubFromClientX(e.clientX, e.shiftKey, false);
    const onUp = (e: MouseEvent) => {
      updateScrubFromClientX(e.clientX, e.shiftKey, true);
      setIsScrubbingTimeline(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (scrubRafRef.current !== null) {
        cancelAnimationFrame(scrubRafRef.current);
        scrubRafRef.current = null;
      }
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

  // Track Bar Dragging, Resizing & Click-to-Close Toggle (rAF-coalesced to avoid excessive store mutations)
  useEffect(() => {
    if (!draggingTrackBar) return;
    setIsDraggingSlider(true);
    let pendingClientX = draggingTrackBar.startX;
    let pendingShiftKey = false;

    const applyDragUpdate = (clientX: number, shiftKey: boolean) => {
      const el = timelineInnerRef.current;
      if (!el) return;
      const dx = clientX - draggingTrackBar.startX;
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
        nextStart = snapTimeValue(nextStart, draggingTrackBar.id, shiftKey);
        nextStart = Math.max(0, Math.min(duration - len, nextStart));
        updateAnimationTrack(draggingTrackBar.id, {
          startTime: Number(nextStart.toFixed(2)),
          endTime: Number((nextStart + len).toFixed(2))
        });
      } else if (draggingTrackBar.mode === 'start') {
        const rawStart = Math.max(0, Math.min(draggingTrackBar.origEnd - minSpan, draggingTrackBar.origStart + dt));
        const snappedStart = Math.max(0, Math.min(draggingTrackBar.origEnd - minSpan, snapTimeValue(rawStart, draggingTrackBar.id, shiftKey)));
        updateAnimationTrack(draggingTrackBar.id, { startTime: snappedStart });
      } else if (draggingTrackBar.mode === 'end') {
        const rawEnd = Math.min(duration, Math.max(draggingTrackBar.origStart + minSpan, draggingTrackBar.origEnd + dt));
        const snappedEnd = Math.min(duration, Math.max(draggingTrackBar.origStart + minSpan, snapTimeValue(rawEnd, draggingTrackBar.id, shiftKey)));
        updateAnimationTrack(draggingTrackBar.id, { endTime: snappedEnd });
      }
    };

    const onMove = (e: MouseEvent) => {
      pendingClientX = e.clientX;
      pendingShiftKey = e.shiftKey;
      if (trackDragRafRef.current === null) {
        trackDragRafRef.current = requestAnimationFrame(() => {
          trackDragRafRef.current = null;
          applyDragUpdate(pendingClientX, pendingShiftKey);
        });
      }
    };

    const onUp = (e: MouseEvent) => {
      if (trackDragRafRef.current !== null) {
        cancelAnimationFrame(trackDragRafRef.current);
        trackDragRafRef.current = null;
        applyDragUpdate(e.clientX, e.shiftKey);
      }
      const moved = Math.abs(e.clientX - draggingTrackBar.startX) > 3 || draggingTrackBar.didMove;
      if (!moved && draggingTrackBar.mode === 'move' && draggingTrackBar.wasAlreadySelected) {
        setSelectedTrackId(null);
      }
      setDraggingTrackBar(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      setIsDraggingSlider(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (trackDragRafRef.current !== null) {
        cancelAnimationFrame(trackDragRafRef.current);
        trackDragRafRef.current = null;
      }
    };
  }, [draggingTrackBar, duration, snapTimeValue, updateAnimationTrack, setSelectedTrackId, setIsDraggingSlider]);

  const selectedTrack = animationTracks.find((t) => t.id === selectedTrackId) || null;
  const playheadPercent = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;

  const activeCat: AnimationCategory = selectedTrack?.category || 'style';
  const selectedPropList = useMemo(() => {
    if (activeCat === 'style') return dynamicStyleProps;
    return ANIMATABLE_PROPERTIES[activeCat] || ANIMATABLE_PROPERTIES.adjustments;
  }, [activeCat, dynamicStyleProps]);

  const selectedPropMeta = selectedTrack?.property
    ? selectedPropList.find((p) => p.id === selectedTrack.property) || { min: 0, max: 1, step: 0.05 }
    : { min: 0, max: 1, step: 0.05 };

  const effectiveMax = selectedTrack
    ? Math.max(selectedPropMeta.max, selectedTrack.fromValue, selectedTrack.toValue)
    : selectedPropMeta.max;
  const effectiveMin = selectedTrack && selectedPropMeta.min !== undefined
    ? Math.min(selectedPropMeta.min, selectedTrack.fromValue, selectedTrack.toValue)
    : (selectedPropMeta.min ?? 0);

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
        className={`canvas-area ${appMode === 'animation' && hasConfiguredAnimation ? 'animation-active' : ''}`}
        style={{
          cursor: isDraggingSplitter ? 'ew-resize' : 'default'
        }}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerCancel={handleViewportPointerUp}
        onDragStart={(e) => e.preventDefault()}
      >
        {!hasImage || !sourceImageData ? (
          <div className={`viewport-dropzone-card ${isDragOver ? 'drag-active' : ''}`}>
            <div className="viewport-dropzone-icon-ring">
              <UploadCloud size={28} strokeWidth={2.2} />
            </div>
            <div className="viewport-dropzone-heading">Drop Image or Video Here</div>
            <div className="viewport-dropzone-sub">
              Drag and drop any media to begin dithering, or select a source below
            </div>
            <div className="viewport-dropzone-actions">
              <button className="viewport-dropzone-btn primary" onClick={() => fileInputRef.current?.click()}>
                <FolderOpen size={14} /> Open Media
              </button>
              <button className="viewport-dropzone-btn secondary" onClick={loadSampleImage}>
                <Sparkles size={14} /> Calibration Pattern
              </button>
            </div>
            <div className="viewport-dropzone-formats">
              <span className="format-tag">PNG</span>
              <span className="format-tag">JPG</span>
              <span className="format-tag">WebP</span>
              <span className="format-tag">GIF</span>
              <span className="format-tag">MP4</span>
              <span className="format-tag">WebM</span>
            </div>
          </div>
        ) : (
          <div
            ref={stageRef}
            className={`canvas-unframed-stage ${isSmoothDownscale ? 'smooth-downscale' : ''}`}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={{
              position: 'relative',
              display: 'inline-block',
              transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom / 100})`,
              transformOrigin: 'center center',
              transition: isWheelZooming ? 'transform 0.05s ease-out' : 'none',
              willChange: 'transform',
              userSelect: 'none'
            }}
          >
            <canvas
              ref={canvasRef}
              id="mainViewportCanvas"
              className="preview-canvas"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{
                display: 'block',
                imageRendering: isSmoothDownscale ? 'auto' : 'pixelated'
              }}
            />
            {!isOriginalView && showBeforeAfter && canvasRef.current && (
              <>
                <div
                  className="compare-badge dithered before"
                  style={{
                    '--compare-badge-scale': 100 / Math.max(50, zoom)
                  } as React.CSSProperties}
                >
                  Dithered
                </div>
                <div
                  className="compare-badge original after"
                  style={{
                    '--compare-badge-scale': 100 / Math.max(50, zoom)
                  } as React.CSSProperties}
                >
                  Original
                </div>
                <div
                  className={`split-divider-overlay ${isDraggingSplitter ? 'dragging' : ''}`}
                  style={{
                    left: `${splitRatio * 100}%`,
                    '--split-handle-scale': 100 / Math.max(50, Math.min(200, zoom))
                  } as React.CSSProperties}
                  onMouseDown={(e) => { e.stopPropagation(); setIsDraggingSplitter(true); }}
                >
                  <div className="split-handle" title="Drag to compare before and after">
                    <svg
                      width="20"
                      height="48"
                      viewBox="0 0 20 48"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="split-handle-svg"
                    >
                      <rect
                        x="0.75"
                        y="0.75"
                        width="18.5"
                        height="46.5"
                        rx="9.25"
                        className="split-handle-bg"
                      />
                      {/* Serpentine Error Diffusion Signature Curve */}
                      <path
                        d="M12 17 C 7 20, 7 22, 10 24 C 13 26, 13 28, 8 31"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="split-handle-curve"
                      />
                    </svg>
                  </div>
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
                onContextMenu={() => {
                  setSelectedTrackId(selectedTrack.id);
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
                      { id: 'style', label: 'Styles' },
                      { id: 'adjustments', label: 'Adjustments' },
                      { id: 'palette', label: 'Colour Palette' },
                      { id: 'effects', label: 'Effects Stack' }
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
                      const cat: AnimationCategory = selectedTrack.category || 'style';
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

                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <span className="df-editor-label">From</span>
                  </div>
                  <div className="slider-track-input-row">
                    <input
                      type="range"
                      className="control-slider"
                      min={effectiveMin}
                      max={effectiveMax}
                      step={selectedPropMeta.step}
                      value={selectedTrack.fromValue}
                      style={getSliderFill(selectedTrack.fromValue, effectiveMin, effectiveMax)}
                      onPointerDown={() => setIsDraggingSlider(true)}
                      onPointerUp={() => setIsDraggingSlider(false)}
                      onChange={(e) => updateAnimationTrack(selectedTrack.id, { fromValue: parseFloat(e.target.value) })}
                    />
                    <TrackNumInput
                      key={`${selectedTrack.id}-${selectedTrack.property}-from`}
                      value={selectedTrack.fromValue}
                      min={selectedPropMeta.min}
                      step={selectedPropMeta.step}
                      onChange={(val) => updateAnimationTrack(selectedTrack.id, { fromValue: val })}
                    />
                  </div>
                </div>

                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <span className="df-editor-label">To</span>
                  </div>
                  <div className="slider-track-input-row">
                    <input
                      type="range"
                      className="control-slider"
                      min={effectiveMin}
                      max={effectiveMax}
                      step={selectedPropMeta.step}
                      value={selectedTrack.toValue}
                      style={getSliderFill(selectedTrack.toValue, effectiveMin, effectiveMax)}
                      onPointerDown={() => setIsDraggingSlider(true)}
                      onPointerUp={() => setIsDraggingSlider(false)}
                      onChange={(e) => updateAnimationTrack(selectedTrack.id, { toValue: parseFloat(e.target.value) })}
                    />
                    <TrackNumInput
                      key={`${selectedTrack.id}-${selectedTrack.property}-to`}
                      value={selectedTrack.toValue}
                      min={selectedPropMeta.min}
                      step={selectedPropMeta.step}
                      onChange={(val) => updateAnimationTrack(selectedTrack.id, { toValue: val })}
                    />
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
                    <span ref={timecodeCurrentRef} className="df-timecode-current">{formatTimecode(currentTime)}</span>
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
                    <div className="df-speed-control-wrap" ref={speedMenuRef}>
                      <button
                        type="button"
                        className={`df-transport-btn df-speed-btn ${playbackSpeed !== 1 ? 'speed-active' : ''}`}
                        onClick={() => setIsSpeedMenuOpen((prev) => !prev)}
                        title="Playback Speed"
                        aria-label={`Playback Speed: ${playbackSpeed}x`}
                      >
                        <span className="df-speed-val-text">{playbackSpeed}x</span>
                      </button>
                      {isSpeedMenuOpen && (
                        <div className="df-speed-popover" role="menu">
                          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              className={`df-speed-popover-item ${playbackSpeed === spd ? 'active' : ''}`}
                              onClick={() => {
                                setPlaybackSpeed(spd);
                                setIsSpeedMenuOpen(false);
                              }}
                            >
                              <span>{spd}x</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                  updateScrubFromClientX(e.clientX, e.shiftKey, false);
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
                            onContextMenu={() => {
                              setSelectedTrackId(track.id);
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
        </>
      )}
    </main>
  );
};
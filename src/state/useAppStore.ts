import { create } from 'zustand';
// @ts-ignore
import { ALGORITHM_REGISTRY } from '../dither-engine/algorithms.js';
// @ts-ignore
import { BUILTIN_PALETTES, extractPaletteMedianCut, extractPaletteKMeans } from '../dither-engine/palettes.js';
// @ts-ignore
import { AVAILABLE_EFFECT_TYPES } from '../dither-engine/effect-stack.js';
import { ALL_EFFECTS, getAllEffects, getEffectDescriptor, resolveEffectId, BlendMode } from '../effects';
import { createCalibrationPattern } from '../utils/samplePattern';
import { historyManager } from './historyManager';

export type PreviewQuality = 'low' | 'mid' | 'full';
export type ViewportUpdateMode = 'live' | 'debounce';
export type AppMode = 'still' | 'animation';
export type VideoPlaybackMode = 'standard' | 'looped';
export type VideoRenderMode = 'quick' | 'rendered';
export type UpdateMode = 'precise' | 'live' | 'settle';
export type AnimationCategory = 'adjustments' | 'style' | 'effects' | 'palette';
export type EasingMode = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'pulse' | 'step';

export interface AnimationTrack {
  id: string;
  category: AnimationCategory | null;
  property: string | null;
  label: string;
  startTime: number;
  endTime: number;
  fromValue: number;
  toValue: number;
  easing: EasingMode;
}

export interface AlgoParams {
  threshold: number;
  scale: number;
  diffusionStrength: number;
  serpentine: boolean;
  noiseAmount: number;
  [key: string]: any;
}

export interface EffectItem {
  id: string;
  type: string;
  name?: string;
  enabled: boolean;
  params: Record<string, any>;
  opacity?: number;
  blendMode?: BlendMode;
}

const DEFAULT_ALGO_PARAMS_TABLE: Record<string, Partial<AlgoParams>> = {
  floyd_steinberg: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  atkinson: { threshold: 0.5, scale: 1.0, diffusionStrength: 0.75, serpentine: true, noiseAmount: 0.0 },
  jarvis_judice_ninke: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  stucki: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  burkes: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  sierra_3: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  sierra_2: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  sierra_lite: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  stevenson_arce: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  fan: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  shiau_fan: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  shiau_fan_2: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  false_floyd_steinberg: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.0 },
  minimized_avg_error: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  dynamic_serpentine: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.0 },
  bayer_2x2: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.0 },
  bayer_4x4: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.0 },
  bayer_8x8: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.0 },
  bayer_16x16: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.0 },
  clustered_dot: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.0 }
};

export const getInitialAlgoParams = (id: string): AlgoParams => {
  const norm = (id || '').replace(/_/g, '-');
  const snake = (id || '').replace(/-/g, '_');
  const specific = DEFAULT_ALGO_PARAMS_TABLE[id] || DEFAULT_ALGO_PARAMS_TABLE[norm] || DEFAULT_ALGO_PARAMS_TABLE[snake] || {};
  const algo = ALGORITHM_REGISTRY.find((a: any) => a.id === id || a.id === norm);
  const cat = algo?.category || '';
  const isDiff = cat === 'error_diffusion' || cat === 'glitch_effects';
  const customDefaults: Record<string, any> = {};
  if (algo?.controls && Array.isArray(algo.controls)) {
    for (const ctrl of algo.controls) {
      if (ctrl.id && ctrl.defaultValue !== undefined) {
        customDefaults[ctrl.id] = ctrl.defaultValue;
      }
    }
  }
  return {
    threshold: specific.threshold ?? 0.5,
    scale: specific.scale ?? 1.0,
    diffusionStrength: specific.diffusionStrength ?? 1.0,
    serpentine: specific.serpentine ?? isDiff,
    noiseAmount: specific.noiseAmount ?? 0.0,
    ...customDefaults
  };
};

const buildInitialAlgoParamsMap = (): Record<string, AlgoParams> => {
  const map: Record<string, AlgoParams> = {};
  for (const algo of ALGORITHM_REGISTRY) {
    map[algo.id] = getInitialAlgoParams(algo.id);
  }
  return map;
};

const buildInitialEffects = (): EffectItem[] => {
  return getAllEffects().map((eff) => ({
    id: eff.id,
    type: eff.id,
    name: eff.name,
    enabled: false,
    params: { ...eff.defaultParams },
    opacity: eff.defaultOpacity !== undefined ? eff.defaultOpacity : 1.0,
    blendMode: eff.defaultBlendMode || 'normal'
  }));
};

export interface AnimatablePropDef {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultFrom: number;
  defaultTo: number;
  effectId?: string;
  paramKey?: string;
}

const buildEffectsAnimatableProps = (): AnimatablePropDef[] => {
  const list: AnimatablePropDef[] = [];
  for (const eff of getAllEffects()) {
    if (eff.id === 'inverse_glow' || eff.id === 'inverse_vignette') continue;
    const defParams = eff.defaultParams || {};
    const displayName = eff.name;
    for (const [key, val] of Object.entries(defParams)) {
      if (typeof val !== 'number') continue;
      let min = 0, max = 1, step = 0.05, defaultFrom = 0, defaultTo = 1;
      if (key === 'intensity' || key === 'highlightStrength' || key === 'shadowStrength') { min = 0; max = 2; step = 0.05; defaultFrom = 0; defaultTo = 1.2; }
      else if (key === 'radius') { min = 1; max = 30; step = 1; defaultFrom = 2; defaultTo = 16; }
      else if (key === 'dotSize' || key === 'thickness' || key === 'blockSize' || key === 'pitch' || key === 'size') { min = 1; max = 20; step = 1; defaultFrom = 1; defaultTo = 10; }
      else if (key === 'angle') { min = 0; max = 360; step = 1; defaultFrom = 0; defaultTo = 180; }
      else if (key === 'offsetX' || key === 'offsetY') { min = 0; max = 20; step = 1; defaultFrom = 0; defaultTo = 12; }
      else if (key === 'gamma') { min = 0.1; max = 3.0; step = 0.05; defaultFrom = 0.8; defaultTo = 2.0; }
      else if (key === 'amount') { min = -1.0; max = 1.0; step = 0.05; defaultFrom = -0.5; defaultTo = 0.5; }
      const prettyParam = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      list.push({
        id: `${eff.id}.${key}`,
        label: `${displayName}: ${prettyParam}`,
        min,
        max,
        step,
        defaultFrom,
        defaultTo,
        effectId: eff.id,
        paramKey: key
      });
    }
  }
  return list;
};

// Dynamically build animatable Style properties for the active algorithm + always include Noise Amount!
export const getDynamicStyleAnimatableProps = (algorithmId: string): AnimatablePropDef[] => {
  const norm = (algorithmId || '').replace(/_/g, '-');
  const algo = ALGORITHM_REGISTRY.find((a: any) => a.id === algorithmId || a.id === norm);
  if (!algo || norm === 'none') {
    return [
      { id: 'noiseAmount', label: 'Noise Amount', min: 0, max: 1, step: 0.05, defaultFrom: 0.0, defaultTo: 0.6 }
    ];
  }

  const list: AnimatablePropDef[] = [];

  const DEDICATED_SCALE_CONTROLS = [
    'dotSize', 'blockSize', 'checkersSize', 'lineSpacing', 'period',
    'dotScale', 'cellSize', 'divisor', 'lineDensity', 'waveFrequency',
    'modulationFrequency', 'frequency', 'waveDensity'
  ];
  const hasDedicatedScaleControl = Boolean(
    algo.controls?.some((c: any) => DEDICATED_SCALE_CONTROLS.includes(c.id))
  );
  const supportsScale =
    algo.features?.supportsDpiScale !== false &&
    norm !== 'color-separation' &&
    !hasDedicatedScaleControl;

  const isErrorDiff = algo.category === 'error_diffusion';
  const isGlitch = algo.category === 'glitch_effects';
  const nonDiffGlitch = ['artifact-modulation-glitch', 'glitch', 'ordered-modulation'].includes(norm);
  const orbDiffusion = ['orb-diffuse', 'orb-diffuse-x', 'orb-diffuse-y'].includes(norm);

  const hasErrorStrength =
    isErrorDiff ||
    (isGlitch && !nonDiffGlitch) ||
    orbDiffusion ||
    Boolean(algo.controls?.some((c: any) => ['errorStrength', 'errorReduction', 'strength'].includes(c.id)));

  const hasColorDepth = Boolean(
    norm === 'bit_crush' ||
    (algo.features?.supportsColorDepth && algo.controls?.some((c: any) => c.id === 'depth' || c.id === 'colorDepth'))
  );

  if (hasColorDepth) {
    list.push({ id: 'depth', label: 'Color Depth', min: 1, max: 32, step: 1, defaultFrom: 2, defaultTo: 16 });
  }
  if (algo.features?.supportsLuminanceThreshold !== false && norm !== 'color-separation') {
    list.push({ id: 'threshold', label: 'Threshold', min: 0, max: 1, step: 0.02, defaultFrom: 0.25, defaultTo: 0.75 });
  }
  if (supportsScale) {
    list.push({ id: 'scale', label: 'Pattern Scale', min: 0.05, max: 8, step: 0.05, defaultFrom: 1, defaultTo: 4 });
  }
  if (hasErrorStrength) {
    list.push({ id: 'diffusionStrength', label: 'Diffusion Strength', min: 0, max: 1, step: 0.05, defaultFrom: 0.2, defaultTo: 1 });
  }

  // Always include Noise Amount in the Styles dropdown for every algorithm!
  list.push({ id: 'noiseAmount', label: 'Noise Amount', min: 0, max: 1, step: 0.05, defaultFrom: 0.0, defaultTo: 0.65 });

  if (algo.controls && Array.isArray(algo.controls)) {
    const excludedIds = new Set([
      'threshold', 'scale', 'diffusionStrength', 'errorStrength',
      'errorReduction', 'strength', 'serpentine', 'noiseAmount', 'noise',
      'depth', 'colorDepth'
    ]);
    for (const ctrl of algo.controls) {
      if (!ctrl.id || excludedIds.has(ctrl.id)) continue;
      if (ctrl.type === 'dropdown') continue;
      if (ctrl.type === 'toggle') {
        list.push({
          id: ctrl.id,
          label: ctrl.label || ctrl.id,
          min: 0,
          max: 1,
          step: 1,
          defaultFrom: 0,
          defaultTo: 1
        });
      } else {
        const min = ('min' in ctrl && typeof ctrl.min === 'number') ? ctrl.min : 0;
        const max = ('max' in ctrl && typeof ctrl.max === 'number') ? ctrl.max : 10;
        const step = ('step' in ctrl && typeof ctrl.step === 'number') ? ctrl.step : 1;
        const def = ('defaultValue' in ctrl && typeof ctrl.defaultValue === 'number') ? ctrl.defaultValue : min;
        list.push({
          id: ctrl.id,
          label: ctrl.label || ctrl.id,
          min,
          max,
          step,
          defaultFrom: min,
          defaultTo: def > min ? def : max
        });
      }
    }
  }

  return list;
};

export const ANIMATABLE_PROPERTIES: Record<AnimationCategory, AnimatablePropDef[]> = {
  adjustments: [
    { id: 'brightness', label: 'Brightness', min: -100, max: 100, step: 1, defaultFrom: -40, defaultTo: 40 },
    { id: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1, defaultFrom: -30, defaultTo: 50 },
    { id: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1, defaultFrom: -50, defaultTo: 50 },
    { id: 'hue', label: 'Hue', min: -180, max: 180, step: 1, defaultFrom: -90, defaultTo: 90 },
    { id: 'gamma', label: 'Gamma', min: 0.1, max: 3, step: 0.05, defaultFrom: 0.8, defaultTo: 1.8 },
    { id: 'blur', label: 'Blur', min: 0, max: 20, step: 0.5, defaultFrom: 0, defaultTo: 8 },
    { id: 'denoise', label: 'Denoise', min: 0, max: 100, step: 1, defaultFrom: 0, defaultTo: 60 },
    { id: 'highlight', label: 'Highlight', min: -100, max: 100, step: 1, defaultFrom: -40, defaultTo: 60 },
    { id: 'depth', label: 'Color Depth', min: 1, max: 32, step: 1, defaultFrom: 2, defaultTo: 16 }
  ],
  style: [
    { id: 'threshold', label: 'Threshold', min: 0, max: 1, step: 0.02, defaultFrom: 0.25, defaultTo: 0.75 },
    { id: 'scale', label: 'Pattern Scale', min: 0.05, max: 8, step: 0.05, defaultFrom: 1, defaultTo: 4 },
    { id: 'diffusionStrength', label: 'Diffusion Strength', min: 0, max: 1, step: 0.05, defaultFrom: 0.2, defaultTo: 1 },
    { id: 'noiseAmount', label: 'Noise Amount', min: 0, max: 1, step: 0.05, defaultFrom: 0.0, defaultTo: 0.65 }
  ],
  effects: buildEffectsAnimatableProps(),
  palette: [
    { id: 'paletteDepth', label: 'Palette Depth', min: 2, max: 32, step: 1, defaultFrom: 2, defaultTo: 8 },
    { id: 'paletteHueShift', label: 'Palette Hue Shift', min: -180, max: 180, step: 1, defaultFrom: 0, defaultTo: 180 },
    { id: 'paletteCycle', label: 'Palette Color Cycle', min: 0, max: 16, step: 1, defaultFrom: 0, defaultTo: 8 }
  ]
};

interface AppState {
  favoriteAlgorithms: string[];
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (id: string) => void;
  toggleFavoriteAlgorithm: (id: string) => void;
  resetCurrentAlgoParams: () => void;
  resetAlgoParamToDefault: (key: keyof AlgoParams) => void;

  resetAdjustmentParam: (key: string) => void;
  resetAllAdjustments: () => void;

  hasImage: boolean;
  imageName: string;
  imageWidth: number;
  imageHeight: number;
  sourceImageData: ImageData | null;
  sourceVideoUrl: string | null;
  loadImageFromData: (imageData: ImageData, name?: string) => void;
  loadVideoSource: (videoUrl: string, firstFrame: ImageData, durationSec: number, name: string) => void;
  loadSampleImage: () => void;
  clearImage: () => void;

  algorithmId: string;
  algoParams: Record<string, AlgoParams>;
  setAlgorithmId: (id: string) => void;
  updateCurrentAlgoParam: <K extends keyof AlgoParams>(key: K, value: AlgoParams[K]) => void;

  // Adjustments (including Blur, Denoise, Highlight)
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  gamma: number;
  blur: number;
  denoise: number;
  highlight: number;
  depth: number;
  setBrightness: (v: number) => void;
  setContrast: (v: number) => void;
  setSaturation: (v: number) => void;
  setHue: (n: number) => void;
  setGamma: (v: number) => void;
  setBlur: (v: number) => void;
  setDenoise: (v: number) => void;
  setHighlight: (v: number) => void;
  setDepth: (v: number) => void;

  imageFileName: string;

  activePaletteId: string;
  activePalette: string;
  previewPaletteId: string | null;
  setPreviewPaletteId: (id: string | null) => void;
  workingPalette: number[][];
  paletteDepth: number;
  setActivePaletteId: (id: string) => void;
  setActivePalette: (id: string) => void;
  updateSwatchColor: (index: number, rgba: number[]) => void;
  shuffleUnlockedSwatches: () => void;
  addSwatch: () => void;
  removeSwatch: (index: number) => void;
  setPaletteDepth: (n: number) => void;
  resetToBuiltin: () => void;
  savedPalettes: Array<{ id: string; name: string; category: string; colors: number[][] }>;
  saveCurrentPaletteLocally: (name: string) => void;
  deleteCustomPalette: (id: string) => void;
  addAdjustedSwatch: (sourceIndex: number, delta: number) => void;
  paletteInverted: boolean;
  paletteFlipped: boolean;
  invertPalette: () => void;
  flipPalette: () => void;

  effects: EffectItem[];
  addEffectInstance: (effectType: string) => void;
  removeEffectInstance: (id: string) => void;
  toggleEffectEnabled: (id: string) => void;
  reorderEffects: (fromIndex: number, toIndex: number) => void;
  updateEffectParam: (id: string, key: string, value: any) => void;
  setEffectOpacity: (id: string, opacity: number) => void;
  setEffectBlendMode: (id: string, blendMode: BlendMode) => void;
  resetEffects: () => void;
  toggleEffect: (id: string) => void;
  addEffect: (effectType: string) => void;
  removeEffect: (index: number) => void;

  previewQuality: PreviewQuality;
  setPreviewQuality: (q: PreviewQuality) => void;
  cyclePreviewQuality: () => void;
  viewportUpdateMode: ViewportUpdateMode;
  setViewportUpdateMode: (m: ViewportUpdateMode) => void;
  toggleViewportUpdateMode: () => void;
  appMode: AppMode;
  setAppMode: (m: AppMode) => void;
  toggleAppMode: () => void;
  videoPlaybackMode: VideoPlaybackMode;
  setVideoPlaybackMode: (m: VideoPlaybackMode) => void;
  toggleVideoPlaybackMode: () => void;
  videoRenderMode: VideoRenderMode;
  setVideoRenderMode: (m: VideoRenderMode) => void;
  toggleVideoRenderMode: () => void;
  previewMode: VideoRenderMode;
  setPreviewMode: (m: VideoRenderMode) => void;
  togglePreviewMode: () => void;

  hasConfiguredAnimation: boolean;
  setHasConfiguredAnimation: (val: boolean) => void;
  isCreateAnimationPopupOpen: boolean;
  setIsCreateAnimationPopupOpen: (open: boolean) => void;
  isFfmpegModalOpen: boolean;
  setIsFfmpegModalOpen: (open: boolean) => void;
  ffmpegStatus: any;
  setFfmpegStatus: (status: any) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  currentTime: number;
  setCurrentTime: (t: number) => void;
  duration: number;
  setDuration: (d: number) => void;
  fps: number;
  setFps: (fps: number) => void;
  stepFrame: (dir: -1 | 1) => void;
  animationTracks: AnimationTrack[];
  selectedTrackId: string | null;
  setSelectedTrackId: (id: string | null) => void;
  addAnimationTrack: (durationOverride?: number) => void;
  duplicateAnimationTrack: (id: string) => void;
  updateAnimationTrack: (id: string, patch: Partial<AnimationTrack>) => void;
  removeAnimationTrack: (id: string) => void;

  updateMode: UpdateMode;
  setUpdateMode: (mode: UpdateMode) => void;
  isDraggingSlider: boolean;
  setIsDraggingSlider: (dragging: boolean) => void;
  lastRenderMs: number;
  setLastRenderMs: (ms: number) => void;
  activeBackend: 'rust' | 'js' | 'js-fallback';
  setActiveBackend: (b: 'rust' | 'js' | 'js-fallback') => void;
  backendError: string | null;
  setBackendError: (err: string | null) => void;
  devLogs: Array<{ level: 'info' | 'warn' | 'error'; category: string; msg: string; time: string; durationMs?: number }>;
  addDevLog: (level: 'info' | 'warn' | 'error', category: string, msg: string, durationMs?: number) => void;
  clearDevLogs: () => void;

  zoom: number;
  panX: number;
  panY: number;
  splitRatio: number;
  hasUserMovedSplitRatio: boolean;
  showBeforeAfter: boolean;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  fitToViewport: (containerWidth: number, containerHeight: number) => void;
  resetZoom: () => void;
  setSplitRatio: (ratio: number) => void;
  setShowBeforeAfter: (show: boolean) => void;
  toggleBeforeAfter: () => void;

  isOriginalView: boolean;
  setIsOriginalView: (val: boolean) => void;
  toggleOriginalView: () => void;

  showAlgorithmDescriptions: boolean;
  setShowAlgorithmDescriptions: (show: boolean) => void;
  activeDropdownId: string | null;
  setActiveDropdownId: (id: string | null) => void;

  sidebarWidth: number;
  isSidebarCollapsed: boolean;
  activeTheme: string;
  isFullScreen: boolean;
  isManualOpen: boolean;
  isExportOpen: boolean;
  setSidebarWidth: (width: number) => void;
  toggleSidebarCollapsed: () => void;
  setActiveTheme: (theme: string) => void;
  toggleFullScreen: () => void;
  setIsManualOpen: (open: boolean) => void;
  setIsExportOpen: (open: boolean) => void;
  resetAll: () => void;

  // Application-level Undo / Redo History
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

const STORAGE_KEY_SIDEBAR_WIDTH = 'ditherforge_sidebar_width';
const STORAGE_KEY_SIDEBAR_COLLAPSED = 'ditherforge_sidebar_collapsed';
const STORAGE_KEY_THEME = 'ditherforge_theme';
const STORAGE_KEY_FAVORITES = 'ditherforge_favorites';
const STORAGE_KEY_CUSTOM_PALETTES = 'ditherforge_custom_palettes';

const getStoredSidebarWidth = (): number => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_SIDEBAR_WIDTH);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 320 && num <= 700) return num;
    }
  } catch {}
  return 356;
};

const getStoredTheme = (): string => {
  try {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('theme');
      if (p) return p;
    }
    const theme = localStorage.getItem(STORAGE_KEY_THEME);
    if (theme) return theme;
  } catch {}
  return 'dark_pro';
};

const getStoredCustomPalettes = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PALETTES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

let cachedCalibrationPattern: ImageData | null = null;
function getInitialCalibrationPattern(): ImageData | null {
  if (typeof window === 'undefined') return null;
  if (!cachedCalibrationPattern) {
    cachedCalibrationPattern = createCalibrationPattern(400, 300);
  }
  return new ImageData(
    new Uint8ClampedArray(cachedCalibrationPattern.data),
    cachedCalibrationPattern.width,
    cachedCalibrationPattern.height
  );
}

export const useAppStore = create<AppState>((set, get) => ({
  hasImage: true,
  imageName: 'calibration_pattern.png',
  imageFileName: 'calibration_pattern.png',
  imageWidth: 400,
  imageHeight: 300,
  sourceImageData: getInitialCalibrationPattern(),
  sourceVideoUrl: null,

  loadImageFromData: (imageData, name = 'uploaded_image.png') => {
    historyManager.clearHistory();
    set((state) => {
      if (state.sourceVideoUrl) {
        try { URL.revokeObjectURL(state.sourceVideoUrl); } catch {}
      }
      return {
        hasImage: true,
        imageName: name,
        imageFileName: name,
        imageWidth: imageData.width,
        imageHeight: imageData.height,
        sourceImageData: imageData,
        sourceVideoUrl: null,
        panX: 0,
        panY: 0
      };
    });
  },

  // Video Import: automatically switches to Animated Mode and sets timeline duration!
  loadVideoSource: (videoUrl, firstFrame, durationSec, name) => {
    historyManager.clearHistory();
    set((state) => {
      if (state.sourceVideoUrl && state.sourceVideoUrl !== videoUrl) {
        try { URL.revokeObjectURL(state.sourceVideoUrl); } catch {}
      }
      const validDur = Math.max(1, Math.round(durationSec || 5));
      return {
        hasImage: true,
        imageName: name,
        imageFileName: name,
        imageWidth: firstFrame.width,
        imageHeight: firstFrame.height,
        sourceImageData: firstFrame,
        sourceVideoUrl: videoUrl,
        appMode: 'animation',
        hasConfiguredAnimation: true,
        isCreateAnimationPopupOpen: false,
        duration: validDur,
        currentTime: 0,
        panX: 0,
        panY: 0
      };
    });
  },

  loadSampleImage: () => {
    historyManager.clearHistory();
    const sample = getInitialCalibrationPattern() || createCalibrationPattern(400, 300);
    set((state) => {
      if (state.sourceVideoUrl) {
        try { URL.revokeObjectURL(state.sourceVideoUrl); } catch {}
      }
      return {
        hasImage: true,
        imageName: 'calibration_pattern.png',
        imageFileName: 'calibration_pattern.png',
        imageWidth: 400,
        imageHeight: 300,
        sourceImageData: sample,
        sourceVideoUrl: null,
        panX: 0,
        panY: 0
      };
    });
  },

  clearImage: () => {
    historyManager.clearHistory();
    set((state) => {
      if (state.sourceVideoUrl) {
        try { URL.revokeObjectURL(state.sourceVideoUrl); } catch {}
      }
      return {
        hasImage: false,
        imageName: '',
        imageFileName: '',
        imageWidth: 0,
        imageHeight: 0,
        sourceImageData: null,
        sourceVideoUrl: null
      };
    });
  },

  favoriteAlgorithms: [],
  addFavorite: (id) => set((state) => {
    if (state.favoriteAlgorithms.includes(id)) return state;
    const next = [...state.favoriteAlgorithms, id];
    try { localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(next)); } catch {}
    return { favoriteAlgorithms: next };
  }),
  removeFavorite: (id) => set((state) => {
    const next = state.favoriteAlgorithms.filter((favId) => favId !== id);
    try { localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(next)); } catch {}
    return { favoriteAlgorithms: next };
  }),
  toggleFavorite: (id) => set((state) => {
    const isFav = state.favoriteAlgorithms.includes(id);
    const next = isFav ? state.favoriteAlgorithms.filter((f) => f !== id) : [...state.favoriteAlgorithms, id];
    try { localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(next)); } catch {}
    return { favoriteAlgorithms: next };
  }),
  toggleFavoriteAlgorithm: (id) => get().toggleFavorite(id),

  resetCurrentAlgoParams: () => set((state) => ({
    algoParams: {
      ...state.algoParams,
      [state.algorithmId]: getInitialAlgoParams(state.algorithmId)
    }
  })),
  resetAlgoParamToDefault: (key) => set((state) => {
    const defaults = getInitialAlgoParams(state.algorithmId);
    const current = state.algoParams[state.algorithmId] ?? defaults;
    return {
      algoParams: {
        ...state.algoParams,
        [state.algorithmId]: { ...current, [key]: defaults[key] }
      }
    };
  }),

  resetAdjustmentParam: (key) => set(() => {
    const defaults: Record<string, number> = {
      brightness: 0, contrast: 0, saturation: 0, hue: 0, gamma: 1.0,
      blur: 0, denoise: 0, highlight: 0, depth: 8
    };
    if (defaults[key] === undefined) return {};
    return { [key]: defaults[key] } as any;
  }),
  resetAllAdjustments: () => set({
    brightness: 0, contrast: 0, saturation: 0, hue: 0, gamma: 1.0,
    blur: 0, denoise: 0, highlight: 0, depth: 8
  }),

  algorithmId: 'floyd-steinberg',
  algoParams: buildInitialAlgoParamsMap(),
  setAlgorithmId: (id: string) => set((state) => ({
    algorithmId: id,
    algoParams: { ...state.algoParams, [id]: state.algoParams[id] ?? getInitialAlgoParams(id) }
  })),
  updateCurrentAlgoParam: (key, value) => set((state) => {
    const currentId = state.algorithmId;
    const currentParams = state.algoParams[currentId] ?? getInitialAlgoParams(currentId);
    return {
      algoParams: {
        ...state.algoParams,
        [currentId]: { ...currentParams, [key]: value }
      }
    };
  }),

  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  gamma: 1.0,
  blur: 0,
  denoise: 0,
  highlight: 0,
  depth: 8,
  setBrightness: (brightness) => set({ brightness }),
  setContrast: (contrast) => set({ contrast }),
  setSaturation: (saturation) => set({ saturation }),
  setHue: (hue) => set({ hue: Math.max(-180, Math.min(180, hue)) }),
  setGamma: (gamma) => set({ gamma }),
  setBlur: (blur) => set({ blur: Math.max(0, Math.min(20, blur)) }),
  setDenoise: (denoise) => set({ denoise: Math.max(0, Math.min(100, denoise)) }),
  setHighlight: (highlight) => set({ highlight: Math.max(-100, Math.min(100, highlight)) }),
  setDepth: (depth) => set({ depth }),

  activePaletteId: BUILTIN_PALETTES[0]?.id || 'monochrome_1bit',
  activePalette: BUILTIN_PALETTES[0]?.id || 'monochrome_1bit',
  workingPalette: BUILTIN_PALETTES[0] ? BUILTIN_PALETTES[0].colors.map((c: number[]) => [...c]) : [[0, 0, 0, 255], [255, 255, 255, 255]],
  paletteDepth: BUILTIN_PALETTES[0] ? BUILTIN_PALETTES[0].colors.length : 2,
  savedPalettes: getStoredCustomPalettes(),
  paletteInverted: false,
  paletteFlipped: false,
  previewPaletteId: null,
  setPreviewPaletteId: (id) => set({ previewPaletteId: id }),

  setActivePaletteId: (id: string) => {
    const state = get();
    const pal = BUILTIN_PALETTES.find((p: any) => p.id === id) || state.savedPalettes.find((p) => p.id === id);
    if (!pal) return;
    const colors = pal.colors.map((c: number[]) => [...c]);
    set({
      activePaletteId: id,
      activePalette: id,
      workingPalette: colors,
      paletteDepth: colors.length,
      paletteInverted: false,
      paletteFlipped: false,
      previewPaletteId: null
    });
  },
  setActivePalette: (id) => get().setActivePaletteId(id),

  saveCurrentPaletteLocally: (name: string) => {
    const state = get();
    const newPal = {
      id: `saved_pal_${Date.now()}`,
      name: name.trim() || `Saved Palette ${state.savedPalettes.length + 1}`,
      category: 'Saved Palettes',
      colors: state.workingPalette.map((c) => [...c])
    };
    const next = [...state.savedPalettes, newPal];
    try { localStorage.setItem(STORAGE_KEY_CUSTOM_PALETTES, JSON.stringify(next)); } catch {}
    set({ savedPalettes: next, activePaletteId: newPal.id, activePalette: newPal.id });
  },

  deleteCustomPalette: (id: string) => {
    const state = get();
    const next = state.savedPalettes.filter((p) => p.id !== id);
    try { localStorage.setItem(STORAGE_KEY_CUSTOM_PALETTES, JSON.stringify(next)); } catch {}
    if (state.activePaletteId === id) {
      const fallback = BUILTIN_PALETTES[0];
      const colors = fallback ? fallback.colors.map((c: number[]) => [...c]) : [[0, 0, 0, 255], [255, 255, 255, 255]];
      set({
        savedPalettes: next,
        activePaletteId: fallback?.id || 'monochrome_1bit',
        activePalette: fallback?.id || 'monochrome_1bit',
        workingPalette: colors,
        paletteDepth: colors.length
      });
    } else {
      set({ savedPalettes: next });
    }
  },

  addAdjustedSwatch: (sourceIndex: number, delta = 0.35) => set((state) => {
    if (state.workingPalette.length >= 32) return state;
    const base = state.workingPalette[sourceIndex];
    if (!base) return state;
    const adjust = (ch: number) => {
      const val = delta > 0 ? Math.round(ch + (255 - ch) * delta) : Math.round(ch * (1 + delta));
      return Math.max(0, Math.min(255, val));
    };
    const newSwatch = [adjust(base[0]), adjust(base[1]), adjust(base[2]), 255];
    const nextPalette = [...state.workingPalette.map((c) => [...c]), newSwatch];
    return { workingPalette: nextPalette, paletteDepth: Math.max(state.paletteDepth, nextPalette.length) };
  }),

  invertPalette: () => set((state) => ({
    workingPalette: state.workingPalette.map((c) => [255 - c[0], 255 - c[1], 255 - c[2], c[3] ?? 255]),
    paletteInverted: !state.paletteInverted
  })),

  flipPalette: () => set((state) => ({
    workingPalette: state.workingPalette.slice().reverse(),
    paletteFlipped: !state.paletteFlipped
  })),

  updateSwatchColor: (index, rgba) => set((state) => {
    if (index < 0 || index >= state.workingPalette.length) return state;
    return { workingPalette: state.workingPalette.map((c, i) => (i === index ? [...rgba] : [...c])) };
  }),
  shuffleUnlockedSwatches: () => set((state) => ({
    workingPalette: state.workingPalette.map(() => [
      Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), 255
    ])
  })),
  addSwatch: () => set((state) => {
    if (state.workingPalette.length >= 32) return state;
    const next = [...state.workingPalette.map((c) => [...c]), [128, 128, 128, 255]];
    return { workingPalette: next, paletteDepth: Math.max(state.paletteDepth, next.length) };
  }),
  removeSwatch: (index) => set((state) => {
    if (state.workingPalette.length <= 2) return state;
    const next = state.workingPalette.filter((_, i) => i !== index).map((c) => [...c]);
    return { workingPalette: next, paletteDepth: Math.max(2, Math.min(state.paletteDepth, next.length)) };
  }),
  setPaletteDepth: (n) => set((state) => ({
    paletteDepth: Math.max(2, Math.min(Math.min(32, state.workingPalette.length), n))
  })),
  resetToBuiltin: () => set((state) => {
    const pal = BUILTIN_PALETTES.find((p: any) => p.id === state.activePaletteId) || BUILTIN_PALETTES[0];
    const colors = pal ? pal.colors.map((c: number[]) => [...c]) : [[0, 0, 0, 255], [255, 255, 255, 255]];
    return { workingPalette: colors, paletteDepth: colors.length, paletteInverted: false, paletteFlipped: false };
  }),

  effects: buildInitialEffects(),
  addEffectInstance: (effectType) => set((state) => {
    const meta = getEffectDescriptor(effectType) || AVAILABLE_EFFECT_TYPES.find((e: any) => e.id === effectType);
    if (!meta) return state;
    return {
      effects: [
        ...state.effects,
        {
          id: `${effectType}_${Date.now()}`,
          type: effectType,
          name: meta.name,
          enabled: true,
          params: { ...meta.defaultParams },
          opacity: (meta as any).defaultOpacity !== undefined ? (meta as any).defaultOpacity : 1.0,
          blendMode: (meta as any).defaultBlendMode || 'normal'
        }
      ]
    };
  }),
  removeEffectInstance: (id) => set((state) => ({ effects: state.effects.filter((e) => e.id !== id) })),
  toggleEffectEnabled: (id) => set((state) => ({
    effects: state.effects.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e))
  })),
  reorderEffects: (fromIndex, toIndex) => set((state) => {
    const list = [...state.effects];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    return { effects: list };
  }),
  updateEffectParam: (id, key, value) => set((state) => ({
    effects: state.effects.map((e) => (e.id === id ? { ...e, params: { ...e.params, [key]: value } } : e))
  })),
  setEffectOpacity: (id, opacity) => set((state) => ({
    effects: state.effects.map((e) => (e.id === id ? { ...e, opacity: Math.max(0, Math.min(1, opacity)) } : e))
  })),
  setEffectBlendMode: (id, blendMode) => set((state) => ({
    effects: state.effects.map((e) => (e.id === id ? { ...e, blendMode } : e))
  })),
  resetEffects: () => set({ effects: buildInitialEffects() }),
  toggleEffect: (id) => get().toggleEffectEnabled(id),
  addEffect: (effectType) => get().addEffectInstance(effectType),
  removeEffect: (index) => set((state) => ({ effects: state.effects.filter((_, i) => i !== index) })),

  previewQuality: 'full',
  setPreviewQuality: (previewQuality) => set({ previewQuality }),
  cyclePreviewQuality: () => set((state) => {
    const order: PreviewQuality[] = ['full', 'low', 'mid'];
    const next = order[(order.indexOf(state.previewQuality) + 1) % order.length];
    return { previewQuality: next };
  }),

  viewportUpdateMode: 'live',
  setViewportUpdateMode: (viewportUpdateMode) => set({ viewportUpdateMode }),
  toggleViewportUpdateMode: () => set((state) => ({
    viewportUpdateMode: state.viewportUpdateMode === 'live' ? 'debounce' : 'live'
  })),

  appMode: 'still',

  setAppMode: (mode) => {
    const current = get();
    const needsSetup = mode === 'animation' && !current.hasConfiguredAnimation;
    set({
      appMode: mode,
      isCreateAnimationPopupOpen: needsSetup,
      hasConfiguredAnimation: mode === 'still' ? current.hasConfiguredAnimation : current.hasConfiguredAnimation,
    });
  },
  toggleAppMode: () => set((state) => {
    const next = state.appMode === 'still' ? 'animation' : 'still';
    return {
      appMode: next,
      isPlaying: next === 'still' ? false : state.isPlaying,
      selectedTrackId: next === 'still' ? null : state.selectedTrackId,
      hasConfiguredAnimation: next === 'animation' ? false : state.hasConfiguredAnimation,
      isCreateAnimationPopupOpen: next === 'animation'
    };
  }),

  videoPlaybackMode: 'standard',
  setVideoPlaybackMode: (videoPlaybackMode) => set({ videoPlaybackMode }),
  toggleVideoPlaybackMode: () => set((state) => ({
    videoPlaybackMode: state.videoPlaybackMode === 'standard' ? 'looped' : 'standard'
  })),

  videoRenderMode: 'quick',
  setVideoRenderMode: (videoRenderMode) => set({ videoRenderMode, previewMode: videoRenderMode }),
  toggleVideoRenderMode: () => set((state) => {
    const next = state.videoRenderMode === 'quick' ? 'rendered' : 'quick';
    return { videoRenderMode: next, previewMode: next };
  }),
  previewMode: 'quick',
  setPreviewMode: (previewMode) => set({ previewMode, videoRenderMode: previewMode }),
  togglePreviewMode: () => set((state) => {
    const next = state.previewMode === 'quick' ? 'rendered' : 'quick';
    return { previewMode: next, videoRenderMode: next };
  }),

  hasConfiguredAnimation: false,
  setHasConfiguredAnimation: (hasConfiguredAnimation) => set({ hasConfiguredAnimation }),
  isCreateAnimationPopupOpen: false,
  setIsCreateAnimationPopupOpen: (isCreateAnimationPopupOpen) => set({ isCreateAnimationPopupOpen }),
  isFfmpegModalOpen: false,
  setIsFfmpegModalOpen: (isFfmpegModalOpen) => set({ isFfmpegModalOpen }),
  ffmpegStatus: null,
  setFfmpegStatus: (ffmpegStatus) => set({ ffmpegStatus }),

  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((state) => {
    if (!state.isPlaying && state.currentTime >= state.duration) {
      return { isPlaying: true, currentTime: 0 };
    }
    return { isPlaying: !state.isPlaying };
  }),
  playbackSpeed: 1,
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed: Math.max(0.1, Number(playbackSpeed) || 1) }),
  currentTime: 0,
  setCurrentTime: (t) => set((state) => ({
    currentTime: Math.max(0, Math.min(state.duration, Number(t.toFixed(4))))
  })),
  duration: 15.0,
  setDuration: (duration) => set((state) => {
    const nextDur = Math.max(1, duration);
    const clampedTracks = state.animationTracks.map((tr) => {
      const start = Math.max(0, Math.min(nextDur - 0.1, tr.startTime));
      const end = Math.max(start + 0.1, Math.min(nextDur, tr.endTime));
      return { ...tr, startTime: start, endTime: end };
    });
    return {
      duration: nextDur,
      currentTime: Math.min(state.currentTime, nextDur),
      animationTracks: clampedTracks
    };
  }),
  fps: 30,
  setFps: (fps) => set({ fps: Math.max(1, Math.min(120, fps)) }),
  stepFrame: (dir) => set((state) => {
    const frameStep = 1 / state.fps;
    const next = Math.max(0, Math.min(state.duration, state.currentTime + dir * frameStep));
    return { isPlaying: false, currentTime: Number(next.toFixed(4)) };
  }),
  animationTracks: [],
  selectedTrackId: null,
  setSelectedTrackId: (selectedTrackId) => set({ selectedTrackId }),

  addAnimationTrack: (durationOverride) => set((state) => {
    const totalDur = durationOverride ?? state.duration;
    const halfLength = Number((totalDur / 2).toFixed(2));
    const newTrack: AnimationTrack = {
      id: `track_${Date.now()}`,
      category: null,
      property: null,
      label: 'No effect',
      startTime: 0,
      endTime: Math.max(0.2, halfLength),
      fromValue: 0,
      toValue: 1,
      easing: 'linear'
    };
    return {
      animationTracks: [...state.animationTracks, newTrack],
      selectedTrackId: newTrack.id
    };
  }),
  duplicateAnimationTrack: (id) => set((state) => {
    const orig = state.animationTracks.find((t) => t.id === id);
    if (!orig) return state;
    const copy: AnimationTrack = {
      ...orig,
      id: `track_${Date.now()}`
    };
    return {
      animationTracks: [...state.animationTracks, copy],
      selectedTrackId: copy.id
    };
  }),
  updateAnimationTrack: (id, patch) => set((state) => ({
    animationTracks: state.animationTracks.map((t) => {
      if (t.id !== id) return t;
      const updated = { ...t, ...patch };
      updated.startTime = Math.max(0, Math.min(state.duration - 0.1, updated.startTime));
      updated.endTime = Math.max(updated.startTime + 0.1, Math.min(state.duration, updated.endTime));
      return updated;
    })
  })),
  removeAnimationTrack: (id) => set((state) => ({
    animationTracks: state.animationTracks.filter((t) => t.id !== id),
    selectedTrackId: state.selectedTrackId === id ? null : state.selectedTrackId
  })),

  updateMode: 'precise',
  setUpdateMode: (updateMode) => set({
    updateMode,
    viewportUpdateMode: updateMode === 'settle' ? 'debounce' : 'live'
  }),
  isDraggingSlider: false,
  setIsDraggingSlider: (isDraggingSlider) => set({ isDraggingSlider }),
  lastRenderMs: 0,
  setLastRenderMs: (lastRenderMs) => set({ lastRenderMs }),
  activeBackend: 'rust',
  setActiveBackend: (activeBackend) => set({ activeBackend }),
  backendError: null,
  setBackendError: (backendError) => set({ backendError }),
  devLogs: [],
  addDevLog: (level, category, msg, durationMs) =>
    set((state) => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      const next = [...state.devLogs, { level, category, msg, time, durationMs }];
      return { devLogs: next.slice(-1000) };
    }),
  clearDevLogs: () => set({ devLogs: [] }),

  zoom: 100,
  panX: 0,
  panY: 0,
  splitRatio: 0.5,
  hasUserMovedSplitRatio: false,
  showBeforeAfter: false,
  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(3200, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  fitToViewport: (containerWidth, containerHeight) => {
    const { imageWidth, imageHeight, appMode, hasConfiguredAnimation } = get();
    if (!imageWidth || !imageHeight) return;
    const isAnim = appMode === 'animation' && hasConfiguredAnimation;
    const timelineH = isAnim ? 252 : 0;
    const availableW = Math.max(100, containerWidth - 40);
    const availableH = Math.max(100, containerHeight - timelineH - 40);
    const scale = Math.min(availableW / imageWidth, availableH / imageHeight, 1.0);
    const fitZoom = Math.max(25, Math.round(scale * 100));
    set({ zoom: fitZoom, panX: 0, panY: 0 });
  },
  resetZoom: () => set({ zoom: 100, panX: 0, panY: 0 }),
  setSplitRatio: (splitRatio) => set({
    splitRatio: Math.max(0.02, Math.min(0.98, splitRatio)),
    hasUserMovedSplitRatio: true
  }),
  setShowBeforeAfter: (showBeforeAfter) => set((state) => ({
    showBeforeAfter,
    splitRatio: showBeforeAfter && !state.hasUserMovedSplitRatio ? 0.5 : state.splitRatio
  })),
  toggleBeforeAfter: () => set((state) => {
    const next = !state.showBeforeAfter;
    return {
      showBeforeAfter: next,
      splitRatio: next && !state.hasUserMovedSplitRatio ? 0.5 : state.splitRatio
    };
  }),

  isOriginalView: false,
  setIsOriginalView: (val) => set({ isOriginalView: val }),
  toggleOriginalView: () => set((state) => ({ isOriginalView: !state.isOriginalView })),

  showAlgorithmDescriptions: true,
  setShowAlgorithmDescriptions: (show) => set({ showAlgorithmDescriptions: show }),
  activeDropdownId: null,
  setActiveDropdownId: (activeDropdownId) => set({ activeDropdownId }),

  sidebarWidth: getStoredSidebarWidth(),
  isSidebarCollapsed: false,
  activeTheme: getStoredTheme(),
  isFullScreen: false,
  isManualOpen: false,
  isExportOpen: false,

  setSidebarWidth: (width) => set(() => {
    const clamped = Math.max(320, Math.min(700, width));
    try { localStorage.setItem(STORAGE_KEY_SIDEBAR_WIDTH, String(clamped)); } catch {}
    return { sidebarWidth: clamped };
  }),
  toggleSidebarCollapsed: () => set((state) => {
    const next = !state.isSidebarCollapsed;
    try { localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, String(next)); } catch {}
    return { isSidebarCollapsed: next };
  }),
  setActiveTheme: (activeTheme) => set(() => {
    try { localStorage.setItem(STORAGE_KEY_THEME, activeTheme); } catch {}
    return { activeTheme };
  }),
  toggleFullScreen: () => set((state) => {
    const next = !state.isFullScreen;
    if (next) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    return { isFullScreen: next };
  }),
  setIsManualOpen: (isManualOpen) => set({ isManualOpen }),
  setIsExportOpen: (isExportOpen) => set({ isExportOpen }),

  resetAll: () => set((state) => ({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    gamma: 1.0,
    blur: 0,
    denoise: 0,
    highlight: 0,
    depth: 8,
    algoParams: {
      ...state.algoParams,
      [state.algorithmId]: getInitialAlgoParams(state.algorithmId)
    },
    zoom: 100,
    panX: 0,
    panY: 0,
    splitRatio: 0.5,
    hasUserMovedSplitRatio: false,
    showBeforeAfter: false
  })),

  // Application-level Undo / Redo History
  canUndo: false,
  canRedo: false,
  undo: () => historyManager.undo(),
  redo: () => historyManager.redo(),
  clearHistory: () => historyManager.clearHistory()
}));

historyManager.init(useAppStore);

if (typeof window !== 'undefined') {
  (window as any).__DITHERFORGE_STORE__ = useAppStore;
}

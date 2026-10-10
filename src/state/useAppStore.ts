import { create } from 'zustand';
// Import frozen registries UNCHANGED via allowJs
// @ts-ignore
import { ALGORITHM_REGISTRY } from '../dither-engine/algorithms.js';
// @ts-ignore
import { BUILTIN_PALETTES } from '../dither-engine/palettes.js';
// @ts-ignore
import { AVAILABLE_EFFECT_TYPES } from '../dither-engine/effect-stack.js';
import { createCalibrationPattern } from '../utils/samplePattern';

export type UpdateMode = 'precise' | 'live' | 'settle';

export interface AlgoParams {
  threshold: number;
  scale: number;
  diffusionStrength: number;
  serpentine: boolean;
  noiseAmount: number;
}

export interface EffectItem {
  id: string;
  name: string;
  enabled: boolean;
  params: Record<string, any>;
}

// Table of default parameters per algorithm / category
const DEFAULT_ALGO_PARAMS_TABLE: Record<string, Partial<AlgoParams>> = {
  // Error diffusion defaults
  floyd_steinberg: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  atkinson: { threshold: 0.5, scale: 1.0, diffusionStrength: 0.75, serpentine: true, noiseAmount: 0.3 },
  jarvis_judice_ninke: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  stucki: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  burkes: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  sierra_3: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  sierra_2: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  sierra_lite: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  stevenson_arce: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  fan: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  shiau_fan: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  shiau_fan_2: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  false_floyd_steinberg: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  minimized_avg_error: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },
  dynamic_serpentine: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true, noiseAmount: 0.3 },

  // Ordered dithers
  bayer_2x2: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  bayer_4x4: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  bayer_8x8: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  bayer_16x16: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  clustered_dot: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },

  // Pattern dithers
  checkered: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  horizontal_lines: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  vertical_lines: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  crosshatch: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  diagonal_hatch: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  concentric_diamond: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  woven_basket: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  hex_stipple: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },

  // Glitch
  scanline_jitter: { threshold: 0.45, scale: 1.0, diffusionStrength: 0.8, serpentine: false, noiseAmount: 0.3 },
  chromatic_offset: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  pixel_sorting: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  digital_artifacts: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  interlacing_tear: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  crt_bloom: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  bit_crush: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  vhs_tracking: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  static_snow: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },

  // Bespoke & Temporal
  ignition_glow: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 },
  temporal_kinetic: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false, noiseAmount: 0.3 }
};

export const getInitialAlgoParams = (id: string): AlgoParams => {
  const specific = DEFAULT_ALGO_PARAMS_TABLE[id] || {};
  return {
    threshold: specific.threshold ?? 0.5,
    scale: specific.scale ?? 1.0,
    diffusionStrength: specific.diffusionStrength ?? 1.0,
    serpentine: specific.serpentine ?? false,
    noiseAmount: specific.noiseAmount ?? 0.3
  };
};

// Initial state for all 63 algorithms
const buildInitialAlgoParamsMap = (): Record<string, AlgoParams> => {
  const map: Record<string, AlgoParams> = {};
  for (const algo of ALGORITHM_REGISTRY) {
    map[algo.id] = getInitialAlgoParams(algo.id);
  }
  return map;
};

// Initial effects stack from AVAILABLE_EFFECT_TYPES
const buildInitialEffects = (): EffectItem[] => {
  return AVAILABLE_EFFECT_TYPES.map((eff: any) => ({
    id: eff.id,
    name: eff.name,
    enabled: eff.id === 'glow',
    params: { ...eff.defaultParams }
  }));
};

interface AppState {
  // Algorithm Favourites (NEW Phase 3)
  favoriteAlgorithmIds: string[];
  toggleFavoriteAlgorithm: (id: string) => void;
  resetCurrentAlgoParams: () => void;
  resetAlgoParamToDefault: (key: keyof AlgoParams) => void;

  // Adjustment Locks (NEW Phase 3)
  lockedAdjustments: Record<string, boolean>;
  toggleAdjustmentLock: (key: string) => void;
  resetAdjustmentParam: (key: string) => void;
  resetAllAdjustments: () => void;

  // Source Image State
  hasImage: boolean;
  imageName: string;
  imageWidth: number;
  imageHeight: number;
  sourceImageData: ImageData | null;
  loadImageFromData: (imageData: ImageData, name?: string) => void;
  loadSampleImage: () => void;
  clearImage: () => void;

  // Algorithm selection & per-algorithm parameters
  algorithmId: string;
  algoParams: Record<string, AlgoParams>;
  setAlgorithmId: (id: string) => void;
  updateCurrentAlgoParam: <K extends keyof AlgoParams>(key: K, value: AlgoParams[K]) => void;

  // Global Image Adjustments (Pre-Filter, non-destructive)
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  depth: number;
  setBrightness: (v: number) => void;
  setContrast: (v: number) => void;
  setSaturation: (v: number) => void;
  setGamma: (v: number) => void;
  setDepth: (v: number) => void;

  // Color & Palette (STORED BY ID, not display name)
  activePalette: string;
  lockedSwatches: number[];
  setActivePalette: (paletteId: string) => void;
  toggleLockSwatch: (index: number) => void;

  // Post-Effects Stack (Phase 5 static chrome)
  effects: EffectItem[];
  toggleEffect: (id: string) => void;
  reorderEffects: (startIndex: number, endIndex: number) => void;
  addEffect: (effectType: string) => void;
  removeEffect: (index: number) => void;

  // Render & Playback Modes
  updateMode: UpdateMode;
  setUpdateMode: (mode: UpdateMode) => void;
  isDraggingSlider: boolean;
  setIsDraggingSlider: (dragging: boolean) => void;
  lastRenderMs: number;
  setLastRenderMs: (ms: number) => void;

  // Viewport Navigation & Compare
  zoom: number;
  panX: number;
  panY: number;
  splitRatio: number;
  showBeforeAfter: boolean;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  fitToViewport: (containerWidth: number, containerHeight: number) => void;
  resetZoom: () => void;
  setSplitRatio: (ratio: number) => void;
  setShowBeforeAfter: (show: boolean) => void;
  toggleBeforeAfter: () => void;

  // Shell Layout & UI State (persisted to localStorage)
  sidebarWidth: number;
  isSidebarCollapsed: boolean;
  activeTheme: string;
  isFullScreen: boolean;
  isManualOpen: boolean;
  setSidebarWidth: (width: number) => void;
  toggleSidebarCollapsed: () => void;
  setActiveTheme: (theme: string) => void;
  toggleFullScreen: () => void;
  setIsManualOpen: (open: boolean) => void;
  resetAll: () => void;
}

const STORAGE_KEY_SIDEBAR_WIDTH = 'ditherforge_sidebar_width';
const STORAGE_KEY_SIDEBAR_COLLAPSED = 'ditherforge_sidebar_collapsed';
const STORAGE_KEY_THEME = 'ditherforge_theme';
const STORAGE_KEY_UPDATE_MODE = 'ditherforge_update_mode';
const STORAGE_KEY_FAVORITES = 'ditherforge_favorites';
const getStoredFavorites = (): string[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_FAVORITES);
    if (data) return JSON.parse(data);
  } catch {}
  return [];
};


const getStoredSidebarWidth = (): number => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_SIDEBAR_WIDTH);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 300 && num <= 480) return num;
    }
  } catch {}
  return 340;
};

const getStoredSidebarCollapsed = (): boolean => {
  try {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('collapsed') === 'true') {
      return true;
    }
    return localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) === 'true';
  } catch {}
  return false;
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

const getStoredAlgorithm = (): string => {
  try {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('algo');
      if (p) return p;
    }
  } catch {}
  return 'floyd_steinberg';
};

const getStoredUpdateMode = (): UpdateMode => {
  try {
    const mode = localStorage.getItem(STORAGE_KEY_UPDATE_MODE) as UpdateMode;
    if (mode === 'precise' || mode === 'live' || mode === 'settle') {
      return mode;
    }
  } catch {}
  return 'precise';
};

export const useAppStore = create<AppState>((set, get) => ({
  // Image State (initialize with clean calibration pattern)
  hasImage: true,
  imageName: 'calibration_pattern.png',
  imageWidth: 400,
  imageHeight: 300,
  sourceImageData: typeof window !== 'undefined' ? createCalibrationPattern(400, 300) : null,

  loadImageFromData: (imageData, name = 'uploaded_image.png') => set({
    hasImage: true,
    imageName: name,
    imageWidth: imageData.width,
    imageHeight: imageData.height,
    sourceImageData: imageData,
    panX: 0,
    panY: 0
  }),

  loadSampleImage: () => {
    const sample = createCalibrationPattern(400, 300);
    set({
      hasImage: true,
      imageName: 'calibration_pattern.png',
      imageWidth: 400,
      imageHeight: 300,
      sourceImageData: sample,
      panX: 0,
      panY: 0
    });
  },

  clearImage: () => set({
    hasImage: false,
    imageName: '',
    imageWidth: 0,
    imageHeight: 0,
    sourceImageData: null
  }),

  // Favourites
  favoriteAlgorithmIds: getStoredFavorites(),
  toggleFavoriteAlgorithm: (id) => set((state) => {
    const isFav = state.favoriteAlgorithmIds.includes(id);
    const next = isFav
      ? state.favoriteAlgorithmIds.filter((favId) => favId !== id)
      : [...state.favoriteAlgorithmIds, id];
    try { localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(next)); } catch {}
    return { favoriteAlgorithmIds: next };
  }),
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
        [state.algorithmId]: {
          ...current,
          [key]: defaults[key]
        }
      }
    };
  }),

  // Adjustment Locks
  lockedAdjustments: {
    brightness: false,
    contrast: false,
    saturation: false,
    gamma: false,
    depth: false
  },
  toggleAdjustmentLock: (key) => set((state) => ({
    lockedAdjustments: {
      ...state.lockedAdjustments,
      [key]: !state.lockedAdjustments[key]
    }
  })),
  resetAdjustmentParam: (key) => set((state) => {
    if (state.lockedAdjustments[key]) return state; // Locked params don't reset
    const defaults: Record<string, number> = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      gamma: 1.0,
      depth: 8
    };
    if (defaults[key] === undefined) return state;
    return { [key]: defaults[key] } as any;
  }),
  resetAllAdjustments: () => set((state) => {
    const updates: any = {};
    if (!state.lockedAdjustments.brightness) updates.brightness = 0;
    if (!state.lockedAdjustments.contrast) updates.contrast = 0;
    if (!state.lockedAdjustments.saturation) updates.saturation = 0;
    if (!state.lockedAdjustments.gamma) updates.gamma = 1.0;
    if (!state.lockedAdjustments.depth) updates.depth = 8;
    return updates;
  }),

  // Algorithm selection
  algorithmId: getStoredAlgorithm(),
  algoParams: buildInitialAlgoParamsMap(),
  setAlgorithmId: (id: string) => set((state) => {
    const existing = state.algoParams[id] ?? getInitialAlgoParams(id);
    return {
      algorithmId: id,
      algoParams: { ...state.algoParams, [id]: existing }
    };
  }),
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

  // Adjustments
  brightness: 0,
  contrast: 0,
  saturation: 0,
  gamma: 1.0,
  depth: 8,
  setBrightness: (brightness) => set({ brightness }),
  setContrast: (contrast) => set({ contrast }),
  setSaturation: (saturation) => set({ saturation }),
  setGamma: (gamma) => set({ gamma }),
  setDepth: (depth) => set({ depth }),

  // Palette (STORED BY ID: 'monochrome_1bit', etc.)
  activePalette: BUILTIN_PALETTES[0]?.id || 'monochrome_1bit',
  lockedSwatches: [],
  setActivePalette: (activePalette) => set({ activePalette }),
  toggleLockSwatch: (index) => set((state) => {
    const isLocked = state.lockedSwatches.includes(index);
    return {
      lockedSwatches: isLocked
        ? state.lockedSwatches.filter((i) => i !== index)
        : [...state.lockedSwatches, index]
    };
  }),

  // Effects
  effects: buildInitialEffects(),
  toggleEffect: (id) => set((state) => ({
    effects: state.effects.map((e) => e.id === id ? { ...e, enabled: !e.enabled } : e)
  })),
  reorderEffects: (startIndex, endIndex) => set((state) => {
    const list = [...state.effects];
    const [removed] = list.splice(startIndex, 1);
    list.splice(endIndex, 0, removed);
    return { effects: list };
  }),
  addEffect: (effectType) => set((state) => {
    const meta = AVAILABLE_EFFECT_TYPES.find((e: any) => e.id === effectType);
    if (!meta) return state;
    const newEffect: EffectItem = {
      id: `${effectType}_${Date.now()}`,
      name: meta.name,
      enabled: true,
      params: { ...meta.defaultParams }
    };
    return { effects: [...state.effects, newEffect] };
  }),
  removeEffect: (index) => set((state) => ({
    effects: state.effects.filter((_, i) => i !== index)
  })),

  // Render & Playback Modes
  updateMode: getStoredUpdateMode(),
  setUpdateMode: (updateMode) => {
    try { localStorage.setItem(STORAGE_KEY_UPDATE_MODE, updateMode); } catch {}
    set({ updateMode });
  },
  isDraggingSlider: false,
  setIsDraggingSlider: (isDraggingSlider) => set({ isDraggingSlider }),
  lastRenderMs: 0,
  setLastRenderMs: (lastRenderMs) => set({ lastRenderMs }),

  // Viewport Navigation & Compare
  zoom: 100,
  panX: 0,
  panY: 0,
  splitRatio: 0.5,
  showBeforeAfter: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('compare') === 'true',
  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(1000, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  fitToViewport: (containerWidth, containerHeight) => {
    const { imageWidth, imageHeight } = get();
    if (!imageWidth || !imageHeight) return;
    const availableW = Math.max(100, containerWidth - 40);
    const availableH = Math.max(100, containerHeight - 40);
    const scale = Math.min(availableW / imageWidth, availableH / imageHeight, 1.0);
    const fitZoom = Math.max(25, Math.round(scale * 100));
    set({ zoom: fitZoom, panX: 0, panY: 0 });
  },
  resetZoom: () => set({ zoom: 100, panX: 0, panY: 0 }),
  setSplitRatio: (splitRatio) => set({ splitRatio: Math.max(0.05, Math.min(0.95, splitRatio)) }),
  setShowBeforeAfter: (showBeforeAfter) => set({ showBeforeAfter }),
  toggleBeforeAfter: () => set((state) => ({ showBeforeAfter: !state.showBeforeAfter })),

  // Shell Layout & UI
  sidebarWidth: getStoredSidebarWidth(),
  isSidebarCollapsed: getStoredSidebarCollapsed(),
  activeTheme: getStoredTheme(),
  isFullScreen: false,
  isManualOpen: false,

  setSidebarWidth: (width) => set(() => {
    const clamped = Math.max(300, Math.min(480, width));
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
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
    return { isFullScreen: next };
  }),

  setIsManualOpen: (isManualOpen) => set({ isManualOpen }),

  resetAll: () => set((state) => ({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    gamma: 1.0,
    depth: 8,
    algoParams: {
      ...state.algoParams,
      [state.algorithmId]: getInitialAlgoParams(state.algorithmId)
    },
    zoom: 100,
    panX: 0,
    panY: 0,
    splitRatio: 0.5,
    showBeforeAfter: false
  }))
}));

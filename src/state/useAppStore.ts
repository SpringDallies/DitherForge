import { create } from 'zustand';
// Import frozen registries UNCHANGED
// @ts-ignore
import { ALGORITHM_REGISTRY } from '../dither-engine/algorithms.js';
// @ts-ignore
import { BUILTIN_PALETTES } from '../dither-engine/palettes.js';
// @ts-ignore
import { AVAILABLE_EFFECT_TYPES } from '../dither-engine/effect-stack.js';

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
  floyd_steinberg: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  atkinson: { threshold: 0.5, scale: 1.0, diffusionStrength: 0.75, serpentine: true },
  jarvis_judice_ninke: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  stucki: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  burkes: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  sierra_3: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  sierra_2: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  sierra_lite: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  stevenson_arce: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  fan: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  shiau_fan: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  shiau_fan_2: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  false_floyd_steinberg: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  minimized_avg_error: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },
  dynamic_serpentine: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: true },

  // Ordered dithers
  bayer_2x2: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  bayer_4x4: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  bayer_8x8: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  bayer_16x16: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  clustered_dot: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false },

  // Pattern dithers
  checkered: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  horizontal_lines: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false },
  vertical_lines: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false },
  crosshatch: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false },
  diagonal_hatch: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false },
  concentric_diamond: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false },
  woven_basket: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false },
  hex_stipple: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },

  // Glitch
  scanline_jitter: { threshold: 0.45, scale: 1.0, diffusionStrength: 0.8, serpentine: false },
  chromatic_offset: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  pixel_sorting: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  digital_artifacts: { threshold: 0.5, scale: 2.0, diffusionStrength: 1.0, serpentine: false },
  interlacing_tear: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  crt_bloom: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  bit_crush: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  vhs_tracking: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },

  // Bespoke & Temporal
  ignition_glow: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false },
  temporal_kinetic: { threshold: 0.5, scale: 1.0, diffusionStrength: 1.0, serpentine: false }
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
  // Algorithm selection & per-algorithm parameters
  algorithmId: string;
  algoParams: Record<string, AlgoParams>;
  setAlgorithmId: (id: string) => void;
  updateCurrentAlgoParam: <K extends keyof AlgoParams>(key: K, value: AlgoParams[K]) => void;

  // Global Image Adjustments
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

  // Color & Palette
  activePalette: string;
  lockedSwatches: number[];
  setActivePalette: (paletteName: string) => void;
  toggleLockSwatch: (index: number) => void;

  // Post-Effects Stack
  effects: EffectItem[];
  toggleEffect: (id: string) => void;
  reorderEffects: (startIndex: number, endIndex: number) => void;
  addEffect: (effectType: string) => void;
  removeEffect: (index: number) => void;

  // Render & Viewport State
  updateMode: UpdateMode;
  setUpdateMode: (mode: UpdateMode) => void;
  zoom: number;
  panX: number;
  panY: number;
  splitRatio: number;
  showBeforeAfter: boolean;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setSplitRatio: (ratio: number) => void;
  setShowBeforeAfter: (show: boolean) => void;
  lastRenderMs: number;
  setLastRenderMs: (ms: number) => void;

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

const getStoredSidebarWidth = (): number => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_SIDEBAR_WIDTH);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 280 && num <= 600) return num;
    }
  } catch {}
  return 360;
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

export const useAppStore = create<AppState>((set) => ({
  // Algorithm selection
  algorithmId: getStoredAlgorithm(),
  algoParams: buildInitialAlgoParamsMap(),
  setAlgorithmId: (id: string) => set((state) => {
    // If not yet instantiated, generate its default entry
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

  // Palette
  activePalette: BUILTIN_PALETTES[0]?.name || 'Monochrome 1-Bit',
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

  // Viewport / Render Mode
  updateMode: 'precise',
  setUpdateMode: (updateMode) => set({ updateMode }),
  zoom: 100,
  panX: 0,
  panY: 0,
  splitRatio: 0.5,
  showBeforeAfter: false,
  setZoom: (zoom) => set({ zoom }),
  setPan: (panX, panY) => set({ panX, panY }),
  setSplitRatio: (splitRatio) => set({ splitRatio }),
  setShowBeforeAfter: (showBeforeAfter) => set({ showBeforeAfter }),
  lastRenderMs: 0,
  setLastRenderMs: (lastRenderMs) => set({ lastRenderMs }),

  // Shell Layout & UI
  sidebarWidth: getStoredSidebarWidth(),
  isSidebarCollapsed: getStoredSidebarCollapsed(),
  activeTheme: getStoredTheme(),
  isFullScreen: false,
  isManualOpen: false,

  setSidebarWidth: (width) => set(() => {
    const clamped = Math.max(280, Math.min(600, width));
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
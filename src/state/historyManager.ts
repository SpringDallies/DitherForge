/**
 * History Manager for DitherForge
 * Provides full Application-Level Undo / Redo for ALL creative and editing events:
 * - Dithering algorithms & algorithm parameters
 * - Image adjustments (brightness, contrast, saturation, hue, gamma, blur, denoise, highlight, depth)
 * - Color palettes & custom swatches (activePalette, workingPalette, paletteDepth, inverted, flipped)
 * - Effects stack (enabled, order, addition, deletion, parameters, opacity, blendMode)
 * - Animation tracks (keyframes, properties, times, easing, duration, fps)
 * - Preset applications and resets
 *
 * Implements microtask coalescing and drag-gesture grouping so continuous slider
 * movements form a single undo step, while discrete actions commit immediately.
 */

import { DEFAULT_ASCII_SETTINGS, type AsciiSettings } from '../ascii/types';

function cloneAsciiSettings(src?: AsciiSettings | null): AsciiSettings {
  const s = src || DEFAULT_ASCII_SETTINGS;
  return {
    ...s,
    injectedChars: Array.isArray(s.injectedChars) ? s.injectedChars.slice() : [],
    algoParams: s.algoParams ? { ...s.algoParams } : {},
    asciiEffects: Array.isArray(s.asciiEffects)
      ? s.asciiEffects.map((e) => ({
          ...e,
          params: e.params ? { ...e.params } : {}
        }))
      : []
  };
}

function shallowRecordEqual(
  a: Record<string, any> | undefined,
  b: Record<string, any> | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const k = keysA[i];
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function areAsciiSettingsEqual(a: AsciiSettings, b: AsciiSettings): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  if (
    a.algorithmId !== b.algorithmId ||
    a.charsetId !== b.charsetId ||
    a.customCharsetChars !== b.customCharsetChars ||
    a.characterDepth !== b.characterDepth ||
    a.characterOffset !== b.characterOffset ||
    a.injectMode !== b.injectMode ||
    a.reverseCharset !== b.reverseCharset ||
    a.autoCalibrateOrder !== b.autoCalibrateOrder ||
    a.fontFamily !== b.fontFamily ||
    a.fontWeight !== b.fontWeight ||
    a.cellWidth !== b.cellWidth ||
    a.cellHeight !== b.cellHeight ||
    a.cellSpacing !== b.cellSpacing ||
    a.aspectRatio !== b.aspectRatio ||
    a.glyphScale !== b.glyphScale ||
    a.glyphAlign !== b.glyphAlign ||
    a.brightness !== b.brightness ||
    a.contrast !== b.contrast ||
    a.gamma !== b.gamma ||
    a.exposure !== b.exposure ||
    a.blackPoint !== b.blackPoint ||
    a.whitePoint !== b.whitePoint ||
    a.invert !== b.invert ||
    a.luminanceMode !== b.luminanceMode ||
    a.edgeSensitivity !== b.edgeSensitivity ||
    a.detailPreservation !== b.detailPreservation ||
    a.samplingQuality !== b.samplingQuality ||
    a.smoothing !== b.smoothing ||
    a.sharpening !== b.sharpening ||
    a.colorMode !== b.colorMode ||
    a.foregroundColor !== b.foregroundColor ||
    a.foregroundOpacity !== b.foregroundOpacity ||
    a.colorQuantization !== b.colorQuantization ||
    a.preserveAlpha !== b.preserveAlpha ||
    a.backgroundMode !== b.backgroundMode ||
    a.backgroundColor !== b.backgroundColor ||
    a.backgroundOpacity !== b.backgroundOpacity ||
    a.densityCalibration !== b.densityCalibration ||
    a.clipping !== b.clipping
  ) {
    return false;
  }

  if (a.injectedChars.length !== b.injectedChars.length) return false;
  for (let i = 0; i < a.injectedChars.length; i++) {
    if (a.injectedChars[i] !== b.injectedChars[i]) return false;
  }

  if (!shallowRecordEqual(a.algoParams, b.algoParams)) return false;

  if (a.asciiEffects.length !== b.asciiEffects.length) return false;
  for (let i = 0; i < a.asciiEffects.length; i++) {
    const ea = a.asciiEffects[i];
    const eb = b.asciiEffects[i];
    if (ea === eb) continue;
    if (
      ea.id !== eb.id ||
      ea.enabled !== eb.enabled ||
      ea.stage !== eb.stage ||
      !shallowRecordEqual(ea.params, eb.params)
    ) {
      return false;
    }
  }

  return true;
}

export interface EditorSnapshot {
  algorithmId: string;
  algoParams: Record<string, any>;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  gamma: number;
  blur: number;
  denoise: number;
  highlight: number;
  depth: number;
  activePaletteId: string;
  activePalette: string;
  workingPalette: number[][];
  paletteDepth: number;
  paletteInverted: boolean;
  paletteFlipped: boolean;
  effects: any[];
  animationTracks: any[];
  fps: number;
  duration: number;
  renderMode: 'dither' | 'ascii';
  asciiSettings: AsciiSettings;
}

export function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return {
    algorithmId: snapshot.algorithmId,
    algoParams: JSON.parse(JSON.stringify(snapshot.algoParams || {})),
    brightness: snapshot.brightness,
    contrast: snapshot.contrast,
    saturation: snapshot.saturation,
    hue: snapshot.hue,
    gamma: snapshot.gamma,
    blur: snapshot.blur,
    denoise: snapshot.denoise,
    highlight: snapshot.highlight,
    depth: snapshot.depth,
    activePaletteId: snapshot.activePaletteId,
    activePalette: snapshot.activePalette,
    workingPalette: (snapshot.workingPalette || []).map((c) => [...c]),
    paletteDepth: snapshot.paletteDepth,
    paletteInverted: Boolean(snapshot.paletteInverted),
    paletteFlipped: Boolean(snapshot.paletteFlipped),
    effects: (snapshot.effects || []).map((eff) => ({
      ...eff,
      params: JSON.parse(JSON.stringify(eff.params || {}))
    })),
    animationTracks: (snapshot.animationTracks || []).map((tr) => ({ ...tr })),
    fps: snapshot.fps,
    duration: snapshot.duration,
    renderMode: snapshot.renderMode === 'ascii' ? 'ascii' : 'dither',
    asciiSettings: cloneAsciiSettings(snapshot.asciiSettings)
  };
}

export function captureSnapshot(state: any): EditorSnapshot {
  return cloneSnapshot({
    algorithmId: state.algorithmId || 'floyd-steinberg',
    algoParams: state.algoParams || {},
    brightness: state.brightness ?? 0,
    contrast: state.contrast ?? 0,
    saturation: state.saturation ?? 0,
    hue: state.hue ?? 0,
    gamma: state.gamma ?? 1.0,
    blur: state.blur ?? 0,
    denoise: state.denoise ?? 0,
    highlight: state.highlight ?? 0,
    depth: state.depth ?? 8,
    activePaletteId: state.activePaletteId || '',
    activePalette: state.activePalette || '',
    workingPalette: state.workingPalette || [],
    paletteDepth: state.paletteDepth ?? 2,
    paletteInverted: Boolean(state.paletteInverted),
    paletteFlipped: Boolean(state.paletteFlipped),
    effects: state.effects || [],
    animationTracks: state.animationTracks || [],
    fps: state.fps ?? 30,
    duration: state.duration ?? 15.0,
    renderMode: state.renderMode === 'ascii' ? 'ascii' : 'dither',
    asciiSettings: cloneAsciiSettings(state.asciiSettings)
  });
}

export function areSnapshotsEqual(a: EditorSnapshot | null, b: EditorSnapshot | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (
    a.algorithmId !== b.algorithmId ||
    a.brightness !== b.brightness ||
    a.contrast !== b.contrast ||
    a.saturation !== b.saturation ||
    a.hue !== b.hue ||
    a.gamma !== b.gamma ||
    a.blur !== b.blur ||
    a.denoise !== b.denoise ||
    a.highlight !== b.highlight ||
    a.depth !== b.depth ||
    a.activePaletteId !== b.activePaletteId ||
    a.paletteDepth !== b.paletteDepth ||
    a.paletteInverted !== b.paletteInverted ||
    a.paletteFlipped !== b.paletteFlipped ||
    a.fps !== b.fps ||
    a.duration !== b.duration ||
    a.effects.length !== b.effects.length ||
    a.animationTracks.length !== b.animationTracks.length ||
    a.workingPalette.length !== b.workingPalette.length
  ) {
    return false;
  }
  if (a.renderMode !== b.renderMode) return false;
  if (!areAsciiSettingsEqual(a.asciiSettings, b.asciiSettings)) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function applySnapshotToStore(store: any, snapshot: EditorSnapshot): void {
  const cloned = cloneSnapshot(snapshot);
  store.setState({
    algorithmId: cloned.algorithmId,
    algoParams: cloned.algoParams,
    brightness: cloned.brightness,
    contrast: cloned.contrast,
    saturation: cloned.saturation,
    hue: cloned.hue,
    gamma: cloned.gamma,
    blur: cloned.blur,
    denoise: cloned.denoise,
    highlight: cloned.highlight,
    depth: cloned.depth,
    activePaletteId: cloned.activePaletteId,
    activePalette: cloned.activePalette,
    workingPalette: cloned.workingPalette,
    paletteDepth: cloned.paletteDepth,
    paletteInverted: cloned.paletteInverted,
    paletteFlipped: cloned.paletteFlipped,
    effects: cloned.effects,
    animationTracks: cloned.animationTracks,
    fps: cloned.fps,
    duration: cloned.duration,
    renderMode: cloned.renderMode === 'ascii' ? 'ascii' : 'dither',
    asciiSettings: cloneAsciiSettings(cloned.asciiSettings)
  });
}

export class HistoryManager {
  private undoStack: EditorSnapshot[] = [];
  private redoStack: EditorSnapshot[] = [];
  private currentSnapshot: EditorSnapshot | null = null;
  private isApplying = false;
  private maxHistory: number;
  private store: any = null;
  private unsubscribe: (() => void) | null = null;

  private wasDraggingSlider = false;
  private dragStartSnapshot: EditorSnapshot | null = null;
  private debounceTimer: any = null;
  private pendingDebounceSnapshot: EditorSnapshot | null = null;
  private currentDebounceLatest: EditorSnapshot | null = null;
  private lastSeenAlgoParams: any = null;
  private lastSeenWorkingPalette: any = null;
  private lastSeenEffects: any = null;
  private lastSeenTracks: any = null;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  public init(store: any): void {
    this.store = store;
    const initial = store.getState();
    this.currentSnapshot = captureSnapshot(initial);
    this.lastSeenAlgoParams = initial.algoParams;
    this.lastSeenWorkingPalette = initial.workingPalette;
    this.lastSeenEffects = initial.effects;
    this.lastSeenTracks = initial.animationTracks;
    this.undoStack = [];
    this.redoStack = [];
    this.syncCanUndoRedo();

    this.unsubscribe = store.subscribe((state: any) => {
      if (this.isApplying) return;
      this.handleStateChange(state);
    });
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.undoStack = [];
    this.redoStack = [];
    this.currentSnapshot = null;
    this.store = null;
  }

  public handleStateChange(state: any): void {
    if (this.isApplying) return;

    // Fast-path: short-circuit if none of the tracked fields changed
    if (
      this.currentSnapshot &&
      state.algorithmId === this.currentSnapshot.algorithmId &&
      state.algoParams === this.lastSeenAlgoParams &&
      state.workingPalette === this.lastSeenWorkingPalette &&
      state.effects === this.lastSeenEffects &&
      state.animationTracks === this.lastSeenTracks &&
      state.brightness === this.currentSnapshot.brightness &&
      state.contrast === this.currentSnapshot.contrast &&
      state.saturation === this.currentSnapshot.saturation &&
      state.hue === this.currentSnapshot.hue &&
      state.gamma === this.currentSnapshot.gamma &&
      state.blur === this.currentSnapshot.blur &&
      state.denoise === this.currentSnapshot.denoise &&
      state.highlight === this.currentSnapshot.highlight &&
      state.depth === this.currentSnapshot.depth &&
      state.activePaletteId === this.currentSnapshot.activePaletteId &&
      state.paletteDepth === this.currentSnapshot.paletteDepth &&
      state.paletteInverted === this.currentSnapshot.paletteInverted &&
      state.paletteFlipped === this.currentSnapshot.paletteFlipped &&
      state.fps === this.currentSnapshot.fps &&
      state.duration === this.currentSnapshot.duration &&
      state.renderMode === this.currentSnapshot.renderMode &&
      state.asciiSettings === this.currentSnapshot.asciiSettings
    ) {
      return;
    }

    this.lastSeenAlgoParams = state.algoParams;
    this.lastSeenWorkingPalette = state.workingPalette;
    this.lastSeenEffects = state.effects;
    this.lastSeenTracks = state.animationTracks;

    const isDragging = Boolean(state.isDraggingSlider);

    // 1. Transition: Started dragging slider
    if (isDragging && !this.wasDraggingSlider) {
      this.wasDraggingSlider = true;
      this.flushDebounce();
      this.dragStartSnapshot = this.currentSnapshot ? cloneSnapshot(this.currentSnapshot) : null;
      this.redoStack = [];
      this.syncCanUndoRedo();
      return;
    }

    // 2. Actively dragging slider: do not push intermediate values to history
    if (isDragging) {
      return;
    }

    // 3. Transition: Finished dragging slider
    if (!isDragging && this.wasDraggingSlider) {
      this.wasDraggingSlider = false;
      const newSnapshot = captureSnapshot(state);
      if (this.dragStartSnapshot && !areSnapshotsEqual(this.dragStartSnapshot, newSnapshot)) {
        this.pushUndoStep(this.dragStartSnapshot, newSnapshot);
      }
      this.dragStartSnapshot = null;
      return;
    }

    // 4. Regular change outside of active slider drag
    const newSnapshot = captureSnapshot(state);
    if (!this.currentSnapshot || areSnapshotsEqual(this.currentSnapshot, newSnapshot)) {
      return;
    }

    // Count how many primitive adjustment fields changed
    let adjustmentChangeCount = 0;
    if (this.currentSnapshot.brightness !== newSnapshot.brightness) adjustmentChangeCount++;
    if (this.currentSnapshot.contrast !== newSnapshot.contrast) adjustmentChangeCount++;
    if (this.currentSnapshot.saturation !== newSnapshot.saturation) adjustmentChangeCount++;
    if (this.currentSnapshot.hue !== newSnapshot.hue) adjustmentChangeCount++;
    if (this.currentSnapshot.gamma !== newSnapshot.gamma) adjustmentChangeCount++;
    if (this.currentSnapshot.blur !== newSnapshot.blur) adjustmentChangeCount++;
    if (this.currentSnapshot.denoise !== newSnapshot.denoise) adjustmentChangeCount++;
    if (this.currentSnapshot.highlight !== newSnapshot.highlight) adjustmentChangeCount++;
    if (this.currentSnapshot.depth !== newSnapshot.depth) adjustmentChangeCount++;

    // Compare active algorithm parameters only
    const currActiveAlgoParams = this.currentSnapshot.algoParams[newSnapshot.algorithmId] ?? {};
    const newActiveAlgoParams = newSnapshot.algoParams[newSnapshot.algorithmId] ?? {};
    const algoParamKeysChanged = Object.keys(currActiveAlgoParams).length !== Object.keys(newActiveAlgoParams).length ||
      Object.keys(newActiveAlgoParams).filter(k => currActiveAlgoParams[k] !== newActiveAlgoParams[k]);
    const algoParamChangedCount = Array.isArray(algoParamKeysChanged) ? algoParamKeysChanged.length : 1;

    // Discrete structural change: algorithms, palettes, effect list/toggle, animation tracks, or batch reset
    const isDiscrete =
      adjustmentChangeCount > 1 || // batch reset of adjustments
      this.currentSnapshot.algorithmId !== newSnapshot.algorithmId ||
      algoParamChangedCount > 1 || // batch reset or multi-param change
      this.currentSnapshot.activePaletteId !== newSnapshot.activePaletteId ||
      this.currentSnapshot.paletteInverted !== newSnapshot.paletteInverted ||
      this.currentSnapshot.paletteFlipped !== newSnapshot.paletteFlipped ||
      this.currentSnapshot.effects.length !== newSnapshot.effects.length ||
      this.currentSnapshot.animationTracks.length !== newSnapshot.animationTracks.length ||
      this.currentSnapshot.workingPalette.length !== newSnapshot.workingPalette.length ||
      this.currentSnapshot.effects.some((eff, i) => eff.enabled !== newSnapshot.effects[i]?.enabled) ||
      this.currentSnapshot.effects.some((eff, i) => eff.id !== newSnapshot.effects[i]?.id) ||
      this.currentSnapshot.effects.some((eff, i) => eff.blendMode !== newSnapshot.effects[i]?.blendMode);

    if (isDiscrete) {
      this.flushDebounce();
      this.pushUndoStep(this.currentSnapshot, newSnapshot);
    } else {
      // Continuous single-value edit (e.g. typing or keyboard stepper)
      this.redoStack = [];
      this.syncCanUndoRedo();
      if (!this.pendingDebounceSnapshot) {
        this.pendingDebounceSnapshot = cloneSnapshot(this.currentSnapshot);
      }
      this.currentDebounceLatest = cloneSnapshot(newSnapshot);
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        if (this.pendingDebounceSnapshot && this.currentDebounceLatest) {
          if (!areSnapshotsEqual(this.pendingDebounceSnapshot, this.currentDebounceLatest)) {
            this.pushUndoStep(this.pendingDebounceSnapshot, this.currentDebounceLatest);
          }
        }
        this.pendingDebounceSnapshot = null;
        this.currentDebounceLatest = null;
        this.debounceTimer = null;
      }, 350);
    }
  }

  public flushDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.pendingDebounceSnapshot && this.currentDebounceLatest) {
      if (!areSnapshotsEqual(this.pendingDebounceSnapshot, this.currentDebounceLatest)) {
        this.pushUndoStep(this.pendingDebounceSnapshot, this.currentDebounceLatest);
      }
      this.pendingDebounceSnapshot = null;
      this.currentDebounceLatest = null;
    }
  }

  public pushUndoStep(fromSnapshot: EditorSnapshot, toSnapshot: EditorSnapshot): void {
    this.undoStack.push(cloneSnapshot(fromSnapshot));
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.currentSnapshot = cloneSnapshot(toSnapshot);
    this.syncCanUndoRedo();
  }

  public undo(): void {
    this.flushDebounce();
    if (this.undoStack.length === 0 || !this.store) return;

    const targetSnapshot = this.undoStack.pop()!;
    const current = captureSnapshot(this.store.getState());
    this.redoStack.push(cloneSnapshot(current));
    if (this.redoStack.length > this.maxHistory) {
      this.redoStack.shift();
    }

    this.isApplying = true;
    this.currentSnapshot = cloneSnapshot(targetSnapshot);
    try {
      applySnapshotToStore(this.store, targetSnapshot);
    } finally {
      this.isApplying = false;
    }
    this.syncCanUndoRedo();
  }

  public redo(): void {
    this.flushDebounce();
    if (this.redoStack.length === 0 || !this.store) return;

    const targetSnapshot = this.redoStack.pop()!;
    const current = captureSnapshot(this.store.getState());
    this.undoStack.push(cloneSnapshot(current));
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.isApplying = true;
    this.currentSnapshot = cloneSnapshot(targetSnapshot);
    try {
      applySnapshotToStore(this.store, targetSnapshot);
    } finally {
      this.isApplying = false;
    }
    this.syncCanUndoRedo();
  }

  public clearHistory(): void {
    this.flushDebounce();
    this.undoStack = [];
    this.redoStack = [];
    this.dragStartSnapshot = null;
    this.wasDraggingSlider = false;
    if (this.store) {
      this.currentSnapshot = captureSnapshot(this.store.getState());
    }
    this.syncCanUndoRedo();
  }

  public getCanUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public getCanRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoStackLength(): number {
    return this.undoStack.length;
  }

  public getRedoStackLength(): number {
    return this.redoStack.length;
  }

  private syncCanUndoRedo(): void {
    if (!this.store) return;
    const canUndo = this.undoStack.length > 0;
    const canRedo = this.redoStack.length > 0;
    const state = this.store.getState();
    if (state.canUndo !== canUndo || state.canRedo !== canRedo) {
      this.store.setState({ canUndo, canRedo });
    }
  }
}

// Global Singleton Instance
export const historyManager = new HistoryManager(50);

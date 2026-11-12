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
    duration: snapshot.duration
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
    duration: state.duration ?? 15.0
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
    duration: cloned.duration
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

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  public init(store: any): void {
    this.store = store;
    this.currentSnapshot = captureSnapshot(store.getState());
    this.undoStack = [];
    this.redoStack = [];
    this.syncCanUndoRedo();

    this.unsubscribe = store.subscribe((state: any) => {
      queueMicrotask(() => {
        if (this.isApplying) return;
        this.handleStateChange(store.getState());
      });
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

    // Discrete structural change: algorithms, palettes, effect list/toggle, animation tracks, or batch reset
    const isDiscrete =
      adjustmentChangeCount > 1 || // batch reset of adjustments
      this.currentSnapshot.algorithmId !== newSnapshot.algorithmId ||
      JSON.stringify(this.currentSnapshot.algoParams) !== JSON.stringify(newSnapshot.algoParams) ||
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

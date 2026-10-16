// DitherForge Keyframe Interpolation & Multi-Track Animation Engine
// Pure TypeScript module supporting arbitrary timeline durations, tracks, keyframes, and easing curves.

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'step';

export type KeyframeTarget =
  | 'threshold'
  | 'scale'
  | 'diffusionStrength'
  | 'noiseAmount'
  | 'offsetX'
  | 'offsetY'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'gamma'
  | 'temporalIntensity'
  | 'temporalSpeed'
  | `effect:${string}:${string}` // e.g. "effect:glow:radius" or "effect:chromatic_aberration:offsetX"
  | (string & {}); // allow custom algorithm sliders

export interface Keyframe {
  id: string;
  frame: number; // 0 to totalFrames
  value: number;
  easing: EasingType;
}

export interface AnimationTrack {
  target: KeyframeTarget;
  label: string;
  min: number;
  max: number;
  step: number;
  keyframes: Keyframe[]; // Always sorted ascending by `frame`
}

export interface ResolvedAnimatedState {
  algoParams: Record<string, any>;
  rawTweaks: {
    brightness: number;
    contrast: number;
    saturation: number;
    gamma: number;
  };
  tweaks: {
    brightness: number;
    contrast: number;
    saturation: number;
    gamma: number;
  };
  effects: any[];
  temporal?: {
    patternId: string;
    frameIndex: number;
    intensity: number;
    speed: number;
    isPlaying?: boolean;
  };
}

/**
 * Evaluates normalized time t [0.0, 1.0] across different easing curves.
 */
export function evaluateEasing(t: number, easing: EasingType): number {
  switch (easing) {
    case 'linear':
      return t;
    case 'easeIn':
      return t * t;
    case 'easeOut':
      return t * (2 - t);
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'step':
      return t >= 1 ? 1 : 0;
    default:
      return t;
  }
}

/**
 * Evaluates an AnimationTrack at a given integer or fractional frame.
 * Keyframes are expected to be sorted ascending by frame.
 */
export function evaluateTrackAtFrame(
  track: AnimationTrack,
  frame: number,
  fallbackValue: number
): number {
  if (!track || !track.keyframes || track.keyframes.length === 0) {
    return fallbackValue;
  }

  const kfs = track.keyframes;
  const count = kfs.length;

  if (frame <= kfs[0].frame) {
    return kfs[0].value;
  }
  if (frame >= kfs[count - 1].frame) {
    return kfs[count - 1].value;
  }

  // Binary search for the surrounding pair (kfPrev, kfNext)
  let low = 0;
  let high = count - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (kfs[mid].frame <= frame) {
      if (mid === count - 1 || kfs[mid + 1].frame > frame) {
        const kfPrev = kfs[mid];
        const kfNext = kfs[mid + 1];
        const span = Math.max(1, kfNext.frame - kfPrev.frame);
        const t = Math.max(0, Math.min(1, (frame - kfPrev.frame) / span));
        const easedT = evaluateEasing(t, kfPrev.easing);
        return kfPrev.value + (kfNext.value - kfPrev.value) * easedT;
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return fallbackValue;
}

/**
 * Resolves the animated state at a specific frame without mutating the base store.
 * Returns interpolated { algoParams, rawTweaks, tweaks, effects, temporal }.
 */
export function resolveAnimatedStateAtFrame(state: any, frame: number): ResolvedAnimatedState {
  const tracks: Record<string, AnimationTrack> | undefined = state.animationTracks;
  const hasTracks = Boolean(tracks && Object.keys(tracks).length > 0);

  // 1. Base tweaks
  let rawBrightness = state.brightness ?? 0;
  let rawContrast = state.contrast ?? 0;
  let rawSaturation = state.saturation ?? 0;
  let rawGamma = state.gamma ?? 1.0;

  // 2. Base algorithm parameters
  const baseAlgoId = state.algorithmId || 'floyd-steinberg';
  const baseAlgoParams = state.algoParams?.[baseAlgoId] || {};
  let algoParams = baseAlgoParams;

  // 3. Base effects stack
  let effects = state.effects || [];

  // 4. Base temporal CRT noise
  let temporalIntensity = state.temporalIntensity ?? 0;
  let temporalSpeed = state.temporalSpeed ?? 1.0;

  const shouldEvaluate = (track?: AnimationTrack) => {
    if (!track || !track.keyframes || track.keyframes.length === 0) return false;
    if (!state.isPlaying && track.keyframes.length <= 1) return false;
    return true;
  };

  if (hasTracks && tracks) {
    // Interpolate adjustments
    if (shouldEvaluate(tracks['brightness'])) {
      rawBrightness = evaluateTrackAtFrame(tracks['brightness'], frame, rawBrightness);
    }
    if (shouldEvaluate(tracks['contrast'])) {
      rawContrast = evaluateTrackAtFrame(tracks['contrast'], frame, rawContrast);
    }
    if (shouldEvaluate(tracks['saturation'])) {
      rawSaturation = evaluateTrackAtFrame(tracks['saturation'], frame, rawSaturation);
    }
    if (shouldEvaluate(tracks['gamma'])) {
      rawGamma = evaluateTrackAtFrame(tracks['gamma'], frame, rawGamma);
    }

    // Interpolate temporal parameters
    if (shouldEvaluate(tracks['temporalIntensity'])) {
      temporalIntensity = evaluateTrackAtFrame(tracks['temporalIntensity'], frame, temporalIntensity);
    }
    if (shouldEvaluate(tracks['temporalSpeed'])) {
      temporalSpeed = evaluateTrackAtFrame(tracks['temporalSpeed'], frame, temporalSpeed);
    }

    // Interpolate algorithm parameters
    let paramsChanged = false;
    const newAlgoParams: Record<string, any> = { ...baseAlgoParams };

    for (const [key, track] of Object.entries(tracks)) {
      if (
        key === 'brightness' ||
        key === 'contrast' ||
        key === 'saturation' ||
        key === 'gamma' ||
        key === 'temporalIntensity' ||
        key === 'temporalSpeed' ||
        key.startsWith('effect:')
      ) {
        continue;
      }
      if (shouldEvaluate(track)) {
        const fallback = baseAlgoParams[key] ?? 0;
        newAlgoParams[key] = evaluateTrackAtFrame(track, frame, fallback);
        paramsChanged = true;
      }
    }
    if (paramsChanged) {
      algoParams = newAlgoParams;
    }

    // Interpolate effect stack parameters
    const hasEffectTracks = Object.keys(tracks).some((k) => k.startsWith('effect:'));
    if (hasEffectTracks && state.effects && state.effects.length > 0) {
      effects = state.effects.map((eff: any) => {
        let effChanged = false;
        const newParams = { ...eff.params };
        for (const [trackKey, track] of Object.entries(tracks)) {
          if (trackKey.startsWith(`effect:${eff.id}:`)) {
            if (shouldEvaluate(track)) {
              const paramKey = trackKey.slice(`effect:${eff.id}:`.length);
              const fallback = eff.params?.[paramKey] ?? 0;
              newParams[paramKey] = evaluateTrackAtFrame(track, frame, fallback);
              effChanged = true;
            }
          }
        }
        return effChanged ? { ...eff, params: newParams } : eff;
      });
    }
  }

  // Construct temporal descriptor
  let temporal: ResolvedAnimatedState['temporal'] = undefined;
  if (state.workspaceMode === 'animation') {
    const isAnimating = state.isPlaying || state.animateStill || frame > 0 || temporalIntensity > 0;
    const activeIntensity = temporalIntensity > 0 ? temporalIntensity : 0;
    const pattern = state.temporalPattern || state.temporalPatternId || 'grain';
    if (isAnimating && activeIntensity > 0 && pattern !== 'none') {
      temporal = {
        patternId: pattern,
        frameIndex: frame,
        intensity: activeIntensity,
        speed: temporalSpeed,
        isPlaying: Boolean(state.isPlaying)
      };
    }
  }

  return {
    algoParams,
    rawTweaks: {
      brightness: rawBrightness,
      contrast: rawContrast,
      saturation: rawSaturation,
      gamma: rawGamma
    },
    tweaks: {
      brightness: rawBrightness / 100,
      contrast: rawContrast / 100,
      saturation: rawSaturation / 100,
      gamma: rawGamma
    },
    effects,
    temporal
  };
}

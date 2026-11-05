// DitherForge Photographic Film Grain Effect
// Luminance-weighted, per-channel stochastic silver halide crystal simulation

import type { EffectDescriptor, ParamMeta, EffectContext } from '../types';

export interface FilmGrainParams {
  intensity: number;
  size: number;
  channelIndependence: number;
  shadowWeight: number;
  midWeight: number;
  highlightWeight: number;
  temporal: boolean;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'intensity',
    label: 'Grain Intensity',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.02,
    defaultValue: 0.25
  },
  {
    id: 'size',
    label: 'Grain Particle Size',
    type: 'range',
    min: 1,
    max: 4,
    step: 1,
    defaultValue: 1,
    unit: 'px'
  },
  {
    id: 'channelIndependence',
    label: 'Color Separation (Chroma)',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.3
  },
  {
    id: 'shadowWeight',
    label: 'Shadow Density',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.7
  },
  {
    id: 'midWeight',
    label: 'Midtone Density',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 1.0
  },
  {
    id: 'highlightWeight',
    label: 'Highlight Density',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.4
  },
  {
    id: 'temporal',
    label: 'Animate Grain Over Time',
    type: 'boolean',
    defaultValue: true
  }
];

// High-speed deterministic 2D/3D integer hash (Wang / Jenkins hash mix)
function hashPoint(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return (h / 4294967295) * 2.0 - 1.0; // Uniform [-1.0, 1.0]
}

export const filmGrainEffect: EffectDescriptor<FilmGrainParams> = {
  id: 'film_grain',
  name: 'Film Grain',
  category: 'film',
  description: 'Physical silver-halide photographic grain weighted across shadow, midtone, and highlight zones.',
  defaultParams: {
    intensity: 0.25,
    size: 1,
    channelIndependence: 0.3,
    shadowWeight: 0.7,
    midWeight: 1.0,
    highlightWeight: 0.4,
    temporal: true
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg, contextArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: FilmGrainParams;
    let context: EffectContext = {};

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as FilmGrainParams;
      context = (height || {}) as EffectContext;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as FilmGrainParams;
      context = contextArg || {};
    }

    const {
      intensity = 0.25,
      size = 1,
      channelIndependence = 0.3,
      shadowWeight = 0.7,
      midWeight = 1.0,
      highlightWeight = 0.4,
      temporal = true
    } = params;

    if (intensity <= 0.001) return;

    const grainSize = Math.max(1, Math.min(4, Math.round(size)));
    const frameIdx = temporal ? (context.frameIndex || 0) : 0;
    const baseSeed = (frameIdx * 1973) ^ 0x1337;
    const chroma = Math.max(0, Math.min(1, channelIndependence));
    const monoWeight = 1.0 - chroma;
    const maxAmplitude = intensity * 128;

    for (let y = 0; y < h; y++) {
      const gy = Math.floor(y / grainSize);
      const rowOffset = y * w * 4;

      for (let x = 0; x < w; x++) {
        const gx = Math.floor(x / grainSize);
        const idx = rowOffset + x * 4;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Normalized luminance (0..1)
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        // Film grain response curve:
        // Midtones exhibit the highest optical density granularity;
        // shadows have clumping, highlights have fine dispersed grain
        const midFactor = 4.0 * lum * (1.0 - lum) * midWeight;
        const shadowFactor = (1.0 - lum) * (1.0 - lum) * shadowWeight;
        const highlightFactor = lum * lum * highlightWeight;
        const response = Math.min(1.0, midFactor + shadowFactor + highlightFactor);

        const amp = maxAmplitude * response;
        if (amp <= 0.01) continue;

        const monoNoise = hashPoint(gx, gy, baseSeed);
        const rNoise = (monoNoise * monoWeight + hashPoint(gx, gy, baseSeed + 101) * chroma) * amp;
        const gNoise = (monoNoise * monoWeight + hashPoint(gx, gy, baseSeed + 307) * chroma) * amp;
        const bNoise = (monoNoise * monoWeight + hashPoint(gx, gy, baseSeed + 521) * chroma) * amp;

        data[idx] = Math.max(0, Math.min(255, Math.round(r + rNoise)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g + gNoise)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b + bNoise)));
      }
    }
  }
};

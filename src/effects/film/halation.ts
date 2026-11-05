// DitherForge Film Halation Effect
// Threshold-gated highlight scatter along photographic film emulsion layers
// Emulates red/orange halation around bright light sources due to rem-jet reflection

import type { EffectDescriptor, ParamMeta } from '../types';

export interface HalationParams {
  threshold: number;
  radius: number;
  tint: string;
  intensity: number;
  wideNarrowRatio: number;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'threshold',
    label: 'Highlight Threshold',
    type: 'range',
    min: 0.1,
    max: 0.95,
    step: 0.02,
    defaultValue: 0.65
  },
  {
    id: 'radius',
    label: 'Halation Radius',
    type: 'range',
    min: 1,
    max: 32,
    step: 1,
    defaultValue: 10,
    unit: 'px'
  },
  {
    id: 'tint',
    label: 'Halation Tint',
    type: 'color',
    defaultValue: '#ff5a3c'
  },
  {
    id: 'intensity',
    label: 'Scatter Intensity',
    type: 'range',
    min: 0,
    max: 2,
    step: 0.05,
    defaultValue: 0.6
  },
  {
    id: 'wideNarrowRatio',
    label: 'Wide / Narrow Blur Ratio',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.4
  }
];

function parseHexColor(hex: string): [number, number, number] {
  if (!hex || typeof hex !== 'string') return [255, 90, 60];
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 255,
      parseInt(clean[1] + clean[1], 16) || 90,
      parseInt(clean[2] + clean[2], 16) || 60
    ];
  }
  if (clean.length >= 6) {
    return [
      parseInt(clean.slice(0, 2), 16) || 255,
      parseInt(clean.slice(2, 4), 16) || 90,
      parseInt(clean.slice(4, 6), 16) || 60
    ];
  }
  return [255, 90, 60];
}

// Separable fast box/gaussian approximation pass on single-channel or 3-channel buffers
function fastBlurChannel(
  src: Float32Array,
  dst: Float32Array,
  temp: Float32Array,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.max(1, Math.min(32, Math.round(r)));
  const windowSize = radius * 2 + 1;
  const invWindow = 1.0 / windowSize;

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    let sum = 0;
    // Prime the sliding window
    for (let i = -radius; i <= radius; i++) {
      const clampedX = Math.max(0, Math.min(w - 1, i));
      sum += src[rowOffset + clampedX];
    }
    for (let x = 0; x < w; x++) {
      temp[rowOffset + x] = sum * invWindow;
      const xRemove = Math.max(0, x - radius);
      const xAdd = Math.min(w - 1, x + radius + 1);
      sum += src[rowOffset + xAdd] - src[rowOffset + xRemove];
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const clampedY = Math.max(0, Math.min(h - 1, i));
      sum += temp[clampedY * w + x];
    }
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = sum * invWindow;
      const yRemove = Math.max(0, y - radius);
      const yAdd = Math.min(h - 1, y + radius + 1);
      sum += temp[yAdd * w + x] - temp[yRemove * w + x];
    }
  }
}

export const halationEffect: EffectDescriptor<HalationParams> = {
  id: 'halation',
  name: 'Halation',
  category: 'film',
  description: 'Highlight scatter along film emulsion layers with warm red/orange bleed.',
  defaultParams: {
    threshold: 0.65,
    radius: 10,
    tint: '#ff5a3c',
    intensity: 0.6,
    wideNarrowRatio: 0.4
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: HalationParams;

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as HalationParams;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as HalationParams;
    }

    const {
      threshold = 0.65,
      radius = 10,
      tint = '#ff5a3c',
      intensity = 0.6,
      wideNarrowRatio = 0.4
    } = params;

    if (intensity <= 0.001 || radius <= 0) return;

    const [tintR, tintG, tintB] = parseHexColor(tint);
    const pixelCount = w * h;
    const thresh255 = threshold * 255;
    const denom = Math.max(1, 255 - thresh255);

    // 1. Extract thresholded highlight bloom plate
    const highlightPlate = new Float32Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // ITU-R BT.709 perceived luminance
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum > thresh255) {
        const excess = (lum - thresh255) / denom;
        highlightPlate[i] = excess * excess; // Quadratic soft falloff
      }
    }

    // 2. Multi-scale blur passes (Narrow and Wide)
    const narrowRadius = Math.max(1, Math.round(radius * 0.45));
    const wideRadius = Math.max(2, Math.round(radius * 1.5));

    const narrowBlur = new Float32Array(pixelCount);
    const wideBlur = new Float32Array(pixelCount);
    const tempBuffer = new Float32Array(pixelCount);

    fastBlurChannel(highlightPlate, narrowBlur, tempBuffer, w, h, narrowRadius);
    // Double-pass for gaussian approximation
    fastBlurChannel(narrowBlur, narrowBlur, tempBuffer, w, h, narrowRadius);

    fastBlurChannel(highlightPlate, wideBlur, tempBuffer, w, h, wideRadius);
    fastBlurChannel(wideBlur, wideBlur, tempBuffer, w, h, wideRadius);

    // 3. Composite additive halation layer
    const weightWide = Math.max(0, Math.min(1, wideNarrowRatio));
    const weightNarrow = 1.0 - weightWide;
    const boost = intensity * 1.5;

    for (let i = 0; i < pixelCount; i++) {
      const scatter = (narrowBlur[i] * weightNarrow + wideBlur[i] * weightWide) * boost;
      if (scatter <= 0.0001) continue;

      const idx = i * 4;
      data[idx] = Math.min(255, Math.round(data[idx] + scatter * tintR));
      data[idx + 1] = Math.min(255, Math.round(data[idx + 1] + scatter * tintG));
      data[idx + 2] = Math.min(255, Math.round(data[idx + 2] + scatter * tintB));
    }
  }
};

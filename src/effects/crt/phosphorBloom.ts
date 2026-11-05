// DitherForge CRT Phosphor Bloom Effect
// Threshold-gated electron beam scatter and phosphor halo blooming

import type { EffectDescriptor, ParamMeta } from '../types';

export interface PhosphorBloomParams {
  threshold: number;
  radius: number;
  intensity: number;
  tint: string;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'threshold',
    label: 'Beam Bloom Threshold',
    type: 'range',
    min: 0.1,
    max: 0.95,
    step: 0.02,
    defaultValue: 0.6
  },
  {
    id: 'radius',
    label: 'Bloom Radius',
    type: 'range',
    min: 1,
    max: 30,
    step: 1,
    defaultValue: 8,
    unit: 'px'
  },
  {
    id: 'intensity',
    label: 'Bloom Glow Intensity',
    type: 'range',
    min: 0,
    max: 2,
    step: 0.05,
    defaultValue: 0.5
  },
  {
    id: 'tint',
    label: 'Phosphor Emission Tint',
    type: 'color',
    defaultValue: '#a0e0ff'
  }
];

function parseHexColor(hex: string): [number, number, number] {
  if (!hex || typeof hex !== 'string') return [160, 224, 255];
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 160,
      parseInt(clean[1] + clean[1], 16) || 224,
      parseInt(clean[2] + clean[2], 16) || 255
    ];
  }
  if (clean.length >= 6) {
    return [
      parseInt(clean.slice(0, 2), 16) || 160,
      parseInt(clean.slice(2, 4), 16) || 224,
      parseInt(clean.slice(4, 6), 16) || 255
    ];
  }
  return [160, 224, 255];
}

function fastBlurChannel(
  src: Float32Array,
  dst: Float32Array,
  temp: Float32Array,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.max(1, Math.min(30, Math.round(r)));
  const windowSize = radius * 2 + 1;
  const invWindow = 1.0 / windowSize;

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    let sum = 0;
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

export const phosphorBloomEffect: EffectDescriptor<PhosphorBloomParams> = {
  id: 'phosphor_bloom',
  name: 'Phosphor Bloom',
  category: 'crt',
  description: 'Simulates high-intensity electron beam over-excitation and optical scatter on the phosphor layer.',
  defaultParams: {
    threshold: 0.6,
    radius: 8,
    intensity: 0.5,
    tint: '#a0e0ff'
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: PhosphorBloomParams;

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as PhosphorBloomParams;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as PhosphorBloomParams;
    }

    const {
      threshold = 0.6,
      radius = 8,
      intensity = 0.5,
      tint = '#a0e0ff'
    } = params;

    if (intensity <= 0.001 || radius <= 0) return;

    const [tintR, tintG, tintB] = parseHexColor(tint);
    const pixelCount = w * h;
    const thresh255 = threshold * 255;
    const denom = Math.max(1, 255 - thresh255);

    // 1. Extract thresholded emission
    const plate = new Float32Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum > thresh255) {
        const excess = (lum - thresh255) / denom;
        plate[i] = excess * excess;
      }
    }

    // 2. Dual-pass blur for rich gaussian halo
    const blurred = new Float32Array(pixelCount);
    const temp = new Float32Array(pixelCount);
    fastBlurChannel(plate, blurred, temp, w, h, radius);
    fastBlurChannel(blurred, blurred, temp, w, h, radius);

    // 3. Additive emission composite
    const gain = intensity * 1.8;
    for (let i = 0; i < pixelCount; i++) {
      const glow = blurred[i] * gain;
      if (glow <= 0.0001) continue;

      const idx = i * 4;
      data[idx] = Math.min(255, Math.round(data[idx] + glow * tintR));
      data[idx + 1] = Math.min(255, Math.round(data[idx + 1] + glow * tintG));
      data[idx + 2] = Math.min(255, Math.round(data[idx + 2] + glow * tintB));
    }
  }
};

// DitherForge Horizontal Scanline Jitter Effect
// Horizontal sync instability, line jitter, and banded line tears

import type { EffectDescriptor, ParamMeta, EffectContext } from '../types';

export interface ScanlineJitterParams {
  amplitude: number;
  frequency: number;
  mode: 'per_row' | 'banded';
  bandHeight: number;
  temporal: boolean;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'amplitude',
    label: 'Jitter Displacement',
    type: 'range',
    min: 0,
    max: 30,
    step: 0.5,
    defaultValue: 4.0,
    unit: 'px'
  },
  {
    id: 'frequency',
    label: 'Jitter Density / Probability',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.02,
    defaultValue: 0.25
  },
  {
    id: 'mode',
    label: 'Jitter Structure',
    type: 'select',
    options: [
      { value: 'per_row', label: 'Per-Scanline Flutter' },
      { value: 'banded', label: 'Banded Sync Slip' }
    ],
    defaultValue: 'per_row'
  },
  {
    id: 'bandHeight',
    label: 'Band Height (Banded Mode)',
    type: 'range',
    min: 2,
    max: 32,
    step: 1,
    defaultValue: 8,
    unit: 'px'
  },
  {
    id: 'temporal',
    label: 'Animate Jitter Over Time',
    type: 'boolean',
    defaultValue: true
  }
];

function hashJitter(row: number, seed: number): number {
  let h = (row * 668265263 + seed * 374761393) ^ 0x27d4eb2d;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = (h ^ (h >>> 13)) >>> 0;
  return (h / 4294967295) * 2.0 - 1.0;
}

export const scanlineJitterEffect: EffectDescriptor<ScanlineJitterParams> = {
  id: 'scanline_jitter',
  name: 'Scanline Jitter',
  category: 'crt',
  description: 'Simulates horizontal sync timing drift with per-row or banded horizontal scanline displacement.',
  defaultParams: {
    amplitude: 4.0,
    frequency: 0.25,
    mode: 'per_row',
    bandHeight: 8,
    temporal: true
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg, contextArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: ScanlineJitterParams;
    let context: EffectContext = {};

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as ScanlineJitterParams;
      context = (height || {}) as EffectContext;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as ScanlineJitterParams;
      context = contextArg || {};
    }

    const {
      amplitude = 4.0,
      frequency = 0.25,
      mode = 'per_row',
      bandHeight = 8,
      temporal = true
    } = params;

    if (amplitude <= 0.01 || frequency <= 0.001) return;

    const frameIdx = temporal ? (context.frameIndex || 0) : 0;
    const baseSeed = (frameIdx * 2879) ^ 0x4a9b;
    const src = new Uint8ClampedArray(data);
    const isBanded = mode === 'banded';
    const bHeight = Math.max(1, Math.round(bandHeight));

    for (let y = 0; y < h; y++) {
      const blockId = isBanded ? Math.floor(y / bHeight) : y;
      const prob = Math.abs(hashJitter(blockId, baseSeed));

      if (prob > frequency) continue;

      const rawNoise = hashJitter(blockId + 1009, baseSeed);
      const shift = Math.round(rawNoise * amplitude);
      if (shift === 0) continue;

      const rowOffset = y * w * 4;

      for (let x = 0; x < w; x++) {
        const srcX = Math.max(0, Math.min(w - 1, x - shift));
        const srcIdx = rowOffset + srcX * 4;
        const dstIdx = rowOffset + x * 4;

        data[dstIdx] = src[srcIdx];
        data[dstIdx + 1] = src[srcIdx + 1];
        data[dstIdx + 2] = src[srcIdx + 2];
      }
    }
  }
};

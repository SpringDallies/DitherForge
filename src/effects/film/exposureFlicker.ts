// DitherForge Photographic Exposure Flicker Effect
// Hand-cranked silent film rotary shutter exposure inconsistency

import type { EffectDescriptor, ParamMeta, EffectContext } from '../types';

export interface ExposureFlickerParams {
  amplitude: number;
  frequency: number;
  mode: 'smooth' | 'stepped';
  temporal: boolean;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'amplitude',
    label: 'Flicker Amplitude',
    type: 'range',
    min: 0,
    max: 0.5,
    step: 0.01,
    defaultValue: 0.12
  },
  {
    id: 'frequency',
    label: 'Oscillation Speed',
    type: 'range',
    min: 0.1,
    max: 2.0,
    step: 0.05,
    defaultValue: 0.75
  },
  {
    id: 'mode',
    label: 'Flicker Cadence',
    type: 'select',
    options: [
      { value: 'stepped', label: 'Stepped (Frame-by-Frame Cut)' },
      { value: 'smooth', label: 'Smooth (Undulating Drift)' }
    ],
    defaultValue: 'stepped'
  },
  {
    id: 'temporal',
    label: 'Animate Exposure Variation',
    type: 'boolean',
    defaultValue: true
  }
];

function hashFlicker(frame: number): number {
  let h = frame ^ 0x45d9f3b;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = (h ^ (h >>> 13)) >>> 0;
  return (h / 4294967295) * 2.0 - 1.0;
}

export const exposureFlickerEffect: EffectDescriptor<ExposureFlickerParams> = {
  id: 'exposure_flicker',
  name: 'Exposure Flicker',
  category: 'film',
  description: 'Simulates hand-cranked silent camera shutter inconsistency and arc lamp projector illumination wobble.',
  defaultParams: {
    amplitude: 0.12,
    frequency: 0.75,
    mode: 'stepped',
    temporal: true
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg, contextArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: ExposureFlickerParams;
    let context: EffectContext = {};

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as ExposureFlickerParams;
      context = (height || {}) as EffectContext;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as ExposureFlickerParams;
      context = contextArg || {};
    }

    const {
      amplitude = 0.12,
      frequency = 0.75,
      mode = 'stepped',
      temporal = true
    } = params;

    if (amplitude <= 0.001) return;

    const frameIdx = temporal ? (context.frameIndex || 0) : 0;

    let delta = 0;
    if (mode === 'stepped') {
      delta = hashFlicker(frameIdx * 17) * amplitude;
    } else {
      const t = frameIdx * frequency;
      delta = (Math.sin(t * 1.5) * 0.7 + Math.sin(t * 3.7) * 0.3) * amplitude;
    }

    const multiplier = 1.0 + delta;
    if (Math.abs(multiplier - 1.0) < 0.001) return;

    // Fast 256-entry lookup table for O(1) pixel transformation
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.max(0, Math.min(255, Math.round(i * multiplier)));
    }

    const total = w * h * 4;
    for (let i = 0; i < total; i += 4) {
      data[i] = lut[data[i]];
      data[i + 1] = lut[data[i + 1]];
      data[i + 2] = lut[data[i + 2]];
    }
  }
};

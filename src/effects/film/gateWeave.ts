// DitherForge Film Gate Weave Effect
// Mechanical projector claw and film gate registration tolerance jitter

import type { EffectDescriptor, ParamMeta, EffectContext } from '../types';

export interface GateWeaveParams {
  amplitude: number;
  frequency: number;
  drift: number;
  temporal: boolean;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'amplitude',
    label: 'Weave Amplitude',
    type: 'range',
    min: 0,
    max: 10,
    step: 0.25,
    defaultValue: 1.5,
    unit: 'px'
  },
  {
    id: 'frequency',
    label: 'Oscillation Frequency',
    type: 'range',
    min: 0.1,
    max: 2.5,
    step: 0.1,
    defaultValue: 0.8
  },
  {
    id: 'drift',
    label: 'Stochastic Drift Randomness',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.25
  },
  {
    id: 'temporal',
    label: 'Animate Weave Motion',
    type: 'boolean',
    defaultValue: true
  }
];

function hashFrame(seed: number): number {
  let h = seed ^ 0x6c62272e;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = (h ^ (h >>> 13)) >>> 0;
  return (h / 4294967295) * 2.0 - 1.0;
}

const localScratchUint8 = new Map<number, Uint8ClampedArray>();

function getScratchUint8(len: number, slot: number, context?: EffectContext): Uint8ClampedArray {
  const shared = (context as any)?.shared;
  if (shared?.getScratchUint8) {
    return shared.getScratchUint8(len, slot);
  }
  const existing = localScratchUint8.get(slot);
  if (!existing || existing.length !== len) {
    const next = new Uint8ClampedArray(len);
    localScratchUint8.set(slot, next);
    return next;
  }
  return existing;
}

export const gateWeaveEffect: EffectDescriptor<GateWeaveParams> = {
  id: 'gate_weave',
  name: 'Gate Weave',
  category: 'film',
  description: 'Simulates mechanical film projector claw gate misalignment with organic subpixel translation flutter.',
  defaultParams: {
    amplitude: 1.5,
    frequency: 0.8,
    drift: 0.25,
    temporal: true
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg, contextArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: GateWeaveParams;
    let context: EffectContext = {};

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as GateWeaveParams;
      context = (height || {}) as EffectContext;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as GateWeaveParams;
      context = contextArg || {};
    }

    const {
      amplitude = 1.5,
      frequency = 0.8,
      drift = 0.25,
      temporal = true
    } = params;

    if (amplitude <= 0.001) return;

    const frameIdx = temporal ? (context.frameIndex || 0) : 0;

    // Organic two-harmonic plus stochastic drift translation
    const t = frameIdx * frequency;
    const harmonicX = Math.sin(t * 1.4142) * 0.7 + Math.cos(t * 0.707) * 0.3;
    const harmonicY = Math.cos(t * 1.0) * 0.75 + Math.sin(t * 2.1) * 0.25;

    const driftX = hashFrame(frameIdx * 31);
    const driftY = hashFrame(frameIdx * 73 + 101);

    const shiftX = (harmonicX * (1.0 - drift) + driftX * drift) * amplitude;
    const shiftY = (harmonicY * (1.0 - drift) + driftY * drift) * amplitude;

    if (Math.abs(shiftX) < 0.001 && Math.abs(shiftY) < 0.001) return;

    const src = getScratchUint8(data.length, 0, context);
    src.set(data);

    for (let y = 0; y < h; y++) {
      const srcY = y - shiftY;
      const y0 = Math.floor(srcY);
      const y1 = Math.min(h - 1, Math.max(0, y0 + 1));
      const cy0 = Math.max(0, Math.min(h - 1, y0));
      const fy = srcY - y0;
      const fy1 = 1.0 - fy;

      const rowOffset = y * w * 4;

      for (let x = 0; x < w; x++) {
        const srcX = x - shiftX;
        const x0 = Math.floor(srcX);
        const x1 = Math.min(w - 1, Math.max(0, x0 + 1));
        const cx0 = Math.max(0, Math.min(w - 1, x0));
        const fx = srcX - x0;
        const fx1 = 1.0 - fx;

        const w00 = fx1 * fy1;
        const w10 = fx * fy1;
        const w01 = fx1 * fy;
        const w11 = fx * fy;

        const i00 = (cy0 * w + cx0) * 4;
        const i10 = (cy0 * w + x1) * 4;
        const i01 = (y1 * w + cx0) * 4;
        const i11 = (y1 * w + x1) * 4;

        const dstIdx = rowOffset + x * 4;
        data[dstIdx] = Math.round(src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11);
        data[dstIdx + 1] = Math.round(src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11);
        data[dstIdx + 2] = Math.round(src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11);
      }
    }
  }
};

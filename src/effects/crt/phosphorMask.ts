// DitherForge CRT Phosphor Mask Effect
// Aperture Grille, Shadow Mask, and Slot Mask CRT emulation with sub-pixel RGB phosphors

import type { EffectDescriptor, ParamMeta } from '../types';

export interface PhosphorMaskParams {
  maskType: 'aperture_grille' | 'shadow_mask' | 'slot_mask';
  pitch: number;
  intensity: number;
  rgbBias: number;
  vertical: boolean;
  blendMode: 'multiply' | 'screen';
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'maskType',
    label: 'Mask Type',
    type: 'select',
    options: [
      { value: 'aperture_grille', label: 'Aperture Grille (Trinitron)' },
      { value: 'shadow_mask', label: 'Shadow Mask (Dot Triad)' },
      { value: 'slot_mask', label: 'Slot Mask (Consumer CRT)' }
    ],
    defaultValue: 'aperture_grille'
  },
  {
    id: 'pitch',
    label: 'Phosphor Pitch',
    type: 'range',
    min: 1,
    max: 6,
    step: 1,
    defaultValue: 2,
    unit: 'px'
  },
  {
    id: 'intensity',
    label: 'Mask Intensity',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.02,
    defaultValue: 0.35
  },
  {
    id: 'rgbBias',
    label: 'Phosphor Separation',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.65
  },
  {
    id: 'vertical',
    label: 'Vertical Orientation',
    type: 'boolean',
    defaultValue: true
  },
  {
    id: 'blendMode',
    label: 'Mask Blending',
    type: 'select',
    options: [
      { value: 'multiply', label: 'Multiply (Darken Slots)' },
      { value: 'screen', label: 'Screen (Glow Phosphors)' }
    ],
    defaultValue: 'multiply'
  }
];

export const phosphorMaskEffect: EffectDescriptor<PhosphorMaskParams> = {
  id: 'phosphor_mask',
  name: 'Phosphor Mask',
  category: 'crt',
  description: 'Aperture grille, shadow mask, and slot mask CRT sub-pixel phosphor simulation.',
  defaultParams: {
    maskType: 'aperture_grille',
    pitch: 2,
    intensity: 0.35,
    rgbBias: 0.65,
    vertical: true,
    blendMode: 'multiply'
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: PhosphorMaskParams;

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as PhosphorMaskParams;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as PhosphorMaskParams;
    }

    const {
      maskType = 'aperture_grille',
      pitch = 2,
      intensity = 0.35,
      rgbBias = 0.65,
      vertical = true,
      blendMode = 'multiply'
    } = params;

    if (intensity <= 0.001) return;

    const safePitch = Math.max(1, Math.min(6, Math.round(pitch)));
    const triadPeriod = safePitch * 3;
    const isMultiply = blendMode === 'multiply';
    const dim = 1.0 - intensity * rgbBias;
    const gapDim = 1.0 - intensity;

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x++) {
        const idx = rowOffset + x * 4;

        let rGain = 1.0;
        let gGain = 1.0;
        let bGain = 1.0;

        const u = vertical ? x : y;
        const v = vertical ? y : x;

        if (maskType === 'aperture_grille') {
          // Trinitron style vertical phosphor stripes (R, G, B)
          const phase = u % triadPeriod;
          const subSlot = Math.floor(phase / safePitch);
          if (subSlot === 0) {
            rGain = 1.0; gGain = dim; bGain = dim;
          } else if (subSlot === 1) {
            rGain = dim; gGain = 1.0; bGain = dim;
          } else {
            rGain = dim; gGain = dim; bGain = 1.0;
          }
          // Fine wire gap every N rows if safePitch >= 3
          if (safePitch >= 3 && v % 4 === 0) {
            rGain *= gapDim; gGain *= gapDim; bGain *= gapDim;
          }
        } else if (maskType === 'shadow_mask') {
          // Delta triad dot mask: alternating rows staggered by half pitch
          const rowStagger = (Math.floor(v / safePitch) % 2) * Math.floor(triadPeriod / 2);
          const phase = (u + rowStagger) % triadPeriod;
          const subSlot = Math.floor(phase / safePitch);
          if (subSlot === 0) {
            rGain = 1.0; gGain = dim; bGain = dim;
          } else if (subSlot === 1) {
            rGain = dim; gGain = 1.0; bGain = dim;
          } else {
            rGain = dim; gGain = dim; bGain = 1.0;
          }
          // Dark inter-dot boundary
          if (u % safePitch === 0 && v % safePitch === 0) {
            rGain *= gapDim; gGain *= gapDim; bGain *= gapDim;
          }
        } else if (maskType === 'slot_mask') {
          // Slot mask (brick pattern): vertical slots offset on alternating columns
          const colStagger = (Math.floor(u / safePitch) % 2) * Math.floor(safePitch * 1.5);
          const vPhase = (v + colStagger) % (safePitch * 3);
          const phase = u % triadPeriod;
          const subSlot = Math.floor(phase / safePitch);

          if (subSlot === 0) {
            rGain = 1.0; gGain = dim; bGain = dim;
          } else if (subSlot === 1) {
            rGain = dim; gGain = 1.0; bGain = dim;
          } else {
            rGain = dim; gGain = dim; bGain = 1.0;
          }
          if (vPhase === 0) {
            rGain *= gapDim; gGain *= gapDim; bGain *= gapDim;
          }
        }

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (isMultiply) {
          data[idx] = Math.round(r * rGain);
          data[idx + 1] = Math.round(g * gGain);
          data[idx + 2] = Math.round(b * bGain);
        } else {
          // Screen blend: adds phosphor emission into highlights
          const rInv = (255 - r) / 255;
          const gInv = (255 - g) / 255;
          const bInv = (255 - b) / 255;
          data[idx] = Math.round(255 - rInv * (255 - (rGain - dim) * intensity * 255));
          data[idx + 1] = Math.round(255 - gInv * (255 - (gGain - dim) * intensity * 255));
          data[idx + 2] = Math.round(255 - bInv * (255 - (bGain - dim) * intensity * 255));
        }
      }
    }
  }
};

// DitherForge VHS Tracking Distortion & Head Band Effect
// Emulates mechanical VCR helical-scan tracking misalignment, tape head jitter, and tape dropouts

import type { EffectDescriptor, ParamMeta, EffectContext } from '../types';

export interface VhsTrackingParams {
  bandHeight: number;
  scrollSpeed: number;
  bandPosition: number;
  opacity: number;
  shear: number;
  colorSmear: number;
  dropoutDensity: number;
  temporal: boolean;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'bandHeight',
    label: 'Tracking Band Height',
    type: 'range',
    min: 8,
    max: 120,
    step: 2,
    defaultValue: 36,
    unit: 'px'
  },
  {
    id: 'scrollSpeed',
    label: 'Vertical Scroll Speed',
    type: 'range',
    min: -8,
    max: 8,
    step: 0.25,
    defaultValue: 1.5
  },
  {
    id: 'bandPosition',
    label: 'Static Band Position',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.75
  },
  {
    id: 'shear',
    label: 'Horizontal Tape Shear',
    type: 'range',
    min: -50,
    max: 50,
    step: 1,
    defaultValue: 18,
    unit: 'px'
  },
  {
    id: 'colorSmear',
    label: 'Chroma Subcarrier Smear',
    type: 'range',
    min: 0,
    max: 20,
    step: 1,
    defaultValue: 5,
    unit: 'px'
  },
  {
    id: 'dropoutDensity',
    label: 'RF Dropout Density',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.02,
    defaultValue: 0.15
  },
  {
    id: 'temporal',
    label: 'Animate Tracking Scroll',
    type: 'boolean',
    defaultValue: true
  }
];

function hashRow(y: number, seed: number): number {
  let h = (y * 452930477 + seed * 1013904223) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = (h ^ (h >>> 13)) >>> 0;
  return (h / 4294967295) * 2.0 - 1.0;
}

export const vhsTrackingEffect: EffectDescriptor<VhsTrackingParams> = {
  id: 'vhs_tracking',
  name: 'VHS Tracking Band',
  category: 'crt',
  description: 'Helical-scan video tracking misalignment band with horizontal shear, chroma smear, and dropouts.',
  defaultParams: {
    bandHeight: 36,
    scrollSpeed: 1.5,
    bandPosition: 0.75,
    opacity: 0.8,
    shear: 18,
    colorSmear: 5,
    dropoutDensity: 0.15,
    temporal: true
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg, contextArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: VhsTrackingParams;
    let context: EffectContext = {};

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as VhsTrackingParams;
      context = (height || {}) as EffectContext;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as VhsTrackingParams;
      context = contextArg || {};
    }

    const {
      bandHeight = 36,
      scrollSpeed = 1.5,
      bandPosition = 0.75,
      opacity = 0.8,
      shear = 18,
      colorSmear = 5,
      dropoutDensity = 0.15,
      temporal = true
    } = params;

    if (opacity <= 0.001 || bandHeight <= 0) return;

    const frameIdx = temporal ? (context.frameIndex || 0) : 0;
    const bandH = Math.max(4, Math.min(h, Math.round(bandHeight)));
    const halfBand = bandH / 2;

    // Calculate vertical band position wrapping cleanly across canvas height
    let centerY = bandPosition * h;
    if (temporal) {
      centerY = ((centerY + frameIdx * scrollSpeed * 2) % h + h) % h;
    }

    // Snapshot original source data for horizontal warping lookups
    const src = new Uint8ClampedArray(data);
    const smear = Math.round(colorSmear);
    const maxShear = shear;
    const effOpacity = Math.max(0, Math.min(1, opacity));
    const invOpacity = 1.0 - effOpacity;

    for (let y = 0; y < h; y++) {
      // Distance from band center, handling wrap-around
      let dy = Math.abs(y - centerY);
      if (dy > h / 2) dy = h - dy;

      if (dy > halfBand) continue; // Outside tracking band

      // Parabolic falloff from center of band
      const normDist = dy / halfBand;
      const bandStrength = 1.0 - normDist * normDist;

      // Jitter and shear displacement
      const rowNoise = hashRow(y, frameIdx * 31);
      const rowShift = Math.round((bandStrength * maxShear + rowNoise * 3) * bandStrength);
      const isDropout = dropoutDensity > 0 && Math.abs(hashRow(y * 7 + 13, frameIdx * 19)) < dropoutDensity * bandStrength;

      const rowOffset = y * w * 4;

      for (let x = 0; x < w; x++) {
        const idx = rowOffset + x * 4;

        if (isDropout) {
          // Horizontal RF loss dropout (white / black static streak)
          const dropVal = hashRow(x + y * 13, frameIdx) > 0.1 ? 245 : 15;
          data[idx] = Math.round(data[idx] * invOpacity + dropVal * effOpacity);
          data[idx + 1] = Math.round(data[idx + 1] * invOpacity + dropVal * effOpacity);
          data[idx + 2] = Math.round(data[idx + 2] * invOpacity + dropVal * effOpacity);
          continue;
        }

        // Horizontal displacement for luminance and separate R/B chroma smear
        const xDisplaced = Math.max(0, Math.min(w - 1, x - rowShift));
        const xRed = Math.max(0, Math.min(w - 1, xDisplaced - smear));
        const xBlue = Math.max(0, Math.min(w - 1, xDisplaced + smear));

        const rIdx = rowOffset + xRed * 4;
        const gIdx = rowOffset + xDisplaced * 4;
        const bIdx = rowOffset + xBlue * 4;

        const targetR = src[rIdx];
        const targetG = src[gIdx + 1];
        const targetB = src[bIdx + 2];

        // Blend with original pixel according to effect strength
        const blend = bandStrength * effOpacity;
        const invBlend = 1.0 - blend;

        data[idx] = Math.round(data[idx] * invBlend + targetR * blend);
        data[idx + 1] = Math.round(data[idx + 1] * invBlend + targetG * blend);
        data[idx + 2] = Math.round(data[idx + 2] * invBlend + targetB * blend);
      }
    }
  }
};

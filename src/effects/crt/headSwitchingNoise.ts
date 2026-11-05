// DitherForge VHS Head-Switching Noise Effect
// Emulates the rotating helical head drum switching transition noise at the bottom of video frames

import type { EffectDescriptor, ParamMeta, EffectContext } from '../types';

export interface HeadSwitchingNoiseParams {
  height: number;
  intensity: number;
  horizontalBias: number;
  lineJitter: number;
  temporal: boolean;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'height',
    label: 'Switching Noise Height',
    type: 'range',
    min: 2,
    max: 30,
    step: 1,
    defaultValue: 10,
    unit: 'px'
  },
  {
    id: 'intensity',
    label: 'Static Noise Intensity',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.85
  },
  {
    id: 'horizontalBias',
    label: 'Skew / Symmetrical Bias',
    type: 'range',
    min: -1,
    max: 1,
    step: 0.05,
    defaultValue: 0.4
  },
  {
    id: 'lineJitter',
    label: 'Horizontal Shear Jitter',
    type: 'range',
    min: 0,
    max: 20,
    step: 1,
    defaultValue: 6,
    unit: 'px'
  },
  {
    id: 'temporal',
    label: 'Animate Static Each Frame',
    type: 'boolean',
    defaultValue: true
  }
];

function hashPixel(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = (h ^ (h >>> 13)) >>> 0;
  return (h / 4294967295) * 255;
}

export const headSwitchingNoiseEffect: EffectDescriptor<HeadSwitchingNoiseParams> = {
  id: 'head_switching_noise',
  name: 'Head-Switching Noise',
  category: 'crt',
  description: 'Simulates rotating VHS helical head drum commutation tear and static lines along the bottom of the frame.',
  defaultParams: {
    height: 10,
    intensity: 0.85,
    horizontalBias: 0.4,
    lineJitter: 6,
    temporal: true
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg, contextArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: HeadSwitchingNoiseParams;
    let context: EffectContext = {};

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as HeadSwitchingNoiseParams;
      context = (height || {}) as EffectContext;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as HeadSwitchingNoiseParams;
      context = contextArg || {};
    }

    const {
      height: noiseH = 10,
      intensity = 0.85,
      horizontalBias = 0.4,
      lineJitter = 6,
      temporal = true
    } = params;

    if (intensity <= 0.001 || noiseH <= 0) return;

    const frameIdx = temporal ? (context.frameIndex || 0) : 0;
    const bandHeight = Math.max(1, Math.min(h, Math.round(noiseH)));
    const startY = h - bandHeight;
    const src = new Uint8ClampedArray(data);
    const effIntensity = Math.max(0, Math.min(1, intensity));
    const invIntensity = 1.0 - effIntensity;

    for (let y = startY; y < h; y++) {
      const lineFromBottom = h - 1 - y;
      const progress = 1.0 - lineFromBottom / bandHeight; // 0 at top of band, 1 at very bottom
      const rowSeed = (frameIdx * 3571) ^ (y * 1013);

      // Horizontal line tear deflection
      const rowNoise = (hashPixel(0, y, rowSeed) / 255.0) * 2.0 - 1.0;
      const xDisplacement = Math.round(rowNoise * lineJitter * progress * 2);

      const rowOffset = y * w * 4;

      for (let x = 0; x < w; x++) {
        const normX = (x / w) * 2.0 - 1.0; // [-1.0, 1.0]
        const biasWeight = Math.max(0, 1.0 + horizontalBias * normX);

        const srcX = Math.max(0, Math.min(w - 1, x + xDisplacement));
        const srcIdx = rowOffset + srcX * 4;
        const dstIdx = rowOffset + x * 4;

        // Salt and pepper static noise
        const nVal = hashPixel(x, y, rowSeed);
        const isSnow = nVal > (255 - effIntensity * 180 * progress * biasWeight);

        if (isSnow) {
          const snowVal = nVal > 128 ? 250 : 10;
          data[dstIdx] = Math.round(src[srcIdx] * invIntensity + snowVal * effIntensity);
          data[dstIdx + 1] = Math.round(src[srcIdx + 1] * invIntensity + snowVal * effIntensity);
          data[dstIdx + 2] = Math.round(src[srcIdx + 2] * invIntensity + snowVal * effIntensity);
        } else {
          data[dstIdx] = src[srcIdx];
          data[dstIdx + 1] = src[srcIdx + 1];
          data[dstIdx + 2] = src[srcIdx + 2];
        }
      }
    }
  }
};

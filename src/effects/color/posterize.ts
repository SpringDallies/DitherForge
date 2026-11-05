// Posterize (Post) Effect
// Hard discrete tonal bands after dithering with gamma shaping
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  clamp
} from './shared';

export interface PosterizeParams {
  levels?: number; // 2 to 32 (default: 4)
  gamma?: number; // 0.2 to 3.0 (default: 1.0)
}

export const posterizeDefaultParams: Required<PosterizeParams> = {
  levels: 4,
  gamma: 1.0
};

export function applyPosterize(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...posterizeDefaultParams, ...resolved.params };

  const levels = clamp(Math.round(p.levels), 2, 64);
  const gamma = clamp(p.gamma, 0.1, 5.0);

  // Precompute 256-entry quantization LUT
  const lut = new Uint8Array(256);
  const maxLevel = levels - 1;

  for (let i = 0; i < 256; i++) {
    const norm = i / 255.0;
    // Gamma forward transform
    const gVal = Math.pow(norm, gamma);
    // Quantize to nearest band
    const quantized = Math.round(gVal * maxLevel) / maxLevel;
    // Gamma inverse transform
    const out = Math.pow(quantized, 1.0 / gamma);
    lut[i] = clamp(Math.round(out * 255), 0, 255);
  }

  const totalPixels = width * height;
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    data[idx] = lut[data[idx]];
    data[idx + 1] = lut[data[idx + 1]];
    data[idx + 2] = lut[data[idx + 2]];
    // alpha data[idx + 3] preserved
  }
}

export const posterizeParamsMeta: ParamMeta[] = [
  {
    id: 'levels',
    label: 'Tonal Levels',
    type: 'number',
    min: 2,
    max: 32,
    step: 1,
    defaultValue: 4
  },
  {
    id: 'gamma',
    label: 'Curve Gamma',
    type: 'number',
    min: 0.2,
    max: 3.0,
    step: 0.05,
    defaultValue: 1.0
  }
];

export const posterizeEffect: EffectDescriptor<PosterizeParams> = {
  id: 'posterize_post',
  name: 'Posterize (Post)',
  category: 'color',
  description: 'Hard discrete tonal bands after dithering',
  defaultParams: posterizeDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: posterizeParamsMeta,
  params: posterizeParamsMeta,
  apply: applyPosterize
};

export const posterizeDescriptor = posterizeEffect;
export default posterizeEffect;

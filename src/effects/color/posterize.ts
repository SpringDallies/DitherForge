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
  radius?: number; // 0 to 8 (default: 2)
}

export const posterizeDefaultParams: Required<PosterizeParams> = {
  levels: 4,
  gamma: 1.0,
  radius: 2
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
  const radius = clamp(Math.round(p.radius ?? 2), 0, 8);

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

  if (radius <= 0) {
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      data[idx] = lut[data[idx]];
      data[idx + 1] = lut[data[idx + 1]];
      data[idx + 2] = lut[data[idx + 2]];
      // alpha data[idx + 3] preserved
    }
    return;
  }

  // Preserve alpha
  const origAlpha = new Uint8ClampedArray(totalPixels);
  for (let i = 0, a = 3; i < totalPixels; i++, a += 4) {
    origAlpha[i] = data[a];
  }

  // Fast separable box filter to integrate local dither dot density into solid tonal steps
  const kSize = radius * 2 + 1;
  const blurH = new Uint16Array(totalPixels * 3);

  for (let y = 0; y < height; y++) {
    const rOffset = y * width;
    for (let x = 0; x < width; x++) {
      let sumR = 0, sumG = 0, sumB = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = clamp(x + dx, 0, width - 1);
        const idx = (rOffset + nx) * 4;
        sumR += data[idx];
        sumG += data[idx + 1];
        sumB += data[idx + 2];
      }
      const bIdx = (rOffset + x) * 3;
      blurH[bIdx] = Math.round(sumR / kSize);
      blurH[bIdx + 1] = Math.round(sumG / kSize);
      blurH[bIdx + 2] = Math.round(sumB / kSize);
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sumR = 0, sumG = 0, sumB = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = clamp(y + dy, 0, height - 1);
        const bIdx = (ny * width + x) * 3;
        sumR += blurH[bIdx];
        sumG += blurH[bIdx + 1];
        sumB += blurH[bIdx + 2];
      }
      const pIdx = (y * width + x) * 4;
      data[pIdx] = lut[clamp(Math.round(sumR / kSize), 0, 255)];
      data[pIdx + 1] = lut[clamp(Math.round(sumG / kSize), 0, 255)];
      data[pIdx + 2] = lut[clamp(Math.round(sumB / kSize), 0, 255)];
      data[pIdx + 3] = origAlpha[y * width + x];
    }
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
  },
  {
    id: 'radius',
    label: 'Dither Integration Radius',
    type: 'number',
    min: 0,
    max: 8,
    step: 1,
    defaultValue: 2,
    unit: 'px'
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

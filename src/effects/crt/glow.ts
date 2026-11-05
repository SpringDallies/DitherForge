import type { EffectDescriptor } from '../types';

export interface GlowParams {
  radius: number;
  intensity: number;
}

export function applyGlow(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: GlowParams
): void {
  const rad = Math.max(1, Math.min(24, Math.floor(params.radius || 3)));
  const intensity = params.intensity !== undefined ? Number(params.intensity) : 0.6;
  const sigma = Math.max(0.8, rad * 0.55);

  const numPixels = width * height;
  const brightR = new Float32Array(numPixels);
  const brightG = new Float32Array(numPixels);
  const brightB = new Float32Array(numPixels);

  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma > 96) {
      const w = Math.pow((luma - 96) / 159, 1.25);
      brightR[i] = r * w;
      brightG[i] = g * w;
      brightB[i] = b * w;
    }
  }

  const kSize = rad * 2 + 1;
  const kernel = new Float32Array(kSize);
  let kSum = 0;
  for (let d = -rad; d <= rad; d++) {
    const kVal = Math.exp(-(d * d) / (2 * sigma * sigma));
    kernel[d + rad] = kVal;
    kSum += kVal;
  }
  for (let k = 0; k < kSize; k++) {
    kernel[k] /= kSum;
  }

  const tempR = new Float32Array(numPixels);
  const tempG = new Float32Array(numPixels);
  const tempB = new Float32Array(numPixels);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let accR = 0, accG = 0, accB = 0;
      for (let d = -rad; d <= rad; d++) {
        const nx = Math.max(0, Math.min(width - 1, x + d));
        const sOffset = rowOffset + nx;
        const kw = kernel[d + rad];
        accR += brightR[sOffset] * kw;
        accG += brightG[sOffset] * kw;
        accB += brightB[sOffset] * kw;
      }
      const dOffset = rowOffset + x;
      tempR[dOffset] = accR;
      tempG[dOffset] = accG;
      tempB[dOffset] = accB;
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let accR = 0, accG = 0, accB = 0;
      for (let d = -rad; d <= rad; d++) {
        const ny = Math.max(0, Math.min(height - 1, y + d));
        const sOffset = ny * width + x;
        const kw = kernel[d + rad];
        accR += tempR[sOffset] * kw;
        accG += tempG[sOffset] * kw;
        accB += tempB[sOffset] * kw;
      }

      const idx = (y * width + x) * 4;
      const origR = data[idx];
      const origG = data[idx + 1];
      const origB = data[idx + 2];

      const bloomR = Math.max(0, Math.min(255, accR * intensity));
      const bloomG = Math.max(0, Math.min(255, accG * intensity));
      const bloomB = Math.max(0, Math.min(255, accB * intensity));

      data[idx] = Math.max(0, Math.min(255, Math.round(255 - ((255 - origR) * (255 - bloomR)) / 255)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(255 - ((255 - origG) * (255 - bloomG)) / 255)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(255 - ((255 - origB) * (255 - bloomB)) / 255)));
    }
  }
}

export const glowEffect: EffectDescriptor<GlowParams> = {
  id: 'glow',
  name: 'Ignition Glow',
  category: 'crt',
  description: 'Phosphor bloom and high-luminance highlight dispersal',
  defaultParams: { radius: 3, intensity: 0.6 },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: [
    {
      id: 'radius',
      label: 'Glow Radius',
      type: 'number',
      min: 1,
      max: 24,
      step: 1,
      defaultValue: 3,
      unit: 'px'
    },
    {
      id: 'intensity',
      label: 'Intensity',
      type: 'number',
      min: 0,
      max: 2,
      step: 0.05,
      defaultValue: 0.6
    }
  ],
  apply: (data, width, height, params) => applyGlow(data, width, height, params)
};

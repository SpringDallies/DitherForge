import type { EffectDescriptor } from '../types';

export interface BlurSharpenParams {
  amount: number;
}

export function applyBlurSharpen(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: BlurSharpenParams
): void {
  const amt = params.amount !== undefined ? Number(params.amount) : 0.8;
  if (amt === 0) return;

  const rad = amt < 0 ? Math.max(1, Math.round(Math.abs(amt) * 6)) : 2;
  const sigma = Math.max(0.8, rad * 0.55);

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

  const copy = new Uint8ClampedArray(data);
  const numPixels = width * height;
  const tempR = new Float32Array(numPixels);
  const tempG = new Float32Array(numPixels);
  const tempB = new Float32Array(numPixels);

  // Pass 1: Horizontal separable blur
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let accR = 0, accG = 0, accB = 0;
      for (let d = -rad; d <= rad; d++) {
        const nx = Math.max(0, Math.min(width - 1, x + d));
        const sIdx = (rowOffset + nx) * 4;
        const kw = kernel[d + rad];
        accR += copy[sIdx] * kw;
        accG += copy[sIdx + 1] * kw;
        accB += copy[sIdx + 2] * kw;
      }
      const dOffset = rowOffset + x;
      tempR[dOffset] = accR;
      tempG[dOffset] = accG;
      tempB[dOffset] = accB;
    }
  }

  // Pass 2: Vertical separable blur & blend / unsharp mask
  const isBlur = amt < 0;
  const blend = Math.min(1, Math.abs(amt));
  const sharpenFactor = amt * 1.8;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let blurredR = 0, blurredG = 0, blurredB = 0;
      for (let d = -rad; d <= rad; d++) {
        const ny = Math.max(0, Math.min(height - 1, y + d));
        const sOffset = ny * width + x;
        const kw = kernel[d + rad];
        blurredR += tempR[sOffset] * kw;
        blurredG += tempG[sOffset] * kw;
        blurredB += tempB[sOffset] * kw;
      }

      const idx = (y * width + x) * 4;
      const origR = copy[idx];
      const origG = copy[idx + 1];
      const origB = copy[idx + 2];

      if (isBlur) {
        data[idx] = Math.max(0, Math.min(255, Math.round(origR * (1 - blend) + blurredR * blend)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(origG * (1 - blend) + blurredG * blend)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(origB * (1 - blend) + blurredB * blend)));
      } else {
        data[idx] = Math.max(0, Math.min(255, Math.round(origR + (origR - blurredR) * sharpenFactor)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(origG + (origG - blurredG) * sharpenFactor)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(origB + (origB - blurredB) * sharpenFactor)));
      }
    }
  }
}

export const blurSharpenEffect: EffectDescriptor<BlurSharpenParams> = {
  id: 'blur_sharpen',
  name: 'Blur / Sharpen',
  category: 'film',
  description: 'Gaussian optical defocus or high-pass unsharp edge enhancement',
  defaultParams: { amount: 0.8 },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: [
    {
      id: 'amount',
      label: 'Amount (-Blur / +Sharpen)',
      type: 'number',
      min: -1.0,
      max: 2.0,
      step: 0.05,
      defaultValue: 0.8
    }
  ],
  apply: (data, width, height, params) => applyBlurSharpen(data, width, height, params)
};

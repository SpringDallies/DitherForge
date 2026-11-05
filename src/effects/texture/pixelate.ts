import type { EffectDescriptor } from '../types';

export interface PixelateParams {
  blockSize: number;
}

export function applyPixelate(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: PixelateParams
): void {
  const bs = Math.max(1, Math.floor(params.blockSize || 4));
  if (bs <= 1) return;

  for (let by = 0; by < height; by += bs) {
    const maxBy = Math.min(height, by + bs);
    for (let bx = 0; bx < width; bx += bs) {
      const maxBx = Math.min(width, bx + bs);
      let sumR = 0, sumG = 0, sumB = 0, count = 0;

      for (let y = by; y < maxBy; y++) {
        const rowOffset = y * width;
        for (let x = bx; x < maxBx; x++) {
          const idx = (rowOffset + x) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          count++;
        }
      }

      const meanR = Math.round(sumR / count);
      const meanG = Math.round(sumG / count);
      const meanB = Math.round(sumB / count);

      for (let y = by; y < maxBy; y++) {
        const rowOffset = y * width;
        for (let x = bx; x < maxBx; x++) {
          const idx = (rowOffset + x) * 4;
          data[idx] = meanR;
          data[idx + 1] = meanG;
          data[idx + 2] = meanB;
        }
      }
    }
  }
}

export const pixelateEffect: EffectDescriptor<PixelateParams> = {
  id: 'pixelate',
  name: 'Pixelate',
  category: 'texture',
  description: 'Uniform mosaic downscale and block grouping',
  defaultParams: { blockSize: 4 },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: [
    {
      id: 'blockSize',
      label: 'Block Size',
      type: 'number',
      min: 1,
      max: 32,
      step: 1,
      defaultValue: 4,
      unit: 'px'
    }
  ],
  apply: (data, width, height, params) => applyPixelate(data, width, height, params)
};

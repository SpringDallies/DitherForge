import type { EffectDescriptor } from '../types';

export interface VignetteParams {
  radius: number;
  softness: number;
}

export function applyVignette(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: VignetteParams
): void {
  const rad = params.radius !== undefined ? params.radius : 0.8;
  const softness = params.softness !== undefined ? params.softness : 0.4;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const maxD = Math.sqrt(cx * cx + cy * cy) * rad;
  const maxD2 = maxD * maxD;
  const invMaxD2 = 1.0 / maxD2;
  const exp = 1 / (softness + 0.01);
  const halfExp = exp * 0.5;

  const dx2Table = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    const dx = x - cx;
    dx2Table[x] = dx * dx;
  }

  for (let y = 0; y < height; y++) {
    const dy = y - cy;
    const dy2 = dy * dy;
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const d2 = dx2Table[x] + dy2;
      const idx = (rowOffset + x) * 4;

      if (d2 >= maxD2) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        continue;
      }

      const factor = 1 - Math.pow(d2 * invMaxD2, halfExp);
      data[idx] = Math.round(data[idx] * factor);
      data[idx + 1] = Math.round(data[idx + 1] * factor);
      data[idx + 2] = Math.round(data[idx + 2] * factor);
    }
  }
}

export const vignetteEffect: EffectDescriptor<VignetteParams> = {
  id: 'vignette',
  name: 'Vignette Falloff',
  category: 'film',
  description: 'Optical lens periphery darkening and light attenuation',
  defaultParams: { radius: 0.8, softness: 0.4 },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: [
    {
      id: 'radius',
      label: 'Radius',
      type: 'number',
      min: 0.2,
      max: 2.0,
      step: 0.05,
      defaultValue: 0.8
    },
    {
      id: 'softness',
      label: 'Softness',
      type: 'number',
      min: 0.05,
      max: 1.0,
      step: 0.05,
      defaultValue: 0.4
    }
  ],
  apply: (data, width, height, params) => applyVignette(data, width, height, params)
};

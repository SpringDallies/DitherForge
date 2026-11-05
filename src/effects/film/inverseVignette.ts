import type { EffectDescriptor } from '../types';

export interface InverseVignetteParams {
  radius: number;
  softness: number;
}

export function applyInverseVignette(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: InverseVignetteParams
): void {
  const rad = params.radius !== undefined ? params.radius : 0.8;
  const softness = params.softness !== undefined ? params.softness : 0.4;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const maxD = Math.sqrt(cx * cx + cy * cy) * rad;
  const exp = 1 / (softness + 0.01);

  for (let y = 0; y < height; y++) {
    const dy = y - cy;
    const dy2 = dy * dy;
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dist = Math.sqrt(dx * dx + dy2);
      const edgeFactor = Math.max(0, Math.min(1, Math.pow(dist / maxD, exp)));

      const idx = (rowOffset + x) * 4;
      data[idx] = Math.min(255, Math.round(data[idx] + (255 - data[idx]) * edgeFactor));
      data[idx + 1] = Math.min(255, Math.round(data[idx + 1] + (255 - data[idx + 1]) * edgeFactor));
      data[idx + 2] = Math.min(255, Math.round(data[idx + 2] + (255 - data[idx + 2]) * edgeFactor));
    }
  }
}

export const inverseVignetteEffect: EffectDescriptor<InverseVignetteParams> = {
  id: 'inverse_vignette',
  name: 'Inverse Vignette',
  category: 'film',
  description: 'Radial white lens flare edge fogging and peripheral glow',
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
  apply: (data, width, height, params) => applyInverseVignette(data, width, height, params)
};

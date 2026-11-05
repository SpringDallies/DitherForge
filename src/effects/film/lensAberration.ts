import type { EffectDescriptor } from '../types';

export type LensAberrationMode = 'uniform' | 'radial' | 'convergence';

export interface LensAberrationParams {
  mode: LensAberrationMode;
  offsetX?: number;
  offsetY?: number;
  intensity?: number;
  centerX?: number;
  centerY?: number;
}

export function applyLensAberration(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: LensAberrationParams
): void {
  const mode = params.mode || 'uniform';
  const copy = new Uint8ClampedArray(data);

  if (mode === 'uniform') {
    // Exact baseline chromatic aberration channel shift
    const ox = Math.floor(params.offsetX !== undefined ? params.offsetX : 4);
    const oy = Math.floor(params.offsetY !== undefined ? params.offsetY : 0);

    for (let y = 0; y < height; y++) {
      const ry = Math.max(0, Math.min(height - 1, y + oy));
      const by = Math.max(0, Math.min(height - 1, y - oy));
      const rowOffset = y * width;
      const rRowOffset = ry * width;
      const bRowOffset = by * width;

      for (let x = 0; x < width; x++) {
        const rx = Math.max(0, Math.min(width - 1, x + ox));
        const bx = Math.max(0, Math.min(width - 1, x - ox));

        const idx = (rowOffset + x) * 4;
        data[idx] = copy[(rRowOffset + rx) * 4];
        data[idx + 1] = copy[idx + 1];
        data[idx + 2] = copy[(bRowOffset + bx) * 4 + 2];
      }
    }
  } else if (mode === 'radial') {
    // Radial chromatic displacement expanding outward from optical center
    const cx = (params.centerX !== undefined ? params.centerX : 0.5) * width;
    const cy = (params.centerY !== undefined ? params.centerY : 0.5) * height;
    const maxRadius = Math.hypot(width * 0.5, height * 0.5) || 1;
    const strength = params.intensity !== undefined ? params.intensity : 6;

    for (let y = 0; y < height; y++) {
      const dy = y - cy;
      const rowOffset = y * width;

      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dist = Math.hypot(dx, dy);
        const normDist = dist / maxRadius;
        const shift = normDist * strength;

        const dirX = dist > 0.001 ? (dx / dist) * shift : 0;
        const dirY = dist > 0.001 ? (dy / dist) * shift : 0;

        const rx = Math.max(0, Math.min(width - 1, Math.round(x + dirX)));
        const ry = Math.max(0, Math.min(height - 1, Math.round(y + dirY)));
        const bx = Math.max(0, Math.min(width - 1, Math.round(x - dirX)));
        const by = Math.max(0, Math.min(height - 1, Math.round(y - dirY)));

        const idx = (rowOffset + x) * 4;
        data[idx] = copy[(ry * width + rx) * 4];
        data[idx + 1] = copy[idx + 1];
        data[idx + 2] = copy[(by * width + bx) * 4 + 2];
      }
    }
  } else if (mode === 'convergence') {
    // Non-linear color fringing accentuating optical edges
    const cx = (params.centerX !== undefined ? params.centerX : 0.5) * width;
    const cy = (params.centerY !== undefined ? params.centerY : 0.5) * height;
    const maxRadius = Math.hypot(width * 0.5, height * 0.5) || 1;
    const strength = params.intensity !== undefined ? params.intensity : 8;

    for (let y = 0; y < height; y++) {
      const dy = y - cy;
      const rowOffset = y * width;

      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dist = Math.hypot(dx, dy);
        const normDist = dist / maxRadius;
        const shift = Math.pow(normDist, 2) * strength;

        const dirX = dist > 0.001 ? (dx / dist) * shift : 0;
        const dirY = dist > 0.001 ? (dy / dist) * shift : 0;

        const rx = Math.max(0, Math.min(width - 1, Math.round(x + dirX)));
        const ry = Math.max(0, Math.min(height - 1, Math.round(y + dirY)));
        const bx = Math.max(0, Math.min(width - 1, Math.round(x - dirX)));
        const by = Math.max(0, Math.min(height - 1, Math.round(y - dirY)));

        const idx = (rowOffset + x) * 4;
        data[idx] = copy[(ry * width + rx) * 4];
        data[idx + 1] = copy[idx + 1];
        data[idx + 2] = copy[(by * width + bx) * 4 + 2];
      }
    }
  }
}

export const lensAberrationEffect: EffectDescriptor<LensAberrationParams> = {
  id: 'lens_aberration',
  name: 'Lens Aberration',
  category: 'film',
  description: 'Optical wavelength dispersion with uniform, radial barrel, or convergence fringing',
  defaultParams: { mode: 'uniform', offsetX: 4, offsetY: 0, intensity: 4, centerX: 0.5, centerY: 0.5 },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: [
    {
      id: 'mode',
      label: 'Dispersion Mode',
      type: 'select',
      options: [
        { value: 'uniform', label: 'Uniform Shift' },
        { value: 'radial', label: 'Radial Barrel' },
        { value: 'convergence', label: 'Edge Convergence' }
      ],
      defaultValue: 'uniform'
    },
    {
      id: 'offsetX',
      label: 'Offset X',
      type: 'number',
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 4,
      unit: 'px'
    },
    {
      id: 'offsetY',
      label: 'Offset Y',
      type: 'number',
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 0,
      unit: 'px'
    },
    {
      id: 'intensity',
      label: 'Radial Strength',
      type: 'number',
      min: 0,
      max: 20,
      step: 0.5,
      defaultValue: 4,
      unit: 'px'
    }
  ],
  apply: (data, width, height, params) => applyLensAberration(data, width, height, params)
};

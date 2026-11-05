import type { EffectDescriptor } from '../types';

export interface CurvesLevelsParams {
  blackPoint: number;
  whitePoint: number;
  gamma: number;
}

export function applyCurvesLevels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: CurvesLevelsParams
): void {
  const bp = params.blackPoint !== undefined ? params.blackPoint : 0.05;
  const wp = params.whitePoint !== undefined ? params.whitePoint : 0.95;
  const gamma = params.gamma !== undefined ? params.gamma : 1.1;
  const span = Math.max(0.001, wp - bp);
  const invGamma = 1 / Math.max(0.01, gamma);

  // Fast 256-entry lookup table
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const norm = (i / 255 - bp) / span;
    const adjusted = Math.pow(Math.max(0, Math.min(1, norm)), invGamma);
    lut[i] = Math.round(adjusted * 255);
  }

  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
}

export const curvesLevelsEffect: EffectDescriptor<CurvesLevelsParams> = {
  id: 'curves_levels',
  name: 'Curves & Levels',
  category: 'film',
  description: 'Black point, white point, and midtone gamma tonal calibration',
  defaultParams: { blackPoint: 0.05, whitePoint: 0.95, gamma: 1.1 },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: [
    {
      id: 'blackPoint',
      label: 'Black Point',
      type: 'number',
      min: 0.0,
      max: 0.5,
      step: 0.01,
      defaultValue: 0.05
    },
    {
      id: 'whitePoint',
      label: 'White Point',
      type: 'number',
      min: 0.5,
      max: 1.0,
      step: 0.01,
      defaultValue: 0.95
    },
    {
      id: 'gamma',
      label: 'Gamma',
      type: 'number',
      min: 0.2,
      max: 3.0,
      step: 0.05,
      defaultValue: 1.1
    }
  ],
  apply: (data, width, height, params) => applyCurvesLevels(data, width, height, params)
};

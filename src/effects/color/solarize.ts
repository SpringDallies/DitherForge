// Solarize Effect
// Sabattier darkroom effect: partial tonal inversion at threshold
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  clamp,
  smoothstep
} from './shared';

export interface SolarizeParams {
  threshold?: number; // 0 to 1 (default: 0.5)
  softness?: number; // 0 to 0.5 (default: 0.1)
  perChannel?: boolean; // (default: false)
}

export const solarizeDefaultParams: Required<SolarizeParams> = {
  threshold: 0.5,
  softness: 0.1,
  perChannel: false
};

export function applySolarize(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...solarizeDefaultParams, ...resolved.params };

  const thresh = clamp(p.threshold, 0, 1);
  const softness = clamp(p.softness, 0, 0.5);
  const perChannel = Boolean(p.perChannel);

  const totalPixels = width * height;

  // Function to calculate solarized value for a single normalized channel (0..1)
  function solarizeVal(v: number): number {
    if (softness <= 0.001) {
      return v >= thresh ? 1.0 - v : v;
    }
    const t0 = Math.max(0, thresh - softness);
    const t1 = Math.min(1, thresh + softness);
    const factor = smoothstep(t0, t1, v);
    const inverted = 1.0 - v;
    return v + (inverted - v) * factor;
  }

  // Precompute 256-entry lookup table for perChannel mode
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = clamp(Math.round(solarizeVal(i / 255.0) * 255), 0, 255);
  }

  if (perChannel) {
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      data[idx] = lut[data[idx]];
      data[idx + 1] = lut[data[idx + 1]];
      data[idx + 2] = lut[data[idx + 2]];
    }
  } else {
    // Luminance-guided solarization
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0;

      let factor: number;
      if (softness <= 0.001) {
        factor = luma >= thresh ? 1.0 : 0.0;
      } else {
        const t0 = Math.max(0, thresh - softness);
        const t1 = Math.min(1, thresh + softness);
        factor = smoothstep(t0, t1, luma);
      }

      if (factor > 0) {
        data[idx] = clamp(Math.round(r + ((255 - r) - r) * factor), 0, 255);
        data[idx + 1] = clamp(Math.round(g + ((255 - g) - g) * factor), 0, 255);
        data[idx + 2] = clamp(Math.round(b + ((255 - b) - b) * factor), 0, 255);
      }
    }
  }
}

export const solarizeParamsMeta: ParamMeta[] = [
  {
    id: 'threshold',
    label: 'Inversion Threshold',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.02,
    defaultValue: 0.5
  },
  {
    id: 'softness',
    label: 'Transition Softness',
    type: 'number',
    min: 0,
    max: 0.5,
    step: 0.02,
    defaultValue: 0.1
  },
  {
    id: 'perChannel',
    label: 'Per-Channel Mode',
    type: 'boolean',
    defaultValue: false
  }
];

export const solarizeEffect: EffectDescriptor<SolarizeParams> = {
  id: 'solarize',
  name: 'Solarize',
  category: 'color',
  description: 'Sabattier darkroom effect: partial tonal inversion at threshold',
  defaultParams: solarizeDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: solarizeParamsMeta,
  params: solarizeParamsMeta,
  apply: applySolarize
};

export const solarizeDescriptor = solarizeEffect;
export default solarizeEffect;

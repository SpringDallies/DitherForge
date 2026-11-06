// Split Toning Effect
// Warm shadows / cool highlights or inverse
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  blendChannel,
  hexToRgb,
  clamp,
  smoothstep
} from './shared';

export interface SplitToningParams {
  shadowColor?: string;
  shadowStrength?: number;
  highlightColor?: string;
  highlightStrength?: number;
  balance?: number;
}

export const splitToningDefaultParams: Required<SplitToningParams> = {
  shadowColor: '#703010',
  shadowStrength: 0.5,
  highlightColor: '#105070',
  highlightStrength: 0.5,
  balance: 0.0
};

export function applySplitToning(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...splitToningDefaultParams, ...resolved.params };

  const shadowColor = hexToRgb(p.shadowColor);
  const shadowStr = clamp(p.shadowStrength, 0, 1);
  const highlightColor = hexToRgb(p.highlightColor);
  const highlightStr = clamp(p.highlightStrength, 0, 1);
  const balance = clamp(p.balance, -1, 1);

  const pivot = clamp(0.5 + balance * 0.3, 0.1, 0.9);
  const totalPixels = width * height;

  // Precompute 256-entry weights and soft-light blends to avoid expensive per-pixel math
  const shadowWeightLUT = new Float32Array(256);
  const highlightWeightLUT = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const luma = i / 255.0;
    shadowWeightLUT[i] = (1.0 - smoothstep(0.0, pivot, luma)) * shadowStr;
    highlightWeightLUT[i] = smoothstep(pivot, 1.0, luma) * highlightStr;
  }

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const luma = (54 * r + 182 * g + 19 * b) >> 8;
    const sw = shadowWeightLUT[luma];
    const hw = highlightWeightLUT[luma];

    let resR = r;
    let resG = g;
    let resB = b;

    if (sw > 0) {
      // Tint shadows towards shadowColor even on pure black pixels
      const sFactor = sw * 0.8;
      resR += (shadowColor[0] - resR) * sFactor * (1.0 - resR / 255.0);
      resG += (shadowColor[1] - resG) * sFactor * (1.0 - resG / 255.0);
      resB += (shadowColor[2] - resB) * sFactor * (1.0 - resB / 255.0);
    }

    if (hw > 0) {
      // Tint highlights towards highlightColor even on pure white pixels
      const hFactor = hw * 0.8;
      const lightFactor = (resR * 54 + resG * 182 + resB * 19) / 65025.0;
      resR += (highlightColor[0] - resR) * hFactor * lightFactor;
      resG += (highlightColor[1] - resG) * hFactor * lightFactor;
      resB += (highlightColor[2] - resB) * hFactor * lightFactor;
    }

    data[idx] = clamp(Math.round(resR), 0, 255);
    data[idx + 1] = clamp(Math.round(resG), 0, 255);
    data[idx + 2] = clamp(Math.round(resB), 0, 255);
    // alpha data[idx + 3] preserved
  }
}

export const splitToningParamsMeta: ParamMeta[] = [
  {
    id: 'shadowColor',
    label: 'Shadow Color',
    type: 'color',
    defaultValue: '#703010'
  },
  {
    id: 'shadowStrength',
    label: 'Shadow Strength',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5
  },
  {
    id: 'highlightColor',
    label: 'Highlight Color',
    type: 'color',
    defaultValue: '#105070'
  },
  {
    id: 'highlightStrength',
    label: 'Highlight Strength',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5
  },
  {
    id: 'balance',
    label: 'Balance',
    type: 'number',
    min: -1,
    max: 1,
    step: 0.05,
    defaultValue: 0.0
  }
];

export const splitToningEffect: EffectDescriptor<SplitToningParams> = {
  id: 'split_toning',
  name: 'Split Toning',
  category: 'color',
  description: 'Warm shadows / cool highlights or inverse color split',
  defaultParams: splitToningDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: splitToningParamsMeta,
  params: splitToningParamsMeta,
  apply: applySplitToning
};

export const splitToningDescriptor = splitToningEffect;
export default splitToningEffect;

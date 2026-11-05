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

  const sBlendR = new Uint8Array(256);
  const sBlendG = new Uint8Array(256);
  const sBlendB = new Uint8Array(256);
  const hBlendR = new Uint8Array(256);
  const hBlendG = new Uint8Array(256);
  const hBlendB = new Uint8Array(256);

  for (let i = 0; i < 256; i++) {
    sBlendR[i] = blendChannel(i, shadowColor[0], 'soft-light');
    sBlendG[i] = blendChannel(i, shadowColor[1], 'soft-light');
    sBlendB[i] = blendChannel(i, shadowColor[2], 'soft-light');
    hBlendR[i] = blendChannel(i, highlightColor[0], 'soft-light');
    hBlendG[i] = blendChannel(i, highlightColor[1], 'soft-light');
    hBlendB[i] = blendChannel(i, highlightColor[2], 'soft-light');
  }

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const luma = (54 * r + 182 * g + 19 * b) >> 8; // fast integer luma: (0.2126*r + 0.7152*g + 0.0722*b)
    const sw = shadowWeightLUT[luma];
    const hw = highlightWeightLUT[luma];

    let resR = r;
    let resG = g;
    let resB = b;

    if (sw > 0) {
      resR += (sBlendR[r] - r) * sw;
      resG += (sBlendG[g] - g) * sw;
      resB += (sBlendB[b] - b) * sw;
    }

    if (hw > 0) {
      resR += (hBlendR[r] - r) * hw;
      resG += (hBlendG[g] - g) * hw;
      resB += (hBlendB[b] - b) * hw;
    }

    data[idx] = resR < 0 ? 0 : resR > 255 ? 255 : resR;
    data[idx + 1] = resG < 0 ? 0 : resG > 255 ? 255 : resG;
    data[idx + 2] = resB < 0 ? 0 : resB > 255 ? 255 : resB;
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

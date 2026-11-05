// Bit-Crush / Quantization Effect
// Bits per channel quantization, per-channel or luminance-only
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  clamp
} from './shared';

export interface BitCrushParams {
  bits?: number;
  mode?: 'per-channel' | 'luminance-only';
  dither?: number;
}

export const bitCrushDefaultParams: Required<BitCrushParams> = {
  bits: 3,
  mode: 'per-channel',
  dither: 0.0
};

export function applyBitCrush(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...bitCrushDefaultParams, ...resolved.params };

  const bits = clamp(Math.round(p.bits), 1, 8);
  const mode = p.mode;
  const ditherAmt = clamp(p.dither, 0, 1);

  const totalPixels = width * height;
  const levels = 1 << bits;
  const maxLevel = levels - 1;
  const step = 255 / maxLevel;

  const quantLut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const q = Math.round(i / step) * step;
    quantLut[i] = clamp(Math.round(q), 0, 255);
  }

  if (mode === 'luminance-only') {
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      let ditherOffset = 0;
      if (ditherAmt > 0) {
        const x = i % width;
        const y = Math.floor(i / width);
        const bayer = ((x & 1) ^ ((y & 1) << 1)) / 4.0 - 0.375;
        ditherOffset = bayer * step * ditherAmt;
      }

      const clampedLuma = clamp(Math.round(luma + ditherOffset), 0, 255);
      const qLuma = quantLut[clampedLuma];
      const ratio = luma > 0.001 ? qLuma / luma : 0;

      data[idx] = clamp(Math.round(r * ratio), 0, 255);
      data[idx + 1] = clamp(Math.round(g * ratio), 0, 255);
      data[idx + 2] = clamp(Math.round(b * ratio), 0, 255);
    }
  } else {
    if (ditherAmt <= 0.001) {
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        data[idx] = quantLut[data[idx]];
        data[idx + 1] = quantLut[data[idx + 1]];
        data[idx + 2] = quantLut[data[idx + 2]];
      }
    } else {
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = (rowOffset + x) * 4;
          const bayer = ((x & 1) ^ ((y & 1) << 1)) / 4.0 - 0.375;
          const offset = bayer * step * ditherAmt;

          data[idx] = quantLut[clamp(Math.round(data[idx] + offset), 0, 255)];
          data[idx + 1] = quantLut[clamp(Math.round(data[idx + 1] + offset), 0, 255)];
          data[idx + 2] = quantLut[clamp(Math.round(data[idx + 2] + offset), 0, 255)];
        }
      }
    }
  }
}

export const bitCrushParamsMeta: ParamMeta[] = [
  {
    id: 'bits',
    label: 'Bit Depth',
    type: 'number',
    min: 1,
    max: 8,
    step: 1,
    defaultValue: 3,
    unit: 'bits'
  },
  {
    id: 'mode',
    label: 'Quantization Mode',
    type: 'select',
    defaultValue: 'per-channel',
    options: [
      { value: 'per-channel', label: 'Per Channel' },
      { value: 'luminance-only', label: 'Luminance Only' }
    ]
  },
  {
    id: 'dither',
    label: 'Subtle Dither',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.0
  }
];

export const bitCrushEffect: EffectDescriptor<BitCrushParams> = {
  id: 'bit_crush',
  name: 'Bit-Crush / Quantization',
  category: 'glitch',
  description: 'Bits per channel quantization (1–8 bits)',
  defaultParams: bitCrushDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: bitCrushParamsMeta,
  params: bitCrushParamsMeta,
  apply: applyBitCrush
};

export default bitCrushEffect;

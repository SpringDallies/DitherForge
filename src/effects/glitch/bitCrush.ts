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
  depth?: number; // preset compatibility alias
  sampleRate?: number; // 1 to 16 (default: 2)
  mode?: 'per-channel' | 'luminance-only';
  dither?: number;
}

export const bitCrushDefaultParams: Required<Omit<BitCrushParams, 'depth'>> = {
  bits: 3,
  sampleRate: 2,
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

  const rawBits = p.bits ?? (p as any).depth ?? 3;
  const bits = clamp(Math.round(rawBits), 1, 8);
  const sampleRate = clamp(Math.round(p.sampleRate ?? 2), 1, 16);
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

  // Preserve alpha
  const origAlpha = new Uint8ClampedArray(totalPixels);
  for (let i = 0, a = 3; i < totalPixels; i++, a += 4) {
    origAlpha[i] = data[a];
  }

  const src = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    const srcY = sampleRate > 1 ? Math.floor(y / sampleRate) * sampleRate : y;
    const srcRow = srcY * width;
    const dstRow = y * width;

    for (let x = 0; x < width; x++) {
      const srcX = sampleRate > 1 ? Math.floor(x / sampleRate) * sampleRate : x;
      const srcIdx = (srcRow + srcX) * 4;
      const dstIdx = (dstRow + x) * 4;

      let r = src[srcIdx];
      let g = src[srcIdx + 1];
      let b = src[srcIdx + 2];

      if (ditherAmt > 0) {
        const bayer = ((x & 1) ^ ((y & 1) << 1)) / 4.0 - 0.375;
        const offset = bayer * step * ditherAmt;
        r = clamp(Math.round(r + offset), 0, 255);
        g = clamp(Math.round(g + offset), 0, 255);
        b = clamp(Math.round(b + offset), 0, 255);
      }

      if (mode === 'luminance-only') {
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const clampedLuma = clamp(Math.round(luma), 0, 255);
        const qLuma = quantLut[clampedLuma];
        const ratio = luma > 0.001 ? qLuma / luma : 0;

        data[dstIdx] = clamp(Math.round(r * ratio), 0, 255);
        data[dstIdx + 1] = clamp(Math.round(g * ratio), 0, 255);
        data[dstIdx + 2] = clamp(Math.round(b * ratio), 0, 255);
      } else {
        data[dstIdx] = quantLut[r];
        data[dstIdx + 1] = quantLut[g];
        data[dstIdx + 2] = quantLut[b];
      }

      data[dstIdx + 3] = origAlpha[dstRow + x];
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
    id: 'sampleRate',
    label: 'Decimation / Sample Rate',
    type: 'number',
    min: 1,
    max: 16,
    step: 1,
    defaultValue: 2,
    unit: 'px'
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

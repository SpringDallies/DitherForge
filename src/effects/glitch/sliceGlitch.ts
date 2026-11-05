// Slice Glitch Effect
// Random horizontal slices offset per frame with temporal frame-index seeding
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  clamp,
  createRng
} from './shared';

export interface SliceGlitchParams {
  sliceCount?: number;
  maxOffset?: number;
  reseedRate?: number;
  temporal?: boolean;
  colorShift?: number;
}

export const sliceGlitchDefaultParams: Required<SliceGlitchParams> = {
  sliceCount: 8,
  maxOffset: 35,
  reseedRate: 1.0,
  temporal: true,
  colorShift: 4
};

export function applySliceGlitch(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...sliceGlitchDefaultParams, ...resolved.params };

  const sliceCount = clamp(Math.round(p.sliceCount), 1, 64);
  const maxOffset = Math.round(Math.max(0, p.maxOffset));
  const temporal = p.temporal;
  const reseedRate = clamp(p.reseedRate, 0.05, 5.0);
  const colorShift = Math.round(clamp(p.colorShift, 0, 30));

  if (maxOffset === 0 && colorShift === 0) return;

  const frameIndex = resolved.context?.frameIndex ?? 0;
  const frameSeed = temporal ? Math.floor(frameIndex * reseedRate) : 1337;
  const rng = createRng(frameSeed);

  // Snapshot original image to sample displaced pixels
  const src = new Uint8ClampedArray(data);

  for (let s = 0; s < sliceCount; s++) {
    const yStart = Math.floor(rng() * height);
    const sliceHeight = Math.max(1, Math.floor(rng() * (height / sliceCount) * 1.5));
    const yEnd = Math.min(height, yStart + sliceHeight);

    const offset = Math.round((rng() * 2 - 1) * maxOffset);
    if (offset === 0 && colorShift === 0) continue;

    for (let y = yStart; y < yEnd; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const dstIdx = (rowOffset + x) * 4;

        if (colorShift > 0) {
          let rx = x - offset - colorShift;
          if (rx < 0) rx = (rx % width + width) % width;
          else if (rx >= width) rx = rx % width;

          let gx = x - offset;
          if (gx < 0) gx = (gx % width + width) % width;
          else if (gx >= width) gx = gx % width;

          let bx = x - offset + colorShift;
          if (bx < 0) bx = (bx % width + width) % width;
          else if (bx >= width) bx = bx % width;

          data[dstIdx] = src[(rowOffset + rx) * 4];
          data[dstIdx + 1] = src[(rowOffset + gx) * 4 + 1];
          data[dstIdx + 2] = src[(rowOffset + bx) * 4 + 2];
        } else {
          let gx = x - offset;
          if (gx < 0) gx = (gx % width + width) % width;
          else if (gx >= width) gx = gx % width;

          const srcIdx = (rowOffset + gx) * 4;
          data[dstIdx] = src[srcIdx];
          data[dstIdx + 1] = src[srcIdx + 1];
          data[dstIdx + 2] = src[srcIdx + 2];
        }
        // Alpha preserved from src pixel at dstIdx
        data[dstIdx + 3] = src[dstIdx + 3];
      }
    }
  }
}

export function applySliceGlitchFrame(ctx: any, params: any = {}, frameIndex: number = 0): void {
  applySliceGlitch(ctx, params, { frameIndex });
}

export const sliceGlitchParamsMeta: ParamMeta[] = [
  {
    id: 'sliceCount',
    label: 'Slice Count',
    type: 'number',
    min: 1,
    max: 64,
    step: 1,
    defaultValue: 8
  },
  {
    id: 'maxOffset',
    label: 'Max Offset',
    type: 'number',
    min: 0,
    max: 200,
    step: 1,
    defaultValue: 35,
    unit: 'px'
  },
  {
    id: 'reseedRate',
    label: 'Reseed Speed',
    type: 'number',
    min: 0.1,
    max: 2.0,
    step: 0.1,
    defaultValue: 1.0
  },
  {
    id: 'colorShift',
    label: 'RGB Tearing',
    type: 'number',
    min: 0,
    max: 20,
    step: 1,
    defaultValue: 4,
    unit: 'px'
  },
  {
    id: 'temporal',
    label: 'Temporal Animation',
    type: 'boolean',
    defaultValue: true
  }
];

export const sliceGlitchEffect: EffectDescriptor<SliceGlitchParams> = {
  id: 'slice_glitch',
  name: 'Slice Glitch',
  category: 'glitch',
  description: 'Random horizontal slices offset per frame',
  defaultParams: sliceGlitchDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: sliceGlitchParamsMeta,
  params: sliceGlitchParamsMeta,
  apply: applySliceGlitch,
  applyFrame: applySliceGlitchFrame
};

export const sliceGlitchDescriptor = sliceGlitchEffect;
export default sliceGlitchEffect;

// Block Displacement Effect
// Block shift with probability, magnitude, and temporal frame-index seeding
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  clamp,
  hash2D
} from './shared';

export interface BlockDisplacementParams {
  blockSize?: number;
  magnitude?: number;
  probability?: number;
  temporal?: boolean;
}

export const blockDisplacementDefaultParams: Required<BlockDisplacementParams> = {
  blockSize: 16,
  magnitude: 24,
  probability: 0.15,
  temporal: true
};

export function applyBlockDisplacement(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...blockDisplacementDefaultParams, ...resolved.params };

  const blockSize = Math.max(4, Math.round(p.blockSize));
  const magnitude = Math.round(Math.max(0, p.magnitude));
  const probability = clamp(p.probability, 0, 1);
  const temporal = p.temporal;

  if (magnitude === 0 || probability <= 0.001) return;

  const totalPixels = width * height;
  const origAlpha = new Uint8ClampedArray(totalPixels);
  for (let i = 0, a = 3; i < totalPixels; i++, a += 4) {
    origAlpha[i] = data[a];
  }

  const src = new Uint8ClampedArray(data);

  const frameIndex = resolved.context?.frameIndex ?? 0;
  const seed = temporal ? frameIndex * 997 + 101 : 42;
  const numBlocksX = Math.ceil(width / blockSize);
  const numBlocksY = Math.ceil(height / blockSize);

  for (let by = 0; by < numBlocksY; by++) {
    for (let bx = 0; bx < numBlocksX; bx++) {
      const probHash = hash2D(bx, by, seed);
      if (probHash >= probability) continue;

      const dirHashX = hash2D(bx, by, seed + 1);
      const dirHashY = hash2D(bx, by, seed + 2);

      const dx = Math.round((dirHashX * 2 - 1) * magnitude);
      const dy = Math.round((dirHashY * 2 - 1) * magnitude);

      const startX = bx * blockSize;
      const startY = by * blockSize;
      const endX = Math.min(width, startX + blockSize);
      const endY = Math.min(height, startY + blockSize);

      for (let y = startY; y < endY; y++) {
        const dstRow = y * width;
        const srcY = clamp(y + dy, 0, height - 1);
        const srcRow = srcY * width;

        for (let x = startX; x < endX; x++) {
          const srcX = clamp(x + dx, 0, width - 1);
          const dstIdx = (dstRow + x) * 4;
          const srcIdx = (srcRow + srcX) * 4;

          data[dstIdx] = src[srcIdx];
          data[dstIdx + 1] = src[srcIdx + 1];
          data[dstIdx + 2] = src[srcIdx + 2];
        }
      }
    }
  }

  for (let i = 0; i < totalPixels; i++) {
    data[i * 4 + 3] = origAlpha[i];
  }
}

export function applyBlockDisplacementFrame(ctx: any, params: any = {}, frameIndex: number = 0): void {
  applyBlockDisplacement(ctx, params, { frameIndex });
}

export const blockDisplacementParamsMeta: ParamMeta[] = [
  {
    id: 'blockSize',
    label: 'Block Size',
    type: 'number',
    min: 4,
    max: 128,
    step: 4,
    defaultValue: 16,
    unit: 'px'
  },
  {
    id: 'magnitude',
    label: 'Magnitude',
    type: 'number',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 24,
    unit: 'px'
  },
  {
    id: 'probability',
    label: 'Glitch Probability',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.02,
    defaultValue: 0.15
  },
  {
    id: 'temporal',
    label: 'Temporal Animation',
    type: 'boolean',
    defaultValue: true
  }
];

export const blockDisplacementEffect: EffectDescriptor<BlockDisplacementParams> = {
  id: 'block_displacement',
  name: 'Block Displacement',
  category: 'glitch',
  description: 'Block shift with probability and magnitude',
  defaultParams: blockDisplacementDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: blockDisplacementParamsMeta,
  params: blockDisplacementParamsMeta,
  apply: applyBlockDisplacement,
  applyFrame: applyBlockDisplacementFrame
};

export default blockDisplacementEffect;

// Outline / Edge Overlay Effect
// Sobel edges multiplied or blended over image
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  blendChannel,
  hexToRgb,
  clamp
} from './shared';

export interface OutlineParams {
  threshold?: number; // 0.01 to 1.0 (default: 0.2)
  thickness?: number; // 1 to 4 (default: 1)
  color?: string; // (default: '#000000')
  blend?: 'multiply' | 'normal' | 'screen' | 'overlay' | 'soft-light' | 'add';
  opacity?: number; // 0 to 1 (default: 0.85)
}

export const outlineDefaultParams: Required<OutlineParams> = {
  threshold: 0.2,
  thickness: 1,
  color: '#000000',
  blend: 'multiply',
  opacity: 0.85
};

export function applyOutline(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...outlineDefaultParams, ...resolved.params };

  const threshold = clamp(p.threshold * 255 * 4, 10, 1000); // Scaled Sobel magnitude threshold
  const thickness = clamp(Math.round(p.thickness), 1, 4);
  const color = hexToRgb(p.color);
  const blendMode = p.blend;
  const opacity = clamp(p.opacity, 0, 1);

  const totalPixels = width * height;

  // Preserve alpha
  const origAlpha = new Uint8ClampedArray(totalPixels);
  for (let i = 0, a = 3; i < totalPixels; i++, a += 4) {
    origAlpha[i] = data[a];
  }

  // Precompute luminance buffer
  const luma = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    luma[i] = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
  }

  // Edge detection map (binary 0..1)
  const edges = new Uint8Array(totalPixels);

  // 3x3 Sobel Operator
  for (let y = 1; y < height - 1; y++) {
    const rPrev = (y - 1) * width;
    const rCurr = y * width;
    const rNext = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      // Horizontal gradient Gx
      const gx =
        -1 * luma[rPrev + x - 1] + 1 * luma[rPrev + x + 1] +
        -2 * luma[rCurr + x - 1] + 2 * luma[rCurr + x + 1] +
        -1 * luma[rNext + x - 1] + 1 * luma[rNext + x + 1];

      // Vertical gradient Gy
      const gy =
        -1 * luma[rPrev + x - 1] - 2 * luma[rPrev + x] - 1 * luma[rPrev + x + 1] +
         1 * luma[rNext + x - 1] + 2 * luma[rNext + x] + 1 * luma[rNext + x + 1];

      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag >= threshold) {
        edges[rCurr + x] = 1;
      }
    }
  }

  // Morphological dilation for thickness > 1
  let finalEdgeMask = edges;
  if (thickness > 1) {
    const rad = thickness - 1;
    finalEdgeMask = new Uint8Array(totalPixels);
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        if (edges[rowOffset + x] === 1) {
          for (let dy = -rad; dy <= rad; dy++) {
            const ny = clamp(y + dy, 0, height - 1);
            const nRow = ny * width;
            for (let dx = -rad; dx <= rad; dx++) {
              const nx = clamp(x + dx, 0, width - 1);
              finalEdgeMask[nRow + nx] = 1;
            }
          }
        }
      }
    }
  }

  // Apply edge outline over base image
  for (let i = 0; i < totalPixels; i++) {
    if (finalEdgeMask[i] === 1) {
      const idx = i * 4;
      const baseR = data[idx];
      const baseG = data[idx + 1];
      const baseB = data[idx + 2];

      const blendedR = blendChannel(baseR, color[0], blendMode);
      const blendedG = blendChannel(baseG, color[1], blendMode);
      const blendedB = blendChannel(baseB, color[2], blendMode);

      data[idx] = clamp(Math.round(baseR + (blendedR - baseR) * opacity), 0, 255);
      data[idx + 1] = clamp(Math.round(baseG + (blendedG - baseG) * opacity), 0, 255);
      data[idx + 2] = clamp(Math.round(baseB + (blendedB - baseB) * opacity), 0, 255);
    }
    data[i * 4 + 3] = origAlpha[i];
  }
}

export const outlineParamsMeta: ParamMeta[] = [
  {
    id: 'threshold',
    label: 'Edge Sensitivity',
    type: 'number',
    min: 0.05,
    max: 1.0,
    step: 0.02,
    defaultValue: 0.2
  },
  {
    id: 'thickness',
    label: 'Stroke Thickness',
    type: 'number',
    min: 1,
    max: 4,
    step: 1,
    defaultValue: 1
  },
  {
    id: 'color',
    label: 'Line Color',
    type: 'color',
    defaultValue: '#000000'
  },
  {
    id: 'blend',
    label: 'Blend Mode',
    type: 'select',
    defaultValue: 'multiply',
    options: [
      { value: 'multiply', label: 'Multiply' },
      { value: 'normal', label: 'Normal' },
      { value: 'screen', label: 'Screen' },
      { value: 'overlay', label: 'Overlay' },
      { value: 'soft-light', label: 'Soft Light' },
      { value: 'add', label: 'Add' }
    ]
  },
  {
    id: 'opacity',
    label: 'Opacity',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.85
  }
];

export const outlineEffect: EffectDescriptor<OutlineParams> = {
  id: 'outline_overlay',
  name: 'Outline / Edge Overlay',
  category: 'color',
  description: 'Sobel edge detection multiplied over image',
  defaultParams: outlineDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: outlineParamsMeta,
  params: outlineParamsMeta,
  apply: applyOutline
};

export const outlineDescriptor = outlineEffect;
export default outlineEffect;

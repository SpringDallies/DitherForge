// Risograph Misregistration Effect
// 2–3 ink layers offset, multiply blend, slight texture stipple
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  hexToRgb,
  clamp
} from './shared';

export interface RisographParams {
  layerCount?: number; // 2 or 3
  offsetX1?: number; // -20 to 20 px
  offsetY1?: number;
  offsetX2?: number;
  offsetY2?: number;
  offsetX3?: number;
  offsetY3?: number;
  inkColor1?: string;
  inkColor2?: string;
  inkColor3?: string;
  textureAmount?: number; // 0 to 1 stipple
  paperColor?: string;
  blendMode?: 'multiply' | 'normal' | 'screen' | 'overlay' | 'soft-light' | 'add';
}

export const risographDefaultParams: Required<RisographParams> = {
  layerCount: 2,
  offsetX1: -3,
  offsetY1: -2,
  offsetX2: 4,
  offsetY2: 3,
  offsetX3: 0,
  offsetY3: -5,
  inkColor1: '#ff48b0', // Fluorescent Pink
  inkColor2: '#0078bf', // Cornflower Blue
  inkColor3: '#ffe800', // Yellow
  textureAmount: 0.18,
  paperColor: '#fbf9f4', // Warm Risograph paper base
  blendMode: 'multiply'
};

// Static 1024-entry noise lookup table to avoid millions of PRNG calls per frame
const NOISE_TABLE = new Float32Array(1024);
for (let i = 0; i < 1024; i++) {
  let t = (i + 1) * 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  NOISE_TABLE[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296) - 0.5;
}

export function applyRisograph(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...risographDefaultParams, ...resolved.params };

  const layerCount = clamp(Math.round(p.layerCount), 2, 3);
  const offsetsX = [Math.round(p.offsetX1), Math.round(p.offsetX2), Math.round(p.offsetX3)];
  const offsetsY = [Math.round(p.offsetY1), Math.round(p.offsetY2), Math.round(p.offsetY3)];
  const inks = [
    hexToRgb(p.inkColor1),
    hexToRgb(p.inkColor2),
    hexToRgb(p.inkColor3)
  ];
  const paper = hexToRgb(p.paperColor);
  const texture = clamp(p.textureAmount, 0, 1);
  const totalPixels = width * height;

  // Snapshot original image to sample shifted layers
  const src = new Uint8ClampedArray(data);

  // Initialize output with paper background color
  const paperR = paper[0];
  const paperG = paper[1];
  const paperB = paper[2];

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    data[idx] = paperR;
    data[idx + 1] = paperG;
    data[idx + 2] = paperB;
    // alpha data[idx + 3] remains src[idx + 3]
  }

  // Precompute ink complement factors
  const invInkR0 = 255 - inks[0][0], invInkG0 = 255 - inks[0][1], invInkB0 = 255 - inks[0][2];
  const invInkR1 = 255 - inks[1][0], invInkG1 = 255 - inks[1][1], invInkB1 = 255 - inks[1][2];
  const invInkR2 = 255 - inks[2][0], invInkG2 = 255 - inks[2][1], invInkB2 = 255 - inks[2][2];

  for (let l = 0; l < layerCount; l++) {
    const ox = offsetsX[l];
    const oy = offsetsY[l];
    const invR = l === 0 ? invInkR0 : l === 1 ? invInkR1 : invInkR2;
    const invG = l === 0 ? invInkG0 : l === 1 ? invInkG1 : invInkG2;
    const invB = l === 0 ? invInkB0 : l === 1 ? invInkB1 : invInkB2;

    for (let y = 0; y < height; y++) {
      let srcY = y - oy;
      if (srcY < 0) srcY = 0;
      else if (srcY >= height) srcY = height - 1;

      const dstRow = y * width;
      const srcRow = srcY * width;
      const noiseRowOffset = (y * 57 + l * 239) & 1023;

      for (let x = 0; x < width; x++) {
        let srcX = x - ox;
        if (srcX < 0) srcX = 0;
        else if (srcX >= width) srcX = width - 1;

        const srcIdx = (srcRow + srcX) * 4;
        const sr = src[srcIdx];
        const sg = src[srcIdx + 1];
        const sb = src[srcIdx + 2];

        // Fast density extraction
        let density: number;
        if (layerCount === 2) {
          if (l === 0) {
            density = 1.0 - (0.3 * sr + 0.7 * sg) * 0.0039215686; // 1/255
          } else {
            density = 1.0 - (0.7 * sr + 0.3 * sb) * 0.0039215686;
          }
        } else {
          if (l === 0) density = 1.0 - sg * 0.0039215686;
          else if (l === 1) density = 1.0 - sr * 0.0039215686;
          else density = 1.0 - sb * 0.0039215686;
        }

        if (density <= 0.005) continue;

        if (texture > 0) {
          const n = NOISE_TABLE[(noiseRowOffset + x) & 1023] * texture;
          density += n;
          if (density < 0) density = 0;
          else if (density > 1) density = 1;
        }

        const printR = 255 - density * invR;
        const printG = 255 - density * invG;
        const printB = 255 - density * invB;

        const dstIdx = (dstRow + x) * 4;
        // Inlined fast multiply blend: (base * blend) / 255
        data[dstIdx] = (data[dstIdx] * printR) * 0.0039215686;
        data[dstIdx + 1] = (data[dstIdx + 1] * printG) * 0.0039215686;
        data[dstIdx + 2] = (data[dstIdx + 2] * printB) * 0.0039215686;
      }
    }
  }

  // Restore alpha
  for (let i = 0; i < totalPixels; i++) {
    data[i * 4 + 3] = src[i * 4 + 3];
  }
}

export const risographParamsMeta: ParamMeta[] = [
  {
    id: 'layerCount',
    label: 'Layer Count',
    type: 'number',
    min: 2,
    max: 3,
    step: 1,
    defaultValue: 2
  },
  {
    id: 'offsetX1',
    label: 'Layer 1 X Offset',
    type: 'number',
    min: -20,
    max: 20,
    step: 1,
    defaultValue: -3,
    unit: 'px'
  },
  {
    id: 'offsetY1',
    label: 'Layer 1 Y Offset',
    type: 'number',
    min: -20,
    max: 20,
    step: 1,
    defaultValue: -2,
    unit: 'px'
  },
  {
    id: 'inkColor1',
    label: 'Layer 1 Ink',
    type: 'color',
    defaultValue: '#ff48b0'
  },
  {
    id: 'offsetX2',
    label: 'Layer 2 X Offset',
    type: 'number',
    min: -20,
    max: 20,
    step: 1,
    defaultValue: 4,
    unit: 'px'
  },
  {
    id: 'offsetY2',
    label: 'Layer 2 Y Offset',
    type: 'number',
    min: -20,
    max: 20,
    step: 1,
    defaultValue: 3,
    unit: 'px'
  },
  {
    id: 'inkColor2',
    label: 'Layer 2 Ink',
    type: 'color',
    defaultValue: '#0078bf'
  },
  {
    id: 'offsetX3',
    label: 'Layer 3 X Offset',
    type: 'number',
    min: -20,
    max: 20,
    step: 1,
    defaultValue: 0,
    unit: 'px'
  },
  {
    id: 'offsetY3',
    label: 'Layer 3 Y Offset',
    type: 'number',
    min: -20,
    max: 20,
    step: 1,
    defaultValue: -5,
    unit: 'px'
  },
  {
    id: 'inkColor3',
    label: 'Layer 3 Ink',
    type: 'color',
    defaultValue: '#ffe800'
  },
  {
    id: 'textureAmount',
    label: 'Grain / Stipple',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.02,
    defaultValue: 0.18
  },
  {
    id: 'paperColor',
    label: 'Paper Tint',
    type: 'color',
    defaultValue: '#fbf9f4'
  }
];

export const risographEffect: EffectDescriptor<RisographParams> = {
  id: 'risograph_misregistration',
  name: 'Risograph Misregistration',
  category: 'print',
  description: '2–3 ink layers offset with paper base and stipple grain',
  defaultParams: risographDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: risographParamsMeta,
  params: risographParamsMeta,
  apply: applyRisograph
};

export const risographDescriptor = risographEffect;
export default risographEffect;

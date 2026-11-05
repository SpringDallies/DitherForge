// Paper Texture Effect
// Procedural fiber/linen grain with warm paper tint and multiply/overlay blending
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  blendChannel,
  hexToRgb,
  clamp
} from './shared';

export interface PaperTextureParams {
  fiberScale?: number; // 5 to 50 (default: 20)
  contrast?: number; // 0 to 1 (default: 0.35)
  tint?: string; // (default: '#f4ede1')
  opacity?: number; // 0 to 1 (default: 0.85)
  blendMode?: 'multiply' | 'overlay' | 'normal' | 'soft-light' | 'screen' | 'add';
}

export const paperTextureDefaultParams: Required<PaperTextureParams> = {
  fiberScale: 20,
  contrast: 0.35,
  tint: '#f4ede1',
  opacity: 0.85,
  blendMode: 'multiply'
};

// Static 2048-entry noise table for fast grain synthesis
const NOISE_TABLE = new Float32Array(2048);
for (let i = 0; i < 2048; i++) {
  let t = (i + 13) * 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  NOISE_TABLE[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296) - 0.5;
}

export function applyPaperTexture(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...paperTextureDefaultParams, ...resolved.params };

  const scale = clamp(p.fiberScale, 2, 100);
  const contrast = clamp(p.contrast, 0, 1.5);
  const tint = hexToRgb(p.tint);
  const opacity = clamp(p.opacity, 0, 1);
  const blendMode = p.blendMode;

  const totalPixels = width * height;
  const invScale = 1.0 / scale;

  // Precompute 1D harmonic waves across X and Y to eliminate 18+ million trig calls
  const sinX = new Float32Array(width);
  const cosX = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    sinX[x] = Math.sin(x * invScale * Math.PI * 2);
    cosX[x] = Math.cos(x * invScale * 0.5);
  }

  const sinY = new Float32Array(height);
  const cosY = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    sinY[y] = Math.sin(y * invScale * Math.PI * 2);
    cosY[y] = Math.cos(y * invScale * 0.5);
  }

  const tintR = tint[0];
  const tintG = tint[1];
  const tintB = tint[2];

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    const syCos = cosY[y];
    const sySin = sinY[y];
    const noiseRow = (y * 67) & 2047;

    for (let x = 0; x < width; x++) {
      // 1D decomposed weave calculation
      const weaveH = sinX[x] * syCos;
      const weaveV = sySin * cosX[x];
      const weave = (weaveH + weaveV) * 0.5;

      const fineGrain = NOISE_TABLE[(noiseRow + x) & 2047] * 0.4;
      const rawSurface = (weave * 0.5 + fineGrain) * contrast;
      const grainFactor = 1.0 + rawSurface;

      let paperR = tintR * grainFactor;
      let paperG = tintG * grainFactor;
      let paperB = tintB * grainFactor;

      if (paperR < 0) paperR = 0; else if (paperR > 255) paperR = 255;
      if (paperG < 0) paperG = 0; else if (paperG > 255) paperG = 255;
      if (paperB < 0) paperB = 0; else if (paperB > 255) paperB = 255;

      const idx = (rowOffset + x) * 4;
      const baseR = data[idx];
      const baseG = data[idx + 1];
      const baseB = data[idx + 2];

      let blendedR = paperR, blendedG = paperG, blendedB = paperB;
      if (blendMode === 'multiply') {
        blendedR = (baseR * paperR) * 0.0039215686;
        blendedG = (baseG * paperG) * 0.0039215686;
        blendedB = (baseB * paperB) * 0.0039215686;
      } else if (blendMode === 'overlay') {
        blendedR = baseR < 128 ? (2 * baseR * paperR) * 0.0039215686 : 255 - (2 * (255 - baseR) * (255 - paperR)) * 0.0039215686;
        blendedG = baseG < 128 ? (2 * baseG * paperG) * 0.0039215686 : 255 - (2 * (255 - baseG) * (255 - paperG)) * 0.0039215686;
        blendedB = baseB < 128 ? (2 * baseB * paperB) * 0.0039215686 : 255 - (2 * (255 - baseB) * (255 - paperB)) * 0.0039215686;
      } else {
        blendedR = blendChannel(baseR, paperR | 0, blendMode);
        blendedG = blendChannel(baseG, paperG | 0, blendMode);
        blendedB = blendChannel(baseB, paperB | 0, blendMode);
      }

      data[idx] = (baseR + (blendedR - baseR) * opacity) | 0;
      data[idx + 1] = (baseG + (blendedG - baseG) * opacity) | 0;
      data[idx + 2] = (baseB + (blendedB - baseB) * opacity) | 0;
      // alpha data[idx + 3] preserved
    }
  }
}

export const paperTextureParamsMeta: ParamMeta[] = [
  {
    id: 'fiberScale',
    label: 'Fiber Scale',
    type: 'number',
    min: 5,
    max: 50,
    step: 1,
    defaultValue: 20
  },
  {
    id: 'contrast',
    label: 'Grain Contrast',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.35
  },
  {
    id: 'tint',
    label: 'Paper Tint',
    type: 'color',
    defaultValue: '#f4ede1'
  },
  {
    id: 'opacity',
    label: 'Opacity',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.85
  },
  {
    id: 'blendMode',
    label: 'Blend Mode',
    type: 'select',
    defaultValue: 'multiply',
    options: [
      { value: 'multiply', label: 'Multiply' },
      { value: 'overlay', label: 'Overlay' },
      { value: 'soft-light', label: 'Soft Light' },
      { value: 'normal', label: 'Normal' },
      { value: 'screen', label: 'Screen' },
      { value: 'add', label: 'Add' }
    ]
  }
];

export const paperTextureEffect: EffectDescriptor<PaperTextureParams> = {
  id: 'paper_texture',
  name: 'Paper Texture',
  category: 'print',
  description: 'Procedural fiber/linen grain with tint and multiply/overlay blending',
  defaultParams: paperTextureDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: paperTextureParamsMeta,
  params: paperTextureParamsMeta,
  apply: applyPaperTexture
};

export const paperTextureDescriptor = paperTextureEffect;
export default paperTextureEffect;

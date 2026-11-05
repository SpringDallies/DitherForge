// Paper Texture Effect
// Realistic procedural cellulose pulp fibers with fine tooth, organic clouding, paper tint, and alpha-preserving blending
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

function hash2D(x: number, y: number, seed: number = 0): number {
  let h = Math.imul(x + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y + seed, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  return ((h ^ (h >>> 15)) >>> 0) * 2.3283064365386963e-10;
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

  // 1. Procedural Curved Cellulose Fiber Synthesis
  // Renders authentic intertwined pulp strands (anti-aliased curved filaments)
  const fiberBuffer = new Float32Array(totalPixels);
  const cellSize = Math.max(8, Math.round(scale * 0.9));
  const cols = Math.ceil(width / cellSize) + 2;
  const rows = Math.ceil(height / cellSize) + 2;

  for (let cy = -1; cy < rows; cy++) {
    for (let cx = -1; cx < cols; cx++) {
      for (let k = 0; k < 2; k++) {
        let state = (Math.imul(cx + 0x517cc1b7, 0x9e3779b9) ^ Math.imul(cy + 101, 0x85ebca6b) ^ Math.imul(k + 17, 0xc2b2ae35)) >>> 0;
        state = (state + 0x9e3779b9) >>> 0;
        const r1 = ((Math.imul(state ^ (state >>> 16), 0x85ebca6b) >>> 0)) * 2.3283064365386963e-10;
        state = (state + 0x9e3779b9) >>> 0;
        const r2 = ((Math.imul(state ^ (state >>> 16), 0x85ebca6b) >>> 0)) * 2.3283064365386963e-10;
        state = (state + 0x9e3779b9) >>> 0;
        const r3 = ((Math.imul(state ^ (state >>> 16), 0x85ebca6b) >>> 0)) * 2.3283064365386963e-10;
        state = (state + 0x9e3779b9) >>> 0;
        const r4 = ((Math.imul(state ^ (state >>> 16), 0x85ebca6b) >>> 0)) * 2.3283064365386963e-10;
        state = (state + 0x9e3779b9) >>> 0;
        const r5 = ((Math.imul(state ^ (state >>> 16), 0x85ebca6b) >>> 0)) * 2.3283064365386963e-10;

        const x0 = cx * cellSize + r1 * cellSize;
        const y0 = cy * cellSize + r2 * cellSize;
        const len = scale * (0.8 + r3 * 1.1);
        const angle = r4 * Math.PI * 2;
        const dAngle = (r5 - 0.5) * 1.4;
        const isDark = r1 < 0.32;
        const baseInt = isDark ? -0.25 - 0.2 * r2 : 0.16 + 0.16 * r2;

        const steps = Math.max(2, Math.ceil(len / 1.5));
        const stepSize = len / steps;
        const stepDAngle = dAngle / steps;
        const rotCos = Math.cos(stepDAngle);
        const rotSin = Math.sin(stepDAngle);
        let curX = x0, curY = y0;
        let dirX = Math.cos(angle) * stepSize;
        let dirY = Math.sin(angle) * stepSize;

        for (let s = 0; s <= steps; s++) {
          const ix = curX | 0;
          const iy = curY | 0;
          if (ix >= 0 && ix < width - 1 && iy >= 0 && iy < height - 1) {
            const fx = curX - ix;
            const fy = curY - iy;
            const t = s / steps;
            const taper = t * (1 - t) * 4;
            const val = baseInt * taper;
            const idx = iy * width + ix;
            fiberBuffer[idx] += val * (1 - fx) * (1 - fy);
            fiberBuffer[idx + 1] += val * fx * (1 - fy);
            fiberBuffer[idx + width] += val * (1 - fx) * fy;
            fiberBuffer[idx + width + 1] += val * fx * fy;
          }
          curX += dirX;
          curY += dirY;
          const nextDirX = dirX * rotCos - dirY * rotSin;
          const nextDirY = dirX * rotSin + dirY * rotCos;
          dirX = nextDirX;
          dirY = nextDirY;
        }
      }
    }
  }

  // 2. Low-frequency organic pulp cloudiness (flocculation / formation index)
  const cloudStep = Math.max(16, Math.round(scale * 1.5));
  const gw = Math.ceil(width / cloudStep) + 2;
  const gh = Math.ceil(height / cloudStep) + 2;
  const cloudGrid = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      cloudGrid[gy * gw + gx] = hash2D(gx, gy, 101);
    }
  }

  const gxLUT = new Int32Array(width);
  const uLUT = new Float32Array(width);
  const invULUT = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    const gx = (x / cloudStep) | 0;
    const tx = (x - gx * cloudStep) / cloudStep;
    const u = tx * tx * (3 - 2 * tx);
    gxLUT[x] = gx;
    uLUT[x] = u;
    invULUT[x] = 1 - u;
  }

  const tintR = tint[0];
  const tintG = tint[1];
  const tintB = tint[2];

  // 3. Composite Surface Modulation & Alpha-Preserved Blending
  for (let y = 0; y < height; y++) {
    const gy = (y / cloudStep) | 0;
    const ty = (y - gy * cloudStep) / cloudStep;
    const v = ty * ty * (3 - 2 * ty);
    const invV = 1 - v;
    const rowOffset = y * width;
    const gRow0 = gy * gw;
    const gRow1 = (gy + 1) * gw;
    const yMix = Math.imul(y + 71, 0xc2b2ae35);

    for (let x = 0; x < width; x++) {
      const gx = gxLUT[x];
      const u = uLUT[x];
      const invU = invULUT[x];

      const top = cloudGrid[gRow0 + gx] * invU + cloudGrid[gRow0 + gx + 1] * u;
      const bot = cloudGrid[gRow1 + gx] * invU + cloudGrid[gRow1 + gx + 1] * u;
      const cloud = (top * invV + bot * v) - 0.5;

      // Organic paper tooth (fine microscopic roughness)
      let hInt = Math.imul(x + 0x9e3779b9, 0x85ebca6b) ^ yMix;
      hInt = Math.imul(hInt ^ (hInt >>> 16), 0x7feb352d);
      const tooth = (((hInt ^ (hInt >>> 15)) >>> 0) * 2.3283064365386963e-10) - 0.5;

      const fiber = fiberBuffer[rowOffset + x];
      const rawSurface = (fiber * 1.5 + tooth * 0.35 + cloud * 0.25) * contrast;
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

// Photocopy Degradation Effect
// High-contrast toner curve, drum streak artifacts, toner speckles, scanner edge darkening, optical blur
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  clamp
} from './shared';

export interface PhotocopyParams {
  speckleDensity?: number; // 0 to 1 (default: 0.25)
  streakAmount?: number; // 0 to 1 (default: 0.2)
  edgeDarkening?: number; // 0 to 1 (default: 0.35)
  blur?: number; // 0 to 3 px (default: 0.8)
  contrast?: number; // 1 to 4 (default: 2.2)
}

export const photocopyDefaultParams: Required<PhotocopyParams> = {
  speckleDensity: 0.25,
  streakAmount: 0.2,
  edgeDarkening: 0.35,
  blur: 0.8,
  contrast: 2.2
};

// Static noise table for fast speckle generation
const NOISE_TABLE = new Float32Array(2048);
for (let i = 0; i < 2048; i++) {
  let t = (i + 7) * 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  NOISE_TABLE[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function applyPhotocopy(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...photocopyDefaultParams, ...resolved.params };

  const speckleDensity = clamp(p.speckleDensity, 0, 1);
  const streakAmount = clamp(p.streakAmount, 0, 1);
  const edgeDarkening = clamp(p.edgeDarkening, 0, 1);
  const blurRadius = clamp(p.blur, 0, 3);
  const contrast = clamp(p.contrast, 1, 5);

  const totalPixels = width * height;

  // Preserve alpha
  const origAlpha = new Uint8ClampedArray(totalPixels);
  for (let i = 0, a = 3; i < totalPixels; i++, a += 4) {
    origAlpha[i] = data[a];
  }

  // Precompute 256-entry contrast curve LUT
  const contrastLUT = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    let luma = i / 255.0;
    luma = Math.pow(luma, contrast);
    luma = luma < 0.5
      ? 2 * Math.pow(luma, 1.5)
      : 1 - 2 * Math.pow(1 - luma, 1.5);
    contrastLUT[i] = clamp(luma, 0, 1);
  }

  // Generate 1D column streak modulation
  const colStreaks = new Float32Array(width);
  if (streakAmount > 0) {
    for (let x = 0; x < width; x++) {
      const streakNoise = NOISE_TABLE[(x * 13) & 2047];
      if (streakNoise < 0.05 * streakAmount) {
        colStreaks[x] = -0.15 * streakAmount;
      } else if (streakNoise > 1.0 - 0.03 * streakAmount) {
        colStreaks[x] = 0.1 * streakAmount;
      }
    }
  }

  // Precompute 1D edge darkening factors along X and Y to avoid 2D pow math per pixel
  const edgeDistX = new Float32Array(width);
  if (edgeDarkening > 0) {
    for (let x = 0; x < width; x++) {
      const normX = x / width;
      edgeDistX[x] = Math.min(normX, 1 - normX) * 2;
    }
  }

  // Single-channel working buffer for grayscale toner intensity
  const working = new Float32Array(totalPixels);
  const speckleThreshLow = 0.02 * speckleDensity;
  const speckleThreshHigh = 1.0 - speckleThreshLow * 0.5;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    const normY = y / height;
    const edY = edgeDarkening > 0 ? Math.min(normY, 1 - normY) * 2 : 1;
    const noiseRow = (y * 73) & 2047;

    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const pixelIdx = idx * 4;

      const r = data[pixelIdx];
      const g = data[pixelIdx + 1];
      const b = data[pixelIdx + 2];
      const lumaInt = (54 * r + 182 * g + 19 * b) >> 8;

      let luma = contrastLUT[lumaInt];

      if (streakAmount > 0) {
        luma += colStreaks[x];
      }

      if (edgeDarkening > 0) {
        const edgeFactor = Math.min(edgeDistX[x], edY);
        const inv = 1 - edgeFactor;
        const falloff = 1 - (inv * inv * inv * inv);
        luma = luma * (1 - edgeDarkening * (1 - falloff));
      }

      if (speckleDensity > 0) {
        const noiseVal = NOISE_TABLE[(noiseRow + x) & 2047];
        if (noiseVal < speckleThreshLow) {
          luma -= 0.7;
        } else if (noiseVal > speckleThreshHigh) {
          luma += 0.7;
        }
      }

      working[idx] = luma < 0 ? 0 : luma > 1 ? 255 : luma * 255;
    }
  }

  // Fast separable box/triangle optical blur if blur > 0.1
  let finalToner = working;
  if (blurRadius >= 0.5) {
    const temp = new Float32Array(totalPixels);
    // Horizontal 3-tap blur: (left + 2*center + right) / 4
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const left = working[row + (x > 0 ? x - 1 : 0)];
        const center = working[row + x];
        const right = working[row + (x < width - 1 ? x + 1 : width - 1)];
        temp[row + x] = (left + center * 2 + right) * 0.25;
      }
    }
    finalToner = new Float32Array(totalPixels);
    // Vertical 3-tap blur
    for (let y = 0; y < height; y++) {
      const row = y * width;
      const topRow = (y > 0 ? y - 1 : 0) * width;
      const btmRow = (y < height - 1 ? y + 1 : height - 1) * width;
      for (let x = 0; x < width; x++) {
        const top = temp[topRow + x];
        const center = temp[row + x];
        const btm = temp[btmRow + x];
        finalToner[row + x] = (top + center * 2 + btm) * 0.25;
      }
    }
  }

  // Write grayscale toner back to data with preserved alpha
  for (let i = 0; i < totalPixels; i++) {
    const v = clamp(Math.round(finalToner[i]), 0, 255);
    const idx = i * 4;
    data[idx] = v;
    data[idx + 1] = v;
    data[idx + 2] = v;
    data[idx + 3] = origAlpha[i];
  }
}

export const photocopyParamsMeta: ParamMeta[] = [
  {
    id: 'speckleDensity',
    label: 'Toner Speckles',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.25
  },
  {
    id: 'streakAmount',
    label: 'Drum Streaks',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.2
  },
  {
    id: 'edgeDarkening',
    label: 'Edge Falloff',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.35
  },
  {
    id: 'blur',
    label: 'Optical Blur',
    type: 'number',
    min: 0,
    max: 3,
    step: 0.2,
    defaultValue: 0.8,
    unit: 'px'
  },
  {
    id: 'contrast',
    label: 'Toner Hardness',
    type: 'number',
    min: 1,
    max: 5,
    step: 0.1,
    defaultValue: 2.2
  }
];

export const photocopyEffect: EffectDescriptor<PhotocopyParams> = {
  id: 'photocopy_degradation',
  name: 'Photocopy Degradation',
  category: 'print',
  description: 'Toner speckle, drum streaks, edge darkening, and optical blur',
  defaultParams: photocopyDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: photocopyParamsMeta,
  params: photocopyParamsMeta,
  apply: applyPhotocopy
};

export const photocopyDescriptor = photocopyEffect;
export default photocopyEffect;

// Photocopy Degradation Effect
// High-contrast toner curve, drum streak artifacts, non-repeating 2D toner speckles, scanner edge darkening, continuous optical blur
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

  // Generate 1D non-repeating column streak modulation
  const colStreaks = new Float32Array(width);
  if (streakAmount > 0) {
    for (let x = 0; x < width; x++) {
      let s = Math.imul(x + 0x517cc1b7, 0x9e3779b9);
      s = Math.imul(s ^ (s >>> 16), 0x85ebca6b);
      const sVal = ((s ^ (s >>> 15)) >>> 0) * 2.3283064365386963e-10;
      if (sVal < 0.03 * streakAmount) {
        colStreaks[x] = -0.22 * streakAmount * (0.6 + 0.4 * (((s >> 8) & 0xff) / 255));
      } else if (sVal > 1.0 - 0.02 * streakAmount) {
        colStreaks[x] = 0.16 * streakAmount * (0.6 + 0.4 * (((s >> 8) & 0xff) / 255));
      }
    }
  }

  // Precompute 1D edge darkening factors along X to avoid 2D pow math per pixel
  const edgeDistX = new Float32Array(width);
  if (edgeDarkening > 0) {
    for (let x = 0; x < width; x++) {
      const normX = x / width;
      edgeDistX[x] = Math.min(normX, 1 - normX) * 2;
    }
  }

  // Single-channel working buffer for grayscale toner intensity
  const working = new Float32Array(totalPixels);
  const speckleThreshLow = 0.025 * speckleDensity;
  const speckleThreshHigh = 1.0 - 0.015 * speckleDensity;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    const normY = y / height;
    const edY = edgeDarkening > 0 ? Math.min(normY, 1 - normY) * 2 : 1;
    const yMix = Math.imul(y + 101, 0xc2b2ae35);

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
        let hInt = Math.imul(x + 0x9e3779b9, 0x85ebca6b) ^ yMix;
        hInt = Math.imul(hInt ^ (hInt >>> 16), 0x7feb352d);
        const u = (hInt ^ (hInt >>> 15)) >>> 0;
        const randVal = u * 2.3283064365386963e-10;

        if (randVal < speckleThreshLow) {
          // Dark electrostatic toner speckle
          luma -= 0.65 + 0.3 * (((u >> 8) & 0xff) / 255);
        } else if (luma < 0.35 && randVal > speckleThreshHigh) {
          // Paper fiber void / toner flaking
          luma += 0.5 + 0.4 * (((u >> 16) & 0xff) / 255);
        }
      }

      working[idx] = luma < 0 ? 0 : luma > 1 ? 255 : luma * 255;
    }
  }

  // Smooth, continuous separable Gaussian optical blur
  let finalToner = working;
  if (blurRadius > 0.01) {
    const sigma = blurRadius * 0.75 + 0.1;
    const radius = Math.min(8, Math.max(1, Math.ceil(sigma * 2.4)));
    const kLen = radius * 2 + 1;
    const kernel = new Float32Array(kLen);
    let kSum = 0;
    const twoSigmaSq = 2 * sigma * sigma;
    for (let i = -radius; i <= radius; i++) {
      const w = Math.exp(-(i * i) / twoSigmaSq);
      kernel[i + radius] = w;
      kSum += w;
    }
    const invKSum = 1 / kSum;
    for (let i = 0; i < kLen; i++) {
      kernel[i] *= invKSum;
    }

    // Horizontal separable pass
    const temp = new Float32Array(totalPixels);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          const sx = clamp(x + k, 0, width - 1);
          sum += working[row + sx] * kernel[k + radius];
        }
        temp[row + x] = sum;
      }
    }

    // Vertical separable pass
    finalToner = new Float32Array(totalPixels);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          const sy = clamp(y + k, 0, height - 1);
          sum += temp[sy * width + x] * kernel[k + radius];
        }
        finalToner[row + x] = sum;
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

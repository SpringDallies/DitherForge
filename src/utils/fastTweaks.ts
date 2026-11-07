/**
 * Fast Pre-Adjustment LUT for DitherForge
 * Computes brightness, contrast, saturation, and gamma pre-dithering adjustments
 * using precomputed 256-entry lookup tables to eliminate per-pixel floating-point
 * Math.pow operations across millions of pixels per frame.
 */

export interface Tweaks {
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  hue?: number;
}

/**
 * Fast, linear HSV hue rotation on a single RGB pixel triplet.
 * Uniformly rotates hue across the full 360-degree color wheel while strictly
 * preserving saturation and brightness (value) without non-linear compression or clipping.
 */
export function rotateHueHsvPixel(r: number, g: number, b: number, deg: number): [number, number, number] {
  if (deg === 0 || (r === g && g === b)) return [r, g, b];
  const normalizedDeg = ((deg % 360) + 360) % 360;
  if (normalizedDeg === 0) return [r, g, b];

  let max = r, min = r;
  if (g > max) max = g; if (g < min) min = g;
  if (b > max) max = b; if (b < min) min = b;

  const delta = max - min;
  if (delta === 0) return [r, g, b];

  let h: number;
  if (max === r) {
    h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
  } else if (max === g) {
    h = ((b - r) / delta + 2) * 60;
  } else {
    h = ((r - g) / delta + 4) * 60;
  }

  h = (h + normalizedDeg) % 360;

  const inv60 = 1 / 60;
  const sector = (h * inv60) | 0;
  const f = h * inv60 - sector;
  const p = min;
  const q = max - (delta * f);
  const t = min + (delta * f);

  switch (sector) {
    case 0: return [max, Math.round(t), p];
    case 1: return [Math.round(q), max, p];
    case 2: return [p, max, Math.round(t)];
    case 3: return [p, Math.round(q), max];
    case 4: return [Math.round(t), p, max];
    default: return [max, p, Math.round(q)];
  }
}

/**
 * Fast in-place HSV hue rotation over an RGBA pixel buffer.
 * Traverses pixels with linear 360-degree mapping, preserving alpha, saturation,
 * and maximum value.
 */
export function rotateHueHsvBuffer(data: Uint8ClampedArray, len: number, deg: number): void {
  if (deg === 0) return;
  const normalizedDeg = ((deg % 360) + 360) % 360;
  if (normalizedDeg === 0) return;

  const inv60 = 1 / 60;

  for (let i = 0; i < len; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r === g && g === b) continue; // Achromatic shortcut (gray/black/white)

    let max = r, min = r;
    if (g > max) max = g; if (g < min) min = g;
    if (b > max) max = b; if (b < min) min = b;

    const delta = max - min;
    if (delta === 0) continue;

    let h: number;
    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
    } else if (max === g) {
      h = ((b - r) / delta + 2) * 60;
    } else {
      h = ((r - g) / delta + 4) * 60;
    }

    h = (h + normalizedDeg) % 360;

    const sector = (h * inv60) | 0;
    const f = h * inv60 - sector;
    const p = min;
    const q = max - (delta * f);
    const t = min + (delta * f);

    switch (sector) {
      case 0:
        data[i] = max;
        data[i + 1] = (t + 0.5) | 0;
        data[i + 2] = p;
        break;
      case 1:
        data[i] = (q + 0.5) | 0;
        data[i + 1] = max;
        data[i + 2] = p;
        break;
      case 2:
        data[i] = p;
        data[i + 1] = max;
        data[i + 2] = (t + 0.5) | 0;
        break;
      case 3:
        data[i] = p;
        data[i + 1] = (q + 0.5) | 0;
        data[i + 2] = max;
        break;
      case 4:
        data[i] = (t + 0.5) | 0;
        data[i + 1] = p;
        data[i + 2] = max;
        break;
      default:
        data[i] = max;
        data[i + 1] = p;
        data[i + 2] = (q + 0.5) | 0;
        break;
    }
    // Alpha channel (data[i + 3]) is strictly preserved
  }
}

export function applyTweaksFast(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tweaks: Tweaks
): void {
  const { brightness = 0, contrast = 0, saturation = 0, gamma = 1.0, hue = 0 } = tweaks;

  // Short-circuit immediately on identity tweaks (zero adjustment)
  if (
    brightness === 0 &&
    contrast === 0 &&
    saturation === 0 &&
    (gamma === 1.0 || gamma === 1) &&
    hue === 0
  ) {
    return;
  }

  const bOffset = brightness * 128;
  const cFactor = contrast >= 0 ? 1 + contrast * 2 : 1 + contrast * 0.8;
  const sFactor = 1 + saturation;
  const invGamma = 1 / Math.max(0.01, gamma || 1.0);
  const len = width * height * 4;

  if (saturation === 0) {
    // Fast path: Precompute combined tone LUT (contrast + brightness + gamma)
    const toneLut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      let val = (v - 128) * cFactor + 128 + bOffset;
      val = Math.max(0, Math.min(255, val));
      if (invGamma !== 1.0) {
        val = 255 * Math.pow(val / 255, invGamma);
      }
      toneLut[v] = Math.max(0, Math.min(255, Math.round(val)));
    }

    // Tight integer loop with zero per-pixel floating-point operations
    for (let i = 0; i < len; i += 4) {
      data[i] = toneLut[data[i]];
      data[i + 1] = toneLut[data[i + 1]];
      data[i + 2] = toneLut[data[i + 2]];
    }
  } else {
    // Saturation active: Precompute contrast/brightness LUT and gamma output LUT
    const cbLut = new Float32Array(256);
    for (let v = 0; v < 256; v++) {
      cbLut[v] = (v - 128) * cFactor + 128 + bOffset;
    }

    const gammaLut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      let val = v;
      if (invGamma !== 1.0) {
        val = 255 * Math.pow(v / 255, invGamma);
      }
      gammaLut[v] = Math.max(0, Math.min(255, Math.round(val)));
    }

    for (let i = 0; i < len; i += 4) {
      let r = cbLut[data[i]];
      let g = cbLut[data[i + 1]];
      let b = cbLut[data[i + 2]];

      // Saturation via Rec. 709 luminance
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = luma + (r - luma) * sFactor;
      g = luma + (g - luma) * sFactor;
      b = luma + (b - luma) * sFactor;

      const ri = r <= 0 ? 0 : r >= 255 ? 255 : (r + 0.5) | 0;
      const gi = g <= 0 ? 0 : g >= 255 ? 255 : (g + 0.5) | 0;
      const bi = b <= 0 ? 0 : b >= 255 ? 255 : (b + 0.5) | 0;

      data[i] = gammaLut[ri];
      data[i + 1] = gammaLut[gi];
      data[i + 2] = gammaLut[bi];
    }
  }

  // Smooth linear HSV hue rotation (preserves saturation, lightness, and alpha)
  if (hue !== 0) {
    rotateHueHsvBuffer(data, len, hue);
  }
}

export const applyFastTweaks = applyTweaksFast;

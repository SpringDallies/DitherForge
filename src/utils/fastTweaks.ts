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
}

export function applyTweaksFast(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tweaks: Tweaks
): void {
  const { brightness = 0, contrast = 0, saturation = 0, gamma = 1.0 } = tweaks;

  // Short-circuit immediately on identity tweaks (zero adjustment)
  if (
    brightness === 0 &&
    contrast === 0 &&
    saturation === 0 &&
    (gamma === 1.0 || gamma === 1)
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
}

// DitherForge Post-Effects Pipeline Blend Modes Engine
import type { BlendMode } from './types';

/**
 * Computes individual channel blend in [0..255] integer range.
 */
export function blendChannel(d: number, s: number, mode: BlendMode): number {
  switch (mode) {
    case 'normal':
      return s;
    case 'screen':
      return 255 - Math.round(((255 - d) * (255 - s)) / 255);
    case 'multiply':
      return Math.round((d * s) / 255);
    case 'overlay':
      return d < 128
        ? Math.round((2 * d * s) / 255)
        : 255 - Math.round((2 * (255 - d) * (255 - s)) / 255);
    case 'soft-light': {
      const dn = d / 255;
      const sn = s / 255;
      const res =
        sn <= 0.5
          ? dn - (1 - 2 * sn) * dn * (1 - dn)
          : dn + (2 * sn - 1) * (Math.sqrt(dn) - dn);
      return Math.round(res * 255);
    }
    case 'add': {
      const sum = d + s;
      return sum > 255 ? 255 : sum;
    }
    default:
      return s;
  }
}

/**
 * Pre-calculated fast LUT for common blend modes where possible.
 */
const SCREEN_LUT = new Uint8Array(256 * 256);
const MULTIPLY_LUT = new Uint8Array(256 * 256);
const OVERLAY_LUT = new Uint8Array(256 * 256);

for (let d = 0; d < 256; d++) {
  for (let s = 0; s < 256; s++) {
    const idx = (d << 8) | s;
    SCREEN_LUT[idx] = 255 - Math.round(((255 - d) * (255 - s)) / 255);
    MULTIPLY_LUT[idx] = Math.round((d * s) / 255);
    OVERLAY_LUT[idx] =
      d < 128
        ? Math.round((2 * d * s) / 255)
        : 255 - Math.round((2 * (255 - d) * (255 - s)) / 255);
  }
}

/**
 * In-place composite of an effect layer buffer onto target base pixels with opacity and blendMode.
 * Preserves the target buffer's alpha channel.
 */
export function compositeEffectLayer(
  base: Uint8ClampedArray,
  layer: Uint8ClampedArray,
  length: number,
  opacity = 1.0,
  blendMode: BlendMode = 'normal'
): void {
  const op = Math.max(0, Math.min(1, opacity));
  if (op <= 0.001) return;

  const invOp = 1 - op;
  const isNormal = blendMode === 'normal';
  const isScreen = blendMode === 'screen';
  const isMultiply = blendMode === 'multiply';
  const isOverlay = blendMode === 'overlay';
  const isAdd = blendMode === 'add';

  if (op >= 0.999 && isNormal) {
    for (let i = 0; i < length; i += 4) {
      base[i] = layer[i];
      base[i + 1] = layer[i + 1];
      base[i + 2] = layer[i + 2];
      // base[i + 3] (alpha) remains untouched
    }
    return;
  }

  for (let i = 0; i < length; i += 4) {
    const dR = base[i];
    const dG = base[i + 1];
    const dB = base[i + 2];

    const sR = layer[i];
    const sG = layer[i + 1];
    const sB = layer[i + 2];

    let blendedR: number;
    let blendedG: number;
    let blendedB: number;

    if (isNormal) {
      blendedR = sR;
      blendedG = sG;
      blendedB = sB;
    } else if (isScreen) {
      blendedR = SCREEN_LUT[(dR << 8) | sR];
      blendedG = SCREEN_LUT[(dG << 8) | sG];
      blendedB = SCREEN_LUT[(dB << 8) | sB];
    } else if (isMultiply) {
      blendedR = MULTIPLY_LUT[(dR << 8) | sR];
      blendedG = MULTIPLY_LUT[(dG << 8) | sG];
      blendedB = MULTIPLY_LUT[(dB << 8) | sB];
    } else if (isOverlay) {
      blendedR = OVERLAY_LUT[(dR << 8) | sR];
      blendedG = OVERLAY_LUT[(dG << 8) | sG];
      blendedB = OVERLAY_LUT[(dB << 8) | sB];
    } else if (isAdd) {
      const r = dR + sR;
      const g = dG + sG;
      const b = dB + sB;
      blendedR = r > 255 ? 255 : r;
      blendedG = g > 255 ? 255 : g;
      blendedB = b > 255 ? 255 : b;
    } else {
      // Soft-light or fallback
      blendedR = blendChannel(dR, sR, blendMode);
      blendedG = blendChannel(dG, sG, blendMode);
      blendedB = blendChannel(dB, sB, blendMode);
    }

    if (op >= 0.999) {
      base[i] = blendedR;
      base[i + 1] = blendedG;
      base[i + 2] = blendedB;
    } else {
      base[i] = Math.round(dR * invOp + blendedR * op);
      base[i + 1] = Math.round(dG * invOp + blendedG * op);
      base[i + 2] = Math.round(dB * invOp + blendedB * op);
    }
  }
}

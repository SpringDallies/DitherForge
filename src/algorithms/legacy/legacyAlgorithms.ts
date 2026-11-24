// Legacy 40 Dithering Algorithms ported with exact mathematical equivalence from Rust (src-tauri/src/algorithms/mod.rs)
// Preserves determinism, alpha channel, and FastPaletteLUT color matching.

import { FastPaletteLUT, getLuminance } from '../../dither-engine/engine/palette.js';
import { ditherBayerMatrix } from '../../dither-engine/engine/ordered.js';

export interface LegacyAlgorithmParams {
  threshold?: number;
  scale?: number;
  diffusionStrength?: number;
  noiseAmount?: number;
  depth?: number;
  temporalSeed?: number;
  serpentine?: boolean;
  [key: string]: any;
}

// Helper: FS Kernel error diffusion (used for riemersma Hilbert curve error decay simulator)
const FS_KERNEL = [
  [1, 0, 7],
  [-1, 1, 3],
  [0, 1, 5],
  [1, 1, 1]
];

// Helper: Burkes Kernel error diffusion (used for diffusion_blur)
const BURKES_KERNEL = [
  [1, 0, 8],
  [2, 0, 4],
  [-2, 1, 2],
  [-1, 1, 4],
  [0, 1, 8],
  [1, 1, 4],
  [2, 1, 2]
];

function runErrorDiffusion(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  lut: FastPaletteLUT,
  kernel: number[][],
  divisor: number,
  diffusionStrength: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  const ringRows = 3;
  const errRing = new Float32Array(ringRows * width * 3);

  for (let y = 0; y < height; y++) {
    const curRowOffset = (y % ringRows) * width * 3;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const eIdx = curRowOffset + x * 3;

      const r = Math.max(0, Math.min(255, data[idx] + errRing[eIdx]));
      const g = Math.max(0, Math.min(255, data[idx + 1] + errRing[eIdx + 1]));
      const b = Math.max(0, Math.min(255, data[idx + 2] + errRing[eIdx + 2]));

      lut.inlineMatch(r, g, b, out, idx);
      out[idx + 3] = data[idx + 3];

      const errR = (r - out[idx]) * diffusionStrength;
      const errG = (g - out[idx + 1]) * diffusionStrength;
      const errB = (b - out[idx + 2]) * diffusionStrength;

      for (let k = 0; k < kernel.length; k++) {
        const kdx = kernel[k][0];
        const kdy = kernel[k][1];
        const weight = kernel[k][2];
        const targetX = x + kdx;
        const targetY = y + kdy;
        if (targetX >= 0 && targetX < width && targetY < height) {
          const targetRowOffset = (targetY % ringRows) * width * 3;
          const targetIdx = targetRowOffset + targetX * 3;
          const factor = weight / divisor;
          errRing[targetIdx] += errR * factor;
          errRing[targetIdx + 1] += errG * factor;
          errRing[targetIdx + 2] += errB * factor;
        }
      }
    }

    for (let i = 0; i < width * 3; i++) {
      errRing[curRowOffset + i] = 0;
    }
  }

  return out;
}

// -------------------------------------------------------------
// PATTERN ALGORITHMS (6 ALGORITHMS)
// -------------------------------------------------------------
export type PatternType =
  | 'horizontal_lines'
  | 'vertical_lines'
  | 'diagonal_hatch'
  | 'concentric_diamond'
  | 'woven_basket'
  | 'hex_stipple';

export function applyPattern(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  patternType: PatternType,
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.5, settings.scale ?? 1.0);
  const threshold = settings.threshold ?? 0.5;
  const diffusionStrength = settings.diffusionStrength ?? 1.0;

  for (let y = 0; y < height; y++) {
    const sy = Math.floor(y / scale);
    for (let x = 0; x < width; x++) {
      const sx = Math.floor(x / scale);

      let patVal = 0.5;
      switch (patternType) {
        case 'horizontal_lines':
          patVal = sy % 3 === 0 ? 0.8 : 0.2;
          break;
        case 'vertical_lines':
          patVal = sx % 3 === 0 ? 0.8 : 0.2;
          break;
        case 'diagonal_hatch':
          patVal = (sx + sy) % 4 === 0 ? 0.8 : 0.2;
          break;
        case 'concentric_diamond': {
          const dx = Math.abs((sx % 8) - 4);
          const dy = Math.abs((sy % 8) - 4);
          patVal = (dx + dy) / 8.0;
          break;
        }
        case 'woven_basket': {
          const bx = Math.floor(sx / 4) % 2;
          const by = Math.floor(sy / 4) % 2;
          if ((bx ^ by) === 0) {
            patVal = sy % 2 === 0 ? 0.75 : 0.25;
          } else if (sx % 2 === 0) {
            patVal = 0.75;
          } else {
            patVal = 0.25;
          }
          break;
        }
        case 'hex_stipple': {
          const hx = sx % 6;
          const hy = sy % 6;
          patVal = (hx === 0 && hy === 0) || (hx === 3 && hy === 3) ? 0.9 : 0.1;
          break;
        }
      }

      const idx = (y * width + x) * 4;
      const shift = (patVal - threshold) * 60.0 * diffusionStrength;

      const targetR = Math.max(0, Math.min(255, data[idx] + shift));
      const targetG = Math.max(0, Math.min(255, data[idx + 1] + shift));
      const targetB = Math.max(0, Math.min(255, data[idx + 2] + shift));

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }

  return out;
}

// -------------------------------------------------------------
// GLITCH ALGORITHMS (17 ALGORITHMS)
// -------------------------------------------------------------
export function applyScanlineJitter(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const scale = settings.scale ?? 1.0;
  const temporalSeed = settings.temporalSeed ?? 0;
  const maxJitter = Math.floor(scale * 16.0);

  for (let y = 0; y < height; y++) {
    const rawJitter = Math.floor(Math.sin(y * 0.3 + temporalSeed) * maxJitter);
    const jitter = Math.max(-maxJitter, Math.min(maxJitter, rawJitter));

    for (let x = 0; x < width; x++) {
      const srcX = Math.max(0, Math.min(width - 1, x + jitter));
      const srcIdx = (y * width + srcX) * 4;
      const idx = (y * width + x) * 4;

      lut.inlineMatch(data[srcIdx], data[srcIdx + 1], data[srcIdx + 2], out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyChromaticOffset(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const scale = settings.scale ?? 1.0;
  const offset = Math.floor(scale * 8.0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rx = Math.max(0, Math.min(width - 1, x + offset));
      const bx = Math.max(0, Math.min(width - 1, x - offset));

      const r = data[(y * width + rx) * 4];
      const g = data[(y * width + x) * 4 + 1];
      const b = data[(y * width + bx) * 4 + 2];

      const idx = (y * width + x) * 4;
      lut.inlineMatch(r, g, b, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyPixelSorting(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const thresholdLuma = (settings.threshold ?? 0.5) * 255.0;

  for (let y = 0; y < height; y++) {
    const rowPixels: Array<{ origX: number; r: number; g: number; b: number; a: number; luma: number }> = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      rowPixels.push({ origX: x, r, g, b, a, luma });
    }

    let i = 0;
    while (i < width) {
      if (rowPixels[i].luma > thresholdLuma) {
        const start = i;
        while (i < width && rowPixels[i].luma > thresholdLuma) {
          i++;
        }
        const slice = rowPixels.slice(start, i);
        slice.sort((a, b) => a.luma - b.luma);
        for (let k = 0; k < slice.length; k++) {
          rowPixels[start + k] = slice[k];
        }
      } else {
        i++;
      }
    }

    for (let x = 0; x < width; x++) {
      const p = rowPixels[x];
      const idx = (y * width + x) * 4;
      lut.inlineMatch(p.r, p.g, p.b, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyDigitalArtifacts(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const blockSize = Math.max(4, Math.floor((settings.scale ?? 1.0) * 8.0));

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      const sampleIdx = (by * width + bx) * 4;
      const matched = lut.findNearest(data[sampleIdx], data[sampleIdx + 1], data[sampleIdx + 2]);

      const maxY = Math.min(height, by + blockSize);
      const maxX = Math.min(width, bx + blockSize);
      for (let y = by; y < maxY; y++) {
        for (let x = bx; x < maxX; x++) {
          const idx = (y * width + x) * 4;
          out[idx] = matched[0];
          out[idx + 1] = matched[1];
          out[idx + 2] = matched[2];
          out[idx + 3] = data[idx + 3];
        }
      }
    }
  }
  return out;
}

export function applyInterlacingTear(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const shift = Math.floor((settings.scale ?? 1.0) * 6.0);

  for (let y = 0; y < height; y++) {
    const xShift = y % 2 === 0 ? shift : -shift;
    for (let x = 0; x < width; x++) {
      const sx = Math.max(0, Math.min(width - 1, x + xShift));
      const srcIdx = (y * width + sx) * 4;
      const idx = (y * width + x) * 4;

      lut.inlineMatch(data[srcIdx], data[srcIdx + 1], data[srcIdx + 2], out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyCrtBloom(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const bloomWeight = settings.diffusionStrength ?? 1.0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let accumR = 0, accumG = 0, accumB = 0;
      let count = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const pIdx = (ny * width + nx) * 4;
            accumR += data[pIdx];
            accumG += data[pIdx + 1];
            accumB += data[pIdx + 2];
            count += 1.0;
          }
        }
      }

      const idx = (y * width + x) * 4;
      const targetR = data[idx] * (1.0 - bloomWeight) + (accumR / count) * bloomWeight;
      const targetG = data[idx + 1] * (1.0 - bloomWeight) + (accumG / count) * bloomWeight;
      const targetB = data[idx + 2] * (1.0 - bloomWeight) + (accumB / count) * bloomWeight;

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyBitCrush(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const depth = Math.max(1, settings.depth ?? 8);
  const step = Math.max(1.0, 256.0 / depth);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const targetR = Math.max(0, Math.min(255, Math.floor(data[idx] / step) * step));
      const targetG = Math.max(0, Math.min(255, Math.floor(data[idx + 1] / step) * step));
      const targetB = Math.max(0, Math.min(255, Math.floor(data[idx + 2] / step) * step));

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyVhsTracking(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  if (width === 0 || height === 0) return out;

  const temporalSeed = settings.temporalSeed ?? 0;
  const bandY = Math.floor((temporalSeed * 7.0) % height);
  const bandH = Math.max(10, Math.floor((settings.scale ?? 1.0) * 20.0));

  for (let y = 0; y < height; y++) {
    const isBand = y >= bandY && y < bandY + bandH;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let targetR = data[idx];
      let targetG = data[idx + 1];
      let targetB = data[idx + 2];

      if (isBand) {
        const noise = ((x * 13 + y * 7 + temporalSeed) % 100) - 50.0;
        targetR = Math.max(0, Math.min(255, targetR + noise));
        targetG = Math.max(0, Math.min(255, targetG + noise));
        targetB = Math.max(0, Math.min(255, targetB + noise));
      }

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyBadRam(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const temporalSeed = settings.temporalSeed ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r = data[idx];
      let g = data[idx + 1];
      const b = data[idx + 2];

      if (((x ^ y) + temporalSeed) % 23 === 0) {
        r ^= 0x40;
        g ^= 0x20;
      }

      lut.inlineMatch(r, g, b, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyWaveDistortion(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const scale = settings.scale ?? 1.0;
  const temporalSeed = settings.temporalSeed ?? 0;
  const amp = scale * 12.0;

  for (let y = 0; y < height; y++) {
    const offset = Math.floor(Math.sin(y * 0.05 + temporalSeed * 0.1) * amp);
    for (let x = 0; x < width; x++) {
      const sx = Math.max(0, Math.min(width - 1, x + offset));
      const srcIdx = (y * width + sx) * 4;
      const idx = (y * width + x) * 4;

      lut.inlineMatch(data[srcIdx], data[srcIdx + 1], data[srcIdx + 2], out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyQuantSlice(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const luma = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
      const slice = Math.floor(luma / 32.0) * 32.0;
      const target = (slice / 255.0) * 255.0;

      lut.inlineMatch(target, target, target, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyMatrixRake(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const threshold = settings.threshold ?? 0.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rake = ((x + y * 2) % 16) / 16.0;
      const shift = (rake - threshold) * 60.0;
      const idx = (y * width + x) * 4;

      const targetR = Math.max(0, Math.min(255, data[idx] + shift));
      const targetG = Math.max(0, Math.min(255, data[idx + 1] + shift));
      const targetB = Math.max(0, Math.min(255, data[idx + 2] + shift));

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyStaticSnow(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const amount = Math.max(0.2, settings.noiseAmount ?? 0.5);
  const temporalSeed = settings.temporalSeed ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const randVal = (((x * 37 + y * 97 + temporalSeed * 13) % 256) - 128.0) * amount;
      const idx = (y * width + x) * 4;

      const targetR = Math.max(0, Math.min(255, data[idx] + randVal));
      const targetG = Math.max(0, Math.min(255, data[idx + 1] + randVal));
      const targetB = Math.max(0, Math.min(255, data[idx + 2] + randVal));

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applySyncPulseLoss(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  if (width === 0 || height === 0) return out;

  const temporalSeed = settings.temporalSeed ?? 0;
  const roll = (temporalSeed * 5) % height;

  for (let y = 0; y < height; y++) {
    const sy = (y + roll) % height;
    for (let x = 0; x < width; x++) {
      const srcIdx = (sy * width + x) * 4;
      const idx = (y * width + x) * 4;

      lut.inlineMatch(data[srcIdx], data[srcIdx + 1], data[srcIdx + 2], out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyFeedbackRinging(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const lag = Math.floor((settings.scale ?? 1.0) * 4.0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lagX = Math.max(0, Math.min(width - 1, x - lag));
      const lagIdx = (y * width + lagX) * 4;

      const targetR = data[idx] * 0.7 + data[lagIdx] * 0.3;
      const targetG = data[idx + 1] * 0.7 + data[lagIdx + 1] * 0.3;
      const targetB = data[idx + 2] * 0.7 + data[lagIdx + 2] * 0.3;

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyChromaSubsample(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const block = 4;

  for (let y = 0; y < height; y++) {
    for (let bx = 0; bx < width; bx += block) {
      const leadIdx = (y * width + bx) * 4;
      const leadR = data[leadIdx];
      const leadG = data[leadIdx + 1];
      const leadB = data[leadIdx + 2];

      const maxX = Math.min(width, bx + block);
      for (let x = bx; x < maxX; x++) {
        const idx = (y * width + x) * 4;
        const targetR = data[idx] * 0.5 + leadR * 0.5;
        const targetG = data[idx + 1] * 0.5 + leadG * 0.5;
        const targetB = data[idx + 2] * 0.5 + leadB * 0.5;

        lut.inlineMatch(targetR, targetG, targetB, out, idx);
        out[idx + 3] = data[idx + 3];
      }
    }
  }
  return out;
}

export function applyMoireGlitch(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const freq = (settings.scale ?? 1.0) * 0.2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wave1 = Math.sin(x * freq);
      const wave2 = Math.sin((x * 0.7 + y * 0.7) * freq * 1.1);
      const beat = wave1 * wave2 * 50.0;

      const idx = (y * width + x) * 4;
      const targetR = Math.max(0, Math.min(255, data[idx] + beat));
      const targetG = Math.max(0, Math.min(255, data[idx + 1] + beat));
      const targetB = Math.max(0, Math.min(255, data[idx + 2] + beat));

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

// -------------------------------------------------------------
// SPECIAL & BESPOKE & TEMPORAL ALGORITHMS (17 ALGORITHMS)
// -------------------------------------------------------------
export function applyFixedThreshold(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const thresh = (settings.threshold ?? 0.5) * 255.0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const luma = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
      const target = luma >= thresh ? 255.0 : 0.0;

      lut.inlineMatch(target, target, target, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyRandomThreshold(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const temporalSeed = settings.temporalSeed ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const luma = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
      const thresh = (((x * 47 + y * 73 + temporalSeed * 19) % 256) / 255.0) * 255.0;
      const target = luma >= thresh ? 255.0 : 0.0;

      lut.inlineMatch(target, target, target, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyBlueNoise(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const threshold = settings.threshold ?? 0.5;
  const diffusionStrength = settings.diffusionStrength ?? 1.0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const h = ((x * 67 + y * 131) % 64) / 64.0;
      const shift = (h - threshold) * 55.0 * diffusionStrength;
      const idx = (y * width + x) * 4;

      const targetR = Math.max(0, Math.min(255, data[idx] + shift));
      const targetG = Math.max(0, Math.min(255, data[idx + 1] + shift));
      const targetB = Math.max(0, Math.min(255, data[idx + 2] + shift));

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyGaussianNoise(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const diffusionStrength = settings.diffusionStrength ?? 1.0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u1 = (((x * 19 + y * 31) % 100) + 1.0) / 101.0;
      const u2 = (((x * 37 + y * 53) % 100) + 1.0) / 101.0;
      const gauss = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const shift = gauss * 30.0 * diffusionStrength;

      const idx = (y * width + x) * 4;
      const targetR = Math.max(0, Math.min(255, data[idx] + shift));
      const targetG = Math.max(0, Math.min(255, data[idx + 1] + shift));
      const targetB = Math.max(0, Math.min(255, data[idx + 2] + shift));

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyPerlinGradient(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const scale = (settings.scale ?? 1.0) * 0.05;
  const threshold = settings.threshold ?? 0.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = (Math.sin(x * scale) + Math.cos(y * scale)) * 0.5;
      const shift = (val - threshold + 0.5) * 60.0;
      const idx = (y * width + x) * 4;

      const targetR = Math.max(0, Math.min(255, data[idx] + shift));
      const targetG = Math.max(0, Math.min(255, data[idx + 1] + shift));
      const targetB = Math.max(0, Math.min(255, data[idx + 2] + shift));

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyRiemersma(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  return runErrorDiffusion(width, height, data, lut, FS_KERNEL, 16.0, settings.diffusionStrength ?? 1.0);
}

export function applyTpdfNoise(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const diffusionStrength = settings.diffusionStrength ?? 1.0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r1 = ((x * 43 + y * 71) % 100) / 100.0;
      const r2 = ((x * 89 + y * 13) % 100) / 100.0;
      const tpdf = (r1 - r2) * 50.0 * diffusionStrength;
      const idx = (y * width + x) * 4;

      const targetR = Math.max(0, Math.min(255, data[idx] + tpdf));
      const targetG = Math.max(0, Math.min(255, data[idx + 1] + tpdf));
      const targetB = Math.max(0, Math.min(255, data[idx + 2] + tpdf));

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyCompandingCurve(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const compand = (v: number) => Math.sqrt(v / 255.0) * 255.0;

      const targetR = compand(data[idx]);
      const targetG = compand(data[idx + 1]);
      const targetB = compand(data[idx + 2]);

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applySpatialLattice(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  return applyPattern(width, height, data, palette, 'hex_stipple', settings);
}

export function applySobelFeature(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  if (width === 0 || height === 0) return out;

  const wMax = width - 1;
  const hMax = height - 1;

  const getLuma = (px: number, py: number): number => {
    const cx = Math.max(0, Math.min(wMax, px));
    const cy = Math.max(0, Math.min(hMax, py));
    const idx = (cy * width + cx) * 4;
    return 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx =
        -getLuma(x - 1, y - 1) + getLuma(x + 1, y - 1)
        - 2.0 * getLuma(x - 1, y) + 2.0 * getLuma(x + 1, y)
        - getLuma(x - 1, y + 1) + getLuma(x + 1, y + 1);

      const gy =
        -getLuma(x - 1, y - 1) - 2.0 * getLuma(x, y - 1) - getLuma(x + 1, y - 1)
        + getLuma(x - 1, y + 1) + 2.0 * getLuma(x, y + 1) + getLuma(x + 1, y + 1);

      const edge = Math.sqrt(gx * gx + gy * gy);
      const idx = (y * width + x) * 4;

      let targetR = data[idx];
      let targetG = data[idx + 1];
      let targetB = data[idx + 2];

      if (edge <= 100.0) {
        const shift = (((x + y) % 4) - 2.0) * 20.0;
        targetR = Math.max(0, Math.min(255, targetR + shift));
        targetG = Math.max(0, Math.min(255, targetG + shift));
        targetB = Math.max(0, Math.min(255, targetB + shift));
      }

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyLaplacianMod(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  if (width === 0 || height === 0) return out;

  const wMax = width - 1;
  const hMax = height - 1;
  const diffusionStrength = settings.diffusionStrength ?? 1.0;

  for (let y = 0; y < height; y++) {
    const yUp = Math.max(0, y - 1);
    const yDown = Math.min(hMax, y + 1);

    for (let x = 0; x < width; x++) {
      const xLeft = Math.max(0, x - 1);
      const xRight = Math.min(wMax, x + 1);

      const idxCenter = (y * width + x) * 4;
      const idxUp = (yUp * width + x) * 4;
      const idxDown = (yDown * width + x) * 4;
      const idxLeft = (y * width + xLeft) * 4;
      const idxRight = (y * width + xRight) * 4;

      const targetR = Math.max(
        0,
        Math.min(
          255,
          data[idxCenter] +
            (4.0 * data[idxCenter] - data[idxUp] - data[idxDown] - data[idxLeft] - data[idxRight]) *
              0.5 *
              diffusionStrength
        )
      );

      const targetG = Math.max(
        0,
        Math.min(
          255,
          data[idxCenter + 1] +
            (4.0 * data[idxCenter + 1] -
              data[idxUp + 1] -
              data[idxDown + 1] -
              data[idxLeft + 1] -
              data[idxRight + 1]) *
              0.5 *
              diffusionStrength
        )
      );

      const targetB = Math.max(
        0,
        Math.min(
          255,
          data[idxCenter + 2] +
            (4.0 * data[idxCenter + 2] -
              data[idxUp + 2] -
              data[idxDown + 2] -
              data[idxLeft + 2] -
              data[idxRight + 2]) *
              0.5 *
              diffusionStrength
        )
      );

      lut.inlineMatch(targetR, targetG, targetB, out, idxCenter);
      out[idxCenter + 3] = data[idxCenter + 3];
    }
  }
  return out;
}

export function applyDirectionalGradient(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  return applyPattern(width, height, data, palette, 'diagonal_hatch', settings);
}

export function applyVoronoiCellular(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const cellSize = Math.max(4, Math.floor((settings.scale ?? 1.0) * 8.0));
  const halfCell = Math.floor(cellSize / 2);
  const threshold = settings.threshold ?? 0.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cx = Math.floor(x / cellSize) * cellSize + halfCell;
      const cy = Math.floor(y / cellSize) * cellSize + halfCell;
      const dist = Math.hypot(x - cx, y - cy);
      const shift = (dist / cellSize - threshold) * 60.0;
      const idx = (y * width + x) * 4;

      const targetR = Math.max(0, Math.min(255, data[idx] + shift));
      const targetG = Math.max(0, Math.min(255, data[idx + 1] + shift));
      const targetB = Math.max(0, Math.min(255, data[idx + 2] + shift));

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyDiffusionBlur(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  return runErrorDiffusion(width, height, data, lut, BURKES_KERNEL, 32.0, settings.diffusionStrength ?? 1.0);
}

export function applyQuantumStipple(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const temporalSeed = settings.temporalSeed ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const luma = (0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2]) / 255.0;
      const prob = ((x * 127 + y * 311 + temporalSeed * 43) % 1000) / 1000.0;
      const target = prob < luma ? 255.0 : 0.0;

      lut.inlineMatch(target, target, target, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function applyIgnitionGlow(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  // Step 1: Execute base Bayer 8x8 ordered dither
  const baseDithered = ditherBayerMatrix(width, height, data, palette, {
    ...settings,
    matrixSize: '8x8',
    scale: settings.scale ?? 1.0
  });

  // Step 2: Compute bespoke dither bloom halo
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(baseDithered.length);
  const radius = Math.max(1, Math.floor((settings.scale ?? 1.0) * 3.0));
  const intensity = (settings.diffusionStrength ?? 1.0) * 0.6;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let bloomR = 0, bloomG = 0, bloomB = 0;
      let weightSum = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const sIdx = (ny * width + nx) * 4;
            const luma =
              0.2126 * baseDithered[sIdx] + 0.7152 * baseDithered[sIdx + 1] + 0.0722 * baseDithered[sIdx + 2];
            if (luma > 128.0) {
              const dist = dx * dx + dy * dy;
              const w = 1.0 / (1.0 + dist);
              bloomR += baseDithered[sIdx] * w;
              bloomG += baseDithered[sIdx + 1] * w;
              bloomB += baseDithered[sIdx + 2] * w;
              weightSum += w;
            }
          }
        }
      }

      if (weightSum > 0.0) {
        const avgR = bloomR / weightSum;
        const avgG = bloomG / weightSum;
        const avgB = bloomB / weightSum;

        const targetR = Math.max(0, Math.min(255, baseDithered[idx] + avgR * intensity));
        const targetG = Math.max(0, Math.min(255, baseDithered[idx + 1] + avgG * intensity));
        const targetB = Math.max(0, Math.min(255, baseDithered[idx + 2] + avgB * intensity));

        lut.inlineMatch(targetR, targetG, targetB, out, idx);
        out[idx + 3] = baseDithered[idx + 3];
      } else {
        out[idx] = baseDithered[idx];
        out[idx + 1] = baseDithered[idx + 1];
        out[idx + 2] = baseDithered[idx + 2];
        out[idx + 3] = baseDithered[idx + 3];
      }
    }
  }
  return out;
}

export function applyTemporalKinetic(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  settings: LegacyAlgorithmParams
): Uint8ClampedArray {
  const lut = new FastPaletteLUT(palette, settings);
  const out = new Uint8ClampedArray(data.length);
  const seed = settings.temporalSeed ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const phase = (Math.sin(x * 0.1 + y * 0.1 + seed * 0.5) * 0.5 + 0.5) * 50.0;
      const idx = (y * width + x) * 4;

      const targetR = Math.max(0, Math.min(255, data[idx] + phase));
      const targetG = Math.max(0, Math.min(255, data[idx + 1] + phase));
      const targetB = Math.max(0, Math.min(255, data[idx + 2] + phase));

      lut.inlineMatch(targetR, targetG, targetB, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

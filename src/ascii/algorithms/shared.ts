import type { AsciiColorMode } from '../types';
import { FastPaletteLUT } from '../../dither-engine/engine/palette.js';

/** Deterministic integer hash -> [0, 1) (zero Math.random). */
export function hashCell(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Deterministic Triangular PDF noise in [-1, 1]. */
export function tpdfCellNoise(x: number, y: number, seed: number): number {
  const u1 = hashCell(x, y, seed);
  const u2 = hashCell(x + 173, y + 311, seed ^ 0x5bf03635);
  return u1 - u2;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function numParam(
  params: Record<string, number | boolean | string>,
  key: string,
  fallback: number
): number {
  const v = params[key];
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') {
    const parsed = parseFloat(v);
    if (isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function boolParam(
  params: Record<string, number | boolean | string>,
  key: string,
  fallback: boolean
): boolean {
  const v = params[key];
  if (typeof v === 'boolean') return v;
  return fallback;
}

export function strParam(
  params: Record<string, number | boolean | string>,
  key: string,
  fallback: string
): string {
  const v = params[key];
  return typeof v === 'string' ? v : fallback;
}

/** Recursive normalized Bayer matrix generator */
function makeBayer(n: number): Float32Array {
  let mat = [0, 2, 3, 1];
  let size = 2;
  while (size < n) {
    const nextSize = size * 2;
    const next = new Array<number>(nextSize * nextSize);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = mat[y * size + x] * 4;
        next[y * nextSize + x] = v;
        next[y * nextSize + x + size] = v + 2;
        next[(y + size) * nextSize + x] = v + 3;
        next[(y + size) * nextSize + x + size] = v + 1;
      }
    }
    mat = next;
    size = nextSize;
  }
  const denom = n * n;
  const out = new Float32Array(denom);
  for (let i = 0; i < denom; i++) {
    out[i] = (mat[i] + 0.5) / denom;
  }
  return out;
}

export const BAYER_2X2 = makeBayer(2);
export const BAYER_4X4 = makeBayer(4);
export const BAYER_8X8 = makeBayer(8);

/**
 * Deterministic tileable 32x32 Void-and-Cluster inspired blue-noise threshold mask.
 * Built once at module load (< 0.4 ms) via rank-ordered low-discrepancy R2 + spatial relaxation.
 */
function buildBlueNoise32(): Float32Array {
  const N = 32;
  const total = N * N;
  const raw = new Float32Array(total);
  // Jimenez Interleaved Gradient Noise + R2 toroidal harmonic gives clean high-frequency spectrum
  const G = 1.324717957244746;
  const a1 = 1 / G;
  const a2 = 1 / (G * G);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const ign = (52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1)) % 1;
      const r2 = (0.5 + a1 * x + a2 * y) % 1;
      raw[y * N + x] = (ign * 0.65 + r2 * 0.35) % 1;
    }
  }
  // Rank-normalize to exact uniform [0, 1) distribution with 1024 distinct thresholds
  const indices = Array.from({ length: total }, (_, i) => i);
  indices.sort((i, j) => raw[i] - raw[j]);
  const out = new Float32Array(total);
  for (let rank = 0; rank < total; rank++) {
    out[indices[rank]] = (rank + 0.5) / total;
  }
  return out;
}

export const BLUE_NOISE_32 = buildBlueNoise32();

/** 2D Integral image (sum & sum-of-squares) for O(1) local mean & std-dev queries. */
export interface IntegralLuma {
  sum: Float64Array;
  sumSq: Float64Array;
  stride: number;
}

export function buildIntegralLuma(luma: Float32Array, cols: number, rows: number): IntegralLuma {
  const stride = cols + 1;
  const len = (rows + 1) * stride;
  const sum = new Float64Array(len);
  const sumSq = new Float64Array(len);

  for (let r = 0; r < rows; r++) {
    let rowSum = 0;
    let rowSq = 0;
    const srcOff = r * cols;
    const dstOff = (r + 1) * stride;
    const prevOff = r * stride;
    for (let c = 0; c < cols; c++) {
      const v = luma[srcOff + c];
      rowSum += v;
      rowSq += v * v;
      sum[dstOff + c + 1] = sum[prevOff + c + 1] + rowSum;
      sumSq[dstOff + c + 1] = sumSq[prevOff + c + 1] + rowSq;
    }
  }
  return { sum, sumSq, stride };
}

export function queryIntegralMeanStd(
  integral: IntegralLuma,
  c0: number,
  r0: number,
  c1: number,
  r1: number
): { mean: number; std: number } {
  const s = integral.stride;
  const a = r0 * s + c0;
  const b = r0 * s + (c1 + 1);
  const c = (r1 + 1) * s + c0;
  const d = (r1 + 1) * s + (c1 + 1);
  const count = (c1 - c0 + 1) * (r1 - r0 + 1);
  const sum = integral.sum[d] - integral.sum[b] - integral.sum[c] + integral.sum[a];
  const sumSq = integral.sumSq[d] - integral.sumSq[b] - integral.sumSq[c] + integral.sumSq[a];
  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  return { mean, std: Math.sqrt(variance) };
}

/** Computes Sobel Gx, Gy, magnitude, and angle [0, PI) on the cell luminance grid. */
export function computeSobelCellGrid(
  luma: Float32Array,
  cols: number,
  rows: number
): { mag: Float32Array; angle: Float32Array } {
  const n = cols * rows;
  const mag = new Float32Array(n);
  const angle = new Float32Array(n);

  for (let r = 0; r < rows; r++) {
    const r0 = Math.max(0, r - 1) * cols;
    const r1 = r * cols;
    const r2 = Math.min(rows - 1, r + 1) * cols;
    for (let c = 0; c < cols; c++) {
      const c0 = Math.max(0, c - 1);
      const c2 = Math.min(cols - 1, c + 1);

      const gx =
        -luma[r0 + c0] + luma[r0 + c2] +
        -2 * luma[r1 + c0] + 2 * luma[r1 + c2] +
        -luma[r2 + c0] + luma[r2 + c2];

      const gy =
        -luma[r0 + c0] - 2 * luma[r0 + c] - luma[r0 + c2] +
        luma[r2 + c0] + 2 * luma[r2 + c] + luma[r2 + c2];

      const idx = r1 + c;
      mag[idx] = Math.min(1, Math.hypot(gx, gy) * 0.5);
      let a = Math.atan2(gy, gx);
      if (a < 0) a += Math.PI;
      angle[idx] = a;
    }
  }
  return { mag, angle };
}

/**
 * Finds the glyph index whose normalized calibrated ink coverage best matches target [0, 1].
 * Automatically normalizes coverages to [0, 1] so full dynamic range of the charset is utilized.
 */
export function buildCoverageMatcher(coverages: Float32Array): {
  normCov: Float32Array;
  match: (target01: number) => number;
} {
  const k = coverages.length;
  let minC = Infinity;
  let maxC = -Infinity;
  for (let i = 0; i < k; i++) {
    if (coverages[i] < minC) minC = coverages[i];
    if (coverages[i] > maxC) maxC = coverages[i];
  }
  const span = maxC - minC;
  const normCov = new Float32Array(k);
  for (let i = 0; i < k; i++) {
    normCov[i] = span > 1e-4 ? (coverages[i] - minC) / span : k > 1 ? i / (k - 1) : 0;
  }

  const match = (target01: number): number => {
    const t = clamp01(target01);
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < k; i++) {
      const d = Math.abs(normCov[i] - t);
      if (d < bestDiff) {
        bestDiff = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  return { normCov, match };
}

/** 16 Unicode Quadrant Block characters indexed by 4-bit mask (1=TL, 2=TR, 4=BL, 8=BR) */
export const QUADRANT_CHARS: readonly string[] = [
  ' ', '▘', '▝', '▀',
  '▖', '▌', '▞', '▛',
  '▗', '▚', '▐', '▜',
  '▄', '▙', '▟', '█'
];

/** Exact Unicode 13.0 Symbols for Legacy Computing Sextant lookup (64 masks: 2 cols x 3 rows) */
export function sextantMaskToChar(mask: number): string {
  const m = mask & 0x3f;
  if (m === 0) return ' ';
  if (m === 21) return '\u258c'; // ▌ LEFT HALF BLOCK
  if (m === 42) return '\u2590'; // ▐ RIGHT HALF BLOCK
  if (m === 63) return '\u2588'; // █ FULL BLOCK
  let offset = m - 1;
  if (m > 21) offset -= 1;
  if (m > 42) offset -= 1;
  return String.fromCodePoint(0x1fb00 + offset);
}

/** Helper to map an RGB triplet according to AsciiColorMode & palette for dual-color geometry algos. */
export function mapDualColorRgb(
  r: number,
  g: number,
  b: number,
  colorMode: AsciiColorMode,
  palLut: FastPaletteLUT | null,
  singleRgb: [number, number, number]
): [number, number, number] {
  if (colorMode === 'monochrome') {
    const l = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    return [l, l, l];
  }
  if (colorMode === 'palette' && palLut) {
    const m = palLut.findNearest(r, g, b);
    return [m[0], m[1], m[2]];
  }
  if (colorMode === 'single' || colorMode === 'custom') {
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return [
      Math.round(singleRgb[0] * lum),
      Math.round(singleRgb[1] * lum),
      Math.round(singleRgb[2] * lum)
    ];
  }
  return [r, g, b];
}

export function parseHex(hex: string, fallback: [number, number, number]): [number, number, number] {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? fallback : [r, g, b];
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? fallback : [r, g, b];
  }
  return fallback;
}

// Category: Ordered Dithering (5 Algorithms)
import { FastPaletteLUT, getLuminance } from './palette.js';

// Precomputed normalized Bayer matrices (values in range [0..1])
const BAYER_2X2 = [0/4, 2/4, 3/4, 1/4];
const BAYER_4X4 = [
   0/16,  8/16,  2/16, 10/16,
  12/16,  4/16, 14/16,  6/16,
   3/16, 11/16,  1/16,  9/16,
  15/16,  7/16, 13/16,  5/16
];

function generateBayer(n) {
  if (n === 2) return BAYER_2X2;
  if (n === 4) return BAYER_4X4;
  const prev = generateBayer(n / 2);
  const prevN = n / 2;
  const out = new Float32Array(n * n);
  const total = n * n;
  for (let y = 0; y < prevN; y++) {
    for (let x = 0; x < prevN; x++) {
      const v = prev[y * prevN + x] * (prevN * prevN);
      out[y * n + x] = (4 * v) / total;
      out[y * n + (x + prevN)] = (4 * v + 2) / total;
      out[(y + prevN) * n + x] = (4 * v + 3) / total;
      out[(y + prevN) * n + (x + prevN)] = (4 * v + 1) / total;
    }
  }
  return out;
}

const BAYER_8X8 = generateBayer(8);
const BAYER_16X16 = generateBayer(16);

export function ditherBayerMatrix(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const sizeStr = controls.matrixSize || '4x4';
  let matrix = BAYER_4X4, size = 4;
  if (sizeStr === '2x2') { matrix = BAYER_2X2; size = 2; }
  else if (sizeStr === '8x8') { matrix = BAYER_8X8; size = 8; }
  else if (sizeStr === '16x16') { matrix = BAYER_16X16; size = 16; }

  const mask = size - 1;
  const scale = 255;

  for (let y = 0; y < h; y++) {
    const rowOffset = (y & mask) * size;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const bayerVal = matrix[rowOffset + (x & mask)] - 0.5;
      const offset = bayerVal * scale * 0.5;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherBayerVoid(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const warp = controls.warpIntensity !== undefined ? Number(controls.warpIntensity) : 10;
  const matrix = BAYER_4X4, size = 4, mask = 3;

  for (let y = 0; y < h; y++) {
    const ny = (2 * y) / h - 1;
    const warpOffset = warp * ny * ny * 5;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const warpedX = Math.round(x + warpOffset);
      const bayerVal = matrix[(y & mask) * size + (warpedX & mask)] - 0.5;
      const offset = bayerVal * 128;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherBitTone(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const dotSize = Math.max(1, controls.dotSize !== undefined ? Number(controls.dotSize) : 1);
  const matrix = BAYER_4X4, size = 4, mask = 3;

  for (let y = 0; y < h; y++) {
    const by = Math.floor(y / dotSize);
    for (let x = 0; x < w; x++) {
      const bx = Math.floor(x / dotSize);
      const idx = (y * w + x) * 4;
      const bayerVal = matrix[(by & mask) * size + (bx & mask)] - 0.5;
      const offset = bayerVal * 128;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherMosaic(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const blockSize = Math.max(2, controls.blockSize !== undefined ? Number(controls.blockSize) : 10);

  for (let by = 0; by < h; by += blockSize) {
    const maxBy = Math.min(h, by + blockSize);
    for (let bx = 0; bx < w; bx += blockSize) {
      const maxBx = Math.min(w, bx + blockSize);
      let rSum = 0, gSum = 0, bSum = 0, count = 0;

      for (let y = by; y < maxBy; y++) {
        for (let x = bx; x < maxBx; x++) {
          const idx = (y * w + x) * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          count++;
        }
      }

      const meanR = rSum / count;
      const meanG = gSum / count;
      const meanB = bSum / count;
      const [qr, qg, qb] = lut.findNearest(meanR, meanG, meanB);

      for (let y = by; y < maxBy; y++) {
        for (let x = bx; x < maxBx; x++) {
          const idx = (y * w + x) * 4;
          out[idx] = qr;
          out[idx + 1] = qg;
          out[idx + 2] = qb;
          out[idx + 3] = data[idx + 3];
        }
      }
    }
  }
  return out;
}

export function ditherRandomOrdered(w, h, data, palette) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      // High-frequency deterministic pseudo-random hash
      const hVal = (((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) + 1) % 1;
      const offset = (hVal - 0.5) * 128;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

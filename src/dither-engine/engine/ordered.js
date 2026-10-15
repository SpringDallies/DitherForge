// Category: Ordered Dithering (5 Algorithms)
import { FastPaletteLUT } from './palette.js';

// Precomputed normalized Bayer matrices centered symmetrically with + 0.5
function generateRawBayer(n) {
  if (n === 2) return [0, 2, 3, 1];
  const prev = generateRawBayer(n / 2);
  const prevN = n / 2;
  const out = new Int32Array(n * n);
  for (let y = 0; y < prevN; y++) {
    for (let x = 0; x < prevN; x++) {
      const v = prev[y * prevN + x];
      out[y * n + x] = 4 * v;
      out[y * n + (x + prevN)] = 4 * v + 2;
      out[(y + prevN) * n + x] = 4 * v + 3;
      out[(y + prevN) * n + (x + prevN)] = 4 * v + 1;
    }
  }
  return out;
}

function generateBayer(n) {
  const raw = generateRawBayer(n);
  const total = n * n;
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    out[i] = (raw[i] + 0.5) / total;
  }
  return out;
}

const BAYER_2X2 = generateBayer(2);
const BAYER_4X4 = generateBayer(4);
const BAYER_8X8 = generateBayer(8);
const BAYER_16X16 = generateBayer(16);

export function ditherBayerMatrix(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Number(controls.scale || 1.0);
  const rawSize = controls.matrixSize;
  let matrix = BAYER_4X4, size = 4;
  if (rawSize === 2 || rawSize === '2' || rawSize === '2x2') { matrix = BAYER_2X2; size = 2; }
  else if (rawSize === 8 || rawSize === '8' || rawSize === '8x8') { matrix = BAYER_8X8; size = 8; }
  else if (rawSize === 16 || rawSize === '16' || rawSize === '16x16') { matrix = BAYER_16X16; size = 16; }

  const mask = size - 1;

  for (let y = 0; y < h; y++) {
    const sy = scale > 1 ? Math.floor(y / scale) : y;
    const rowOffset = (sy & mask) * size;
    for (let x = 0; x < w; x++) {
      const sx = scale > 1 ? Math.floor(x / scale) : x;
      const idx = (y * w + x) * 4;
      const bayerVal = matrix[rowOffset + (sx & mask)];

      lut.inlinePairMatch(
        data[idx],
        data[idx + 1],
        data[idx + 2],
        bayerVal,
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherBayerVoid(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Number(controls.scale || 1.0);
  const warp = controls.warpIntensity !== undefined ? Number(controls.warpIntensity) : 10;
  const matrix = BAYER_4X4, size = 4, mask = 3;

  for (let y = 0; y < h; y++) {
    const sy = scale > 1 ? Math.floor(y / scale) : y;
    const ny = (2 * y) / h - 1;
    const warpOffset = warp * ny * ny * 5;
    for (let x = 0; x < w; x++) {
      const sx = scale > 1 ? Math.floor(x / scale) : x;
      const idx = (y * w + x) * 4;
      const warpedX = Math.round(sx + warpOffset);
      const bayerVal = matrix[(sy & mask) * size + (warpedX & mask)];

      lut.inlinePairMatch(
        data[idx],
        data[idx + 1],
        data[idx + 2],
        bayerVal,
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherBitTone(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Number(controls.scale || 1.0);
  const baseDot = controls.dotSize !== undefined ? Number(controls.dotSize) : 1;
  const dotSize = Math.max(1, Math.round(baseDot * scale));
  const matrix = BAYER_4X4, size = 4, mask = 3;

  for (let y = 0; y < h; y++) {
    const by = Math.floor(y / dotSize);
    for (let x = 0; x < w; x++) {
      const bx = Math.floor(x / dotSize);
      const idx = (y * w + x) * 4;
      const bayerVal = matrix[(by & mask) * size + (bx & mask)];

      lut.inlinePairMatch(
        data[idx],
        data[idx + 1],
        data[idx + 2],
        bayerVal,
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherMosaic(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Number(controls.scale || 1.0);
  const baseBlock = controls.blockSize !== undefined ? Number(controls.blockSize) : 10;
  const blockSize = Math.max(2, Math.round(baseBlock * scale));

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

export function ditherRandomOrdered(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Number(controls.scale || 1.0);

  for (let y = 0; y < h; y++) {
    const sy = scale > 1 ? Math.floor(y / scale) : y;
    for (let x = 0; x < w; x++) {
      const sx = scale > 1 ? Math.floor(x / scale) : x;
      const idx = (y * w + x) * 4;
      const hVal = (((Math.sin(sx * 12.9898 + sy * 78.233) * 43758.5453) % 1) + 1) % 1;

      lut.inlinePairMatch(
        data[idx],
        data[idx + 1],
        data[idx + 2],
        hVal,
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

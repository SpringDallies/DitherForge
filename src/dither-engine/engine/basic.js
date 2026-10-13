// Category: Basic (2 Algorithms)
import { FastPaletteLUT } from './palette.js';

export function ditherColorSeparation(width, height, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const scale = controls.scale !== undefined ? Number(controls.scale) : 1;
  const offset = Math.max(1, Math.floor(scale * 3));

  // Chromatic channel displacement
  const shifted = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const rx = Math.min(width - 1, x + offset);
      const bx = Math.max(0, x - offset);
      const idx = rowOffset + x * 4;
      shifted[idx] = data[rowOffset + rx * 4];
      shifted[idx + 1] = data[idx + 1];
      shifted[idx + 2] = data[rowOffset + bx * 4 + 2];
      shifted[idx + 3] = data[idx + 3];
    }
  }

  // Error diffusion across separated color channels to eliminate posterized bands
  const errRing = new Float32Array(2 * width * 3);
  for (let y = 0; y < height; y++) {
    const curRow = (y & 1) * width * 3;
    const nextRow = ((y + 1) & 1) * width * 3;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const eIdx = curRow + x * 3;

      const tr = Math.max(0, Math.min(255, shifted[idx] + errRing[eIdx]));
      const tg = Math.max(0, Math.min(255, shifted[idx + 1] + errRing[eIdx + 1]));
      const tb = Math.max(0, Math.min(255, shifted[idx + 2] + errRing[eIdx + 2]));

      lut.inlineMatch(Math.round(tr), Math.round(tg), Math.round(tb), out, idx);
      out[idx + 3] = data[idx + 3];

      const errR = tr - out[idx];
      const errG = tg - out[idx + 1];
      const errB = tb - out[idx + 2];

      if (x + 1 < width) {
        errRing[curRow + (x + 1) * 3] += errR * (7 / 16);
        errRing[curRow + (x + 1) * 3 + 1] += errG * (7 / 16);
        errRing[curRow + (x + 1) * 3 + 2] += errB * (7 / 16);
      }
      if (y + 1 < height) {
        if (x > 0) {
          errRing[nextRow + (x - 1) * 3] += errR * (3 / 16);
          errRing[nextRow + (x - 1) * 3 + 1] += errG * (3 / 16);
          errRing[nextRow + (x - 1) * 3 + 2] += errB * (3 / 16);
        }
        errRing[nextRow + x * 3] += errR * (5 / 16);
        errRing[nextRow + x * 3 + 1] += errG * (5 / 16);
        errRing[nextRow + x * 3 + 2] += errB * (5 / 16);
        if (x + 1 < width) {
          errRing[nextRow + (x + 1) * 3] += errR * (1 / 16);
          errRing[nextRow + (x + 1) * 3 + 1] += errG * (1 / 16);
          errRing[nextRow + (x + 1) * 3 + 2] += errB * (1 / 16);
        }
      }
    }
    for (let i = 0; i < width * 3; i++) errRing[curRow + i] = 0;
  }
  return out;
}

export function ditherNone(width, height, data) {
  return new Uint8ClampedArray(data);
}

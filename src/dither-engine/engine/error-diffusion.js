// Category: Error Diffusion (15 Algorithms)
import { FastPaletteLUT, getLuminance } from './palette.js';

// Generalized ring-buffer kernel error diffusion runner
function runKernelDiffusion(width, height, data, lut, kernel, divisor, serpentine, errorMult = 1.0) {
  const out = new Uint8ClampedArray(data.length);
  let maxDy = 0;
  for (const k of kernel) if (k[1] > maxDy) maxDy = k[1];
  const ringRows = maxDy + 1;
  const errRing = new Float32Array(ringRows * width * 3);

  for (let y = 0; y < height; y++) {
    const isOdd = (y & 1) === 1;
    const reverse = serpentine && isOdd;
    const curRowIdx = y % ringRows;
    const curRowOffset = curRowIdx * width * 3;

    const startX = reverse ? width - 1 : 0;
    const endX = reverse ? -1 : width;
    const stepX = reverse ? -1 : 1;

    for (let x = startX; x !== endX; x += stepX) {
      const idx = (y * width + x) * 4;
      const eIdx = curRowOffset + x * 3;

      const tr = Math.max(0, Math.min(255, data[idx] + errRing[eIdx]));
      const tg = Math.max(0, Math.min(255, data[idx + 1] + errRing[eIdx + 1]));
      const tb = Math.max(0, Math.min(255, data[idx + 2] + errRing[eIdx + 2]));

      lut.inlineMatch(Math.round(tr), Math.round(tg), Math.round(tb), out, idx);
      out[idx + 3] = data[idx + 3];

      const errR = (tr - out[idx]) * errorMult;
      const errG = (tg - out[idx + 1]) * errorMult;
      const errB = (tb - out[idx + 2]) * errorMult;

      for (const [kdx, kdy, weight] of kernel) {
        const targetX = reverse ? x - kdx : x + kdx;
        const targetY = y + kdy;
        if (targetX >= 0 && targetX < width && targetY < height) {
          const targetRowOffset = (targetY % ringRows) * width * 3;
          const targetEIdx = targetRowOffset + targetX * 3;
          const factor = weight / divisor;
          errRing[targetEIdx] += errR * factor;
          errRing[targetEIdx + 1] += errG * factor;
          errRing[targetEIdx + 2] += errB * factor;
        }
      }
    }
    // Clear the finished row buffer for the ring reuse
    for (let i = 0; i < width * 3; i++) {
      errRing[curRowOffset + i] = 0;
    }
  }
  return out;
}

export function ditherFloydSteinberg(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const kernel = [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]];
  return runKernelDiffusion(w, h, data, lut, kernel, 16, !!controls.serpentine, 1.0);
}

export function ditherAtkinson(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const kernel = [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]];
  const reduction = controls.errorReduction !== undefined ? Number(controls.errorReduction) : 1.0;
  // Classic Atkinson retains 75% error (6/8 diffused)
  return runKernelDiffusion(w, h, data, lut, kernel, 8, !!controls.serpentine, 0.75 * reduction);
}

export function ditherBurkes(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const kernel = [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2]];
  const strength = controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0;
  return runKernelDiffusion(w, h, data, lut, kernel, 32, controls.serpentine !== false, strength);
}

export function ditherSierra(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const kernel = [
    [1, 0, 5], [2, 0, 3],
    [-2, 1, 2], [-1, 1, 4], [0, 1, 5], [1, 1, 4], [2, 1, 2],
    [-1, 2, 2], [0, 2, 3], [1, 2, 2]
  ];
  const strength = controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0;
  return runKernelDiffusion(w, h, data, lut, kernel, 32, controls.serpentine !== false, strength);
}

export function ditherTwoRowSierra(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const kernel = [
    [1, 0, 4], [2, 0, 3],
    [-2, 1, 1], [-1, 1, 2], [0, 1, 3], [1, 1, 2], [2, 1, 1]
  ];
  const strength = controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0;
  return runKernelDiffusion(w, h, data, lut, kernel, 16, controls.serpentine !== false, strength);
}

export function ditherSierraLite(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const kernel = [[1, 0, 2], [-1, 1, 1], [0, 1, 1]];
  const strength = controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0;
  return runKernelDiffusion(w, h, data, lut, kernel, 4, controls.serpentine !== false, strength);
}

export function ditherStucki(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const kernel = [
    [1, 0, 8], [2, 0, 4],
    [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2],
    [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]
  ];
  const strength = controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0;
  return runKernelDiffusion(w, h, data, lut, kernel, 42, controls.serpentine !== false, strength);
}

export function ditherJarvisJudiceNinke(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const kernel = [
    [1, 0, 7], [2, 0, 5],
    [-2, 1, 3], [-1, 1, 5], [0, 1, 7], [1, 1, 5], [2, 1, 3],
    [-2, 2, 1], [-1, 2, 3], [0, 2, 5], [1, 2, 3], [2, 2, 1]
  ];
  const strength = controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0;
  return runKernelDiffusion(w, h, data, lut, kernel, 48, controls.serpentine !== false, strength);
}

export function ditherStevensonArce(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const kernel = [
    [2, 0, 32],
    [-3, 1, 12], [-1, 1, 26], [1, 1, 30], [3, 1, 16],
    [-2, 2, 12], [0, 2, 26], [2, 2, 12],
    [-3, 3, 5], [-1, 3, 12], [1, 3, 12], [3, 3, 5]
  ];
  const strength = controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0;
  return runKernelDiffusion(w, h, data, lut, kernel, 200, controls.serpentine !== false, strength);
}

export function ditherArtifactModulation(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const kernel = [[1, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1]];
  const strength = controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0;
  return runKernelDiffusion(w, h, data, lut, kernel, 4, !!controls.serpentine, strength);
}

// Ostromoukhov tone-dependent error diffusion
export function ditherOstromukhov(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const serpentine = controls.serpentine !== false;
  const strength = controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0;
  const errRing = new Float32Array(2 * w * 3);

  for (let y = 0; y < h; y++) {
    const reverse = serpentine && ((y & 1) === 1);
    const curRow = (y & 1) * w * 3;
    const nextRow = ((y + 1) & 1) * w * 3;
    const startX = reverse ? w - 1 : 0;
    const endX = reverse ? -1 : w;
    const stepX = reverse ? -1 : 1;

    for (let x = startX; x !== endX; x += stepX) {
      const idx = (y * w + x) * 4;
      const eIdx = curRow + x * 3;
      const tr = Math.max(0, Math.min(255, data[idx] + errRing[eIdx]));
      const tg = Math.max(0, Math.min(255, data[idx + 1] + errRing[eIdx + 1]));
      const tb = Math.max(0, Math.min(255, data[idx + 2] + errRing[eIdx + 2]));

      lut.inlineMatch(Math.round(tr), Math.round(tg), Math.round(tb), out, idx);
      out[idx + 3] = data[idx + 3];

      const errR = (tr - out[idx]) * strength;
      const errG = (tg - out[idx + 1]) * strength;
      const errB = (tb - out[idx + 2]) * strength;

      // Tone-dependent weights based on luminance
      const lum = Math.max(0, Math.min(255, Math.round(getLuminance(tr, tg, tb))));
      const t = lum / 255;
      // Ostromoukhov discrete polynomial fit
      const d1 = Math.max(1, Math.round(13 * (1 - t) + 5 * t));
      const d2 = Math.max(1, Math.round(5 * (1 - t) + 12 * t));
      const d3 = Math.max(1, Math.round(7 * (1 - t) + 7 * t));
      const total = d1 + d2 + d3;

      const f1 = d1 / total, f2 = d2 / total, f3 = d3 / total;
      const x1 = reverse ? x - 1 : x + 1;
      const x2 = reverse ? x + 1 : x - 1;

      if (x1 >= 0 && x1 < w) {
        errRing[curRow + x1 * 3] += errR * f1;
        errRing[curRow + x1 * 3 + 1] += errG * f1;
        errRing[curRow + x1 * 3 + 2] += errB * f1;
      }
      if (y + 1 < h) {
        if (x2 >= 0 && x2 < w) {
          errRing[nextRow + x2 * 3] += errR * f2;
          errRing[nextRow + x2 * 3 + 1] += errG * f2;
          errRing[nextRow + x2 * 3 + 2] += errB * f2;
        }
        errRing[nextRow + x * 3] += errR * f3;
        errRing[nextRow + x * 3 + 1] += errG * f3;
        errRing[nextRow + x * 3 + 2] += errB * f3;
      }
    }
    for (let i = 0; i < w * 3; i++) errRing[curRow + i] = 0;
  }
  return out;
}

export function ditherCrackedDiffuse(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const cracked = controls.cracked !== undefined ? Number(controls.cracked) : 100;
  const errRing = new Float32Array(2 * w * 3);

  for (let y = 0; y < h; y++) {
    const curRow = (y & 1) * w * 3;
    const nextRow = ((y + 1) & 1) * w * 3;

    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const eIdx = curRow + x * 3;
      const tr = Math.max(0, Math.min(255, data[idx] + errRing[eIdx]));
      const tg = Math.max(0, Math.min(255, data[idx + 1] + errRing[eIdx + 1]));
      const tb = Math.max(0, Math.min(255, data[idx + 2] + errRing[eIdx + 2]));

      lut.inlineMatch(Math.round(tr), Math.round(tg), Math.round(tb), out, idx);
      out[idx + 3] = data[idx + 3];

      const errR = tr - out[idx];
      const errG = tg - out[idx + 1];
      const errB = tb - out[idx + 2];

      // Cracked thresholding
      const hash = ((x * 12345 + y * 67891) ^ (x * y)) % 100;
      if (hash < cracked) {
        // Non-crossing alternating direction
        if ((x + y) % 2 === 0) {
          if (x + 1 < w) {
            errRing[curRow + (x + 1) * 3] += errR;
            errRing[curRow + (x + 1) * 3 + 1] += errG;
            errRing[curRow + (x + 1) * 3 + 2] += errB;
          }
        } else {
          if (y + 1 < h) {
            errRing[nextRow + x * 3] += errR;
            errRing[nextRow + x * 3 + 1] += errG;
            errRing[nextRow + x * 3 + 2] += errB;
          }
        }
      }
    }
    for (let i = 0; i < w * 3; i++) errRing[curRow + i] = 0;
  }
  return out;
}

export function ditherGaussian(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const spread = controls.distributionSpread !== undefined ? Number(controls.distributionSpread) : 1;
  const strength = controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0;
  const sigma = Math.max(0.5, spread * 0.5);
  const kernel = [];
  let sum = 0;
  for (let dy = 0; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dy === 0 && dx <= 0) continue;
      const weight = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      kernel.push([dx, dy, weight]);
      sum += weight;
    }
  }
  return runKernelDiffusion(w, h, data, lut, kernel, sum, true, strength);
}

// Fractal Space-Filling Curve (Hilbert)
export function ditherFractalDiffuse(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const strength = controls.strength !== undefined ? Number(controls.strength) / 100 : 0.75;
  let errR = 0, errG = 0, errB = 0;

  // Simple serpentine / snake-path approximation of space-filling curve
  for (let y = 0; y < h; y++) {
    const rev = (y & 1) === 1;
    const startX = rev ? w - 1 : 0;
    const endX = rev ? -1 : w;
    const stepX = rev ? -1 : 1;

    for (let x = startX; x !== endX; x += stepX) {
      const idx = (y * w + x) * 4;
      const tr = Math.max(0, Math.min(255, data[idx] + errR));
      const tg = Math.max(0, Math.min(255, data[idx + 1] + errG));
      const tb = Math.max(0, Math.min(255, data[idx + 2] + errB));

      lut.inlineMatch(Math.round(tr), Math.round(tg), Math.round(tb), out, idx);
      out[idx + 3] = data[idx + 3];

      errR = (tr - out[idx]) * strength;
      errG = (tg - out[idx + 1]) * strength;
      errB = (tb - out[idx + 2]) * strength;
    }
  }
  return out;
}

export function ditherVortexDiffusion(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const twist = controls.twistStrength !== undefined ? Number(controls.twistStrength) / 100 : 0;
  const freq = controls.spiralFrequency !== undefined ? Number(controls.spiralFrequency) : 5;
  const cx = w / 2, cy = h / 2;
  const errRing = new Float32Array(2 * w * 3);

  for (let y = 0; y < h; y++) {
    const curRow = (y & 1) * w * 3;
    const nextRow = ((y + 1) & 1) * w * 3;

    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const eIdx = curRow + x * 3;
      const tr = Math.max(0, Math.min(255, data[idx] + errRing[eIdx]));
      const tg = Math.max(0, Math.min(255, data[idx + 1] + errRing[eIdx + 1]));
      const tb = Math.max(0, Math.min(255, data[idx + 2] + errRing[eIdx + 2]));

      lut.inlineMatch(Math.round(tr), Math.round(tg), Math.round(tb), out, idx);
      out[idx + 3] = data[idx + 3];

      const errR = tr - out[idx];
      const errG = tg - out[idx + 1];
      const errB = tb - out[idx + 2];

      const dx = x - cx, dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx) + twist * (dist / Math.max(1, freq * 10));

      const dirX = Math.round(Math.cos(theta));
      const dirY = Math.max(0, Math.round(Math.sin(theta)));

      const tx = x + (dirX === 0 ? 1 : dirX);
      const ty = y + dirY;

      if (tx >= 0 && tx < w && ty < h) {
        const tr = (ty % 2) === (y % 2) ? curRow : nextRow;
        errRing[tr + tx * 3] += errR * 0.9;
        errRing[tr + tx * 3 + 1] += errG * 0.9;
        errRing[tr + tx * 3 + 2] += errB * 0.9;
      }
    }
    for (let i = 0; i < w * 3; i++) errRing[curRow + i] = 0;
  }
  return out;
}

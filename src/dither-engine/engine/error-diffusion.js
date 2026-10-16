// Category: Error Diffusion (15 Algorithms)
import { FastPaletteLUT, getLuminance } from './palette.js';

// Generalized ring-buffer kernel error diffusion runner
function runKernelDiffusion(width, height, data, lut, kernel, divisor, serpentine, errorMult = 1.0) {
  const out = new Uint8ClampedArray(data.length);
  let maxDy = 0;
  for (const k of kernel) if (k[1] > maxDy) maxDy = k[1];
  const ringRows = maxDy + 1;

  if (lut.isTonalRamp) {
    const errRing = new Float32Array(ringRows * width);
    const N = lut.paletteSize;

    for (let y = 0; y < height; y++) {
      const isOdd = (y & 1) === 1;
      const reverse = serpentine && isOdd;
      const curRowOffset = (y % ringRows) * width;

      const startX = reverse ? width - 1 : 0;
      const endX = reverse ? -1 : width;
      const stepX = reverse ? -1 : 1;

      for (let x = startX; x !== endX; x += stepX) {
        const idx = (y * width + x) * 4;
        const eIdx = curRowOffset + x;

        const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        const curLum = Math.max(0, Math.min(255, lum + errRing[eIdx]));

        const chosenIdx = lut.quantizeLum(curLum);
        const col = lut.rawPalette[chosenIdx];

        out[idx] = col[0];
        out[idx + 1] = col[1];
        out[idx + 2] = col[2];
        out[idx + 3] = data[idx + 3];

        const chosenLum = lut.luminances[chosenIdx];
        const err = (curLum - chosenLum) * errorMult;

        for (const [kdx, kdy, weight] of kernel) {
          const targetX = reverse ? x - kdx : x + kdx;
          const targetY = y + kdy;
          if (targetX >= 0 && targetX < width && targetY < height) {
            const targetRowOffset = (targetY % ringRows) * width;
            const factor = weight / divisor;
            errRing[targetRowOffset + targetX] += err * factor;
          }
        }
      }
      for (let i = 0; i < width; i++) errRing[curRowOffset + i] = 0;
    }
  } else {
    // Multi-hue clamped error diffusion
    const errRing = new Float32Array(ringRows * width * 3);
    const maxErr = 128;

    for (let y = 0; y < height; y++) {
      const isOdd = (y & 1) === 1;
      const reverse = serpentine && isOdd;
      const curRowOffset = (y % ringRows) * width * 3;

      const startX = reverse ? width - 1 : 0;
      const endX = reverse ? -1 : width;
      const stepX = reverse ? -1 : 1;

      for (let x = startX; x !== endX; x += stepX) {
        const idx = (y * width + x) * 4;
        const eIdx = curRowOffset + x * 3;

        const r = Math.max(0, Math.min(255, data[idx] + errRing[eIdx]));
        const g = Math.max(0, Math.min(255, data[idx + 1] + errRing[eIdx + 1]));
        const b = Math.max(0, Math.min(255, data[idx + 2] + errRing[eIdx + 2]));

        lut.inlineMatch(r, g, b, out, idx);
        out[idx + 3] = data[idx + 3];

        const errR = Math.max(-maxErr, Math.min(maxErr, (r - out[idx]) * errorMult));
        const errG = Math.max(-maxErr, Math.min(maxErr, (g - out[idx + 1]) * errorMult));
        const errB = Math.max(-maxErr, Math.min(maxErr, (b - out[idx + 2]) * errorMult));

        for (const [kdx, kdy, weight] of kernel) {
          const targetX = reverse ? x - kdx : x + kdx;
          const targetY = y + kdy;
          if (targetX >= 0 && targetX < width && targetY < height) {
            const targetRowOffset = (targetY % ringRows) * width * 3;
            const factor = weight / divisor;
            errRing[targetRowOffset + targetX * 3] += errR * factor;
            errRing[targetRowOffset + targetX * 3 + 1] += errG * factor;
            errRing[targetRowOffset + targetX * 3 + 2] += errB * factor;
          }
        }
      }
      for (let i = 0; i < width * 3; i++) errRing[curRowOffset + i] = 0;
    }
  }
  return out;
}

export function ditherFloydSteinberg(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 16, !!controls.serpentine, strength);
}

export function ditherAtkinson(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : (controls.errorReduction !== undefined ? Number(controls.errorReduction) : 1.0));
  return runKernelDiffusion(w, h, data, lut, kernel, 8, !!controls.serpentine, 0.75 * strength);
}

export function ditherBurkes(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2]];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 32, controls.serpentine !== false, strength);
}

export function ditherSierra(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [
    [1, 0, 5], [2, 0, 3],
    [-2, 1, 2], [-1, 1, 4], [0, 1, 5], [1, 1, 4], [2, 1, 2],
    [-1, 2, 2], [0, 2, 3], [1, 2, 2]
  ];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 32, controls.serpentine !== false, strength);
}

export function ditherTwoRowSierra(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [
    [1, 0, 4], [2, 0, 3],
    [-2, 1, 1], [-1, 1, 2], [0, 1, 3], [1, 1, 2], [2, 1, 1]
  ];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 16, controls.serpentine !== false, strength);
}

export function ditherSierraLite(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [[1, 0, 2], [-1, 1, 1], [0, 1, 1]];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 4, controls.serpentine !== false, strength);
}

export function ditherStucki(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [
    [1, 0, 8], [2, 0, 4],
    [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2],
    [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]
  ];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 42, controls.serpentine !== false, strength);
}

export function ditherJarvisJudiceNinke(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [
    [1, 0, 7], [2, 0, 5],
    [-2, 1, 3], [-1, 1, 5], [0, 1, 7], [1, 1, 5], [2, 1, 3],
    [-2, 2, 1], [-1, 2, 3], [0, 2, 5], [1, 2, 3], [2, 2, 1]
  ];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 48, controls.serpentine !== false, strength);
}

export function ditherStevensonArce(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [
    [2, 0, 32],
    [-3, 1, 12], [-1, 1, 26], [1, 1, 30], [3, 1, 16],
    [-2, 2, 12], [0, 2, 26], [2, 2, 12],
    [-3, 3, 5], [-1, 3, 12], [1, 3, 12], [3, 3, 5]
  ];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 200, controls.serpentine !== false, strength);
}

export function ditherFan(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [[1, 0, 7], [-1, 1, 1], [0, 1, 3]];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 16, controls.serpentine !== false, strength);
}

export function ditherShiauFan(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [
    [1, 0, 7],
    [-2, 1, 1], [-1, 1, 3], [0, 1, 5]
  ];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 16, controls.serpentine !== false, strength);
}

export function ditherShiauFan2(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [
    [1, 0, 4],
    [-1, 1, 1], [0, 1, 3]
  ];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 8, controls.serpentine !== false, strength);
}

export function ditherFalseFloydSteinberg(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [
    [1, 0, 3],
    [0, 1, 3], [1, 1, 2]
  ];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 8, controls.serpentine !== false, strength);
}

export function ditherMinimizedAvgError(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [
    [1, 0, 7], [2, 0, 2],
    [-1, 1, 1], [0, 1, 3], [1, 1, 2],
    [0, 2, 1]
  ];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 16, controls.serpentine !== false, strength);
}

export function ditherDynamicSerpentine(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 16, true, strength);
}

export function ditherArtifactModulation(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const kernel = [[1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  return runKernelDiffusion(w, h, data, lut, kernel, 3, !!controls.serpentine, strength);
}

// Victor Ostromoukhov (SIGGRAPH 2001) variable-coefficient table:
// Keyframes: [13, 0, 5] at 0, [13, 0, 10] at 64, [7, 3, 0] at 128 (mirrored for 128..255)
function getOstromoukhovWeights(val) {
  const v = Math.max(0, Math.min(255, val));
  const folded = v > 128 ? 255 - v : v;
  let d1, d2, d3;
  if (folded <= 64) {
    const t = folded / 64;
    d1 = 13;
    d2 = 0;
    d3 = 5 * (1 - t) + 10 * t;
  } else {
    const t = (folded - 64) / 64;
    d1 = 13 * (1 - t) + 7 * t;
    d2 = 3 * t;
    d3 = 10 * (1 - t);
  }
  const total = d1 + d2 + d3;
  return [d1 / total, d2 / total, d3 / total];
}

// Ostromoukhov tone-dependent error diffusion
export function ditherOstromukhov(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const serpentine = controls.serpentine !== false;
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);

  if (lut.isTonalRamp) {
    const errRing = new Float32Array(2 * w);

    for (let y = 0; y < h; y++) {
      const reverse = serpentine && ((y & 1) === 1);
      const curRow = (y & 1) * w;
      const nextRow = ((y + 1) & 1) * w;
      const startX = reverse ? w - 1 : 0;
      const endX = reverse ? -1 : w;
      const stepX = reverse ? -1 : 1;

      for (let x = startX; x !== endX; x += stepX) {
        const idx = (y * w + x) * 4;
        const eIdx = curRow + x;

        const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        const curLum = Math.max(0, Math.min(255, lum + errRing[eIdx]));

        const chosenIdx = lut.quantizeLum(curLum);
        const col = lut.rawPalette[chosenIdx];

        out[idx] = col[0];
        out[idx + 1] = col[1];
        out[idx + 2] = col[2];
        out[idx + 3] = data[idx + 3];

        const err = (curLum - lut.luminances[chosenIdx]) * strength;
        const [f1, f2, f3] = getOstromoukhovWeights(curLum);

        const x1 = reverse ? x - 1 : x + 1;
        const x2 = reverse ? x + 1 : x - 1;

        if (x1 >= 0 && x1 < w) errRing[curRow + x1] += err * f1;
        if (y + 1 < h) {
          if (x2 >= 0 && x2 < w) errRing[nextRow + x2] += err * f2;
          errRing[nextRow + x] += err * f3;
        }
      }
      for (let i = 0; i < w; i++) errRing[curRow + i] = 0;
    }
  } else {
    const errRing = new Float32Array(2 * w * 3);
    const maxErr = 128;

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

        lut.inlineMatch(tr, tg, tb, out, idx);
        out[idx + 3] = data[idx + 3];

        const errR = Math.max(-maxErr, Math.min(maxErr, (tr - out[idx]) * strength));
        const errG = Math.max(-maxErr, Math.min(maxErr, (tg - out[idx + 1]) * strength));
        const errB = Math.max(-maxErr, Math.min(maxErr, (tb - out[idx + 2]) * strength));

        const lum = getLuminance(tr, tg, tb);
        const [f1, f2, f3] = getOstromoukhovWeights(lum);

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
  }
  return out;
}

export function ditherCrackedDiffuse(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const cracked = controls.cracked !== undefined ? Number(controls.cracked) : 100;
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);

  if (lut.isTonalRamp) {
    const errRing = new Float32Array(2 * w);

    for (let y = 0; y < h; y++) {
      const curRow = (y & 1) * w;
      const nextRow = ((y + 1) & 1) * w;

      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const eIdx = curRow + x;
        const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        const curLum = Math.max(0, Math.min(255, lum + errRing[eIdx]));

        const chosenIdx = lut.quantizeLum(curLum);
        const col = lut.rawPalette[chosenIdx];

        out[idx] = col[0];
        out[idx + 1] = col[1];
        out[idx + 2] = col[2];
        out[idx + 3] = data[idx + 3];

        const err = (curLum - lut.luminances[chosenIdx]) * strength;
        const hash = ((x * 12345 + y * 67891) ^ (x * y)) % 100;
        if (hash < cracked) {
          if ((x + y) % 2 === 0) {
            if (x + 1 < w) errRing[curRow + x + 1] += err;
          } else {
            if (y + 1 < h) errRing[nextRow + x] += err;
          }
        }
      }
      for (let i = 0; i < w; i++) errRing[curRow + i] = 0;
    }
  } else {
    const errRing = new Float32Array(2 * w * 3);
    const maxErr = 128;

    for (let y = 0; y < h; y++) {
      const curRow = (y & 1) * w * 3;
      const nextRow = ((y + 1) & 1) * w * 3;

      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const eIdx = curRow + x * 3;
        const tr = Math.max(0, Math.min(255, data[idx] + errRing[eIdx]));
        const tg = Math.max(0, Math.min(255, data[idx + 1] + errRing[eIdx + 1]));
        const tb = Math.max(0, Math.min(255, data[idx + 2] + errRing[eIdx + 2]));

        lut.inlineMatch(tr, tg, tb, out, idx);
        out[idx + 3] = data[idx + 3];

        const errR = Math.max(-maxErr, Math.min(maxErr, (tr - out[idx]) * strength));
        const errG = Math.max(-maxErr, Math.min(maxErr, (tg - out[idx + 1]) * strength));
        const errB = Math.max(-maxErr, Math.min(maxErr, (tb - out[idx + 2]) * strength));

        const hash = ((x * 12345 + y * 67891) ^ (x * y)) % 100;
        if (hash < cracked) {
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
  }
  return out;
}

export function ditherGaussian(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const spread = controls.distributionSpread !== undefined ? Number(controls.distributionSpread) : 1;
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
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

// 2D Hilbert space-filling curve generator covering [0, w) x [0, h)
function generateHilbertCurve(w, h) {
  const maxDim = Math.max(w, h);
  let n = 1;
  while (n < maxDim) n <<= 1;

  const total = w * h;
  const coords = new Int32Array(total * 2);
  let count = 0;
  const n2 = n * n;

  for (let d = 0; d < n2; d++) {
    let rx, ry, s, t = d;
    let x = 0, y = 0;
    for (s = 1; s < n; s <<= 1) {
      rx = 1 & (t >> 1);
      ry = 1 & (t ^ rx);
      if (ry === 0) {
        if (rx === 1) {
          x = s - 1 - x;
          y = s - 1 - y;
        }
        const tmp = x;
        x = y;
        y = tmp;
      }
      x += s * rx;
      y += s * ry;
      t >>= 2;
    }
    if (x < w && y < h) {
      coords[count * 2] = x;
      coords[count * 2 + 1] = y;
      count++;
      if (count === total) break;
    }
  }
  return coords;
}

// Riemersma dither along a 2D Hilbert space-filling curve with an 8-element exponential decay FIFO queue
export function ditherFractalDiffuse(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);

  const coords = generateHilbertCurve(w, h);
  const total = w * h;

  // 8-element exponentially decaying FIFO queue
  const M = 8;
  const weights = new Float32Array(M);
  const decay = Math.pow(1 / M, 1 / (M - 1));
  let wSum = 0;
  for (let i = 0; i < M; i++) {
    weights[i] = Math.pow(decay, i);
    wSum += weights[i];
  }
  for (let i = 0; i < M; i++) {
    weights[i] /= wSum;
  }

  if (lut.isTonalRamp) {
    const queue = new Float32Array(M);
    for (let pt = 0; pt < total; pt++) {
      const x = coords[pt * 2];
      const y = coords[pt * 2 + 1];
      const idx = (y * w + x) * 4;

      let errAcc = 0;
      for (let i = 0; i < M; i++) {
        errAcc += queue[i] * weights[i];
      }
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const curLum = Math.max(0, Math.min(255, lum + errAcc * strength));

      const chosenIdx = lut.quantizeLum(curLum);
      const col = lut.rawPalette[chosenIdx];

      out[idx] = col[0];
      out[idx + 1] = col[1];
      out[idx + 2] = col[2];
      out[idx + 3] = data[idx + 3];

      const newErr = curLum - lut.luminances[chosenIdx];
      for (let i = M - 1; i > 0; i--) {
        queue[i] = queue[i - 1];
      }
      queue[0] = newErr;
    }
  } else {
    const queueR = new Float32Array(M);
    const queueG = new Float32Array(M);
    const queueB = new Float32Array(M);
    const maxErr = 128;

    for (let pt = 0; pt < total; pt++) {
      const x = coords[pt * 2];
      const y = coords[pt * 2 + 1];
      const idx = (y * w + x) * 4;

      let errR = 0, errG = 0, errB = 0;
      for (let i = 0; i < M; i++) {
        errR += queueR[i] * weights[i];
        errG += queueG[i] * weights[i];
        errB += queueB[i] * weights[i];
      }

      const tr = Math.max(0, Math.min(255, data[idx] + errR * strength));
      const tg = Math.max(0, Math.min(255, data[idx + 1] + errG * strength));
      const tb = Math.max(0, Math.min(255, data[idx + 2] + errB * strength));

      lut.inlineMatch(tr, tg, tb, out, idx);
      out[idx + 3] = data[idx + 3];

      const newErrR = Math.max(-maxErr, Math.min(maxErr, tr - out[idx]));
      const newErrG = Math.max(-maxErr, Math.min(maxErr, tg - out[idx + 1]));
      const newErrB = Math.max(-maxErr, Math.min(maxErr, tb - out[idx + 2]));

      for (let i = M - 1; i > 0; i--) {
        queueR[i] = queueR[i - 1];
        queueG[i] = queueG[i - 1];
        queueB[i] = queueB[i - 1];
      }
      queueR[0] = newErrR;
      queueG[0] = newErrG;
      queueB[0] = newErrB;
    }
  }
  return out;
}

export function ditherVortexDiffusion(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const twist = controls.twistStrength !== undefined ? Number(controls.twistStrength) / 100 : 0;
  const freq = controls.spiralFrequency !== undefined ? Number(controls.spiralFrequency) : 5;
  const strength = controls.diffusionStrength !== undefined
    ? Number(controls.diffusionStrength)
    : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  const cx = w / 2, cy = h / 2;
  const maxErr = 128;

  if (lut.isTonalRamp) {
    const errRing = new Float32Array(2 * w);

    for (let y = 0; y < h; y++) {
      const curRow = (y & 1) * w;
      const nextRow = ((y + 1) & 1) * w;

      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const eIdx = curRow + x;
        const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        const curLum = Math.max(0, Math.min(255, lum + errRing[eIdx]));

        const chosenIdx = lut.quantizeLum(curLum);
        const col = lut.rawPalette[chosenIdx];

        out[idx] = col[0];
        out[idx + 1] = col[1];
        out[idx + 2] = col[2];
        out[idx + 3] = data[idx + 3];

        const err = (curLum - lut.luminances[chosenIdx]) * 0.9 * strength;

        const dx = x - cx, dy = y - cy;
        const dist = Math.hypot(dx, dy);
        const theta = Math.atan2(dy, dx) + twist * (dist / Math.max(1, freq * 10));

        const dirX = Math.round(Math.cos(theta));
        const dirY = Math.max(0, Math.round(Math.sin(theta)));

        const tx = x + (dirX === 0 ? 1 : dirX);
        const ty = y + dirY;

        if (tx >= 0 && tx < w && ty < h) {
          const tr = (ty % 2) === (y % 2) ? curRow : nextRow;
          errRing[tr + tx] += err;
        }
      }
      for (let i = 0; i < w; i++) errRing[curRow + i] = 0;
    }
  } else {
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

        lut.inlineMatch(tr, tg, tb, out, idx);
        out[idx + 3] = data[idx + 3];

        const errR = Math.max(-maxErr, Math.min(maxErr, (tr - out[idx]) * strength));
        const errG = Math.max(-maxErr, Math.min(maxErr, (tg - out[idx + 1]) * strength));
        const errB = Math.max(-maxErr, Math.min(maxErr, (tb - out[idx + 2]) * strength));

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
  }
  return out;
}

import type { AsciiAlgorithmFn } from '../pipeline';
import {
  BAYER_2X2,
  BAYER_4X4,
  BAYER_8X8,
  BLUE_NOISE_32,
  boolParam,
  buildCoverageMatcher,
  clamp01,
  numParam,
  strParam,
  tpdfCellNoise
} from './shared';

/** 9. Ordered Bayer ASCII */
export const asciiBayer: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const { cols, rows, luma } = samples;
  const k = atlas.chars.length;
  const maxIdx = Math.max(0, k - 1);
  const sizeStr = strParam(settings.algoParams, 'matrixSize', '4x4');
  const matrix = sizeStr === '2x2' ? BAYER_2X2 : sizeStr === '8x8' ? BAYER_8X8 : BAYER_4X4;
  const size = sizeStr === '2x2' ? 2 : sizeStr === '8x8' ? 8 : 4;
  const mask = size - 1;
  const strength = Math.max(0, numParam(settings.algoParams, 'ditherStrength', 1.0));
  const spread = maxIdx > 0 ? strength / maxIdx : 0;
  const out = grid.charIndices;

  for (let r = 0; r < rows; r++) {
    const mRow = (r & mask) * size;
    const rowOff = r * cols;
    for (let c = 0; c < cols; c++) {
      const b = matrix[mRow + (c & mask)] - 0.5;
      const v = clamp01(luma[rowOff + c] + b * spread);
      out[rowOff + c] = Math.min(maxIdx, Math.max(0, Math.round(v * maxIdx)));
    }
  }
};

/** 10. Floyd-Steinberg ASCII (Serpentine Coverage-Error Diffusion) */
export const asciiFloydSteinberg: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const { cols, rows, luma } = samples;
  const strength = Math.max(0, numParam(settings.algoParams, 'diffusionStrength', 0.9));
  const serpentine = boolParam(settings.algoParams, 'serpentine', true);
  const { normCov, match } = buildCoverageMatcher(atlas.coverages);

  const errCur = new Float32Array(cols);
  const errNext = new Float32Array(cols);
  const out = grid.charIndices;

  for (let r = 0; r < rows; r++) {
    const rev = serpentine && (r & 1) === 1;
    const rowOff = r * cols;
    errNext.fill(0);

    const startC = rev ? cols - 1 : 0;
    const endC = rev ? -1 : cols;
    const step = rev ? -1 : 1;

    for (let c = startC; c !== endC; c += step) {
      const idx = rowOff + c;
      const target = clamp01(luma[idx] + errCur[c]);
      const chosen = match(target);
      out[idx] = chosen;

      const err = Math.max(-0.5, Math.min(0.5, (target - normCov[chosen]) * strength));
      const cNext = c + step;
      const cPrev = c - step;

      if (cNext >= 0 && cNext < cols) errCur[cNext] += err * (7 / 16);
      if (r + 1 < rows) {
        if (cPrev >= 0 && cPrev < cols) errNext[cPrev] += err * (3 / 16);
        errNext[c] += err * (5 / 16);
        if (cNext >= 0 && cNext < cols) errNext[cNext] += err * (1 / 16);
      }
    }

    errCur.set(errNext);
  }
};

/** 11. Atkinson ASCII (75% Error Retention, 3-Row Kernel) */
export const asciiAtkinson: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const { cols, rows, luma } = samples;
  const strength = Math.max(0, numParam(settings.algoParams, 'diffusionStrength', 1.0));
  const serpentine = boolParam(settings.algoParams, 'serpentine', false);
  const { normCov, match } = buildCoverageMatcher(atlas.coverages);

  const err0 = new Float32Array(cols);
  const err1 = new Float32Array(cols);
  const err2 = new Float32Array(cols);
  const out = grid.charIndices;

  for (let r = 0; r < rows; r++) {
    const rev = serpentine && (r & 1) === 1;
    const rowOff = r * cols;
    const startC = rev ? cols - 1 : 0;
    const endC = rev ? -1 : cols;
    const step = rev ? -1 : 1;

    for (let c = startC; c !== endC; c += step) {
      const idx = rowOff + c;
      const target = clamp01(luma[idx] + err0[c]);
      const chosen = match(target);
      out[idx] = chosen;

      // Atkinson propagates 6 * (1/8) = 75% of quantization error
      const e = Math.max(-0.5, Math.min(0.5, (target - normCov[chosen]) * strength)) * (1 / 8);
      const c1 = c + step;
      const c2 = c + step * 2;
      const cm1 = c - step;

      if (c1 >= 0 && c1 < cols) err0[c1] += e;
      if (c2 >= 0 && c2 < cols) err0[c2] += e;
      if (r + 1 < rows) {
        if (cm1 >= 0 && cm1 < cols) err1[cm1] += e;
        err1[c] += e;
        if (c1 >= 0 && c1 < cols) err1[c1] += e;
      }
      if (r + 2 < rows) {
        err2[c] += e;
      }
    }

    err0.set(err1);
    err1.set(err2);
    err2.fill(0);
  }
};

/** 12. Stochastic ASCII (Deterministic TPDF Noise) */
export const asciiStochastic: AsciiAlgorithmFn = (samples, grid, atlas, settings, ctx) => {
  const { cols, rows, luma } = samples;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const spread = clamp01(numParam(settings.algoParams, 'noiseSpread', 0.35));
  const temporal = boolParam(settings.algoParams, 'temporal', false);
  const seed = temporal ? (ctx.frameIndex * 7919 + 1337) | 0 : 1337;
  const out = grid.charIndices;

  for (let r = 0; r < rows; r++) {
    const rowOff = r * cols;
    for (let c = 0; c < cols; c++) {
      const idx = rowOff + c;
      const n = tpdfCellNoise(c, r, seed) * spread;
      const v = clamp01(luma[idx] + n);
      out[idx] = Math.min(maxIdx, Math.max(0, Math.round(v * maxIdx)));
    }
  }
};

/** 13. Blue-Noise ASCII (Tileable 32x32 Void-and-Cluster Blue-Noise Mask) */
export const asciiBlueNoise: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const { cols, rows, luma } = samples;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const strength = Math.max(0, numParam(settings.algoParams, 'blueNoiseStrength', 0.9));
  const tileOffset = Math.round(numParam(settings.algoParams, 'tileOffset', 0));
  const spread = maxIdx > 0 ? strength / maxIdx : 0;
  const out = grid.charIndices;

  for (let r = 0; r < rows; r++) {
    const my = ((r + tileOffset) & 31) * 32;
    const rowOff = r * cols;
    for (let c = 0; c < cols; c++) {
      const bn = BLUE_NOISE_32[my + ((c + tileOffset) & 31)] - 0.5;
      const v = clamp01(luma[rowOff + c] + bn * spread);
      out[rowOff + c] = Math.min(maxIdx, Math.max(0, Math.round(v * maxIdx)));
    }
  }
};

/** 14. Error-Diffusion Braille (2x4 Sub-Cell Floyd-Steinberg -> Unicode U+2800..U+28FF) */
export const asciiErrorDiffusionBraille: AsciiAlgorithmFn = (samples, grid, _atlas, settings) => {
  const { cols, rows, sub8 } = samples;
  const threshold = clamp01(numParam(settings.algoParams, 'threshold', 0.5));
  const strength = Math.max(0, numParam(settings.algoParams, 'diffusionStrength', 1.0));
  const serpentine = boolParam(settings.algoParams, 'serpentine', true);
  const invertDots = boolParam(settings.algoParams, 'invertDots', false);

  const dotW = cols * 2;
  const dotH = rows * 4;
  const dotField = new Float32Array(dotW * dotH);

  // Unpack sub8 into contiguous (2*cols) x (4*rows) dot luminance buffer
  if (sub8) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const base = (r * cols + c) * 8;
        for (let dy = 0; dy < 4; dy++) {
          const yDot = r * 4 + dy;
          for (let dx = 0; dx < 2; dx++) {
            dotField[yDot * dotW + c * 2 + dx] = sub8[base + dy * 2 + dx];
          }
        }
      }
    }
  }

  // Floyd-Steinberg error diffusion over the high-res dot grid
  const bits = new Uint8Array(dotW * dotH);
  const errCur = new Float32Array(dotW);
  const errNext = new Float32Array(dotW);

  for (let y = 0; y < dotH; y++) {
    const rev = serpentine && (y & 1) === 1;
    const rowOff = y * dotW;
    errNext.fill(0);
    const startX = rev ? dotW - 1 : 0;
    const endX = rev ? -1 : dotW;
    const step = rev ? -1 : 1;

    for (let x = startX; x !== endX; x += step) {
      const idx = rowOff + x;
      const val = clamp01(dotField[idx] + errCur[x]);
      const on = val >= threshold ? 1 : 0;
      bits[idx] = invertDots ? 1 - on : on;

      const err = Math.max(-0.5, Math.min(0.5, (val - on) * strength));
      const xNext = x + step;
      const xPrev = x - step;
      if (xNext >= 0 && xNext < dotW) errCur[xNext] += err * (7 / 16);
      if (y + 1 < dotH) {
        if (xPrev >= 0 && xPrev < dotW) errNext[xPrev] += err * (3 / 16);
        errNext[x] += err * (5 / 16);
        if (xNext >= 0 && xNext < dotW) errNext[xNext] += err * (1 / 16);
      }
    }
    errCur.set(errNext);
  }

  // Pack 2x4 dots into Unicode Braille U+2800..U+28FF
  const direct = new Array<string>(cols * rows);
  for (let r = 0; r < rows; r++) {
    const y0 = r * 4;
    for (let c = 0; c < cols; c++) {
      const x0 = c * 2;
      let mask = 0;
      if (bits[y0 * dotW + x0]) mask |= 0x01;
      if (bits[(y0 + 1) * dotW + x0]) mask |= 0x02;
      if (bits[(y0 + 2) * dotW + x0]) mask |= 0x04;
      if (bits[(y0 + 3) * dotW + x0]) mask |= 0x40;
      if (bits[y0 * dotW + x0 + 1]) mask |= 0x08;
      if (bits[(y0 + 1) * dotW + x0 + 1]) mask |= 0x10;
      if (bits[(y0 + 2) * dotW + x0 + 1]) mask |= 0x20;
      if (bits[(y0 + 3) * dotW + x0 + 1]) mask |= 0x80;

      const cellIdx = r * cols + c;
      direct[cellIdx] = String.fromCharCode(0x2800 + mask);
      grid.charIndices[cellIdx] = 0;
    }
  }
  grid.directChars = direct;
};

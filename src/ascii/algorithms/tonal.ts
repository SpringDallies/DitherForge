import type { AsciiAlgorithmFn } from '../pipeline';
import {
  buildCoverageMatcher,
  buildIntegralLuma,
  boolParam,
  clamp01,
  computeSobelCellGrid,
  numParam,
  queryIntegralMeanStd
} from './shared';

/** 1. Classic Density Ramp */
export const asciiClassicRamp: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const n = samples.cols * samples.rows;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const curve = Math.max(0.2, numParam(settings.algoParams, 'contrastCurve', 1.0));
  const luma = samples.luma;
  const out = grid.charIndices;

  for (let i = 0; i < n; i++) {
    const v = curve === 1.0 ? luma[i] : Math.pow(clamp01(luma[i]), curve);
    out[i] = Math.min(maxIdx, Math.max(0, Math.round(v * maxIdx)));
  }
};

/** 2. Inverted Density Ramp (Paper-Ink Dot-Gain Curve) */
export const asciiInvertedRamp: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const n = samples.cols * samples.rows;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const inkWeight = Math.max(0.3, numParam(settings.algoParams, 'inkWeight', 1.15));
  const paperFloor = clamp01(numParam(settings.algoParams, 'paperFloor', 0.08));
  const denom = Math.max(0.05, 1.0 - paperFloor);
  const luma = samples.luma;
  const out = grid.charIndices;

  for (let i = 0; i < n; i++) {
    const darkness = clamp01((1.0 - luma[i] - paperFloor) / denom);
    const smooth = darkness * darkness * (3.0 - 2.0 * darkness);
    const weighted = Math.pow(smooth, 1.0 / inkWeight);
    out[i] = Math.min(maxIdx, Math.max(0, Math.round(weighted * maxIdx)));
  }
};

/** 3. Adaptive Density (Clipped Histogram Equalization / CDF Mapping) */
export const asciiAdaptiveDensity: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const n = samples.cols * samples.rows;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const strength = clamp01(numParam(settings.algoParams, 'adaptationStrength', 0.75));
  const clipLimit = Math.max(1.0, numParam(settings.algoParams, 'clipLimit', 3.0));
  const luma = samples.luma;
  const out = grid.charIndices;

  // Build 256-bin histogram
  const hist = new Float32Array(256);
  let minL = 1.0;
  let maxL = 0.0;
  for (let i = 0; i < n; i++) {
    const v = luma[i];
    if (v < minL) minL = v;
    if (v > maxL) maxL = v;
    const bin = Math.min(255, Math.max(0, (v * 255) | 0));
    hist[bin] += 1;
  }

  // Flat-frame guard: avoid amplifying noise in solid images
  if (maxL - minL < 1e-4) {
    const idx = Math.round(minL * maxIdx);
    out.fill(idx);
    return;
  }

  // CLAHE-style histogram clipping and redistribution
  const avgBin = n / 256;
  const cap = avgBin * clipLimit;
  let excess = 0;
  for (let b = 0; b < 256; b++) {
    if (hist[b] > cap) {
      excess += hist[b] - cap;
      hist[b] = cap;
    }
  }
  const redist = excess / 256;
  const cdf = new Float32Array(256);
  let acc = 0;
  for (let b = 0; b < 256; b++) {
    acc += hist[b] + redist;
    cdf[b] = acc / Math.max(1, n);
  }

  for (let i = 0; i < n; i++) {
    const v = luma[i];
    const bin = Math.min(255, Math.max(0, (v * 255) | 0));
    const eq = v * (1 - strength) + cdf[bin] * strength;
    out[i] = Math.min(maxIdx, Math.max(0, Math.round(clamp01(eq) * maxIdx)));
  }
};

/** 4. Local Contrast Mapping (Integral-Image Unsharp Neighborhood) */
export const asciiLocalContrast: AsciiAlgorithmFn = (samples, grid, atlas, settings, ctx) => {
  const { cols, rows, luma } = samples;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  let rad = Math.max(1, Math.min(8, Math.round(numParam(settings.algoParams, 'windowRadius', 3))));
  if (!ctx.isExport && ctx.previewScale < 0.7) {
    rad = Math.min(rad, 2);
  }
  const gain = Math.max(0, numParam(settings.algoParams, 'localGain', 1.1));
  const noiseFloor = Math.max(0.01, numParam(settings.algoParams, 'noiseFloor', 0.05));

  const integral = buildIntegralLuma(luma, cols, rows);
  const out = grid.charIndices;

  for (let r = 0; r < rows; r++) {
    const r0 = Math.max(0, r - rad);
    const r1 = Math.min(rows - 1, r + rad);
    const rowOff = r * cols;
    for (let c = 0; c < cols; c++) {
      const c0 = Math.max(0, c - rad);
      const c1 = Math.min(cols - 1, c + rad);
      const { mean, std } = queryIntegralMeanStd(integral, c0, r0, c1, r1);
      const idx = rowOff + c;
      const v = luma[idx];
      const enhanced = clamp01(v + gain * ((v - mean) / (std + noiseFloor)) * 0.25);
      out[idx] = Math.min(maxIdx, Math.max(0, Math.round(enhanced * maxIdx)));
    }
  }
};

/** 5. Threshold ASCII */
export const asciiThreshold: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const n = samples.cols * samples.rows;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const pivot = clamp01(numParam(settings.algoParams, 'threshold', 0.5));
  const bandWidth = clamp01(numParam(settings.algoParams, 'bandWidth', 0.05));
  const levels = Math.max(2, Math.min(4, Math.round(numParam(settings.algoParams, 'levels', 2))));
  const halfBand = bandWidth * 0.5;
  const luma = samples.luma;
  const out = grid.charIndices;

  for (let i = 0; i < n; i++) {
    const v = luma[i];
    if (levels === 2 && bandWidth <= 0.001) {
      out[i] = v >= pivot ? maxIdx : 0;
    } else if (levels === 2) {
      if (v < pivot - halfBand) out[i] = 0;
      else if (v > pivot + halfBand) out[i] = maxIdx;
      else out[i] = Math.round(maxIdx * 0.5);
    } else {
      // Multi-band threshold centered on pivot
      const shifted = clamp01(v + (0.5 - pivot));
      const step = Math.min(levels - 1, Math.floor(shifted * levels));
      out[i] = Math.round((step / (levels - 1)) * maxIdx);
    }
  }
};

/** 6. Posterized ASCII */
export const asciiPosterized: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const n = samples.cols * samples.rows;
  const k = atlas.chars.length;
  const maxIdx = Math.max(0, k - 1);
  const levels = Math.max(2, Math.min(k, Math.round(numParam(settings.algoParams, 'posterLevels', 5))));
  const bias = numParam(settings.algoParams, 'stepBias', 0.0);
  const luma = samples.luma;
  const out = grid.charIndices;
  const maxBand = levels - 1;

  for (let i = 0; i < n; i++) {
    const shifted = clamp01(luma[i] + bias);
    const band = Math.min(maxBand, Math.max(0, Math.round(shifted * maxBand)));
    out[i] = Math.round((band / maxBand) * maxIdx);
  }
};

/** 7. Gamma-Weighted Mapping (Perceptual Calibrated Ink-Coverage LUT) */
export const asciiGammaWeighted: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const n = samples.cols * samples.rows;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const gamma = Math.max(0.2, numParam(settings.algoParams, 'gamma', 1.2));
  const weight = clamp01(numParam(settings.algoParams, 'coverageMatchWeight', 1.0));
  const { match } = buildCoverageMatcher(atlas.coverages);

  // Precompute 256-entry perceptual LUT for O(1) cell mapping
  const lut = new Uint16Array(256);
  for (let b = 0; b < 256; b++) {
    const lin = Math.pow(b / 255, gamma);
    const covIdx = match(lin);
    const linIdx = Math.round(lin * maxIdx);
    lut[b] = Math.min(maxIdx, Math.max(0, Math.round(linIdx * (1 - weight) + covIdx * weight)));
  }

  const luma = samples.luma;
  const out = grid.charIndices;
  for (let i = 0; i < n; i++) {
    const bin = Math.min(255, Math.max(0, (luma[i] * 255 + 0.5) | 0));
    out[i] = lut[bin];
  }
};

/** 8. Edge-Enhanced ASCII */
export const asciiEdgeEnhanced: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const { cols, rows, luma } = samples;
  const n = cols * rows;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const edgeStrength = Math.max(0, numParam(settings.algoParams, 'edgeStrength', 0.85));
  const edgeThreshold = clamp01(numParam(settings.algoParams, 'edgeThreshold', 0.35));
  const structuralOverride = boolParam(settings.algoParams, 'structuralOverride', true);

  const { mag, angle } = computeSobelCellGrid(luma, cols, rows);
  const out = grid.charIndices;
  const direct = structuralOverride ? new Array<string>(n) : undefined;

  for (let i = 0; i < n; i++) {
    const m = mag[i];
    const boosted = clamp01(luma[i] + m * edgeStrength * 0.5);
    const baseIdx = Math.min(maxIdx, Math.max(0, Math.round(boosted * maxIdx)));
    out[i] = baseIdx;

    if (direct) {
      if (m >= edgeThreshold) {
        // Tangent is perpendicular to gradient angle
        const tangent = (angle[i] + Math.PI * 0.5) % Math.PI;
        const sector = Math.floor((tangent / Math.PI) * 4 + 0.5) & 3;
        direct[i] = sector === 0 ? '-' : sector === 1 ? '/' : sector === 2 ? '|' : '\\';
        grid.highlight[i] = Math.min(1.0, (m - edgeThreshold) * 1.5);
      } else {
        direct[i] = atlas.chars[baseIdx] ?? ' ';
      }
    }
  }

  if (direct) {
    grid.directChars = direct;
  }
};

import type { AsciiAlgorithmFn } from '../pipeline';
import {
  boolParam,
  clamp01,
  computeSobelCellGrid,
  numParam,
  strParam
} from './shared';

/** 21. Contour / Outline ASCII (Thinned NMS + Hysteresis Edge Extraction) */
export const asciiContourOutline: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const { cols, rows, luma } = samples;
  const n = cols * rows;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const highT = clamp01(numParam(settings.algoParams, 'highThreshold', 0.35));
  const lowT = Math.min(highT, clamp01(numParam(settings.algoParams, 'lowThreshold', 0.15)));
  const fillOpacity = clamp01(numParam(settings.algoParams, 'fillOpacity', 0.0));
  const useBoxChars = boolParam(settings.algoParams, 'useBoxChars', true);

  const { mag, angle } = computeSobelCellGrid(luma, cols, rows);

  // 1-cell Non-Maximum Suppression along gradient normal
  const nms = new Float32Array(n);
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const idx = r * cols + c;
      const m = mag[idx];
      if (m < lowT) continue;
      const dir = Math.floor((angle[idx] / Math.PI) * 4 + 0.5) & 3;
      let m1 = 0;
      let m2 = 0;
      if (dir === 0) {
        m1 = mag[idx - 1];
        m2 = mag[idx + 1];
      } else if (dir === 1) {
        m1 = mag[(r - 1) * cols + c + 1];
        m2 = mag[(r + 1) * cols + c - 1];
      } else if (dir === 2) {
        m1 = mag[(r - 1) * cols + c];
        m2 = mag[(r + 1) * cols + c];
      } else {
        m1 = mag[(r - 1) * cols + c - 1];
        m2 = mag[(r + 1) * cols + c + 1];
      }
      if (m >= m1 && m >= m2) {
        nms[idx] = m;
      }
    }
  }

  // Hysteresis promotion: weak edge adjacent to strong edge becomes active
  const edgeMask = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (nms[i] >= highT) edgeMask[i] = 2;
    else if (nms[i] >= lowT) edgeMask[i] = 1;
  }

  const direct = new Array<string>(n);
  const strokes = useBoxChars ? ['─', '╱', '│', '╲'] : ['-', '/', '|', '\\'];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      let isEdge = edgeMask[idx] === 2;
      if (edgeMask[idx] === 1) {
        for (let dy = -1; dy <= 1 && !isEdge; dy++) {
          const ny = r + dy;
          if (ny < 0 || ny >= rows) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = c + dx;
            if (nx >= 0 && nx < cols && edgeMask[ny * cols + nx] === 2) {
              isEdge = true;
              break;
            }
          }
        }
      }

      if (isEdge) {
        const tangent = (angle[idx] + Math.PI * 0.5) % Math.PI;
        const sector = Math.floor((tangent / Math.PI) * 4 + 0.5) & 3;
        direct[idx] = strokes[sector];
        grid.charIndices[idx] = maxIdx;
      } else if (fillOpacity > 0.01) {
        const fillIdx = Math.min(maxIdx, Math.max(0, Math.round(luma[idx] * fillOpacity * maxIdx)));
        direct[idx] = atlas.chars[fillIdx] ?? ' ';
        grid.charIndices[idx] = fillIdx;
      } else {
        direct[idx] = ' ';
        grid.charIndices[idx] = 0;
      }
    }
  }
  grid.directChars = direct;
};

/** 22. Halftone Glyphs (Rotated Print-Screen Rosette Modulation) */
export const asciiHalftoneGlyphs: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const { cols, rows, luma } = samples;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const angleDeg = numParam(settings.algoParams, 'screenAngle', 45);
  const freq = Math.max(0.2, numParam(settings.algoParams, 'screenFreq', 1.0));
  const dotGain = numParam(settings.algoParams, 'dotGain', 0.1);

  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const omega = freq * Math.PI * 0.75;
  const out = grid.charIndices;

  for (let r = 0; r < rows; r++) {
    const rowOff = r * cols;
    for (let c = 0; c < cols; c++) {
      const u = c * cosA - r * sinA;
      const v = c * sinA + r * cosA;
      const spot = (Math.cos(u * omega) * Math.cos(v * omega)) * 0.25;
      const idx = rowOff + c;
      const val = clamp01(luma[idx] + dotGain + spot);
      out[idx] = Math.min(maxIdx, Math.max(0, Math.round(val * maxIdx)));
    }
  }
};

/** 23. Text Mosaic (Custom Message / Phrase Tiling with Luminance Gating) */
export const asciiTextMosaic: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const { cols, rows, luma } = samples;
  const n = cols * rows;
  const customText = strParam(settings.algoParams, 'customText', 'DITHERFORGE ');
  const minLum = clamp01(numParam(settings.algoParams, 'minLuminance', 0.08));
  const rowStagger = Math.round(numParam(settings.algoParams, 'rowStagger', 0));
  const scaleByLuma = boolParam(settings.algoParams, 'scaleByLuma', false);

  const phrase = Array.from(customText);
  const activeTokens = phrase.length > 0 ? phrase : atlas.chars;
  const tokenLen = activeTokens.length;
  const direct = new Array<string>(n);

  for (let r = 0; r < rows; r++) {
    const rowOff = r * cols;
    const stagger = r * rowStagger;
    for (let c = 0; c < cols; c++) {
      const idx = rowOff + c;
      const lv = luma[idx];
      if (lv < minLum) {
        direct[idx] = ' ';
        grid.charIndices[idx] = 0;
      } else {
        const tIdx = (((rowOff + c + stagger) % tokenLen) + tokenLen) % tokenLen;
        direct[idx] = activeTokens[tIdx];
        grid.charIndices[idx] = Math.min(atlas.chars.length - 1, Math.round(lv * (atlas.chars.length - 1)));
        if (scaleByLuma) {
          grid.highlight[idx] = lv * 0.6;
        }
      }
    }
  }
  grid.directChars = direct;
};

/** 24. Silhouette ASCII (Otsu Foreground Isolation + Clean Background Cutout) */
export const asciiSilhouette: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const { cols, rows, luma } = samples;
  const n = cols * rows;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const autoOtsu = boolParam(settings.algoParams, 'autoOtsu', true);
  let cutoff = clamp01(numParam(settings.algoParams, 'cutoff', 0.5));
  const invertMask = boolParam(settings.algoParams, 'invertMask', false);
  const bgCharIndex = Math.round(numParam(settings.algoParams, 'bgCharIndex', -1));
  const softEdge = clamp01(numParam(settings.algoParams, 'softEdge', 0.05));

  if (autoOtsu && n > 1) {
    const hist = new Uint32Array(256);
    let totalSum = 0;
    for (let i = 0; i < n; i++) {
      const b = Math.min(255, Math.max(0, (luma[i] * 255) | 0));
      hist[b]++;
      totalSum += b;
    }
    let sumB = 0;
    let wB = 0;
    let bestVar = -1;
    let bestBin = 128;
    for (let b = 0; b < 256; b++) {
      wB += hist[b];
      if (wB === 0) continue;
      const wF = n - wB;
      if (wF === 0) break;
      sumB += b * hist[b];
      const mB = sumB / wB;
      const mF = (totalSum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > bestVar) {
        bestVar = between;
        bestBin = b;
      }
    }
    if (bestVar > 1) {
      cutoff = bestBin / 255;
    }
  }

  const out = grid.charIndices;
  const direct = bgCharIndex < 0 ? new Array<string>(n) : undefined;
  const fgSpan = Math.max(0.05, invertMask ? cutoff : 1.0 - cutoff);

  for (let i = 0; i < n; i++) {
    const v = luma[i];
    const inFg = invertMask ? v <= cutoff : v >= cutoff;

    if (inFg) {
      const rel = clamp01(invertMask ? (cutoff - v) / fgSpan : (v - cutoff) / fgSpan);
      const edgeScale = softEdge > 0.001 ? Math.min(1, Math.abs(v - cutoff) / softEdge) : 1;
      const idx = Math.min(maxIdx, Math.max(1, Math.round(rel * edgeScale * maxIdx)));
      out[i] = idx;
      if (direct) direct[i] = atlas.chars[idx] ?? '@';
    } else {
      if (direct) {
        out[i] = 0;
        direct[i] = ' ';
      } else {
        out[i] = Math.min(maxIdx, Math.max(0, bgCharIndex));
      }
    }
  }

  if (direct) {
    grid.directChars = direct;
  }
};

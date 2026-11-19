import type { AsciiAlgorithmFn } from '../pipeline';
import { FastPaletteLUT } from '../../dither-engine/engine/palette.js';
import {
  BAYER_2X2,
  boolParam,
  clamp01,
  computeSobelCellGrid,
  mapDualColorRgb,
  numParam,
  parseHex,
  QUADRANT_CHARS,
  sextantMaskToChar,
  strParam
} from './shared';

/** 15. Braille 2x4 (Fast Direct / Ordered Sub-Dot Thresholding) */
export const asciiBraille2x4: AsciiAlgorithmFn = (samples, grid, _atlas, settings) => {
  const { cols, rows, sub8 } = samples;
  const threshold = clamp01(numParam(settings.algoParams, 'threshold', 0.5));
  const subDither = clamp01(numParam(settings.algoParams, 'subDotDither', 0.0));
  const invertDots = boolParam(settings.algoParams, 'invertDots', false);
  const direct = new Array<string>(cols * rows);

  const dotBits = [0x01, 0x08, 0x02, 0x10, 0x04, 0x20, 0x40, 0x80];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellIdx = r * cols + c;
      const base = cellIdx * 8;
      let mask = 0;

      if (sub8) {
        for (let k = 0; k < 8; k++) {
          const dx = k & 1;
          const dy = k >> 1;
          const bOffset = subDither > 0 ? (BAYER_2X2[(dy & 1) * 2 + dx] - 0.5) * subDither * 0.5 : 0;
          const v = sub8[base + k] + bOffset;
          const on = v >= threshold;
          if (invertDots ? !on : on) {
            mask |= dotBits[k];
          }
        }
      }
      direct[cellIdx] = String.fromCharCode(0x2800 + mask);
      grid.charIndices[cellIdx] = 0;
    }
  }
  grid.directChars = direct;
};

/** 16. Half-Block (2x Vertical Color Resolution via U+2580 UPPER HALF BLOCK) */
export const asciiHalfBlock: AsciiAlgorithmFn = (samples, grid, _atlas, settings, ctx, sourceRgba) => {
  const { cols, rows, cellW, cellH, strideX, strideY } = samples;
  const { width, height } = ctx;
  const mergeThreshold = Math.max(0, numParam(settings.algoParams, 'mergeThreshold', 6));
  const palLut =
    settings.colorMode === 'palette' && ctx.palette.length > 0
      ? new FastPaletteLUT(ctx.palette, 0.5)
      : null;
  const singleRgb = parseHex(settings.foregroundColor, [230, 237, 243]);
  const fgAlpha = Math.round(clamp01(settings.foregroundOpacity) * 255);
  const bgAlpha =
    settings.backgroundMode === 'transparent' ? 0 : Math.round(clamp01(settings.backgroundOpacity) * 255);

  const direct = new Array<string>(cols * rows);

  for (let r = 0; r < rows; r++) {
    const y0 = r * strideY;
    const yMid = Math.min(height, y0 + Math.max(1, cellH >> 1));
    const y1 = Math.min(height, y0 + cellH);

    for (let c = 0; c < cols; c++) {
      const x0 = c * strideX;
      const x1 = Math.min(width, x0 + cellW);
      let tr = 0, tg = 0, tb = 0, tc = 0;
      let br = 0, bg = 0, bb = 0, bc = 0;

      for (let py = y0; py < yMid; py++) {
        const pRow = py * width * 4;
        for (let px = x0; px < x1; px++) {
          const s = pRow + px * 4;
          tr += sourceRgba[s]; tg += sourceRgba[s + 1]; tb += sourceRgba[s + 2]; tc++;
        }
      }
      for (let py = yMid; py < y1; py++) {
        const pRow = py * width * 4;
        for (let px = x0; px < x1; px++) {
          const s = pRow + px * 4;
          br += sourceRgba[s]; bg += sourceRgba[s + 1]; bb += sourceRgba[s + 2]; bc++;
        }
      }

      const topRaw: [number, number, number] = tc > 0 ? [Math.round(tr / tc), Math.round(tg / tc), Math.round(tb / tc)] : [0, 0, 0];
      const botRaw: [number, number, number] = bc > 0 ? [Math.round(br / bc), Math.round(bg / bc), Math.round(bb / bc)] : topRaw;

      const topMapped = mapDualColorRgb(topRaw[0], topRaw[1], topRaw[2], settings.colorMode, palLut, singleRgb);
      const botMapped = mapDualColorRgb(botRaw[0], botRaw[1], botRaw[2], settings.colorMode, palLut, singleRgb);

      const cellIdx = r * cols + c;
      const idx4 = cellIdx * 4;
      const delta =
        Math.abs(topMapped[0] - botMapped[0]) +
        Math.abs(topMapped[1] - botMapped[1]) +
        Math.abs(topMapped[2] - botMapped[2]);

      if (delta <= mergeThreshold * 3) {
        direct[cellIdx] = '█';
        grid.fgRgba[idx4] = topMapped[0];
        grid.fgRgba[idx4 + 1] = topMapped[1];
        grid.fgRgba[idx4 + 2] = topMapped[2];
        grid.fgRgba[idx4 + 3] = fgAlpha;
        grid.bgRgba[idx4] = topMapped[0];
        grid.bgRgba[idx4 + 1] = topMapped[1];
        grid.bgRgba[idx4 + 2] = topMapped[2];
        grid.bgRgba[idx4 + 3] = bgAlpha;
      } else {
        direct[cellIdx] = '▀';
        grid.fgRgba[idx4] = topMapped[0];
        grid.fgRgba[idx4 + 1] = topMapped[1];
        grid.fgRgba[idx4 + 2] = topMapped[2];
        grid.fgRgba[idx4 + 3] = fgAlpha;
        grid.bgRgba[idx4] = botMapped[0];
        grid.bgRgba[idx4 + 1] = botMapped[1];
        grid.bgRgba[idx4 + 2] = botMapped[2];
        grid.bgRgba[idx4 + 3] = Math.max(bgAlpha, fgAlpha);
      }
      grid.charIndices[cellIdx] = 0;
    }
  }
  grid.directChars = direct;
};

/** 17. Quadrant Blocks (2x2 Sub-Cell Geometry + Dual-Color Fit) */
export const asciiQuadrantBlocks: AsciiAlgorithmFn = (samples, grid, _atlas, settings, ctx, sourceRgba) => {
  const { cols, rows, cellW, cellH, strideX, strideY } = samples;
  const { width, height } = ctx;
  const dualColor = boolParam(settings.algoParams, 'dualColor', true);
  const manualThresh = clamp01(numParam(settings.algoParams, 'threshold', 0.5));
  const palLut =
    settings.colorMode === 'palette' && ctx.palette.length > 0
      ? new FastPaletteLUT(ctx.palette, 0.5)
      : null;
  const singleRgb = parseHex(settings.foregroundColor, [230, 237, 243]);
  const fgAlpha = Math.round(clamp01(settings.foregroundOpacity) * 255);
  const direct = new Array<string>(cols * rows);

  const qR = new Float32Array(4);
  const qG = new Float32Array(4);
  const qB = new Float32Array(4);
  const qL = new Float32Array(4);

  for (let r = 0; r < rows; r++) {
    const y0 = r * strideY;
    const yMid = Math.min(height, y0 + Math.max(1, cellH >> 1));
    const y1 = Math.min(height, y0 + cellH);

    for (let c = 0; c < cols; c++) {
      const x0 = c * strideX;
      const xMid = Math.min(width, x0 + Math.max(1, cellW >> 1));
      const x1 = Math.min(width, x0 + cellW);

      const bounds: Array<[number, number, number, number]> = [
        [x0, xMid, y0, yMid],
        [xMid, x1, y0, yMid],
        [x0, xMid, yMid, y1],
        [xMid, x1, yMid, y1]
      ];

      let meanL = 0;
      for (let q = 0; q < 4; q++) {
        const [bx0, bx1, by0, by1] = bounds[q];
        let sr = 0, sg = 0, sb = 0, cnt = 0;
        for (let py = by0; py < by1; py++) {
          const pRow = py * width * 4;
          for (let px = bx0; px < bx1; px++) {
            const s = pRow + px * 4;
            sr += sourceRgba[s]; sg += sourceRgba[s + 1]; sb += sourceRgba[s + 2]; cnt++;
          }
        }
        const inv = cnt > 0 ? 1 / cnt : 0;
        qR[q] = sr * inv;
        qG[q] = sg * inv;
        qB[q] = sb * inv;
        qL[q] = (0.2126 * qR[q] + 0.7152 * qG[q] + 0.0722 * qB[q]) / 255;
        meanL += qL[q];
      }
      meanL *= 0.25;

      const splitPivot = dualColor ? meanL : manualThresh;
      let mask = 0;
      let fgR = 0, fgG = 0, fgB = 0, fgN = 0;
      let bgR = 0, bgG = 0, bgB = 0, bgN = 0;

      for (let q = 0; q < 4; q++) {
        if (qL[q] >= splitPivot) {
          mask |= 1 << q;
          fgR += qR[q]; fgG += qG[q]; fgB += qB[q]; fgN++;
        } else {
          bgR += qR[q]; bgG += qG[q]; bgB += qB[q]; bgN++;
        }
      }

      const cellIdx = r * cols + c;
      direct[cellIdx] = QUADRANT_CHARS[mask];
      grid.charIndices[cellIdx] = 0;

      if (dualColor) {
        const idx4 = cellIdx * 4;
        const fr = fgN > 0 ? Math.round(fgR / fgN) : Math.round(bgR / Math.max(1, bgN));
        const fg = fgN > 0 ? Math.round(fgG / fgN) : Math.round(bgG / Math.max(1, bgN));
        const fb = fgN > 0 ? Math.round(fgB / fgN) : Math.round(bgB / Math.max(1, bgN));
        const br = bgN > 0 ? Math.round(bgR / bgN) : fr;
        const bg = bgN > 0 ? Math.round(bgG / bgN) : fg;
        const bb = bgN > 0 ? Math.round(bgB / bgN) : fb;

        const mFg = mapDualColorRgb(fr, fg, fb, settings.colorMode, palLut, singleRgb);
        const mBg = mapDualColorRgb(br, bg, bb, settings.colorMode, palLut, singleRgb);

        grid.fgRgba[idx4] = mFg[0];
        grid.fgRgba[idx4 + 1] = mFg[1];
        grid.fgRgba[idx4 + 2] = mFg[2];
        grid.fgRgba[idx4 + 3] = fgAlpha;

        grid.bgRgba[idx4] = mBg[0];
        grid.bgRgba[idx4 + 1] = mBg[1];
        grid.bgRgba[idx4 + 2] = mBg[2];
        grid.bgRgba[idx4 + 3] = fgAlpha;
      }
    }
  }
  grid.directChars = direct;
};

/** 18. Sextant & Octant Blocks (2x3 Sub-Cell with Auto Quadrant Fallback) */
export const asciiSextantOctant: AsciiAlgorithmFn = (samples, grid, atlas, settings, ctx, sourceRgba) => {
  const mode = strParam(settings.algoParams, 'mode', 'auto');
  if (mode === 'quadrant-fallback') {
    asciiQuadrantBlocks(samples, grid, atlas, settings, ctx, sourceRgba);
    return;
  }

  const { cols, rows, cellW, cellH, strideX, strideY } = samples;
  const { width, height } = ctx;
  const dualColor = boolParam(settings.algoParams, 'dualColor', true);
  const bias = numParam(settings.algoParams, 'thresholdBias', 0.0);
  const palLut =
    settings.colorMode === 'palette' && ctx.palette.length > 0
      ? new FastPaletteLUT(ctx.palette, 0.5)
      : null;
  const singleRgb = parseHex(settings.foregroundColor, [230, 237, 243]);
  const fgAlpha = Math.round(clamp01(settings.foregroundOpacity) * 255);
  const direct = new Array<string>(cols * rows);

  const sR = new Float32Array(6);
  const sG = new Float32Array(6);
  const sB = new Float32Array(6);
  const sL = new Float32Array(6);

  for (let r = 0; r < rows; r++) {
    const y0 = r * strideY;
    const y1 = Math.min(height, y0 + cellH);
    const spanY = Math.max(1, y1 - y0);

    for (let c = 0; c < cols; c++) {
      const x0 = c * strideX;
      const x1 = Math.min(width, x0 + cellW);
      const spanX = Math.max(1, x1 - x0);

      let meanL = 0;
      for (let zy = 0; zy < 3; zy++) {
        const by0 = y0 + Math.floor((zy * spanY) / 3);
        const by1 = Math.max(by0 + 1, y0 + Math.floor(((zy + 1) * spanY) / 3));
        for (let zx = 0; zx < 2; zx++) {
          const bx0 = x0 + Math.floor((zx * spanX) / 2);
          const bx1 = Math.max(bx0 + 1, x0 + Math.floor(((zx + 1) * spanX) / 2));
          let sr = 0, sg = 0, sb = 0, cnt = 0;
          for (let py = by0; py < Math.min(height, by1); py++) {
            const pRow = py * width * 4;
            for (let px = bx0; px < Math.min(width, bx1); px++) {
              const s = pRow + px * 4;
              sr += sourceRgba[s]; sg += sourceRgba[s + 1]; sb += sourceRgba[s + 2]; cnt++;
            }
          }
          const idx6 = zy * 2 + zx;
          const inv = cnt > 0 ? 1 / cnt : 0;
          sR[idx6] = sr * inv;
          sG[idx6] = sg * inv;
          sB[idx6] = sb * inv;
          sL[idx6] = (0.2126 * sR[idx6] + 0.7152 * sG[idx6] + 0.0722 * sB[idx6]) / 255;
          meanL += sL[idx6];
        }
      }
      meanL = clamp01(meanL / 6 + bias);

      let mask = 0;
      let fgR = 0, fgG = 0, fgB = 0, fgN = 0;
      let bgR = 0, bgG = 0, bgB = 0, bgN = 0;
      for (let k = 0; k < 6; k++) {
        if (sL[k] >= meanL) {
          mask |= 1 << k;
          fgR += sR[k]; fgG += sG[k]; fgB += sB[k]; fgN++;
        } else {
          bgR += sR[k]; bgG += sG[k]; bgB += sB[k]; bgN++;
        }
      }

      const cellIdx = r * cols + c;
      direct[cellIdx] = sextantMaskToChar(mask);
      grid.charIndices[cellIdx] = 0;

      if (dualColor) {
        const idx4 = cellIdx * 4;
        const fr = fgN > 0 ? Math.round(fgR / fgN) : Math.round(bgR / Math.max(1, bgN));
        const fg = fgN > 0 ? Math.round(fgG / fgN) : Math.round(bgG / Math.max(1, bgN));
        const fb = fgN > 0 ? Math.round(fgB / fgN) : Math.round(bgB / Math.max(1, bgN));
        const br = bgN > 0 ? Math.round(bgR / bgN) : fr;
        const bg = bgN > 0 ? Math.round(bgG / bgN) : fg;
        const bb = bgN > 0 ? Math.round(bgB / bgN) : fb;

        const mFg = mapDualColorRgb(fr, fg, fb, settings.colorMode, palLut, singleRgb);
        const mBg = mapDualColorRgb(br, bg, bb, settings.colorMode, palLut, singleRgb);

        grid.fgRgba[idx4] = mFg[0];
        grid.fgRgba[idx4 + 1] = mFg[1];
        grid.fgRgba[idx4 + 2] = mFg[2];
        grid.fgRgba[idx4 + 3] = fgAlpha;

        grid.bgRgba[idx4] = mBg[0];
        grid.bgRgba[idx4 + 1] = mBg[1];
        grid.bgRgba[idx4 + 2] = mBg[2];
        grid.bgRgba[idx4 + 3] = fgAlpha;
      }
    }
  }
  grid.directChars = direct;
};

/** 19. Geometric Glyphs (6-Zone 2D Shape-Vector Matching against Calibrated Atlas) */
export const asciiGeometricGlyphs: AsciiAlgorithmFn = (samples, grid, atlas, settings, ctx) => {
  const { cols, rows, luma, sub6 } = samples;
  const n = cols * rows;
  const totalK = atlas.chars.length;
  // Adaptive video optimization: cap candidate search to <= 32 evenly spaced glyphs during live preview
  const capK = !ctx.isExport && ctx.previewScale < 0.75 && totalK > 32 ? 32 : totalK;
  const candIndices = new Uint16Array(capK);
  for (let i = 0; i < capK; i++) {
    candIndices[i] = capK === totalK ? i : Math.round((i / (capK - 1)) * (totalK - 1));
  }

  const shapeWeight = clamp01(numParam(settings.algoParams, 'shapeWeight', 0.75));
  const contrastBoost = Math.max(0.5, numParam(settings.algoParams, 'contrastBoost', 1.25));
  const zones = atlas.zones;
  const coverages = atlas.coverages;

  // Normalize glyph zone max to match full [0, 1] luminance range
  let maxZoneVal = 0.001;
  for (let i = 0; i < zones.length; i++) {
    if (zones[i] > maxZoneVal) maxZoneVal = zones[i];
  }
  const invMaxZone = 1 / maxZoneVal;

  const out = grid.charIndices;
  const cellVec = new Float32Array(6);

  for (let i = 0; i < n; i++) {
    const base6 = i * 6;
    const meanL = luma[i];

    if (sub6) {
      for (let z = 0; z < 6; z++) {
        cellVec[z] = clamp01((sub6[base6 + z] - meanL) * contrastBoost + meanL);
      }
    } else {
      cellVec.fill(meanL);
    }

    let bestGlyph = 0;
    let bestDist = Infinity;

    for (let ci = 0; ci < capK; ci++) {
      const gIdx = candIndices[ci];
      const gOff = gIdx * 6;
      let shapeDist = 0;
      for (let z = 0; z < 6; z++) {
        const d = cellVec[z] - zones[gOff + z] * invMaxZone;
        shapeDist += d * d;
      }
      const lumaDiff = meanL - coverages[gIdx] * invMaxZone;
      const dist = shapeDist * shapeWeight + (lumaDiff * lumaDiff * 6) * (1 - shapeWeight);
      if (dist < bestDist) {
        bestDist = dist;
        bestGlyph = gIdx;
      }
    }
    out[i] = bestGlyph;
  }
};

/** 20. Directional Glyphs (Sobel Gradient Orientation Alignment) */
export const asciiDirectionalGlyphs: AsciiAlgorithmFn = (samples, grid, atlas, settings) => {
  const { cols, rows, luma } = samples;
  const n = cols * rows;
  const maxIdx = Math.max(0, atlas.chars.length - 1);
  const edgeThreshold = clamp01(numParam(settings.algoParams, 'edgeThreshold', 0.22));
  const dirSet = strParam(settings.algoParams, 'directionalSet', 'ascii-slashes');
  const interiorFill = clamp01(numParam(settings.algoParams, 'interiorFill', 0.5));

  const { mag, angle } = computeSobelCellGrid(luma, cols, rows);
  const direct = new Array<string>(n);

  const slash4 = ['-', '/', '|', '\\'];
  const box4 = ['─', '╱', '│', '╲'];
  const arrows8 = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];

  for (let i = 0; i < n; i++) {
    const m = mag[i];
    if (m >= edgeThreshold) {
      if (dirSet === 'arrows') {
        const sec8 = Math.floor((angle[i] / Math.PI) * 8 + 0.5) & 7;
        direct[i] = arrows8[sec8];
      } else {
        const tangent = (angle[i] + Math.PI * 0.5) % Math.PI;
        const sec4 = Math.floor((tangent / Math.PI) * 4 + 0.5) & 3;
        direct[i] = dirSet === 'box-diagonals' ? box4[sec4] : slash4[sec4];
      }
      grid.charIndices[i] = maxIdx;
    } else if (interiorFill <= 0.01) {
      direct[i] = ' ';
      grid.charIndices[i] = 0;
    } else {
      const idx = Math.min(maxIdx, Math.max(0, Math.round(luma[i] * interiorFill * maxIdx)));
      grid.charIndices[i] = idx;
      direct[i] = atlas.chars[idx] ?? ' ';
    }
  }
  grid.directChars = direct;
};

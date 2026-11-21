import type {
  AsciiAlgorithmId,
  AsciiGridFrame,
  AsciiRenderContext,
  AsciiRenderResult,
  AsciiSettings,
  GlyphAtlasData
} from './types';
import { resolveActiveChars, findCharsetById } from './charsets';
import { buildOrGetGlyphAtlas } from './calibration';
import { FastPaletteLUT } from '../dither-engine/engine/palette.js';

export interface CellSampleGrid {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  strideX: number;
  strideY: number;
  /** Mean cell luminance in [0, 1], length = cols * rows */
  luma: Float32Array;
  /** Mean cell RGB + Alpha (0..255), length = cols * rows * 4 */
  rgba: Uint8ClampedArray;
  /** Optional 2x3 (6-zone) normalized sub-cell luminances for geometric/block algorithms */
  sub6?: Float32Array;
  /** Optional 2x4 (8-dot) normalized sub-cell luminances for Braille algorithms */
  sub8?: Float32Array;
}

export type AsciiAlgorithmFn = (
  samples: CellSampleGrid,
  grid: AsciiGridFrame,
  atlas: GlyphAtlasData,
  settings: AsciiSettings,
  ctx: AsciiRenderContext,
  sourceRgba: Uint8ClampedArray
) => void;

export type AsciiGridEffectsFn = (
  grid: AsciiGridFrame,
  settings: AsciiSettings,
  ctx: AsciiRenderContext
) => void;

export type AsciiRasterizerFn = (
  grid: AsciiGridFrame,
  atlas: GlyphAtlasData,
  settings: AsciiSettings,
  sourceRgba: Uint8ClampedArray,
  outRgba: Uint8ClampedArray,
  width: number,
  height: number
) => void;

export type AsciiPixelEffectsFn = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  grid: AsciiGridFrame,
  settings: AsciiSettings,
  ctx: AsciiRenderContext
) => void;

// Pluggable stage registries populated in Batch 2
const algorithmHandlers = new Map<AsciiAlgorithmId, AsciiAlgorithmFn>();
let gridEffectsHandler: AsciiGridEffectsFn | null = null;
let rasterizerHandler: AsciiRasterizerFn | null = null;
let pixelEffectsHandler: AsciiPixelEffectsFn | null = null;

export function registerAsciiAlgorithm(id: AsciiAlgorithmId, fn: AsciiAlgorithmFn): void {
  algorithmHandlers.set(id, fn);
}

export function registerAsciiStageHandlers(handlers: {
  gridEffects?: AsciiGridEffectsFn;
  rasterizer?: AsciiRasterizerFn;
  pixelEffects?: AsciiPixelEffectsFn;
}): void {
  if (handlers.gridEffects) gridEffectsHandler = handlers.gridEffects;
  if (handlers.rasterizer) rasterizerHandler = handlers.rasterizer;
  if (handlers.pixelEffects) pixelEffectsHandler = handlers.pixelEffects;
}

function parseHexRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
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

/** Stage 4: Grid & Cell Calculation */
export function computeGridLayout(
  width: number,
  height: number,
  settings: AsciiSettings
): { cols: number; rows: number; cellW: number; cellH: number; strideX: number; strideY: number } {
  const cellW = Math.max(4, Math.min(48, Math.round(settings.cellWidth * settings.aspectRatio)));
  const cellH = Math.max(4, Math.min(64, Math.round(settings.cellHeight)));
  const spacing = Math.max(0, Math.min(12, Math.round(settings.cellSpacing)));
  const strideX = cellW + spacing;
  const strideY = cellH + spacing;
  const cols = Math.max(1, Math.ceil(width / strideX));
  const rows = Math.max(1, Math.ceil(height / strideY));
  return { cols, rows, cellW, cellH, strideX, strideY };
}

/** Stage 1–3: Source Sampling, Luminance/Color Analysis, and ASCII Image Preprocessing */
export function sampleAndPreprocessCells(
  sourceRgba: Uint8ClampedArray,
  width: number,
  height: number,
  settings: AsciiSettings,
  needSub6: boolean,
  needSub8: boolean
): CellSampleGrid {
  const { cols, rows, cellW, cellH, strideX, strideY } = computeGridLayout(width, height, settings);
  const totalCells = cols * rows;
  const luma = new Float32Array(totalCells);
  const rgba = new Uint8ClampedArray(totalCells * 4);
  const sub6 = needSub6 ? new Float32Array(totalCells * 6) : undefined;
  const sub8 = needSub8 ? new Float32Array(totalCells * 8) : undefined;

  const expMult = Math.pow(2, settings.exposure || 0);
  const contrastFactor = settings.contrast >= 0 ? 1 + settings.contrast * 2 : 1 + settings.contrast * 0.8;
  const invGamma = 1 / Math.max(0.1, settings.gamma || 1.0);
  const bp = Math.max(0, Math.min(0.49, settings.blackPoint || 0));
  const wp = Math.max(bp + 0.01, Math.min(1.0, settings.whitePoint ?? 1.0));
  const invSpan = 1 / (wp - bp);
  const fastSample = settings.samplingQuality === 'fast' && !needSub6 && !needSub8;

  const preprocessLuma = (raw01: number): number => {
    let v = raw01 * expMult;
    v = (v - 0.5) * contrastFactor + 0.5 + (settings.brightness || 0) * 0.5;
    v = (v - bp) * invSpan;
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    if (invGamma !== 1.0) v = Math.pow(v, invGamma);
    if (settings.invert) v = 1 - v;
    return v;
  };

  for (let r = 0; r < rows; r++) {
    const y0 = r * strideY;
    const y1 = Math.min(height, y0 + cellH);
    const cellRowOff = r * cols;

    for (let c = 0; c < cols; c++) {
      const x0 = c * strideX;
      const x1 = Math.min(width, x0 + cellW);
      const cellIdx = cellRowOff + c;
      const rgbaIdx = cellIdx * 4;

      if (fastSample) {
        const cx = Math.min(width - 1, (x0 + x1) >> 1);
        const cy = Math.min(height - 1, (y0 + y1) >> 1);
        const sIdx = (cy * width + cx) * 4;
        const rv = sourceRgba[sIdx];
        const gv = sourceRgba[sIdx + 1];
        const bv = sourceRgba[sIdx + 2];
        const av = sourceRgba[sIdx + 3];
        rgba[rgbaIdx] = rv;
        rgba[rgbaIdx + 1] = gv;
        rgba[rgbaIdx + 2] = bv;
        rgba[rgbaIdx + 3] = av;
        luma[cellIdx] = preprocessLuma((0.2126 * rv + 0.7152 * gv + 0.0722 * bv) / 255);
      } else {
        const method = settings.samplingMethod || 'average';
        let rSum = 0, gSum = 0, bSum = 0, aSum = 0, totalWeight = 0;
        let lumaSum = 0, lumaSqSum = 0;
        let minLuma = 1.0, maxLuma = 0.0;
        const stepX = settings.samplingQuality === 'box' && cellW > 8 ? 2 : 1;
        const stepY = settings.samplingQuality === 'box' && cellH > 12 ? 2 : 1;

        const midX = (x0 + x1) * 0.5;
        const midY = (y0 + y1) * 0.5;
        const halfW = Math.max(1, (x1 - x0) * 0.5);
        const halfH = Math.max(1, (y1 - y0) * 0.5);

        for (let py = y0; py < y1; py += stepY) {
          const pRow = py * width * 4;
          const dy = (py - midY) / halfH;
          const dySq = dy * dy;

          for (let px = x0; px < x1; px += stepX) {
            const sIdx = pRow + px * 4;
            const pr = sourceRgba[sIdx];
            const pg = sourceRgba[sIdx + 1];
            const pb = sourceRgba[sIdx + 2];
            const pa = sourceRgba[sIdx + 3];

            const pLuma = (0.2126 * pr + 0.7152 * pg + 0.0722 * pb) / 255;
            if (pLuma < minLuma) minLuma = pLuma;
            if (pLuma > maxLuma) maxLuma = pLuma;

            let w = 1.0;
            if (method === 'center_weighted') {
              const dx = (px - midX) / halfW;
              const distSq = dx * dx + dySq;
              w = Math.max(0.05, 1.0 - distSq * 0.65);
            }

            rSum += pr * w;
            gSum += pg * w;
            bSum += pb * w;
            aSum += pa * w;
            lumaSum += pLuma * w;
            lumaSqSum += pLuma * pLuma * w;
            totalWeight += w;
          }
        }
        const invW = totalWeight > 0 ? 1 / totalWeight : 0;
        const mr = Math.round(rSum * invW);
        const mg = Math.round(gSum * invW);
        const mb = Math.round(bSum * invW);
        const ma = Math.round(aSum * invW);
        rgba[rgbaIdx] = mr;
        rgba[rgbaIdx + 1] = mg;
        rgba[rgbaIdx + 2] = mb;
        rgba[rgbaIdx + 3] = ma;

        let cellRawLuma = lumaSum * invW;

        if (method === 'edge_aware') {
          // Account for intra-cell contrast/range: high contrast edges push prominence towards ink
          const dynamicRange = Math.max(0, maxLuma - minLuma);
          const edgeSens = settings.edgeSensitivity !== undefined ? settings.edgeSensitivity : 0.5;
          const edgeBias = dynamicRange * edgeSens * 0.35;
          cellRawLuma = cellRawLuma > 0.5 ? Math.min(1.0, cellRawLuma + edgeBias) : Math.max(0.0, cellRawLuma - edgeBias);
        } else if (method === 'local_contrast') {
          // Standard deviation of luminance inside the cell
          const variance = Math.max(0, (lumaSqSum * invW) - (cellRawLuma * cellRawLuma));
          const stdDev = Math.sqrt(variance);
          const contrastSign = cellRawLuma >= 0.5 ? 1 : -1;
          cellRawLuma = Math.max(0, Math.min(1.0, cellRawLuma + contrastSign * stdDev * 0.45));
        } else if (method === 'adaptive') {
          // Adaptive: blends center weighting on flat regions and preserves contrast on detailed regions
          const dynamicRange = Math.max(0, maxLuma - minLuma);
          const detailPreserve = settings.detailPreservation !== undefined ? settings.detailPreservation : 0.5;
          const curve = 1.0 + (dynamicRange - 0.25) * detailPreserve;
          cellRawLuma = Math.pow(Math.max(0, Math.min(1.0, cellRawLuma)), Math.max(0.4, Math.min(2.5, curve)));
        } else if (method === 'hybrid') {
          // Hybrid: combines center weight, edge sensitivity, and dynamic range
          const dynamicRange = Math.max(0, maxLuma - minLuma);
          const edgeSens = settings.edgeSensitivity !== undefined ? settings.edgeSensitivity : 0.5;
          const detailPreserve = settings.detailPreservation !== undefined ? settings.detailPreservation : 0.5;
          const contrastSign = cellRawLuma >= 0.5 ? 1 : -1;
          const edgeShift = contrastSign * dynamicRange * edgeSens * 0.25;
          cellRawLuma = Math.max(0, Math.min(1.0, cellRawLuma + edgeShift));
          if (detailPreserve > 0) {
            cellRawLuma = cellRawLuma * (1 - detailPreserve * 0.2) + (maxLuma * 0.5 + minLuma * 0.5) * (detailPreserve * 0.2);
          }
        }

        luma[cellIdx] = preprocessLuma(cellRawLuma);

        if (sub6) {
          const base6 = cellIdx * 6;
          for (let zy = 0; zy < 3; zy++) {
            const sy0 = y0 + Math.floor((zy * (y1 - y0)) / 3);
            const sy1 = Math.max(sy0 + 1, y0 + Math.floor(((zy + 1) * (y1 - y0)) / 3));
            for (let zx = 0; zx < 2; zx++) {
              const sx0 = x0 + Math.floor((zx * (x1 - x0)) / 2);
              const sx1 = Math.max(sx0 + 1, x0 + Math.floor(((zx + 1) * (x1 - x0)) / 2));
              let lSum = 0, lCnt = 0;
              for (let py = sy0; py < sy1; py++) {
                const pRow = py * width * 4;
                for (let px = sx0; px < sx1; px++) {
                  const sIdx = pRow + px * 4;
                  lSum += 0.2126 * sourceRgba[sIdx] + 0.7152 * sourceRgba[sIdx + 1] + 0.0722 * sourceRgba[sIdx + 2];
                  lCnt++;
                }
              }
              sub6[base6 + zy * 2 + zx] = preprocessLuma(lCnt > 0 ? lSum / (lCnt * 255) : 0);
            }
          }
        }

        if (sub8) {
          const base8 = cellIdx * 8;
          for (let dy = 0; dy < 4; dy++) {
            const sy = Math.min(height - 1, y0 + Math.floor(((dy + 0.5) * (y1 - y0)) / 4));
            const pRow = sy * width * 4;
            for (let dx = 0; dx < 2; dx++) {
              const sx = Math.min(width - 1, x0 + Math.floor(((dx + 0.5) * (x1 - x0)) / 2));
              const sIdx = pRow + sx * 4;
              const lv = (0.2126 * sourceRgba[sIdx] + 0.7152 * sourceRgba[sIdx + 1] + 0.0722 * sourceRgba[sIdx + 2]) / 255;
              sub8[base8 + dy * 2 + dx] = preprocessLuma(lv);
            }
          }
        }
      }
    }
  }

  // Optional 3x3 smoothing / sharpening on cell luminance field
  if (settings.smoothing > 0 || settings.sharpening > 0) {
    const copy = new Float32Array(luma);
    const smWeight = Math.min(1, settings.smoothing / 3);
    const shWeight = settings.sharpening;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let sum = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = Math.max(0, Math.min(rows - 1, r + dy));
          for (let dx = -1; dx <= 1; dx++) {
            const nx = Math.max(0, Math.min(cols - 1, c + dx));
            sum += copy[ny * cols + nx];
            cnt++;
          }
        }
        const mean = sum / cnt;
        const idx = r * cols + c;
        let val = copy[idx];
        if (smWeight > 0) val = val * (1 - smWeight) + mean * smWeight;
        if (shWeight > 0) val = val + (val - mean) * shWeight;
        luma[idx] = val < 0 ? 0 : val > 1 ? 1 : val;
      }
    }
  }

  return { cols, rows, cellW, cellH, strideX, strideY, luma, rgba, sub6, sub8 };
}

/** Stage 7–8: Character Color Assignment & Background Preparation */
export function assignGridColors(
  samples: CellSampleGrid,
  grid: AsciiGridFrame,
  settings: AsciiSettings,
  palette: number[][]
): void {
  const totalCells = samples.cols * samples.rows;
  const fgFixed = parseHexRgb(settings.foregroundColor, [230, 237, 243]);
  const bgFixed = parseHexRgb(settings.backgroundColor, [13, 14, 17]);
  const fgAlpha = Math.round(Math.max(0, Math.min(1, settings.foregroundOpacity)) * 255);
  const bgAlpha =
    settings.backgroundMode === 'transparent'
      ? 0
      : Math.round(Math.max(0, Math.min(1, settings.backgroundOpacity)) * 255);

  const palLut =
    settings.colorMode === 'palette' && palette && palette.length > 0
      ? new FastPaletteLUT(palette, 0.5)
      : null;

  const qLevels = settings.colorQuantization >= 2 ? settings.colorQuantization : 0;
  const qStep = qLevels > 0 ? 255 / (qLevels - 1) : 1;

  for (let i = 0; i < totalCells; i++) {
    const idx4 = i * 4;
    const sr = samples.rgba[idx4];
    const sg = samples.rgba[idx4 + 1];
    const sb = samples.rgba[idx4 + 2];
    const sa = samples.rgba[idx4 + 3];

    // Preserve custom foreground color already written by dual-color geometry algorithms
    if (grid.fgRgba[idx4 + 3] === 0) {
      let fr = sr, fg = sg, fb = sb;
      if (settings.colorMode === 'monochrome') {
        const lum = Math.round(grid.luminance[i] * 255);
        fr = lum; fg = lum; fb = lum;
      } else if (settings.colorMode === 'custom' || (settings.colorMode as string) === 'single') {
        fr = fgFixed[0]; fg = fgFixed[1]; fb = fgFixed[2];
      } else if (settings.colorMode === 'palette' && palLut) {
        const m = palLut.findNearest(sr, sg, sb);
        fr = m[0]; fg = m[1]; fb = m[2];
      }

      if (qLevels > 0 && settings.colorMode === 'source') {
        fr = Math.round(Math.round(fr / qStep) * qStep);
        fg = Math.round(Math.round(fg / qStep) * qStep);
        fb = Math.round(Math.round(fb / qStep) * qStep);
      }

      grid.fgRgba[idx4] = fr;
      grid.fgRgba[idx4 + 1] = fg;
      grid.fgRgba[idx4 + 2] = fb;
      grid.fgRgba[idx4 + 3] = settings.preserveAlpha ? Math.round((fgAlpha * sa) / 255) : fgAlpha;
    }

    // Background per cell (half-block/quadrant algorithms may overwrite this directly)
    if (grid.bgRgba[idx4 + 3] === 0 && settings.backgroundMode !== 'transparent') {
      if (settings.backgroundMode === 'original') {
        grid.bgRgba[idx4] = sr;
        grid.bgRgba[idx4 + 1] = sg;
        grid.bgRgba[idx4 + 2] = sb;
        grid.bgRgba[idx4 + 3] = bgAlpha;
      } else {
        grid.bgRgba[idx4] = bgFixed[0];
        grid.bgRgba[idx4 + 1] = bgFixed[1];
        grid.bgRgba[idx4 + 2] = bgFixed[2];
        grid.bgRgba[idx4 + 3] = bgAlpha;
      }
    }
  }
}

/**
 * Full 10-stage ASCII rendering entrypoint used by:
 *  - Styles > Category: ASCII (worker + main thread fallback)
 *  - Effects Stack > ASCII Render effect
 *  - ExportModal (TXT / PNG / JPG / WebP)
 *  - Animation / Video exporters
 */
export function renderAsciiFrame(
  sourceRgba: Uint8ClampedArray,
  settings: AsciiSettings,
  ctx: AsciiRenderContext,
  outRgba?: Uint8ClampedArray
): AsciiRenderResult {
  const { width, height } = ctx;
  const charsetDef = findCharsetById(settings.charsetId, ctx.customCharsets);
  const chars = resolveActiveChars(
    {
      charsetId: settings.charsetId,
      customCharsetChars: settings.customCharsetChars,
      injectedChars: settings.injectedChars,
      injectMode: settings.injectMode,
      reverseCharset: settings.reverseCharset,
      characterDepth: settings.characterDepth,
      characterOffset: settings.characterOffset,
      autoCalibrateOrder: settings.autoCalibrateOrder,
      fontFamily: settings.fontFamily,
      fontWeight: settings.fontWeight,
      glyphScale: settings.glyphScale,
      forceTextPresentation: charsetDef.forceTextPresentation
    },
    ctx.customCharsets
  );

  const { cols, rows, cellW, cellH, strideX, strideY } = computeGridLayout(width, height, settings);
  const atlas =
    ctx.atlas &&
    ctx.atlas.cellWidth === cellW &&
    ctx.atlas.cellHeight === cellH &&
    ctx.atlas.chars.length === chars.length
      ? ctx.atlas
      : buildOrGetGlyphAtlas({
          chars,
          fontFamily: settings.fontFamily,
          fontWeight: settings.fontWeight,
          cellWidth: cellW,
          cellHeight: cellH,
          glyphScale: settings.glyphScale,
          glyphAlign: settings.glyphAlign,
          autoCalibrateOrder: settings.autoCalibrateOrder,
          forceTextPresentation: charsetDef.forceTextPresentation
        });

  const algoId = settings.algorithmId;
  const needSub6 =
    algoId === 'ascii-geometric-glyphs' ||
    algoId === 'ascii-quadrant-blocks' ||
    algoId === 'ascii-sextant-octant' ||
    algoId === 'ascii-half-block';
  const needSub8 =
    algoId === 'ascii-braille-2x4' || algoId === 'ascii-error-diffusion-braille';

  // Stages 1–4
  const samples = sampleAndPreprocessCells(sourceRgba, width, height, settings, needSub6, needSub8);
  const totalCells = cols * rows;

  const grid: AsciiGridFrame = {
    cols,
    rows,
    cellWidth: cellW,
    cellHeight: cellH,
    cellSpacing: Math.max(0, strideX - cellW),
    chars: atlas.chars,
    charIndices: new Uint16Array(totalCells),
    fgRgba: new Uint8ClampedArray(totalCells * 4),
    bgRgba: new Uint8ClampedArray(totalCells * 4),
    luminance: samples.luma,
    offsetX: new Int8Array(totalCells),
    offsetY: new Int8Array(totalCells),
    highlight: new Float32Array(totalCells)
  };

  // Stage 5: Character Selection (Algorithm Dispatch)
  const algoFn = algorithmHandlers.get(algoId);
  if (algoFn) {
    algoFn(samples, grid, atlas, settings, ctx, sourceRgba);
  } else {
    // Fallback default: Classic Density Ramp (before Batch 2 registers all 24)
    const maxIdx = Math.max(0, atlas.chars.length - 1);
    for (let i = 0; i < totalCells; i++) {
      grid.charIndices[i] = Math.round(samples.luma[i] * maxIdx);
    }
  }

  // Stage 7–8: Color & Background Assignment (preserve dual-color overrides if set by algorithm)
  assignGridColors(samples, grid, settings, ctx.palette);

  // Stage 6: Grid-Level ASCII Effects
  if (gridEffectsHandler && settings.asciiEffects?.some((e) => e.enabled && e.stage !== 'pixel')) {
    gridEffectsHandler(grid, settings, ctx);
  }

  // Stage 9: Rasterization
  const target = outRgba && outRgba.length === width * height * 4
    ? outRgba
    : new Uint8ClampedArray(width * height * 4);

  if (rasterizerHandler) {
    rasterizerHandler(grid, atlas, settings, sourceRgba, target, width, height);
  }

  // Stage 10: Pixel-Level ASCII Effects
  if (pixelEffectsHandler && settings.asciiEffects?.some((e) => e.enabled && e.stage !== 'grid')) {
    pixelEffectsHandler(target, width, height, grid, settings, ctx);
  }

  return { grid, rgba: target, width, height };
}

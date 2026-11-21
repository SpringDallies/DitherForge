import type { AsciiBlendMode, AsciiGridFrame, AsciiSettings, GlyphAtlasData } from './types';
import { renderProceduralGlyph } from './fallbackFont';
import { parseHex } from './algorithms/shared';

// Pre-allocated scratch buffer for background blur to avoid GC allocations
let bgBlurScratch: Uint8ClampedArray | null = null;

/** Fast 2-pass separable box blur on RGBA buffer for background image blurring */
export function fastBoxBlurRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): void {
  const rad = Math.min(30, Math.max(1, Math.round(radius)));
  if (rad <= 0 || width <= 0 || height <= 0) return;

  const totalLen = width * height * 4;
  if (!bgBlurScratch || bgBlurScratch.length !== totalLen) {
    bgBlurScratch = new Uint8ClampedArray(totalLen);
  }
  const temp = bgBlurScratch;

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const rowOff = y * width * 4;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let aSum = 0;
    let count = 0;

    const initX = Math.min(width - 1, rad);
    for (let k = 0; k <= initX; k++) {
      const idx = rowOff + k * 4;
      rSum += data[idx];
      gSum += data[idx + 1];
      bSum += data[idx + 2];
      aSum += data[idx + 3];
      count++;
    }

    for (let x = 0; x < width; x++) {
      const outIdx = rowOff + x * 4;
      temp[outIdx] = rSum / count;
      temp[outIdx + 1] = gSum / count;
      temp[outIdx + 2] = bSum / count;
      temp[outIdx + 3] = aSum / count;

      const removeX = x - rad;
      if (removeX >= 0) {
        const remIdx = rowOff + removeX * 4;
        rSum -= data[remIdx];
        gSum -= data[remIdx + 1];
        bSum -= data[remIdx + 2];
        aSum -= data[remIdx + 3];
        count--;
      }
      const addX = x + rad + 1;
      if (addX < width) {
        const addIdx = rowOff + addX * 4;
        rSum += data[addIdx];
        gSum += data[addIdx + 1];
        bSum += data[addIdx + 2];
        aSum += data[addIdx + 3];
        count++;
      }
    }
  }

  // Vertical pass back into data
  const stride = width * 4;
  for (let x = 0; x < width; x++) {
    const colOff = x * 4;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let aSum = 0;
    let count = 0;

    const initY = Math.min(height - 1, rad);
    for (let k = 0; k <= initY; k++) {
      const idx = k * stride + colOff;
      rSum += temp[idx];
      gSum += temp[idx + 1];
      bSum += temp[idx + 2];
      aSum += temp[idx + 3];
      count++;
    }

    for (let y = 0; y < height; y++) {
      const outIdx = y * stride + colOff;
      data[outIdx] = rSum / count;
      data[outIdx + 1] = gSum / count;
      data[outIdx + 2] = bSum / count;
      data[outIdx + 3] = aSum / count;

      const removeY = y - rad;
      if (removeY >= 0) {
        const remIdx = removeY * stride + colOff;
        rSum -= temp[remIdx];
        gSum -= temp[remIdx + 1];
        bSum -= temp[remIdx + 2];
        aSum -= temp[remIdx + 3];
        count--;
      }
      const addY = y + rad + 1;
      if (addY < height) {
        const addIdx = addY * stride + colOff;
        rSum += temp[addIdx];
        gSum += temp[addIdx + 1];
        bSum += temp[addIdx + 2];
        aSum += temp[addIdx + 3];
        count++;
      }
    }
  }
}

/**
 * Blend a single channel for ASCII characters over background
 * (d = background/destination channel, s = character/source channel)
 */
export function blendAsciiChannel(d: number, s: number, mode: AsciiBlendMode): number {
  switch (mode) {
    case 'normal':
      return s;
    case 'screen':
      return 255 - Math.round(((255 - d) * (255 - s)) / 255);
    case 'multiply':
      return Math.round((d * s) / 255);
    case 'overlay':
      return d < 128
        ? Math.round((2 * d * s) / 255)
        : 255 - Math.round((2 * (255 - d) * (255 - s)) / 255);
    case 'soft-light': {
      const dn = d / 255;
      const sn = s / 255;
      const res =
        sn <= 0.5
          ? dn - (1 - 2 * sn) * dn * (1 - dn)
          : dn + (2 * sn - 1) * (Math.sqrt(dn) - dn);
      return Math.round(res * 255);
    }
    case 'add': {
      const sum = d + s;
      return sum > 255 ? 255 : sum;
    }
    case 'subtract': {
      const diff = d - s;
      return diff < 0 ? 0 : diff;
    }
    case 'bleed': {
      // Color dodge / ink bleed: characters illuminate and bloom heavily over the substrate
      if (s >= 255) return 255;
      const val = (d << 8) / (255 - s);
      return val > 255 ? 255 : (val | 0);
    }
    case 'difference':
      return Math.abs(d - s);
    case 'darken':
      return d < s ? d : s;
    case 'lighten':
      return d > s ? d : s;
    default:
      return s;
  }
}

const MAX_DIRECT_GLYPH_CACHE = 512;

class DirectGlyphBitmapCache {
  private map = new Map<string, Uint8Array>();
  private cellW = 0;
  private cellH = 0;

  get(ch: string, cellW: number, cellH: number): Uint8Array {
    if (this.cellW !== cellW || this.cellH !== cellH) {
      this.map.clear();
      this.cellW = cellW;
      this.cellH = cellH;
    }
    const hit = this.map.get(ch);
    if (hit) return hit;

    if (this.map.size >= MAX_DIRECT_GLYPH_CACHE) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }

    const buf = new Uint8Array(cellW * cellH);
    renderProceduralGlyph(ch, cellW, cellH, buf, 0);
    this.map.set(ch, buf);
    return buf;
  }

  clear(): void {
    this.map.clear();
  }
}

export const directGlyphCache = new DirectGlyphBitmapCache();

/**
 * Stage 9: Blits AsciiGridFrame into target RGBA pixel buffer.
 * Zero DOM calls — runs identically in Web Workers, Browser Main Thread, and Node tests.
 */
export function rasterizeAsciiGrid(
  grid: AsciiGridFrame,
  atlas: GlyphAtlasData,
  settings: AsciiSettings,
  sourceRgba: Uint8ClampedArray,
  outRgba: Uint8ClampedArray,
  width: number,
  height: number
): void {
  const { cols, rows, cellWidth: cellW, cellHeight: cellH, cellSpacing } = grid;
  const strideX = cellW + cellSpacing;
  const strideY = cellH + cellSpacing;
  const glyphPixels = cellW * cellH;
  const totalPixels = width * height;

  // Step 1: Fill base canvas background
  const bgRgb = parseHex(settings.backgroundColor, [13, 14, 17]);
  const bgOp = Math.max(0, Math.min(1, settings.backgroundOpacity));
  const bgAlphaByte = settings.backgroundMode === 'transparent' ? 0 : Math.round(bgOp * 255);

  if (settings.backgroundMode === 'transparent') {
    outRgba.fill(0);
  } else if (settings.backgroundMode === 'original') {
    if (bgAlphaByte >= 255) {
      outRgba.set(sourceRgba);
    } else {
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        outRgba[idx] = Math.round((sourceRgba[idx] * bgAlphaByte) / 255);
        outRgba[idx + 1] = Math.round((sourceRgba[idx + 1] * bgAlphaByte) / 255);
        outRgba[idx + 2] = Math.round((sourceRgba[idx + 2] * bgAlphaByte) / 255);
        outRgba[idx + 3] = settings.preserveAlpha
          ? Math.round((sourceRgba[idx + 3] * bgAlphaByte) / 255)
          : bgAlphaByte;
      }
    }
    // Apply background image blur if specified
    const bgBlur = settings.backgroundBlur ?? 0;
    if (bgBlur > 0) {
      fastBoxBlurRgba(outRgba, width, height, bgBlur);
    }
  } else {
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      outRgba[idx] = bgRgb[0];
      outRgba[idx + 1] = bgRgb[1];
      outRgba[idx + 2] = bgRgb[2];
      outRgba[idx + 3] = settings.preserveAlpha
        ? Math.round((sourceRgba[idx + 3] * bgAlphaByte) / 255)
        : bgAlphaByte;
    }
  }

  // Build quick lookup from atlas.chars when directChars is present
  let atlasCharMap: Map<string, number> | null = null;
  if (grid.directChars) {
    atlasCharMap = new Map<string, number>();
    for (let i = 0; i < atlas.chars.length; i++) {
      if (!atlasCharMap.has(atlas.chars[i])) {
        atlasCharMap.set(atlas.chars[i], i);
      }
    }
  }

  const bitmaps = atlas.alphaBitmaps;
  const maxAtlasIdx = Math.max(0, atlas.chars.length - 1);
  const clipCells = Boolean(settings.clipping);

  // Step 2a: Paint per-cell background first (Half-Block / Quadrant / Sextant dual-color cells)
  // Rendering cell backgrounds in an independent first pass ensures that displaced glyphs from
  // adjacent cells are never overwritten by neighboring cell background fills.
  if (settings.backgroundMode !== 'transparent' && settings.backgroundMode !== 'original') {
    for (let r = 0; r < rows; r++) {
      const baseY = r * strideY;
      const rowOff = r * cols;

      for (let c = 0; c < cols; c++) {
        const cellIdx = rowOff + c;
        const cIdx4 = cellIdx * 4;
        const baseX = c * strideX;

        const cellBgA = grid.bgRgba[cIdx4 + 3];
        if (cellBgA > 0) {
          const cbr = grid.bgRgba[cIdx4];
          const cbg = grid.bgRgba[cIdx4 + 1];
          const cbb = grid.bgRgba[cIdx4 + 2];
          const bgIsDiff =
            settings.backgroundMode !== 'solid' ||
            cbr !== bgRgb[0] ||
            cbg !== bgRgb[1] ||
            cbb !== bgRgb[2];

          if (bgIsDiff) {
            const yEnd = Math.min(height, baseY + cellH);
            const xEnd = Math.min(width, baseX + cellW);
            for (let py = baseY; py < yEnd; py++) {
              const pRow = py * width * 4;
              for (let px = baseX; px < xEnd; px++) {
                const pIdx = pRow + px * 4;
                outRgba[pIdx] = cbr;
                outRgba[pIdx + 1] = cbg;
                outRgba[pIdx + 2] = cbb;
                outRgba[pIdx + 3] = cellBgA;
              }
            }
          }
        }
      }
    }
  }

  const blendMode: AsciiBlendMode = settings.blendMode || 'normal';
  const isNormalBlend = blendMode === 'normal';

  // Step 2b: Paint all glyphs with alpha blending & displacement offsets
  for (let r = 0; r < rows; r++) {
    const baseY = r * strideY;
    const rowOff = r * cols;

    for (let c = 0; c < cols; c++) {
      const cellIdx = rowOff + c;
      const cIdx4 = cellIdx * 4;
      const baseX = c * strideX;

      const fgA = grid.fgRgba[cIdx4 + 3];
      if (fgA === 0) continue;

      // Resolve glyph alpha source
      let glyphSlice: Uint8Array;
      let glyphOffset = 0;
      if (grid.directChars) {
        const ch = grid.directChars[cellIdx];
        if (!ch || ch === ' ' || ch === '\u2800') continue;
        const found = atlasCharMap?.get(ch);
        if (found !== undefined) {
          glyphSlice = bitmaps;
          glyphOffset = found * glyphPixels;
        } else {
          glyphSlice = directGlyphCache.get(ch, cellW, cellH);
          glyphOffset = 0;
        }
      } else {
        const gIdx = Math.min(maxAtlasIdx, grid.charIndices[cellIdx]);
        if (atlas.chars[gIdx] === ' ') continue;
        glyphSlice = bitmaps;
        glyphOffset = gIdx * glyphPixels;
      }

      // Apply highlight boost (from Glyph Sweep / Density Pulse / Edge-Enhanced)
      const hi = grid.highlight[cellIdx];
      let fr = grid.fgRgba[cIdx4];
      let fg = grid.fgRgba[cIdx4 + 1];
      let fb = grid.fgRgba[cIdx4 + 2];
      if (hi > 0.001) {
        const boost = Math.min(1, hi);
        fr = Math.min(255, Math.round(fr + (255 - fr) * boost));
        fg = Math.min(255, Math.round(fg + (255 - fg) * boost));
        fb = Math.min(255, Math.round(fb + (255 - fb) * boost));
      } else if (hi < -0.001) {
        const dim = Math.max(0, 1 + hi);
        fr = Math.round(fr * dim);
        fg = Math.round(fg * dim);
        fb = Math.round(fb * dim);
      }

      const offX = grid.offsetX[cellIdx];
      const offY = grid.offsetY[cellIdx];

      const clipMinX = clipCells ? baseX : 0;
      const clipMaxX = clipCells ? Math.min(width, baseX + cellW) : width;
      const clipMinY = clipCells ? baseY : 0;
      const clipMaxY = clipCells ? Math.min(height, baseY + cellH) : height;

      for (let gy = 0; gy < cellH; gy++) {
        const py = baseY + gy + offY;
        if (py < clipMinY || py >= clipMaxY) continue;
        const dstRow = py * width * 4;
        const gRow = glyphOffset + gy * cellW;

        for (let gx = 0; gx < cellW; gx++) {
          const px = baseX + gx + offX;
          if (px < clipMinX || px >= clipMaxX) continue;
          const cov = glyphSlice[gRow + gx];
          if (cov === 0) continue;

          // Effective foreground alpha in [0, 255]
          const effA = fgA === 255 ? cov : (cov * fgA) >> 8;
          if (effA === 0) continue;

          const pIdx = dstRow + px * 4;
          if (effA >= 254 && isNormalBlend) {
            outRgba[pIdx] = fr;
            outRgba[pIdx + 1] = fg;
            outRgba[pIdx + 2] = fb;
            outRgba[pIdx + 3] = 255;
          } else {
            const dstR = outRgba[pIdx];
            const dstG = outRgba[pIdx + 1];
            const dstB = outRgba[pIdx + 2];
            const dstA = outRgba[pIdx + 3];

            // Compute blended color using selected ASCII blend mode
            const bR = isNormalBlend ? fr : blendAsciiChannel(dstR, fr, blendMode);
            const bG = isNormalBlend ? fg : blendAsciiChannel(dstG, fg, blendMode);
            const bB = isNormalBlend ? fb : blendAsciiChannel(dstB, fb, blendMode);

            if (effA >= 254) {
              outRgba[pIdx] = bR;
              outRgba[pIdx + 1] = bG;
              outRgba[pIdx + 2] = bB;
              outRgba[pIdx + 3] = 255;
            } else if (dstA === 0) {
              outRgba[pIdx] = bR;
              outRgba[pIdx + 1] = bG;
              outRgba[pIdx + 2] = bB;
              outRgba[pIdx + 3] = effA;
            } else {
              const invA = 255 - effA;
              outRgba[pIdx] = Math.round((bR * effA + dstR * invA) / 255);
              outRgba[pIdx + 1] = Math.round((bG * effA + dstG * invA) / 255);
              outRgba[pIdx + 2] = Math.round((bB * effA + dstB * invA) / 255);
              outRgba[pIdx + 3] = Math.min(255, effA + ((dstA * invA) >> 8));
            }
          }
        }
      }
    }
  }
}

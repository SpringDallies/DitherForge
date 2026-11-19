import type { AsciiGridFrame, AsciiSettings, GlyphAtlasData } from './types';
import { renderProceduralGlyph } from './fallbackFont';
import { parseHex } from './algorithms/shared';

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
  const clipCells = settings.clipping !== false;

  // Step 2: Paint per-cell background (when dual-color or custom cell bg differs) + glyph alpha blit
  for (let r = 0; r < rows; r++) {
    const baseY = r * strideY;
    const rowOff = r * cols;

    for (let c = 0; c < cols; c++) {
      const cellIdx = rowOff + c;
      const cIdx4 = cellIdx * 4;
      const baseX = c * strideX;

      // Per-cell background override (Half-Block / Quadrant / Sextant dual-color cells)
      const cellBgA = grid.bgRgba[cIdx4 + 3];
      if (cellBgA > 0 && settings.backgroundMode !== 'transparent') {
        const cbr = grid.bgRgba[cIdx4];
        const cbg = grid.bgRgba[cIdx4 + 1];
        const cbb = grid.bgRgba[cIdx4 + 2];
        const bgIsDiff =
          settings.backgroundMode !== 'solid' ||
          cbr !== bgRgb[0] ||
          cbg !== bgRgb[1] ||
          cbb !== bgRgb[2];

        if (bgIsDiff && settings.backgroundMode !== 'original') {
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
          if (effA >= 254) {
            outRgba[pIdx] = fr;
            outRgba[pIdx + 1] = fg;
            outRgba[pIdx + 2] = fb;
            outRgba[pIdx + 3] = 255;
          } else {
            const dstA = outRgba[pIdx + 3];
            if (dstA === 0) {
              outRgba[pIdx] = fr;
              outRgba[pIdx + 1] = fg;
              outRgba[pIdx + 2] = fb;
              outRgba[pIdx + 3] = effA;
            } else {
              const invA = 255 - effA;
              outRgba[pIdx] = (fr * effA + outRgba[pIdx] * invA) >> 8;
              outRgba[pIdx + 1] = (fg * effA + outRgba[pIdx + 1] * invA) >> 8;
              outRgba[pIdx + 2] = (fb * effA + outRgba[pIdx + 2] * invA) >> 8;
              outRgba[pIdx + 3] = Math.min(255, effA + ((dstA * invA) >> 8));
            }
          }
        }
      }
    }
  }
}

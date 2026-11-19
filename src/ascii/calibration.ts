import type { GlyphAtlasData } from './types';
import { renderProceduralGlyph } from './fallbackFont';

const MAX_ATLAS_CACHE_BYTES = 16 * 1024 * 1024; // 16 MB hard budget
const MAX_ATLAS_CACHE_ENTRIES = 24;

class GlyphAtlasCache {
  private map = new Map<string, GlyphAtlasData>();
  private totalBytes = 0;

  get(key: string): GlyphAtlasData | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    // Refresh LRU order
    this.map.delete(key);
    this.map.set(key, hit);
    return hit;
  }

  set(key: string, atlas: GlyphAtlasData): void {
    const existing = this.map.get(key);
    if (existing) {
      this.totalBytes -= existing.byteLength;
      this.map.delete(key);
    }
    while (
      this.map.size >= MAX_ATLAS_CACHE_ENTRIES ||
      (this.totalBytes + atlas.byteLength > MAX_ATLAS_CACHE_BYTES && this.map.size > 0)
    ) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey === undefined) break;
      const evicted = this.map.get(oldestKey);
      this.map.delete(oldestKey);
      if (evicted) {
        this.totalBytes = Math.max(0, this.totalBytes - evicted.byteLength);
      }
    }
    this.map.set(key, atlas);
    this.totalBytes += atlas.byteLength;
  }

  clear(): void {
    this.map.clear();
    this.totalBytes = 0;
  }

  getStats(): { entries: number; bytes: number } {
    return { entries: this.map.size, bytes: this.totalBytes };
  }
}

export const glyphAtlasCache = new GlyphAtlasCache();

export function buildAtlasKey(params: {
  chars: string[];
  fontFamily: string;
  fontWeight: number;
  cellWidth: number;
  cellHeight: number;
  glyphScale: number;
  glyphAlign: 'center' | 'left' | 'right';
  autoCalibrateOrder: boolean;
  forceTextPresentation?: boolean;
}): string {
  return [
    params.chars.join(''),
    params.fontFamily,
    params.fontWeight,
    params.cellWidth,
    params.cellHeight,
    params.glyphScale.toFixed(2),
    params.glyphAlign,
    params.autoCalibrateOrder ? '1' : '0',
    params.forceTextPresentation ? 't' : 'n'
  ].join('|');
}

function createScratch2D(w: number, h: number): {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
} | null {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) return { canvas, ctx };
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as
        | OffscreenCanvasRenderingContext2D
        | null;
      if (ctx) return { canvas, ctx };
    } catch {
      return null;
    }
  }
  return null;
}

function bitmapsEqual(a: Uint8Array, aOff: number, b: Uint8Array, bOff: number, len: number): boolean {
  let diff = 0;
  for (let i = 0; i < len; i++) {
    if (Math.abs(a[aOff + i] - b[bOff + i]) > 12) {
      diff++;
      if (diff > 2) return false;
    }
  }
  return true;
}

function measureBitmapStats(
  alpha: Uint8Array,
  offset: number,
  cellW: number,
  cellH: number,
  zonesOut: Float32Array,
  zoneOffset: number
): number {
  let totalSum = 0;
  const zoneSums = [0, 0, 0, 0, 0, 0];
  const zoneCounts = [0, 0, 0, 0, 0, 0];

  for (let y = 0; y < cellH; y++) {
    const zy = Math.min(2, Math.floor((y / cellH) * 3));
    const rowOff = offset + y * cellW;
    for (let x = 0; x < cellW; x++) {
      const zx = x < cellW * 0.5 ? 0 : 1;
      const v = alpha[rowOff + x];
      totalSum += v;
      const zi = zy * 2 + zx;
      zoneSums[zi] += v;
      zoneCounts[zi]++;
    }
  }

  for (let z = 0; z < 6; z++) {
    zonesOut[zoneOffset + z] = zoneCounts[z] > 0 ? zoneSums[z] / (zoneCounts[z] * 255) : 0;
  }

  return totalSum / Math.max(1, cellW * cellH * 255);
}

/**
 * Builds (or retrieves from LRU cache) a complete worker-transferable GlyphAtlasData.
 * Handles .notdef tofu detection, horizontal scaling for wide/proportional glyphs,
 * procedural Braille/Block rendering, and optional density-based glyph sorting.
 */
export function buildOrGetGlyphAtlas(options: {
  chars: string[];
  fontFamily: string;
  fontWeight: number;
  cellWidth: number;
  cellHeight: number;
  glyphScale?: number;
  glyphAlign?: 'center' | 'left' | 'right';
  autoCalibrateOrder?: boolean;
  forceTextPresentation?: boolean;
}): GlyphAtlasData {
  const cellW = Math.max(4, Math.min(48, Math.round(options.cellWidth)));
  const cellH = Math.max(4, Math.min(64, Math.round(options.cellHeight)));
  const glyphScale = Math.max(0.5, Math.min(1.5, options.glyphScale ?? 1.0));
  const glyphAlign = options.glyphAlign ?? 'center';
  const autoCalibrateOrder = Boolean(options.autoCalibrateOrder);
  const forceTextPresentation = Boolean(options.forceTextPresentation);

  const key = buildAtlasKey({
    chars: options.chars,
    fontFamily: options.fontFamily,
    fontWeight: options.fontWeight,
    cellWidth: cellW,
    cellHeight: cellH,
    glyphScale,
    glyphAlign,
    autoCalibrateOrder,
    forceTextPresentation
  });

  const cached = glyphAtlasCache.get(key);
  if (cached) return cached;

  const count = options.chars.length;
  const glyphPixels = cellW * cellH;
  const alphaBitmaps = new Uint8Array(count * glyphPixels);
  const coverages = new Float32Array(count);
  const zones = new Float32Array(count * 6);

  const surface = createScratch2D(cellW, cellH);
  let missingCount = 0;

  if (!surface) {
    // Headless Node.js / no-canvas fallback path
    for (let i = 0; i < count; i++) {
      const ch = options.chars[i];
      const off = i * glyphPixels;
      const ok = renderProceduralGlyph(ch, cellW, cellH, alphaBitmaps, off);
      if (!ok) missingCount++;
      coverages[i] = measureBitmapStats(alphaBitmaps, off, cellW, cellH, zones, i * 6);
    }
  } else {
    const { ctx } = surface;
    const fontPx = Math.max(4, Math.round(cellH * 0.88 * glyphScale));
    ctx.font = `${options.fontWeight} ${fontPx}px ${options.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = glyphAlign;
    ctx.fillStyle = '#ffffff';

    // Fingerprint the OS .notdef glyph using an unassigned codepoint (U+0378)
    const notdefAlpha = new Uint8Array(glyphPixels);
    ctx.clearRect(0, 0, cellW, cellH);
    ctx.fillText('\u0378', cellW * 0.5, cellH * 0.52);
    const notdefImg = ctx.getImageData(0, 0, cellW, cellH).data;
    let notdefInk = 0;
    for (let p = 0; p < glyphPixels; p++) {
      notdefAlpha[p] = notdefImg[p * 4 + 3];
      notdefInk += notdefAlpha[p];
    }

    const drawX = glyphAlign === 'left' ? 0 : glyphAlign === 'right' ? cellW : cellW * 0.5;
    const drawY = cellH * 0.52;

    for (let i = 0; i < count; i++) {
      const ch = options.chars[i];
      const code = ch.codePointAt(0) ?? 32;
      const off = i * glyphPixels;

      // Exact procedural rendering for Braille & Block Elements guarantees pixel-perfect
      // gapless tiling across every OS/browser font!
      if ((code >= 0x2800 && code <= 0x28ff) || (code >= 0x2580 && code <= 0x259f) || (code >= 0x1fb00 && code <= 0x1fb3b)) {
        renderProceduralGlyph(ch, cellW, cellH, alphaBitmaps, off);
        coverages[i] = measureBitmapStats(alphaBitmaps, off, cellW, cellH, zones, i * 6);
        continue;
      }

      if (ch === ' ') {
        coverages[i] = 0;
        continue;
      }

      const drawStr = forceTextPresentation && code > 0x00ff ? `${ch}\uFE0E` : ch;
      ctx.clearRect(0, 0, cellW, cellH);
      const metrics = ctx.measureText(drawStr);
      const adv = metrics.width || cellW;

      ctx.save();
      if (adv > cellW * 1.08) {
        const scaleX = cellW / adv;
        ctx.translate(drawX, drawY);
        ctx.scale(scaleX, 1);
        ctx.fillText(drawStr, 0, 0);
      } else {
        ctx.fillText(drawStr, drawX, drawY);
      }
      ctx.restore();

      const img = ctx.getImageData(0, 0, cellW, cellH).data;
      let inkSum = 0;
      for (let p = 0; p < glyphPixels; p++) {
        const a = img[p * 4 + 3];
        alphaBitmaps[off + p] = a;
        inkSum += a;
      }

      const isTofu =
        inkSum === 0 ||
        (notdefInk > 0 && bitmapsEqual(alphaBitmaps, off, notdefAlpha, 0, glyphPixels));

      if (isTofu) {
        missingCount++;
        renderProceduralGlyph(ch, cellW, cellH, alphaBitmaps, off);
      }

      coverages[i] = measureBitmapStats(alphaBitmaps, off, cellW, cellH, zones, i * 6);
    }
  }

  let finalChars = options.chars.slice();
  let finalBitmaps = alphaBitmaps;
  let finalCoverages = coverages;
  let finalZones = zones;

  if (autoCalibrateOrder && count > 2) {
    const order = Array.from({ length: count }, (_, idx) => idx);
    order.sort((a, b) => coverages[a] - coverages[b] || a - b);

    finalChars = new Array(count);
    finalBitmaps = new Uint8Array(count * glyphPixels);
    finalCoverages = new Float32Array(count);
    finalZones = new Float32Array(count * 6);

    for (let dstI = 0; dstI < count; dstI++) {
      const srcI = order[dstI];
      finalChars[dstI] = options.chars[srcI];
      finalCoverages[dstI] = coverages[srcI];
      finalBitmaps.set(
        alphaBitmaps.subarray(srcI * glyphPixels, (srcI + 1) * glyphPixels),
        dstI * glyphPixels
      );
      finalZones.set(zones.subarray(srcI * 6, (srcI + 1) * 6), dstI * 6);
    }
  }

  const atlas: GlyphAtlasData = {
    key,
    chars: finalChars,
    cellWidth: cellW,
    cellHeight: cellH,
    alphaBitmaps: finalBitmaps,
    coverages: finalCoverages,
    zones: finalZones,
    missingGlyphRatio: count > 0 ? missingCount / count : 0,
    byteLength: finalBitmaps.byteLength + finalCoverages.byteLength + finalZones.byteLength
  };

  glyphAtlasCache.set(key, atlas);
  return atlas;
}

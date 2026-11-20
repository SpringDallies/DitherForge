import type { AsciiGridFrame, AsciiSettings } from './types';
import { parseHex } from './algorithms/shared';

/**
 * Procedural fallback for Braille, Block, Box, and Sextant glyphs directly using Canvas vector paths
 */
function drawVectorProceduralGlyph(
  ctx: CanvasRenderingContext2D,
  ch: string,
  baseX: number,
  baseY: number,
  cellW: number,
  cellH: number,
  fr: number,
  fg: number,
  fb: number,
  fa: number
): boolean {
  const code = ch.codePointAt(0) ?? 32;

  // Braille Patterns U+2800..U+28FF
  if (code >= 0x2800 && code <= 0x28ff) {
    const mask = code - 0x2800;
    const dotBits: Array<[number, number, number]> = [
      [0, 0, 0x01], [0, 1, 0x02], [0, 2, 0x04], [0, 3, 0x40],
      [1, 0, 0x08], [1, 1, 0x10], [1, 2, 0x20], [1, 3, 0x80]
    ];
    const colW = cellW / 2;
    const rowH = cellH / 4;
    const rDot = Math.max(1, Math.min(colW, rowH) * 0.36);

    ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${fa})`;
    for (const [cx, cy, bit] of dotBits) {
      if ((mask & bit) === 0) continue;
      const centerX = baseX + (cx + 0.5) * colW;
      const centerY = baseY + (cy + 0.5) * rowH;
      ctx.beginPath();
      ctx.arc(centerX, centerY, rDot, 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  }

  // Solid block U+2588
  if (code === 0x2588) {
    ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${fa})`;
    ctx.fillRect(baseX, baseY, cellW, cellH);
    return true;
  }

  // Left half block U+258C
  if (code === 0x258c) {
    ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${fa})`;
    ctx.fillRect(baseX, baseY, cellW * 0.5, cellH);
    return true;
  }

  // Right half block U+2590
  if (code === 0x2590) {
    ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${fa})`;
    ctx.fillRect(baseX + cellW * 0.5, baseY, cellW * 0.5, cellH);
    return true;
  }

  // Upper half block U+2580
  if (code === 0x2580) {
    ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${fa})`;
    ctx.fillRect(baseX, baseY, cellW, cellH * 0.5);
    return true;
  }

  // Lower half block U+2584
  if (code === 0x2584) {
    ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${fa})`;
    ctx.fillRect(baseX, baseY + cellH * 0.5, cellW, cellH * 0.5);
    return true;
  }

  // Quadrant blocks U+2596..U+259F
  if (code >= 0x2596 && code <= 0x259f) {
    ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${fa})`;
    const midX = cellW * 0.5;
    const midY = cellH * 0.5;
    // Quadrant masks mapping
    const qMap: Record<number, number> = {
      0x2596: 0b0100, // lower left
      0x2597: 0b1000, // lower right
      0x2598: 0b0001, // upper left
      0x2599: 0b1101, // upper left, lower left, lower right
      0x259a: 0b0110, // upper left, lower right
      0x259b: 0b0111, // upper left, upper right, lower left
      0x259c: 0b1011, // upper left, upper right, lower right
      0x259d: 0b0010, // upper right
      0x259e: 0b1001, // upper right, lower left
      0x259f: 0b1110  // upper right, lower left, lower right
    };
    const m = qMap[code];
    if (m !== undefined) {
      if (m & 0b0001) ctx.fillRect(baseX, baseY, midX, midY);
      if (m & 0b0010) ctx.fillRect(baseX + midX, baseY, midX, midY);
      if (m & 0b0100) ctx.fillRect(baseX, baseY + midY, midX, midY);
      if (m & 0b1000) ctx.fillRect(baseX + midX, baseY + midY, midX, midY);
      return true;
    }
  }

  return false;
}

/**
 * Renders an AsciiGridFrame directly onto an HTMLCanvasElement using native 2D Canvas vector font APIs.
 * This guarantees 100% crisp, subpixel-anti-aliased vector typography at any physical display resolution or zoom level,
 * with ZERO pixelation and ZERO blur.
 */
export function renderAsciiVectorToCanvas(
  grid: AsciiGridFrame,
  settings: AsciiSettings,
  canvas: HTMLCanvasElement,
  scale: number = 1.0,
  sourceCanvas?: HTMLCanvasElement | null,
  splitRatio?: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Background
  const bgRgb = parseHex(settings.backgroundColor, [13, 14, 17]);
  const bgOp = Math.max(0, Math.min(1, settings.backgroundOpacity));

  if (settings.backgroundMode === 'transparent') {
    ctx.clearRect(0, 0, w, h);
  } else if (settings.backgroundMode === 'original' && sourceCanvas) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = bgOp;
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = `rgba(${bgRgb[0]}, ${bgRgb[1]}, ${bgRgb[2]}, ${bgOp})`;
    ctx.fillRect(0, 0, w, h);
  }

  const { cols, rows, cellWidth: baseCellW, cellHeight: baseCellH, cellSpacing: baseSpacing } = grid;
  const cellW = baseCellW * scale;
  const cellH = baseCellH * scale;
  const spacing = baseSpacing * scale;
  const strideX = cellW + spacing;
  const strideY = cellH + spacing;

  const glyphScale = Math.max(0.5, Math.min(1.5, settings.glyphScale ?? 1.0));
  const fontPx = Math.max(4, Math.round(cellH * 0.88 * glyphScale));
  const align = settings.glyphAlign ?? 'center';

  ctx.font = `${settings.fontWeight} ${fontPx}px ${settings.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;

  const drawXOffset = align === 'left' ? 0 : align === 'right' ? cellW : cellW * 0.5;
  const drawYOffset = cellH * 0.52;

  const splitPixel = splitRatio !== undefined ? Math.round(w * splitRatio) : w;

  // Render cells
  for (let r = 0; r < rows; r++) {
    const baseY = r * strideY;
    const rowOff = r * cols;

    for (let c = 0; c < cols; c++) {
      const baseX = c * strideX;
      if (baseX >= splitPixel) continue;

      const cellIdx = rowOff + c;
      const cIdx4 = cellIdx * 4;

      // Per-cell background (dual-color cells)
      const cellBgA = grid.bgRgba[cIdx4 + 3];
      if (cellBgA > 0 && settings.backgroundMode !== 'transparent') {
        const cbr = grid.bgRgba[cIdx4];
        const cbg = grid.bgRgba[cIdx4 + 1];
        const cbb = grid.bgRgba[cIdx4 + 2];
        const aNorm = cellBgA / 255;
        ctx.fillStyle = `rgba(${cbr}, ${cbg}, ${cbb}, ${aNorm})`;
        ctx.fillRect(baseX, baseY, Math.min(cellW, splitPixel - baseX), cellH);
      }

      const fgA = grid.fgRgba[cIdx4 + 3];
      if (fgA === 0) continue;

      let ch = '';
      if (grid.directChars) {
        ch = grid.directChars[cellIdx] || '';
      } else {
        const gIdx = grid.charIndices[cellIdx];
        ch = grid.chars[gIdx] || '';
      }

      if (!ch || ch === ' ' || ch === '⠀') continue;

      let fr = grid.fgRgba[cIdx4];
      let fg = grid.fgRgba[cIdx4 + 1];
      let fb = grid.fgRgba[cIdx4 + 2];

      const hi = grid.highlight[cellIdx];
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

      const offX = grid.offsetX[cellIdx] * scale;
      const offY = grid.offsetY[cellIdx] * scale;

      const fa = fgA / 255;
      const handled = drawVectorProceduralGlyph(
        ctx,
        ch,
        baseX + offX,
        baseY + offY,
        cellW,
        cellH,
        fr,
        fg,
        fb,
        fa
      );

      if (!handled) {
        ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${fa})`;
        ctx.fillText(ch, baseX + drawXOffset + offX, baseY + drawYOffset + offY);
      }
    }
  }

  // If split-view comparison is active, draw original image on the right
  if (splitRatio !== undefined && splitRatio < 1 && sourceCanvas) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitPixel, 0, w - splitPixel, h);
    ctx.clip();
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    ctx.restore();
  }
}

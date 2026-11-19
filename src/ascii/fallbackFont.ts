/**
 * Built-in procedural glyph rasterizer for:
 *  1) Exact Unicode Braille (U+2800..U+28FF) dot grids (2x4)
 *  2) Exact Unicode Block Elements & Quadrants (U+2580..U+259F)
 *  3) Unicode 13.0 Symbols for Legacy Computing Sextants (U+1FB00..U+1FB3B)
 *  4) Box-drawing lines and directional arrows
 *  5) Safe 5x7 fallback bitmap glyphs for core ASCII / headless tests / missing OS font glyphs
 */

const BITMAP_5X7: Record<string, number[]> = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x04, 0x04],
  ',': [0, 0, 0, 0, 0x04, 0x04, 0x08],
  ':': [0, 0x04, 0x04, 0, 0x04, 0x04, 0],
  ';': [0, 0x04, 0x04, 0, 0x04, 0x04, 0x08],
  '-': [0, 0, 0, 0x1f, 0, 0, 0],
  '_': [0, 0, 0, 0, 0, 0, 0x1f],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '*': [0, 0x15, 0x0e, 0x1f, 0x0e, 0x15, 0],
  '/': [0x01, 0x02, 0x04, 0x04, 0x08, 0x10, 0],
  '\\': [0x10, 0x08, 0x04, 0x04, 0x02, 0x01, 0],
  '|': [0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '#': [0x0a, 0x1f, 0x0a, 0x0a, 0x1f, 0x0a, 0],
  '%': [0x19, 0x1a, 0x04, 0x04, 0x0b, 0x13, 0],
  '@': [0x0e, 0x11, 0x17, 0x15, 0x17, 0x10, 0x0e],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  'X': [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  'M': [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  'O': [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e]
};

// Quadrant bitmask map for U+2580..U+259F (bits: 1=TL, 2=TR, 4=BL, 8=BR)
const QUADRANT_MASKS: Record<string, number> = {
  '▘': 0b0001,
  '▝': 0b0010,
  '▀': 0b0011,
  '▖': 0b0100,
  '▌': 0b0101,
  '▞': 0b0110,
  '▛': 0b0111,
  '▗': 0b1000,
  '▚': 0b1001,
  '▐': 0b1010,
  '▜': 0b1011,
  '▄': 0b1100,
  '▙': 0b1101,
  '▟': 0b1110,
  '█': 0b1111
};

/**
 * Inverts Unicode 13.0 Symbols for Legacy Computing Sextants (U+1FB00..U+1FB3B)
 * into their exact 6-bit mask (bit0=TL, bit1=TR, bit2=ML, bit3=MR, bit4=BL, bit5=BR).
 */
function sextantCodeToMask(code: number): number {
  let mask = (code - 0x1fb00) + 1;
  if (mask >= 21) mask += 1; // 21 = 0b010101 = U+258C LEFT HALF BLOCK
  if (mask >= 42) mask += 1; // 42 = 0b101010 = U+2590 RIGHT HALF BLOCK
  return mask;
}

const LINE_BITMAP_5X7: Record<string, number[]> = {
  '─': [0, 0, 0, 0x1f, 0, 0, 0],
  '│': [0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  '╱': [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  '╲': [0x10, 0x08, 0x08, 0x04, 0x02, 0x02, 0x01],
  '╳': [0x11, 0x0a, 0x0a, 0x04, 0x0a, 0x0a, 0x11],
  '┼': [0x04, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x04],
  '→': [0, 0x04, 0x02, 0x1f, 0x02, 0x04, 0],
  '←': [0, 0x04, 0x08, 0x1f, 0x08, 0x04, 0],
  '↑': [0x04, 0x0e, 0x15, 0x04, 0x04, 0x04, 0],
  '↓': [0, 0x04, 0x04, 0x04, 0x15, 0x0e, 0x04]
};

export function renderProceduralGlyph(
  ch: string,
  cellW: number,
  cellH: number,
  dst: Uint8Array,
  dstOffset: number
): boolean {
  const code = ch.codePointAt(0) ?? 32;
  const total = cellW * cellH;
  dst.fill(0, dstOffset, dstOffset + total);

  if (code === 0x20 || code === 0x2800) {
    return true;
  }

  // 1. Exact Braille U+2800..U+28FF
  if (code >= 0x2800 && code <= 0x28ff) {
    const mask = code - 0x2800;
    const dotBits: Array<[number, number, number]> = [
      [0, 0, 0x01], [0, 1, 0x02], [0, 2, 0x04], [0, 3, 0x40],
      [1, 0, 0x08], [1, 1, 0x10], [1, 2, 0x20], [1, 3, 0x80]
    ];
    const colW = cellW / 2;
    const rowH = cellH / 4;
    const rDot = Math.max(0.65, Math.min(colW, rowH) * 0.36);

    for (const [cx, cy, bit] of dotBits) {
      if ((mask & bit) === 0) continue;
      const centerX = (cx + 0.5) * colW;
      const centerY = (cy + 0.5) * rowH;
      const x0 = Math.max(0, Math.floor(centerX - rDot - 1));
      const x1 = Math.min(cellW - 1, Math.ceil(centerX + rDot + 1));
      const y0 = Math.max(0, Math.floor(centerY - rDot - 1));
      const y1 = Math.min(cellH - 1, Math.ceil(centerY + rDot + 1));
      for (let py = y0; py <= y1; py++) {
        for (let px = x0; px <= x1; px++) {
          const dist = Math.hypot(px + 0.5 - centerX, py + 0.5 - centerY);
          const cov = Math.max(0, Math.min(1, rDot + 0.5 - dist));
          const val = Math.round(cov * 255);
          const idx = dstOffset + py * cellW + px;
          if (val > dst[idx]) dst[idx] = val;
        }
      }
    }
    return true;
  }

  // 2. Shade blocks
  if (ch === '░' || ch === '▒' || ch === '▓') {
    const alpha = ch === '░' ? 64 : ch === '▒' ? 128 : 192;
    for (let y = 0; y < cellH; y++) {
      for (let x = 0; x < cellW; x++) {
        const pattern =
          ch === '░'
            ? ((x & 1) === 0 && (y & 1) === 0 ? 255 : 0)
            : ch === '▒'
              ? (((x + y) & 1) === 0 ? 255 : 0)
              : (((x & 1) === 0 && (y & 1) === 0) ? 0 : 255);
        dst[dstOffset + y * cellW + x] = Math.round((alpha + pattern) * 0.5);
      }
    }
    return true;
  }

  // 3. Quadrant & Half & Solid Blocks
  const qMask = QUADRANT_MASKS[ch];
  if (qMask !== undefined) {
    const midX = Math.floor(cellW / 2);
    const midY = Math.floor(cellH / 2);
    for (let y = 0; y < cellH; y++) {
      const bot = y >= midY ? 1 : 0;
      for (let x = 0; x < cellW; x++) {
        const right = x >= midX ? 1 : 0;
        const bit = 1 << (bot * 2 + right);
        if ((qMask & bit) !== 0) {
          dst[dstOffset + y * cellW + x] = 255;
        }
      }
    }
    return true;
  }

  // 3b. Exact Unicode 13.0 Sextants (U+1FB00..U+1FB3B): 2 columns x 3 rows
  if (code >= 0x1fb00 && code <= 0x1fb3b) {
    const sMask = sextantCodeToMask(code);
    const midX = Math.floor(cellW / 2);
    const row1 = Math.floor(cellH / 3);
    const row2 = Math.floor((cellH * 2) / 3);
    for (let y = 0; y < cellH; y++) {
      const zy = y < row1 ? 0 : y < row2 ? 1 : 2;
      for (let x = 0; x < cellW; x++) {
        const zx = x < midX ? 0 : 1;
        const bit = 1 << (zy * 2 + zx);
        if ((sMask & bit) !== 0) {
          dst[dstOffset + y * cellW + x] = 255;
        }
      }
    }
    return true;
  }

  // 4. Vertical fractional bars U+2581..U+2587
  if (code >= 0x2581 && code <= 0x2587) {
    const frac = (code - 0x2580) / 8;
    const startY = Math.round(cellH * (1 - frac));
    for (let y = startY; y < cellH; y++) {
      for (let x = 0; x < cellW; x++) {
        dst[dstOffset + y * cellW + x] = 255;
      }
    }
    return true;
  }

  // 5. Horizontal fractional bars U+2589..U+258F
  if (code >= 0x2589 && code <= 0x258f) {
    const frac = (0x2590 - code) / 8;
    const endX = Math.max(1, Math.round(cellW * frac));
    for (let y = 0; y < cellH; y++) {
      for (let x = 0; x < endX; x++) {
        dst[dstOffset + y * cellW + x] = 255;
      }
    }
    return true;
  }

  // 6. Core 5x7 bitmap fallback
  const rows = BITMAP_5X7[ch] ?? LINE_BITMAP_5X7[ch] ?? BITMAP_5X7[ch.toUpperCase()];
  if (rows) {
    for (let y = 0; y < cellH; y++) {
      const gy = Math.min(6, Math.floor((y / cellH) * 7));
      const rowBits = rows[gy];
      for (let x = 0; x < cellW; x++) {
        const gx = Math.min(4, Math.floor((x / cellW) * 5));
        const bit = (rowBits >> (4 - gx)) & 1;
        if (bit) {
          dst[dstOffset + y * cellW + x] = 255;
        }
      }
    }
    return true;
  }

  // Deterministic synthetic density block fallback for arbitrary headless Unicode tests
  const syntheticDensity = ((code * 37) % 100) / 100;
  const r = Math.max(1, Math.round(Math.min(cellW, cellH) * 0.45 * Math.sqrt(syntheticDensity + 0.1)));
  const cx = cellW * 0.5;
  const cy = cellH * 0.5;
  for (let y = 0; y < cellH; y++) {
    for (let x = 0; x < cellW; x++) {
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) {
        dst[dstOffset + y * cellW + x] = 220;
      }
    }
  }
  return false;
}

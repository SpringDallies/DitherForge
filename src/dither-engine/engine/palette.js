// Fast Palette Matcher and 3D Color LUT Engine
export function parseHexColor(hex) {
  if (typeof hex !== 'string') {
    if (Array.isArray(hex)) return [hex[0], hex[1], hex[2]];
    if (hex && typeof hex.r === 'number') return [hex.r, hex.g, hex.b];
    return [0, 0, 0];
  }
  let c = hex.replace(/^#/, '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function parsePalette(paletteInput) {
  if (!paletteInput || !Array.isArray(paletteInput) || paletteInput.length === 0) {
    return [[0, 0, 0], [255, 255, 255]];
  }
  return paletteInput.map(parseHexColor);
}

export function getLuminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function colorDistSq(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const rMean = (r1 + r2) * 0.5;
  return (2 + rMean / 256) * dr * dr
       + 4 * dg * dg
       + (2 + (255 - rMean) / 256) * db * db;
}

export class FastPaletteLUT {
  constructor(palette) {
    this.palette = parsePalette(palette);
    this.table = new Uint8ClampedArray(32 * 32 * 32 * 3);
    this.build();
  }

  build() {
    const pal = this.palette;
    const len = pal.length;
    for (let r = 0; r < 32; r++) {
      const rVal = (r << 3) | (r >> 2);
      for (let g = 0; g < 32; g++) {
        const gVal = (g << 3) | (g >> 2);
        for (let b = 0; b < 32; b++) {
          const bVal = (b << 3) | (b >> 2);
          let best = pal[0];
          let minDist = Infinity;
          for (let i = 0; i < len; i++) {
            const p = pal[i];
            const d = colorDistSq(rVal, gVal, bVal, p[0], p[1], p[2]);
            if (d < minDist) {
              minDist = d;
              best = p;
            }
          }
          const idx = (r * 1024 + g * 32 + b) * 3;
          this.table[idx] = best[0];
          this.table[idx + 1] = best[1];
          this.table[idx + 2] = best[2];
        }
      }
    }
  }

  findNearest(r, g, b) {
    const ir = Math.max(0, Math.min(31, Math.round(r) >> 3));
    const ig = Math.max(0, Math.min(31, Math.round(g) >> 3));
    const ib = Math.max(0, Math.min(31, Math.round(b) >> 3));
    const idx = (ir * 1024 + ig * 32 + ib) * 3;
    return [this.table[idx], this.table[idx + 1], this.table[idx + 2]];
  }

  inlineMatch(r, g, b, out, offset) {
    const ir = Math.max(0, Math.min(31, Math.round(r) >> 3));
    const ig = Math.max(0, Math.min(31, Math.round(g) >> 3));
    const ib = Math.max(0, Math.min(31, Math.round(b) >> 3));
    const idx = (ir * 1024 + ig * 32 + ib) * 3;
    out[offset] = this.table[idx];
    out[offset + 1] = this.table[idx + 1];
    out[offset + 2] = this.table[idx + 2];
  }
}

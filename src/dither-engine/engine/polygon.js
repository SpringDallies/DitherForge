// Category: Polygon (4 Algorithms)
import { FastPaletteLUT } from './palette.js';

export function ditherHexaPoly(w, h, data, palette) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const R = 12; // Hex radius
  const W_hex = Math.sqrt(3) * R;
  const H_hex = 1.5 * R;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const row = Math.floor(y / H_hex);
      const isOffset = (row & 1) === 1;
      const col = Math.floor((x - (isOffset ? W_hex * 0.5 : 0)) / W_hex);

      const cx = Math.round(col * W_hex + (isOffset ? W_hex * 0.5 : 0) + W_hex * 0.5);
      const cy = Math.round(row * H_hex + R);

      const scx = Math.max(0, Math.min(w - 1, cx));
      const scy = Math.max(0, Math.min(h - 1, cy));
      const sIdx = (scy * w + scx) * 4;

      const idx = (y * w + x) * 4;
      lut.inlineMatch(data[sIdx], data[sIdx + 1], data[sIdx + 2], out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherLowPoly(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const type = controls.triangleType || 'isosceles';
  let aspect = 1.0;
  if (type === 'equilateral') aspect = Math.sqrt(3) / 2;
  else if (type === 'golden-triangle') aspect = 1.618;

  const S = 16;
  const Sy = Math.round(S * aspect);

  for (let by = 0; by < h; by += Sy) {
    const maxBy = Math.min(h, by + Sy);
    for (let bx = 0; bx < w; bx += S) {
      const maxBx = Math.min(w, bx + S);
      const cx1 = bx + Math.floor(S * 0.25), cy1 = by + Math.floor(Sy * 0.25);
      const cx2 = bx + Math.floor(S * 0.75), cy2 = by + Math.floor(Sy * 0.75);

      const idx1 = (Math.min(h - 1, cy1) * w + Math.min(w - 1, cx1)) * 4;
      const idx2 = (Math.min(h - 1, cy2) * w + Math.min(w - 1, cx2)) * 4;

      for (let y = by; y < maxBy; y++) {
        for (let x = bx; x < maxBx; x++) {
          const isUpper = (x - bx) / S < (y - by) / Sy;
          const sIdx = isUpper ? idx1 : idx2;
          const idx = (y * w + x) * 4;
          lut.inlineMatch(data[sIdx], data[sIdx + 1], data[sIdx + 2], out, idx);
          out[idx + 3] = data[idx + 3];
        }
      }
    }
  }
  return out;
}

export function ditherPentaPoly(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const isVert = !!controls.vertical;
  const S = 16;

  for (let by = 0; by < h; by += S) {
    const maxBy = Math.min(h, by + S);
    for (let bx = 0; bx < w; bx += S) {
      const maxBx = Math.min(w, bx + S);
      const c1 = isVert ? [bx + 4, by + 8] : [bx + 8, by + 4];
      const c2 = isVert ? [bx + 12, by + 8] : [bx + 8, by + 12];

      const idx1 = (Math.min(h - 1, c1[1]) * w + Math.min(w - 1, c1[0])) * 4;
      const idx2 = (Math.min(h - 1, c2[1]) * w + Math.min(w - 1, c2[0])) * 4;

      for (let y = by; y < maxBy; y++) {
        for (let x = bx; x < maxBx; x++) {
          const split = isVert ? (x - bx < S / 2) : (y - by < S / 2);
          const sIdx = split ? idx1 : idx2;
          const idx = (y * w + x) * 4;
          lut.inlineMatch(data[sIdx], data[sIdx + 1], data[sIdx + 2], out, idx);
          out[idx + 3] = data[idx + 3];
        }
      }
    }
  }
  return out;
}

export function ditherTriPoly(w, h, data, palette) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const S = 16;

  for (let by = 0; by < h; by += S) {
    const maxBy = Math.min(h, by + S);
    for (let bx = 0; bx < w; bx += S) {
      const maxBx = Math.min(w, bx + S);
      const idx1 = (Math.min(h - 1, by + 4) * w + Math.min(w - 1, bx + 8)) * 4;
      const idx2 = (Math.min(h - 1, by + 12) * w + Math.min(w - 1, bx + 8)) * 4;

      for (let y = by; y < maxBy; y++) {
        for (let x = bx; x < maxBx; x++) {
          const isUp = ((x - bx) + (y - by)) < S;
          const sIdx = isUp ? idx1 : idx2;
          const idx = (y * w + x) * 4;
          lut.inlineMatch(data[sIdx], data[sIdx + 1], data[sIdx + 2], out, idx);
          out[idx + 3] = data[idx + 3];
        }
      }
    }
  }
  return out;
}

// Category: Polygon (4 Algorithms)
import { FastPaletteLUT } from './palette.js';

export function ditherHexaPoly(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const R = Math.max(1.0, 12 * scale); // Floating-point hex radius
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
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const type = controls.triangleType || 'isosceles';
  let aspect = 1.0;
  if (type === 'equilateral' || type === 'pyramid') aspect = Math.sqrt(3) / 2;
  else if (type === 'sawtooth') aspect = 0.707;
  else if (type === 'half-equilateral') aspect = Math.sqrt(3);
  else if (type === 'golden-triangle') aspect = 1.618;
  else if (type === 'arrowhead') aspect = 0.588;

  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const S = Math.max(1, Math.round(16 * scale));
  const Sy = Math.max(1, Math.round(S * aspect));

  for (let by = 0; by < h; by += Sy) {
    const maxBy = Math.min(h, by + Sy);
    for (let bx = 0; bx < w; bx += S) {
      const maxBx = Math.min(w, bx + S);
      const cx1 = Math.min(w - 1, Math.max(0, bx + Math.floor(S * 0.25)));
      const cy1 = Math.min(h - 1, Math.max(0, by + Math.floor(Sy * 0.25)));
      const cx2 = Math.min(w - 1, Math.max(0, bx + Math.floor(S * 0.75)));
      const cy2 = Math.min(h - 1, Math.max(0, by + Math.floor(Sy * 0.75)));

      const idx1 = (cy1 * w + cx1) * 4;
      const idx2 = (cy2 * w + cx2) * 4;

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
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const isVert = !!controls.vertical;
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const R = Math.max(1.0, 12 * scale);
  const W_hex = Math.sqrt(3) * R;
  const H_hex = 1.5 * R;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const row = Math.floor(y / H_hex);
      const isOffset = (row & 1) === 1;
      const col = Math.floor((x - (isOffset ? W_hex * 0.5 : 0)) / W_hex);

      const cx = Math.round(col * W_hex + (isOffset ? W_hex * 0.5 : 0) + W_hex * 0.5);
      const cy = Math.round(row * H_hex + R);

      const isSplit = isVert ? (x < cx) : (y < cy);

      const sxOffset = isVert ? (isSplit ? -W_hex * 0.25 : W_hex * 0.25) : 0;
      const syOffset = !isVert ? (isSplit ? -H_hex * 0.25 : H_hex * 0.25) : 0;

      const scx = Math.max(0, Math.min(w - 1, Math.round(cx + sxOffset)));
      const scy = Math.max(0, Math.min(h - 1, Math.round(cy + syOffset)));
      const sIdx = (scy * w + scx) * 4;

      const idx = (y * w + x) * 4;
      lut.inlineMatch(data[sIdx], data[sIdx + 1], data[sIdx + 2], out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherTriPoly(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const S = Math.max(1, Math.round(16 * scale));

  for (let by = 0; by < h; by += S) {
    const maxBy = Math.min(h, by + S);
    for (let bx = 0; bx < w; bx += S) {
      const maxBx = Math.min(w, bx + S);
      const cx1 = Math.min(w - 1, Math.max(0, bx + Math.floor(S * 0.5)));
      const cy1 = Math.min(h - 1, Math.max(0, by + Math.floor(S * 0.25)));
      const cx2 = Math.min(w - 1, Math.max(0, bx + Math.floor(S * 0.5)));
      const cy2 = Math.min(h - 1, Math.max(0, by + Math.floor(S * 0.75)));

      const idx1 = (cy1 * w + cx1) * 4;
      const idx2 = (cy2 * w + cx2) * 4;

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

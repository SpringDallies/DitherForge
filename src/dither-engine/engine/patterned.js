// Category: Patterned (13 Algorithms)
import { FastPaletteLUT, getLuminance } from './palette.js';

export function ditherBlockTone(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const S = Math.max(4, controls.dotSize !== undefined ? Number(controls.dotSize) : 4);
  const halfS = S / 2;

  for (let by = 0; by < h; by += S) {
    const maxBy = Math.min(h, by + S);
    for (let bx = 0; bx < w; bx += S) {
      const maxBx = Math.min(w, bx + S);
      const cx = bx + halfS, cy = by + halfS;
      const cIdx = (Math.min(h - 1, Math.floor(cy)) * w + Math.min(w - 1, Math.floor(cx))) * 4;
      const lum = getLuminance(data[cIdx], data[cIdx + 1], data[cIdx + 2]);
      const maxR = halfS * 0.95;
      const radius = maxR * Math.sqrt(Math.max(0, 1 - lum / 255));

      for (let y = by; y < maxBy; y++) {
        for (let x = bx; x < maxBx; x++) {
          const idx = (y * w + x) * 4;
          const dist = Math.hypot(x - cx, y - cy);
          const isDot = dist <= radius;
          const offset = isDot ? -64 : 64;
          lut.inlineMatch(
            Math.max(0, Math.min(255, Math.round(data[idx] + offset))),
            Math.max(0, Math.min(255, Math.round(data[idx + 1] + offset))),
            Math.max(0, Math.min(255, Math.round(data[idx + 2] + offset))),
            out,
            idx
          );
          out[idx + 3] = data[idx + 3];
        }
      }
    }
  }
  return out;
}

export function ditherPopTone(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const density = (controls.density !== undefined ? Number(controls.density) : 20) / 100;
  const angle = (controls.variation !== undefined ? Number(controls.variation) : 45) * (Math.PI / 180);
  const S = 12;
  const cosA = Math.cos(angle), sinA = Math.sin(angle);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const rx = x * cosA - y * sinA;
      const ry = x * sinA + y * cosA;
      const cx = (Math.floor(rx / S) + 0.5) * S;
      const cy = (Math.floor(ry / S) + 0.5) * S;

      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const maxR = (S / 2) * (1 + density);
      const radius = maxR * Math.sqrt(Math.max(0, 1 - lum / 255));

      const dist = Math.hypot(rx - cx, ry - cy);
      const offset = dist <= radius ? -96 : 96;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherCamo(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const density = Math.max(3, controls.density !== undefined ? Number(controls.density) : 30);
  const S = Math.max(6, Math.round(200 / density));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cellX = Math.floor(x / S), cellY = Math.floor(y / S);
      let closestDist = Infinity, closestSeedIdx = (y * w + x) * 4;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = cellX + dx, cy = cellY + dy;
          const hashX = (((Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453) % 1) + 1) % 1;
          const hashY = (((Math.sin(cx * 269.5 + cy * 183.3) * 43758.5453) % 1) + 1) % 1;
          const sx = Math.max(0, Math.min(w - 1, Math.round((cx + hashX) * S)));
          const sy = Math.max(0, Math.min(h - 1, Math.round((cy + hashY) * S)));
          const d = Math.hypot(x - sx, y - sy);
          if (d < closestDist) {
            closestDist = d;
            closestSeedIdx = (sy * w + sx) * 4;
          }
        }
      }
      const idx = (y * w + x) * 4;
      lut.inlineMatch(data[closestSeedIdx], data[closestSeedIdx + 1], data[closestSeedIdx + 2], out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherCheckers(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const sizeMap = { small: 4, medium: 8, large: 16 };
  const S = sizeMap[controls.checkersSize] || 8;

  for (let y = 0; y < h; y++) {
    const cy = Math.floor(y / S);
    for (let x = 0; x < w; x++) {
      const cx = Math.floor(x / S);
      const isAlt = ((cx + cy) & 1) === 1;
      const offset = isAlt ? 64 : -64;
      const idx = (y * w + x) * 4;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherCircleGrid(w, h, data, palette) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const S = 10, r = 4;

  for (let y = 0; y < h; y++) {
    const cy = (Math.floor(y / S) + 0.5) * S;
    for (let x = 0; x < w; x++) {
      const cx = (Math.floor(x / S) + 0.5) * S;
      const isCircle = Math.hypot(x - cx, y - cy) <= r;
      const offset = isCircle ? 64 : -64;
      const idx = (y * w + x) * 4;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherCrosshatch(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const spacing = Math.max(1, controls.lineSpacing !== undefined ? Number(controls.lineSpacing) : 1) * 3;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      let isLine = false;

      if (lum < 192 && y % spacing === 0) isLine = true;
      if (lum < 128 && x % spacing === 0) isLine = true;
      if (lum < 64 && (x + y) % spacing === 0) isLine = true;
      if (lum < 32 && (x - y) % spacing === 0) isLine = true;

      const offset = isLine ? -96 : 48;
      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherDiamondGrid(w, h, data, palette) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const S = 12;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const mx = Math.abs((x % S) - S / 2);
      const my = Math.abs((y % S) - S / 2);
      const isDiamond = (mx + my) <= S / 2.5;
      const offset = isDiamond ? 64 : -64;
      const idx = (y * w + x) * 4;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherDiamond(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const S = Math.max(2, controls.period !== undefined ? Number(controls.period) : 8);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const mx = Math.abs((x % S) - S / 2);
      const my = Math.abs((y % S) - S / 2);
      const d = (mx + my) / S;
      const target = 1.0 - lum / 255;
      const offset = d <= target ? -96 : 64;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherGridlockTraffic(w, h, data, palette) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const isLine = ((x + y) % 8 === 0) || ((x - y) % 8 === 0);
      const offset = isLine ? 80 : -40;
      const idx = (y * w + x) * 4;
      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherHeartGrid(w, h, data, palette) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const S = 16;

  for (let y = 0; y < h; y++) {
    const cy = Math.floor(y / S) * S + S / 2;
    for (let x = 0; x < w; x++) {
      const cx = Math.floor(x / S) * S + S / 2;
      const u = (x - cx) / (S * 0.35);
      const v = -(y - cy) / (S * 0.35);
      // Heart curve: (u^2 + v^2 - 1)^3 - u^2 * v^3 <= 0
      const u2 = u * u, v2 = v * v;
      const isHeart = Math.pow(u2 + v2 - 1, 3) - u2 * Math.pow(v, 3) <= 0;
      const offset = isHeart ? 80 : -40;
      const idx = (y * w + x) * 4;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherPrintPattern(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const S = Math.max(3, controls.dotScale !== undefined ? Number(controls.dotScale) : 8);
  const ang45 = Math.PI / 4;
  const cos45 = Math.cos(ang45), sin45 = Math.sin(ang45);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const rx = (x * cos45 - y * sin45);
      const ry = (x * sin45 + y * cos45);
      const wave = (Math.sin(rx / S * Math.PI) * Math.cos(ry / S * Math.PI)) * 64;
      const idx = (y * w + x) * 4;

      lut.inlineMatch(
        Math.round(data[idx] + wave),
        Math.round(data[idx + 1] + wave),
        Math.round(data[idx + 2] + wave),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherSquareMosaic(w, h, data, palette) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const S = 8, gap = 1;

  for (let y = 0; y < h; y++) {
    const isGapY = (y % S) < gap;
    for (let x = 0; x < w; x++) {
      const isGap = isGapY || ((x % S) < gap);
      const idx = (y * w + x) * 4;
      const offset = isGap ? -96 : 32;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherStippling(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const density = controls.dotDensity !== undefined ? Number(controls.dotDensity) : 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const rand = (((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) + 1) % 1;
      const threshold = (1 - lum / 255) * (density * 0.1);
      const offset = rand < threshold ? -128 : 64;

      lut.inlineMatch(
        Math.round(data[idx] + offset),
        Math.round(data[idx + 1] + offset),
        Math.round(data[idx + 2] + offset),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

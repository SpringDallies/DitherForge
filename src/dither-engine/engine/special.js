// Category: Special Effects (17 Algorithms)
import { FastPaletteLUT, getLuminance } from './palette.js';

export function ditherBeehive(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const S = Math.max(2, controls.cellSize !== undefined ? Number(controls.cellSize) : 8);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  for (let y = 0; y < h; y++) {
    const hy = Math.floor(y / S);
    const isShift = (hy & 1) === 1;
    for (let x = 0; x < w; x++) {
      const hx = Math.floor((x - (isShift ? S * 0.5 : 0)) / S);
      const b = bayer[(y & 3) * 4 + (x & 3)] / 16;
      const offset = (b - 0.5) * 64;
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

export function ditherDiagonal(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const sens = controls.edgeSensitivity !== undefined ? Number(controls.edgeSensitivity) : 1;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      // Sobel gradient approximation
      const lumL = getLuminance(data[idx - 4], data[idx - 3], data[idx - 2]);
      const lumR = getLuminance(data[idx + 4], data[idx + 5], data[idx + 6]);
      const lumU = getLuminance(data[idx - w * 4], data[idx - w * 4 + 1], data[idx - w * 4 + 2]);
      const lumD = getLuminance(data[idx + w * 4], data[idx + w * 4 + 1], data[idx + w * 4 + 2]);
      const grad = (Math.abs(lumR - lumL) + Math.abs(lumD - lumU)) * (sens * 0.5);

      const diag = ((x + y) % 4 < 2) ? 32 : -32;
      const offset = grad > 50 ? 128 : diag;

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

export function ditherDisplaceContour(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const thresh = (controls.contourThreshold !== undefined ? Number(controls.contourThreshold) : 50) * 0.1;
  const lineSpacing = Math.max(1, controls.lineSpacing !== undefined ? Number(controls.lineSpacing) : 1) * 8;
  const lineMode = controls.lineMode !== undefined ? Number(controls.lineMode) : 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const displaced = y + (lum / 255) * thresh;
      const isContour = (displaced % lineSpacing) < lineMode * 2;
      const offset = isContour ? 96 : -48;

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

export function ditherDottedLines(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const density = controls.lineDensity !== undefined ? Number(controls.lineDensity) : 10;
  const dotting = (controls.dotting !== undefined ? Number(controls.dotting) : 40) / 100;
  const angle = (controls.lineAngle !== undefined ? Number(controls.lineAngle) : 45) * (Math.PI / 180);
  const cosA = Math.cos(angle), sinA = Math.sin(angle);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const rx = x * cosA + y * sinA;
      const ry = -x * sinA + y * cosA;
      const lineWave = Math.sin(rx / density * Math.PI);
      const dotWave = Math.sin(ry / 4 * Math.PI) * dotting;
      const wave = (lineWave + dotWave) * 64;
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

export function ditherNoise(w, h, data, palette) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const offset = (Math.random() - 0.5) * 128;
    lut.inlineMatch(
      Math.round(data[i] + offset),
      Math.round(data[i + 1] + offset),
      Math.round(data[i + 2] + offset),
      out,
      i
    );
    out[i + 3] = data[i + 3];
  }
  return out;
}

// Orb Family Generator Helper
function generateOrbs(w, h, count, size, intensity, randomVal, offsetVal, isVertical) {
  const orbs = [];
  const offX = isVertical ? 0 : offsetVal;
  const offY = isVertical ? offsetVal : 0;
  for (let i = 0; i < count; i++) {
    const hashX = (((Math.sin(i * 127.1) * 43758.5453) % 1) + 1) % 1;
    const hashY = (((Math.sin(i * 311.7) * 43758.5453) % 1) + 1) % 1;
    const gx = ((i + 0.5) / count) * w;
    const gy = ((i + 0.5) / count) * h;
    const jx = (hashX - 0.5) * (randomVal / 100) * w;
    const jy = (hashY - 0.5) * (randomVal / 100) * h;
    orbs.push({
      x: Math.max(0, Math.min(w, gx + jx + offX)),
      y: Math.max(0, Math.min(h, gy + jy + offY)),
      size,
      intensity: (intensity / 100) * 128
    });
  }
  return orbs;
}

export function ditherOrbDiffuse(w, h, data, palette, controls = {}) {
  const count = controls.orbCount !== undefined ? Number(controls.orbCount) : 8;
  const size = controls.orbSize !== undefined ? Number(controls.orbSize) : 80;
  const intensity = controls.orbIntensity !== undefined ? Number(controls.orbIntensity) : 60;
  const randomVal = controls.orbRandom !== undefined ? Number(controls.orbRandom) : 0;
  const offsetVal = controls.orbOffset !== undefined ? Number(controls.orbOffset) : 0;
  const isVert = !!controls.orbVertical;
  const orbs = generateOrbs(w, h, count, size, intensity, randomVal, offsetVal, isVert);

  const modData = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let boost = 0;
      for (const o of orbs) {
        const d = Math.hypot(x - o.x, y - o.y);
        if (d < o.size) boost += o.intensity * (1 - d / o.size);
      }
      const idx = (y * w + x) * 4;
      modData[idx] = Math.min(255, modData[idx] + boost);
      modData[idx + 1] = Math.min(255, modData[idx + 1] + boost);
      modData[idx + 2] = Math.min(255, modData[idx + 2] + boost);
    }
  }

  // Floyd-Steinberg error diffusion on boosted buffer
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const errRing = new Float32Array(2 * w * 3);
  for (let y = 0; y < h; y++) {
    const curR = (y & 1) * w * 3, nextR = ((y + 1) & 1) * w * 3;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4, eIdx = curR + x * 3;
      const r = modData[idx] + errRing[eIdx];
      const g = modData[idx + 1] + errRing[eIdx + 1];
      const b = modData[idx + 2] + errRing[eIdx + 2];
      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];
      const er = r - out[idx], eg = g - out[idx + 1], eb = b - out[idx + 2];
      if (x + 1 < w) {
        errRing[curR + (x + 1) * 3] += er * (7/16);
        errRing[curR + (x + 1) * 3 + 1] += eg * (7/16);
        errRing[curR + (x + 1) * 3 + 2] += eb * (7/16);
      }
      if (y + 1 < h) {
        if (x - 1 >= 0) {
          errRing[nextR + (x - 1) * 3] += er * (3/16);
          errRing[nextR + (x - 1) * 3 + 1] += eg * (3/16);
          errRing[nextR + (x - 1) * 3 + 2] += eb * (3/16);
        }
        errRing[nextR + x * 3] += er * (5/16);
        errRing[nextR + x * 3 + 1] += eg * (5/16);
        errRing[nextR + x * 3 + 2] += eb * (5/16);
        if (x + 1 < w) {
          errRing[nextR + (x + 1) * 3] += er * (1/16);
          errRing[nextR + (x + 1) * 3 + 1] += eg * (1/16);
          errRing[nextR + (x + 1) * 3 + 2] += eb * (1/16);
        }
      }
    }
    for (let i = 0; i < w * 3; i++) errRing[curR + i] = 0;
  }
  return out;
}

export function ditherOrbDiffuseX(w, h, data, palette, controls = {}) {
  return ditherOrbDiffuse(w, h, data, palette, controls);
}

export function ditherOrbDiffuseY(w, h, data, palette, controls = {}) {
  return ditherOrbDiffuse(w, h, data, palette, controls);
}

export function ditherOrbMatrix(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const count = controls.orbCount !== undefined ? Number(controls.orbCount) : 8;
  const size = controls.orbSize !== undefined ? Number(controls.orbSize) : 80;
  const intensity = controls.orbIntensity !== undefined ? Number(controls.orbIntensity) : 60;
  const orbs = generateOrbs(w, h, count, size, intensity, 0, 0, false);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let boost = 0;
      for (const o of orbs) {
        const d = Math.hypot(x - o.x, y - o.y);
        if (d < o.size) boost += o.intensity * (1 - d / o.size);
      }
      const b = (bayer[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 64;
      const idx = (y * w + x) * 4;

      lut.inlineMatch(
        Math.round(data[idx] + boost + b),
        Math.round(data[idx + 1] + boost + b),
        Math.round(data[idx + 2] + boost + b),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherRadialBurst(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const divisor = Math.max(1, controls.divisor !== undefined ? Number(controls.divisor) : 5);
  const cx = w / 2, cy = h / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const wave = Math.sin(d / divisor) * 64;
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

export function ditherRadialPeaks(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const peakThresh = (controls.peakThreshold !== undefined ? Number(controls.peakThreshold) : 50) / 50 * 255;
  const minDist = Math.max(10, controls.minPeakDistance !== undefined ? Number(controls.minPeakDistance) : 60);
  const maxPeaks = Math.max(1, controls.maxPeaks !== undefined ? Number(controls.maxPeaks) : 20);
  const divisor = Math.max(1, controls.divisor !== undefined ? Number(controls.divisor) : 5);
  const isInterference = !!controls.interference;

  const peaks = [];
  const minD2 = minDist * minDist;

  for (let y = 2; y < h - 2; y += 4) {
    for (let x = 2; x < w - 2; x += 4) {
      if (peaks.length >= maxPeaks) break;
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      if (lum >= peakThresh) {
        let valid = true;
        for (const pk of peaks) {
          const dx = x - pk.x, dy = y - pk.y;
          if (dx * dx + dy * dy < minD2) { valid = false; break; }
        }
        if (valid) peaks.push({ x, y });
      }
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let wave = 0;
      if (peaks.length > 0) {
        if (isInterference) {
          for (const pk of peaks) {
            wave += Math.sin(Math.hypot(x - pk.x, y - pk.y) / divisor);
          }
          wave = (wave / peaks.length) * 64;
        } else {
          let closest = Infinity;
          for (const pk of peaks) {
            const d = Math.hypot(x - pk.x, y - pk.y);
            if (d < closest) closest = d;
          }
          wave = Math.sin(closest / divisor) * 64;
        }
      }
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

export function ditherSineDistort(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const freqA = controls.freqA !== undefined ? Number(controls.freqA) : 8;
  const freqB = controls.freqB !== undefined ? Number(controls.freqB) : 12;
  const angle = (controls.angle !== undefined ? Number(controls.angle) : 45) * (Math.PI / 180);
  const cosA = Math.cos(angle), sinA = Math.sin(angle);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const rx = x * cosA + y * sinA;
      const wave = (Math.sin((x * freqA) / 100) + Math.sin((rx * freqB) / 100)) * 48;
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

export function ditherSineWaveModulation(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const freq = controls.waveFrequency !== undefined ? Number(controls.waveFrequency) : 5;
  const thresh = controls.waveThreshold !== undefined ? Number(controls.waveThreshold) : 10;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wave = Math.sin((x * freq) / 50 + (y * freq) / 50) * thresh * 4;
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

export function ditherThresholder(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const freq = controls.modulationFrequency !== undefined ? Number(controls.modulationFrequency) : 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let wave = 0;
      for (let k = 1; k <= 4; k++) {
        wave += (1 / k) * Math.sin((k * freq * x) / 20 + y / 20);
      }
      wave *= 48;
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

export function ditherTopography(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const warp = controls.warpIntensity !== undefined ? Number(controls.warpIntensity) : 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const warpedLum = lum + Math.sin(x / 10) * Math.cos(y / 10) * warp * 15;
      const isContour = (warpedLum % 32) < 4;
      const offset = isContour ? 80 : -40;

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

export function ditherVortex(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const swirl = Math.max(1, controls.swirl !== undefined ? Number(controls.swirl) : 5);
  const cx = w / 2, cy = h / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const theta = Math.atan2(y - cy, x - cx);
      const wave = Math.sin(theta * 4 + d / swirl) * 64;
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

export function ditherWave(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const freq = controls.frequency !== undefined ? Number(controls.frequency) : 5;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wave = Math.sin((x * freq) / 20) * 64;
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

// Category: Glitch Effects (17 Algorithms)
import { FastPaletteLUT, getLuminance } from './palette.js';

// 1. Uniform Modulation X (Vertical 1D with Horizontal Bleed & EMA)
export function ditherUniformModulationX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const scale = controls.lineScale !== undefined ? Number(controls.lineScale) : 1;
  const bleed = (controls.bleedFraction !== undefined ? Number(controls.bleedFraction) : 0) / 100;
  const enableSmooth = !!controls.smoothingFactor;

  const errCurr = new Float32Array(w * 3);
  const errNext = new Float32Array(w * 3);
  let emaR = 0, emaG = 0, emaB = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const eIdx = x * 3;

      let r = (data[idx] - 128) * scale + 128 + errCurr[eIdx];
      let g = (data[idx + 1] - 128) * scale + 128 + errCurr[eIdx + 1];
      let b = (data[idx + 2] - 128) * scale + 128 + errCurr[eIdx + 2];

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      let errR = r - out[idx];
      let errG = g - out[idx + 1];
      let errB = b - out[idx + 2];

      if (enableSmooth) {
        emaR = 0.5 * errR + 0.5 * emaR;
        emaG = 0.5 * errG + 0.5 * emaG;
        emaB = 0.5 * errB + 0.5 * emaB;
        errR = emaR; errG = emaG; errB = emaB;
      }

      const downWeight = 1 - bleed;
      errNext[eIdx] += errR * downWeight;
      errNext[eIdx + 1] += errG * downWeight;
      errNext[eIdx + 2] += errB * downWeight;

      if (bleed > 0) {
        const side = bleed * 0.5;
        if (x > 0) {
          errNext[eIdx - 3] += errR * side;
          errNext[eIdx - 2] += errG * side;
          errNext[eIdx - 1] += errB * side;
        }
        if (x < w - 1) {
          errNext[eIdx + 3] += errR * side;
          errNext[eIdx + 4] += errG * side;
          errNext[eIdx + 5] += errB * side;
        }
      }
    }
    errCurr.set(errNext);
    errNext.fill(0);
  }
  return out;
}

// 2. Uniform Modulation Y (Horizontal 1D with Vertical Bleed & EMA)
export function ditherUniformModulationY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const scale = controls.lineScale !== undefined ? Number(controls.lineScale) : 1;
  const bleed = (controls.bleedFraction !== undefined ? Number(controls.bleedFraction) : 0) / 100;
  const enableSmooth = !!controls.smoothingFactor;

  const errCurr = new Float32Array(h * 3);
  const errNext = new Float32Array(h * 3);
  let emaR = 0, emaG = 0, emaB = 0;

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4;
      const eIdx = y * 3;

      let r = (data[idx] - 128) * scale + 128 + errCurr[eIdx];
      let g = (data[idx + 1] - 128) * scale + 128 + errCurr[eIdx + 1];
      let b = (data[idx + 2] - 128) * scale + 128 + errCurr[eIdx + 2];

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      let errR = r - out[idx];
      let errG = g - out[idx + 1];
      let errB = b - out[idx + 2];

      if (enableSmooth) {
        emaR = 0.5 * errR + 0.5 * emaR;
        emaG = 0.5 * errG + 0.5 * emaG;
        emaB = 0.5 * errB + 0.5 * emaB;
        errR = emaR; errG = emaG; errB = emaB;
      }

      const forward = 1 - bleed;
      errNext[eIdx] += errR * forward;
      errNext[eIdx + 1] += errG * forward;
      errNext[eIdx + 2] += errB * forward;

      if (bleed > 0) {
        const side = bleed * 0.5;
        if (y > 0) {
          errNext[eIdx - 3] += errR * side;
          errNext[eIdx - 2] += errG * side;
          errNext[eIdx - 1] += errB * side;
        }
        if (y < h - 1) {
          errNext[eIdx + 3] += errR * side;
          errNext[eIdx + 4] += errG * side;
          errNext[eIdx + 5] += errB * side;
        }
      }
    }
    errCurr.set(errNext);
    errNext.fill(0);
  }
  return out;
}

// 3. Artifact Modulation Glitch (1D Horizontal Streaming)
export function ditherArtifactModulationGlitch(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const scale = controls.lineScale !== undefined ? 1 + Number(controls.lineScale) * 0.15 : 1.5;

  for (let y = 0; y < h; y++) {
    let errR = 0, errG = 0, errB = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = (data[idx] - 128) * scale + 128 + errR;
      const g = (data[idx + 1] - 128) * scale + 128 + errG;
      const b = (data[idx + 2] - 128) * scale + 128 + errB;

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      errR = r - out[idx];
      errG = g - out[idx + 1];
      errB = b - out[idx + 2];
    }
  }
  return out;
}

// 4. Atkinson Line Modulation
export function ditherAtkinsonLineModulation(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const modStrength = controls.modulationStrength !== undefined ? Number(controls.modulationStrength) : 5;
  const hBias = controls.horizontalBias !== undefined ? Number(controls.horizontalBias) : 5;
  const errRing = new Float32Array(3 * w * 3);

  for (let y = 0; y < h; y++) {
    const r0 = (y % 3) * w * 3;
    const r1 = ((y + 1) % 3) * w * 3;
    const r2 = ((y + 2) % 3) * w * 3;

    // Sinusoidal modulation of horizontal bias
    const wave = Math.sin((y * modStrength) / 5);
    const bias = 1.0 + (hBias / 10) * wave;
    const hWeight = 0.125 * bias;
    const vWeight = 0.125 * (2 - bias);

    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const eIdx = r0 + x * 3;
      const r = data[idx] + errRing[eIdx];
      const g = data[idx + 1] + errRing[eIdx + 1];
      const b = data[idx + 2] + errRing[eIdx + 2];

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      const errR = (r - out[idx]) * 0.75;
      const errG = (g - out[idx + 1]) * 0.75;
      const errB = (b - out[idx + 2]) * 0.75;

      if (x + 1 < w) {
        errRing[r0 + (x + 1) * 3] += errR * hWeight;
        errRing[r0 + (x + 1) * 3 + 1] += errG * hWeight;
        errRing[r0 + (x + 1) * 3 + 2] += errB * hWeight;
      }
      if (x + 2 < w) {
        errRing[r0 + (x + 2) * 3] += errR * hWeight;
        errRing[r0 + (x + 2) * 3 + 1] += errG * hWeight;
        errRing[r0 + (x + 2) * 3 + 2] += errB * hWeight;
      }
      if (y + 1 < h) {
        if (x - 1 >= 0) {
          errRing[r1 + (x - 1) * 3] += errR * vWeight;
          errRing[r1 + (x - 1) * 3 + 1] += errG * vWeight;
          errRing[r1 + (x - 1) * 3 + 2] += errB * vWeight;
        }
        errRing[r1 + x * 3] += errR * vWeight;
        errRing[r1 + x * 3 + 1] += errG * vWeight;
        errRing[r1 + x * 3 + 2] += errB * vWeight;
        if (x + 1 < w) {
          errRing[r1 + (x + 1) * 3] += errR * vWeight;
          errRing[r1 + (x + 1) * 3 + 1] += errG * vWeight;
          errRing[r1 + (x + 1) * 3 + 2] += errB * vWeight;
        }
      }
      if (y + 2 < h) {
        errRing[r2 + x * 3] += errR * vWeight;
        errRing[r2 + x * 3 + 1] += errG * vWeight;
        errRing[r2 + x * 3 + 2] += errB * vWeight;
      }
    }
    for (let i = 0; i < w * 3; i++) errRing[r0 + i] = 0;
  }
  return out;
}

// 5. Atkinson VHS
export function ditherAtkinsonVHS(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const lineCount = controls.lineCount !== undefined ? Number(controls.lineCount) : 1;

  // Pick random glitch rows
  const glitchRows = new Set();
  for (let i = 0; i < lineCount; i++) {
    glitchRows.add(Math.floor(((i * 73 + 17) % h)));
  }

  for (let y = 0; y < h; y++) {
    const isGlitch = glitchRows.has(y);
    const shift = isGlitch ? Math.floor(Math.sin(y * 12.3) * 15) : 0;
    let errR = 0, errG = 0, errB = 0;

    for (let x = 0; x < w; x++) {
      const srcX = Math.max(0, Math.min(w - 1, x + shift));
      const idx = (y * w + srcX) * 4;
      const targetIdx = (y * w + x) * 4;

      const mult = isGlitch ? 2.5 : 1.0;
      const r = data[idx] + errR * mult;
      const g = data[idx + 1] + errG * mult;
      const b = data[idx + 2] + errB * mult;

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, targetIdx);
      out[targetIdx + 3] = data[idx + 3];

      errR = (r - out[targetIdx]) * 0.75;
      errG = (g - out[targetIdx + 1]) * 0.75;
      errB = (b - out[targetIdx + 2]) * 0.75;
    }
  }
  return out;
}

// 6. Contrast Aware X (Vertical 1D with edge damping)
export function ditherContrastAwareX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const scale = controls.lineScale !== undefined ? Number(controls.lineScale) : 1;
  const errBuf = new Float32Array(w * 3);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const eIdx = x * 3;

      const r = data[idx] + errBuf[eIdx];
      const g = data[idx + 1] + errBuf[eIdx + 1];
      const b = data[idx + 2] + errBuf[eIdx + 2];

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      let errR = r - out[idx];
      let errG = g - out[idx + 1];
      let errB = b - out[idx + 2];

      // Edge detection with next row
      let damp = 1.0;
      if (y + 1 < h) {
        const nextIdx = ((y + 1) * w + x) * 4;
        const diff = Math.abs(getLuminance(data[idx], data[idx + 1], data[idx + 2]) -
                              getLuminance(data[nextIdx], data[nextIdx + 1], data[nextIdx + 2])) / 255;
        damp = Math.exp(-diff * scale);
      }
      errBuf[eIdx] = errR * damp;
      errBuf[eIdx + 1] = errG * damp;
      errBuf[eIdx + 2] = errB * damp;
    }
  }
  return out;
}

// 7. Contrast Aware Y (Horizontal 1D with edge damping)
export function ditherContrastAwareY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const scale = controls.lineScale !== undefined ? Number(controls.lineScale) : 1;

  for (let y = 0; y < h; y++) {
    let errR = 0, errG = 0, errB = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx] + errR;
      const g = data[idx + 1] + errG;
      const b = data[idx + 2] + errB;

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      const diff = x + 1 < w ? Math.abs(getLuminance(data[idx], data[idx + 1], data[idx + 2]) -
                                        getLuminance(data[idx + 4], data[idx + 5], data[idx + 6])) / 255 : 0;
      const damp = Math.exp(-diff * scale);

      errR = (r - out[idx]) * damp;
      errG = (g - out[idx + 1]) * damp;
      errB = (b - out[idx + 2]) * damp;
    }
  }
  return out;
}

// 8. Glitch
export function ditherGlitch(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const intensity = controls.glitchIntensity !== undefined ? Number(controls.glitchIntensity) : 1;

  for (let y = 0; y < h; y++) {
    const isGlitchRow = ((y * 17 + 13) % 25) < intensity;
    const shift = isGlitchRow ? Math.floor(Math.sin(y * 0.5) * intensity * 4) : 0;

    for (let x = 0; x < w; x++) {
      const srcX = Math.max(0, Math.min(w - 1, x + shift));
      const idx = (y * w + srcX) * 4;
      const targetIdx = (y * w + x) * 4;

      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      if (isGlitchRow && (x % 7 === 0)) {
        r ^= (intensity * 8);
        g ^= (intensity * 4);
      }

      lut.inlineMatch(r, g, b, out, targetIdx);
      out[targetIdx + 3] = data[idx + 3];
    }
  }
  return out;
}

// 9. Modulated Diffuse X & 10. Modulated Diffuse Y
export function ditherModulatedDiffuseX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const scale = controls.lineScale !== undefined ? Number(controls.lineScale) : 1;
  const errBuf = new Float32Array(w * 3);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const eIdx = x * 3;
      const r = (data[idx] - 128) * scale + 128 + errBuf[eIdx];
      const g = (data[idx + 1] - 128) * scale + 128 + errBuf[eIdx + 1];
      const b = (data[idx + 2] - 128) * scale + 128 + errBuf[eIdx + 2];

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      errBuf[eIdx] = r - out[idx];
      errBuf[eIdx + 1] = g - out[idx + 1];
      errBuf[eIdx + 2] = b - out[idx + 2];
    }
  }
  return out;
}

export function ditherModulatedDiffuseY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const scale = controls.lineScale !== undefined ? Number(controls.lineScale) : 1;

  for (let y = 0; y < h; y++) {
    let errR = 0, errG = 0, errB = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = (data[idx] - 128) * scale + 128 + errR;
      const g = (data[idx + 1] - 128) * scale + 128 + errG;
      const b = (data[idx + 2] - 128) * scale + 128 + errB;

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      errR = r - out[idx];
      errG = g - out[idx + 1];
      errB = b - out[idx + 2];
    }
  }
  return out;
}

// 11. Ordered Modulation
export function ditherOrderedModulation(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const scale = controls.lineScale !== undefined ? Number(controls.lineScale) : 5;
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const b = bayer[(y & 3) * 4 + (x & 3)] / 16;
      const wave = Math.sin((x + y) * 0.25) * (scale * 2.5);
      const mod = (b - 0.5) * 64 + wave;

      lut.inlineMatch(
        Math.round(data[idx] + mod),
        Math.round(data[idx + 1] + mod),
        Math.round(data[idx + 2] + mod),
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

// 12. Smooth Diffuse
export function ditherSmoothDiffuse(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const scale = controls.lineScale !== undefined ? Number(controls.lineScale) / 5 : 1.0;
  const smooth = controls.smoothness !== undefined ? Number(controls.smoothness) : 5;
  const alpha = 1.0 / (1.0 + smooth);

  for (let y = 0; y < h; y++) {
    let errR = 0, errG = 0, errB = 0;
    let emaR = 0, emaG = 0, emaB = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx] + errR * scale;
      const g = data[idx + 1] + errG * scale;
      const b = data[idx + 2] + errB * scale;

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      const rawR = r - out[idx];
      const rawG = g - out[idx + 1];
      const rawB = b - out[idx + 2];

      emaR = alpha * rawR + (1 - alpha) * emaR;
      emaG = alpha * rawG + (1 - alpha) * emaG;
      emaB = alpha * rawB + (1 - alpha) * emaB;

      errR = emaR; errG = emaG; errB = emaB;
    }
  }
  return out;
}

// 13. Stucki Diffusion Lines
export function ditherStuckiDiffusionLines(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const emphasis = controls.lineEmphasis !== undefined ? Number(controls.lineEmphasis) / 5 : 1.0;
  // Stucki kernel with emphasized horizontal weight
  const kernel = [
    [1, 0, 8 * emphasis], [2, 0, 4 * emphasis],
    [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2],
    [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]
  ];
  let sum = 0;
  for (const k of kernel) sum += k[2];

  const out = new Uint8ClampedArray(data.length);
  const errRing = new Float32Array(3 * w * 3);

  for (let y = 0; y < h; y++) {
    const r0 = (y % 3) * w * 3;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const eIdx = r0 + x * 3;
      const r = data[idx] + errRing[eIdx];
      const g = data[idx + 1] + errRing[eIdx + 1];
      const b = data[idx + 2] + errRing[eIdx + 2];

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      const errR = r - out[idx];
      const errG = g - out[idx + 1];
      const errB = b - out[idx + 2];

      for (const [kdx, kdy, weight] of kernel) {
        const tx = x + kdx, ty = y + kdy;
        if (tx >= 0 && tx < w && ty < h) {
          const tRow = (ty % 3) * w * 3;
          const factor = weight / sum;
          errRing[tRow + tx * 3] += errR * factor;
          errRing[tRow + tx * 3 + 1] += errG * factor;
          errRing[tRow + tx * 3 + 2] += errB * factor;
        }
      }
    }
    for (let i = 0; i < w * 3; i++) errRing[r0 + i] = 0;
  }
  return out;
}

// 14. Wave Modulation X & 15. Wave Modulation Y
export function ditherWaveModulationX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const freq = controls.frequency !== undefined ? Number(controls.frequency) : 5;
  const amp = (controls.amplitude !== undefined ? Number(controls.amplitude) : 50) / 100;
  const errBuf = new Float32Array(w * 3);

  for (let y = 0; y < h; y++) {
    const wave = 1.0 + amp * Math.sin((2 * Math.PI * freq * y) / h);
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const eIdx = x * 3;
      const r = data[idx] + errBuf[eIdx];
      const g = data[idx + 1] + errBuf[eIdx + 1];
      const b = data[idx + 2] + errBuf[eIdx + 2];

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      errBuf[eIdx] = (r - out[idx]) * wave;
      errBuf[eIdx + 1] = (g - out[idx + 1]) * wave;
      errBuf[eIdx + 2] = (b - out[idx + 2]) * wave;
    }
  }
  return out;
}

export function ditherWaveModulationY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const freq = controls.frequency !== undefined ? Number(controls.frequency) : 5;
  const amp = (controls.amplitude !== undefined ? Number(controls.amplitude) : 50) / 100;

  for (let y = 0; y < h; y++) {
    let errR = 0, errG = 0, errB = 0;
    for (let x = 0; x < w; x++) {
      const wave = 1.0 + amp * Math.sin((2 * Math.PI * freq * x) / w);
      const idx = (y * w + x) * 4;
      const r = data[idx] + errR;
      const g = data[idx + 1] + errG;
      const b = data[idx + 2] + errB;

      lut.inlineMatch(Math.round(r), Math.round(g), Math.round(b), out, idx);
      out[idx + 3] = data[idx + 3];

      errR = (r - out[idx]) * wave;
      errG = (g - out[idx + 1]) * wave;
      errB = (b - out[idx + 2]) * wave;
    }
  }
  return out;
}

// 16. Waveform & 17. Waveform Alt
export function ditherWaveform(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const density = controls.waveDensity !== undefined ? Number(controls.waveDensity) : 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const wave = Math.sin((x * density) / 10 + (lum / 255) * Math.PI * 2) * 64;

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

export function ditherWaveformAlt(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette);
  const out = new Uint8ClampedArray(data.length);
  const blend = controls.modulationBlend !== undefined ? Number(controls.modulationBlend) / 10 : 0.5;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const freqWave = Math.sin((x * lum * 0.05) / 10);
      const ampWave = Math.cos(x * 0.2) * (lum / 255);
      const wave = (freqWave * blend + ampWave * (1 - blend)) * 64;

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

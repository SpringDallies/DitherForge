// Category: Glitch Effects (17 Algorithms)
import { FastPaletteLUT, getLuminance } from './palette.js';

// Helper for 1D horizontal diffusion
function run1DHorizontalDiffusion(w, h, data, lut, getWeight, diffMult = 1.0) {
  const out = new Uint8ClampedArray(data.length);
  const maxErr = 128;

  if (lut.isTonalRamp) {
    const N = lut.paletteSize;
    for (let y = 0; y < h; y++) {
      let err = 0;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        const curLum = Math.max(0, Math.min(255, lum + err));

        const t = (curLum / 255) * (N - 1);
        const chosenIdx = Math.max(0, Math.min(N - 1, Math.round(t)));
        const col = lut.rawPalette[chosenIdx];

        out[idx] = col[0];
        out[idx + 1] = col[1];
        out[idx + 2] = col[2];
        out[idx + 3] = data[idx + 3];

        const wgt = getWeight(x, y) * diffMult;
        err = Math.max(-maxErr, Math.min(maxErr, (curLum - lut.luminances[chosenIdx]) * wgt));
      }
    }
  } else {
    for (let y = 0; y < h; y++) {
      let errR = 0, errG = 0, errB = 0;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = Math.max(0, Math.min(255, data[idx] + errR));
        const g = Math.max(0, Math.min(255, data[idx + 1] + errG));
        const b = Math.max(0, Math.min(255, data[idx + 2] + errB));

        lut.inlineMatch(r, g, b, out, idx);
        out[idx + 3] = data[idx + 3];

        const wgt = getWeight(x, y) * diffMult;
        errR = Math.max(-maxErr, Math.min(maxErr, (r - out[idx]) * wgt));
        errG = Math.max(-maxErr, Math.min(maxErr, (g - out[idx + 1]) * wgt));
        errB = Math.max(-maxErr, Math.min(maxErr, (b - out[idx + 2]) * wgt));
      }
    }
  }
  return out;
}

// Helper for 1D vertical diffusion
function run1DVerticalDiffusion(w, h, data, lut, getWeight, diffMult = 1.0) {
  const out = new Uint8ClampedArray(data.length);
  const maxErr = 128;

  if (lut.isTonalRamp) {
    const N = lut.paletteSize;
    const errBuf = new Float32Array(w);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        const curLum = Math.max(0, Math.min(255, lum + errBuf[x]));

        const t = (curLum / 255) * (N - 1);
        const chosenIdx = Math.max(0, Math.min(N - 1, Math.round(t)));
        const col = lut.rawPalette[chosenIdx];

        out[idx] = col[0];
        out[idx + 1] = col[1];
        out[idx + 2] = col[2];
        out[idx + 3] = data[idx + 3];

        const wgt = getWeight(x, y) * diffMult;
        errBuf[x] = Math.max(-maxErr, Math.min(maxErr, (curLum - lut.luminances[chosenIdx]) * wgt));
      }
    }
  } else {
    const errBuf = new Float32Array(w * 3);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const eIdx = x * 3;
        const r = Math.max(0, Math.min(255, data[idx] + errBuf[eIdx]));
        const g = Math.max(0, Math.min(255, data[idx + 1] + errBuf[eIdx + 1]));
        const b = Math.max(0, Math.min(255, data[idx + 2] + errBuf[eIdx + 2]));

        lut.inlineMatch(r, g, b, out, idx);
        out[idx + 3] = data[idx + 3];

        const wgt = getWeight(x, y) * diffMult;
        errBuf[eIdx] = Math.max(-maxErr, Math.min(maxErr, (r - out[idx]) * wgt));
        errBuf[eIdx + 1] = Math.max(-maxErr, Math.min(maxErr, (g - out[idx + 1]) * wgt));
        errBuf[eIdx + 2] = Math.max(-maxErr, Math.min(maxErr, (b - out[idx + 2]) * wgt));
      }
    }
  }
  return out;
}

export function ditherUniformModulationX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const scale = controls.lineScale !== undefined ? Number(controls.lineScale) : (controls.intensity !== undefined ? Number(controls.intensity) / 10 : 1);
  const s = controls.scale !== undefined ? Number(controls.scale) : 1.0;
  const rawSpacing = controls.lineSpacing !== undefined ? Number(controls.lineSpacing) : 1;
  const spacing = Math.max(1, Math.round(rawSpacing * s));
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;
  return run1DHorizontalDiffusion(w, h, data, lut, (x, y) => {
    return (y % (spacing * 2) < spacing) ? 1.0 * scale : 0.5 * scale;
  }, diffMult);
}

export function ditherUniformModulationY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const scale = controls.lineScale !== undefined ? Number(controls.lineScale) : (controls.intensity !== undefined ? Number(controls.intensity) / 10 : 1);
  const s = controls.scale !== undefined ? Number(controls.scale) : 1.0;
  const rawSpacing = controls.lineSpacing !== undefined ? Number(controls.lineSpacing) : 1;
  const spacing = Math.max(1, Math.round(rawSpacing * s));
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;
  return run1DVerticalDiffusion(w, h, data, lut, (x, y) => {
    return (x % (spacing * 2) < spacing) ? 1.0 * scale : 0.5 * scale;
  }, diffMult);
}

export function ditherArtifactModulationGlitch(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const intensity = controls.intensity !== undefined ? Number(controls.intensity) : (controls.lineScale !== undefined ? Number(controls.lineScale) * 10 : 50);
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
  const shift = (intensity / 100) * 16 * s;
  const bayer = [0.5/4, 2.5/4, 3.5/4, 1.5/4];

  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / s);
    const isGlitchRow = ((sy ^ (sy >> 2)) % 7 === 0);
    const rowOffset = isGlitchRow ? Math.round(Math.sin(sy * 12.9898) * shift) : 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const sx = Math.max(0, Math.min(w - 1, x + rowOffset));
      const sIdx = (y * w + sx) * 4;

      const sxCoord = Math.floor(x / s);
      const bVal = bayer[(sy & 1) * 2 + (sxCoord & 1)];
      const threshold = isGlitchRow ? (bVal > 0.5 ? 0.3 : 0.7) : bVal;

      lut.inlinePairMatch(
        data[sIdx],
        data[sIdx + 1],
        data[sIdx + 2],
        threshold,
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherAtkinsonLineModulation(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const s = controls.scale !== undefined ? Number(controls.scale) : 1.0;
  const rawSpacing = controls.lineSpacing !== undefined ? Number(controls.lineSpacing) : 4;
  const spacing = Math.max(2, Math.round(rawSpacing * s));
  const emphasis = controls.lineEmphasis !== undefined ? Number(controls.lineEmphasis) : (controls.modulationStrength !== undefined ? Number(controls.modulationStrength) : 5);
  const horizBias = controls.horizontalBias !== undefined ? Number(controls.horizontalBias) / 5 : 1.0;
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;

  return run1DHorizontalDiffusion(w, h, data, lut, (x, y) => {
    const isLine = (y % spacing === 0);
    const weight = isLine ? 0.75 * (1 + emphasis * 0.1) : 0.75 * 0.6;
    return weight * horizBias;
  }, diffMult);
}

export function ditherAtkinsonVHS(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const s = controls.scale !== undefined ? Number(controls.scale) : 1.0;
  const rawJitter = controls.lineCount !== undefined ? Number(controls.lineCount) * 2 : (controls.jitter !== undefined ? Number(controls.jitter) : 5);
  const jitterAmount = rawJitter * s;
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;

  const shiftedData = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    const isJitter = Math.sin(y * 78.233) > 0.85;
    const jx = isJitter ? Math.round((Math.sin(y * 12.9898) - 0.5) * jitterAmount * 2) : 0;
    for (let x = 0; x < w; x++) {
      const sx = Math.max(0, Math.min(w - 1, x + jx));
      const srcIdx = (y * w + sx) * 4;
      const dstIdx = (y * w + x) * 4;
      shiftedData[dstIdx] = data[srcIdx];
      shiftedData[dstIdx + 1] = data[srcIdx + 1];
      shiftedData[dstIdx + 2] = data[srcIdx + 2];
      shiftedData[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return run1DHorizontalDiffusion(w, h, shiftedData, lut, () => 0.75, diffMult);
}

export function ditherContrastAwareX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const sensitivity = controls.lineScale !== undefined ? Number(controls.lineScale) : (controls.contrastSensitivity !== undefined ? Number(controls.contrastSensitivity) : 5);
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;
  return run1DHorizontalDiffusion(w, h, data, lut, (x, y) => {
    const idx = (y * w + x) * 4;
    const nextIdx = (y * w + Math.min(w - 1, x + 1)) * 4;
    const l1 = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
    const l2 = getLuminance(data[nextIdx], data[nextIdx + 1], data[nextIdx + 2]);
    const edge = Math.abs(l1 - l2) / 255;
    return Math.max(0.3, Math.min(1.5, 1.0 + edge * sensitivity * 0.2));
  }, diffMult);
}

export function ditherContrastAwareY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const sensitivity = controls.lineScale !== undefined ? Number(controls.lineScale) : (controls.contrastSensitivity !== undefined ? Number(controls.contrastSensitivity) : 5);
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;
  return run1DVerticalDiffusion(w, h, data, lut, (x, y) => {
    const idx = (y * w + x) * 4;
    const nextIdx = (Math.min(h - 1, y + 1) * w + x) * 4;
    const l1 = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
    const l2 = getLuminance(data[nextIdx], data[nextIdx + 1], data[nextIdx + 2]);
    const edge = Math.abs(l1 - l2) / 255;
    return Math.max(0.3, Math.min(1.5, 1.0 + edge * sensitivity * 0.2));
  }, diffMult);
}

export function ditherGlitch(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
  const blockSize = Math.max(4, Math.round((controls.blockSize !== undefined ? Number(controls.blockSize) : 8) * s));
  const rawGlitch = controls.glitchIntensity !== undefined ? Number(controls.glitchIntensity) * 5 : (controls.glitchAmount !== undefined ? Number(controls.glitchAmount) : 30);
  const glitchAmount = Math.max(0, Math.min(100, rawGlitch)) / 100;
  const bayer = [0.5/4, 2.5/4, 3.5/4, 1.5/4];

  for (let by = 0; by < h; by += blockSize) {
    const isGlitchBlock = Math.sin(by * 43.123) > (1.0 - glitchAmount * 0.6);
    const xOff = isGlitchBlock ? Math.round(Math.sin(by * 12.345) * 12 * s) : 0;
    const maxBy = Math.min(h, by + blockSize);

    for (let bx = 0; bx < w; bx += blockSize) {
      const maxBx = Math.min(w, bx + blockSize);
      for (let y = by; y < maxBy; y++) {
        const sy = Math.floor(y / s);
        for (let x = bx; x < maxBx; x++) {
          const sx = Math.max(0, Math.min(w - 1, x + xOff));
          const idx = (y * w + x) * 4;
          const sIdx = (y * w + sx) * 4;

          const sxCoord = Math.floor(x / s);
          const thresh = bayer[(sy & 1) * 2 + (sxCoord & 1)];
          lut.inlinePairMatch(
            data[sIdx],
            data[sIdx + 1],
            data[sIdx + 2],
            thresh,
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

export function ditherModulatedDiffuseX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const freq = controls.frequency !== undefined ? Number(controls.frequency) : (controls.lineScale !== undefined ? Number(controls.lineScale) * 2 : 10);
  const s = controls.scale !== undefined ? Number(controls.scale) : 1.0;
  const effFreq = freq / s;
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;
  return run1DHorizontalDiffusion(w, h, data, lut, (x, y) => {
    return 1.0 + 0.4 * Math.sin((x * effFreq * 0.1));
  }, diffMult);
}

export function ditherModulatedDiffuseY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const freq = controls.frequency !== undefined ? Number(controls.frequency) : (controls.lineScale !== undefined ? Number(controls.lineScale) * 2 : 10);
  const s = controls.scale !== undefined ? Number(controls.scale) : 1.0;
  const effFreq = freq / s;
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;
  return run1DVerticalDiffusion(w, h, data, lut, (x, y) => {
    return 1.0 + 0.4 * Math.sin((y * effFreq * 0.1));
  }, diffMult);
}

export function ditherOrderedModulation(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
  const lineScale = controls.lineScale !== undefined ? Number(controls.lineScale) : 5;
  const bayer = [
     0.5/16,  8.5/16,  2.5/16, 10.5/16,
    12.5/16,  4.5/16, 14.5/16,  6.5/16,
     3.5/16, 11.5/16,  1.5/16,  9.5/16,
    15.5/16,  7.5/16, 13.5/16,  5.5/16
  ];

  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / s);
    for (let x = 0; x < w; x++) {
      const sx = Math.floor(x / s);
      const idx = (y * w + x) * 4;
      const b = bayer[(sy & 3) * 4 + (sx & 3)];
      const wave = Math.sin((sx + sy) * 0.25) * (lineScale * 0.04);
      const thresh = Math.max(0.05, Math.min(0.95, b + wave));

      lut.inlinePairMatch(
        data[idx],
        data[idx + 1],
        data[idx + 2],
        thresh,
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherSmoothDiffuse(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const smooth = controls.smoothness !== undefined ? Number(controls.smoothness) : (controls.lineScale !== undefined ? Number(controls.lineScale) : 5);
  const alpha = 1.0 / (1.0 + smooth);
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;

  return run1DHorizontalDiffusion(w, h, data, lut, () => 0.8 * (1 - alpha * 0.3), diffMult);
}

export function ditherStuckiDiffusionLines(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const emphasis = (controls.lineEmphasis !== undefined ? Number(controls.lineEmphasis) : (controls.lineScale !== undefined ? Number(controls.lineScale) : 5)) / 5;
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;
  return run1DHorizontalDiffusion(w, h, data, lut, (x, y) => {
    return (y % 4 < 2) ? 0.9 * emphasis : 0.6 * emphasis;
  }, diffMult);
}

export function ditherWaveModulationX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const freq = controls.frequency !== undefined ? Number(controls.frequency) : 5;
  const amp = (controls.amplitude !== undefined ? Number(controls.amplitude) : 50) / 100;
  const s = controls.scale !== undefined ? Number(controls.scale) : 1.0;
  const effFreq = freq / s;
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;
  return run1DHorizontalDiffusion(w, h, data, lut, (x, y) => {
    return 1.0 + amp * Math.sin((2 * Math.PI * effFreq * y) / h);
  }, diffMult);
}

export function ditherWaveModulationY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const freq = controls.frequency !== undefined ? Number(controls.frequency) : 5;
  const amp = (controls.amplitude !== undefined ? Number(controls.amplitude) : 50) / 100;
  const s = controls.scale !== undefined ? Number(controls.scale) : 1.0;
  const effFreq = freq / s;
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;
  return run1DVerticalDiffusion(w, h, data, lut, (x, y) => {
    return 1.0 + amp * Math.sin((2 * Math.PI * effFreq * x) / w);
  }, diffMult);
}

export function ditherWaveform(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
  const density = controls.waveDensity !== undefined ? Number(controls.waveDensity) : (controls.density !== undefined ? Number(controls.density) : 1);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const sx = x / s;
      const wave = Math.sin((sx * density) / 10 + (lum / 255) * Math.PI * 2);
      const thresh = 0.5 + wave * 0.35;

      lut.inlinePairMatch(
        data[idx],
        data[idx + 1],
        data[idx + 2],
        thresh,
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherWaveformAlt(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const blend = (controls.modulationBlend !== undefined ? Number(controls.modulationBlend) : 5) / 10;
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const sx = x / s;
      const freqWave = Math.sin((sx * lum * 0.05) / 10);
      const ampWave = Math.cos(sx * 0.2) * (lum / 255);
      const wave = freqWave * blend + ampWave * (1 - blend);
      const thresh = 0.5 + wave * 0.35;

      lut.inlinePairMatch(
        data[idx],
        data[idx + 1],
        data[idx + 2],
        thresh,
        out,
        idx
      );
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

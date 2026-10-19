// Category: Glitch Effects (17 Algorithms)
import { FastPaletteLUT, getLuminance } from './palette.js';

// Helper for 1D horizontal diffusion
function run1DHorizontalDiffusion(w, h, data, lut, controlsOrFn, arg6 = 1.0) {
  const maxErr = 128;
  if (typeof controlsOrFn === 'function') {
    const getWeight = controlsOrFn;
    const diffMult = typeof arg6 === 'number' ? arg6 : 1.0;
    const out = new Uint8ClampedArray(data.length);
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
          out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = data[idx + 3];
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

  const controls = controlsOrFn || {};
  const lineScale = Math.max(
    1,
    Math.round(controls.lineScale !== undefined ? Number(controls.lineScale) : 1)
  );
  const rawBleed =
    controls.bleed !== undefined
      ? Number(controls.bleed)
      : controls.bleedFraction !== undefined
      ? Number(controls.bleedFraction) / 100
      : controls.bleedAmount !== undefined
      ? Number(controls.bleedAmount) / 100
      : 0.0;
  const bleed = Math.max(
    0,
    Math.min(1.0, controls.smoothingFactor ? Math.max(0.5, rawBleed) : rawBleed)
  );
  const smoothing = Math.max(
    0,
    controls.smoothing !== undefined
      ? Number(controls.smoothing)
      : controls.smoothness !== undefined
      ? Number(controls.smoothness)
      : controls.smoothingFactor
      ? 6
      : 0
  );
  const noise = !!(
    controls.noisyLines ||
    controls.noise ||
    controls.noiseToggle ||
    (controls.noiseAmount !== undefined && controls.enableNoise)
  );
  const getMod =
    controls.getModulation ||
    ((_x, sy) => (lineScale > 1 ? ((sy & 1) === 0 ? 1 : -1) * Math.min(1.0, (lineScale - 1) * 0.08) : 0));
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;

  const out = new Uint8ClampedArray(data.length);
  const alpha = smoothing === 0 ? 1.0 : 1.0 / (1.0 + smoothing * 1.2);
  const baseWeight = noise ? 0.95 : 0.45;

  if (lut.isTonalRamp) {
    const N = lut.paletteSize;
    const nextScanlineErr = new Float32Array(w);
    for (let y = 0; y < h; y++) {
      let scanErr = 0;
      let emaMod = 0;
      let emaLum = 0;
      const sy = Math.floor(y / lineScale);
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const rawLum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        emaLum = x === 0 || smoothing === 0 ? rawLum : emaLum * (1 - alpha) + rawLum * alpha;
        const inErr = scanErr + nextScanlineErr[x];
        nextScanlineErr[x] = 0;
        const curLum = Math.max(0, Math.min(255, emaLum + inErr));

        let noiseOffset = 0;
        if (noise) {
          const pseudo = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          noiseOffset = (pseudo - Math.floor(pseudo) - 0.5) * 32;
        }

        const modVal = getMod(x, sy, curLum);
        emaMod = x === 0 && smoothing > 0 ? modVal : emaMod * (1 - alpha) + modVal * alpha;

        const effLum = Math.max(0, Math.min(255, curLum + emaMod * 32 + noiseOffset));
        const t = (effLum / 255) * (N - 1);
        const chosenIdx = Math.max(0, Math.min(N - 1, Math.round(t)));

        const col = lut.rawPalette[chosenIdx];
        out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = data[idx + 3];

        const diff = effLum - lut.luminances[chosenIdx];
        const err = Math.max(-maxErr, Math.min(maxErr, diff * diffMult * baseWeight));
        scanErr = err * (1 - bleed);
        nextScanlineErr[x] = err * bleed;
      }
    }
  } else {
    const nextScanlineErr = new Float32Array(w * 3);
    for (let y = 0; y < h; y++) {
      let scanErrR = 0, scanErrG = 0, scanErrB = 0;
      let emaMod = 0;
      let emaR = 0, emaG = 0, emaB = 0;
      const sy = Math.floor(y / lineScale);
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const eIdx = x * 3;
        emaR = x === 0 || smoothing === 0 ? data[idx] : emaR * (1 - alpha) + data[idx] * alpha;
        emaG = x === 0 || smoothing === 0 ? data[idx + 1] : emaG * (1 - alpha) + data[idx + 1] * alpha;
        emaB = x === 0 || smoothing === 0 ? data[idx + 2] : emaB * (1 - alpha) + data[idx + 2] * alpha;

        const inErrR = scanErrR + nextScanlineErr[eIdx];
        const inErrG = scanErrG + nextScanlineErr[eIdx + 1];
        const inErrB = scanErrB + nextScanlineErr[eIdx + 2];
        nextScanlineErr[eIdx] = 0;
        nextScanlineErr[eIdx + 1] = 0;
        nextScanlineErr[eIdx + 2] = 0;

        let noiseOffset = 0;
        if (noise) {
          const pseudo = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          noiseOffset = (pseudo - Math.floor(pseudo) - 0.5) * 32;
        }

        const prelimR = Math.max(0, Math.min(255, emaR + inErrR));
        const prelimG = Math.max(0, Math.min(255, emaG + inErrG));
        const prelimB = Math.max(0, Math.min(255, emaB + inErrB));
        const curLum = getLuminance(prelimR, prelimG, prelimB);

        const modVal = getMod(x, sy, curLum);
        emaMod = x === 0 && smoothing > 0 ? modVal : emaMod * (1 - alpha) + modVal * alpha;
        const bias = emaMod * 32 + noiseOffset;

        const curR = Math.max(0, Math.min(255, prelimR + bias));
        const curG = Math.max(0, Math.min(255, prelimG + bias));
        const curB = Math.max(0, Math.min(255, prelimB + bias));

        lut.inlineMatch(curR, curG, curB, out, idx);
        out[idx + 3] = data[idx + 3];

        const diffR = curR - out[idx];
        const diffG = curG - out[idx + 1];
        const diffB = curB - out[idx + 2];
        const errR = Math.max(-maxErr, Math.min(maxErr, diffR * diffMult * baseWeight));
        const errG = Math.max(-maxErr, Math.min(maxErr, diffG * diffMult * baseWeight));
        const errB = Math.max(-maxErr, Math.min(maxErr, diffB * diffMult * baseWeight));

        scanErrR = errR * (1 - bleed);
        scanErrG = errG * (1 - bleed);
        scanErrB = errB * (1 - bleed);
        nextScanlineErr[eIdx] = errR * bleed;
        nextScanlineErr[eIdx + 1] = errG * bleed;
        nextScanlineErr[eIdx + 2] = errB * bleed;
      }
    }
  }
  return out;
}

// Helper for 1D vertical diffusion
function run1DVerticalDiffusion(w, h, data, lut, controlsOrFn, arg6 = 1.0) {
  const maxErr = 128;
  if (typeof controlsOrFn === 'function') {
    const getWeight = controlsOrFn;
    const diffMult = typeof arg6 === 'number' ? arg6 : 1.0;
    const out = new Uint8ClampedArray(data.length);
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
          out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = data[idx + 3];
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

  const controls = controlsOrFn || {};
  const lineScale = Math.max(
    1,
    Math.round(controls.lineScale !== undefined ? Number(controls.lineScale) : 1)
  );
  const rawBleed =
    controls.bleed !== undefined
      ? Number(controls.bleed)
      : controls.bleedFraction !== undefined
      ? Number(controls.bleedFraction) / 100
      : controls.bleedAmount !== undefined
      ? Number(controls.bleedAmount) / 100
      : 0.0;
  const bleed = Math.max(
    0,
    Math.min(1.0, controls.smoothingFactor ? Math.max(0.5, rawBleed) : rawBleed)
  );
  const smoothing = Math.max(
    0,
    controls.smoothing !== undefined
      ? Number(controls.smoothing)
      : controls.smoothness !== undefined
      ? Number(controls.smoothness)
      : controls.smoothingFactor
      ? 6
      : 0
  );
  const noise = !!(
    controls.noisyLines ||
    controls.noise ||
    controls.noiseToggle ||
    (controls.noiseAmount !== undefined && controls.enableNoise)
  );
  const getMod =
    controls.getModulation ||
    ((sx, _y) => (lineScale > 1 ? ((sx & 1) === 0 ? 1 : -1) * Math.min(1.0, (lineScale - 1) * 0.08) : 0));
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;

  const out = new Uint8ClampedArray(data.length);
  const alpha = smoothing === 0 ? 1.0 : 1.0 / (1.0 + smoothing * 1.2);
  const baseWeight = noise ? 0.95 : 0.45;

  if (lut.isTonalRamp) {
    const N = lut.paletteSize;
    const nextScanlineErr = new Float32Array(h);
    for (let x = 0; x < w; x++) {
      let scanErr = 0;
      let emaMod = 0;
      let emaLum = 0;
      const sx = Math.floor(x / lineScale);
      for (let y = 0; y < h; y++) {
        const idx = (y * w + x) * 4;
        const rawLum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        emaLum = y === 0 || smoothing === 0 ? rawLum : emaLum * (1 - alpha) + rawLum * alpha;
        const inErr = scanErr + nextScanlineErr[y];
        nextScanlineErr[y] = 0;
        const curLum = Math.max(0, Math.min(255, emaLum + inErr));

        let noiseOffset = 0;
        if (noise) {
          const pseudo = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          noiseOffset = (pseudo - Math.floor(pseudo) - 0.5) * 32;
        }

        const modVal = getMod(sx, y, curLum);
        emaMod = y === 0 && smoothing > 0 ? modVal : emaMod * (1 - alpha) + modVal * alpha;

        const effLum = Math.max(0, Math.min(255, curLum + emaMod * 32 + noiseOffset));
        const t = (effLum / 255) * (N - 1);
        const chosenIdx = Math.max(0, Math.min(N - 1, Math.round(t)));

        const col = lut.rawPalette[chosenIdx];
        out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = data[idx + 3];

        const diff = effLum - lut.luminances[chosenIdx];
        const err = Math.max(-maxErr, Math.min(maxErr, diff * diffMult * baseWeight));
        scanErr = err * (1 - bleed);
        nextScanlineErr[y] = err * bleed;
      }
    }
  } else {
    const nextScanlineErr = new Float32Array(h * 3);
    for (let x = 0; x < w; x++) {
      let scanErrR = 0, scanErrG = 0, scanErrB = 0;
      let emaMod = 0;
      let emaR = 0, emaG = 0, emaB = 0;
      const sx = Math.floor(x / lineScale);
      for (let y = 0; y < h; y++) {
        const idx = (y * w + x) * 4;
        const eIdx = y * 3;
        emaR = y === 0 || smoothing === 0 ? data[idx] : emaR * (1 - alpha) + data[idx] * alpha;
        emaG = y === 0 || smoothing === 0 ? data[idx + 1] : emaG * (1 - alpha) + data[idx + 1] * alpha;
        emaB = y === 0 || smoothing === 0 ? data[idx + 2] : emaB * (1 - alpha) + data[idx + 2] * alpha;

        const inErrR = scanErrR + nextScanlineErr[eIdx];
        const inErrG = scanErrG + nextScanlineErr[eIdx + 1];
        const inErrB = scanErrB + nextScanlineErr[eIdx + 2];
        nextScanlineErr[eIdx] = 0;
        nextScanlineErr[eIdx + 1] = 0;
        nextScanlineErr[eIdx + 2] = 0;

        let noiseOffset = 0;
        if (noise) {
          const pseudo = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          noiseOffset = (pseudo - Math.floor(pseudo) - 0.5) * 32;
        }

        const prelimR = Math.max(0, Math.min(255, emaR + inErrR));
        const prelimG = Math.max(0, Math.min(255, emaG + inErrG));
        const prelimB = Math.max(0, Math.min(255, emaB + inErrB));
        const curLum = getLuminance(prelimR, prelimG, prelimB);

        const modVal = getMod(sx, y, curLum);
        emaMod = y === 0 && smoothing > 0 ? modVal : emaMod * (1 - alpha) + modVal * alpha;
        const bias = emaMod * 32 + noiseOffset;

        const curR = Math.max(0, Math.min(255, prelimR + bias));
        const curG = Math.max(0, Math.min(255, prelimG + bias));
        const curB = Math.max(0, Math.min(255, prelimB + bias));

        lut.inlineMatch(curR, curG, curB, out, idx);
        out[idx + 3] = data[idx + 3];

        const diffR = curR - out[idx];
        const diffG = curG - out[idx + 1];
        const diffB = curB - out[idx + 2];
        const errR = Math.max(-maxErr, Math.min(maxErr, diffR * diffMult * baseWeight));
        const errG = Math.max(-maxErr, Math.min(maxErr, diffG * diffMult * baseWeight));
        const errB = Math.max(-maxErr, Math.min(maxErr, diffB * diffMult * baseWeight));

        scanErrR = errR * (1 - bleed);
        scanErrG = errG * (1 - bleed);
        scanErrB = errB * (1 - bleed);
        nextScanlineErr[eIdx] = errR * bleed;
        nextScanlineErr[eIdx + 1] = errG * bleed;
        nextScanlineErr[eIdx + 2] = errB * bleed;
      }
    }
  }
  return out;
}

export function ditherUniformModulationX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  return run1DHorizontalDiffusion(w, h, data, lut, controls);
}

export function ditherUniformModulationY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  return run1DVerticalDiffusion(w, h, data, lut, controls);
}

// Artifact Modulation (Glitch):
// Pattern Scale controls how many glitch lines there are; Line Scale controls how large they are.
export function ditherArtifactModulationGlitch(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
  const lineScale = Math.max(1, controls.lineScale !== undefined ? Number(controls.lineScale) : 5);

  const bandHeight = Math.max(1, Math.round(lineScale));
  const shift = lineScale * 3.5;
  const lineDensity = Math.max(0.04, Math.min(0.85, s * 0.18));
  const bayer = [0.5 / 4, 2.5 / 4, 3.5 / 4, 1.5 / 4];

  for (let y = 0; y < h; y++) {
    const bandIdx = Math.floor(y / bandHeight);
    const hash = Math.abs(Math.sin(bandIdx * 78.233 + 19.19) * 43758.5453) % 1;
    const isGlitchRow = hash < lineDensity;
    const rowOffset = isGlitchRow ? Math.round(Math.sin(bandIdx * 12.9898) * shift) : 0;

    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const sx = Math.max(0, Math.min(w - 1, x + rowOffset));
      const sIdx = (y * w + sx) * 4;

      const bVal = bayer[(y & 1) * 2 + (x & 1)];
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
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
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

// Atkinson-VHS:
// lineLength = horizontal shift length, lineCount = number of glitch lines,
// lineScale = vertical thickness of lines, scale = underlying dither pattern scale.
export function ditherAtkinsonVHS(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
  const lineLength = controls.lineLength !== undefined ? Number(controls.lineLength) : 5;
  const lineCount = Math.max(0, controls.lineCount !== undefined ? Number(controls.lineCount) : 8);
  const lineScale = Math.max(1, controls.lineScale !== undefined ? Number(controls.lineScale) : 2);
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;

  const jitterAmount = lineLength * 3;
  const totalBands = Math.max(1, Math.ceil(h / lineScale));
  const targetRatio = Math.min(1.0, lineCount / Math.max(1, Math.min(35, totalBands)));

  const shiftedData = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    const bandIdx = Math.floor(y / lineScale);
    const bandRank = Math.abs(Math.sin(bandIdx * 78.233 + 12.345) * 43758.5453) % 1;
    const isJitter = lineCount > 0 && bandRank < targetRatio;
    const jx = isJitter ? Math.round((Math.sin(bandIdx * 12.9898) - 0.5) * jitterAmount * 2) : 0;
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

  return run1DHorizontalDiffusion(w, h, shiftedData, lut, (_x, y) => {
    const sy = Math.floor(y / s);
    return (sy & 1) === 0 ? 0.75 : 0.65;
  }, diffMult);
}

// Contrast Aware X/Y: Pattern Scale (controls.scale) drives contrast adaptation and pattern scale
export function ditherContrastAwareX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
  const sensitivity = s * 5;
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
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
  const sensitivity = s * 5;
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

// Glitch:
// glitchIntensity (0..35) = number of glitch lines;
// lineScale = size/displacement of glitch lines;
// scale (Pattern Scale) = Bayer dither pattern scale only.
export function ditherGlitch(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
  const lineScale = Math.max(1, controls.lineScale !== undefined ? Number(controls.lineScale) : 4);
  const glitchLines = Math.max(0, Math.min(35, controls.glitchIntensity !== undefined ? Number(controls.glitchIntensity) : 10));

  const blockSize = Math.max(2, Math.round(lineScale * 2));
  const targetRatio = glitchLines / 35;
  const bayer = [0.5 / 4, 2.5 / 4, 3.5 / 4, 1.5 / 4];

  for (let by = 0; by < h; by += blockSize) {
    const bandIdx = Math.floor(by / blockSize);
    const bandHash = Math.abs(Math.sin(bandIdx * 43.123 + 7.89) * 43758.5453) % 1;
    const isGlitchBlock = glitchLines > 0 && bandHash < targetRatio;
    const xOff = isGlitchBlock ? Math.round(Math.sin(bandIdx * 12.345) * 4 * lineScale) : 0;
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

// Modulated Diffuse X/Y:
// Line Scale controls the number of modulated lines; Pattern Scale scales the dither pattern.
export function ditherModulatedDiffuseX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const numLines = Math.max(1, controls.lineScale !== undefined ? Number(controls.lineScale) : 6);
  return run1DHorizontalDiffusion(w, h, data, lut, {
    ...controls,
    lineScale: 1,
    getModulation: (x) => 0.45 * Math.sin((2 * Math.PI * numLines * x) / Math.max(1, w))
  });
}

export function ditherModulatedDiffuseY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const numLines = Math.max(1, controls.lineScale !== undefined ? Number(controls.lineScale) : 6);
  return run1DVerticalDiffusion(w, h, data, lut, {
    ...controls,
    lineScale: 1,
    getModulation: (_x, y) => 0.45 * Math.sin((2 * Math.PI * numLines * y) / Math.max(1, h))
  });
}

// Ordered Modulation: Line Scale removed; Pattern Scale (controls.scale) controls wave and pattern scale
export function ditherOrderedModulation(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
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
      const wave = Math.sin((sx + sy) * 0.25) * Math.min(0.45, s * 0.15);
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

// Smooth Diffuse: Smoothness smooths scanlines and error carry; Pattern Scale scales grid
export function ditherSmoothDiffuse(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const smoothness = controls.smoothness !== undefined
    ? Number(controls.smoothness)
    : (controls.smoothing !== undefined ? Number(controls.smoothing) : 5);
  const bleed = controls.bleed !== undefined ? Number(controls.bleed) : 0.65;
  return run1DHorizontalDiffusion(w, h, data, lut, {
    ...controls,
    lineScale: 1,
    bleed,
    smoothing: smoothness,
    getModulation: (x, sy) => Math.sin((x + sy) * 0.15) * (smoothness * 0.04)
  });
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
  return run1DHorizontalDiffusion(w, h, data, lut, {
    ...controls,
    getModulation: (x, y) => amp * Math.sin((2 * Math.PI * effFreq * x) / w)
  });
}

export function ditherWaveModulationY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const freq = controls.frequency !== undefined ? Number(controls.frequency) : 5;
  const amp = (controls.amplitude !== undefined ? Number(controls.amplitude) : 50) / 100;
  const s = controls.scale !== undefined ? Number(controls.scale) : 1.0;
  const effFreq = freq / s;
  return run1DVerticalDiffusion(w, h, data, lut, {
    ...controls,
    getModulation: (x, y) => amp * Math.sin((2 * Math.PI * effFreq * y) / h)
  });
}

export function ditherWaveform(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
  const density = controls.waveDensity !== undefined ? Number(controls.waveDensity) : (controls.density !== undefined ? Number(controls.density) : 1);
  return run1DHorizontalDiffusion(w, h, data, lut, {
    ...controls,
    getModulation: (x, y, lum) => 0.35 * Math.sin(((x / s) * density) / 10 + (lum / 255) * Math.PI * 2)
  });
}

export function ditherWaveformAlt(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const blend = (controls.modulationBlend !== undefined ? Number(controls.modulationBlend) : 5) / 10;
  const s = Math.max(0.05, controls.scale !== undefined ? Number(controls.scale) : 1.0);
  return run1DHorizontalDiffusion(w, h, data, lut, {
    ...controls,
    getModulation: (x, y, lum) => {
      const sx = x / s;
      const freqWave = Math.sin((sx * lum * 0.05) / 10);
      const ampWave = Math.cos(sx * 0.2) * (lum / 255);
      return 0.35 * (freqWave * blend + ampWave * (1 - blend));
    }
  });
}

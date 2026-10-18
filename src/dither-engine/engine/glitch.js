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
  const threshold = Math.max(
    0.001,
    controls.threshold !== undefined
      ? (Number(controls.threshold) > 1 ? Number(controls.threshold) / 100 : Number(controls.threshold))
      : (controls.luminanceThreshold !== undefined ? Number(controls.luminanceThreshold) / 100 : 0.5)
  );
  const scale = Math.max(
    0.2,
    controls.lineScale !== undefined
      ? Number(controls.lineScale)
      : (controls.scale !== undefined ? Number(controls.scale) : 1.0)
  );
  const bleed = Math.max(
    0,
    Math.min(
      1.0,
      controls.bleed !== undefined
        ? Number(controls.bleed)
        : (controls.bleedFraction !== undefined
            ? Number(controls.bleedFraction) / 100
            : (controls.bleedAmount !== undefined ? Number(controls.bleedAmount) / 100 : (controls.smoothingFactor ? 1.0 : 0.0)))
    )
  );
  const smoothing = Math.max(
    0,
    controls.smoothing !== undefined
      ? Number(controls.smoothing)
      : (controls.smoothness !== undefined
          ? Number(controls.smoothness)
          : (controls.smoothingFactor ? 10 : 0))
  );
  const noise = !!(controls.noise || controls.noiseToggle || (controls.noiseAmount !== undefined && controls.enableNoise));
  const getMod = controls.getModulation || (() => 0);
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;

  const out = new Uint8ClampedArray(data.length);
  const period = h * threshold;
  const alpha = smoothing === 0 ? 1.0 : 1.0 / (1.0 + smoothing * 2.0);

  if (lut.isTonalRamp) {
    const N = lut.paletteSize;
    const nextScanlineErr = new Float32Array(w);
    for (let y = 0; y < h; y++) {
      let scanErr = 0;
      const basePhase = (y / h) * (1 / threshold);
      let emaPhase = basePhase;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        const inErr = scanErr + nextScanlineErr[x];
        nextScanlineErr[x] = 0;
        const curLum = Math.max(0, Math.min(255, lum + inErr));

        let noiseOffset = 0;
        if (noise) {
          const pseudo = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          noiseOffset = (pseudo - Math.floor(pseudo) - 0.5) * 0.5;
        }

        const modVal = getMod(x, y, curLum);
        const errPerturbation = (inErr / 128) * bleed * 0.7;
        const rawPhase = basePhase + modVal + errPerturbation + noiseOffset;

        if (x === 0 && smoothing > 0) emaPhase = basePhase;
        else emaPhase = emaPhase * (1 - alpha) + rawPhase * alpha;

        const distInPixels = Math.abs(((emaPhase % 1 + 1) % 1) - 0.5) * period;
        const isLine = distInPixels <= scale;

        let chosenIdx;
        if (!isLine) {
          chosenIdx = N - 1;
        } else {
          const t = (curLum / 255) * (N - 1);
          chosenIdx = Math.max(0, Math.min(N - 1, Math.round(t)));
        }

        const col = lut.rawPalette[chosenIdx];
        out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = data[idx + 3];

        const diff = curLum - lut.luminances[chosenIdx];
        const err = Math.max(-maxErr, Math.min(maxErr, diff * diffMult));
        scanErr = err * (1 - bleed);
        nextScanlineErr[x] = err * bleed;
      }
    }
  } else {
    const nextScanlineErr = new Float32Array(w * 3);
    for (let y = 0; y < h; y++) {
      let scanErrR = 0, scanErrG = 0, scanErrB = 0;
      const basePhase = (y / h) * (1 / threshold);
      let emaPhase = basePhase;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const eIdx = x * 3;
        const inErrR = scanErrR + nextScanlineErr[eIdx];
        const inErrG = scanErrG + nextScanlineErr[eIdx + 1];
        const inErrB = scanErrB + nextScanlineErr[eIdx + 2];
        nextScanlineErr[eIdx] = 0;
        nextScanlineErr[eIdx + 1] = 0;
        nextScanlineErr[eIdx + 2] = 0;

        const curR = Math.max(0, Math.min(255, data[idx] + inErrR));
        const curG = Math.max(0, Math.min(255, data[idx + 1] + inErrG));
        const curB = Math.max(0, Math.min(255, data[idx + 2] + inErrB));
        const inErrLum = getLuminance(inErrR, inErrG, inErrB);
        const curLum = getLuminance(curR, curG, curB);

        let noiseOffset = 0;
        if (noise) {
          const pseudo = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          noiseOffset = (pseudo - Math.floor(pseudo) - 0.5) * 0.5;
        }

        const modVal = getMod(x, y, curLum);
        const errPerturbation = (inErrLum / 128) * bleed * 0.7;
        const rawPhase = basePhase + modVal + errPerturbation + noiseOffset;

        if (x === 0 && smoothing > 0) emaPhase = basePhase;
        else emaPhase = emaPhase * (1 - alpha) + rawPhase * alpha;

        const distInPixels = Math.abs(((emaPhase % 1 + 1) % 1) - 0.5) * period;
        const isLine = distInPixels <= scale;

        if (!isLine) {
          lut.inlineMatch(255, 255, 255, out, idx);
        } else {
          lut.inlineMatch(curR, curG, curB, out, idx);
        }
        out[idx + 3] = data[idx + 3];

        const diffR = curR - out[idx];
        const diffG = curG - out[idx + 1];
        const diffB = curB - out[idx + 2];
        const errR = Math.max(-maxErr, Math.min(maxErr, diffR * diffMult));
        const errG = Math.max(-maxErr, Math.min(maxErr, diffG * diffMult));
        const errB = Math.max(-maxErr, Math.min(maxErr, diffB * diffMult));

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
  const threshold = Math.max(
    0.001,
    controls.threshold !== undefined
      ? (Number(controls.threshold) > 1 ? Number(controls.threshold) / 100 : Number(controls.threshold))
      : (controls.luminanceThreshold !== undefined ? Number(controls.luminanceThreshold) / 100 : 0.5)
  );
  const scale = Math.max(
    0.2,
    controls.lineScale !== undefined
      ? Number(controls.lineScale)
      : (controls.scale !== undefined ? Number(controls.scale) : 1.0)
  );
  const bleed = Math.max(
    0,
    Math.min(
      1.0,
      controls.bleed !== undefined
        ? Number(controls.bleed)
        : (controls.bleedFraction !== undefined
            ? Number(controls.bleedFraction) / 100
            : (controls.bleedAmount !== undefined ? Number(controls.bleedAmount) / 100 : (controls.smoothingFactor ? 1.0 : 0.0)))
    )
  );
  const smoothing = Math.max(
    0,
    controls.smoothing !== undefined
      ? Number(controls.smoothing)
      : (controls.smoothness !== undefined
          ? Number(controls.smoothness)
          : (controls.smoothingFactor ? 10 : 0))
  );
  const noise = !!(controls.noise || controls.noiseToggle || (controls.noiseAmount !== undefined && controls.enableNoise));
  const getMod = controls.getModulation || (() => 0);
  const diffMult = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : 1.0;

  const out = new Uint8ClampedArray(data.length);
  const period = w * threshold;
  const alpha = smoothing === 0 ? 1.0 : 1.0 / (1.0 + smoothing * 2.0);

  if (lut.isTonalRamp) {
    const N = lut.paletteSize;
    const nextScanlineErr = new Float32Array(h);
    for (let x = 0; x < w; x++) {
      let scanErr = 0;
      const basePhase = (x / w) * (1 / threshold);
      let emaPhase = basePhase;
      for (let y = 0; y < h; y++) {
        const idx = (y * w + x) * 4;
        const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        const inErr = scanErr + nextScanlineErr[y];
        nextScanlineErr[y] = 0;
        const curLum = Math.max(0, Math.min(255, lum + inErr));

        let noiseOffset = 0;
        if (noise) {
          const pseudo = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          noiseOffset = (pseudo - Math.floor(pseudo) - 0.5) * 0.5;
        }

        const modVal = getMod(x, y, curLum);
        const errPerturbation = (inErr / 128) * bleed * 0.7;
        const rawPhase = basePhase + modVal + errPerturbation + noiseOffset;

        if (y === 0 && smoothing > 0) emaPhase = basePhase;
        else emaPhase = emaPhase * (1 - alpha) + rawPhase * alpha;

        const distInPixels = Math.abs(((emaPhase % 1 + 1) % 1) - 0.5) * period;
        const isLine = distInPixels <= scale;

        let chosenIdx;
        if (!isLine) {
          chosenIdx = N - 1;
        } else {
          const t = (curLum / 255) * (N - 1);
          chosenIdx = Math.max(0, Math.min(N - 1, Math.round(t)));
        }

        const col = lut.rawPalette[chosenIdx];
        out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = data[idx + 3];

        const diff = curLum - lut.luminances[chosenIdx];
        const err = Math.max(-maxErr, Math.min(maxErr, diff * diffMult));
        scanErr = err * (1 - bleed);
        nextScanlineErr[y] = err * bleed;
      }
    }
  } else {
    const nextScanlineErr = new Float32Array(h * 3);
    for (let x = 0; x < w; x++) {
      let scanErrR = 0, scanErrG = 0, scanErrB = 0;
      const basePhase = (x / w) * (1 / threshold);
      let emaPhase = basePhase;
      for (let y = 0; y < h; y++) {
        const idx = (y * w + x) * 4;
        const eIdx = y * 3;
        const inErrR = scanErrR + nextScanlineErr[eIdx];
        const inErrG = scanErrG + nextScanlineErr[eIdx + 1];
        const inErrB = scanErrB + nextScanlineErr[eIdx + 2];
        nextScanlineErr[eIdx] = 0;
        nextScanlineErr[eIdx + 1] = 0;
        nextScanlineErr[eIdx + 2] = 0;

        const curR = Math.max(0, Math.min(255, data[idx] + inErrR));
        const curG = Math.max(0, Math.min(255, data[idx + 1] + inErrG));
        const curB = Math.max(0, Math.min(255, data[idx + 2] + inErrB));
        const inErrLum = getLuminance(inErrR, inErrG, inErrB);
        const curLum = getLuminance(curR, curG, curB);

        let noiseOffset = 0;
        if (noise) {
          const pseudo = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          noiseOffset = (pseudo - Math.floor(pseudo) - 0.5) * 0.5;
        }

        const modVal = getMod(x, y, curLum);
        const errPerturbation = (inErrLum / 128) * bleed * 0.7;
        const rawPhase = basePhase + modVal + errPerturbation + noiseOffset;

        if (y === 0 && smoothing > 0) emaPhase = basePhase;
        else emaPhase = emaPhase * (1 - alpha) + rawPhase * alpha;

        const distInPixels = Math.abs(((emaPhase % 1 + 1) % 1) - 0.5) * period;
        const isLine = distInPixels <= scale;

        if (!isLine) {
          lut.inlineMatch(255, 255, 255, out, idx);
        } else {
          lut.inlineMatch(curR, curG, curB, out, idx);
        }
        out[idx + 3] = data[idx + 3];

        const diffR = curR - out[idx];
        const diffG = curG - out[idx + 1];
        const diffB = curB - out[idx + 2];
        const errR = Math.max(-maxErr, Math.min(maxErr, diffR * diffMult));
        const errG = Math.max(-maxErr, Math.min(maxErr, diffG * diffMult));
        const errB = Math.max(-maxErr, Math.min(maxErr, diffB * diffMult));

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
  return run1DHorizontalDiffusion(w, h, data, lut, {
    ...controls,
    getModulation: (x, y) => 0.4 * Math.sin(x * effFreq * 0.1)
  });
}

export function ditherModulatedDiffuseY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const freq = controls.frequency !== undefined ? Number(controls.frequency) : (controls.lineScale !== undefined ? Number(controls.lineScale) * 2 : 10);
  const s = controls.scale !== undefined ? Number(controls.scale) : 1.0;
  const effFreq = freq / s;
  return run1DVerticalDiffusion(w, h, data, lut, {
    ...controls,
    getModulation: (x, y) => 0.4 * Math.sin(y * effFreq * 0.1)
  });
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
  const smoothness = controls.smoothness !== undefined
    ? Number(controls.smoothness)
    : (controls.smoothing !== undefined
        ? Number(controls.smoothing)
        : (controls.lineScale !== undefined ? Number(controls.lineScale) : 5));
  const bleed = controls.bleed !== undefined ? Number(controls.bleed) : 1.0;
  return run1DHorizontalDiffusion(w, h, data, lut, {
    ...controls,
    bleed,
    smoothing: smoothness
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

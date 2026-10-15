// Category: Special Effects (17 Algorithms)
import { FastPaletteLUT, getLuminance } from './palette.js';

// Precomputed normalized Bayer matrices centered symmetrically with + 0.5
function generateRawBayer(n) {
  if (n === 2) return [0, 2, 3, 1];
  const prev = generateRawBayer(n / 2);
  const prevN = n / 2;
  const out = new Int32Array(n * n);
  for (let y = 0; y < prevN; y++) {
    for (let x = 0; x < prevN; x++) {
      const v = prev[y * prevN + x];
      out[y * n + x] = 4 * v;
      out[y * n + (x + prevN)] = 4 * v + 2;
      out[(y + prevN) * n + x] = 4 * v + 3;
      out[(y + prevN) * n + (x + prevN)] = 4 * v + 1;
    }
  }
  return out;
}

function generateBayer(n) {
  const raw = generateRawBayer(n);
  const total = n * n;
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    out[i] = (raw[i] + 0.5) / total;
  }
  return out;
}

const BAYER_2X2 = generateBayer(2);
const BAYER_4X4 = generateBayer(4);
const BAYER_8X8 = generateBayer(8);
const BAYER_16X16 = generateBayer(16);

export function ditherBeehive(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const rawSize = controls.cellSize !== undefined ? controls.cellSize : controls.cellRadius;
  const baseSize = rawSize !== undefined ? Number(rawSize) : 8;
  const size = Math.max(2, Math.round(baseSize * scale));
  const hx = size * Math.sqrt(3), hy = size * 1.5;
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  for (let y = 0; y < h; y++) {
    const sy = y + oy;
    const qy = Math.abs((((sy % hy) + hy) % hy) - hy / 2);
    for (let x = 0; x < w; x++) {
      const sx = x + ox;
      const idx = (y * w + x) * 4;
      const qx = Math.abs((((sx % hx) + hx) % hx) - hx / 2);
      const isEdge = (qx * Math.sqrt(3) + qy) > (size * 1.4);
      const threshold = isEdge ? 0.75 : 0.25;

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherDiagonal(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const sensitivity = controls.edgeSensitivity !== undefined ? Number(controls.edgeSensitivity) : 1;
  const baseSpacing = controls.stripeSpacing !== undefined ? Number(controls.stripeSpacing) : 4;
  const spacing = Math.max(1, Math.round(baseSpacing * scale));
  const angle = (controls.angle !== undefined ? Number(controls.angle) : 45) * (Math.PI / 180);
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  for (let y = 0; y < h; y++) {
    const yPrev = Math.max(0, y - 1) * w;
    const yNext = Math.min(h - 1, y + 1) * w;
    const yCur = y * w;
    for (let x = 0; x < w; x++) {
      const idx = (yCur + x) * 4;
      const xPrev = Math.max(0, x - 1);
      const xNext = Math.min(w - 1, x + 1);

      // Sobel horizontal and vertical gradients on original pixels
      const l00 = getLuminance(data[(yPrev + xPrev) * 4], data[(yPrev + xPrev) * 4 + 1], data[(yPrev + xPrev) * 4 + 2]);
      const l02 = getLuminance(data[(yPrev + xNext) * 4], data[(yPrev + xNext) * 4 + 1], data[(yPrev + xNext) * 4 + 2]);
      const l10 = getLuminance(data[(yCur + xPrev) * 4], data[(yCur + xPrev) * 4 + 1], data[(yCur + xPrev) * 4 + 2]);
      const l12 = getLuminance(data[(yCur + xNext) * 4], data[(yCur + xNext) * 4 + 1], data[(yCur + xNext) * 4 + 2]);
      const l20 = getLuminance(data[(yNext + xPrev) * 4], data[(yNext + xPrev) * 4 + 1], data[(yNext + xPrev) * 4 + 2]);
      const l22 = getLuminance(data[(yNext + xNext) * 4], data[(yNext + xNext) * 4 + 1], data[(yNext + xNext) * 4 + 2]);

      const gx = (l02 + 2 * l12 + l22) - (l00 + 2 * l10 + l20);
      const gy = (l20 + 2 * getLuminance(data[(yNext + x) * 4], data[(yNext + x) * 4 + 1], data[(yNext + x) * 4 + 2]) + l22) -
                 (l00 + 2 * getLuminance(data[(yPrev + x) * 4], data[(yPrev + x) * 4 + 1], data[(yPrev + x) * 4 + 2]) + l02);
      const edge = Math.hypot(gx, gy) / 255;
      const isEdge = (edge * sensitivity * 0.4) > 0.3;

      const sx = x + ox;
      const sy = y + oy;
      const proj = Math.floor((sx * cosA + sy * sinA) / spacing);
      const isStripe = ((proj & 1) === 0);
      const threshold = isEdge ? 0.2 : (isStripe ? 0.4 : 0.7);

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherDisplaceContour(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const contourThresh = (controls.contourThreshold !== undefined ? Number(controls.contourThreshold) : 50) / 100;
  const lineMode = controls.lineMode !== undefined ? Number(controls.lineMode) : 1;
  const baseSpacing = controls.lineSpacing !== undefined ? Number(controls.lineSpacing) * 4 : 4;
  const spacing = Math.max(2, Math.round(baseSpacing * scale));
  const smoothing = controls.smoothing !== undefined ? Number(controls.smoothing) : 0;
  const bands = Math.max(1, controls.bands !== undefined ? Number(controls.bands) : 6);
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      let lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      if (smoothing > 0) {
        const rSm = Math.min(smoothing, 3);
        let sSum = lum, sCnt = 1;
        for (let d = 1; d <= rSm; d++) {
          if (x - d >= 0) { sSum += getLuminance(data[(y * w + x - d) * 4], data[(y * w + x - d) * 4 + 1], data[(y * w + x - d) * 4 + 2]); sCnt++; }
          if (x + d < w) { sSum += getLuminance(data[(y * w + x + d) * 4], data[(y * w + x + d) * 4 + 1], data[(y * w + x + d) * 4 + 2]); sCnt++; }
        }
        lum = sSum / sCnt;
      }

      const sx = x + ox;
      const sy = y + oy;
      const displace = (lum / 255) * contourThresh * 20 * scale;
      const yEff = Math.round(sy + displace);
      const rem = ((yEff % spacing) + spacing) % spacing;
      const isLine = rem < Math.max(1, lineMode * scale);
      const bandVal = Math.sin((lum / 255) * bands * Math.PI);
      const threshold = isLine ? 0.3 : (0.5 + bandVal * 0.35);

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherDottedLines(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const density = controls.lineDensity !== undefined ? Number(controls.lineDensity) : (controls.lineSpacing !== undefined ? Math.round(20 / Number(controls.lineSpacing)) : 10);
  const dotting = (controls.dotting !== undefined ? Number(controls.dotting) : 40) / 100;
  const angleDeg = controls.lineAngle !== undefined ? Number(controls.lineAngle) : 45;
  const rad = angleDeg * (Math.PI / 180);
  const cosA = Math.cos(rad), sinA = Math.sin(rad);
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  const baseSpacing = (Math.min(w, h) / Math.max(1, density));
  const spacing = Math.max(2, Math.round(baseSpacing * scale));
  const dotFreq = Math.max(2, Math.round(spacing * 0.75));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const sx = x + ox;
      const sy = y + oy;
      const rotX = sx * cosA + sy * sinA;
      const rotY = -sx * sinA + sy * cosA;

      const bend = Math.sin((rotX / dotFreq) * Math.PI) * dotting * spacing * 0.5;
      const effY = rotY + bend + (lum / 255) * spacing;
      const remY = ((effY % spacing) + spacing) % spacing;
      const isLine = remY < Math.max(1, scale * 1.5);
      const isDot = isLine && (Math.floor(rotX / dotFreq) & 1) === 0;
      const threshold = isDot ? 0.25 : (isLine ? 0.45 : 0.75);

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherNoise(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const noiseAmount = controls.noiseAmount !== undefined ? Number(controls.noiseAmount) : 0.8;
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  for (let y = 0; y < h; y++) {
    const py = y + oy;
    const sy = scale !== 1.0 ? Math.floor(py / scale) : py;
    for (let x = 0; x < w; x++) {
      const px = x + ox;
      const sx = scale !== 1.0 ? Math.floor(px / scale) : px;
      const idx = (y * w + x) * 4;
      const rand = (((Math.sin(sx * 12.9898 + sy * 78.233) * 43758.5453) % 1) + 1) % 1;
      const threshold = 0.5 + (rand - 0.5) * noiseAmount;

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

function detectOrbs(w, h, data, controls = {}) {
  const orbs = [];
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const maxOrbs = controls.orbCount !== undefined ? Math.max(1, Math.round(Number(controls.orbCount))) : 8;
  const rawSize = controls.orbSize !== undefined ? Number(controls.orbSize) : 80;
  const baseSize = Math.max(5, Math.round(rawSize * scale));
  const intensity = controls.orbIntensity !== undefined ? Number(controls.orbIntensity) / 100 : 0.6;
  const randomAmt = (controls.orbRandom !== undefined ? Number(controls.orbRandom) : 0) / 100;
  const legacyOffset = controls.orbOffset !== undefined ? Number(controls.orbOffset) : 0;
  const isVertical = !!controls.orbVertical;

  const minSpacing = Math.max(15, baseSize * 0.75);
  const minSpacing2 = minSpacing * minSpacing;

  const offsetX = (controls.offsetX !== undefined ? Number(controls.offsetX) : 0) + (isVertical ? 0 : legacyOffset);
  const offsetY = (controls.offsetY !== undefined ? Number(controls.offsetY) : 0) + (isVertical ? legacyOffset : 0);

  const step = Math.max(10, Math.floor(baseSize * 0.4));
  for (let y = 10; y < h - 10; y += step) {
    for (let x = 10; x < w - 10; x += step) {
      if (orbs.length >= maxOrbs) break;
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      if (lum > 150) {
        let posX = x + offsetX;
        let posY = y + offsetY;
        if (randomAmt > 0) {
          const rx = (((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) - 0.5) * 2;
          const ry = (((Math.sin(x * 39.346 + y * 11.135) * 43758.5453) % 1) - 0.5) * 2;
          posX += rx * randomAmt * baseSize * 0.5;
          posY += ry * randomAmt * baseSize * 0.5;
        }
        let valid = true;
        for (const o of orbs) {
          const dx = posX - o.x, dy = posY - o.y;
          if (dx * dx + dy * dy < minSpacing2) { valid = false; break; }
        }
        if (valid) orbs.push({ x: posX, y: posY, size: baseSize, intensity });
      }
    }
    if (orbs.length >= maxOrbs) break;
  }

  // Fallback if no bright pixels triggered orbs
  if (orbs.length === 0) {
    const cx = w / 2 + offsetX, cy = h / 2 + offsetY;
    orbs.push({ x: cx, y: cy, size: baseSize, intensity });
  }

  return orbs;
}

export function ditherOrbDiffuse(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const orbs = detectOrbs(w, h, data, controls);
  const serpentine = controls.serpentine !== undefined ? !!controls.serpentine : true;
  const strength = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);

  if (lut.isTonalRamp) {
    const errRing = new Float32Array(2 * w);
    for (let y = 0; y < h; y++) {
      const isReverse = serpentine && (y & 1) === 1;
      const curRow = (y & 1) * w, nextRow = ((y + 1) & 1) * w;
      const startX = isReverse ? w - 1 : 0;
      const endX = isReverse ? -1 : w;
      const stepX = isReverse ? -1 : 1;

      for (let x = startX; x !== endX; x += stepX) {
        const idx = (y * w + x) * 4;
        let lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        for (const o of orbs) {
          const d = Math.hypot(x - o.x, y - o.y);
          if (d < o.size) lum = Math.min(255, lum + (1 - d / o.size) * (80 * o.intensity));
        }
        const curLum = Math.max(0, Math.min(255, lum + errRing[curRow + x]));
        const chosenIdx = lut.quantizeLum(curLum);
        const col = lut.rawPalette[chosenIdx];

        out[idx] = col[0];
        out[idx + 1] = col[1];
        out[idx + 2] = col[2];
        out[idx + 3] = data[idx + 3];

        const err = (curLum - lut.luminances[chosenIdx]) * strength;
        if (isReverse) {
          if (x - 1 >= 0) errRing[curRow + x - 1] += err * (7/16);
          if (y + 1 < h) {
            if (x + 1 < w) errRing[nextRow + x + 1] += err * (3/16);
            errRing[nextRow + x] += err * (5/16);
            if (x - 1 >= 0) errRing[nextRow + x - 1] += err * (1/16);
          }
        } else {
          if (x + 1 < w) errRing[curRow + x + 1] += err * (7/16);
          if (y + 1 < h) {
            if (x - 1 >= 0) errRing[nextRow + x - 1] += err * (3/16);
            errRing[nextRow + x] += err * (5/16);
            if (x + 1 < w) errRing[nextRow + x + 1] += err * (1/16);
          }
        }
      }
      for (let i = 0; i < w; i++) errRing[curRow + i] = 0;
    }
  } else {
    const errRing = new Float32Array(2 * w * 3);
    const maxErr = 128;
    for (let y = 0; y < h; y++) {
      const isReverse = serpentine && (y & 1) === 1;
      const curRow = (y & 1) * w * 3, nextRow = ((y + 1) & 1) * w * 3;
      const startX = isReverse ? w - 1 : 0;
      const endX = isReverse ? -1 : w;
      const stepX = isReverse ? -1 : 1;

      for (let x = startX; x !== endX; x += stepX) {
        const idx = (y * w + x) * 4;
        let r = data[idx] + errRing[curRow + x * 3];
        let g = data[idx + 1] + errRing[curRow + x * 3 + 1];
        let b = data[idx + 2] + errRing[curRow + x * 3 + 2];
        for (const o of orbs) {
          const d = Math.hypot(x - o.x, y - o.y);
          if (d < o.size) {
            const boost = (1 - d / o.size) * (80 * o.intensity);
            r += boost; g += boost; b += boost;
          }
        }
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        lut.inlineMatch(r, g, b, out, idx);
        out[idx + 3] = data[idx + 3];

        const errR = Math.max(-maxErr, Math.min(maxErr, (r - out[idx]) * strength));
        const errG = Math.max(-maxErr, Math.min(maxErr, (g - out[idx + 1]) * strength));
        const errB = Math.max(-maxErr, Math.min(maxErr, (b - out[idx + 2]) * strength));

        if (isReverse) {
          if (x - 1 >= 0) {
            errRing[curRow + (x - 1) * 3] += errR * (7/16);
            errRing[curRow + (x - 1) * 3 + 1] += errG * (7/16);
            errRing[curRow + (x - 1) * 3 + 2] += errB * (7/16);
          }
          if (y + 1 < h) {
            if (x + 1 < w) {
              errRing[nextRow + (x + 1) * 3] += errR * (3/16);
              errRing[nextRow + (x + 1) * 3 + 1] += errG * (3/16);
              errRing[nextRow + (x + 1) * 3 + 2] += errB * (3/16);
            }
            errRing[nextRow + x * 3] += errR * (5/16);
            errRing[nextRow + x * 3 + 1] += errG * (5/16);
            errRing[nextRow + x * 3 + 2] += errB * (5/16);
            if (x - 1 >= 0) {
              errRing[nextRow + (x - 1) * 3] += errR * (1/16);
              errRing[nextRow + (x - 1) * 3 + 1] += errG * (1/16);
              errRing[nextRow + (x - 1) * 3 + 2] += errB * (1/16);
            }
          }
        } else {
          if (x + 1 < w) {
            errRing[curRow + (x + 1) * 3] += errR * (7/16);
            errRing[curRow + (x + 1) * 3 + 1] += errG * (7/16);
            errRing[curRow + (x + 1) * 3 + 2] += errB * (7/16);
          }
          if (y + 1 < h) {
            if (x - 1 >= 0) {
              errRing[nextRow + (x - 1) * 3] += errR * (3/16);
              errRing[nextRow + (x - 1) * 3 + 1] += errG * (3/16);
              errRing[nextRow + (x - 1) * 3 + 2] += errB * (3/16);
            }
            errRing[nextRow + x * 3] += errR * (5/16);
            errRing[nextRow + x * 3 + 1] += errG * (5/16);
            errRing[nextRow + x * 3 + 2] += errB * (5/16);
            if (x + 1 < w) {
              errRing[nextRow + (x + 1) * 3] += errR * (1/16);
              errRing[nextRow + (x + 1) * 3 + 1] += errG * (1/16);
              errRing[nextRow + (x + 1) * 3 + 2] += errB * (1/16);
            }
          }
        }
      }
      for (let i = 0; i < w * 3; i++) errRing[curRow + i] = 0;
    }
  }
  return out;
}

// Orb Diffuse X: Soft orb overlay with vertical 1D error diffusion
export function ditherOrbDiffuseX(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const orbs = detectOrbs(w, h, data, controls);
  const maxErr = 128;
  const strength = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  const lineScale = controls.lineScale !== undefined ? Number(controls.lineScale) : 1;
  const effStrength = strength * (1.0 + (lineScale - 1) * 0.1);

  if (lut.isTonalRamp) {
    const errBuf = new Float32Array(w);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        for (const o of orbs) {
          const d = Math.hypot(x - o.x, y - o.y);
          if (d < o.size) lum = Math.min(255, lum + (1 - d / o.size) * (80 * o.intensity));
        }
        const curLum = Math.max(0, Math.min(255, lum + errBuf[x]));
        const chosenIdx = lut.quantizeLum(curLum);
        const col = lut.rawPalette[chosenIdx];

        out[idx] = col[0];
        out[idx + 1] = col[1];
        out[idx + 2] = col[2];
        out[idx + 3] = data[idx + 3];

        errBuf[x] = Math.max(-maxErr, Math.min(maxErr, (curLum - lut.luminances[chosenIdx]) * effStrength));
      }
    }
  } else {
    const errBuf = new Float32Array(w * 3);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const eIdx = x * 3;
        let r = data[idx] + errBuf[eIdx];
        let g = data[idx + 1] + errBuf[eIdx + 1];
        let b = data[idx + 2] + errBuf[eIdx + 2];
        for (const o of orbs) {
          const d = Math.hypot(x - o.x, y - o.y);
          if (d < o.size) {
            const boost = (1 - d / o.size) * (80 * o.intensity);
            r += boost; g += boost; b += boost;
          }
        }
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        lut.inlineMatch(r, g, b, out, idx);
        out[idx + 3] = data[idx + 3];

        errBuf[eIdx] = Math.max(-maxErr, Math.min(maxErr, (r - out[idx]) * effStrength));
        errBuf[eIdx + 1] = Math.max(-maxErr, Math.min(maxErr, (g - out[idx + 1]) * effStrength));
        errBuf[eIdx + 2] = Math.max(-maxErr, Math.min(maxErr, (b - out[idx + 2]) * effStrength));
      }
    }
  }
  return out;
}

// Orb Diffuse Y: Soft orb overlay with horizontal 1D error diffusion
export function ditherOrbDiffuseY(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const orbs = detectOrbs(w, h, data, controls);
  const maxErr = 128;
  const strength = controls.diffusionStrength !== undefined ? Number(controls.diffusionStrength) : (controls.errorStrength !== undefined ? Number(controls.errorStrength) / 100 : 1.0);
  const lineScale = controls.lineScale !== undefined ? Number(controls.lineScale) : 1;
  const effStrength = strength * (1.0 + (lineScale - 1) * 0.1);

  if (lut.isTonalRamp) {
    for (let y = 0; y < h; y++) {
      let err = 0;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
        for (const o of orbs) {
          const d = Math.hypot(x - o.x, y - o.y);
          if (d < o.size) lum = Math.min(255, lum + (1 - d / o.size) * (80 * o.intensity));
        }
        const curLum = Math.max(0, Math.min(255, lum + err));
        const chosenIdx = lut.quantizeLum(curLum);
        const col = lut.rawPalette[chosenIdx];

        out[idx] = col[0];
        out[idx + 1] = col[1];
        out[idx + 2] = col[2];
        out[idx + 3] = data[idx + 3];

        err = Math.max(-maxErr, Math.min(maxErr, (curLum - lut.luminances[chosenIdx]) * effStrength));
      }
    }
  } else {
    for (let y = 0; y < h; y++) {
      let errR = 0, errG = 0, errB = 0;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let r = data[idx] + errR;
        let g = data[idx + 1] + errG;
        let b = data[idx + 2] + errB;
        for (const o of orbs) {
          const d = Math.hypot(x - o.x, y - o.y);
          if (d < o.size) {
            const boost = (1 - d / o.size) * (80 * o.intensity);
            r += boost; g += boost; b += boost;
          }
        }
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        lut.inlineMatch(r, g, b, out, idx);
        out[idx + 3] = data[idx + 3];

        errR = Math.max(-maxErr, Math.min(maxErr, (r - out[idx]) * effStrength));
        errG = Math.max(-maxErr, Math.min(maxErr, (g - out[idx + 1]) * effStrength));
        errB = Math.max(-maxErr, Math.min(maxErr, (b - out[idx + 2]) * effStrength));
      }
    }
  }
  return out;
}

export function ditherOrbMatrix(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const orbs = detectOrbs(w, h, data, controls);
  const rawSize = controls.matrixSize;
  let matrix = BAYER_4X4, size = 4;
  if (rawSize === 2 || rawSize === '2' || rawSize === '2x2') { matrix = BAYER_2X2; size = 2; }
  else if (rawSize === 8 || rawSize === '8' || rawSize === '8x8') { matrix = BAYER_8X8; size = 8; }
  else if (rawSize === 16 || rawSize === '16' || rawSize === '16x16') { matrix = BAYER_16X16; size = 16; }

  const mask = size - 1;
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  for (let y = 0; y < h; y++) {
    const py = y + oy;
    const sy = scale !== 1.0 ? Math.floor(py / scale) : py;
    const rowOffset = (((sy & mask) + size) & mask) * size;
    for (let x = 0; x < w; x++) {
      const px = x + ox;
      const sx = scale !== 1.0 ? Math.floor(px / scale) : px;
      const idx = (y * w + x) * 4;
      let boost = 0;
      for (const o of orbs) {
        const d = Math.hypot(x - o.x, y - o.y);
        if (d < o.size) boost += (1 - d / o.size) * (0.4 * o.intensity);
      }
      const bayerVal = matrix[rowOffset + ((((sx & mask) + size) & mask))];
      const threshold = Math.max(0.05, Math.min(0.95, bayerVal - boost));

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherRadialBurst(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const divisor = Math.max(0.5, Number(controls.divisor !== undefined ? controls.divisor : 5));
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);
  const cx = w / 2 + ox, cy = h / 2 + oy;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const d = Math.hypot(x - cx, y - cy);
      const wave = Math.sin(d / (divisor * scale));
      const threshold = 0.5 + wave * 0.4;

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherRadialPeaks(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const divisor = Math.max(0.5, Number(controls.divisor !== undefined ? controls.divisor : 5));
  const maxPeaks = controls.maxPeaks !== undefined ? Number(controls.maxPeaks) : 20;
  const baseMinDist = controls.minPeakDistance !== undefined ? Number(controls.minPeakDistance) : 60;
  const minDistance = Math.max(5, baseMinDist * scale);
  const minDistanceSq = minDistance * minDistance;
  const rawThresh = controls.peakThreshold !== undefined ? Number(controls.peakThreshold) : 50;
  const minLum = Math.max(50, 255 - rawThresh * 3.5);
  const isInterference = !!controls.interference;
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  const peaks = [];
  const step = Math.max(8, Math.floor(minDistance * 0.5));
  for (let y = 10; y < h - 10; y += step) {
    for (let x = 10; x < w - 10; x += step) {
      if (peaks.length >= maxPeaks) break;
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      if (lum >= minLum) {
        let valid = true;
        for (const pk of peaks) {
          const dx = x - pk.x, dy = y - pk.y;
          if (dx * dx + dy * dy < minDistanceSq) { valid = false; break; }
        }
        if (valid) peaks.push({ x, y });
      }
    }
    if (peaks.length >= maxPeaks) break;
  }
  if (peaks.length === 0) {
    peaks.push({ x: w / 2, y: h / 2 });
  }

  const effDivisor = divisor * scale;

  for (let y = 0; y < h; y++) {
    const sy = y - oy;
    for (let x = 0; x < w; x++) {
      const sx = x - ox;
      const idx = (y * w + x) * 4;
      let wave = 0;
      if (isInterference) {
        let sum = 0;
        for (const pk of peaks) {
          const d = Math.hypot(sx - pk.x, sy - pk.y);
          sum += Math.sin(d / effDivisor);
        }
        wave = sum / peaks.length;
      } else {
        let closest = Infinity;
        for (const pk of peaks) {
          const d = Math.hypot(sx - pk.x, sy - pk.y);
          if (d < closest) closest = d;
        }
        wave = Math.sin(closest / effDivisor);
      }
      const threshold = 0.5 + wave * 0.4;

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherSineDistort(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const freqA = Number(controls.freqA !== undefined ? controls.freqA : 8);
  const freqB = Number(controls.freqB !== undefined ? controls.freqB : 12);
  const angle = (controls.angle !== undefined ? Number(controls.angle) : 45) * (Math.PI / 180);
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = (x + ox) / scale;
      const sy = (y + oy) / scale;
      const rx = sx * cosA + sy * sinA;
      const wave = 0.5 * (Math.sin((sx * freqA) / 100) + Math.sin((rx * freqB) / 100));
      const threshold = 0.5 + wave * 0.4;
      const idx = (y * w + x) * 4;

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherSineWaveModulation(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const freq = Number(controls.waveFrequency !== undefined ? controls.waveFrequency : 5);
  const amp = (controls.waveThreshold !== undefined ? Number(controls.waveThreshold) : 10) / 25;
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = (x + ox) / scale;
      const sy = (y + oy) / scale;
      const wave = Math.sin((sx * freq) / 50 + (sy * freq) / 50);
      const threshold = 0.5 + wave * amp;
      const idx = (y * w + x) * 4;

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherThresholder(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const freq = Number(controls.modulationFrequency !== undefined ? controls.modulationFrequency : 1);
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = (x + ox) / scale;
      const sy = (y + oy) / scale;
      let wave = 0;
      for (let k = 1; k <= 4; k++) {
        wave += (1 / k) * Math.sin((k * freq * sx) / 20 + sy / 20);
      }
      const threshold = 0.5 + (wave / 2) * 0.4;
      const idx = (y * w + x) * 4;

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherTopography(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const warp = Number(controls.warpIntensity !== undefined ? controls.warpIntensity : 1);
  const period = Math.max(2, Math.round(10 * scale));
  const contourMod = Math.max(4, Math.round(32 * scale));
  const contourWidth = Math.max(1, Math.round(4 * scale));
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      const sx = x + ox;
      const sy = y + oy;
      const warpedLum = lum + Math.sin(sx / period) * Math.cos(sy / period) * warp * 15;
      const rem = ((Math.abs(Math.round(warpedLum)) % contourMod) + contourMod) % contourMod;
      const isContour = rem < contourWidth;
      const threshold = isContour ? 0.75 : 0.25;

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherVortex(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const baseSwirl = controls.swirl !== undefined ? Number(controls.swirl) : (controls.twistStrength !== undefined ? Number(controls.twistStrength) : 5);
  const swirl = Math.max(0.5, Number(baseSwirl));
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);
  const cx = w / 2 + ox, cy = h / 2 + oy;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) / scale;
      const theta = Math.atan2(dy, dx);
      const wave = Math.sin(theta * 4 + d / swirl);
      const threshold = 0.5 + wave * 0.4;
      const idx = (y * w + x) * 4;

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

export function ditherWave(w, h, data, palette, controls = {}) {
  const lut = new FastPaletteLUT(palette, controls);
  const out = new Uint8ClampedArray(data.length);
  const scale = Math.max(0.05, Number(controls.scale || 1.0));
  const freq = Number(controls.frequency !== undefined ? controls.frequency : 5);
  const ox = Number(controls.offsetX || 0);
  const oy = Number(controls.offsetY || 0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = (x + ox) / scale;
      const wave = Math.sin((sx * freq) / 20);
      const threshold = 0.5 + wave * 0.4;
      const idx = (y * w + x) * 4;

      lut.inlinePairMatch(data[idx], data[idx + 1], data[idx + 2], threshold, out, idx);
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

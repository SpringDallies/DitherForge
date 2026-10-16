// Authentic CMYK & Grayscale Halftone Processing Engine
// Provides full angled screen generation, GCR (Gray Component Replacement),
// supersampled dot anti-aliasing, and subtractive ink synthesis.

const DEG_TO_RAD = Math.PI / 180;

function srgbToLinear(val) {
  const v = val / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(val) {
  return val <= 0.0031308 ? val * 12.92 : 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
}

function applyDotGain(val, dotGain) {
  const p = 1 + dotGain;
  return Math.pow(Math.max(0, Math.min(1, val)), p);
}

// Sample luminance in rotated cell
function sampleLuminanceCell(data, w, h, cx, cy, cellSize, angleDeg) {
  const half = cellSize / 2;
  const steps = 4;
  const step = cellSize / steps;
  const rad = angleDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  let lumSum = 0, count = 0;
  for (let v = 0; v < steps; v++) {
    for (let u = 0; u < steps; u++) {
      const lx = -half + u * step + step / 2;
      const ly = -half + v * step + step / 2;
      const rx = lx * cos + ly * sin;
      const ry = -lx * sin + ly * cos;
      const px = Math.round(cx + rx);
      const py = Math.round(cy + ry);

      if (px >= 0 && px < w && py >= 0 && py < h) {
        const idx = (py * w + px) * 4;
        const r = srgbToLinear(data[idx]);
        const g = srgbToLinear(data[idx + 1]);
        const b = srgbToLinear(data[idx + 2]);
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lumSum += linearToSrgb(lum);
        count++;
      }
    }
  }
  return count > 0 ? lumSum / count : 0;
}

// Sample channel value in rotated cell
function sampleChannelCell(channel, w, h, cx, cy, cellSize, angleDeg) {
  const half = cellSize / 2;
  const steps = 4;
  const step = cellSize / steps;
  const rad = angleDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  let sum = 0, count = 0;
  for (let v = 0; v < steps; v++) {
    for (let u = 0; u < steps; u++) {
      const lx = -half + u * step + step / 2;
      const ly = -half + v * step + step / 2;
      const rx = lx * cos + ly * sin;
      const ry = -lx * sin + ly * cos;
      const px = Math.round(cx + rx);
      const py = Math.round(cy + ry);

      if (px >= 0 && px < w && py >= 0 && py < h) {
        sum += channel[py * w + px];
        count++;
      }
    }
  }
  return count > 0 ? sum / count : 0;
}

// Render angled screen for a single float channel (CMYK component)
function renderAngledScreen(channel, w, h, cellSize, angleDeg, dotGain, supersample = 2, offsetX = 0, offsetY = 0) {
  const S = Math.max(1, Math.min(4, supersample));
  const sw = w * S;
  const sh = h * S;
  const screen = new Uint8Array(sw * sh).fill(255);
  const maxR = cellSize / 2;
  const rad = angleDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const diag = Math.sqrt(w * w + h * h);
  const gridRange = Math.ceil(diag / cellSize) + 2;

  for (let gy = -gridRange; gy < gridRange; gy++) {
    for (let gx = -gridRange; gx < gridRange; gx++) {
      const gridX = (gx + 0.5) * cellSize + offsetX;
      const gridY = (gy + 0.5) * cellSize + offsetY;
      const cellCenterX = gridX * cos + gridY * sin + w / 2;
      const cellCenterY = -gridX * sin + gridY * cos + h / 2;

      if (cellCenterX < 0 || cellCenterX >= w || cellCenterY < 0 || cellCenterY >= h) continue;

      const sampled = sampleChannelCell(channel, w, h, cellCenterX, cellCenterY, cellSize, angleDeg);
      const val = applyDotGain(sampled, dotGain);
      const radius = Math.sqrt(val) * maxR;

      if (radius <= 0) continue;

      const scx = cellCenterX * S;
      const scy = cellCenterY * S;
      const sRadius = radius * S;
      const r2 = sRadius * sRadius;

      const minX = Math.max(0, Math.floor(scx - sRadius));
      const maxX = Math.min(sw - 1, Math.ceil(scx + sRadius));
      const minY = Math.max(0, Math.floor(scy - sRadius));
      const maxY = Math.min(sh - 1, Math.ceil(scy + sRadius));

      for (let py = minY; py <= maxY; py++) {
        const dy = py - scy;
        const dy2 = dy * dy;
        const row = py * sw;
        for (let px = minX; px <= maxX; px++) {
          const dx = px - scx;
          if (dx * dx + dy2 <= r2) {
            screen[row + px] = 0;
          }
        }
      }
    }
  }

  const out = new Uint8Array(w * h);
  const s2 = S * S;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          sum += screen[(y * S + sy) * sw + (x * S + sx)];
        }
      }
      out[y * w + x] = (sum / s2) | 0;
    }
  }
  return out;
}

// Render grayscale halftone screen
function renderGrayscaleScreen(data, w, h, cellSize, angleDeg, dotGain, supersample = 2) {
  const S = Math.max(1, Math.min(4, supersample));
  const sw = w * S;
  const sh = h * S;
  const screen = new Uint8Array(sw * sh).fill(255);
  const maxR = cellSize / 2;

  let cy = maxR;
  while (cy < h) {
    let cx = maxR;
    while (cx < w) {
      const lum = sampleLuminanceCell(data, w, h, cx, cy, cellSize, angleDeg);
      const val = 1 - applyDotGain(lum, dotGain);
      const radius = Math.sqrt(Math.max(0, val)) * maxR;

      if (radius > 0) {
        const scx = cx * S;
        const scy = cy * S;
        const sRadius = radius * S;
        const r2 = sRadius * sRadius;

        const minX = Math.max(0, Math.floor(scx - sRadius));
        const maxX = Math.min(sw - 1, Math.ceil(scx + sRadius));
        const minY = Math.max(0, Math.floor(scy - sRadius));
        const maxY = Math.min(sh - 1, Math.ceil(scy + sRadius));

        for (let py = minY; py <= maxY; py++) {
          const dy = py - scy;
          const dy2 = dy * dy;
          const row = py * sw;
          for (let px = minX; px <= maxX; px++) {
            const dx = px - scx;
            if (dx * dx + dy2 <= r2) {
              screen[row + px] = 0;
            }
          }
        }
      }
      cx += cellSize;
    }
    cy += cellSize;
  }

  const out = new Uint8Array(w * h);
  const s2 = S * S;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          sum += screen[(y * S + sy) * sw + (x * S + sx)];
        }
      }
      out[y * w + x] = (sum / s2) | 0;
    }
  }
  return out;
}

// RGB to CMYK with Gray Component Replacement (GCR)
function rgbToCmykGcr(r, g, b, gcrFactor = 0.5) {
  const kMax = 1 - Math.max(r, g, b);
  if (kMax >= 1) return [0, 0, 0, 1];

  const k = kMax * gcrFactor;
  if (k >= 1) return [0, 0, 0, 1];

  const invK = 1 - k;
  const c = Math.max(0, Math.min(1, (1 - r - k) / invK));
  const m = Math.max(0, Math.min(1, (1 - g - k) / invK));
  const y = Math.max(0, Math.min(1, (1 - b - k) / invK));
  return [c, m, y, Math.max(0, Math.min(1, k))];
}

export function processHalftone(w, h, inputBuffer, params = {}) {
  const src = new Uint8ClampedArray(inputBuffer);
  const out = new Uint8ClampedArray(w * h * 4);

  const mode = params.mode || 'cmyk';
  const cellSize = Math.max(2, params.cellSize !== undefined ? Number(params.cellSize) : 8);
  const dotGain = params.dotGain !== undefined ? Number(params.dotGain) : 0.1;
  const supersample = params.supersample !== undefined ? Number(params.supersample) : 2;
  const grayAngle = params.grayAngle !== undefined ? Number(params.grayAngle) : 45;
  const cyanAngle = params.cyanAngle !== undefined ? Number(params.cyanAngle) : 15;
  const magentaAngle = params.magentaAngle !== undefined ? Number(params.magentaAngle) : 75;
  const yellowAngle = params.yellowAngle !== undefined ? Number(params.yellowAngle) : 0;
  const blackAngle = params.blackAngle !== undefined ? Number(params.blackAngle) : 45;
  const gcr = params.gcr !== undefined ? Number(params.gcr) : 0.5;
  const usePhaseOffsets = params.usePhaseOffsets !== false;

  if (mode === 'grayscale') {
    const gray = renderGrayscaleScreen(src, w, h, cellSize, grayAngle, dotGain, supersample);
    for (let i = 0, dstIdx = 0; i < gray.length; i++, dstIdx += 4) {
      const v = gray[i];
      out[dstIdx] = v;
      out[dstIdx + 1] = v;
      out[dstIdx + 2] = v;
      if (src[dstIdx + 3] > 0) out[dstIdx + 3] = 255;
    }
  } else {
    // CMYK Mode
    const totalPixels = w * h;
    const cChan = new Float64Array(totalPixels);
    const mChan = new Float64Array(totalPixels);
    const yChan = new Float64Array(totalPixels);
    const kChan = new Float64Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = src[idx] / 255;
      const g = src[idx + 1] / 255;
      const b = src[idx + 2] / 255;
      const [c, m, y, k] = rgbToCmykGcr(r, g, b, gcr);
      cChan[i] = c;
      mChan[i] = m;
      yChan[i] = y;
      kChan[i] = k;
    }

    const phaseOffset = usePhaseOffsets ? cellSize : 0;
    const cScreen = renderAngledScreen(cChan, w, h, cellSize, cyanAngle, dotGain, supersample, 0, 0);
    const mScreen = renderAngledScreen(mChan, w, h, cellSize, magentaAngle, dotGain, supersample, phaseOffset * 0.25, phaseOffset * 0.25);
    const yScreen = renderAngledScreen(yChan, w, h, cellSize, yellowAngle, dotGain, supersample, phaseOffset * 0.5, phaseOffset * 0.5);
    const kScreen = renderAngledScreen(kChan, w, h, cellSize, blackAngle, dotGain, supersample, phaseOffset * 0.75, phaseOffset * 0.75);

    for (let i = 0, dstIdx = 0; i < totalPixels; i++, dstIdx += 4) {
      const cInk = 1 - cScreen[i] / 255;
      const mInk = 1 - mScreen[i] / 255;
      const yInk = 1 - yScreen[i] / 255;
      const kInk = 1 - kScreen[i] / 255;

      out[dstIdx] = Math.round((1 - cInk) * (1 - kInk) * 255);
      out[dstIdx + 1] = Math.round((1 - mInk) * (1 - kInk) * 255);
      out[dstIdx + 2] = Math.round((1 - yInk) * (1 - kInk) * 255);
      if (src[dstIdx + 3] > 0) out[dstIdx + 3] = 255;
    }
  }

  return {
    width: w,
    height: h,
    buffer: out.buffer
  };
}

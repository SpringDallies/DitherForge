// DitherForge Reorderable Effect Stack Pipeline
// Clean-Room Implementation of Stackable Post-Processing

export const AVAILABLE_EFFECT_TYPES = [
  { id: "glow", name: "Ignition Glow", defaultParams: { radius: 3, intensity: 0.6 } },
  { id: "blur_sharpen", name: "Blur / Sharpen", defaultParams: { amount: 0.8 } }, // < 0 blur, > 0 sharpen
  { id: "chromatic_aberration", name: "Chromatic Aberration", defaultParams: { offsetX: 4, offsetY: 0 } },
  { id: "jpeg_artifacts", name: "JPEG Artifacts", defaultParams: { quality: 0.3 } },
  { id: "halftone", name: "CMYK Halftone", defaultParams: { dotSize: 5, angle: 45, shape: "circle" } },
  { id: "scanlines", name: "CRT Scanlines", defaultParams: { thickness: 2, intensity: 0.4 } },
  { id: "pixelate", name: "Pixelate", defaultParams: { blockSize: 4 } },
  { id: "curves_levels", name: "Curves & Levels", defaultParams: { blackPoint: 0.05, whitePoint: 0.95, gamma: 1.1 } },
  { id: "vignette", name: "Vignette Falloff", defaultParams: { radius: 0.8, softness: 0.4 } }
];

export function applyEffectStack(imageData, stack) {
  if (!stack || stack.length === 0) return;
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  for (let i = 0; i < stack.length; i++) {
    const item = stack[i];
    if (!item.enabled) continue;

    switch (item.type) {
      case "glow":
        applyGlow(data, width, height, item.params);
        break;
      case "blur_sharpen":
        applyBlurSharpen(data, width, height, item.params);
        break;
      case "chromatic_aberration":
        applyChromaticAberration(data, width, height, item.params);
        break;
      case "jpeg_artifacts":
        applyJpegArtifacts(data, width, height, item.params);
        break;
      case "halftone":
        applyHalftone(data, width, height, item.params);
        break;
      case "scanlines":
        applyScanlines(data, width, height, item.params);
        break;
      case "pixelate":
        applyPixelate(data, width, height, item.params);
        break;
      case "curves_levels":
        applyCurvesLevels(data, width, height, item.params);
        break;
      case "vignette":
        applyVignette(data, width, height, item.params);
        break;
    }
  }
}

function applyGlow(data, width, height, params) {
  const rad = Math.max(1, Math.floor(params.radius || 3));
  const intensity = params.intensity !== undefined ? params.intensity : 0.6;
  const copy = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sr = 0, sg = 0, sb = 0, wSum = 0;
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const sIdx = (ny * width + nx) * 4;
            const w = 1 / (1 + dx * dx + dy * dy);
            sr += copy[sIdx] * w;
            sg += copy[sIdx + 1] * w;
            sb += copy[sIdx + 2] * w;
            wSum += w;
          }
        }
      }
      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, copy[idx] + (sr / wSum) * intensity);
      data[idx + 1] = Math.min(255, copy[idx + 1] + (sg / wSum) * intensity);
      data[idx + 2] = Math.min(255, copy[idx + 2] + (sb / wSum) * intensity);
    }
  }
}

function applyBlurSharpen(data, width, height, params) {
  const amt = params.amount !== undefined ? params.amount : 0.8;
  const copy = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const up = ((y - 1) * width + x) * 4;
      const dn = ((y + 1) * width + x) * 4;
      const lf = (y * width + (x - 1)) * 4;
      const rt = (y * width + (x + 1)) * 4;

      const avgR = (copy[up] + copy[dn] + copy[lf] + copy[rt]) * 0.25;
      const avgG = (copy[up + 1] + copy[dn + 1] + copy[lf + 1] + copy[rt + 1]) * 0.25;
      const avgB = (copy[up + 2] + copy[dn + 2] + copy[lf + 2] + copy[rt + 2]) * 0.25;

      data[idx] = Math.max(0, Math.min(255, copy[idx] + (copy[idx] - avgR) * amt));
      data[idx + 1] = Math.max(0, Math.min(255, copy[idx + 1] + (copy[idx + 1] - avgG) * amt));
      data[idx + 2] = Math.max(0, Math.min(255, copy[idx + 2] + (copy[idx + 2] - avgB) * amt));
    }
  }
}

function applyChromaticAberration(data, width, height, params) {
  const ox = Math.floor(params.offsetX || 4);
  const oy = Math.floor(params.offsetY || 0);
  const copy = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rx = Math.max(0, Math.min(width - 1, x + ox));
      const ry = Math.max(0, Math.min(height - 1, y + oy));
      const bx = Math.max(0, Math.min(width - 1, x - ox));
      const by = Math.max(0, Math.min(height - 1, y - oy));

      const idx = (y * width + x) * 4;
      data[idx] = copy[(ry * width + rx) * 4];
      data[idx + 1] = copy[(y * width + x) * 4 + 1];
      data[idx + 2] = copy[(by * width + bx) * 4 + 2];
    }
  }
}

function applyJpegArtifacts(data, width, height, params) {
  const q = params.quality !== undefined ? params.quality : 0.3;
  const step = Math.max(2, Math.floor((1 - q) * 48));
  const bs = 8;

  for (let by = 0; by < height; by += bs) {
    for (let bx = 0; bx < width; bx += bs) {
      const leadIdx = (by * width + bx) * 4;
      const qr = Math.floor(data[leadIdx] / step) * step;
      const qg = Math.floor(data[leadIdx + 1] / step) * step;
      const qb = Math.floor(data[leadIdx + 2] / step) * step;

      for (let y = by; y < Math.min(height, by + bs); y++) {
        for (let x = bx; x < Math.min(width, bx + bs); x++) {
          const idx = (y * width + x) * 4;
          data[idx] = Math.round(data[idx] * 0.4 + qr * 0.6);
          data[idx + 1] = Math.round(data[idx + 1] * 0.4 + qg * 0.6);
          data[idx + 2] = Math.round(data[idx + 2] * 0.4 + qb * 0.6);
        }
      }
    }
  }
}

function applyHalftone(data, width, height, params) {
  const cell = Math.max(2, params.dotSize || 5);
  const angle = (params.angle || 45) * (Math.PI / 180);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const shape = params.shape || "circle";

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rx = Math.abs(x * cosA - y * sinA);
      const ry = Math.abs(x * sinA + y * cosA);
      const dx = (rx % cell) - cell * 0.5;
      const dy = (ry % cell) - cell * 0.5;
      const dist = shape === "diamond" ? Math.abs(dx) + Math.abs(dy) : Math.sqrt(dx * dx + dy * dy);

      const idx = (y * width + x) * 4;
      const luma = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
      const maxDist = cell * 0.5;
      const radius = (1 - luma / 255) * maxDist;

      if (dist > radius) {
        data[idx] = Math.min(255, data[idx] * 1.3);
        data[idx + 1] = Math.min(255, data[idx + 1] * 1.3);
        data[idx + 2] = Math.min(255, data[idx + 2] * 1.3);
      } else {
        data[idx] = Math.max(0, data[idx] * 0.2);
        data[idx + 1] = Math.max(0, data[idx + 1] * 0.2);
        data[idx + 2] = Math.max(0, data[idx + 2] * 0.2);
      }
    }
  }
}

function applyScanlines(data, width, height, params) {
  const thickness = Math.max(1, Math.floor(params.thickness || 2));
  const intensity = params.intensity !== undefined ? params.intensity : 0.4;
  const period = thickness * 2;

  for (let y = 0; y < height; y++) {
    if (y % period < thickness) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = Math.round(data[idx] * (1 - intensity));
        data[idx + 1] = Math.round(data[idx + 1] * (1 - intensity));
        data[idx + 2] = Math.round(data[idx + 2] * (1 - intensity));
      }
    }
  }
}

function applyPixelate(data, width, height, params) {
  const bs = Math.max(1, Math.floor(params.blockSize || 4));
  for (let by = 0; by < height; by += bs) {
    for (let bx = 0; bx < width; bx += bs) {
      const leadIdx = (by * width + bx) * 4;
      const lr = data[leadIdx], lg = data[leadIdx + 1], lb = data[leadIdx + 2];
      for (let y = by; y < Math.min(height, by + bs); y++) {
        for (let x = bx; x < Math.min(width, bx + bs); x++) {
          const idx = (y * width + x) * 4;
          data[idx] = lr;
          data[idx + 1] = lg;
          data[idx + 2] = lb;
        }
      }
    }
  }
}

function applyCurvesLevels(data, width, height, params) {
  const bp = params.blackPoint || 0;
  const wp = params.whitePoint || 1;
  const gamma = params.gamma || 1;
  const span = Math.max(0.001, wp - bp);
  const invGamma = 1 / Math.max(0.01, gamma);

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const norm = (data[i + c] / 255 - bp) / span;
      const adjusted = Math.pow(Math.max(0, Math.min(1, norm)), invGamma);
      data[i + c] = Math.round(adjusted * 255);
    }
  }
}

function applyVignette(data, width, height, params) {
  const rad = params.radius || 0.8;
  const softness = params.softness || 0.4;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const maxD = Math.sqrt(cx * cx + cy * cy) * rad;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const factor = Math.max(0, Math.min(1, 1 - Math.pow(dist / maxD, 1 / (softness + 0.01))));
      const idx = (y * width + x) * 4;
      data[idx] = Math.round(data[idx] * factor);
      data[idx + 1] = Math.round(data[idx + 1] * factor);
      data[idx + 2] = Math.round(data[idx + 2] * factor);
    }
  }
}

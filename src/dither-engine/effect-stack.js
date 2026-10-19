// DitherForge Reorderable Effect Stack Pipeline
// Clean-Room Implementation of Stackable Post-Processing

export const AVAILABLE_EFFECT_TYPES = [
  { id: "glow", name: "Ignition Glow", defaultParams: { radius: 3, intensity: 0.6 } },
  { id: "inverse_glow", name: "Inverse Glow", defaultParams: { radius: 3, intensity: 0.6 } },
  { id: "blur_sharpen", name: "Blur / Sharpen", defaultParams: { amount: 0.8 } },
  { id: "chromatic_aberration", name: "Chromatic Aberration", defaultParams: { offsetX: 4, offsetY: 0 } },
  { id: "jpeg_artifacts", name: "JPEG Artifacts", defaultParams: { quality: 0.3 } },
  { id: "halftone", name: "CMYK Halftone", defaultParams: { dotSize: 5, angle: 45, shape: "circle" } },
  { id: "scanlines", name: "CRT Scanlines", defaultParams: { thickness: 2, intensity: 0.4 } },
  { id: "pixelate", name: "Pixelate", defaultParams: { blockSize: 4 } },
  { id: "curves_levels", name: "Curves & Levels", defaultParams: { blackPoint: 0.05, whitePoint: 0.95, gamma: 1.1 } },
  { id: "vignette", name: "Vignette Falloff", defaultParams: { radius: 0.8, softness: 0.4 } },
  { id: "inverse_vignette", name: "Inverse Vignette", defaultParams: { radius: 0.8, softness: 0.4 } }
];

export function applyEffectStack(imageData, stack) {
  if (!stack || stack.length === 0) return;
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Snapshot original alpha channel to guarantee transparency preservation across all post-effects
  const origAlpha = new Uint8ClampedArray(width * height);
  for (let i = 0, a = 3; i < origAlpha.length; i++, a += 4) {
    origAlpha[i] = data[a];
  }

  for (let i = 0; i < stack.length; i++) {
    const item = stack[i];
    if (!item.enabled) continue;

    switch (item.type) {
      case "glow":
        applyGlow(data, width, height, item.params);
        break;
      case "inverse_glow":
        applyInverseGlow(data, width, height, item.params);
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
      case "inverse_vignette":
        applyInverseVignette(data, width, height, item.params);
        break;
    }
  }

  // Restore exact incoming alpha
  for (let i = 0, a = 3; i < origAlpha.length; i++, a += 4) {
    data[a] = origAlpha[i];
  }
}

function applyGlow(data, width, height, params) {
  const rad = Math.max(1, Math.min(24, Math.floor(params.radius || 3)));
  const intensity = params.intensity !== undefined ? Number(params.intensity) : 0.6;
  const sigma = Math.max(0.8, rad * 0.55);

  const numPixels = width * height;
  const brightR = new Float32Array(numPixels);
  const brightG = new Float32Array(numPixels);
  const brightB = new Float32Array(numPixels);

  // Extract high-luminance pixels (luma > 96) weighted by ((luma - 96) / 159)^1.25
  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma > 96) {
      const w = Math.pow((luma - 96) / 159, 1.25);
      brightR[i] = r * w;
      brightG[i] = g * w;
      brightB[i] = b * w;
    }
  }

  // Precompute 1D Gaussian kernel
  const kSize = rad * 2 + 1;
  const kernel = new Float32Array(kSize);
  let kSum = 0;
  for (let d = -rad; d <= rad; d++) {
    const kVal = Math.exp(-(d * d) / (2 * sigma * sigma));
    kernel[d + rad] = kVal;
    kSum += kVal;
  }
  for (let k = 0; k < kSize; k++) {
    kernel[k] /= kSum;
  }

  // Pass 1: Horizontal separable blur
  const tempR = new Float32Array(numPixels);
  const tempG = new Float32Array(numPixels);
  const tempB = new Float32Array(numPixels);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let accR = 0, accG = 0, accB = 0;
      for (let d = -rad; d <= rad; d++) {
        const nx = Math.max(0, Math.min(width - 1, x + d));
        const sOffset = rowOffset + nx;
        const kw = kernel[d + rad];
        accR += brightR[sOffset] * kw;
        accG += brightG[sOffset] * kw;
        accB += brightB[sOffset] * kw;
      }
      const dOffset = rowOffset + x;
      tempR[dOffset] = accR;
      tempG[dOffset] = accG;
      tempB[dOffset] = accB;
    }
  }

  // Pass 2: Vertical separable blur & Screen blend onto data
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let accR = 0, accG = 0, accB = 0;
      for (let d = -rad; d <= rad; d++) {
        const ny = Math.max(0, Math.min(height - 1, y + d));
        const sOffset = ny * width + x;
        const kw = kernel[d + rad];
        accR += tempR[sOffset] * kw;
        accG += tempG[sOffset] * kw;
        accB += tempB[sOffset] * kw;
      }

      const idx = (y * width + x) * 4;
      const origR = data[idx];
      const origG = data[idx + 1];
      const origB = data[idx + 2];

      const bloomR = Math.max(0, Math.min(255, accR * intensity));
      const bloomG = Math.max(0, Math.min(255, accG * intensity));
      const bloomB = Math.max(0, Math.min(255, accB * intensity));

      // Screen blend: 255 - ((255 - orig) * (255 - bloom)) / 255
      data[idx] = Math.max(0, Math.min(255, Math.round(255 - ((255 - origR) * (255 - bloomR)) / 255)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(255 - ((255 - origG) * (255 - bloomG)) / 255)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(255 - ((255 - origB) * (255 - bloomB)) / 255)));
    }
  }
}

function applyBlurSharpen(data, width, height, params) {
  const amt = params.amount !== undefined ? Number(params.amount) : 0.8;
  if (amt === 0) return;

  const rad = amt < 0 ? Math.max(1, Math.round(Math.abs(amt) * 6)) : 2;
  const sigma = Math.max(0.8, rad * 0.55);

  const kSize = rad * 2 + 1;
  const kernel = new Float32Array(kSize);
  let kSum = 0;
  for (let d = -rad; d <= rad; d++) {
    const kVal = Math.exp(-(d * d) / (2 * sigma * sigma));
    kernel[d + rad] = kVal;
    kSum += kVal;
  }
  for (let k = 0; k < kSize; k++) {
    kernel[k] /= kSum;
  }

  const copy = new Uint8ClampedArray(data);
  const numPixels = width * height;
  const tempR = new Float32Array(numPixels);
  const tempG = new Float32Array(numPixels);
  const tempB = new Float32Array(numPixels);

  // Pass 1: Horizontal separable blur
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let accR = 0, accG = 0, accB = 0;
      for (let d = -rad; d <= rad; d++) {
        const nx = Math.max(0, Math.min(width - 1, x + d));
        const sIdx = (rowOffset + nx) * 4;
        const kw = kernel[d + rad];
        accR += copy[sIdx] * kw;
        accG += copy[sIdx + 1] * kw;
        accB += copy[sIdx + 2] * kw;
      }
      const dOffset = rowOffset + x;
      tempR[dOffset] = accR;
      tempG[dOffset] = accG;
      tempB[dOffset] = accB;
    }
  }

  // Pass 2: Vertical separable blur & blend / unsharp mask
  const isBlur = amt < 0;
  const blend = Math.min(1, Math.abs(amt));
  const sharpenFactor = amt * 1.8;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let blurredR = 0, blurredG = 0, blurredB = 0;
      for (let d = -rad; d <= rad; d++) {
        const ny = Math.max(0, Math.min(height - 1, y + d));
        const sOffset = ny * width + x;
        const kw = kernel[d + rad];
        blurredR += tempR[sOffset] * kw;
        blurredG += tempG[sOffset] * kw;
        blurredB += tempB[sOffset] * kw;
      }

      const idx = (y * width + x) * 4;
      const origR = copy[idx];
      const origG = copy[idx + 1];
      const origB = copy[idx + 2];

      if (isBlur) {
        data[idx] = Math.max(0, Math.min(255, Math.round(origR * (1 - blend) + blurredR * blend)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(origG * (1 - blend) + blurredG * blend)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(origB * (1 - blend) + blurredB * blend)));
      } else {
        data[idx] = Math.max(0, Math.min(255, Math.round(origR + (origR - blurredR) * sharpenFactor)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(origG + (origG - blurredG) * sharpenFactor)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(origB + (origB - blurredB) * sharpenFactor)));
      }
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
  const q = Math.max(0.01, Math.min(1, params.quality !== undefined ? Number(params.quality) : 0.3));
  const severity = 1 - q;
  const yStep = Math.max(2, Math.round(severity * 42));
  const chromaBlock = severity > 0.5 ? 4 : 2;
  const cStep = Math.max(4, Math.round(severity * 68));

  const blockY = new Float32Array(64);
  const blockCb = new Float32Array(64);
  const blockCr = new Float32Array(64);

  for (let by = 0; by < height; by += 8) {
    const bH = Math.min(8, height - by);
    for (let bx = 0; bx < width; bx += 8) {
      const bW = Math.min(8, width - bx);
      let sumY = 0;
      const count = bW * bH;

      // Extract 8x8 block YCbCr
      for (let dy = 0; dy < bH; dy++) {
        for (let dx = 0; dx < bW; dx++) {
          const idx = ((by + dy) * width + (bx + dx)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
          const cbVal = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
          const crVal = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
          const bIdx = dy * 8 + dx;
          blockY[bIdx] = yVal;
          blockCb[bIdx] = cbVal;
          blockCr[bIdx] = crVal;
          sumY += yVal;
        }
      }

      // Quantize DC luma
      const meanY = sumY / count;
      const quantMeanY = Math.round(meanY / yStep) * yStep;

      // Subsample and quantize chroma in chromaBlock x chromaBlock sub-blocks
      for (let cby = 0; cby < bH; cby += chromaBlock) {
        const curCH = Math.min(chromaBlock, bH - cby);
        for (let cbx = 0; cbx < bW; cbx += chromaBlock) {
          const curCW = Math.min(chromaBlock, bW - cbx);
          let sumCb = 0, sumCr = 0, subCount = 0;
          for (let cdy = 0; cdy < curCH; cdy++) {
            for (let cdx = 0; cdx < curCW; cdx++) {
              const bIdx = (cby + cdy) * 8 + (cbx + cdx);
              sumCb += blockCb[bIdx];
              sumCr += blockCr[bIdx];
              subCount++;
            }
          }
          const quantCb = Math.round((sumCb / subCount) / cStep) * cStep;
          const quantCr = Math.round((sumCr / subCount) / cStep) * cStep;
          for (let cdy = 0; cdy < curCH; cdy++) {
            for (let cdx = 0; cdx < curCW; cdx++) {
              const bIdx = (cby + cdy) * 8 + (cbx + cdx);
              blockCb[bIdx] = quantCb;
              blockCr[bIdx] = quantCr;
            }
          }
        }
      }

      // Attenuate AC luma, quantize, add mosquito ringing on block boundaries, convert to RGB
      const acFactor = Math.max(0.15, q);
      for (let dy = 0; dy < bH; dy++) {
        for (let dx = 0; dx < bW; dx++) {
          const bIdx = dy * 8 + dx;
          const origY = blockY[bIdx];
          const ac = (origY - meanY) * acFactor;
          const quantAc = Math.round(ac / yStep) * yStep;
          let finalY = quantMeanY + quantAc;

          // Deterministic mosquito ringing along 8x8 block boundaries
          if (dy === 0 || dy === bH - 1 || dx === 0 || dx === bW - 1) {
            finalY += Math.sin((dx + dy) * 1.5) * (severity * 12);
          }
          finalY = Math.max(0, Math.min(255, finalY));

          const cb = blockCb[bIdx] - 128;
          const cr = blockCr[bIdx] - 128;

          const outR = Math.max(0, Math.min(255, Math.round(finalY + 1.402 * cr)));
          const outG = Math.max(0, Math.min(255, Math.round(finalY - 0.344136 * cb - 0.714136 * cr)));
          const outB = Math.max(0, Math.min(255, Math.round(finalY + 1.772 * cb)));

          const idx = ((by + dy) * width + (bx + dx)) * 4;
          data[idx] = outR;
          data[idx + 1] = outG;
          data[idx + 2] = outB;
        }
      }
    }
  }
}

function applyHalftone(data, width, height, params) {
  const cell = Math.max(2, Number(params.dotSize || 5));
  const baseAngle = params.angle !== undefined ? Number(params.angle) : 45;
  const shape = params.shape || "circle";
  const copy = new Uint8ClampedArray(data);

  // Print rosette angles: Cyan (base - 30), Magenta (base + 30), Yellow (base - 45), Black (base)
  const anglesDeg = [baseAngle - 30, baseAngle + 30, baseAngle - 45, baseAngle];
  const cosA = new Float64Array(4);
  const sinA = new Float64Array(4);
  for (let ch = 0; ch < 4; ch++) {
    const rad = anglesDeg[ch] * (Math.PI / 180);
    cosA[ch] = Math.cos(rad);
    sinA[ch] = Math.sin(rad);
  }

  const inks = new Float32Array(4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let ch = 0; ch < 4; ch++) {
        const ca = cosA[ch];
        const sa = sinA[ch];

        // Rotate into channel screen space (u, v)
        const u = x * ca - y * sa;
        const v = x * sa + y * ca;

        // Center of enclosing cell
        const cellU = (Math.floor(u / cell) + 0.5) * cell;
        const cellV = (Math.floor(v / cell) + 0.5) * cell;

        // Unrotate back into image space (centerX, centerY)
        const centerX = Math.max(0, Math.min(width - 1, Math.round(cellU * ca + cellV * sa)));
        const centerY = Math.max(0, Math.min(height - 1, Math.round(-cellU * sa + cellV * ca)));

        const sIdx = (centerY * width + centerX) * 4;
        const r = copy[sIdx] / 255;
        const g = copy[sIdx + 1] / 255;
        const b = copy[sIdx + 2] / 255;

        // CMYK conversion with Gray Component Replacement (GCR)
        const kMax = 1 - Math.max(r, g, b);
        const k = kMax * 0.65;
        const denom = 1 - k;
        let chVal = 0;
        if (ch === 0) {
          chVal = denom > 0.0001 ? Math.max(0, Math.min(1, (1 - r - k) / denom)) : 0;
        } else if (ch === 1) {
          chVal = denom > 0.0001 ? Math.max(0, Math.min(1, (1 - g - k) / denom)) : 0;
        } else if (ch === 2) {
          chVal = denom > 0.0001 ? Math.max(0, Math.min(1, (1 - b - k) / denom)) : 0;
        } else {
          chVal = Math.max(0, Math.min(1, k));
        }

        const du = u - cellU;
        const dv = v - cellV;
        const dist = shape === "diamond" ? (Math.abs(du) + Math.abs(dv)) * 0.75 : Math.hypot(du, dv);

        const dotRadius = Math.sqrt(chVal) * (cell * 0.68);
        const edge = dotRadius - dist;
        // 1px smooth anti-aliased ramp
        inks[ch] = Math.max(0, Math.min(1, edge + 0.5));
      }

      // Subtractive ink composite
      const outR = Math.max(0, Math.min(255, Math.round((1 - inks[0] * 0.92) * (1 - inks[3] * 0.96) * 255)));
      const outG = Math.max(0, Math.min(255, Math.round((1 - inks[1] * 0.92) * (1 - inks[3] * 0.96) * 255)));
      const outB = Math.max(0, Math.min(255, Math.round((1 - inks[2] * 0.90) * (1 - inks[3] * 0.96) * 255)));

      const idx = (y * width + x) * 4;
      data[idx] = outR;
      data[idx + 1] = outG;
      data[idx + 2] = outB;
    }
  }
}

function applyScanlines(data, width, height, params) {
  const thickness = Math.max(1, Math.floor(params.thickness || 2));
  const intensity = params.intensity !== undefined ? Number(params.intensity) : 0.4;
  const period = Math.max(2, thickness * 2);

  const boost = 1 + intensity * 0.08;
  const dim = 1 - intensity * 0.04;

  for (let y = 0; y < height; y++) {
    const phase = ((y % period) + 0.5) / period;
    const beam = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const effectiveBeam = beam + (1 - beam) * (luma * 0.35);
      const scanGain = 1 - intensity * (1 - effectiveBeam);

      const sub = x % 3;
      const modR = sub === 0 ? boost : dim;
      const modG = sub === 1 ? boost : dim;
      const modB = sub === 2 ? boost : dim;

      data[idx] = Math.max(0, Math.min(255, Math.round(r * scanGain * modR)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(g * scanGain * modG)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(b * scanGain * modB)));
    }
  }
}

function applyPixelate(data, width, height, params) {
  const bs = Math.max(1, Math.floor(params.blockSize || 4));
  if (bs <= 1) return;

  for (let by = 0; by < height; by += bs) {
    const maxBy = Math.min(height, by + bs);
    for (let bx = 0; bx < width; bx += bs) {
      const maxBx = Math.min(width, bx + bs);
      let sumR = 0, sumG = 0, sumB = 0, count = 0;

      for (let y = by; y < maxBy; y++) {
        const rowOffset = y * width;
        for (let x = bx; x < maxBx; x++) {
          const idx = (rowOffset + x) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          count++;
        }
      }

      const meanR = Math.round(sumR / count);
      const meanG = Math.round(sumG / count);
      const meanB = Math.round(sumB / count);

      for (let y = by; y < maxBy; y++) {
        const rowOffset = y * width;
        for (let x = bx; x < maxBx; x++) {
          const idx = (rowOffset + x) * 4;
          data[idx] = meanR;
          data[idx + 1] = meanG;
          data[idx + 2] = meanB;
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

function applyInverseGlow(data, width, height, params) {
  const rad = Math.max(1, Math.min(24, Math.floor(params.radius || 3)));
  const intensity = params.intensity !== undefined ? Number(params.intensity) : 0.6;
  const sigma = Math.max(0.8, rad * 0.55);

  const numPixels = width * height;
  const darkR = new Float32Array(numPixels);
  const darkG = new Float32Array(numPixels);
  const darkB = new Float32Array(numPixels);

  // Extract low-luminance (dark) pixels (luma < 159)
  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma < 159) {
      const w = Math.pow((159 - luma) / 159, 1.25);
      darkR[i] = (255 - r) * w;
      darkG[i] = (255 - g) * w;
      darkB[i] = (255 - b) * w;
    }
  }

  const kSize = rad * 2 + 1;
  const kernel = new Float32Array(kSize);
  let kSum = 0;
  for (let d = -rad; d <= rad; d++) {
    const kVal = Math.exp(-(d * d) / (2 * sigma * sigma));
    kernel[d + rad] = kVal;
    kSum += kVal;
  }
  for (let k = 0; k < kSize; k++) kernel[k] /= kSum;

  const tempR = new Float32Array(numPixels);
  const tempG = new Float32Array(numPixels);
  const tempB = new Float32Array(numPixels);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let accR = 0, accG = 0, accB = 0;
      for (let d = -rad; d <= rad; d++) {
        const nx = Math.max(0, Math.min(width - 1, x + d));
        const sOffset = rowOffset + nx;
        const kw = kernel[d + rad];
        accR += darkR[sOffset] * kw;
        accG += darkG[sOffset] * kw;
        accB += darkB[sOffset] * kw;
      }
      const dOffset = rowOffset + x;
      tempR[dOffset] = accR;
      tempG[dOffset] = accG;
      tempB[dOffset] = accB;
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let accR = 0, accG = 0, accB = 0;
      for (let d = -rad; d <= rad; d++) {
        const ny = Math.max(0, Math.min(height - 1, y + d));
        const sOffset = ny * width + x;
        const kw = kernel[d + rad];
        accR += tempR[sOffset] * kw;
        accG += tempG[sOffset] * kw;
        accB += tempB[sOffset] * kw;
      }
      const idx = (y * width + x) * 4;
      const shadowR = Math.max(0, Math.min(255, accR * intensity));
      const shadowG = Math.max(0, Math.min(255, accG * intensity));
      const shadowB = Math.max(0, Math.min(255, accB * intensity));

      // Multiply dark bloom onto original pixels
      data[idx] = Math.max(0, Math.min(255, Math.round((data[idx] * (255 - shadowR)) / 255)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round((data[idx + 1] * (255 - shadowG)) / 255)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round((data[idx + 2] * (255 - shadowB)) / 255)));
    }
  }
}

function applyInverseVignette(data, width, height, params) {
  const rad = params.radius || 0.8;
  const softness = params.softness || 0.4;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const maxD = Math.sqrt(cx * cx + cy * cy) * rad;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      // 0 at center, 1 at outer edges
      const edgeFactor = Math.max(0, Math.min(1, Math.pow(dist / maxD, 1 / (softness + 0.01))));
      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.round(data[idx] + (255 - data[idx]) * edgeFactor));
      data[idx + 1] = Math.min(255, Math.round(data[idx + 1] + (255 - data[idx + 1]) * edgeFactor));
      data[idx + 2] = Math.min(255, Math.round(data[idx + 2] + (255 - data[idx + 2]) * edgeFactor));
    }
  }
}


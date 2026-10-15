// Master Dither Algorithm Dispatcher
// Dispatches all DitherForge algorithms to their mathematical implementations
// Fully applies global dither settings: Scale, Luminance Threshold, Diffusion Strength, Serpentine, and Controls

import * as Basic from './basic.js';
import * as ErrorDiff from './error-diffusion.js';
import * as Glitch from './glitch.js';
import * as Ordered from './ordered.js';
import * as Patterned from './patterned.js';
import * as Polygon from './polygon.js';
import * as Special from './special.js';

export const ALGORITHM_DISPATCH = {
  // Basic (2)
  'color-separation': Basic.ditherColorSeparation,
  'none': Basic.ditherNone,

  // Error Diffusion (15)
  'artifact-modulation': ErrorDiff.ditherArtifactModulation,
  'atkinson': ErrorDiff.ditherAtkinson,
  'burkes': ErrorDiff.ditherBurkes,
  'cracked-diffuse': ErrorDiff.ditherCrackedDiffuse,
  'floyd-steinberg': ErrorDiff.ditherFloydSteinberg,
  'fractal-diffuse': ErrorDiff.ditherFractalDiffuse,
  'gaussian': ErrorDiff.ditherGaussian,
  'jarvis-judice-ninke': ErrorDiff.ditherJarvisJudiceNinke,
  'ostromukhov': ErrorDiff.ditherOstromukhov,
  'sierra-lite': ErrorDiff.ditherSierraLite,
  'sierra': ErrorDiff.ditherSierra,
  'stevenson-arce': ErrorDiff.ditherStevensonArce,
  'stucki': ErrorDiff.ditherStucki,
  'two-row-sierra': ErrorDiff.ditherTwoRowSierra,
  'vortex-diffusion': ErrorDiff.ditherVortexDiffusion,

  // Glitch Effects (17)
  'artifact-modulation-glitch': Glitch.ditherArtifactModulationGlitch,
  'atkinson-line-modulation': Glitch.ditherAtkinsonLineModulation,
  'atkinson-vhs': Glitch.ditherAtkinsonVHS,
  'contrast-aware-x': Glitch.ditherContrastAwareX,
  'contrast-aware-y': Glitch.ditherContrastAwareY,
  'glitch': Glitch.ditherGlitch,
  'modulated-diffuse-x': Glitch.ditherModulatedDiffuseX,
  'modulated-diffuse-y': Glitch.ditherModulatedDiffuseY,
  'ordered-modulation': Glitch.ditherOrderedModulation,
  'smooth-diffuse': Glitch.ditherSmoothDiffuse,
  'stucki-diffusion-lines': Glitch.ditherStuckiDiffusionLines,
  'uniform-modulation-x': Glitch.ditherUniformModulationX,
  'uniform-modulation-y': Glitch.ditherUniformModulationY,
  'wave-modulation-x': Glitch.ditherWaveModulationX,
  'wave-modulation-y': Glitch.ditherWaveModulationY,
  'waveform-alt': Glitch.ditherWaveformAlt,
  'waveform': Glitch.ditherWaveform,

  // Ordered (5)
  'bayer-matrix': Ordered.ditherBayerMatrix,
  'bayer-void': Ordered.ditherBayerVoid,
  'bit-tone': Ordered.ditherBitTone,
  'mosaic': Ordered.ditherMosaic,
  'random-ordered': Ordered.ditherRandomOrdered,

  // Patterned (13)
  'block-tone': Patterned.ditherBlockTone,
  'camo': Patterned.ditherCamo,
  'checkers': Patterned.ditherCheckers,
  'circle-grid': Patterned.ditherCircleGrid,
  'crosshatch': Patterned.ditherCrosshatch,
  'diamond-grid': Patterned.ditherDiamondGrid,
  'diamond': Patterned.ditherDiamond,
  'gridlock-traffic': Patterned.ditherGridlockTraffic,
  'heart-grid': Patterned.ditherHeartGrid,
  'pop-tone': Patterned.ditherPopTone,
  'print-pattern': Patterned.ditherPrintPattern,
  'square-mosaic': Patterned.ditherSquareMosaic,
  'stippling': Patterned.ditherStippling,

  // Polygon (4)
  'hexa-poly': Polygon.ditherHexaPoly,
  'low-poly': Polygon.ditherLowPoly,
  'penta-poly': Polygon.ditherPentaPoly,
  'tri-poly': Polygon.ditherTriPoly,

  // Special Effects (17)
  'beehive': Special.ditherBeehive,
  'diagonal': Special.ditherDiagonal,
  'displace-contour': Special.ditherDisplaceContour,
  'dotted-lines': Special.ditherDottedLines,
  'noise': Special.ditherNoise,
  'orb-diffuse-x': Special.ditherOrbDiffuseX,
  'orb-diffuse-y': Special.ditherOrbDiffuseY,
  'orb-diffuse': Special.ditherOrbDiffuse,
  'orb-matrix': Special.ditherOrbMatrix,
  'radial-burst': Special.ditherRadialBurst,
  'radial-peaks': Special.ditherRadialPeaks,
  'sine-distort': Special.ditherSineDistort,
  'sine-wave-modulation': Special.ditherSineWaveModulation,
  'thresholder': Special.ditherThresholder,
  'topography': Special.ditherTopography,
  'vortex': Special.ditherVortex,
  'wave': Special.ditherWave
};

// Algorithms that operate at the 1-pixel kernel level and require canvas downsampling/upscaling when scale > 1
const PIXEL_KERNEL_ALGORITHMS = new Set([
  'artifact-modulation',
  'atkinson',
  'burkes',
  'cracked-diffuse',
  'floyd-steinberg',
  'fractal-diffuse',
  'gaussian',
  'jarvis-judice-ninke',
  'ostromukhov',
  'sierra-lite',
  'sierra',
  'stevenson-arce',
  'stucki',
  'two-row-sierra',
  'vortex-diffusion',
  'atkinson-line-modulation',
  'atkinson-vhs',
  'contrast-aware-x',
  'contrast-aware-y',
  'modulated-diffuse-x',
  'modulated-diffuse-y',
  'smooth-diffuse',
  'stucki-diffusion-lines',
  'uniform-modulation-x',
  'uniform-modulation-y',
  'wave-modulation-x',
  'wave-modulation-y',
  'orb-diffuse',
  'orb-diffuse-x',
  'orb-diffuse-y'
]);

// Fast Area-Averaging Box Downsampler
function downsampleImage(src, srcW, srcH, dstW, dstH) {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    const syStart = Math.floor(dy * yRatio);
    const syEnd = Math.min(srcH, Math.max(syStart + 1, Math.floor((dy + 1) * yRatio)));
    for (let dx = 0; dx < dstW; dx++) {
      const sxStart = Math.floor(dx * xRatio);
      const sxEnd = Math.min(srcW, Math.max(sxStart + 1, Math.floor((dx + 1) * xRatio)));

      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let sy = syStart; sy < syEnd; sy++) {
        const rowOffset = sy * srcW * 4;
        for (let sx = sxStart; sx < sxEnd; sx++) {
          const idx = rowOffset + (sx * 4);
          rSum += src[idx];
          gSum += src[idx + 1];
          bSum += src[idx + 2];
          aSum += src[idx + 3];
          count++;
        }
      }

      const dstIdx = (dy * dstW + dx) * 4;
      dst[dstIdx] = Math.round(rSum / count);
      dst[dstIdx + 1] = Math.round(gSum / count);
      dst[dstIdx + 2] = Math.round(bSum / count);
      dst[dstIdx + 3] = Math.round(aSum / count);
    }
  }
  return dst;
}

// Crisp Nearest-Neighbor Upscaler (creates authentic sharp retro pixel blocks)
function upscaleNearest(src, srcW, srcH, dstW, dstH) {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    const sy = Math.min(srcH - 1, Math.floor(dy * yRatio));
    const srcRow = sy * srcW * 4;
    const dstRow = dy * dstW * 4;
    for (let dx = 0; dx < dstW; dx++) {
      const sx = Math.min(srcW - 1, Math.floor(dx * xRatio));
      const srcIdx = srcRow + (sx * 4);
      const dstIdx = dstRow + (dx * 4);
      dst[dstIdx] = src[srcIdx];
      dst[dstIdx + 1] = src[srcIdx + 1];
      dst[dstIdx + 2] = src[srcIdx + 2];
      dst[dstIdx + 3] = src[srcIdx + 3];
    }
  }
  return dst;
}

// Luminance Threshold Adjustment (0..100, neutral = 50)
function applyLuminanceThreshold(data, thresholdVal) {
  if (thresholdVal === undefined || Number(thresholdVal) === 50) return data;
  const t = Number(thresholdVal);
  // Shift RGB values across full [-200..+200] range so extreme thresholds reach all palette colors
  const shift = (50 - t) * 4.0;

  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    data[i] = Math.min(255, Math.max(0, Math.round(data[i] + shift)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] + shift)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] + shift)));
  }
  return data;
}

export function dispatchDither(algorithmId, width, height, inputBuffer, params = {}) {
  const normId = (algorithmId || '').replace(/_/g, '-');
  const fn = ALGORITHM_DISPATCH[normId] || ALGORITHM_DISPATCH[algorithmId] || ALGORITHM_DISPATCH['floyd-steinberg'];
  const palette = params.palette || ['#000000', '#ffffff'];

  // Normalize user parameters
  let rawScale = params.scale !== undefined ? Number(params.scale) : 1.0;
  if (params.scale === undefined && params.scaleDpi !== undefined) {
    const dpi = Number(params.scaleDpi);
    rawScale = dpi > 0 && dpi <= 45 ? 45 / dpi : 1.0;
  }
  const scaleVal = Math.max(0.05, Math.min(16.0, rawScale || 1.0));
  const diffStrength = params.diffusionStrength !== undefined ? Number(params.diffusionStrength) : 1.0;
  const thresholdNorm = params.threshold !== undefined
    ? (Number(params.threshold) > 1 ? Number(params.threshold) / 100 : Number(params.threshold))
    : 0.5;

  const isPixelKernel = PIXEL_KERNEL_ALGORITHMS.has(normId);
  // Geometric/Pattern algorithms handle scale natively without blurring via downsample;
  // Pixel-kernel algorithms downsample the image by scaleVal so their dither pixels scale up crisply.
  const algoScale = isPixelKernel ? 1.0 : scaleVal;

  const userControls = { ...(params.controls || {}), ...params };

  const controls = {
    ...userControls,
    offsetX: userControls.offsetX !== undefined ? Number(userControls.offsetX) : 0,
    offsetY: userControls.offsetY !== undefined ? Number(userControls.offsetY) : 0,
    scale: algoScale,
    rawScale: scaleVal,
    threshold: thresholdNorm,
    diffusionStrength: diffStrength,
    errorStrength: userControls.errorStrength !== undefined ? Number(userControls.errorStrength) : Math.round(diffStrength * 100),
    errorReduction: userControls.errorReduction !== undefined ? Number(userControls.errorReduction) : diffStrength,
    strength: userControls.strength !== undefined ? Number(userControls.strength) : Math.round(diffStrength * 100),
    serpentine: userControls.serpentine !== undefined ? !!userControls.serpentine : false,
    noiseAmount: userControls.noiseAmount !== undefined ? Number(userControls.noiseAmount) : 0.3,
    temporalSeed: userControls.temporalSeed !== undefined ? Number(userControls.temporalSeed) : 0,
    lineScale: userControls.lineScale !== undefined ? Number(userControls.lineScale) : 2,
    lineSpacing: userControls.lineSpacing !== undefined ? Number(userControls.lineSpacing) : 1,
    stripeSpacing: userControls.stripeSpacing !== undefined ? Number(userControls.stripeSpacing) : 4,
    dotSize: userControls.dotSize !== undefined ? Number(userControls.dotSize) : 4,
    dotScale: userControls.dotScale !== undefined ? Number(userControls.dotScale) : 8,
    checkersSize: userControls.checkersSize !== undefined ? userControls.checkersSize : 8,
    blockSize: userControls.blockSize !== undefined ? Number(userControls.blockSize) : 8,
    cellSize: userControls.cellSize !== undefined ? Number(userControls.cellSize) : 8,
    cellRadius: userControls.cellRadius !== undefined ? Number(userControls.cellRadius) : (userControls.cellSize !== undefined ? Number(userControls.cellSize) : 8),
    period: userControls.period !== undefined ? Number(userControls.period) : 8,
    matrixSize: userControls.matrixSize || '4x4'
  };

  let data;
  if (inputBuffer instanceof Uint8ClampedArray) {
    data = new Uint8ClampedArray(inputBuffer);
  } else if (inputBuffer && inputBuffer.buffer instanceof ArrayBuffer) {
    data = new Uint8ClampedArray(inputBuffer.buffer);
  } else if (inputBuffer instanceof ArrayBuffer) {
    data = new Uint8ClampedArray(inputBuffer.slice(0));
  } else {
    data = new Uint8ClampedArray(inputBuffer);
  }

  // 1. Apply Luminance Threshold (for all algorithms except 'none')
  if (normId !== 'none') {
    let lumThreshold = 50;
    if (params.luminanceThreshold !== undefined) {
      lumThreshold = Number(params.luminanceThreshold);
    } else if (params.threshold !== undefined) {
      lumThreshold = Number(params.threshold) <= 1 ? Math.round(Number(params.threshold) * 100) : Number(params.threshold);
    }
    if (lumThreshold !== 50) {
      applyLuminanceThreshold(data, lumThreshold);
    }
  }

  // 2. Apply Pixel-Kernel Scale via Downsample -> Dither -> Nearest Upscale
  if (normId !== 'none' && isPixelKernel && scaleVal > 1.05) {
    const targetW = Math.max(1, Math.round(width / scaleVal));
    const targetH = Math.max(1, Math.round(height / scaleVal));

    if (targetW < width || targetH < height) {
      const downsampleControls = {
        ...controls,
        offsetX: controls.offsetX / scaleVal,
        offsetY: controls.offsetY / scaleVal
      };
      const downsampled = downsampleImage(data, width, height, targetW, targetH);
      const ditheredDown = fn(targetW, targetH, downsampled, palette, downsampleControls);
      const fullResResult = upscaleNearest(ditheredDown, targetW, targetH, width, height);

      return {
        width,
        height,
        buffer: fullResResult.buffer
      };
    }
  }

  // Native resolution execution
  const resultClamped = fn(width, height, data, palette, controls);
  return {
    width,
    height,
    buffer: resultClamped.buffer
  };
}
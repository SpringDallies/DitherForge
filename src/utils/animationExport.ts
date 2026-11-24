// @ts-ignore
import { GifEncoder } from './gifEncoder.ts';
// Import frozen dither engine UNCHANGED via allowJs
// @ts-ignore
import { applyDitherAlgorithm } from '../dither-engine/algorithms.js';
import { isLegacyAlgorithm, applyLegacyAlgorithm } from '../algorithms/legacy';
import { applyEffectPipeline } from '../effects';
// @ts-ignore
import { BUILTIN_PALETTES } from '../dither-engine/palettes.js';
// @ts-ignore
import { applyTweaksFast, rotateHueHsvBuffer, rotateHueHsvPixel } from './fastTweaks.ts';
import { useAppStore } from '../state/useAppStore';
import { ffmpegService } from '../services/ffmpegService';
import { invoke } from '@tauri-apps/api/core';
import {
  DEFAULT_ASCII_SETTINGS,
  renderAsciiFrame,
  renderAsciiVectorToCanvas,
  type AsciiGridFrame,
  type AsciiSettings,
  type GlyphAtlasData
} from '../ascii';
import { buildAtlasForAsciiSettings } from '../ascii/workerAtlasSync';
import { ASCII_RENDER_EFFECT_ID, effectParamsToAsciiSettings } from '../effects/texture/asciiRender';

export interface ExportGifOptions {
  onProgress?: (progress: number, frameIndex: number, totalFrames: number) => void;
  scale?: number;
}

function applyEasing(t: number, mode: string): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (mode) {
    case 'easeIn':
      return clamped * clamped;
    case 'easeOut':
      return 1 - (1 - clamped) * (1 - clamped);
    case 'easeInOut':
      return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    case 'pulse':
      return Math.sin(clamped * Math.PI);
    case 'step':
      return clamped < 0.5 ? 0 : 1;
    default:
      return clamped;
  }
}

// Reusable scratch buffer for separable box blur in export pass
let exportBlurScratch: Uint8ClampedArray | null = null;

/**
 * O(1)-per-pixel Sliding-Window Separable Box Blur + Denoise + Highlight pass on RGBA buffer.
 * Preserves exact boundary clamping and rounding behavior of the original implementation
 * while avoiding per-frame allocations and O(r) inner-loop overhead.
 */
export function applyExtendedAdjustments(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  blurRadius: number,
  denoiseStrength: number,
  highlightAmount: number,
  scratchBuffer?: Uint8ClampedArray | null
): void {
  // 1. Highlight adjustment (targets bright luminances smoothly)
  if (highlightAmount !== 0) {
    const hFactor = (highlightAmount / 100) * 90;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const weight = lum * lum;
      const delta = hFactor * weight;
      data[i] = Math.max(0, Math.min(255, r + delta));
      data[i + 1] = Math.max(0, Math.min(255, g + delta));
      data[i + 2] = Math.max(0, Math.min(255, b + delta));
    }
  }

  // 2. Separable Box Blur + Denoise smoothing (O(1) sliding window per pixel)
  const totalBlur = Math.round(blurRadius + (denoiseStrength / 100) * 3);
  if (totalBlur < 1 || width <= 0 || height <= 0) return;

  const rad = Math.min(20, totalBlur);
  let temp: Uint8ClampedArray;
  if (scratchBuffer && scratchBuffer.length === data.length) {
    temp = scratchBuffer;
  } else {
    if (!exportBlurScratch || exportBlurScratch.length !== data.length) {
      exportBlurScratch = new Uint8ClampedArray(data.length);
    }
    temp = exportBlurScratch;
  }
  const blend = blurRadius > 0 ? 1.0 : Math.min(0.85, denoiseStrength / 100);

  // Horizontal pass with sliding window: reads from `data`, writes into `temp`
  for (let y = 0; y < height; y++) {
    const rowOff = y * width * 4;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    const initX1 = Math.min(width - 1, rad);
    for (let k = 0; k <= initX1; k++) {
      const idx = rowOff + k * 4;
      rSum += data[idx];
      gSum += data[idx + 1];
      bSum += data[idx + 2];
      count++;
    }

    for (let x = 0; x < width; x++) {
      const outIdx = rowOff + x * 4;
      temp[outIdx] = rSum / count;
      temp[outIdx + 1] = gSum / count;
      temp[outIdx + 2] = bSum / count;
      temp[outIdx + 3] = data[outIdx + 3];

      const removeX = x - rad;
      if (removeX >= 0) {
        const remIdx = rowOff + removeX * 4;
        rSum -= data[remIdx];
        gSum -= data[remIdx + 1];
        bSum -= data[remIdx + 2];
        count--;
      }
      const addX = x + rad + 1;
      if (addX < width) {
        const addIdx = rowOff + addX * 4;
        rSum += data[addIdx];
        gSum += data[addIdx + 1];
        bSum += data[addIdx + 2];
        count++;
      }
    }
  }

  // Vertical pass with sliding window: reads from `temp`, blends into `data`
  const stride = width * 4;
  const invBlend = 1 - blend;
  for (let x = 0; x < width; x++) {
    const colOff = x * 4;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    const initY1 = Math.min(height - 1, rad);
    for (let k = 0; k <= initY1; k++) {
      const idx = k * stride + colOff;
      rSum += temp[idx];
      gSum += temp[idx + 1];
      bSum += temp[idx + 2];
      count++;
    }

    for (let y = 0; y < height; y++) {
      const outIdx = y * stride + colOff;
      const br = rSum / count;
      const bg = gSum / count;
      const bb = bSum / count;
      data[outIdx] = data[outIdx] * invBlend + br * blend;
      data[outIdx + 1] = data[outIdx + 1] * invBlend + bg * blend;
      data[outIdx + 2] = data[outIdx + 2] * invBlend + bb * blend;

      const removeY = y - rad;
      if (removeY >= 0) {
        const remIdx = removeY * stride + colOff;
        rSum -= temp[remIdx];
        gSum -= temp[remIdx + 1];
        bSum -= temp[remIdx + 2];
        count--;
      }
      const addY = y + rad + 1;
      if (addY < height) {
        const addIdx = addY * stride + colOff;
        rSum += temp[addIdx];
        gSum += temp[addIdx + 1];
        bSum += temp[addIdx + 2];
        count++;
      }
    }
  }
}

interface AdjustmentCacheHooks {
  getCachedAdjusted: (sig: string) => Uint8ClampedArray | null;
  setCachedAdjusted: (sig: string, buf: Uint8ClampedArray) => void;
}

export interface AsciiGridOutputRef {
  grid: AsciiGridFrame | null;
}

let exportAsciiOutScratch: Uint8ClampedArray | null = null;

/**
 * Evaluates all animation tracks at timestamp `t` and renders the dithered + post-processed
 * frame into `workBuffer` / `frameImageData`.
 */
export function renderDeterministicAnimationFrame(
  storeState: any,
  basePixels: Uint8ClampedArray,
  width: number,
  height: number,
  t: number,
  frameIdx: number,
  workBuffer: Uint8ClampedArray,
  frameImageData: ImageData,
  cacheHooks?: AdjustmentCacheHooks,
  isStaticSource = true,
  outGridRef?: AsciiGridOutputRef
): void {
  const {
    renderMode = 'dither',
    asciiSettings = DEFAULT_ASCII_SETTINGS,
    customCharsets = [],
    animationTracks = [],
    brightness = 0,
    contrast = 0,
    saturation = 0,
    hue = 0,
    gamma = 1.0,
    blur = 0,
    denoise = 0,
    highlight = 0,
    depth = 8,
    workingPalette,
    previewPaletteId,
    savedPalettes = [],
    paletteDepth,
    algorithmId = 'floyd-steinberg',
    algoParams = {},
    currentParams,
    effects = []
  } = storeState;

  const isDedicatedAscii = renderMode === 'ascii' || (typeof algorithmId === 'string' && algorithmId.startsWith('ascii-'));

  const resolvedBaseParams =
    currentParams && Object.keys(currentParams).length > 0
      ? currentParams
      : algoParams[algorithmId] || {};

  let effBrightness = brightness;
  let effContrast = contrast;
  let effSaturation = saturation;
  let effHue = hue;
  let effGamma = gamma;
  let effBlur = blur;
  let effDenoise = denoise;
  let effHighlight = highlight;
  let effDepth = depth;
  let effPaletteDepth = paletteDepth;
  let effPaletteHueShift = 0;
  let effPaletteCycle = 0;

  const effAlgoParams: Record<string, any> = { ...resolvedBaseParams };
  const effEffects = effects.map((e: any) => ({ ...e, params: { ...e.params } }));
  let animatedNoiseActive = false;

  const effAsciiSettings: AsciiSettings = isDedicatedAscii
    ? {
        ...DEFAULT_ASCII_SETTINGS,
        ...asciiSettings,
        injectedChars: Array.isArray(asciiSettings?.injectedChars)
          ? asciiSettings.injectedChars.slice()
          : [],
        algoParams: asciiSettings?.algoParams ? { ...asciiSettings.algoParams } : {},
        asciiEffects: Array.isArray(asciiSettings?.asciiEffects)
          ? asciiSettings.asciiEffects.map((e: any) => ({ ...e, params: { ...e.params } }))
          : []
      }
    : asciiSettings;

  if (storeState.appMode === 'animation' || storeState.appMode === undefined) {
    for (const track of animationTracks) {
      if (!track.category || !track.property) continue;
      if (t >= track.startTime && t <= track.endTime) {
        const span = Math.max(0.001, track.endTime - track.startTime);
        const rawProgress = (t - track.startTime) / span;
        const eased = applyEasing(rawProgress, track.easing);
        const val = track.fromValue + (track.toValue - track.fromValue) * eased;

        if (track.category === 'adjustments') {
          if (track.property === 'brightness') effBrightness = val;
          else if (track.property === 'contrast') effContrast = val;
          else if (track.property === 'saturation') effSaturation = val;
          else if (track.property === 'hue') effHue = val;
          else if (track.property === 'gamma') effGamma = val;
          else if (track.property === 'blur') effBlur = val;
          else if (track.property === 'denoise') effDenoise = val;
          else if (track.property === 'highlight') effHighlight = val;
          else if (track.property === 'depth') effDepth = Math.round(val);
        } else if (track.category === 'style') {
          if (isDedicatedAscii && track.property.startsWith('ascii.')) {
            const propKey = track.property.slice('ascii.'.length);
            if (
              propKey === 'characterDepth' ||
              propKey === 'characterOffset' ||
              propKey === 'cellWidth' ||
              propKey === 'cellHeight' ||
              propKey === 'cellSpacing'
            ) {
              (effAsciiSettings as any)[propKey] = Math.round(val);
            } else if (propKey in effAsciiSettings) {
              (effAsciiSettings as any)[propKey] = val;
            }
          } else if (track.property === 'depth') {
            effDepth = Math.round(val);
          } else {
            effAlgoParams[track.property] = val;
            if (
              track.property === 'noiseAmount' ||
              track.property === 'noise' ||
              track.property === 'randomVal'
            ) {
              effAlgoParams.noiseAmount = val;
              effAlgoParams.noise = val;
              effAlgoParams.randomVal = val;
              animatedNoiseActive = true;
            }
          }
        } else if (track.category === 'effects') {
          const [effectId, paramKey] = track.property.split('.');
          const targetEffect = effEffects.find((e: any) => e.id === effectId);
          if (targetEffect && paramKey) {
            targetEffect.enabled = true;
            targetEffect.params[paramKey] = val;
          }
        } else if (track.category === 'palette') {
          if (track.property === 'paletteDepth') effPaletteDepth = Math.max(2, Math.round(val));
          else if (track.property === 'paletteHueShift') effPaletteHueShift = val;
          else if (track.property === 'paletteCycle') effPaletteCycle = Math.round(val);
        }
      }
    }
  }

  const byteLen = width * height * 4;
  const adjustmentsSig = isStaticSource
    ? `${effBrightness.toFixed(3)}:${effContrast.toFixed(3)}:${effSaturation.toFixed(3)}:${effHue.toFixed(3)}:${effGamma.toFixed(3)}:${effBlur.toFixed(3)}:${effDenoise.toFixed(3)}:${effHighlight.toFixed(3)}`
    : '';

  const cachedAdjusted =
    isStaticSource && cacheHooks ? cacheHooks.getCachedAdjusted(adjustmentsSig) : null;

  if (cachedAdjusted) {
    workBuffer.set(cachedAdjusted);
  } else {
    // 1. Copy source base pixels into workBuffer
    workBuffer.set(basePixels);

    // 2. Apply fast adjustments (brightness, contrast, saturation, gamma, hue)
    applyTweaksFast(workBuffer, width, height, {
      brightness: effBrightness / 100,
      contrast: effContrast / 100,
      saturation: effSaturation / 100,
      gamma: effGamma,
      hue: effHue
    });

    // 3. Extended adjustments (blur, denoise, highlight)
    if (effBlur > 0 || effDenoise > 0 || effHighlight !== 0) {
      applyExtendedAdjustments(workBuffer, width, height, effBlur, effDenoise, effHighlight);
    }

    if (isStaticSource && cacheHooks) {
      cacheHooks.setCachedAdjusted(adjustmentsSig, workBuffer);
    }
  }

  // 5. Temporal noise (exact deterministic parity with CenterViewport)
  const activeNoiseVal = Number(effAlgoParams.noiseAmount ?? effAlgoParams.noise ?? 0);
  if (!isDedicatedAscii && (animatedNoiseActive || activeNoiseVal > 0) && activeNoiseVal > 0) {
    const seedOffset = animatedNoiseActive ? frameIdx * 1337 : 42;
    const amp = activeNoiseVal * 110;
    for (let i = 0; i < byteLen; i += 4) {
      const hash = Math.sin((i >> 2) * 12.9898 + seedOffset) * 43758.5453;
      const n = (hash - Math.floor(hash) - 0.5) * amp;
      workBuffer[i] = Math.max(0, Math.min(255, workBuffer[i] + n));
      workBuffer[i + 1] = Math.max(0, Math.min(255, workBuffer[i + 1] + n));
      workBuffer[i + 2] = Math.max(0, Math.min(255, workBuffer[i + 2] + n));
    }
  }

  // 6. Effective palette calculation
  let basePalette: number[][];
  if (previewPaletteId) {
    const previewPal =
      BUILTIN_PALETTES.find((p: any) => p.id === previewPaletteId) ||
      savedPalettes.find((p: any) => p.id === previewPaletteId);
    basePalette = previewPal ? previewPal.colors : workingPalette;
  } else {
    basePalette =
      workingPalette && workingPalette.length > 0 ? workingPalette : BUILTIN_PALETTES[0].colors;
  }

  let slicedPalette = basePalette.slice(
    0,
    Math.max(2, Math.min(effPaletteDepth || basePalette.length, basePalette.length))
  );
  if (effPaletteCycle !== 0 && slicedPalette.length > 1) {
    const shift =
      ((effPaletteCycle % slicedPalette.length) + slicedPalette.length) % slicedPalette.length;
    slicedPalette = [...slicedPalette.slice(shift), ...slicedPalette.slice(0, shift)];
  }
  if (effPaletteHueShift !== 0) {
    slicedPalette = slicedPalette.map((c: any) => {
      const [nr, ng, nb] = rotateHueHsvPixel(c[0], c[1], c[2], effPaletteHueShift);
      return [nr, ng, nb, c[3] ?? 255];
    });
  }

  const resolvedFps = storeState.fps || 30;

  if (isDedicatedAscii) {
    const dedicatedAtlas = buildAtlasForAsciiSettings(
      effAsciiSettings,
      width,
      height,
      customCharsets
    );
    if (!exportAsciiOutScratch || exportAsciiOutScratch.length !== byteLen) {
      exportAsciiOutScratch = new Uint8ClampedArray(byteLen);
    }
    const asciiRes = renderAsciiFrame(
      workBuffer,
      effAsciiSettings,
      {
        width,
        height,
        frameIndex: frameIdx,
        time: t,
        fps: resolvedFps,
        palette: slicedPalette,
        previewScale: 1,
        isExport: true,
        atlas: dedicatedAtlas,
        customCharsets
      },
      exportAsciiOutScratch
    );
    frameImageData.data.set(exportAsciiOutScratch);
    if (outGridRef) {
      outGridRef.grid = asciiRes.grid;
    }
  } else {
    if (outGridRef) {
      outGridRef.grid = null;
    }
    const effNoise = effAlgoParams.noiseAmount ?? effAlgoParams.noise ?? 0;
    const mappedControls = {
      ...effAlgoParams,
      bleed: effAlgoParams.bleed ?? (effAlgoParams.bleedFraction ?? 0) / 100,
      smoothing: effAlgoParams.smoothing ?? effAlgoParams.smoothingFactor ?? effAlgoParams.smoothness,
      scale: effAlgoParams.scale ?? 1.0,
      noise: effNoise,
      noiseAmount: effNoise,
      randomVal: effNoise,
      errorStrength: effAlgoParams.diffusionStrength ?? 1.0,
      strength: effAlgoParams.diffusionStrength ?? 1.0
    };

    if (frameImageData.data !== workBuffer) {
      frameImageData.data.set(workBuffer);
    }

    if (isLegacyAlgorithm(algorithmId)) {
      const legacyOut = applyLegacyAlgorithm(
        exportWidth,
        exportHeight,
        frameImageData.data,
        slicedPalette,
        algorithmId,
        {
          threshold: effAlgoParams.threshold ?? 0.5,
          scale: mappedControls.scale,
          diffusionStrength: effAlgoParams.diffusionStrength ?? 1.0,
          noiseAmount: effNoise,
          depth: effDepth,
          temporalSeed: animatedNoiseActive ? frameIdx : 0,
          serpentine: effAlgoParams.serpentine ?? false,
          ...mappedControls
        }
      );
      frameImageData.data.set(legacyOut);
    } else {
      applyDitherAlgorithm(frameImageData, {
        algorithmId,
        palette: slicedPalette,
        ...mappedControls,
        controls: mappedControls,
        threshold: effAlgoParams.threshold ?? 0.5,
        scale: mappedControls.scale,
        bleed: mappedControls.bleed,
        smoothing: mappedControls.smoothing,
        diffusionStrength: effAlgoParams.diffusionStrength ?? 1.0,
        serpentine: effAlgoParams.serpentine ?? false,
        noiseAmount: effNoise,
        noise: effNoise,
        depth: effDepth,
        temporalSeed: animatedNoiseActive ? frameIdx : 0,
        offsetX: effAlgoParams.offsetX ?? 0,
        offsetY: effAlgoParams.offsetY ?? 0
      });
    }
  }

  const asciiAtlases: Record<string, GlyphAtlasData> = {};
  const asciiEffectAtlasKeys: Record<string, string> = {};
  for (let i = 0; i < effEffects.length; i++) {
    const item = effEffects[i];
    if (!item || !item.enabled) continue;
    const effId = item.type || item.id;
    if (effId !== ASCII_RENDER_EFFECT_ID && effId !== 'asciiRender') continue;
    const effSettings = effectParamsToAsciiSettings(item.params);
    const effAtlas = buildAtlasForAsciiSettings(effSettings, width, height, customCharsets);
    asciiAtlases[effAtlas.key] = effAtlas;
    asciiEffectAtlasKeys[item.id || ASCII_RENDER_EFFECT_ID] = effAtlas.key;
  }

  applyEffectPipeline(frameImageData, effEffects, {
    frameIndex: frameIdx,
    time: t,
    fps: resolvedFps,
    palette: slicedPalette,
    asciiAtlases,
    asciiEffectAtlasKeys,
    customCharsets
  });
}

// Reusable offscreen canvas & buffers for full-resolution exports
let exportOffscreenCanvas: HTMLCanvasElement | null = null;
let exportSourceCanvas: HTMLCanvasElement | null = null;
let exportWorkBuffer: Uint8ClampedArray | null = null;
let exportFrameImageData: ImageData | null = null;

/**
 * Renders the active frame at 100% native full resolution into an offscreen canvas.
 * This ensures that regardless of viewport previewQuality ('low' or 'mid'),
 * exports, SVGs, character grids, and clipboard copies always reflect full resolution.
 */
export function renderFullResolutionExportCanvas(storeState: any): HTMLCanvasElement | null {
  const sourceImageData = storeState.sourceImageData;
  if (!sourceImageData) return null;

  const width = sourceImageData.width;
  const height = sourceImageData.height;
  const byteLen = width * height * 4;

  if (!exportOffscreenCanvas) {
    exportOffscreenCanvas = document.createElement('canvas');
  }
  if (exportOffscreenCanvas.width !== width || exportOffscreenCanvas.height !== height) {
    exportOffscreenCanvas.width = width;
    exportOffscreenCanvas.height = height;
  }
  const ctx = exportOffscreenCanvas.getContext('2d');
  if (!ctx) return null;

  if (!exportSourceCanvas) {
    exportSourceCanvas = document.createElement('canvas');
  }
  if (exportSourceCanvas.width !== width || exportSourceCanvas.height !== height) {
    exportSourceCanvas.width = width;
    exportSourceCanvas.height = height;
  }
  const srcCtx = exportSourceCanvas.getContext('2d');

  if (!exportWorkBuffer || exportWorkBuffer.length !== byteLen) {
    exportWorkBuffer = new Uint8ClampedArray(byteLen);
  }
  if (
    !exportFrameImageData ||
    exportFrameImageData.width !== width ||
    exportFrameImageData.height !== height
  ) {
    exportFrameImageData = new ImageData(exportWorkBuffer as any, width, height);
  }

  let basePixels = sourceImageData.data;
  if (srcCtx) {
    srcCtx.putImageData(sourceImageData, 0, 0);
  }
  if (storeState.sourceVideoUrl) {
    const vid = document.querySelector('video') as HTMLVideoElement | null;
    if (vid && vid.readyState >= 2) {
      if (srcCtx) {
        srcCtx.drawImage(vid, 0, 0, width, height);
      }
      ctx.drawImage(vid, 0, 0, width, height);
      basePixels = ctx.getImageData(0, 0, width, height).data;
    }
  }

  const t = storeState.currentTime || 0;
  const frameIdx = Math.round(t * (storeState.fps || 30));

  const isAscii =
    storeState.renderMode === 'ascii' ||
    (typeof storeState.algorithmId === 'string' && storeState.algorithmId.startsWith('ascii-'));
  const outGridRef: AsciiGridOutputRef = { grid: null };

  renderDeterministicAnimationFrame(
    storeState,
    basePixels,
    width,
    height,
    t,
    frameIdx,
    exportWorkBuffer,
    exportFrameImageData,
    undefined,
    !storeState.sourceVideoUrl,
    outGridRef
  );

  if (isAscii && outGridRef.grid) {
    renderAsciiVectorToCanvas(
      outGridRef.grid,
      storeState.asciiSettings || DEFAULT_ASCII_SETTINGS,
      exportOffscreenCanvas,
      1,
      exportSourceCanvas,
      undefined,
      storeState.effects,
      { frameIndex: frameIdx, time: t, fps: storeState.fps || 30 }
    );
  } else {
    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(exportFrameImageData, 0, 0);
  }
  return exportOffscreenCanvas;
}

const VIDEO_SEEK_TIMEOUT_MS = 5000;
const VIDEO_READY_AFTER_SEEK_TIMEOUT_MS = 1000;

async function extractVideoFramePixelsAtTime(
  sourceVideoUrl: string,
  targetTimeSec: number,
  width: number,
  height: number,
  fallbackDuration: number,
  playbackMode?: string
): Promise<Uint8ClampedArray> {
  if (typeof document === 'undefined') {
    throw new Error('Cannot extract video frame without a DOM document.');
  }

  const offscreenVid = document.createElement('video');
  offscreenVid.muted = true;
  offscreenVid.playsInline = true;
  offscreenVid.crossOrigin = 'anonymous';
  offscreenVid.preload = 'auto';

  const extractCanvas = document.createElement('canvas');
  extractCanvas.width = width;
  extractCanvas.height = height;

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        offscreenVid.removeEventListener('loadeddata', onReady);
        offscreenVid.removeEventListener('canplay', onReady);
        offscreenVid.removeEventListener('error', onError);
        clearTimeout(timer);
      };
      const onReady = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Failed to load video for ASCII text export.'));
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Timed out waiting for video data during ASCII text export.'));
      }, VIDEO_SEEK_TIMEOUT_MS);

      offscreenVid.addEventListener('loadeddata', onReady);
      offscreenVid.addEventListener('canplay', onReady);
      offscreenVid.addEventListener('error', onError);
      offscreenVid.src = sourceVideoUrl;
      if (offscreenVid.readyState >= 2) {
        onReady();
      }
    });

    const rawDur =
      Number.isFinite(offscreenVid.duration) && offscreenVid.duration > 0
        ? offscreenVid.duration
        : Math.max(0.001, fallbackDuration || 1);
    const clampedT = Math.max(0, Number.isFinite(targetTimeSec) ? targetTimeSec : 0);
    const targetVidTime =
      playbackMode === 'looped'
        ? clampedT % rawDur
        : clampedT >= rawDur
        ? Math.max(0, rawDur - 0.001)
        : clampedT;

    if (Math.abs(offscreenVid.currentTime - targetVidTime) > 0.002) {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
          offscreenVid.removeEventListener('seeked', onSeeked);
          offscreenVid.removeEventListener('error', onError);
          clearTimeout(timer);
        };
        const onSeeked = () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        };
        const onError = () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error(`Failed to seek video to ${targetVidTime.toFixed(3)}s.`));
        };
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error(`Timed out seeking video to ${targetVidTime.toFixed(3)}s.`));
        }, VIDEO_SEEK_TIMEOUT_MS);

        offscreenVid.addEventListener('seeked', onSeeked);
        offscreenVid.addEventListener('error', onError);
        offscreenVid.currentTime = targetVidTime;
      });
    }

    // WebKitGTK safety: require decoded frame data (readyState >= 2) after seeked fires.
    // Never continue extraction if readiness times out without a decoded frame.
    if (offscreenVid.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
          offscreenVid.removeEventListener('canplay', onReady);
          offscreenVid.removeEventListener('loadeddata', onReady);
          offscreenVid.removeEventListener('error', onError);
          clearTimeout(timer);
        };
        const onReady = () => {
          if (settled || offscreenVid.readyState < 2) return;
          settled = true;
          cleanup();
          resolve();
        };
        const onError = () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(
            new Error(
              `Video error while waiting for decoded frame readiness at ${targetVidTime.toFixed(3)}s.`
            )
          );
        };
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanup();
          if (offscreenVid.readyState >= 2) {
            resolve();
            return;
          }
          reject(
            new Error(
              `Timed out waiting for decoded video frame readiness at ${targetVidTime.toFixed(3)}s (readyState=${offscreenVid.readyState}).`
            )
          );
        }, VIDEO_READY_AFTER_SEEK_TIMEOUT_MS);

        offscreenVid.addEventListener('canplay', onReady);
        offscreenVid.addEventListener('loadeddata', onReady);
        offscreenVid.addEventListener('error', onError);
        if (offscreenVid.readyState >= 2) {
          onReady();
        }
      });
    }

    if (offscreenVid.readyState < 2) {
      throw new Error(
        `Decoded video frame is not ready for extraction at ${targetVidTime.toFixed(3)}s (readyState=${offscreenVid.readyState}).`
      );
    }

    const extractCtx = extractCanvas.getContext('2d', { willReadFrequently: true });
    if (!extractCtx) {
      throw new Error('Failed to create 2D context for video frame extraction.');
    }
    extractCtx.clearRect(0, 0, width, height);
    extractCtx.drawImage(offscreenVid, 0, 0, width, height);
    return extractCtx.getImageData(0, 0, width, height).data;
  } finally {
    offscreenVid.pause();
    offscreenVid.src = '';
    try {
      offscreenVid.load();
    } catch {}
    extractCanvas.width = 0;
    extractCanvas.height = 0;
  }
}

export async function renderFullResolutionAsciiGrid(
  storeState: any
): Promise<AsciiGridFrame | null> {
  const isAscii = storeState.renderMode === 'ascii' || (typeof storeState.algorithmId === 'string' && storeState.algorithmId.startsWith('ascii-'));
  if (!isAscii) return null;
  const sourceImageData = storeState.sourceImageData;
  if (!sourceImageData) return null;

  const width = sourceImageData.width;
  const height = sourceImageData.height;
  const byteLen = width * height * 4;
  const t = storeState.currentTime || 0;
  const frameIdx = Math.round(t * (storeState.fps || 30));

  let basePixels: Uint8ClampedArray = sourceImageData.data;
  let isStaticSource = true;
  if (storeState.sourceVideoUrl) {
    basePixels = await extractVideoFramePixelsAtTime(
      storeState.sourceVideoUrl,
      t,
      width,
      height,
      storeState.duration || 1,
      storeState.videoPlaybackMode
    );
    isStaticSource = false;
  }

  if (!exportWorkBuffer || exportWorkBuffer.length !== byteLen) {
    exportWorkBuffer = new Uint8ClampedArray(byteLen);
  }
  const frameImageData: ImageData =
    typeof ImageData !== 'undefined'
      ? new ImageData(exportWorkBuffer as any, width, height)
      : ({ width, height, data: exportWorkBuffer } as ImageData);
  const outGridRef: AsciiGridOutputRef = { grid: null };

  renderDeterministicAnimationFrame(
    storeState,
    basePixels,
    width,
    height,
    t,
    frameIdx,
    exportWorkBuffer,
    frameImageData,
    undefined,
    isStaticSource,
    outGridRef
  );

  return outGridRef.grid;
}


/**
 * Returns a canvas guaranteed to contain the full-resolution, pristine dithered frame.
 * If the visible viewport canvas is already running at 100% full quality without
 * split-view or original-view active, it can be safely reused.
 * Otherwise, it renders offscreen at native dimensions.
 */
export function getExportCanvas(): HTMLCanvasElement | null {
  const state = useAppStore.getState();
  const sourceImageData = state.sourceImageData;
  if (!sourceImageData) return null;

  const viewportCanvas =
    (document.getElementById('mainViewportCanvas') as HTMLCanvasElement) ||
    (document.querySelector('canvas.preview-canvas') as HTMLCanvasElement);

  if (
    state.previewQuality === 'full' &&
    !state.showBeforeAfter &&
    !state.isOriginalView &&
    viewportCanvas &&
    viewportCanvas.width === sourceImageData.width &&
    viewportCanvas.height === sourceImageData.height
  ) {
    return viewportCanvas;
  }

  return renderFullResolutionExportCanvas(state);
}

/**
 * Direct offscreen deterministic frame rendering and GIF89a encoding.
 * Crucial guarantee: The visible preview canvas is NEVER captured or played.
 * The user's timeline playhead is NEVER altered.
 * All frames are evaluated analytically from timeline keyframes and rendered
 * into isolated memory buffers, then passed directly into GifEncoder.
 */
export async function exportAnimatedGif(
  storeState: any,
  options: ExportGifOptions = {}
): Promise<Uint8Array> {
  const {
    sourceImageData,
    duration = 5,
    fps = 30,
    playbackSpeed = 1
  } = storeState;

  if (!sourceImageData) {
    throw new Error('No active image loaded to export');
  }

  const width = sourceImageData.width;
  const height = sourceImageData.height;
  const totalPixels = width * height;
  const byteLen = totalPixels * 4;

  // 1. Calculate Frame Delays and Sampling Density:
  // GIF delay resolution is in centiseconds (1/100 s).
  // Target export FPS clamped to standard GIF range (5..30 FPS).
  const targetFps = Math.min(30, Math.max(5, Math.round(fps || 20)));
  const delayCs = Math.max(2, Math.round(100 / targetFps));
  const delaySec = delayCs / 100; // actual real display time per GIF frame in seconds
  const delayMs = delayCs * 10;   // in milliseconds for GifEncoder

  // Effective playback speed multiplier:
  // At 2x speed, timeline advances by (delaySec * 2) per displayed frame.
  // Result: total playback time of the GIF is duration / playbackSpeed.
  const speed = Math.max(0.1, Number(playbackSpeed) || 1);
  const timelineStep = delaySec * speed;
  const totalFrames = Math.max(1, Math.ceil(duration / timelineStep));

  // Initialize GifEncoder with exact logical screen dimensions
  const encoder = new GifEncoder(width, height, 0); // 0 = loop forever

  // Reusable buffers for offscreen frame processing to avoid GC pressure
  const workBuffer = new Uint8ClampedArray(byteLen);
  const frameImageData: any =
    typeof ImageData !== 'undefined'
      ? new ImageData(workBuffer, width, height)
      : { width, height, data: workBuffer };

  let cachedAdjustedBuffer: Uint8ClampedArray | null = null;
  let lastAdjustmentsSig = '';

  const cacheHooks: AdjustmentCacheHooks = {
    getCachedAdjusted: (sig: string) =>
      lastAdjustmentsSig === sig && cachedAdjustedBuffer ? cachedAdjustedBuffer : null,
    setCachedAdjusted: (sig: string, buf: Uint8ClampedArray) => {
      if (!cachedAdjustedBuffer || cachedAdjustedBuffer.length !== buf.length) {
        cachedAdjustedBuffer = new Uint8ClampedArray(buf.length);
      }
      cachedAdjustedBuffer.set(buf);
      lastAdjustmentsSig = sig;
    }
  };

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const t = Math.min(duration, frameIdx * timelineStep);

    renderDeterministicAnimationFrame(
      storeState,
      sourceImageData.data,
      width,
      height,
      t,
      frameIdx,
      workBuffer,
      frameImageData,
      cacheHooks,
      true
    );

    // 9. Add frame directly to GIF encoder
    encoder.addFrame(workBuffer, { delay: delayMs, dispose: 2 });

    if (options.onProgress) {
      options.onProgress((frameIdx + 1) / totalFrames, frameIdx + 1, totalFrames);
    }

    // Non-blocking UI yield every 3 frames
    if (frameIdx % 3 === 0 && totalFrames > 3) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // 10. Finalize stream with GIF trailer byte 0x3B
  const gifBytes = encoder.finish();
  return gifBytes;
}

/**
 * Convenience helper to render offscreen and trigger browser file download.
 */
export async function downloadAnimatedGif(
  storeState: any,
  onProgress?: (progress: number, frameIndex: number, totalFrames: number) => void
): Promise<void> {
  const bytes = await exportAnimatedGif(storeState, { onProgress });
  const baseName = (storeState.imageFileName || 'ditherforge_export').replace(/\.[^/.]+$/, '');
  const blob = new Blob([bytes as any], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}_animated.gif`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}



async function seekExportVideoToTime(vid: HTMLVideoElement, targetVidTime: number): Promise<void> {
  if (Math.abs(vid.currentTime - targetVidTime) > 0.005) {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        vid.removeEventListener('seeked', onSeeked);
        vid.removeEventListener('error', onError);
        clearTimeout(timer);
      };
      const onSeeked = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Video seek failed at ${targetVidTime.toFixed(3)}s`));
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Video seek timed out at ${targetVidTime.toFixed(3)}s`));
      }, VIDEO_SEEK_TIMEOUT_MS);

      vid.addEventListener('seeked', onSeeked);
      vid.addEventListener('error', onError);
      vid.currentTime = targetVidTime;
    });
  }

  if (vid.readyState < 2) {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        vid.removeEventListener('canplay', onReady);
        vid.removeEventListener('loadeddata', onReady);
        vid.removeEventListener('error', onError);
        clearTimeout(timer);
      };
      const onReady = () => {
        if (settled || vid.readyState < 2) return;
        settled = true;
        cleanup();
        resolve();
      };
      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Video frame readiness error at ${targetVidTime.toFixed(3)}s`));
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        if (vid.readyState >= 2) {
          resolve();
          return;
        }
        reject(new Error(`Timed out waiting for decoded video frame readiness at ${targetVidTime.toFixed(3)}s`));
      }, VIDEO_READY_AFTER_SEEK_TIMEOUT_MS);

      vid.addEventListener('canplay', onReady);
      vid.addEventListener('loadeddata', onReady);
      vid.addEventListener('error', onError);
    });
  }
}

/**
 * Native FFmpeg streaming video export (MP4 / WebM / MOV).
 * Streams rendered RGBA frames directly into an FFmpeg encoder process with bounded
 * single-frame memory, zero disk bloat, and full audio synchronization.
 */
export async function exportAnimatedVideoFfmpeg(
  storeState: any,
  format: 'mp4' | 'mov' | 'webm' = 'mp4',
  onProgress?: (progress: number, frameIndex: number, totalFrames: number) => void,
  customFilename?: string
): Promise<void> {
  const {
    sourceImageData,
    sourceVideoUrl,
    duration = 5,
    fps = 30,
    playbackSpeed = 1,
    imageFileName = 'ditherforge_export'
  } = storeState;

  if (!sourceImageData) {
    throw new Error('No active image loaded to export');
  }

  const width = sourceImageData.width;
  const height = sourceImageData.height;
  const byteLen = width * height * 4;

  const targetFps = Math.min(60, Math.max(1, Math.round(fps || 30)));
  const frameWallSec = 1 / targetFps;
  const speed = Math.max(0.1, Number(playbackSpeed) || 1);
  const timelineStep = frameWallSec * speed;
  const totalFrames = Math.max(1, Math.ceil(duration / timelineStep));

  const ext = format.toLowerCase();
  const rawName = customFilename || imageFileName || 'ditherforge_export';
  const baseName = rawName.replace(/\.[^/.]+$/, '');
  const timestamp = Date.now();
  const tempPath = `df_export_${timestamp}.${ext}`;

  let offscreenVid: HTMLVideoElement | null = null;
  let vidExtractCanvas: HTMLCanvasElement | null = null;
  let vidExtractCtx: CanvasRenderingContext2D | null = null;

  if (sourceVideoUrl) {
    offscreenVid = document.createElement('video');
    offscreenVid.src = sourceVideoUrl;
    offscreenVid.muted = true;
    offscreenVid.playsInline = true;
    offscreenVid.crossOrigin = 'anonymous';
    offscreenVid.preload = 'auto';
    await new Promise<void>((resolve) => {
      if (!offscreenVid) return resolve();
      const onReady = () => {
        offscreenVid?.removeEventListener('loadeddata', onReady);
        offscreenVid?.removeEventListener('error', onReady);
        resolve();
      };
      if (offscreenVid.readyState >= 2) {
        resolve();
      } else {
        offscreenVid.addEventListener('loadeddata', onReady);
        offscreenVid.addEventListener('error', onReady);
      }
    });
    vidExtractCanvas = document.createElement('canvas');
    vidExtractCanvas.width = width;
    vidExtractCanvas.height = height;
    vidExtractCtx = vidExtractCanvas.getContext('2d', { willReadFrequently: true });
  }

  const sessionId = await ffmpegService.startStream(
    tempPath,
    ext,
    width,
    height,
    targetFps,
    Boolean(sourceVideoUrl)
  );

  const workBuffer = new Uint8ClampedArray(byteLen);
  const frameImageData: any =
    typeof ImageData !== 'undefined'
      ? new ImageData(workBuffer, width, height)
      : { width, height, data: workBuffer };

  let cachedAdjustedBuffer: Uint8ClampedArray | null = null;
  let lastAdjustmentsSig = '';

  const cacheHooks: AdjustmentCacheHooks = {
    getCachedAdjusted: (sig: string) =>
      lastAdjustmentsSig === sig && cachedAdjustedBuffer ? cachedAdjustedBuffer : null,
    setCachedAdjusted: (sig: string, buf: Uint8ClampedArray) => {
      if (!cachedAdjustedBuffer || cachedAdjustedBuffer.length !== buf.length) {
        cachedAdjustedBuffer = new Uint8ClampedArray(buf.length);
      }
      cachedAdjustedBuffer.set(buf);
      lastAdjustmentsSig = sig;
    }
  };

  try {
    let lastYieldWall = performance.now();
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const t = Math.min(duration, frameIdx * timelineStep);

      let frameBasePixels = sourceImageData.data;
      const isStaticSource = !(offscreenVid && vidExtractCtx);
      if (offscreenVid && vidExtractCtx) {
        const vidDur = offscreenVid.duration || duration || 1;
        const targetVidTime =
          storeState.videoPlaybackMode === 'looped'
            ? t % vidDur
            : t >= vidDur
            ? Math.max(0, vidDur - 0.001)
            : t;
        await seekExportVideoToTime(offscreenVid, targetVidTime);
        vidExtractCtx.clearRect(0, 0, width, height);
        vidExtractCtx.drawImage(offscreenVid, 0, 0, width, height);
        frameBasePixels = vidExtractCtx.getImageData(0, 0, width, height).data;
      }

      renderDeterministicAnimationFrame(
        storeState,
        frameBasePixels,
        width,
        height,
        t,
        frameIdx,
        workBuffer,
        frameImageData,
        cacheHooks,
        isStaticSource
      );

      // Write pristine raw RGBA frame to FFmpeg stream stdin
      await ffmpegService.writeStreamFrame(sessionId, workBuffer);

      if (onProgress) {
        onProgress((frameIdx + 1) / totalFrames, frameIdx + 1, totalFrames);
      }

      // Wall-clock UI yield (>= 32ms) avoids unnecessary 4-15ms timer stalls on fast frames
      const nowWall = performance.now();
      if (nowWall - lastYieldWall >= 32) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        lastYieldWall = performance.now();
      }
    }

    const exportResult = await ffmpegService.finishStream(sessionId);
    const rawBytes = await invoke<Uint8Array>('read_binary_file', { path: exportResult.output_path });
    const u8Bytes = new Uint8Array(rawBytes);

    const mime =
      ext === 'mp4'
        ? 'video/mp4'
        : ext === 'mov'
        ? 'video/quicktime'
        : 'video/webm';

    const videoBlob = new Blob([u8Bytes], { type: mime });
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_animated.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    try {
      await ffmpegService.cancelStream(sessionId);
    } catch {}
    throw err;
  } finally {
    if (offscreenVid) {
      offscreenVid.pause();
      offscreenVid.src = '';
      offscreenVid.load();
    }
    if (vidExtractCanvas) {
      vidExtractCanvas.width = 0;
      vidExtractCanvas.height = 0;
    }
  }
}

/**
 * Deterministic offscreen video export (WebM / MP4 / MOV) using an isolated offscreen canvas.
 * Guarantee: Never touches the visible viewport canvas, never moves the visible playhead,
 * never triggers visible playback, and respects playbackSpeed and easing curves.
 */
export async function downloadAnimatedVideo(
  storeState: any,
  format: 'mp4' | 'mov' | 'webm' = 'webm',
  onProgress?: (progress: number, frameIndex: number, totalFrames: number) => void,
  customFilename?: string
): Promise<void> {
  // 1. In Tauri environment with FFmpeg available, prioritize native FFmpeg export
  if (ffmpegService.isTauri()) {
    try {
      const isAvail = await ffmpegService.isAvailable();
      if (isAvail) {
        await exportAnimatedVideoFfmpeg(storeState, format, onProgress, customFilename);
        return;
      }
    } catch (ffmpegErr) {
      console.warn('[downloadAnimatedVideo] Native FFmpeg export failed, using browser fallback:', ffmpegErr);
    }
  }

  // 2. Browser fallback using MediaRecorder + Canvas captureStream
  const {
    sourceImageData,
    sourceVideoUrl,
    duration = 5,
    fps = 30,
    playbackSpeed = 1,
    imageFileName = 'ditherforge_export'
  } = storeState;

  if (!sourceImageData) {
    throw new Error('No active image loaded to export');
  }

  const width = sourceImageData.width;
  const height = sourceImageData.height;
  const byteLen = width * height * 4;

  const targetFps = Math.min(60, Math.max(1, Math.round(fps || 30)));
  const frameWallSec = 1 / targetFps;
  const frameWallMs = Math.round(frameWallSec * 1000);
  const speed = Math.max(0.1, Number(playbackSpeed) || 1);
  const timelineStep = frameWallSec * speed;
  const totalFrames = Math.max(1, Math.ceil(duration / timelineStep));

  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
  const offCtx = offscreenCanvas.getContext('2d');
  if (!offCtx) {
    throw new Error('Failed to create offscreen 2D context for video export');
  }

  let offscreenVid: HTMLVideoElement | null = null;
  let vidExtractCanvas: HTMLCanvasElement | null = null;
  let vidExtractCtx: CanvasRenderingContext2D | null = null;

  if (sourceVideoUrl) {
    offscreenVid = document.createElement('video');
    offscreenVid.src = sourceVideoUrl;
    offscreenVid.muted = true;
    offscreenVid.playsInline = true;
    offscreenVid.crossOrigin = 'anonymous';
    offscreenVid.preload = 'auto';
    await new Promise<void>((resolve) => {
      if (!offscreenVid) return resolve();
      const onReady = () => {
        offscreenVid?.removeEventListener('loadeddata', onReady);
        offscreenVid?.removeEventListener('error', onReady);
        resolve();
      };
      if (offscreenVid.readyState >= 2) {
        resolve();
      } else {
        offscreenVid.addEventListener('loadeddata', onReady);
        offscreenVid.addEventListener('error', onReady);
      }
    });
    vidExtractCanvas = document.createElement('canvas');
    vidExtractCanvas.width = width;
    vidExtractCanvas.height = height;
    vidExtractCtx = vidExtractCanvas.getContext('2d', { willReadFrequently: true });
  }

  let stream: MediaStream | null = null;

  try {
    const captureFn = (offscreenCanvas as any).captureStream;
    if (typeof MediaRecorder === 'undefined' || typeof captureFn !== 'function') {
      throw new Error('MediaRecorder or canvas.captureStream is not supported in this environment');
    }

    stream = offscreenCanvas.captureStream(targetFps);
    const videoTrack = stream.getVideoTracks()[0] as any;

    const ext = format.toLowerCase();
    const candidateMimes =
      ext === 'webm'
        ? ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
        : ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];

    let selectedMime = '';
    for (const m of candidateMimes) {
      if (MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    const recorder = new MediaRecorder(
      stream,
      selectedMime
        ? { mimeType: selectedMime, videoBitsPerSecond: 12_000_000 }
        : { videoBitsPerSecond: 12_000_000 }
    );

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunks.push(ev.data);
      }
    };

    const stoppedPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const finalType = recorder.mimeType || selectedMime || 'video/webm';
        resolve(new Blob(chunks, { type: finalType }));
      };
      recorder.onerror = (err) => reject(err);
    });

    const workBuffer = new Uint8ClampedArray(byteLen);
    const frameImageData: any =
      typeof ImageData !== 'undefined'
        ? new ImageData(workBuffer, width, height)
        : { width, height, data: workBuffer };

    let cachedAdjustedBuffer: Uint8ClampedArray | null = null;
    let lastAdjustmentsSig = '';

    const cacheHooks: AdjustmentCacheHooks = {
      getCachedAdjusted: (sig: string) =>
        lastAdjustmentsSig === sig && cachedAdjustedBuffer ? cachedAdjustedBuffer : null,
      setCachedAdjusted: (sig: string, buf: Uint8ClampedArray) => {
        if (!cachedAdjustedBuffer || cachedAdjustedBuffer.length !== buf.length) {
          cachedAdjustedBuffer = new Uint8ClampedArray(buf.length);
        }
        cachedAdjustedBuffer.set(buf);
        lastAdjustmentsSig = sig;
      }
    };

    recorder.start();

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const frameStartWall = performance.now();
      const t = Math.min(duration, frameIdx * timelineStep);

      let frameBasePixels = sourceImageData.data;
      const isStaticSource = !(offscreenVid && vidExtractCtx);
      if (offscreenVid && vidExtractCtx) {
        const vidDur = offscreenVid.duration || duration || 1;
        const targetVidTime =
          storeState.videoPlaybackMode === 'looped'
            ? t % vidDur
            : t >= vidDur
            ? Math.max(0, vidDur - 0.001)
            : t;
        await seekExportVideoToTime(offscreenVid, targetVidTime);
        vidExtractCtx.clearRect(0, 0, width, height);
        vidExtractCtx.drawImage(offscreenVid, 0, 0, width, height);
        frameBasePixels = vidExtractCtx.getImageData(0, 0, width, height).data;
      }

      renderDeterministicAnimationFrame(
        storeState,
        frameBasePixels,
        width,
        height,
        t,
        frameIdx,
        workBuffer,
        frameImageData,
        cacheHooks,
        isStaticSource
      );

      offCtx.clearRect(0, 0, width, height);
      offCtx.putImageData(frameImageData, 0, 0);

      if (videoTrack && typeof videoTrack.requestFrame === 'function') {
        try {
          videoTrack.requestFrame();
        } catch {}
      }

      if (onProgress) {
        onProgress((frameIdx + 1) / totalFrames, frameIdx + 1, totalFrames);
      }

      const elapsed = performance.now() - frameStartWall;
      const waitMs = Math.max(4, frameWallMs - elapsed);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    recorder.stop();
    const videoBlob = await stoppedPromise;

    const rawName = customFilename || imageFileName || 'ditherforge_export';
    const baseName = rawName.replace(/\.[^/.]+$/, '');
    const finalMime = (recorder.mimeType || selectedMime || '').toLowerCase();
    const actualExt =
      finalMime.includes('mp4') || finalMime.includes('avc1')
        ? (ext === 'mov' ? 'mov' : 'mp4')
        : 'webm';
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_animated.${actualExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    if (offscreenVid) {
      offscreenVid.pause();
      offscreenVid.src = '';
      offscreenVid.load();
    }
    if (vidExtractCanvas) {
      vidExtractCanvas.width = 0;
      vidExtractCanvas.height = 0;
    }
    if (stream) {
      const tracks = stream.getTracks();
      for (let i = 0; i < tracks.length; i++) {
        try {
          tracks[i].stop();
        } catch {}
      }
    }
    offscreenCanvas.width = 0;
    offscreenCanvas.height = 0;
  }
}

/**
 * Export frame sequence as a compressed ZIP file containing sequential PNGs.
 */
export async function exportFrameSequenceZip(
  storeState: any,
  options: {
    scale?: number;
    onProgress?: (progress: number, frameIndex: number, totalFrames: number) => void;
    customFilename?: string;
  } = {}
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const {
    sourceImageData,
    sourceVideoUrl,
    duration = 5,
    fps = 30,
    playbackSpeed = 1
  } = storeState;

  if (!sourceImageData) {
    throw new Error('No active image loaded to export');
  }

  const baseW = sourceImageData.width;
  const baseH = sourceImageData.height;
  const byteLen = baseW * baseH * 4;

  const targetFps = Math.min(60, Math.max(1, Math.round(fps || 30)));
  const frameWallSec = 1 / targetFps;
  const speed = Math.max(0.1, Number(playbackSpeed) || 1);
  const timelineStep = frameWallSec * speed;
  const totalFrames = Math.max(1, Math.ceil(duration / timelineStep));

  const scale = options.scale && options.scale > 1 ? Math.min(4, Math.round(options.scale)) : 1;
  const outW = baseW * scale;
  const outH = baseH * scale;

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = baseW;
  renderCanvas.height = baseH;
  const renderCtx = renderCanvas.getContext('2d');
  if (!renderCtx) throw new Error('Failed to get 2D canvas context');

  let scaleCanvas: HTMLCanvasElement | null = null;
  let scaleCtx: CanvasRenderingContext2D | null = null;
  if (scale > 1) {
    scaleCanvas = document.createElement('canvas');
    scaleCanvas.width = outW;
    scaleCanvas.height = outH;
    scaleCtx = scaleCanvas.getContext('2d');
    if (scaleCtx) {
      scaleCtx.imageSmoothingEnabled = false; // crisp pixel-art scaling
    }
  }

  const workBuffer = new Uint8ClampedArray(byteLen);
  const frameImageData: any =
    typeof ImageData !== 'undefined'
      ? new ImageData(workBuffer, baseW, baseH)
      : { width: baseW, height: baseH, data: workBuffer };

  let cachedAdjustedBuffer: Uint8ClampedArray | null = null;
  let lastAdjustmentsSig = '';

  const cacheHooks: AdjustmentCacheHooks = {
    getCachedAdjusted: (sig: string) =>
      lastAdjustmentsSig === sig && cachedAdjustedBuffer ? cachedAdjustedBuffer : null,
    setCachedAdjusted: (sig: string, buf: Uint8ClampedArray) => {
      if (!cachedAdjustedBuffer || cachedAdjustedBuffer.length !== buf.length) {
        cachedAdjustedBuffer = new Uint8ClampedArray(buf.length);
      }
      cachedAdjustedBuffer.set(buf);
      lastAdjustmentsSig = sig;
    }
  };

  let offscreenVid: HTMLVideoElement | null = null;
  let vidExtractCanvas: HTMLCanvasElement | null = null;
  let vidExtractCtx: CanvasRenderingContext2D | null = null;

  if (sourceVideoUrl) {
    offscreenVid = document.createElement('video');
    offscreenVid.src = sourceVideoUrl;
    offscreenVid.muted = true;
    offscreenVid.playsInline = true;
    offscreenVid.crossOrigin = 'anonymous';
    offscreenVid.preload = 'auto';
    await new Promise<void>((resolve) => {
      if (!offscreenVid) return resolve();
      const onReady = () => {
        offscreenVid?.removeEventListener('loadeddata', onReady);
        offscreenVid?.removeEventListener('error', onReady);
        resolve();
      };
      if (offscreenVid.readyState >= 2) {
        resolve();
      } else {
        offscreenVid.addEventListener('loadeddata', onReady);
        offscreenVid.addEventListener('error', onReady);
      }
    });
    vidExtractCanvas = document.createElement('canvas');
    vidExtractCanvas.width = baseW;
    vidExtractCanvas.height = baseH;
    vidExtractCtx = vidExtractCanvas.getContext('2d', { willReadFrequently: true });
  }

  const isAscii =
    storeState.renderMode === 'ascii' ||
    (typeof storeState.algorithmId === 'string' && storeState.algorithmId.startsWith('ascii-'));
  const asciiSourceCanvas = isAscii ? document.createElement('canvas') : null;
  if (asciiSourceCanvas) {
    asciiSourceCanvas.width = baseW;
    asciiSourceCanvas.height = baseH;
  }
  const asciiSourceCtx = asciiSourceCanvas ? asciiSourceCanvas.getContext('2d') : null;

  try {
    const padLen = String(totalFrames).length > 4 ? String(totalFrames).length : 4;

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const t = Math.min(duration, frameIdx * timelineStep);

      let frameBasePixels = sourceImageData.data;
      const isStaticSource = !(offscreenVid && vidExtractCtx);
      if (offscreenVid && vidExtractCtx) {
        const vidDur = offscreenVid.duration || duration || 1;
        const targetVidTime =
          storeState.videoPlaybackMode === 'looped'
            ? t % vidDur
            : t >= vidDur
            ? Math.max(0, vidDur - 0.001)
            : t;
        await seekExportVideoToTime(offscreenVid, targetVidTime);
        vidExtractCtx.clearRect(0, 0, baseW, baseH);
        vidExtractCtx.drawImage(offscreenVid, 0, 0, baseW, baseH);
        frameBasePixels = vidExtractCtx.getImageData(0, 0, baseW, baseH).data;
      }

      if (asciiSourceCtx) {
        if (offscreenVid) {
          asciiSourceCtx.clearRect(0, 0, baseW, baseH);
          asciiSourceCtx.drawImage(offscreenVid, 0, 0, baseW, baseH);
        } else {
          asciiSourceCtx.putImageData(sourceImageData, 0, 0);
        }
      }

      const outGridRef: AsciiGridOutputRef = { grid: null };

      renderDeterministicAnimationFrame(
        storeState,
        frameBasePixels,
        baseW,
        baseH,
        t,
        frameIdx,
        workBuffer,
        frameImageData,
        cacheHooks,
        isStaticSource,
        outGridRef
      );

      if (isAscii && outGridRef.grid) {
        renderAsciiVectorToCanvas(
          outGridRef.grid,
          storeState.asciiSettings || DEFAULT_ASCII_SETTINGS,
          renderCanvas,
          1,
          asciiSourceCanvas,
          undefined,
          storeState.effects,
          { frameIndex: frameIdx, time: t, fps: targetFps }
        );
      } else {
        renderCtx.clearRect(0, 0, baseW, baseH);
        renderCtx.putImageData(frameImageData, 0, 0);
      }

      let activeCanvas = renderCanvas;
      if (scale > 1 && scaleCtx && scaleCanvas) {
        scaleCtx.clearRect(0, 0, outW, outH);
        scaleCtx.drawImage(renderCanvas, 0, 0, baseW, baseH, 0, 0, outW, outH);
        activeCanvas = scaleCanvas;
      }

      // Convert frame canvas to blob and append to zip
      const blob = await new Promise<Blob | null>((res) => activeCanvas.toBlob(res, 'image/png'));
      if (blob) {
        const frameNumberStr = String(frameIdx + 1).padStart(padLen, '0');
        zip.file(`frame_${frameNumberStr}.png`, blob);
      }

      if (options.onProgress) {
        options.onProgress((frameIdx + 1) / totalFrames, frameIdx + 1, totalFrames);
      }
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    return zipBlob;
  } finally {
    if (offscreenVid) {
      offscreenVid.pause();
      offscreenVid.src = '';
      offscreenVid.load();
    }
    if (vidExtractCanvas) {
      vidExtractCanvas.width = 0;
      vidExtractCanvas.height = 0;
    }
    renderCanvas.width = 0;
    renderCanvas.height = 0;
    if (scaleCanvas) {
      scaleCanvas.width = 0;
      scaleCanvas.height = 0;
    }
  }
}

export async function downloadFrameSequenceZip(
  storeState: any,
  options: {
    scale?: number;
    onProgress?: (progress: number, frameIndex: number, totalFrames: number) => void;
    customFilename?: string;
  } = {}
): Promise<void> {
  const blob = await exportFrameSequenceZip(storeState, options);
  const rawName = options.customFilename || storeState.imageFileName || 'ditherforge_export';
  const baseName = rawName.replace(/\.[^/.]+$/, '');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}_frames.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

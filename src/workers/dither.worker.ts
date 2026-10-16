// DitherForge Dedicated High-Performance Dither & Effects Web Worker
// Processes full dithering and post-effects off-main-thread with transferable ArrayBuffers

// @ts-ignore
import { applyDitherAlgorithm } from '../dither-engine/algorithms.js';
import { applyTweaksFast } from '../utils/fastTweaks';
import { applyEffectStack } from '../dither-engine/effect-stack.js';
// @ts-ignore
import { applyTemporalNoise } from '../dither-engine/temporal.js';

export interface WorkerDitherRequest {
  requestId: number;
  buffer: ArrayBuffer;
  width: number;
  height: number;
  tweaks: {
    brightness: number;
    contrast: number;
    saturation: number;
    gamma: number;
  };
  algorithmId: string;
  palette: number[][];
  params: any;
  effects: any[];
  temporal?: {
    patternId: string;
    frameIndex: number;
    intensity: number;
    speed: number;
    isPlaying?: boolean;
  };
}

export interface WorkerDitherResponse {
  requestId: number;
  buffer: ArrayBuffer;
  width: number;
  height: number;
  elapsedMs: number;
}

self.onmessage = (e: MessageEvent<WorkerDitherRequest>) => {
  try {
    const {
      requestId,
      buffer,
      width,
      height,
      tweaks,
      algorithmId,
      palette,
      params,
      effects,
      temporal
    } = e.data;

    const t0 = performance.now();
    const workingData = new Uint8ClampedArray(buffer);

    // 1. Image Pre-Adjustments (Accelerated LUT)
    applyTweaksFast(workingData, width, height, tweaks);

    // 1b. Temporal CRT Noise (runs whenever intensity > 0 or frameIndex > 0 or isPlaying)
    const isTemporalActive = temporal && temporal.patternId && temporal.patternId !== 'none' &&
      (temporal.intensity > 0 || temporal.frameIndex > 0 || temporal.isPlaying);
    if (isTemporalActive) {
      applyTemporalNoise(
        workingData,
        width,
        height,
        temporal.patternId,
        temporal.frameIndex || 0,
        temporal.intensity > 0 ? temporal.intensity : 0.5,
        temporal.speed || 1.0
      );
    }

    // 2. Dithering Pass
    // Portable ImageData proxy safe for all worker environments
    const dummyImgData = {
      data: workingData,
      width,
      height
    } as unknown as ImageData;

    applyDitherAlgorithm(dummyImgData, {
      algorithmId,
      palette,
      ...params,
      controls: { ...params },
      threshold: params.threshold ?? 0.5,
      scale: params.scale ?? 1.0,
      diffusionStrength: params.diffusionStrength ?? 1.0,
      serpentine: params.serpentine ?? false,
      noiseAmount: params.noiseAmount ?? 0.3,
      depth: params.depth ?? 8,
      temporalSeed: temporal?.frameIndex ?? params.temporalSeed ?? 0,
      offsetX: params.offsetX ?? 0,
      offsetY: params.offsetY ?? 0
    });

    // 3. Post-Effects Stack
    if (effects && effects.length > 0) {
      applyEffectStack(dummyImgData, effects);
    }

    const elapsedMs = performance.now() - t0;

    // Transfer array buffer back with zero-copy
    const response: WorkerDitherResponse = {
      requestId,
      buffer: workingData.buffer,
      width,
      height,
      elapsedMs
    };

    // @ts-ignore
    self.postMessage(response, [workingData.buffer]);
  } catch (err) {
    console.error("Error in dither worker thread:", err);
    throw err;
  }
};

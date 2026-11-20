import { applyDitherAlgorithm } from '../dither-engine/algorithms.js';
import { applyTweaksFast } from '../utils/fastTweaks';
import { applyEffectPipeline } from '../effects';
import { applyTemporalNoise } from '../dither-engine/temporal.js';
import { renderAsciiFrame } from '../ascii';
import type { AsciiCharsetDefinition, AsciiSettings, GlyphAtlasData } from '../ascii/types';
import {
  DEFAULT_WORKER_ATLAS_CACHE_LIMIT,
  deserializeGlyphAtlas,
  WorkerAtlasLruCache,
  type SerializedGlyphAtlas
} from '../ascii/workerAtlasSync';
import { ASCII_RENDER_EFFECT_ID } from '../effects/texture/asciiRender';

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
    hue?: number;
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
  renderMode?: 'dither' | 'ascii';
  asciiSettings?: AsciiSettings;
  customCharsets?: AsciiCharsetDefinition[];
  dedicatedAtlasKey?: string;
  atlasSyncPayloads?: SerializedGlyphAtlas[];
  effectAtlasKeys?: Record<string, string>;
  isAtlasRetry?: boolean;
  frameIndex?: number;
  time?: number;
  fps?: number;
  previewScale?: number;
  isExport?: boolean;
  skipTweaks?: boolean;
  skipDither?: boolean;
}

export interface WorkerDitherResponse {
  requestId: number;
  success: boolean;
  buffer?: ArrayBuffer;
  width?: number;
  height?: number;
  elapsedMs?: number;
  atlasResyncRequired?: boolean;
  missingAtlasKeys?: string[];
  error?: string;
  asciiGrid?: any;
}

const workerAtlasCache = new WorkerAtlasLruCache(DEFAULT_WORKER_ATLAS_CACHE_LIMIT);
let asciiOutScratch: Uint8ClampedArray | null = null;

function isEnabledAsciiRenderEffect(eff: any): boolean {
  if (!eff || !eff.enabled) return false;
  const effId = eff.type || eff.id;
  return effId === ASCII_RENDER_EFFECT_ID || effId === 'asciiRender';
}

function hasActiveTweaks(tweaks?: WorkerDitherRequest['tweaks']): boolean {
  if (!tweaks) return false;
  return (
    (tweaks.brightness ?? 0) !== 0 ||
    (tweaks.contrast ?? 0) !== 0 ||
    (tweaks.saturation ?? 0) !== 0 ||
    (tweaks.gamma ?? 1) !== 1 ||
    (tweaks.hue ?? 0) !== 0
  );
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
      temporal,
      renderMode,
      asciiSettings,
      customCharsets,
      dedicatedAtlasKey,
      atlasSyncPayloads,
      effectAtlasKeys,
      isAtlasRetry,
      frameIndex,
      time,
      fps,
      previewScale,
      isExport,
      skipTweaks,
      skipDither
    } = e.data;

    const t0 = performance.now();

    if (Array.isArray(atlasSyncPayloads)) {
      for (let i = 0; i < atlasSyncPayloads.length; i++) {
        workerAtlasCache.set(deserializeGlyphAtlas(atlasSyncPayloads[i]));
      }
    }

    const isDedicatedAscii = !skipDither && renderMode === 'ascii' && Boolean(asciiSettings);
    const hasEnabledEffects = Array.isArray(effects) && effects.some((eff) => eff && eff.enabled);

    // Guarantee: never render an ASCII frame with missing or substituted glyphs.
    const missingAtlasKeys: string[] = [];
    let dedicatedAtlas: GlyphAtlasData | null = null;
    let dedicatedGridFrame: any = null;
    if (isDedicatedAscii) {
      if (!dedicatedAtlasKey) {
        const missingKeyError: WorkerDitherResponse = {
          requestId,
          success: false,
          error: 'Dedicated ASCII render failed: missing required glyph atlas key.'
        };
        self.postMessage(missingKeyError);
        return;
      }
      const hit = workerAtlasCache.get(dedicatedAtlasKey);
      if (hit) {
        dedicatedAtlas = hit;
      } else {
        missingAtlasKeys.push(dedicatedAtlasKey);
      }
    }

    const asciiAtlases: Record<string, GlyphAtlasData> = {};
    if (hasEnabledEffects) {
      for (let i = 0; i < effects.length; i++) {
        const eff = effects[i];
        if (!isEnabledAsciiRenderEffect(eff)) continue;
        const itemId = eff.id || ASCII_RENDER_EFFECT_ID;
        const atlasKey = effectAtlasKeys?.[itemId] ?? effectAtlasKeys?.[ASCII_RENDER_EFFECT_ID];
        if (!atlasKey) {
          const missingEffKeyError: WorkerDitherResponse = {
            requestId,
            success: false,
            error: `ASCII effect render failed: missing required glyph atlas key for "${itemId}".`
          };
          self.postMessage(missingEffKeyError);
          return;
        }
        if (asciiAtlases[atlasKey]) continue;
        const hit = workerAtlasCache.get(atlasKey);
        if (hit) {
          asciiAtlases[atlasKey] = hit;
        } else if (!missingAtlasKeys.includes(atlasKey)) {
          missingAtlasKeys.push(atlasKey);
        }
      }
    }

    if (missingAtlasKeys.length > 0) {
      if (isAtlasRetry) {
        const retryFailedResponse: WorkerDitherResponse = {
          requestId,
          success: false,
          missingAtlasKeys,
          error: `ASCII glyph atlas synchronization failed after retry (missing keys: ${missingAtlasKeys.join(', ')})`
        };
        self.postMessage(retryFailedResponse);
        return;
      }

      const resyncResponse: WorkerDitherResponse = {
        requestId,
        success: true,
        atlasResyncRequired: true,
        missingAtlasKeys,
        buffer,
        width,
        height,
        elapsedMs: 0
      };
      (self as any).postMessage(resyncResponse, [buffer]);
      return;
    }

    const workingData = new Uint8ClampedArray(buffer);
    const resolvedFps = fps && fps > 0 ? fps : 30;
    const resolvedFrameIndex = frameIndex ?? temporal?.frameIndex ?? 0;
    const resolvedTime = time ?? resolvedFrameIndex / resolvedFps;

    if (!skipTweaks && hasActiveTweaks(tweaks)) {
      applyTweaksFast(workingData, width, height, tweaks);
    }

    const dummyImgData = {
      data: workingData,
      width,
      height
    } as unknown as ImageData;

    if (!skipDither) {
      const isTemporalActive =
        temporal &&
        temporal.patternId &&
        temporal.patternId !== 'none' &&
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

      if (isDedicatedAscii && asciiSettings && dedicatedAtlas) {
        if (!asciiOutScratch || asciiOutScratch.length !== workingData.length) {
          asciiOutScratch = new Uint8ClampedArray(workingData.length);
        }

        const asciiRes = renderAsciiFrame(
          workingData,
          asciiSettings,
          {
            width,
            height,
            frameIndex: resolvedFrameIndex,
            time: resolvedTime,
            fps: resolvedFps,
            palette,
            previewScale: previewScale ?? 1,
            isExport: Boolean(isExport),
            atlas: dedicatedAtlas,
            customCharsets
          },
          asciiOutScratch
        );

        dedicatedGridFrame = asciiRes.grid;
        workingData.set(asciiOutScratch);
      } else {
        const effNoise = params?.noiseAmount ?? params?.noise ?? 0;
        const mappedControls = {
          ...params,
          bleed: params?.bleed ?? (params?.bleedFraction ?? 0) / 100,
          smoothing: params?.smoothing ?? params?.smoothingFactor ?? params?.smoothness,
          scale: params?.scale ?? 1.0,
          noise: effNoise,
          noiseAmount: effNoise,
          randomVal: effNoise,
          errorStrength: params?.errorStrength ?? params?.diffusionStrength ?? 1.0,
          strength: params?.strength ?? params?.diffusionStrength ?? 1.0
        };

        applyDitherAlgorithm(dummyImgData, {
          algorithmId,
          palette,
          ...mappedControls,
          controls: mappedControls,
          threshold: params?.threshold ?? 0.5,
          scale: mappedControls.scale,
          bleed: mappedControls.bleed,
          smoothing: mappedControls.smoothing,
          diffusionStrength: params?.diffusionStrength ?? 1.0,
          serpentine: params?.serpentine ?? false,
          noiseAmount: effNoise,
          noise: effNoise,
          depth: params?.depth ?? 8,
          temporalSeed: temporal?.frameIndex ?? params?.temporalSeed ?? 0,
          offsetX: params?.offsetX ?? 0,
          offsetY: params?.offsetY ?? 0
        });
      }
    }

    if (hasEnabledEffects) {
      applyEffectPipeline(dummyImgData, effects, {
        frameIndex: resolvedFrameIndex,
        time: resolvedTime,
        fps: resolvedFps,
        palette,
        asciiAtlases,
        asciiEffectAtlasKeys: effectAtlasKeys,
        customCharsets
      });
    }

    const elapsedMs = performance.now() - t0;

    const response: WorkerDitherResponse = {
      requestId,
      success: true,
      buffer: workingData.buffer,
      width,
      height,
      elapsedMs,
      asciiGrid: dedicatedGridFrame
    };

    (self as any).postMessage(response, [workingData.buffer]);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Error in dither worker thread:', err);
    const errorResponse: WorkerDitherResponse = {
      requestId: e?.data?.requestId ?? -1,
      success: false,
      error: errorMessage
    };
    self.postMessage(errorResponse);
  }
};

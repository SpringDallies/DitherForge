import type { WorkerDitherRequest, WorkerDitherResponse } from './dither.worker';
import { EngineBridge } from '../services/EngineBridge';
import { applyDitherAlgorithm } from '../dither-engine/algorithms.js';
import { applyTweaksFast } from '../utils/fastTweaks';
import { applyEffectPipeline } from '../effects';
import { applyTemporalNoise } from '../dither-engine/temporal.js';
import { renderAsciiFrame } from '../ascii';
import type { GlyphAtlasData } from '../ascii/types';
import {
  buildAtlasForAsciiSettings,
  DEFAULT_WORKER_ATLAS_CACHE_LIMIT,
  MainThreadAtlasSyncTracker,
  type SerializedGlyphAtlas
} from '../ascii/workerAtlasSync';
import { ASCII_RENDER_EFFECT_ID, effectParamsToAsciiSettings } from '../effects/texture/asciiRender';

export interface PendingRequest {
  requestId: number;
  resolve: (response: WorkerDitherResponse) => void;
  reject: (reason: Error) => void;
  timer: any;
}

interface PreparedRequestAtlases {
  dedicatedAtlas: GlyphAtlasData | null;
  dedicatedAtlasKey?: string;
  effectAtlasesByKey: Record<string, GlyphAtlasData>;
  effectAtlasKeys: Record<string, string>;
  atlasSyncPayloads: SerializedGlyphAtlas[];
  transferables: ArrayBuffer[];
}

function isAsciiRenderEffectItem(item: any): boolean {
  if (!item || !item.enabled) return false;
  const effId = item.type || item.id;
  return effId === ASCII_RENDER_EFFECT_ID || effId === 'asciiRender';
}

function hasEnabledJsOnlyEffect(effects: any[]): boolean {
  if (!Array.isArray(effects) || effects.length === 0) return false;
  for (let i = 0; i < effects.length; i++) {
    if (isAsciiRenderEffectItem(effects[i])) return true;
  }
  return false;
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

function extractTransferableBuffer(view: Uint8ClampedArray): ArrayBuffer {
  if (view.byteOffset === 0 && view.byteLength === view.buffer.byteLength) {
    return view.buffer as ArrayBuffer;
  }
  return view.slice().buffer as ArrayBuffer;
}

export class DitherWorkerClient {
  private worker: Worker | any = null;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private nextRequestId: number = 1;
  private defaultTimeoutMs: number;
  private workerFactory: () => Worker;
  private hasCustomFactory: boolean;
  private workerDisabled: boolean = false;
  private consecutiveWorkerFailures: number = 0;
  private atlasSyncTracker = new MainThreadAtlasSyncTracker(DEFAULT_WORKER_ATLAS_CACHE_LIMIT);
  private fallbackAsciiOutScratch: Uint8ClampedArray | null = null;
  private rustInFlight: boolean = false;
  private latestQueuedRust: {
    request: Omit<WorkerDitherRequest, 'requestId'>;
    requestId: number;
    resolve: (res: WorkerDitherResponse) => void;
    reject: (err: Error) => void;
  } | null = null;
  private workerCoalesceInFlight: boolean = false;
  private latestQueuedWorker: {
    request: Omit<WorkerDitherRequest, 'requestId'>;
    requestId: number;
    timeoutMs?: number;
    resolve: (res: WorkerDitherResponse) => void;
    reject: (err: Error) => void;
  } | null = null;

  constructor(
    workerFactory?: () => Worker,
    defaultTimeoutMs: number = 30000
  ) {
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.hasCustomFactory = Boolean(workerFactory);
    this.workerFactory =
      workerFactory ||
      (() =>
        new Worker(new URL('./dither.worker.ts', import.meta.url), {
          type: 'module'
        }));
    this.initWorker(this.hasCustomFactory);
  }

  private initWorker(allowWithoutGlobalWorker = false): void {
    this.atlasSyncTracker.reset();
    if (this.workerDisabled) return;
    if (typeof Worker === 'undefined' && !allowWithoutGlobalWorker) {
      this.worker = null;
      return;
    }
    try {
      this.worker = this.workerFactory();
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      this.worker.onmessageerror = this.handleMessageError.bind(this);
    } catch (err) {
      console.warn('Dither worker unavailable; falling back to main-thread execution:', err);
      this.worker = null;
      if (!this.hasCustomFactory) {
        this.workerDisabled = true;
      }
    }
  }

  private handleMessage(e: MessageEvent<WorkerDitherResponse>): void {
    const data = e.data;
    if (!data || typeof data.requestId !== 'number') return;

    this.consecutiveWorkerFailures = 0;

    if (Array.isArray(data.missingAtlasKeys) && data.missingAtlasKeys.length > 0) {
      this.atlasSyncTracker.invalidateKeys(data.missingAtlasKeys);
    }

    const pending = this.pendingRequests.get(data.requestId);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pendingRequests.delete(data.requestId);

    if (data.success === false || data.error) {
      pending.reject(new Error(data.error || `Worker dither request #${data.requestId} failed`));
    } else {
      pending.resolve(data);
    }
  }

  private handleWorkerError(e: any): void {
    const errorMsg = e?.message || 'unknown worker error';
    console.error('Unexpected worker error/crash:', errorMsg);
    this.consecutiveWorkerFailures += 1;
    this.atlasSyncTracker.reset();
    const err = new Error(`Worker terminated unexpectedly: ${errorMsg}`);
    this.rejectAllPending(err);
    if (!this.hasCustomFactory && this.consecutiveWorkerFailures >= 3) {
      console.warn('Disabling dither worker after repeated crashes; using main-thread fallback.');
      this.workerDisabled = true;
      if (this.worker) {
        try {
          this.worker.terminate();
        } catch {}
        this.worker = null;
      }
      return;
    }
    this.restart();
  }

  private handleMessageError(e: any): void {
    console.error('Worker message deserialization failed:', e);
    this.atlasSyncTracker.reset();
    const err = new Error('Worker message deserialization failed');
    this.rejectAllPending(err);
  }

  private rejectAllPending(error: Error): void {
    for (const [, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  public restart(): void {
    this.atlasSyncTracker.reset();
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
    this.initWorker(this.hasCustomFactory);
  }

  public terminate(): void {
    this.atlasSyncTracker.reset();
    this.rejectAllPending(new Error('Worker terminated by client'));
    if (this.latestQueuedWorker) {
      const q = this.latestQueuedWorker;
      this.latestQueuedWorker = null;
      q.reject(new Error('Worker terminated by client'));
    }
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
  }

  private prepareRequestAtlases(
    request: Omit<WorkerDitherRequest, 'requestId'>,
    forWorkerTransfer: boolean
  ): PreparedRequestAtlases {
    let dedicatedAtlas: GlyphAtlasData | null = null;
    let dedicatedAtlasKey: string | undefined;
    const effectAtlasesByKey: Record<string, GlyphAtlasData> = {};
    const effectAtlasKeys: Record<string, string> = {};
    const atlasSyncPayloads: SerializedGlyphAtlas[] = [];
    const transferables: ArrayBuffer[] = [];

    if (!request.skipDither && request.renderMode === 'ascii' && request.asciiSettings) {
      dedicatedAtlas = buildAtlasForAsciiSettings(
        request.asciiSettings,
        request.width,
        request.height,
        request.customCharsets
      );
      dedicatedAtlasKey = dedicatedAtlas.key;
      if (forWorkerTransfer) {
        const synced = this.atlasSyncTracker.syncIfNeeded(dedicatedAtlas);
        if (synced.payload) {
          atlasSyncPayloads.push(synced.payload);
          transferables.push(...synced.transferables);
        }
      }
    }

    const effects = request.effects || [];
    for (let i = 0; i < effects.length; i++) {
      const item = effects[i];
      if (!isAsciiRenderEffectItem(item)) continue;
      const effSettings = effectParamsToAsciiSettings(item.params);
      const effAtlas = buildAtlasForAsciiSettings(
        effSettings,
        request.width,
        request.height,
        request.customCharsets
      );
      effectAtlasesByKey[effAtlas.key] = effAtlas;
      effectAtlasKeys[item.id || ASCII_RENDER_EFFECT_ID] = effAtlas.key;

      if (forWorkerTransfer) {
        const synced = this.atlasSyncTracker.syncIfNeeded(effAtlas);
        if (synced.payload) {
          atlasSyncPayloads.push(synced.payload);
          transferables.push(...synced.transferables);
        }
      }
    }

    return {
      dedicatedAtlas,
      dedicatedAtlasKey,
      effectAtlasesByKey,
      effectAtlasKeys,
      atlasSyncPayloads,
      transferables
    };
  }

  public async execute(
    request: Omit<WorkerDitherRequest, 'requestId'>,
    timeoutMs?: number
  ): Promise<WorkerDitherResponse> {
    const requestId = this.nextRequestId++;
    const settings = (request as any).settings || request;
    const algorithmId = settings.algorithmId || (request as any).algorithmId;

    const isDedicatedAscii = request.renderMode === 'ascii';

    if (
      !isDedicatedAscii &&
      !request.skipDither &&
      EngineBridge.isTauri() &&
      EngineBridge.isAlgorithmSupported(algorithmId)
    ) {
      if (this.rustInFlight) {
        if (this.latestQueuedRust) {
          this.latestQueuedRust.resolve({
            requestId: this.latestQueuedRust.requestId,
            success: true,
            dropped: true,
            buffer: this.latestQueuedRust.request.buffer,
            width: this.latestQueuedRust.request.width,
            height: this.latestQueuedRust.request.height,
            elapsedMs: 0
          });
        }
        return new Promise<WorkerDitherResponse>((resolve, reject) => {
          this.latestQueuedRust = { request, requestId, resolve, reject };
        });
      }

      return this.runRustPipeline(request, requestId);
    }

    // Latest-wins backpressure for live video playback & slider scrubbing on JS Worker
    if (request.coalesce) {
      if (this.workerCoalesceInFlight) {
        if (this.latestQueuedWorker) {
          this.latestQueuedWorker.resolve({
            requestId: this.latestQueuedWorker.requestId,
            success: true,
            dropped: true,
            buffer: this.latestQueuedWorker.request.buffer,
            width: this.latestQueuedWorker.request.width,
            height: this.latestQueuedWorker.request.height,
            elapsedMs: 0
          });
        }
        return new Promise<WorkerDitherResponse>((resolve, reject) => {
          this.latestQueuedWorker = { request, requestId, timeoutMs, resolve, reject };
        });
      }
      return this.runCoalescedWorkerDispatch(request, requestId, timeoutMs);
    }

    return this.dispatchToWorkerOrFallback(request, requestId, timeoutMs, 0);
  }

  private async runCoalescedWorkerDispatch(
    request: Omit<WorkerDitherRequest, 'requestId'>,
    requestId: number,
    timeoutMs?: number
  ): Promise<WorkerDitherResponse> {
    this.workerCoalesceInFlight = true;
    try {
      return await this.dispatchToWorkerOrFallback(request, requestId, timeoutMs, 0);
    } finally {
      this.workerCoalesceInFlight = false;
      if (this.latestQueuedWorker) {
        const next = this.latestQueuedWorker;
        this.latestQueuedWorker = null;
        this.runCoalescedWorkerDispatch(next.request, next.requestId, next.timeoutMs).then(
          next.resolve,
          next.reject
        );
      }
    }
  }

  private async dispatchToWorkerOrFallback(
    request: Omit<WorkerDitherRequest, 'requestId'>,
    callerRequestId: number,
    timeoutMs?: number,
    retryCount: number = 0
  ): Promise<WorkerDitherResponse> {
    if (!this.worker && !this.workerDisabled) {
      this.initWorker(this.hasCustomFactory);
    }

    if (!this.worker || this.workerDisabled) {
      if (this.hasCustomFactory && !this.workerDisabled) {
        throw new Error('Worker is not available in the current environment');
      }
      const prepared = this.prepareRequestAtlases(request, false);
      return this.runMainThreadFallback(request, callerRequestId, prepared);
    }

    const workerRequestId = retryCount === 0 ? callerRequestId : this.nextRequestId++;
    const prepared = this.prepareRequestAtlases(request, true);
    const hasEffectKeys = Object.keys(prepared.effectAtlasKeys).length > 0;

    const fullRequest: WorkerDitherRequest = {
      ...request,
      requestId: workerRequestId,
      ...(retryCount > 0 ? { isAtlasRetry: true } : {}),
      ...(prepared.dedicatedAtlasKey ? { dedicatedAtlasKey: prepared.dedicatedAtlasKey } : {}),
      ...(prepared.atlasSyncPayloads.length > 0
        ? { atlasSyncPayloads: prepared.atlasSyncPayloads }
        : {}),
      ...(hasEffectKeys ? { effectAtlasKeys: prepared.effectAtlasKeys } : {})
    };

    const transferList: ArrayBuffer[] = [fullRequest.buffer, ...prepared.transferables];

    const response = await new Promise<WorkerDitherResponse>((resolve, reject) => {
      const timeoutDuration = timeoutMs ?? this.defaultTimeoutMs;
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(workerRequestId)) {
          this.pendingRequests.delete(workerRequestId);
          reject(new Error(`Worker request #${workerRequestId} timed out after ${timeoutDuration}ms`));
        }
      }, timeoutDuration);

      this.pendingRequests.set(workerRequestId, {
        requestId: workerRequestId,
        resolve,
        reject,
        timer
      });

      try {
        this.worker.postMessage(fullRequest, transferList);
      } catch (postErr) {
        clearTimeout(timer);
        this.pendingRequests.delete(workerRequestId);
        this.atlasSyncTracker.reset();
        if (!this.hasCustomFactory) {
          console.warn('Worker postMessage failed; falling back to main-thread pipeline:', postErr);
          this.workerDisabled = true;
          try {
            const fallbackPrepared = this.prepareRequestAtlases(request, false);
            resolve(this.runMainThreadFallback(request, callerRequestId, fallbackPrepared));
          } catch (fallbackErr) {
            reject(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
          }
          return;
        }
        reject(postErr instanceof Error ? postErr : new Error(String(postErr)));
      }
    });

    if (response.atlasResyncRequired) {
      const missingKeys = Array.isArray(response.missingAtlasKeys) ? response.missingAtlasKeys : [];
      if (missingKeys.length > 0) {
        this.atlasSyncTracker.invalidateKeys(missingKeys);
      } else {
        this.atlasSyncTracker.reset();
      }

      if (retryCount < 1 && response.buffer) {
        return this.dispatchToWorkerOrFallback(
          {
            ...request,
            buffer: response.buffer
          },
          callerRequestId,
          timeoutMs,
          retryCount + 1
        );
      }

      throw new Error(
        `ASCII glyph atlas synchronization failed after retry${
          missingKeys.length > 0 ? ` (missing keys: ${missingKeys.join(', ')})` : ''
        }`
      );
    }

    if (response.requestId !== callerRequestId) {
      return { ...response, requestId: callerRequestId };
    }
    return response;
  }

  private runMainThreadFallback(
    request: Omit<WorkerDitherRequest, 'requestId'>,
    requestId: number,
    prepared: PreparedRequestAtlases
  ): WorkerDitherResponse {
    const t0 = performance.now();
    let fallbackAsciiGrid: any = null;
    const {
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
      frameIndex,
      time,
      fps,
      previewScale,
      isExport,
      skipTweaks,
      skipDither
    } = request;

    const workingData = new Uint8ClampedArray(request.buffer);
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

      if (renderMode === 'ascii' && asciiSettings) {
        if (!prepared.dedicatedAtlas) {
          throw new Error('Dedicated ASCII render failed: glyph atlas could not be prepared.');
        }
        if (
          !this.fallbackAsciiOutScratch ||
          this.fallbackAsciiOutScratch.length !== workingData.length
        ) {
          this.fallbackAsciiOutScratch = new Uint8ClampedArray(workingData.length);
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
            atlas: prepared.dedicatedAtlas,
            customCharsets
          },
          this.fallbackAsciiOutScratch
        );
        fallbackAsciiGrid = asciiRes.grid;
        workingData.set(this.fallbackAsciiOutScratch);
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

    if (effects && effects.length > 0 && effects.some((eff) => eff && eff.enabled)) {
      for (let i = 0; i < effects.length; i++) {
        const eff = effects[i];
        if (!isAsciiRenderEffectItem(eff)) continue;
        const itemId = eff.id || ASCII_RENDER_EFFECT_ID;
        const key = prepared.effectAtlasKeys[itemId];
        if (!key || !prepared.effectAtlasesByKey[key]) {
          throw new Error(`ASCII effect render failed: glyph atlas could not be prepared for "${itemId}".`);
        }
      }
      applyEffectPipeline(dummyImgData, effects, {
        frameIndex: resolvedFrameIndex,
        time: resolvedTime,
        fps: resolvedFps,
        palette,
        asciiAtlases: prepared.effectAtlasesByKey,
        asciiEffectAtlasKeys: prepared.effectAtlasKeys,
        customCharsets
      });
    }

    return {
      requestId,
      success: true,
      buffer: workingData.buffer,
      width,
      height,
      elapsedMs: performance.now() - t0,
      asciiGrid: fallbackAsciiGrid
    };
  }

  private async runRustPipeline(
    request: Omit<WorkerDitherRequest, 'requestId'>,
    requestId: number
  ): Promise<WorkerDitherResponse> {
    this.rustInFlight = true;
    try {
      const t0 = performance.now();
      const settings = (request as any).settings || request;
      const algorithmId = settings.algorithmId || (request as any).algorithmId;
      const width = request.width;
      const height = request.height;
      const data = new Uint8ClampedArray(request.buffer);
      const imgData = { data, width, height } as ImageData;

      const tweaks = (request as any).tweaks || settings;
      const temporal = (request as any).temporal;
      const isTemporalActive = Boolean(
        temporal &&
        temporal.patternId &&
        temporal.patternId !== 'none' &&
        (temporal.intensity > 0 || temporal.frameIndex > 0 || temporal.isPlaying)
      );

      const temporalPattern = isTemporalActive
        ? temporal.patternId
        : (settings.temporalNoise && settings.temporalIntensity > 0 ? (settings.temporalPattern || 'grain') : 'none');
      const temporalIntensity = isTemporalActive
        ? (temporal.intensity > 0 ? temporal.intensity : 0.5)
        : (settings.temporalNoise ? (settings.temporalIntensity || 0) : 0);
      const temporalSpeed = isTemporalActive
        ? (temporal.speed || 1.0)
        : (settings.temporalSpeed || 1.0);

      const rawParams = (request as any).params || {};
      const mappedControls = {
        ...rawParams,
        bleed: rawParams.bleed ?? (rawParams.bleedFraction !== undefined ? rawParams.bleedFraction / 100 : undefined),
        smoothing: rawParams.smoothing ?? rawParams.smoothingFactor ?? rawParams.smoothness,
        scale: rawParams.scale ?? settings.scale ?? 1.0
      };

      const effects = (request as any).effects || settings.effects || [];
      const resolvedFps = request.fps && request.fps > 0 ? request.fps : 30;
      const frameIndex = request.frameIndex ?? temporal?.frameIndex ?? rawParams.temporalSeed ?? settings.temporalSeed ?? 0;
      const resolvedTime = request.time ?? frameIndex / resolvedFps;
      const needsJsEffectStack = hasEnabledJsOnlyEffect(effects);
      const activePalette = (request as any).palette || settings.palette;

      const ditherSettings = {
        ...((request as any).settings || {}),
        algorithmId,
        palette: activePalette,
        ...mappedControls,
        controls: mappedControls,
        brightness: tweaks?.brightness ?? settings.brightness ?? 0,
        contrast: tweaks?.contrast ?? settings.contrast ?? 0,
        saturation: tweaks?.saturation ?? settings.saturation ?? 0,
        gamma: tweaks?.gamma ?? settings.gamma ?? 1.0,
        hue: tweaks?.hue ?? settings.hue ?? 0,
        temporalPattern,
        temporalIntensity,
        temporalSpeed,
        threshold: rawParams.threshold ?? settings.threshold ?? 0.5,
        scale: mappedControls.scale,
        bleed: mappedControls.bleed,
        smoothing: mappedControls.smoothing,
        diffusionStrength: rawParams.diffusionStrength ?? settings.diffusionStrength ?? 1.0,
        serpentine: rawParams.serpentine ?? settings.serpentine ?? false,
        noiseAmount: rawParams.noiseAmount ?? settings.noiseAmount ?? 0.0,
        depth: rawParams.depth ?? settings.depth ?? 8,
        temporalSeed: frameIndex,
        offsetX: rawParams.offsetX ?? settings.offsetX ?? 0,
        offsetY: rawParams.offsetY ?? settings.offsetY ?? 0,
        effectStack: needsJsEffectStack ? [] : effects
      };

      const bridgeResult = await EngineBridge.dither(imgData, ditherSettings);
      const postDitherBuffer = extractTransferableBuffer(imgData.data);

      if (needsJsEffectStack) {
        const postRes = await this.dispatchToWorkerOrFallback(
          {
            ...request,
            buffer: postDitherBuffer,
            palette: activePalette,
            effects,
            frameIndex,
            time: resolvedTime,
            fps: resolvedFps,
            skipTweaks: true,
            skipDither: true
          },
          requestId,
          undefined,
          0
        );
        return {
          ...postRes,
          elapsedMs: performance.now() - t0
        };
      }

      if (bridgeResult.backend !== 'rust') {
        if (Array.isArray(effects) && effects.some((e: any) => e && e.enabled)) {
          applyEffectPipeline(imgData, effects, {
            frameIndex,
            time: resolvedTime,
            fps: resolvedFps,
            palette: activePalette,
            customCharsets: request.customCharsets
          });
        }
      }

      return {
        requestId,
        success: true,
        buffer: extractTransferableBuffer(imgData.data),
        width,
        height,
        elapsedMs: performance.now() - t0
      };
    } finally {
      this.rustInFlight = false;
      if (this.latestQueuedRust) {
        const next = this.latestQueuedRust;
        this.latestQueuedRust = null;
        this.runRustPipeline(next.request, next.requestId).then(next.resolve, next.reject);
      }
    }
  }

  public getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

export const ditherWorkerClient = new DitherWorkerClient();

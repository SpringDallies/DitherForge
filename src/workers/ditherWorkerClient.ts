import type { WorkerDitherRequest, WorkerDitherResponse } from './dither.worker';
import { EngineBridge } from '../services/EngineBridge';
import { applyFastTweaks } from '../utils/fastTweaks';
import { applyEffectPipeline } from '../effects';
// @ts-ignore
import { applyTemporalNoise } from '../dither-engine/temporal.js';

export interface PendingRequest {
  requestId: number;
  resolve: (response: WorkerDitherResponse) => void;
  reject: (reason: Error) => void;
  timer: any;
}

export class DitherWorkerClient {
  private worker: Worker | any = null;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private nextRequestId: number = 1;
  private defaultTimeoutMs: number;
  private workerFactory: () => Worker;
  private rustInFlight: boolean = false;
  private latestQueuedRust: {
    request: Omit<WorkerDitherRequest, 'requestId'>;
    requestId: number;
    resolve: (res: WorkerDitherResponse) => void;
    reject: (err: Error) => void;
  } | null = null;

  constructor(
    workerFactory?: () => Worker,
    defaultTimeoutMs: number = 30000
  ) {
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.workerFactory =
      workerFactory ||
      (() =>
        new Worker(new URL('./dither.worker.ts', import.meta.url), {
          type: 'module'
        }));
    this.initWorker(!!workerFactory);
  }

  private initWorker(hasCustomFactory = false): void {
    if (typeof Worker === 'undefined' && !hasCustomFactory) return;
    try {
      this.worker = this.workerFactory();
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      this.worker.onmessageerror = this.handleMessageError.bind(this);
    } catch (err) {
      console.error('Failed to initialize Dither worker:', err);
      this.worker = null;
    }
  }

  private handleMessage(e: MessageEvent<WorkerDitherResponse>): void {
    const data = e.data;
    if (!data || typeof data.requestId !== 'number') return;

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
    const err = new Error(`Worker terminated unexpectedly: ${errorMsg}`);
    this.rejectAllPending(err);
    this.restart();
  }

  private handleMessageError(e: any): void {
    console.error('Worker message deserialization failed:', e);
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
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
    this.initWorker(true);
  }

  public terminate(): void {
    this.rejectAllPending(new Error('Worker terminated by client'));
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
  }

  public async execute(
    request: Omit<WorkerDitherRequest, 'requestId'>,
    timeoutMs?: number
  ): Promise<WorkerDitherResponse> {
    const requestId = this.nextRequestId++;
    const settings = (request as any).settings || request;
    const algorithmId = settings.algorithmId || (request as any).algorithmId;

    // Route full pipeline (Tweaks -> Temporal Noise -> Dither -> Post-Effects) to Rust with single-flight coalescing
    if (EngineBridge.isTauri() && EngineBridge.isAlgorithmSupported(algorithmId)) {
      if (this.rustInFlight) {
        // Supersede any previously queued intermediate slider frame immediately
        if (this.latestQueuedRust) {
          this.latestQueuedRust.resolve({
            requestId: this.latestQueuedRust.requestId,
            success: true,
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

    // Fallback to Web Worker for browser or non-migrated algorithms
    const fullRequest: WorkerDitherRequest = {
      ...request,
      requestId
    };

    return new Promise<WorkerDitherResponse>((resolve, reject) => {
      if (!this.worker) {
        this.initWorker(true);
        if (!this.worker) {
          reject(new Error('Worker is not available in the current environment'));
          return;
        }
      }

      const timeoutDuration = timeoutMs ?? this.defaultTimeoutMs;
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Worker request #${requestId} timed out after ${timeoutDuration}ms`));
        }
      }, timeoutDuration);

      this.pendingRequests.set(requestId, {
        requestId,
        resolve,
        reject,
        timer
      });

      try {
        this.worker.postMessage(fullRequest, [fullRequest.buffer]);
      } catch (postErr) {
        clearTimeout(timer);
        this.pendingRequests.delete(requestId);
        reject(postErr instanceof Error ? postErr : new Error(String(postErr)));
      }
    });
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
        smoothing: rawParams.smoothing ?? rawParams.smoothingFactor,
        scale: rawParams.scale ?? settings.scale ?? 1.0
      };

      const effects = (request as any).effects || settings.effects || [];
      const frameIndex = temporal?.frameIndex ?? rawParams.temporalSeed ?? settings.temporalSeed ?? 0;

      const ditherSettings = {
        ...((request as any).settings || {}),
        algorithmId,
        palette: (request as any).palette || settings.palette,
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
        effectStack: effects
      };

      const bridgeResult = await EngineBridge.dither(imgData, ditherSettings);

      if (bridgeResult.backend !== 'rust') {
        if (Array.isArray(effects) && effects.some((e: any) => e.enabled)) {
          applyEffectPipeline(imgData, effects, {
            frameIndex,
            time: frameIndex / 30,
            fps: 30
          });
        }
      }

      return {
        requestId,
        success: true,
        buffer: data.buffer,
        width,
        height,
        elapsedMs: performance.now() - t0
      } as WorkerDitherResponse;
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

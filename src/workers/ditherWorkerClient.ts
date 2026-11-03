import type { WorkerDitherRequest, WorkerDitherResponse } from './dither.worker';

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

  public execute(
    request: Omit<WorkerDitherRequest, 'requestId'>,
    timeoutMs?: number
  ): Promise<WorkerDitherResponse> {
    const requestId = this.nextRequestId++;
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

  public getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

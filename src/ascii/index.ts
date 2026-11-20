export * from './vectorCanvas';
export * from './types';
export * from './charsets';
export * from './fallbackFont';
export * from './calibration';
export * from './pipeline';
export * from './algorithms';
export * from './rasterizer';
export * from './effects';
export * from './exporters';

import { registerAsciiStageHandlers } from './pipeline';
import { registerAllAsciiAlgorithms } from './algorithms';
import { rasterizeAsciiGrid } from './rasterizer';
import { applyAsciiGridEffects, applyAsciiPixelEffects } from './effects';

let initialized = false;

export function initAsciiEngine(): void {
  if (initialized) return;
  initialized = true;
  registerAllAsciiAlgorithms();
  registerAsciiStageHandlers({
    gridEffects: applyAsciiGridEffects,
    rasterizer: rasterizeAsciiGrid,
    pixelEffects: applyAsciiPixelEffects
  });
}

// Auto-register on module import (safe in both main thread, Web Worker, and Node tests)
initAsciiEngine();

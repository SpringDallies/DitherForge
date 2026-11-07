// DitherForge Phase 2: Milestone 2 End-to-End Performance Benchmark
// Measures full processing path across representative migrated algorithms:
// Frontend buffer preparation -> IPC transfer -> Rust compute -> Response transfer -> Frontend buffer reconstruction
// Compared against pure JavaScript reference execution across 320x240, 400x300, 640x480, 1280x720.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { dispatchDither } from '../src/dither-engine/engine/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUST_BIN = path.resolve(__dirname, '../src-tauri/target/release/test_parity');

const RESOLUTIONS = [
  { name: '320x240', w: 320, h: 240 },
  { name: '400x300', w: 400, h: 300 },
  { name: '640x480', w: 640, h: 480 },
  { name: '1280x720', w: 1280, h: 720 }
];

const BENCH_ALGORITHMS = [
  // Basic
  { id: 'threshold', name: 'Threshold' },
  // Error Diffusion (Kernel & Variable)
  { id: 'floyd-steinberg', name: 'Floyd-Steinberg' },
  { id: 'atkinson', name: 'Atkinson' },
  { id: 'two-row-sierra', name: 'Two-Row Sierra' },
  { id: 'stucki', name: 'Stucki' },
  { id: 'ostromukhov', name: 'Ostromoukhov' },
  { id: 'cracked-diffuse', name: 'Cracked Diffuse' },
  { id: 'fractal-diffuse', name: 'Fractal Diffuse' },
  { id: 'vortex-diffusion', name: 'Vortex Diffusion' },
  // Ordered
  { id: 'bayer-4x4', name: 'Bayer 4x4' },
  { id: 'bayer-8x8', name: 'Bayer 8x8' },
  { id: 'bit-tone', name: 'Bit-Tone' },
  { id: 'mosaic', name: 'Mosaic' },
  { id: 'random-ordered', name: 'Random Ordered' }
];

const PALETTE = [
  [15, 56, 15, 255],
  [48, 98, 48, 255],
  [139, 172, 15, 255],
  [155, 188, 15, 255]
];

function generateTestImage(w, h) {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      buf[idx] = Math.round((x / w) * 255);
      buf[idx + 1] = Math.round((y / h) * 255);
      buf[idx + 2] = Math.round((((x ^ y) & 63) / 63) * 255);
      buf[idx + 3] = (x < w / 4 && y < h / 4) ? Math.round((x / (w / 4)) * 255) : 255;
    }
  }
  return buf;
}

console.log('=================================================================================================================');
console.log('                       DITHERFORGE PHASE 2 MILESTONE 2 BENCHMARK REPORT                                          ');
console.log('  Hardware Target: Intel Core i3-3240T (2C/4T @ 2.90GHz, 8GB DDR3, No AVX2)                                     ');
console.log('  Testing 14 Representative Migrated Algorithms across 4 Resolutions                                             ');
console.log('=================================================================================================================');

const results = [];

for (const res of RESOLUTIONS) {
  console.log(`\n--- Resolution: ${res.name} (${res.w * res.h} pixels, ${(res.w * res.h * 4 / 1024).toFixed(1)} KB RGBA buffer) ---`);
  const inputBuffer = generateTestImage(res.w, res.h);

  for (const algo of BENCH_ALGORITHMS) {
    const warmupIters = 2;
    const benchIters = 5;

    // Warm up JS
    for (let i = 0; i < warmupIters; i++) {
      dispatchDither(algo.id, res.w, res.h, inputBuffer, {
        palette: PALETTE,
        threshold: 0.5,
        scale: 1.0,
        diffusionStrength: 1.0,
        serpentine: true
      });
    }

    // Benchmark JS
    let jsTotalMs = 0;
    for (let i = 0; i < benchIters; i++) {
      const t0 = performance.now();
      dispatchDither(algo.id, res.w, res.h, inputBuffer, {
        palette: PALETTE,
        threshold: 0.5,
        scale: 1.0,
        diffusionStrength: 1.0,
        serpentine: true
      });
      jsTotalMs += (performance.now() - t0);
    }
    const jsAvgMs = jsTotalMs / benchIters;

    // Benchmark Native Complete Path
    let prepTotalMs = 0;
    let ipcTotalMs = 0;
    let reconstructTotalMs = 0;

    for (let i = 0; i < benchIters; i++) {
      // Step 1: Buffer Preparation
      const tPrep0 = performance.now();
      const header = {
        width: res.w,
        height: res.h,
        algorithm: algo.id,
        palette: PALETTE,
        threshold: 0.5,
        scale: 1.0,
        diffusion_strength: 1.0,
        serpentine: true,
        temporal_seed: 0
      };
      const headerJson = Buffer.from(JSON.stringify(header), 'utf8');
      const headerLenBuf = Buffer.alloc(4);
      headerLenBuf.writeUInt32LE(headerJson.length, 0);
      const rawPayload = Buffer.concat([headerLenBuf, headerJson, Buffer.from(inputBuffer.buffer)]);
      prepTotalMs += (performance.now() - tPrep0);

      // Step 2 & 3: IPC + Rust Processing
      const tIpc0 = performance.now();
      const proc = spawnSync(RUST_BIN, [], {
        input: rawPayload,
        maxBuffer: 64 * 1024 * 1024
      });
      ipcTotalMs += (performance.now() - tIpc0);

      if (proc.status !== 0 || proc.error) {
        throw new Error(`Rust binary failed: ${proc.stderr?.toString() || proc.error?.message}`);
      }

      // Step 4: Frontend buffer reconstruction
      const tRec0 = performance.now();
      const out = new Uint8ClampedArray(proc.stdout.buffer, proc.stdout.byteOffset, proc.stdout.byteLength);
      reconstructTotalMs += (performance.now() - tRec0);
    }

    const prepAvgMs = prepTotalMs / benchIters;
    const ipcAvgMs = ipcTotalMs / benchIters;
    const recAvgMs = reconstructTotalMs / benchIters;
    const totalNativeMs = prepAvgMs + ipcAvgMs + recAvgMs;
    const speedup = jsAvgMs / totalNativeMs;

    results.push({
      resolution: res.name,
      pixels: res.w * res.h,
      algorithm: algo.name,
      jsAvgMs,
      prepAvgMs,
      ipcAvgMs,
      recAvgMs,
      totalNativeMs,
      speedup
    });

    console.log(`  ${algo.name.padEnd(18)} | JS: ${jsAvgMs.toFixed(2).padStart(6)}ms | Rust Total: ${totalNativeMs.toFixed(2).padStart(6)}ms (IPC+Compute: ${ipcAvgMs.toFixed(2).padStart(5)}ms) | Speedup: ${speedup.toFixed(1).padStart(4)}x`);
  }
}

console.log('\n=================================================================================================================');
console.log('                                         SUMMARY MATRIX                                                          ');
console.log('=================================================================================================================');
console.log('Resolution | Algorithm           | JS Time   | Rust Total | Rust Speedup');
console.log('-----------+---------------------+-----------+------------+-------------');
for (const r of results) {
  console.log(`${r.resolution.padEnd(10)} | ${r.algorithm.padEnd(19)} | ${r.jsAvgMs.toFixed(2).padStart(7)}ms | ${r.totalNativeMs.toFixed(2).padStart(8)}ms | ${r.speedup.toFixed(2).padStart(9)}x`);
}

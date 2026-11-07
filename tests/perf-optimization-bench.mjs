// DitherForge Post-Effects Performance & Allocation Benchmark
// Measures per-effect and stacked pipeline runtime, typed array allocations, and memory footprint
// across 320x240, 640x480, 1280x720, and 1920x1080 resolutions.

import { performance } from 'node:perf_hooks';
import { applyEffectPipeline } from '../src/effects/pipeline.ts';
import { getEffectDescriptor } from '../src/effects/index.ts';

// Setup TypedArray allocation tracker
let allocationCount = 0;
let allocationBytes = 0;
let trackingAllocations = false;

const OriginalFloat32Array = globalThis.Float32Array;
const OriginalUint8ClampedArray = globalThis.Uint8ClampedArray;
const OriginalUint8Array = globalThis.Uint8Array;

class MonitoredFloat32Array extends OriginalFloat32Array {
  constructor(...args) {
    super(...args);
    if (trackingAllocations) {
      allocationCount++;
      allocationBytes += this.byteLength;
    }
  }
}

class MonitoredUint8ClampedArray extends OriginalUint8ClampedArray {
  constructor(...args) {
    super(...args);
    if (trackingAllocations) {
      allocationCount++;
      allocationBytes += this.byteLength;
    }
  }
}

class MonitoredUint8Array extends OriginalUint8Array {
  constructor(...args) {
    super(...args);
    if (trackingAllocations) {
      allocationCount++;
      allocationBytes += this.byteLength;
    }
  }
}

globalThis.Float32Array = MonitoredFloat32Array;
globalThis.Uint8ClampedArray = MonitoredUint8ClampedArray;
globalThis.Uint8Array = MonitoredUint8Array;

function resetAllocations() {
  allocationCount = 0;
  allocationBytes = 0;
}

function startAllocationTracking() {
  resetAllocations();
  trackingAllocations = true;
}

function stopAllocationTracking() {
  trackingAllocations = false;
  return { count: allocationCount, bytes: allocationBytes };
}

function createTestImage(w, h) {
  const data = new OriginalUint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      data[idx] = Math.round((x / w) * 255);
      data[idx + 1] = Math.round((y / h) * 255);
      data[idx + 2] = Math.round((((x ^ y) & 63) / 63) * 255);
      data[idx + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

const RESOLUTIONS = [
  { name: '320x240', w: 320, h: 240 },
  { name: '640x480', w: 640, h: 480 },
  { name: '1280x720', w: 1280, h: 720 },
  { name: '1920x1080', w: 1920, h: 1080 }
];

const BENCH_EFFECTS = [
  { id: 'halation', name: 'Halation', params: { threshold: 0.65, radius: 10, intensity: 0.6 } },
  { id: 'blur_sharpen', name: 'Blur / Sharpen', params: { amount: 0.8 } },
  { id: 'lens_aberration', name: 'Lens Aberration', params: { mode: 'radial', intensity: 6 } },
  { id: 'gate_weave', name: 'Gate Weave', params: { amplitude: 1.5, frequency: 0.8, temporal: true } },
  { id: 'glow', name: 'Glow', params: { radius: 3, intensity: 0.6 } },
  { id: 'vignette', name: 'Vignette', params: { radius: 0.8, softness: 0.4 } },
  { id: 'inverse_vignette', name: 'Inverse Vignette', params: { radius: 0.8, softness: 0.4 } },
  { id: 'light_leaks', name: 'Light Leaks', params: { direction: 'top_left', radius: 0.8, intensity: 0.65 } },
  { id: 'film_grain', name: 'Film Grain', params: { intensity: 0.25, size: 1, temporal: true } },
  { id: 'gradient_map', name: 'Gradient Map', params: { preset: 'gameboy_dmg', space: 'oklab', mix: 1.0 } }
];

const STACKED_CHAIN = [
  { id: 'gradient_map', type: 'gradient_map', enabled: true, params: { preset: 'gameboy_dmg', space: 'oklab', mix: 1.0 } },
  { id: 'gate_weave', type: 'gate_weave', enabled: true, params: { amplitude: 1.5, frequency: 0.8, temporal: true } },
  { id: 'lens_aberration', type: 'lens_aberration', enabled: true, params: { mode: 'radial', intensity: 6 } },
  { id: 'halation', type: 'halation', enabled: true, params: { threshold: 0.65, radius: 10, intensity: 0.6 } },
  { id: 'glow', type: 'glow', enabled: true, params: { radius: 3, intensity: 0.6 } },
  { id: 'blur_sharpen', type: 'blur_sharpen', enabled: true, params: { amount: 0.8 } },
  { id: 'vignette', type: 'vignette', enabled: true, params: { radius: 0.8, softness: 0.4 } },
  { id: 'film_grain', type: 'film_grain', enabled: true, params: { intensity: 0.25, size: 1, temporal: true } }
];

export async function runBenchmarks() {
  console.log('========================================================================================');
  console.log('                 DITHERFORGE PERFORMANCE OPTIMIZATION BENCHMARK                         ');
  console.log('  Target: Low-End Hardware & Modern Platforms (Allocations, Runtime & Memory Footprint)  ');
  console.log('========================================================================================\n');

  const fullReport = {};

  for (const res of RESOLUTIONS) {
    console.log(`\n=================== RESOLUTION: ${res.name} (${res.w}x${res.h}, ${(res.w*res.h/1000).toFixed(1)}k px) ===================`);
    fullReport[res.name] = { effects: {}, stacked: null, animation10Frames: null };

    // 1. Benchmark Individual Effects
    for (const eff of BENCH_EFFECTS) {
      const effectDesc = getEffectDescriptor(eff.id);
      if (!effectDesc) {
        console.warn(`Descriptor for ${eff.id} not found!`);
        continue;
      }

      const item = { id: eff.id, type: eff.id, enabled: true, params: eff.params, opacity: 1.0, blendMode: 'normal' };
      const testImg = createTestImage(res.w, res.h);

      // Warmup
      applyEffectPipeline(testImg, [item], { frameIndex: 0, time: 0, fps: 30 }, getEffectDescriptor);

      // Measure allocations over 5 calls
      startAllocationTracking();
      for (let i = 0; i < 5; i++) {
        const scratchImg = { data: new OriginalUint8ClampedArray(testImg.data), width: res.w, height: res.h };
        applyEffectPipeline(scratchImg, [item], { frameIndex: i, time: i * 0.033, fps: 30 }, getEffectDescriptor);
      }
      const allocs = stopAllocationTracking();
      // Per-run average allocation
      const avgAllocCount = Math.round(allocs.count / 5);
      const avgAllocMB = (allocs.bytes / 5 / (1024 * 1024)).toFixed(2);

      // Measure execution time over 10 iterations
      const iterations = res.w >= 1920 ? 5 : 10;
      const times = [];
      for (let i = 0; i < iterations; i++) {
        const scratchImg = { data: new OriginalUint8ClampedArray(testImg.data), width: res.w, height: res.h };
        const t0 = performance.now();
        applyEffectPipeline(scratchImg, [item], { frameIndex: i, time: i * 0.033, fps: 30 }, getEffectDescriptor);
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      const medianMs = times[Math.floor(times.length / 2)].toFixed(2);
      const minMs = times[0].toFixed(2);

      fullReport[res.name].effects[eff.id] = {
        name: eff.name,
        medianMs: Number(medianMs),
        minMs: Number(minMs),
        allocCount: avgAllocCount,
        allocMB: Number(avgAllocMB)
      };

      console.log(
        `  ${eff.name.padEnd(20)} | Time: ${medianMs.padStart(7)} ms | Min: ${minMs.padStart(7)} ms | Allocs: ${String(avgAllocCount).padStart(3)} (${avgAllocMB.padStart(5)} MB/frame)`
      );
    }

    // 2. Benchmark Stacked Pipeline (8 effects)
    {
      const testImg = createTestImage(res.w, res.h);
      // Warmup
      applyEffectPipeline(testImg, STACKED_CHAIN, { frameIndex: 0, time: 0, fps: 30 }, getEffectDescriptor);

      // Allocations
      startAllocationTracking();
      for (let i = 0; i < 3; i++) {
        const scratchImg = { data: new OriginalUint8ClampedArray(testImg.data), width: res.w, height: res.h };
        applyEffectPipeline(scratchImg, STACKED_CHAIN, { frameIndex: i, time: i * 0.033, fps: 30 }, getEffectDescriptor);
      }
      const allocs = stopAllocationTracking();
      const avgAllocCount = Math.round(allocs.count / 3);
      const avgAllocMB = (allocs.bytes / 3 / (1024 * 1024)).toFixed(2);

      // Timing
      const iters = res.w >= 1920 ? 3 : 5;
      const times = [];
      for (let i = 0; i < iters; i++) {
        const scratchImg = { data: new OriginalUint8ClampedArray(testImg.data), width: res.w, height: res.h };
        const t0 = performance.now();
        applyEffectPipeline(scratchImg, STACKED_CHAIN, { frameIndex: i, time: i * 0.033, fps: 30 }, getEffectDescriptor);
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      const medianMs = times[Math.floor(times.length / 2)].toFixed(2);
      fullReport[res.name].stacked = {
        medianMs: Number(medianMs),
        allocCount: avgAllocCount,
        allocMB: Number(avgAllocMB)
      };

      console.log(`  --------------------------------------------------------------------------------------`);
      console.log(`  >>> STACKED (8 effects) | Time: ${medianMs.padStart(7)} ms | Allocs: ${String(avgAllocCount).padStart(3)} (${avgAllocMB.padStart(5)} MB/frame)`);
    }

    // 3. Animation 10-Frame Playback Simulation
    {
      const testImg = createTestImage(res.w, res.h);
      const t0 = performance.now();
      for (let f = 0; f < 10; f++) {
        const scratchImg = { data: new OriginalUint8ClampedArray(testImg.data), width: res.w, height: res.h };
        applyEffectPipeline(scratchImg, STACKED_CHAIN, { frameIndex: f, time: f * 0.033, fps: 30 }, getEffectDescriptor);
      }
      const totalAnimMs = (performance.now() - t0).toFixed(2);
      const fps = (10 / (Number(totalAnimMs) / 1000)).toFixed(1);
      fullReport[res.name].animation10Frames = {
        totalMs: Number(totalAnimMs),
        fps: Number(fps)
      };
      console.log(`  >>> ANIMATION 10 FRAMES | Total: ${totalAnimMs.padStart(7)} ms | Playback Rate: ${fps} FPS`);
    }
  }

  return fullReport;
}

// Run when executed directly
if (process.argv[1]?.endsWith('perf-optimization-bench.mjs')) {
  runBenchmarks().then((report) => {
    import('node:fs').then((fs) => {
      fs.writeFileSync(
        'tests/perf-baseline.json',
        JSON.stringify(report, null, 2)
      );
      console.log('\nBaseline saved to tests/perf-baseline.json');
    });
  });
}

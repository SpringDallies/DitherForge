// Performance Benchmark for DitherForge 5 Named Chain Presets (1080p, 720p, Viewport Proxy)
import { NAMED_CHAIN_PRESETS } from '../src/effects/presets.ts';
import { applyEffectPipeline, getEffectDescriptor } from '../src/effects/index.ts';

function createBenchmarkBuffer(w, h) {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const idx = (row + x) * 4;
      buf[idx] = (x ^ y) & 255;
      buf[idx + 1] = (x * 3) & 255;
      buf[idx + 2] = (y * 5) & 255;
      buf[idx + 3] = 255;
    }
  }
  return { data: buf, width: w, height: h };
}

const RESOLUTIONS = [
  { name: '1080p Full Export (1920x1080)', w: 1920, h: 1080 },
  { name: '720p HD Preview    (1280x720)',  w: 1280, h: 720 },
  { name: 'Viewport Live Proxy (960x540)',   w: 960,  h: 540 }
];

console.log('==================================================================');
console.log('       DITHERFORGE NAMED CHAIN PRESETS PERFORMANCE BENCHMARK      ');
console.log('==================================================================');

const benchmarkResults = {};

for (const res of RESOLUTIONS) {
  console.log(`\n--- Resolution: ${res.name} ---`);
  benchmarkResults[res.name] = [];

  for (const preset of NAMED_CHAIN_PRESETS) {
    const effectCount = preset.effects.length;
    const testImg = createBenchmarkBuffer(res.w, res.h);
    const context = { frameIndex: 1, time: 0.033, fps: 30 };

    // Warmup
    applyEffectPipeline(testImg, preset.effects, context, getEffectDescriptor);

    // Timed run
    const testImgRun = createBenchmarkBuffer(res.w, res.h);
    const t0 = performance.now();
    applyEffectPipeline(testImgRun, preset.effects, context, getEffectDescriptor);
    const duration = performance.now() - t0;

    const fps = 1000 / duration;
    benchmarkResults[res.name].push({
      id: preset.id,
      name: preset.name,
      effects: effectCount,
      durationMs: duration,
      fps
    });

    console.log(
      `  ${preset.name.padEnd(20)} (${effectCount} fx) : ` +
      `${duration.toFixed(2).padStart(8)} ms | ${fps.toFixed(1).padStart(5)} FPS`
    );
  }
}

console.log('\n==================================================================');
console.log('SUMMARY TABLE (1080p vs Viewport Live Proxy):');
console.log('------------------------------------------------------------------');
console.log('Preset Name           | Effects | Viewport Proxy | 1080p Full Export');
console.log('------------------------------------------------------------------');
const res1080 = benchmarkResults['1080p Full Export (1920x1080)'];
const resProxy = benchmarkResults['Viewport Live Proxy (960x540)'];

for (let i = 0; i < NAMED_CHAIN_PRESETS.length; i++) {
  const name = NAMED_CHAIN_PRESETS[i].name;
  const count = NAMED_CHAIN_PRESETS[i].effects.length;
  const pTime = `${resProxy[i].durationMs.toFixed(1)} ms (${resProxy[i].fps.toFixed(0)} FPS)`;
  const fTime = `${res1080[i].durationMs.toFixed(1)} ms (${res1080[i].fps.toFixed(0)} FPS)`;
  console.log(`${name.padEnd(22)}| ${String(count).padStart(7)} | ${pTime.padEnd(15)}| ${fTime}`);
}
console.log('==================================================================');

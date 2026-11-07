import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUST_BIN = path.resolve(__dirname, '../src-tauri/target_check/release/test_parity');

function runRust(width, height, input, algorithm, palette, customParams = {}) {
  const header = {
    width,
    height,
    algorithm,
    palette,
    threshold: 0.5,
    scale: 1.0,
    diffusion_strength: 1.0,
    ...customParams
  };

  const headerJson = Buffer.from(JSON.stringify(header), 'utf8');
  const headerLenBuf = Buffer.alloc(4);
  headerLenBuf.writeUInt32LE(headerJson.length, 0);

  const payload = Buffer.concat([headerLenBuf, headerJson, Buffer.from(input.buffer)]);

  const proc = spawnSync(RUST_BIN, [], {
    input: payload,
    maxBuffer: 64 * 1024 * 1024
  });

  if (proc.status !== 0 || proc.error) {
    throw new Error(`Rust binary failed: ${proc.stderr?.toString() || proc.error?.message}`);
  }

  return new Uint8ClampedArray(proc.stdout.buffer, proc.stdout.byteOffset, proc.stdout.byteLength);
}

function generateGradient(w, h) {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      buf[idx] = Math.round((x / w) * 255);
      buf[idx + 1] = Math.round((y / h) * 255);
      buf[idx + 2] = Math.round((((x ^ y) & 63) / 63) * 255);
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

const w = 128;
const h = 128;
const palette = [[0, 0, 0, 255], [255, 255, 255, 255]];
const input = generateGradient(w, h);

console.log('==================================================================');
console.log('   SPECIAL & GLITCH SLIDER DYNAMIC RESPONSIVENESS VERIFICATION    ');
console.log('==================================================================');

function assertSliderChangesOutput(name, algo, paramA, paramB) {
  const outA = runRust(w, h, input, algo, palette, paramA);
  const outB = runRust(w, h, input, algo, palette, paramB);

  let diffCount = 0;
  for (let i = 0; i < outA.length; i += 4) {
    if (outA[i] !== outB[i] || outA[i+1] !== outB[i+1] || outA[i+2] !== outB[i+2]) {
      diffCount++;
    }
  }
  const diffPct = ((diffCount / (w * h)) * 100).toFixed(2);
  assert(diffCount > 0, `Slider '${name}' for algorithm '${algo}' had NO effect on output pixels!`);
  console.log(`  PASS: [${algo.padEnd(26)}] ${name.padEnd(20)} | Pixels modulated: ${diffPct.padStart(6)}%`);
}

// 1. Line Scale on Uniform Modulation X
assertSliderChangesOutput('line_scale (1 vs 8)', 'uniform_modulation_x', { line_scale: 1 }, { line_scale: 8 });

// 2. Bleed on Uniform Modulation X
assertSliderChangesOutput('bleed (0.0 vs 0.8)', 'uniform_modulation_x', { bleed: 0.0 }, { bleed: 0.8 });

// 3. Smoothing on Uniform Modulation X
assertSliderChangesOutput('smoothing (0 vs 6)', 'uniform_modulation_x', { smoothing: 0.0 }, { smoothing: 6.0 });

// 4. Line Scale on Uniform Modulation Y
assertSliderChangesOutput('line_scale (1 vs 8)', 'uniform_modulation_y', { line_scale: 1 }, { line_scale: 8 });

// 5. Bleed on Uniform Modulation Y
assertSliderChangesOutput('bleed (0.0 vs 0.8)', 'uniform_modulation_y', { bleed: 0.0 }, { bleed: 0.8 });

// 6. Line Scale on Artifact Modulation Glitch
assertSliderChangesOutput('line_scale (2 vs 8)', 'artifact_modulation_glitch', { line_scale: 2 }, { line_scale: 8 });

// 7. Glitch Intensity on Glitch
assertSliderChangesOutput('glitch_intensity (2 vs 30)', 'glitch', { glitch_intensity: 2 }, { glitch_intensity: 30 });

// 8. Line Scale on Glitch
assertSliderChangesOutput('line_scale (2 vs 8)', 'glitch', { line_scale: 2 }, { line_scale: 8 });

// 9. Smoothness on Smooth Diffuse
assertSliderChangesOutput('smoothing (1 vs 9)', 'smooth_diffuse', { smoothing: 1 }, { smoothing: 9 });

// 10. Line Emphasis on Stucki Diffusion Lines
assertSliderChangesOutput('line_emphasis (1 vs 10)', 'stucki_diffusion_lines', { line_emphasis: 1 }, { line_emphasis: 10 });

// 11. Checkers Size on Checkers
assertSliderChangesOutput('checkers_size (2 vs 10)', 'checkers', { checkers_size: 2 }, { checkers_size: 10 });

// 12. Line Spacing on Crosshatch
assertSliderChangesOutput('line_spacing (3 vs 12)', 'crosshatch', { line_spacing: 3 }, { line_spacing: 12 });

// 13. Frequency on Wave
assertSliderChangesOutput('frequency (2 vs 15)', 'wave', { frequency: 2 }, { frequency: 15 });

// 14. Swirl on Vortex
assertSliderChangesOutput('swirl (2 vs 16)', 'vortex', { swirl: 2 }, { swirl: 16 });

// 15. Cell Size on Beehive
assertSliderChangesOutput('cell_size (3 vs 14)', 'beehive', { cell_size: 3 }, { cell_size: 14 });

// 16. Edge Sensitivity on Diagonal
assertSliderChangesOutput('edge_sensitivity (2 vs 12)', 'diagonal', { edge_sensitivity: 2 }, { edge_sensitivity: 12 });

// 17. Period on Diamond
assertSliderChangesOutput('period (4 vs 16)', 'diamond', { period: 4 }, { period: 16 });

// 18. Dot Density on Stippling
assertSliderChangesOutput('dot_density (2 vs 12)', 'stippling', { dot_density: 2 }, { dot_density: 12 });

// 19. Modulation Frequency on Thresholder
assertSliderChangesOutput('mod_freq (1 vs 6)', 'thresholder', { modulation_frequency: 1 }, { modulation_frequency: 6 });

console.log('==================================================================');
console.log('✅ ALL SPECIAL & GLITCH SLIDER DYNAMIC TESTS PASSED (19/19)');
console.log('==================================================================');

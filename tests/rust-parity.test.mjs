// Test suite verifying pixel-level parity between JavaScript and Rust engines
// Migrated algorithms in Milestone 1:
// 1. Floyd-Steinberg
// 2. Atkinson
// 3. Bayer 4x4
// 4. Bayer 8x8
// 5. Thresholder / Threshold

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dispatchDither } from '../src/dither-engine/engine/index.js';
import { BUILTIN_PALETTES } from '../src/dither-engine/palettes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const checkBin = path.resolve(__dirname, '../src-tauri/target_check/release/test_parity');
const defaultBin = path.resolve(__dirname, '../src-tauri/target/release/test_parity');
const RUST_BIN = (process.env.CARGO_TARGET_DIR && fs.existsSync(path.resolve(process.env.CARGO_TARGET_DIR, 'release/test_parity')))
  ? path.resolve(process.env.CARGO_TARGET_DIR, 'release/test_parity')
  : (fs.existsSync(checkBin) ? checkBin : defaultBin);

function runRustDither(width, height, inputBuffer, algorithm, palette, settings = {}, effectStack = []) {
  const header = {
    width,
    height,
    algorithm,
    palette,
    threshold: settings.threshold ?? 0.5,
    scale: settings.scale ?? 1.0,
    diffusion_strength: settings.diffusionStrength ?? 1.0,
    serpentine: settings.serpentine ?? false,
    temporal_seed: settings.temporalSeed ?? 0,
    matrix_size: settings.matrixSize,
    warp_intensity: settings.warpIntensity,
    dot_size: settings.dotSize,
    block_size: settings.blockSize,
    cracked: settings.cracked,
    distribution_spread: settings.distributionSpread,
    twist_strength: settings.twistStrength,
    spiral_frequency: settings.spiralFrequency,
    effect_stack: effectStack
  };

  const headerJson = Buffer.from(JSON.stringify(header), 'utf8');
  const headerLenBuf = Buffer.alloc(4);
  headerLenBuf.writeUInt32LE(headerJson.length, 0);

  const payload = Buffer.concat([headerLenBuf, headerJson, Buffer.from(inputBuffer.buffer)]);

  const proc = spawnSync(RUST_BIN, [], {
    input: payload,
    maxBuffer: 64 * 1024 * 1024
  });

  if (proc.status !== 0 || proc.error) {
    throw new Error(`Rust binary failed: ${proc.stderr?.toString() || proc.error?.message}`);
  }

  return new Uint8ClampedArray(proc.stdout.buffer, proc.stdout.byteOffset, proc.stdout.byteLength);
}

function generatePattern(width, height) {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Smooth gradient + high frequency details
      const r = Math.round((x / width) * 255);
      const g = Math.round((y / height) * 255);
      const b = Math.round((((x ^ y) & 63) / 63) * 255);
      // Transparency test pattern: quarter of the image has varying alpha
      const a = (x < width / 4 && y < height / 4) ? Math.round((x / (width / 4)) * 255) : 255;

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }
  return buf;
}

const PALETTES = {
  mono: [[0, 0, 0, 255], [255, 255, 255, 255]],
  gameboy: [
    [15, 56, 15, 255],
    [48, 98, 48, 255],
    [139, 172, 15, 255],
    [155, 188, 15, 255]
  ],
  cyberpunk: [
    [11, 13, 19, 255],
    [255, 0, 128, 255],
    [0, 240, 255, 255],
    [255, 230, 0, 255],
    [112, 0, 255, 255]
  ]
};

const TEST_DIMENSIONS = [
  { w: 320, h: 240 },
  { w: 400, h: 300 },
  { w: 640, h: 480 }
];

const ALGORITHMS = [
  // Basic (2)
  { id: 'none', name: 'None (Identity)' },
  { id: 'thresholder', name: 'Thresholder' },

  // Error Diffusion (21)
  { id: 'floyd-steinberg', name: 'Floyd-Steinberg' },
  { id: 'atkinson', name: 'Atkinson' },
  { id: 'burkes', name: 'Burkes' },
  { id: 'sierra', name: 'Sierra 3' },
  { id: 'two-row-sierra', name: 'Two-Row Sierra' },
  { id: 'sierra-lite', name: 'Sierra Lite' },
  { id: 'stucki', name: 'Stucki' },
  { id: 'jarvis-judice-ninke', name: 'Jarvis-Judice-Ninke' },
  { id: 'stevenson-arce', name: 'Stevenson-Arce' },
  { id: 'fan', name: 'Fan' },
  { id: 'shiau-fan', name: 'Shiau-Fan' },
  { id: 'shiau-fan-2', name: 'Shiau-Fan 2' },
  { id: 'false-floyd-steinberg', name: 'False Floyd-Steinberg' },
  { id: 'minimized-avg-error', name: 'Minimized Avg Error' },
  { id: 'dynamic-serpentine', name: 'Dynamic Serpentine' },
  { id: 'artifact-modulation', name: 'Artifact Modulation' },
  { id: 'gaussian', name: 'Gaussian' },
  { id: 'ostromukhov', name: 'Ostromoukhov' },
  { id: 'cracked-diffuse', name: 'Cracked Diffuse' },
  { id: 'fractal-diffuse', name: 'Fractal Diffuse' },
  { id: 'vortex-diffusion', name: 'Vortex Diffusion' },

  // Ordered (10)
  { id: 'bayer-matrix', name: 'Bayer Matrix' },
  { id: 'bayer-2x2', name: 'Bayer 2x2' },
  { id: 'bayer-4x4', name: 'Bayer 4x4' },
  { id: 'bayer-8x8', name: 'Bayer 8x8' },
  { id: 'bayer-16x16', name: 'Bayer 16x16' },
  { id: 'bayer-void', name: 'Bayer Void' },
  { id: 'bit-tone', name: 'Bit-Tone' },
  { id: 'clustered-dot', name: 'Clustered Dot' },
  { id: 'mosaic', name: 'Mosaic' },
  { id: 'random-ordered', name: 'Random Ordered' }
];

console.log('==================================================================');
console.log('       DITHERFORGE PHASE 2: MILESTONE 2 RUST PARITY TESTS         ');
console.log('==================================================================');

let totalTests = 0;
let passedTests = 0;

for (const algo of ALGORITHMS) {
  for (const dim of TEST_DIMENSIONS) {
    for (const [palName, pal] of Object.entries(PALETTES)) {
      totalTests++;
      const testName = `${algo.name.padEnd(16)} | ${dim.w}x${dim.h} | ${palName.padEnd(9)}`;
      try {
        const input = generatePattern(dim.w, dim.h);
        const settings = {
          threshold: 0.5,
          scale: 1.0,
          diffusionStrength: 1.0,
          serpentine: algo.id.includes('floyd') || algo.id.includes('atkinson')
        };

        // 1. Run JavaScript Engine
        const jsResult = dispatchDither(algo.id, dim.w, dim.h, input, {
          palette: pal,
          ...settings
        });
        const jsBuf = jsResult.buffer ? new Uint8ClampedArray(jsResult.buffer) : jsResult;

        // 2. Run Rust Engine
        const rustBuf = runRustDither(dim.w, dim.h, input, algo.id, pal, settings);

        // 3. Compare pixel by pixel
        assert.equal(jsBuf.length, rustBuf.length, 'Buffer lengths must match');
        const totalPixels = dim.w * dim.h;
        let identicalPixels = 0;
        let alphaPreserved = 0;
        let maxRDiff = 0, maxGDiff = 0, maxBDiff = 0;

        for (let i = 0; i < jsBuf.length; i += 4) {
          const rDiff = Math.abs(jsBuf[i] - rustBuf[i]);
          const gDiff = Math.abs(jsBuf[i + 1] - rustBuf[i + 1]);
          const bDiff = Math.abs(jsBuf[i + 2] - rustBuf[i + 2]);
          const aDiff = Math.abs(jsBuf[i + 3] - rustBuf[i + 3]);

          if (rDiff === 0 && gDiff === 0 && bDiff === 0 && aDiff === 0) {
            identicalPixels++;
          }
          if (rustBuf[i + 3] === input[i + 3]) {
            alphaPreserved++;
          }
          if (rDiff > maxRDiff) maxRDiff = rDiff;
          if (gDiff > maxGDiff) maxGDiff = gDiff;
          if (bDiff > maxBDiff) maxBDiff = bDiff;
        }

        const matchPct = ((identicalPixels / totalPixels) * 100).toFixed(2);
        const alphaPct = ((alphaPreserved / totalPixels) * 100).toFixed(2);

        // Parity requirement: match rate >= 98% and alpha 100%
        assert.equal(alphaPct, '100.00', 'Alpha transparency must be 100% preserved');
        assert.ok(Number(matchPct) >= 98.0, `Match percentage ${matchPct}% must be >= 98%`);

        console.log(`  PASS: ${testName} | Match: ${matchPct}% | Alpha: ${alphaPct}% | MaxΔ: (${maxRDiff},${maxGDiff},${maxBDiff})`);
        passedTests++;
      } catch (err) {
        console.error(`  FAIL: ${testName}\n        ${err.message}`);
      }
    }
  }
}

console.log('==================================================================');
console.log('       DITHERFORGE RUST NATIVE POST-EFFECTS VERIFICATION           ');
console.log('==================================================================');

const TEST_EFFECTS = [
  { id: 'glow', enabled: true, params: { radius: 2.5, intensity: 0.4 } },
  { id: 'blur_sharpen', enabled: true, params: { amount: 0.6 } },
  { id: 'scanlines', enabled: true, params: { thickness: 2.0, intensity: 0.3 } },
  { id: 'vignette', enabled: true, params: { radius: 0.7, softness: 0.4 } },
  { id: 'pixelate', enabled: true, params: { block_size: 4 } },
  { id: 'curves_levels', enabled: true, params: { black_point: 0.05, white_point: 0.95, gamma: 1.1 } },
  { id: 'posterize', enabled: true, params: { levels: 6 } },
  { id: 'solarize', enabled: true, params: { threshold: 0.6 } },
  { id: 'invert', enabled: true, params: { strength: 0.8 } },
  { id: 'sepia', enabled: true, params: { intensity: 0.7 } }
];

for (const eff of TEST_EFFECTS) {
  totalTests++;
  const testName = `Effect: ${eff.id.padEnd(16)} | 320x240`;
  try {
    const input = generatePattern(320, 240);
    const pal = PALETTES.cyberpunk;
    const rustBuf = runRustDither(320, 240, input, 'bayer-4x4', pal, {}, [eff]);

    assert.equal(rustBuf.length, 320 * 240 * 4, 'Buffer length must match 320x240 RGBA');
    let alphaPreserved = 0;
    for (let i = 0; i < rustBuf.length; i += 4) {
      if (rustBuf[i + 3] === input[i + 3]) alphaPreserved++;
    }
    const alphaPct = ((alphaPreserved / (320 * 240)) * 100).toFixed(2);
    assert.equal(alphaPct, '100.00', 'Alpha must remain 100% preserved through post-effects');

    console.log(`  PASS: ${testName} | Alpha: ${alphaPct}% | Native Stack OK`);
    passedTests++;
  } catch (err) {
    console.error(`  FAIL: ${testName}\n        ${err.message}`);
  }
}

// Stacked multi-effect chain
totalTests++;
try {
  const input = generatePattern(400, 300);
  const pal = PALETTES.gameboy;
  const stack = [
    { id: 'glow', enabled: true, params: { radius: 2.0, intensity: 0.3 } },
    { id: 'scanlines', enabled: true, params: { thickness: 1.0, intensity: 0.2 } },
    { id: 'vignette', enabled: true, params: { radius: 0.8, softness: 0.5 } }
  ];
  const rustBuf = runRustDither(400, 300, input, 'floyd-steinberg', pal, {}, stack);
  assert.equal(rustBuf.length, 400 * 300 * 4, 'Buffer length match');
  console.log('  PASS: Multi-Effect Stack (Glow + Scanlines + Vignette) | 400x300 | Native OK');
  passedTests++;
} catch (err) {
  console.error(`  FAIL: Multi-Effect Stack\n        ${err.message}`);
}

console.log('==================================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} parity tests passed.`);
console.log('==================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}

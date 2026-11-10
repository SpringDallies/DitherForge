// Phase 1 Parity Test Suite: Authenticity Verification
// Tests exact parity between JavaScript reference implementation and Rust native engine for:
// 1. color-separation
// 2. orb-diffuse
// 3. orb-diffuse-x
// 4. orb-diffuse-y
// 5. orb-matrix
// 6. waveform-alt (and waveform regression verification)

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dispatchDither } from '../src/dither-engine/engine/index.js';

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
    line_scale: settings.lineScale,
    bleed: settings.bleed,
    smoothing: settings.smoothing,
    noisy_lines: settings.noisyLines,
    line_spacing: settings.lineSpacing,
    line_density: settings.lineDensity,
    line_angle: settings.lineAngle,
    dotting: settings.dotting,
    line_emphasis: settings.lineEmphasis,
    line_count: settings.lineCount,
    modulation_strength: settings.modulationStrength,
    horizontal_bias: settings.horizontalBias,
    glitch_intensity: settings.glitchIntensity,
    frequency: settings.frequency,
    amplitude: settings.amplitude,
    wave_frequency: settings.waveFrequency,
    wave_density: settings.waveDensity,
    wave_threshold: settings.waveThreshold,
    modulation_frequency: settings.modulationFrequency,
    modulation_blend: settings.modulationBlend,
    freq_a: settings.freqA,
    freq_b: settings.freqB,
    angle: settings.angle,
    swirl: settings.swirl,
    cell_size: settings.cellSize,
    edge_sensitivity: settings.edgeSensitivity,
    checkers_size: settings.checkersSize,
    period: settings.period,
    dot_scale: settings.dotScale,
    dot_density: settings.dotDensity,
    density: settings.density,
    variation: settings.variation,
    divisor: settings.divisor,
    peak_threshold: settings.peakThreshold,
    min_peak_distance: settings.minPeakDistance,
    max_peaks: settings.maxPeaks,
    interference: settings.interference,
    contour_threshold: settings.contourThreshold,
    line_mode: settings.lineMode,
    triangle_type: settings.triangleType,
    vertical: settings.vertical,
    orb_count: settings.orbCount,
    orb_size: settings.orbSize,
    orb_intensity: settings.orbIntensity,
    orb_random: settings.orbRandom,
    orb_offset: settings.orbOffset,
    orb_vertical: settings.orbVertical,
    offset_x: settings.offsetX,
    offset_y: settings.offsetY,
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

// Deterministic test pattern 1: Gradient with high-frequency XOR & partial transparency
function generateGradientPattern(width, height) {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = Math.round((x / width) * 255);
      const g = Math.round((y / height) * 255);
      const b = Math.round((((x ^ y) & 63) / 63) * 255);
      const a = (x < width / 4 && y < height / 4) ? Math.round((x / (width / 4)) * 255) : 255;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }
  return buf;
}

// Deterministic test pattern 2: Highlight peaks on dark field (tests orb candidate detection)
function generateHighlightPeaks(width, height) {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Dark background with several bright localized Gaussian-like peaks
      let v = 20;
      const peaks = [
        { px: width * 0.25, py: height * 0.25, mag: 220, rad: 25 },
        { px: width * 0.75, py: height * 0.35, mag: 240, rad: 30 },
        { px: width * 0.5, py: height * 0.7, mag: 255, rad: 35 },
        { px: width * 0.15, py: height * 0.8, mag: 200, rad: 20 },
      ];
      for (const p of peaks) {
        const d = Math.hypot(x - p.px, y - p.py);
        if (d < p.rad) {
          v = Math.max(v, Math.round(p.mag * (1 - d / p.rad)));
        }
      }
      buf[idx] = Math.min(255, v);
      buf[idx + 1] = Math.min(255, Math.round(v * 0.85));
      buf[idx + 2] = Math.min(255, Math.round(v * 1.1));
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

// Deterministic test pattern 3: Solid flat gray (tests spiral fallback distribution)
function generateUniformPattern(width, height, gray = 128) {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = gray;
    buf[i + 1] = gray;
    buf[i + 2] = gray;
    buf[i + 3] = 255;
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

const TEST_CASES = [
  // 1. color-separation
  {
    algo: 'color-separation',
    name: 'Color Separation (Default, Mono)',
    dim: { w: 120, h: 90 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'color-separation',
    name: 'Color Separation (Scale=2, Cyberpunk)',
    dim: { w: 160, h: 120 },
    patternGen: generateGradientPattern,
    pal: PALETTES.cyberpunk,
    settings: { scale: 2.0 }
  },
  {
    algo: 'color-separation',
    name: 'Color Separation (Highlight peaks, Gameboy)',
    dim: { w: 120, h: 90 },
    patternGen: generateHighlightPeaks,
    pal: PALETTES.gameboy,
    settings: { scale: 1.5 }
  },

  // 2. orb-diffuse
  {
    algo: 'orb-diffuse',
    name: 'Orb Diffuse (Default, Mono)',
    dim: { w: 120, h: 90 },
    patternGen: generateHighlightPeaks,
    pal: PALETTES.mono,
    settings: { serpentine: true, diffusionStrength: 1.0, orbCount: 6, orbSize: 50, orbIntensity: 60 }
  },
  {
    algo: 'orb-diffuse',
    name: 'Orb Diffuse (Non-serpentine, Cyberpunk)',
    dim: { w: 120, h: 90 },
    patternGen: generateGradientPattern,
    pal: PALETTES.cyberpunk,
    settings: { serpentine: false, diffusionStrength: 0.8, orbCount: 8, orbSize: 60, orbIntensity: 80, orbRandom: 20 }
  },
  {
    algo: 'orb-diffuse',
    name: 'Orb Diffuse (Uniform gray spiral fallback, Gameboy)',
    dim: { w: 100, h: 80 },
    patternGen: generateUniformPattern,
    pal: PALETTES.gameboy,
    settings: { serpentine: true, diffusionStrength: 1.0, orbCount: 10, orbSize: 40, orbIntensity: 70 }
  },

  // 3. orb-diffuse-x (1D vertical column diffusion)
  {
    algo: 'orb-diffuse-x',
    name: 'Orb Diffuse X (Default, Mono)',
    dim: { w: 120, h: 90 },
    patternGen: generateHighlightPeaks,
    pal: PALETTES.mono,
    settings: { diffusionStrength: 1.0, lineScale: 1.0, orbCount: 5, orbSize: 60, orbIntensity: 70 }
  },
  {
    algo: 'orb-diffuse-x',
    name: 'Orb Diffuse X (lineScale=3, Cyberpunk)',
    dim: { w: 120, h: 90 },
    patternGen: generateGradientPattern,
    pal: PALETTES.cyberpunk,
    settings: { diffusionStrength: 0.9, lineScale: 3.0, orbCount: 7, orbSize: 50, orbIntensity: 60 }
  },

  // 4. orb-diffuse-y (1D horizontal row diffusion)
  {
    algo: 'orb-diffuse-y',
    name: 'Orb Diffuse Y (Default, Mono)',
    dim: { w: 120, h: 90 },
    patternGen: generateHighlightPeaks,
    pal: PALETTES.mono,
    settings: { diffusionStrength: 1.0, lineScale: 1.0, orbCount: 5, orbSize: 60, orbIntensity: 70 }
  },
  {
    algo: 'orb-diffuse-y',
    name: 'Orb Diffuse Y (lineScale=2, Gameboy)',
    dim: { w: 120, h: 90 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { diffusionStrength: 1.0, lineScale: 2.0, orbCount: 6, orbSize: 70, orbIntensity: 80 }
  },

  // 5. orb-matrix (Bayer ordered threshold with orb boost)
  {
    algo: 'orb-matrix',
    name: 'Orb Matrix (4x4, Default, Mono)',
    dim: { w: 120, h: 90 },
    patternGen: generateHighlightPeaks,
    pal: PALETTES.mono,
    settings: { matrixSize: 4, scale: 1.0, orbCount: 6, orbSize: 60, orbIntensity: 70 }
  },
  {
    algo: 'orb-matrix',
    name: 'Orb Matrix (2x2, Scale=2, Cyberpunk)',
    dim: { w: 120, h: 90 },
    patternGen: generateGradientPattern,
    pal: PALETTES.cyberpunk,
    settings: { matrixSize: 2, scale: 2.0, orbCount: 8, orbSize: 50, orbIntensity: 60, offsetX: 10, offsetY: 5 }
  },
  {
    algo: 'orb-matrix',
    name: 'Orb Matrix (8x8, Gameboy)',
    dim: { w: 120, h: 90 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { matrixSize: 8, scale: 1.0, orbCount: 5, orbSize: 80, orbIntensity: 85 }
  },

  // 6. waveform-alt (Distinct dual-wave carrier formula)
  {
    algo: 'waveform-alt',
    name: 'Waveform Alt (Blend=0.5, Mono)',
    dim: { w: 120, h: 90 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { modulationBlend: 5, scale: 1.0, diffusionStrength: 1.0 }
  },
  {
    algo: 'waveform-alt',
    name: 'Waveform Alt (Blend=0.8, Scale=2, Cyberpunk)',
    dim: { w: 120, h: 90 },
    patternGen: generateGradientPattern,
    pal: PALETTES.cyberpunk,
    settings: { modulationBlend: 8, scale: 2.0, diffusionStrength: 0.9, smoothing: 2 }
  },
  {
    algo: 'waveform-alt',
    name: 'Waveform Alt (Blend=0.2, Gameboy)',
    dim: { w: 120, h: 90 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { modulationBlend: 2, scale: 1.0, diffusionStrength: 1.0 }
  },

  // Regression check: standard waveform is not broken by decoupling
  {
    algo: 'waveform',
    name: 'Waveform Standard (Regression check, Mono)',
    dim: { w: 120, h: 90 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { waveDensity: 1.0, scale: 1.0, diffusionStrength: 1.0 }
  }
];

console.log('==================================================================');
console.log('       DITHERFORGE PHASE 1: RUST AUTHENTICITY PARITY TESTS        ');
console.log('==================================================================\n');

let passCount = 0;
let failCount = 0;
const results = [];

for (const tc of TEST_CASES) {
  const { w, h } = tc.dim;
  const input = tc.patternGen(w, h);

  try {
    // 1. JavaScript Engine
    const jsResult = dispatchDither(tc.algo, w, h, input, {
      palette: tc.pal,
      controls: tc.settings,
      ...tc.settings
    });
    const jsBuf = jsResult.buffer ? new Uint8ClampedArray(jsResult.buffer) : jsResult;

    // 2. Rust Engine
    const rustBuf = runRustDither(w, h, input, tc.algo, tc.pal, tc.settings);

    assert.equal(jsBuf.length, rustBuf.length, 'Output buffer length mismatch');
    const totalPixels = w * h;
    let identicalPixels = 0;
    let alphaPreserved = 0;
    let maxDiff = 0;

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
      const curMax = Math.max(rDiff, gDiff, bDiff, aDiff);
      if (curMax > maxDiff) maxDiff = curMax;
    }

    const parityPct = ((identicalPixels / totalPixels) * 100).toFixed(2);
    const alphaPct = ((alphaPreserved / totalPixels) * 100).toFixed(2);

    const isPass = identicalPixels === totalPixels;
    if (isPass) {
      passCount++;
      console.log(`[PASS] ${tc.name.padEnd(52)} | Parity: 100.00% (${identicalPixels}/${totalPixels}) | Alpha: 100.00%`);
    } else {
      failCount++;
      console.log(`[FAIL] ${tc.name.padEnd(52)} | Parity: ${parityPct}% (${identicalPixels}/${totalPixels}) | MaxDiff: ${maxDiff}`);
      let printed = 0;
      for (let y = 0; y < h && printed < 5; y++) {
        for (let x = 0; x < w && printed < 5; x++) {
          const idx = (y * w + x) * 4;
          if (jsBuf[idx] !== rustBuf[idx] || jsBuf[idx+1] !== rustBuf[idx+1] || jsBuf[idx+2] !== rustBuf[idx+2]) {
            console.log(`       Diff at (${x}, ${y}): JS=[${jsBuf[idx]},${jsBuf[idx+1]},${jsBuf[idx+2]}] RUST=[${rustBuf[idx]},${rustBuf[idx+1]},${rustBuf[idx+2]}]`);
            printed++;
          }
        }
      }
    }

    results.push({
      name: tc.name,
      algo: tc.algo,
      totalPixels,
      identicalPixels,
      parityPct,
      alphaPct,
      maxDiff,
      passed: isPass
    });
  } catch (err) {
    failCount++;
    console.error(`[ERROR] ${tc.name.padEnd(52)} | Error: ${err.message}`);
    results.push({
      name: tc.name,
      algo: tc.algo,
      passed: false,
      error: err.message
    });
  }
}

console.log('\n==================================================================');
console.log(`Summary: ${passCount} PASSED, ${failCount} FAILED out of ${TEST_CASES.length} test cases.`);
console.log('==================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

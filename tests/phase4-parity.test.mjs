// Phase 4 Parity Test Suite: Special Contours & Procedural Waves Authenticity Verification
// Tests exact parity between JavaScript reference implementation and Rust native engine for:
// 1. beehive
// 2. diagonal
// 3. displace-contour
// 4. dotted-lines
// 5. noise
// 6. radial-burst
// 7. radial-peaks
// 8. sine-distort
// 9. sine-wave-modulation
// 10. topography
// 11. vortex
// 12. wave

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
    cell_radius: settings.cellRadius,
    edge_sensitivity: settings.edgeSensitivity,
    checkers_size: settings.checkersSize,
    period: settings.period,
    dot_scale: settings.dotScale,
    depth: settings.depth,
    noise_amount: settings.noiseAmount,
    dot_density: settings.dotDensity,
    density: settings.density,
    variation: settings.variation,
    divisor: settings.divisor,
    peak_threshold: settings.peakThreshold,
    min_peak_distance: settings.minPeakDistance,
    max_peaks: settings.maxPeaks,
    interference: settings.interference,
    contour_threshold: settings.contourThreshold,
    line_mode: settings.lineMode ? String(settings.lineMode) : undefined,
    bands: settings.bands,
    stripe_spacing: settings.stripeSpacing,
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

  const payload = Buffer.concat([headerLenBuf, headerJson, Buffer.from(inputBuffer.buffer, inputBuffer.byteOffset, inputBuffer.byteLength)]);

  const proc = spawnSync(RUST_BIN, [], {
    input: payload,
    maxBuffer: 64 * 1024 * 1024
  });

  if (proc.status !== 0 || proc.error || !proc.stdout || proc.stdout.length === 0) {
    throw new Error(`Rust binary failed (status ${proc.status}): ${proc.stderr?.toString() || proc.error?.message || 'Empty stdout'}`);
  }


  return new Uint8ClampedArray(proc.stdout.buffer, proc.stdout.byteOffset, proc.stdout.byteLength);
}

// Test pattern 1: Gradient with XOR and transparency
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

// Test pattern 2: Radial gradient
function generateRadialPattern(width, height) {
  const buf = new Uint8ClampedArray(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const maxD = Math.hypot(cx, cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const d = Math.hypot(x - cx, y - cy);
      const v = Math.round((1 - d / maxD) * 255);
      buf[idx] = Math.max(0, Math.min(255, v));
      buf[idx + 1] = Math.max(0, Math.min(255, Math.round(v * 0.8)));
      buf[idx + 2] = Math.max(0, Math.min(255, 255 - v));
      buf[idx + 3] = 255;
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

const TEST_CASES = [
  // 1. beehive
  {
    algo: 'beehive',
    name: 'Beehive (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'beehive',
    name: 'Beehive (cellSize=12, Scale=1.5, Gameboy)',
    dim: { w: 90, h: 70 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { cellSize: 12, scale: 1.5, offsetX: 5, offsetY: 3 }
  },

  // 2. diagonal
  {
    algo: 'diagonal',
    name: 'Diagonal (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'diagonal',
    name: 'Diagonal (stripeSpacing=6, edgeSensitivity=2, angle=60, Gameboy)',
    dim: { w: 80, h: 60 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { stripeSpacing: 6, edgeSensitivity: 2, angle: 60, scale: 1.2 }
  },

  // 3. displace-contour
  {
    algo: 'displace-contour',
    name: 'Displace Contour (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'displace-contour',
    name: 'Displace Contour (contourThreshold=75, lineMode=2, bands=8, Gameboy)',
    dim: { w: 90, h: 70 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { contourThreshold: 75, lineMode: 2, bands: 8, scale: 1.3 }
  },
  {
    algo: 'displace-contour',
    name: 'Displace Contour (smoothing=2, Scale=1.2, Cyberpunk)',
    dim: { w: 80, h: 60 },
    patternGen: generateRadialPattern,
    pal: PALETTES.cyberpunk,
    settings: { smoothing: 2, scale: 1.2 }
  },

  // 4. dotted-lines
  {
    algo: 'dotted-lines',
    name: 'Dotted Lines (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'dotted-lines',
    name: 'Dotted Lines (lineDensity=15, dotting=60, lineAngle=30, Gameboy)',
    dim: { w: 80, h: 60 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { lineDensity: 15, dotting: 60, lineAngle: 30, scale: 1.2 }
  },

  // 5. noise
  {
    algo: 'noise',
    name: 'Noise (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'noise',
    name: 'Noise (noiseAmount=0.5, Scale=2.0, Cyberpunk)',
    dim: { w: 80, h: 60 },
    patternGen: generateGradientPattern,
    pal: PALETTES.cyberpunk,
    settings: { noiseAmount: 0.5, scale: 2.0, offsetX: 10, offsetY: 15 }
  },

  // 6. radial-burst
  {
    algo: 'radial-burst',
    name: 'Radial Burst (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'radial-burst',
    name: 'Radial Burst (divisor=8, Scale=1.5, Gameboy)',
    dim: { w: 80, h: 60 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { divisor: 8, scale: 1.5, offsetX: 10, offsetY: -5 }
  },

  // 7. radial-peaks
  {
    algo: 'radial-peaks',
    name: 'Radial Peaks (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'radial-peaks',
    name: 'Radial Peaks (divisor=10, maxPeaks=5, minPeakDistance=40, Gameboy)',
    dim: { w: 90, h: 70 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { divisor: 10, maxPeaks: 5, minPeakDistance: 40, scale: 1.2 }
  },
  {
    algo: 'radial-peaks',
    name: 'Radial Peaks (interference=true, Scale=1.2, Cyberpunk)',
    dim: { w: 80, h: 60 },
    patternGen: generateRadialPattern,
    pal: PALETTES.cyberpunk,
    settings: { interference: true, scale: 1.2 }
  },

  // 8. sine-distort
  {
    algo: 'sine-distort',
    name: 'Sine Distort (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'sine-distort',
    name: 'Sine Distort (freqA=15, freqB=20, angle=30, Gameboy)',
    dim: { w: 80, h: 60 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { freqA: 15, freqB: 20, angle: 30, scale: 1.4 }
  },

  // 9. sine-wave-modulation
  {
    algo: 'sine-wave-modulation',
    name: 'Sine Wave Modulation (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'sine-wave-modulation',
    name: 'Sine Wave Modulation (waveFrequency=8, waveThreshold=15, Cyberpunk)',
    dim: { w: 80, h: 60 },
    patternGen: generateGradientPattern,
    pal: PALETTES.cyberpunk,
    settings: { waveFrequency: 8, waveThreshold: 15, scale: 1.5 }
  },

  // 10. topography
  {
    algo: 'topography',
    name: 'Topography (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'topography',
    name: 'Topography (warpIntensity=2.0, Scale=1.5, Gameboy)',
    dim: { w: 90, h: 70 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { warpIntensity: 2.0, scale: 1.5, offsetX: 10, offsetY: 5 }
  },

  // 11. vortex
  {
    algo: 'vortex',
    name: 'Vortex (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'vortex',
    name: 'Vortex (swirl=8.0, Scale=1.5, Cyberpunk)',
    dim: { w: 80, h: 60 },
    patternGen: generateGradientPattern,
    pal: PALETTES.cyberpunk,
    settings: { swirl: 8.0, scale: 1.5, offsetX: -10, offsetY: 8 }
  },

  // 12. wave
  {
    algo: 'wave',
    name: 'Wave (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'wave',
    name: 'Wave (frequency=10, Scale=1.5, Gameboy)',
    dim: { w: 80, h: 60 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { frequency: 10, scale: 1.5, offsetX: 7 }
  },

  // Edge cases: Odd dimensions and alpha preservation
  {
    algo: 'beehive',
    name: 'Beehive (Odd dimensions 47x37, Alpha)',
    dim: { w: 47, h: 37 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { scale: 1.2 }
  },
  {
    algo: 'topography',
    name: 'Topography (Odd dimensions 53x43, Alpha)',
    dim: { w: 53, h: 43 },
    patternGen: generateGradientPattern,
    pal: PALETTES.cyberpunk,
    settings: { scale: 1.3, warpIntensity: 1.5 }
  },
  {
    algo: 'displace-contour',
    name: 'Displace Contour (Odd dimensions 49x39, Alpha)',
    dim: { w: 49, h: 39 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { scale: 1.1, lineMode: 2 }
  }
];

console.log(`Using Rust parity binary: ${RUST_BIN}`);
let passed = 0;
let failed = 0;

for (const tc of TEST_CASES) {
  const { w, h } = tc.dim;
  const inputBuffer = tc.patternGen(w, h);

  const jsStart = performance.now();
  const jsResult = dispatchDither(tc.algo, w, h, inputBuffer, {
    palette: tc.pal,
    controls: tc.settings,
    ...tc.settings
  });
  const jsDuration = performance.now() - jsStart;
  const jsOut = new Uint8ClampedArray(jsResult.buffer);

  const rustStart = performance.now();
  const rustOut = runRustDither(w, h, inputBuffer, tc.algo, tc.pal, tc.settings);
  const rustDuration = performance.now() - rustStart;

  const totalPixels = w * h;
  let matches = 0;
  let firstDiff = null;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    if (
      jsOut[idx] === rustOut[idx] &&
      jsOut[idx + 1] === rustOut[idx + 1] &&
      jsOut[idx + 2] === rustOut[idx + 2] &&
      jsOut[idx + 3] === rustOut[idx + 3]
    ) {
      matches++;
    } else if (!firstDiff) {
      firstDiff = {
        pixel: i,
        x: i % w,
        y: Math.floor(i / w),
        js: [jsOut[idx], jsOut[idx + 1], jsOut[idx + 2], jsOut[idx + 3]],
        rust: [rustOut[idx], rustOut[idx + 1], rustOut[idx + 2], rustOut[idx + 3]]
      };
    }
  }

  const parityPct = (matches / totalPixels) * 100;
  const algoPad = tc.algo.padEnd(16);
  const namePad = tc.name.padEnd(65);

  if (matches === totalPixels) {
    passed++;
    console.log(`[PASS] ${algoPad} | ${namePad} | Parity: 100.00% (${matches}/${totalPixels}) | JS: ${jsDuration.toFixed(2)}ms, Rust: ${rustDuration.toFixed(2)}ms`);
  } else {
    failed++;
    console.error(`[FAIL] ${algoPad} | ${namePad} | Parity: ${parityPct.toFixed(2)}% (${matches}/${totalPixels}) | JS: ${jsDuration.toFixed(2)}ms, Rust: ${rustDuration.toFixed(2)}ms`);
    if (firstDiff) {
      console.error(`       First mismatch at (${firstDiff.x}, ${firstDiff.y}): JS=[${firstDiff.js.join(',')}] Rust=[${firstDiff.rust.join(',')}]`);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Phase 4 Parity Verification: ${passed}/${TEST_CASES.length} passed (${failed} failed)`);
console.log('='.repeat(60) + '\n');

if (failed > 0) {
  process.exit(1);
}

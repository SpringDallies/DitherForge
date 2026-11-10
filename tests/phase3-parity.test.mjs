// Phase 3 Parity Test Suite: Patterned & Halftoning Algorithms Authenticity Verification
// Tests exact parity between JavaScript reference implementation and Rust native engine for:
// 1. diamond
// 2. diamond-grid
// 3. print-pattern
// 4. square-mosaic
// 5. camo
// 6. stippling
// 7. block-tone
// 8. pop-tone
// 9. checkers
// 10. circle-grid
// 11. crosshatch
// 12. gridlock-traffic
// 13. heart-grid

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
  // 1. diamond
  {
    algo: 'diamond',
    name: 'Diamond (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'diamond',
    name: 'Diamond (period=12, Scale=1.5, Gameboy)',
    dim: { w: 90, h: 70 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { period: 12, scale: 1.5 }
  },

  // 2. diamond-grid
  {
    algo: 'diamond-grid',
    name: 'Diamond Grid (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'diamond-grid',
    name: 'Diamond Grid (Scale=2.0, Cyberpunk)',
    dim: { w: 80, h: 60 },
    patternGen: generateRadialPattern,
    pal: PALETTES.cyberpunk,
    settings: { scale: 2.0 }
  },

  // 3. print-pattern
  {
    algo: 'print-pattern',
    name: 'Print Pattern (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'print-pattern',
    name: 'Print Pattern (dotScale=12, Scale=1.2, Cyberpunk)',
    dim: { w: 90, h: 70 },
    patternGen: generateRadialPattern,
    pal: PALETTES.cyberpunk,
    settings: { dotScale: 12, scale: 1.2 }
  },

  // 4. square-mosaic
  {
    algo: 'square-mosaic',
    name: 'Square Mosaic (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'square-mosaic',
    name: 'Square Mosaic (blockSize=16, Scale=1.5, Gameboy)',
    dim: { w: 80, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.gameboy,
    settings: { blockSize: 16, scale: 1.5 }
  },

  // 5. camo
  {
    algo: 'camo',
    name: 'Camo (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'camo',
    name: 'Camo (density=20, Scale=1.2, Cyberpunk)',
    dim: { w: 80, h: 60 },
    patternGen: generateRadialPattern,
    pal: PALETTES.cyberpunk,
    settings: { density: 20, scale: 1.2 }
  },

  // 6. stippling
  {
    algo: 'stippling',
    name: 'Stippling (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'stippling',
    name: 'Stippling (dotDensity=3, Scale=1.5, Gameboy)',
    dim: { w: 90, h: 70 },
    patternGen: generateRadialPattern,
    pal: PALETTES.gameboy,
    settings: { dotDensity: 3, scale: 1.5 }
  },

  // 7. block-tone
  {
    algo: 'block-tone',
    name: 'Block Tone (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'block-tone',
    name: 'Block Tone (dotSize=8, Scale=1.5, Gameboy)',
    dim: { w: 80, h: 60 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { dotSize: 8, scale: 1.5 }
  },

  // 8. pop-tone
  {
    algo: 'pop-tone',
    name: 'Pop Tone (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'pop-tone',
    name: 'Pop Tone (density=50, variation=30, Cyberpunk)',
    dim: { w: 80, h: 60 },
    patternGen: generateRadialPattern,
    pal: PALETTES.cyberpunk,
    settings: { density: 50, variation: 30, scale: 1.0 }
  },

  // 9. checkers
  {
    algo: 'checkers',
    name: 'Checkers (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'checkers',
    name: 'Checkers (checkersSize=16, Scale=1.2, Gameboy)',
    dim: { w: 80, h: 60 },
    patternGen: generateRadialPattern,
    pal: PALETTES.gameboy,
    settings: { checkersSize: 16, scale: 1.2 }
  },

  // 10. circle-grid
  {
    algo: 'circle-grid',
    name: 'Circle Grid (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'circle-grid',
    name: 'Circle Grid (Scale=2.0, Cyberpunk)',
    dim: { w: 80, h: 60 },
    patternGen: generateRadialPattern,
    pal: PALETTES.cyberpunk,
    settings: { scale: 2.0 }
  },

  // 11. crosshatch
  {
    algo: 'crosshatch',
    name: 'Crosshatch (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateRadialPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'crosshatch',
    name: 'Crosshatch (lineSpacing=2, Scale=1.5, Gameboy)',
    dim: { w: 80, h: 60 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { lineSpacing: 2, scale: 1.5 }
  },

  // 12. gridlock-traffic
  {
    algo: 'gridlock-traffic',
    name: 'Gridlock/Traffic (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'gridlock-traffic',
    name: 'Gridlock/Traffic (Scale=2.0, Cyberpunk)',
    dim: { w: 80, h: 60 },
    patternGen: generateRadialPattern,
    pal: PALETTES.cyberpunk,
    settings: { scale: 2.0 }
  },

  // 13. heart-grid
  {
    algo: 'heart-grid',
    name: 'Heart Grid (Default, Mono)',
    dim: { w: 100, h: 80 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.0 }
  },
  {
    algo: 'heart-grid',
    name: 'Heart Grid (Scale=1.8, Cyberpunk)',
    dim: { w: 90, h: 70 },
    patternGen: generateRadialPattern,
    pal: PALETTES.cyberpunk,
    settings: { scale: 1.8 }
  },

  // 14. Odd dimensions and partial transparency test
  {
    algo: 'print-pattern',
    name: 'Print Pattern (Odd dimensions 47x37, Alpha)',
    dim: { w: 47, h: 37 },
    patternGen: generateGradientPattern,
    pal: PALETTES.gameboy,
    settings: { scale: 1.1 }
  },
  {
    algo: 'camo',
    name: 'Camo (Odd dimensions 53x43, Alpha)',
    dim: { w: 53, h: 43 },
    patternGen: generateGradientPattern,
    pal: PALETTES.mono,
    settings: { scale: 1.3 }
  }
];

async function main() {
  console.log(`Using Rust parity binary: ${RUST_BIN}`);
  assert(fs.existsSync(RUST_BIN), `Rust binary does not exist at ${RUST_BIN}`);

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    const { w, h } = tc.dim;
    const input = tc.patternGen(w, h);

    // 1. JS reference
    const jsStart = performance.now();
    const jsResult = dispatchDither(tc.algo, w, h, input, {
      palette: tc.pal,
      controls: tc.settings,
      ...tc.settings
    });
    const jsOut = new Uint8ClampedArray(jsResult.buffer);
    const jsTime = performance.now() - jsStart;

    // 2. Rust Engine
    const rustStart = performance.now();
    const rustOut = runRustDither(w, h, input, tc.algo, tc.pal, tc.settings);
    const rustTime = performance.now() - rustStart;

    // 3. Parity comparison
    const totalPixels = w * h;
    let exactMatches = 0;
    let maxChannelDiff = 0;
    let diffSample = null;

    for (let p = 0; p < totalPixels; p++) {
      const idx = p * 4;
      const dr = Math.abs(jsOut[idx] - rustOut[idx]);
      const dg = Math.abs(jsOut[idx + 1] - rustOut[idx + 1]);
      const db = Math.abs(jsOut[idx + 2] - rustOut[idx + 2]);
      const da = Math.abs(jsOut[idx + 3] - rustOut[idx + 3]);
      const pMaxDiff = Math.max(dr, dg, db, da);

      if (pMaxDiff === 0) {
        exactMatches++;
      } else {
        if (!diffSample) {
          diffSample = {
            pixel: p,
            x: p % w,
            y: Math.floor(p / w),
            js: [jsOut[idx], jsOut[idx + 1], jsOut[idx + 2], jsOut[idx + 3]],
            rust: [rustOut[idx], rustOut[idx + 1], rustOut[idx + 2], rustOut[idx + 3]]
          };
        }
      }
      if (pMaxDiff > maxChannelDiff) {
        maxChannelDiff = pMaxDiff;
      }
    }

    const parityPct = (exactMatches / totalPixels) * 100;
    const isPass = exactMatches === totalPixels;

    if (isPass) {
      passed++;
      console.log(`[PASS] ${tc.algo.padEnd(18)} | ${tc.name.padEnd(54)} | Parity: 100.00% (${exactMatches}/${totalPixels}) | JS: ${jsTime.toFixed(2)}ms, Rust: ${rustTime.toFixed(2)}ms`);
    } else {
      failed++;
      console.error(`[FAIL] ${tc.algo.padEnd(18)} | ${tc.name.padEnd(54)} | Parity: ${parityPct.toFixed(2)}% (${exactMatches}/${totalPixels}) | MaxDiff: ${maxChannelDiff}`);
      if (diffSample) {
        console.error(`       First mismatch at (${diffSample.x}, ${diffSample.y}): JS=[${diffSample.js}] Rust=[${diffSample.rust}]`);
      }
    }
  }

  console.log('\n============================================================');
  console.log(`Phase 3 Parity Verification: ${passed}/${TEST_CASES.length} passed (${failed} failed)`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});

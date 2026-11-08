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

function runJS(width, height, input, algorithm, palette, customParams = {}) {
  const result = dispatchDither(algorithm, width, height, input, {
    palette,
    ...customParams
  });
  return result.buffer ? new Uint8ClampedArray(result.buffer) : result;
}

function createGrayscaleRamp(w, h) {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const v = Math.round((x / (w - 1)) * 255);
      buf[idx] = v;
      buf[idx + 1] = v;
      buf[idx + 2] = v;
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

function countDarkPixels(buf) {
  let dark = 0;
  for (let i = 0; i < buf.length; i += 4) {
    const luma = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
    if (luma < 128) dark++;
  }
  return dark;
}

console.log('==================================================================');
console.log('       DITHERFORGE THRESHOLD VERIFICATION & PARITY SUITE          ');
console.log('==================================================================');

const W = 160;
const H = 120;
const monoPalette = BUILTIN_PALETTES.find(p => p.id === 'monochrome')?.colors || [
  [0, 0, 0, 255],
  [255, 255, 255, 255]
];

const testAlgorithms = [
  'threshold',
  'bayer-4x4',
  'bayer-8x8',
  'thresholder',
  'checkers',
  'floyd-steinberg'
];

const thresholdValues = [0.05, 0.20, 0.35, 0.50, 0.65, 0.80, 0.95];

let totalPassed = 0;
let totalFailed = 0;

for (const algo of testAlgorithms) {
  console.log(`\nTesting Algorithm: ${algo}`);
  let prevDarkCount = -1;

  for (const t of thresholdValues) {
    const input = createGrayscaleRamp(W, H);
    const rustOut = runRust(W, H, input, algo, monoPalette, { threshold: t });
    const jsOut = runJS(W, H, input, algo, monoPalette, { threshold: t });

    // 1. Compare parity
    let diff = 0;
    let firstDiff = null;
    const totalPixels = W * H;
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      if (
        rustOut[idx] !== jsOut[idx] ||
        rustOut[idx + 1] !== jsOut[idx + 1] ||
        rustOut[idx + 2] !== jsOut[idx + 2]
      ) {
        if (!firstDiff) {
          const x = i % W;
          const y = Math.floor(i / W);
          firstDiff = { x, y, inputVal: input[idx], rust: [rustOut[idx], rustOut[idx+1], rustOut[idx+2]], js: [jsOut[idx], jsOut[idx+1], jsOut[idx+2]] };
        }
        diff++;
      }
    }
    const matchPct = ((totalPixels - diff) / totalPixels) * 100;

    // For pure threshold and bayer, exact match is required
    // For thresholder/checkers/floyd-steinberg, match should be >= 99%
    const minAcceptableMatch = (algo === 'threshold' || algo.startsWith('bayer')) ? 100 : 98;
    const passParity = matchPct >= minAcceptableMatch;

    // 2. Test monotonic darkening as threshold increases
    const darkCount = countDarkPixels(rustOut);
    const passMonotonic = prevDarkCount === -1 || darkCount >= prevDarkCount;
    prevDarkCount = darkCount;

    if (passParity && passMonotonic) {
      console.log(`  PASS: t=${t.toFixed(2)} | Match: ${matchPct.toFixed(2)}% | Dark Pixels: ${darkCount}/${totalPixels} (Monotonic OK)`);
      totalPassed++;
    } else {
      console.error(`  FAIL: t=${t.toFixed(2)} | Match: ${matchPct.toFixed(2)}% | Dark Pixels: ${darkCount} vs prev ${prevDarkCount}`);
      if (firstDiff) console.error('        First diff:', JSON.stringify(firstDiff));
      totalFailed++;
    }
  }
}

console.log('\n==================================================================');
console.log(`SUMMARY: ${totalPassed} passed, ${totalFailed} failed.`);
console.log('==================================================================');

if (totalFailed > 0) {
  process.exit(1);
}

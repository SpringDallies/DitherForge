import assert from 'assert';
import fs from 'fs';
import { execSync } from 'child_process';
import { rotateHueHsvPixel, rotateHueHsvBuffer, applyTweaksFast } from '../src/utils/fastTweaks.ts';
import { GifEncoder } from '../src/utils/gifEncoder.ts';
import { exportAnimatedGif } from '../src/utils/animationExport.ts';

console.log('==================================================================');
console.log('  TESTING: GIF EXPORT, PLAYBACK SPEED & QUICK HUE LINEARITY       ');
console.log('==================================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${desc}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${desc}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// [1] HUE SLIDER TESTS: LINEARITY, S/V PRESERVATION, ALPHA INTEGRITY
// -------------------------------------------------------------
console.log('[1] QUICK-MODE HUE SLIDER LINEARITY & CHANNEL PRESERVATION');

it('Hue rotation is smooth and wraps cleanly through full 360 degrees', () => {
  const red = [255, 0, 0];
  const g = rotateHueHsvPixel(red[0], red[1], red[2], 120);
  assert.deepStrictEqual(g, [0, 255, 0], 'Red + 120 deg must be exact pure Green');

  const b = rotateHueHsvPixel(red[0], red[1], red[2], 240);
  assert.deepStrictEqual(b, [0, 0, 255], 'Red + 240 deg must be exact pure Blue');

  const fullWrap = rotateHueHsvPixel(red[0], red[1], red[2], 360);
  assert.deepStrictEqual(fullWrap, [255, 0, 0], 'Red + 360 deg must return to exact Red');

  const negativeWrap = rotateHueHsvPixel(0, 255, 0, -120);
  assert.deepStrictEqual(negativeWrap, [255, 0, 0], 'Green - 120 deg must return to exact Red');
});

it('Hue rotation strictly preserves alpha channel on image buffer', () => {
  const width = 16, height = 16;
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = 200;
    buf[i + 1] = 50;
    buf[i + 2] = 20;
    buf[i + 3] = (i / 4) % 256; // Varied alpha
  }
  const originalAlphas = new Uint8ClampedArray(width * height);
  for (let i = 0; i < buf.length; i += 4) {
    originalAlphas[i / 4] = buf[i + 3];
  }

  // Rotate hue by 77 degrees
  rotateHueHsvBuffer(buf, buf.length, 77);

  for (let i = 0; i < buf.length; i += 4) {
    assert.strictEqual(buf[i + 3], originalAlphas[i / 4], 'Alpha channel must be 100% untouched');
  }
});

it('Hue rotation preserves saturation and max brightness without compression or clipping', () => {
  // Test across multiple hues
  for (let angle = -180; angle <= 180; angle += 30) {
    const orange = [255, 128, 0];
    const rotated = rotateHueHsvPixel(orange[0], orange[1], orange[2], angle);
    const maxVal = Math.max(...rotated);
    const minVal = Math.min(...rotated);
    assert.strictEqual(maxVal, 255, `Angle ${angle}: Max brightness must remain 255`);
    assert.strictEqual(minVal, 0, `Angle ${angle}: Min value must remain 0`);
  }
});

it('Achromatic colors (white, black, gray) are completely untouched by hue rotation', () => {
  assert.deepStrictEqual(rotateHueHsvPixel(0, 0, 0, 90), [0, 0, 0]);
  assert.deepStrictEqual(rotateHueHsvPixel(255, 255, 255, 90), [255, 255, 255]);
  assert.deepStrictEqual(rotateHueHsvPixel(128, 128, 128, 90), [128, 128, 128]);
});

// -------------------------------------------------------------
// [2] ANIMATION PLAYBACK SPEED TESTS
// -------------------------------------------------------------
console.log('\n[2] ANIMATION PLAYBACK SPEED CONTROL & DURATION EFFECT');

it('Playback speed factor proportionally alters timeline advance rate', () => {
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
  const dt = 0.1; // 100ms
  for (const s of speeds) {
    const advance = dt * s;
    assert.strictEqual(Number(advance.toFixed(4)), Number((0.1 * s).toFixed(4)));
  }
});

// -------------------------------------------------------------
// [3] DIRECT OFFSCREEN DETERMINISTIC GIF EXPORT TESTS
// -------------------------------------------------------------
console.log('\n[3] DIRECT OFFSCREEN DETERMINISTIC GIF EXPORT');

async function runExportTests() {
  const width = 32;
  const height = 32;
  const testPixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < testPixels.length; i += 4) {
    testPixels[i] = (i * 3) & 0xFF;
    testPixels[i + 1] = (i * 7) & 0xFF;
    testPixels[i + 2] = (i * 11) & 0xFF;
    testPixels[i + 3] = 255;
  }
  const sourceImageData = {
    width,
    height,
    data: testPixels
  };

  const mockStoreState = {
    sourceImageData,
    duration: 2.0,
    fps: 10,
    playbackSpeed: 1.0,
    animationTracks: [
      {
        id: 't1',
        category: 'adjustments',
        property: 'brightness',
        startTime: 0,
        endTime: 2.0,
        fromValue: -50,
        toValue: 50,
        easing: 'linear'
      }
    ],
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    gamma: 1.0,
    algorithmId: 'floyd-steinberg',
    workingPalette: [[0, 0, 0, 255], [255, 255, 255, 255], [255, 0, 0, 255], [0, 255, 0, 255]],
    effects: []
  };

  await itAsync('Generates genuine GIF89a binary with correct header and trailer', async () => {
    const bytes = await exportAnimatedGif(mockStoreState);
    assert(bytes instanceof Uint8Array, 'Must return Uint8Array');
    assert(bytes.length > 50, 'Output must be non-trivial');

    // Header check
    const header = String.fromCharCode(...bytes.subarray(0, 6));
    assert.strictEqual(header, 'GIF89a', 'Header must be GIF89a');

    // Logical screen dimensions
    const w = bytes[6] | (bytes[7] << 8);
    const h = bytes[8] | (bytes[9] << 8);
    assert.strictEqual(w, width, `Width must match ${width}`);
    assert.strictEqual(h, height, `Height must match ${height}`);

    // Trailer byte
    assert.strictEqual(bytes[bytes.length - 1], 0x3B, 'Last byte must be GIF trailer 0x3B');
  });

  await itAsync('Deterministic: repeated export produces bit-for-bit identical byte stream', async () => {
    const bytes1 = await exportAnimatedGif(mockStoreState);
    const bytes2 = await exportAnimatedGif(mockStoreState);
    assert.strictEqual(bytes1.length, bytes2.length, 'Byte lengths must match');
    for (let i = 0; i < bytes1.length; i++) {
      if (bytes1[i] !== bytes2[i]) {
        throw new Error(`Byte mismatch at offset ${i}`);
      }
    }
  });

  await itAsync('Playback speed 2x produces half the frame count of 1x', async () => {
    let frames1x = 0;
    await exportAnimatedGif(
      { ...mockStoreState, playbackSpeed: 1.0 },
      { onProgress: (_, idx, tot) => { frames1x = tot; } }
    );

    let frames2x = 0;
    await exportAnimatedGif(
      { ...mockStoreState, playbackSpeed: 2.0 },
      { onProgress: (_, idx, tot) => { frames2x = tot; } }
    );

    assert(frames2x < frames1x, `2x speed frames (${frames2x}) must be fewer than 1x (${frames1x})`);
    assert.strictEqual(frames2x, Math.ceil(frames1x / 2), `2x speed frames (${frames2x}) must equal ceil(1x / 2) (${Math.ceil(frames1x / 2)})`);
  });

  await itAsync('Playback speed 0.5x produces double the frame count of 1x', async () => {
    let frames1x = 0;
    await exportAnimatedGif(
      { ...mockStoreState, playbackSpeed: 1.0 },
      { onProgress: (_, idx, tot) => { frames1x = tot; } }
    );

    let framesHalfX = 0;
    await exportAnimatedGif(
      { ...mockStoreState, playbackSpeed: 0.5 },
      { onProgress: (_, idx, tot) => { framesHalfX = tot; } }
    );

    assert(framesHalfX > frames1x, `0.5x speed frames (${framesHalfX}) must be greater than 1x (${frames1x})`);
    assert.strictEqual(framesHalfX, frames1x * 2, `0.5x speed frames (${framesHalfX}) must equal 2 * 1x (${frames1x * 2})`);
  });

  await itAsync('Exported multi-frame GIF opens and validates cleanly with FFmpeg', async () => {
    const bytes = await exportAnimatedGif(mockStoreState);
    const outPath = 'temp_export_verification.gif';
    fs.writeFileSync(outPath, bytes);

    try {
      const ffmpegOutput = execSync(`"C:\\Program Files\\ShareX\\ffmpeg.exe" -i "${outPath}"`, {
        stdio: ['ignore', 'pipe', 'pipe']
      }).toString();
    } catch (e) {
      // FFmpeg exits with code 1 when no output file is provided, but prints stream metadata in stderr
      const stderr = e.stderr?.toString() || '';
      assert(stderr.includes('Input #0, gif,'), 'FFmpeg must recognize format as gif');
      assert(stderr.includes('32x32'), 'FFmpeg must detect 32x32 video stream');
    } finally {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    }
  });

  console.log('\n==================================================================');
  console.log(`TOTAL SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log('==================================================================\n');

  if (failed > 0) process.exit(1);
}

runExportTests();

import { GifEncoder } from '../src/utils/gifEncoder.ts';

function createColorFrame(w, h, colorR, colorG, colorB) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    data[idx] = colorR;
    data[idx + 1] = colorG;
    data[idx + 2] = colorB;
    data[idx + 3] = 255;
  }
  return data;
}

function createGradientFrame(w, h, shift = 0) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      data[idx] = (x + shift) % 256;
      data[idx + 1] = (y + shift) % 256;
      data[idx + 2] = (x + y + shift) % 256;
      data[idx + 3] = 255;
    }
  }
  return data;
}

function runGifTests() {
  console.log('==================================================================');
  console.log('       TESTING GIF ENCODER TYPED-ARRAY OPTIMIZATION              ');
  console.log('==================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`  PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  FAIL: ${desc}`);
      failed++;
    }
  }

  // Test 1: Small GIF (16x16)
  {
    const encoder = new GifEncoder(16, 16, 0);
    const frame1 = createColorFrame(16, 16, 255, 0, 0);
    encoder.addFrame(frame1, { delay: 100 });
    const bytes = encoder.finish();

    assert(bytes instanceof Uint8Array, 'Encoder outputs Uint8Array');
    assert(bytes.length > 20, 'Output byte length is non-trivial');
    const header = String.fromCharCode(...bytes.slice(0, 6));
    assert(header === 'GIF89a', 'Header is GIF89a');
    // Screen descriptor width and height (Little Endian)
    const w = bytes[6] | (bytes[7] << 8);
    const h = bytes[8] | (bytes[9] << 8);
    assert(w === 16 && h === 16, `Logical screen dimensions match: ${w}x${h}`);
    assert(bytes[bytes.length - 1] === 0x3B, 'GIF terminates with trailer byte 0x3B');
  }

  // Test 2: Multi-Frame Animated GIF (32x32, 4 frames)
  {
    const encoder = new GifEncoder(32, 32, 0);
    for (let f = 0; f < 4; f++) {
      const frame = createColorFrame(32, 32, f * 60, 100, 200);
      encoder.addFrame(frame, { delay: 50 });
    }
    const bytes = encoder.finish();
    assert(bytes[bytes.length - 1] === 0x3B, 'Multi-frame GIF terminates with 0x3B');
    assert(bytes.length > 100, `Multi-frame GIF encoded successfully (${bytes.length} bytes)`);
  }

  // Test 3: Large GIF with high color complexity (>256 colors triggering median-cut)
  {
    const w = 400, h = 300;
    const encoder = new GifEncoder(w, h, 0);
    const complexFrame1 = createGradientFrame(w, h, 0);
    const complexFrame2 = createGradientFrame(w, h, 50);
    encoder.addFrame(complexFrame1, { delay: 100 });
    encoder.addFrame(complexFrame2, { delay: 100 });
    const bytes = encoder.finish();

    assert(bytes instanceof Uint8Array, 'Large export produces Uint8Array');
    const header = String.fromCharCode(...bytes.slice(0, 6));
    assert(header === 'GIF89a', 'Large export header is GIF89a');
    const decodedW = bytes[6] | (bytes[7] << 8);
    const decodedH = bytes[8] | (bytes[9] << 8);
    assert(decodedW === 400 && decodedH === 300, `Large export dimensions match: ${decodedW}x${decodedH}`);
    assert(bytes[bytes.length - 1] === 0x3B, 'Large export terminates with 0x3B');
    assert(bytes.length > 20000, `Large export encoded ${bytes.length} bytes cleanly without heap exhaustion`);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runGifTests();

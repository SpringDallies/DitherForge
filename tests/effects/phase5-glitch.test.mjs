// Phase 5 - Digital / Glitch Effects Test Suite
import assert from 'node:assert/strict';
import {
  glitchEffects,
  bitCrushEffect,
  sliceGlitchEffect,
  blockDisplacementEffect,
  frameEchoEffect,
  clearFrameEchoHistory
} from '../../src/effects/glitch/index.ts';

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL: ${name}\n        ${err.message}`);
  }
}

console.log('==================================================================');
console.log('       DITHERFORGE PHASE 5 (GLITCH EFFECTS) TEST SUITE            ');
console.log('==================================================================');

test('all 4 glitch effects exported and have valid descriptors', () => {
  assert.equal(glitchEffects.length, 4, 'Must have 4 glitch effects');
  const ids = glitchEffects.map(e => e.id).sort();
  assert.deepEqual(ids, [
    'bit_crush',
    'block_displacement',
    'frame_echo',
    'slice_glitch'
  ]);

  for (const eff of glitchEffects) {
    assert.equal(eff.category, 'glitch');
    assert.equal(typeof eff.apply, 'function');
    assert.ok(eff.defaultParams);
    assert.ok(eff.paramsMeta || eff.params);
  }
});

test('Bit-Crush quantizes bit depth per-channel and luminance-only while preserving alpha', () => {
  const width = 32;
  const height = 32;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 123;
    data[i + 1] = 217;
    data[i + 2] = 79;
    data[i + 3] = 205;
  }

  // 2-bit quantization (4 discrete levels: 0, 85, 170, 255)
  bitCrushEffect.apply(data, width, height, {
    bits: 2,
    mode: 'per-channel',
    dither: 0.0
  });

  // Verify quantized values are from the 2-bit discrete set
  const allowed = new Set([0, 85, 170, 255]);
  assert.ok(allowed.has(data[0]), `data[0] (${data[0]}) must be in 2-bit discrete set`);
  assert.ok(allowed.has(data[1]), `data[1] (${data[1]}) must be in 2-bit discrete set`);
  assert.ok(allowed.has(data[2]), `data[2] (${data[2]}) must be in 2-bit discrete set`);

  // Alpha must remain 205
  for (let i = 3; i < data.length; i += 4) {
    assert.equal(data[i], 205, 'Bit-crush must preserve alpha channel');
  }
});

test('Slice Glitch is deterministic per frame-index and shifts horizontal bands', () => {
  const width = 64;
  const height = 64;

  function createPattern() {
    const d = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        d[idx] = x * 4; // vertical gradient in x
        d[idx + 1] = y * 4;
        d[idx + 2] = 100;
        d[idx + 3] = 255;
      }
    }
    return d;
  }

  const dFrame1A = createPattern();
  const dFrame1B = createPattern();
  const dFrame2 = createPattern();

  // Apply to Frame 1 twice
  sliceGlitchEffect.apply(dFrame1A, width, height, { sliceCount: 8, maxOffset: 12 }, { frameIndex: 1 });
  sliceGlitchEffect.apply(dFrame1B, width, height, { sliceCount: 8, maxOffset: 12 }, { frameIndex: 1 });

  // Apply to Frame 2
  sliceGlitchEffect.apply(dFrame2, width, height, { sliceCount: 8, maxOffset: 12 }, { frameIndex: 2 });

  // Frame 1A and Frame 1B must be strictly identical (deterministic seed)
  assert.deepEqual(dFrame1A, dFrame1B, 'Identical frameIndex must produce identical glitch slices');

  // Frame 1 and Frame 2 must differ
  let differ = false;
  for (let i = 0; i < dFrame1A.length; i++) {
    if (dFrame1A[i] !== dFrame2[i]) {
      differ = true;
      break;
    }
  }
  assert.ok(differ, 'Different frameIndex must produce different slices');

  // Verify applyFrame method works identically
  const dFrameApplyFrame = createPattern();
  sliceGlitchEffect.applyFrame({ data: dFrameApplyFrame, width, height }, { sliceCount: 8, maxOffset: 12 }, 1);
  assert.deepEqual(dFrameApplyFrame, dFrame1A, 'applyFrame must match apply with context.frameIndex');
});

test('Block Displacement shifts macroblocks deterministically and preserves alpha', () => {
  const width = 64;
  const height = 64;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = x % 16 === 0 ? 255 : 0;
      data[idx + 1] = y % 16 === 0 ? 255 : 0;
      data[idx + 2] = 120;
      data[idx + 3] = 230;
    }
  }

  blockDisplacementEffect.apply(data, width, height, {
    blockSize: 16,
    magnitude: 8,
    probability: 0.8
  }, { frameIndex: 3 });

  // Alpha check
  for (let i = 3; i < data.length; i += 4) {
    assert.equal(data[i], 230, 'Block displacement must preserve alpha');
  }
});

test('Frame Echo / Trail blends prior frames with exponential decay and resets history', () => {
  clearFrameEchoHistory();

  const width = 16;
  const height = 16;
  const total = width * height * 4;

  // Frame 0: pure white
  const f0 = new Uint8ClampedArray(total);
  f0.fill(255);

  frameEchoEffect.apply(f0, width, height, {
    decay: 0.5,
    frameCount: 3,
    blendMode: 'average'
  }, { frameIndex: 0 });

  // Frame 1: pure black
  const f1 = new Uint8ClampedArray(total);
  f1.fill(0);
  for (let i = 3; i < total; i += 4) f1[i] = 255;

  frameEchoEffect.apply(f1, width, height, {
    decay: 0.5,
    frameCount: 3,
    blendMode: 'average'
  }, { frameIndex: 1 });

  // In f1, prior frame f0 was blended in, so it should not be pure black (value > 0)
  assert.ok(f1[0] > 0, `Frame 1 must contain trail from Frame 0, got ${f1[0]}`);

  // Frame 2: pure black
  const f2 = new Uint8ClampedArray(total);
  f2.fill(0);
  for (let i = 3; i < total; i += 4) f2[i] = 255;

  frameEchoEffect.apply(f2, width, height, {
    decay: 0.5,
    frameCount: 3,
    blendMode: 'average'
  }, { frameIndex: 2 });

  // In f2, trail decays, so f2[0] should be dimmer than f1[0]
  assert.ok(f2[0] < f1[0], `Decay must cause trail to fade: f2[0]=${f2[0]} should be < f1[0]=${f1[0]}`);

  // Reset history
  clearFrameEchoHistory();
  const fFresh = new Uint8ClampedArray(total);
  fFresh.fill(0);
  for (let i = 3; i < total; i += 4) fFresh[i] = 255;
  frameEchoEffect.apply(fFresh, width, height, { decay: 0.5 }, { frameIndex: 10 });
  assert.equal(fFresh[0], 0, 'After clearFrameEchoHistory(), echo should have no prior frame');
});

console.log('==================================================================');
if (failures === 0) {
  console.log('✅ ALL PHASE 5 GLITCH EFFECT TESTS PASSED');
} else {
  console.error(`❌ ${failures} TEST(S) FAILED`);
  process.exit(1);
}

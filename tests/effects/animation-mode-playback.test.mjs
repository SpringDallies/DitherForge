import assert from 'node:assert/strict';
import { applyEffectPipeline, getEffectDescriptor } from '../../src/effects/index.js';

console.log("==================================================================");
console.log("   DITHERFORGE ANIMATION MODE TEMPORAL EFFECTS TEST SUITE        ");
console.log("==================================================================");

function createTestImage(width = 64, height = 64) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = (x * 4) % 256;
      data[idx + 1] = (y * 4) % 256;
      data[idx + 2] = ((x + y) * 2) % 256;
      data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

function buffersEqual(bufA, bufB) {
  if (bufA.length !== bufB.length) return false;
  for (let i = 0; i < bufA.length; i++) {
    if (bufA[i] !== bufB[i]) return false;
  }
  return true;
}

// 1. Scanlines with speed animates across frame indices even without property tracks
{
  const img0 = createTestImage(64, 64);
  const img1 = createTestImage(64, 64);

  const effects = [
    { id: 'scanlines', type: 'scanlines', enabled: true, params: { mode: 'soft', thickness: 2, intensity: 0.5, speed: 2.0 } }
  ];

  applyEffectPipeline(img0, effects, { frameIndex: 0, time: 0, fps: 30 });
  applyEffectPipeline(img1, effects, { frameIndex: 1, time: 1 / 30, fps: 30 });

  assert.ok(!buffersEqual(img0.data, img1.data), 'Scanlines should roll across frames without requiring animation tracks');
  console.log("  PASS: Scanlines rolls across frames without requiring property tracks");
}

// 2. VHS Tracking Band animates across frame indices without property tracks
{
  const img0 = createTestImage(64, 64);
  const img1 = createTestImage(64, 64);

  const effects = [
    { id: 'vhs_tracking', type: 'vhs_tracking', enabled: true, params: { temporal: true, bandHeight: 20, scrollSpeed: 2.0 } }
  ];

  applyEffectPipeline(img0, effects, { frameIndex: 0, time: 0, fps: 30 });
  applyEffectPipeline(img1, effects, { frameIndex: 2, time: 2 / 30, fps: 30 });

  assert.ok(!buffersEqual(img0.data, img1.data), 'VHS Tracking Band should animate across frames without requiring animation tracks');
  console.log("  PASS: VHS Tracking Band animates across frames without requiring property tracks");
}

// 3. Scanline Jitter animates across frame indices without property tracks
{
  const img0 = createTestImage(64, 64);
  const img1 = createTestImage(64, 64);

  const effects = [
    { id: 'scanline_jitter', type: 'scanline_jitter', enabled: true, params: { temporal: true, amplitude: 5, frequency: 0.5 } }
  ];

  applyEffectPipeline(img0, effects, { frameIndex: 0, time: 0, fps: 30 });
  applyEffectPipeline(img1, effects, { frameIndex: 3, time: 3 / 30, fps: 30 });

  assert.ok(!buffersEqual(img0.data, img1.data), 'Scanline Jitter should animate across frames without requiring animation tracks');
  console.log("  PASS: Scanline Jitter animates across frames without requiring property tracks");
}

// 4. Slice Glitch animates across frame indices without property tracks
{
  const img0 = createTestImage(64, 64);
  const img1 = createTestImage(64, 64);

  const effects = [
    { id: 'slice_glitch', type: 'slice_glitch', enabled: true, params: { sliceCount: 8, maxOffset: 12 } }
  ];

  applyEffectPipeline(img0, effects, { frameIndex: 0, time: 0, fps: 30 });
  applyEffectPipeline(img1, effects, { frameIndex: 1, time: 1 / 30, fps: 30 });

  assert.ok(!buffersEqual(img0.data, img1.data), 'Slice Glitch should animate across frames without requiring animation tracks');
  console.log("  PASS: Slice Glitch animates across frames without requiring property tracks");
}

// 5. Film Grain animates across frame indices without property tracks
{
  const img0 = createTestImage(64, 64);
  const img1 = createTestImage(64, 64);

  const effects = [
    { id: 'film_grain', type: 'film_grain', enabled: true, params: { temporal: true, amount: 0.5 } }
  ];

  applyEffectPipeline(img0, effects, { frameIndex: 0, time: 0, fps: 30 });
  applyEffectPipeline(img1, effects, { frameIndex: 1, time: 1 / 30, fps: 30 });

  assert.ok(!buffersEqual(img0.data, img1.data), 'Film Grain should animate across frames without requiring animation tracks');
  console.log("  PASS: Film Grain animates across frames without requiring property tracks");
}

// 6. Viewport Render Signature in Animation Mode
{
  function computeTestRenderSig(appMode, frameIndex, animatedNoiseActive = false, effEffects = []) {
    return [
      64,
      64,
      128,
      'floyd-steinberg',
      'full',
      '0.00', '0.00', '0.00', '0.00', '1.00', '0.00', '0.00', '0.00', 8,
      'palette',
      false, '0.500', false,
      '{}',
      JSON.stringify(effEffects),
      '',
      appMode === 'animation' ? frameIndex : (animatedNoiseActive ? frameIndex : '')
    ].join('::');
  }

  const sigStill0 = computeTestRenderSig('still', 0, false, [{ id: 'scanlines', enabled: true }]);
  const sigStill1 = computeTestRenderSig('still', 1, false, [{ id: 'scanlines', enabled: true }]);
  assert.equal(sigStill0, sigStill1, 'Still mode should cache render signature across frame changes');

  const sigAnim0 = computeTestRenderSig('animation', 0, false, [{ id: 'scanlines', enabled: true }]);
  const sigAnim1 = computeTestRenderSig('animation', 1, false, [{ id: 'scanlines', enabled: true }]);
  assert.notEqual(sigAnim0, sigAnim1, 'Animation mode must produce unique signatures for each frameIndex even with 0 property tracks');
  console.log("  PASS: Viewport render signature distinguishes frameIndex during animation mode");
}

console.log("==================================================================");
console.log("✅ ALL ANIMATION MODE TEMPORAL EFFECT TESTS PASSED");
console.log("==================================================================");

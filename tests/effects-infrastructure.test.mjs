// Tests for Day 1 Post-Effects Infrastructure (Blend modes, Pipeline, Presets v2)
import assert from 'node:assert/strict';
import { blendChannel, compositeEffectLayer } from '../src/effects/blendModes.ts';
import { DEFAULT_PIPELINE_ORDER, sortEffectsByPipelineOrder, applyEffectPipeline } from '../src/effects/pipeline.ts';
import { migratePresetToV2, resolveEffectId } from '../src/effects/presets.ts';

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
console.log('       DITHERFORGE EFFECTS INFRASTRUCTURE TESTS (DAY 1)           ');
console.log('==================================================================');

// 1. Blend Modes Math Verification
test('blendChannel normal returns source value', () => {
  assert.equal(blendChannel(100, 200, 'normal'), 200);
});

test('blendChannel screen blends light values correctly', () => {
  // Screen: 255 - ((255 - d)*(255 - s)) / 255
  // For d=0, s=200 -> 200
  // For d=255, s=any -> 255
  assert.equal(blendChannel(0, 200, 'screen'), 200);
  assert.equal(blendChannel(255, 100, 'screen'), 255);
});

test('blendChannel multiply darkens values correctly', () => {
  // Multiply: (d * s) / 255
  // For d=255, s=200 -> 200
  // For d=0, s=any -> 0
  assert.equal(blendChannel(255, 200, 'multiply'), 200);
  assert.equal(blendChannel(0, 200, 'multiply'), 0);
});

test('blendChannel overlay contrasts correctly', () => {
  // Overlay: d < 128 ? (2*d*s)/255 : 255 - 2*(255-d)*(255-s)/255
  assert.equal(blendChannel(0, 200, 'overlay'), 0);
  assert.equal(blendChannel(255, 200, 'overlay'), 255);
});

test('blendChannel add clamps at 255', () => {
  assert.equal(blendChannel(200, 100, 'add'), 255);
  assert.equal(blendChannel(50, 60, 'add'), 110);
});

// 2. Buffer Layer Compositing & Alpha Preservation
test('compositeEffectLayer preserves base alpha channel', () => {
  const base = new Uint8ClampedArray([100, 100, 100, 128, 50, 50, 50, 255]);
  const layer = new Uint8ClampedArray([200, 200, 200, 255, 200, 200, 200, 255]);
  compositeEffectLayer(base, layer, base.length, 0.75, 'screen');

  assert.equal(base[3], 128, 'First pixel alpha must remain 128');
  assert.equal(base[7], 255, 'Second pixel alpha must remain 255');
  assert.ok(base[0] > 100, 'Base red channel should be brightened by screen');
});

// 3. Pipeline Order
test('DEFAULT_PIPELINE_ORDER places screen_curvature after vignette', () => {
  const vigIdx = DEFAULT_PIPELINE_ORDER.indexOf('vignette');
  const curveIdx = DEFAULT_PIPELINE_ORDER.indexOf('screen_curvature');
  assert.ok(vigIdx !== -1, 'vignette in pipeline');
  assert.ok(curveIdx !== -1, 'screen_curvature in pipeline');
  assert.ok(curveIdx > vigIdx, 'screen_curvature must be after vignette in default chain');
});

test('sortEffectsByPipelineOrder correctly orders effect items', () => {
  const items = [
    { id: '1', type: 'screen_curvature', name: 'Curvature', enabled: true, params: {}, opacity: 1, blendMode: 'normal' },
    { id: '2', type: 'curves_levels', name: 'Curves', enabled: true, params: {}, opacity: 1, blendMode: 'normal' },
    { id: '3', type: 'scanlines', name: 'Scanlines', enabled: true, params: {}, opacity: 1, blendMode: 'normal' }
  ];
  const sorted = sortEffectsByPipelineOrder(items);
  assert.equal(sorted[0].type, 'curves_levels');
  assert.equal(sorted[1].type, 'scanlines');
  assert.equal(sorted[2].type, 'screen_curvature');
});

// 4. Preset Schema v2 Migration & Aliases
test('resolveEffectId aliases legacy effect names', () => {
  assert.equal(resolveEffectId('chromatic_aberration'), 'lens_aberration');
  assert.equal(resolveEffectId('crt_lines'), 'scanlines');
  assert.equal(resolveEffectId('scanlines'), 'scanlines');
});

test('migratePresetToV2 converts v1 presets to v2 with opacity and blendMode', () => {
  const mockRegistry = new Map([
    ['lens_aberration', { id: 'lens_aberration', defaultBlendMode: 'normal' }],
    ['scanlines', { id: 'scanlines', defaultBlendMode: 'normal' }]
  ]);

  const v1Preset = {
    id: 'test_p1',
    name: 'Old Preset',
    effects: [
      { id: 'chromatic_aberration', type: 'chromatic_aberration', enabled: true, params: { offsetX: 6, offsetY: 2 } },
      { id: 'unknown_ghost_effect', type: 'unknown_ghost_effect', enabled: true, params: {} }
    ]
  };

  const v2 = migratePresetToV2(v1Preset, (id) => mockRegistry.get(id));
  assert.equal(v2.version, 2);
  assert.equal(v2.effects.length, 2);

  // First effect aliased to lens_aberration and enabled
  assert.equal(v2.effects[0].id, 'lens_aberration');
  assert.equal(v2.effects[0].enabled, true);
  assert.equal(v2.effects[0].opacity, 1.0);
  assert.equal(v2.effects[0].blendMode, 'normal');
  assert.equal(v2.effects[0].params.mode, 'uniform');
  assert.equal(v2.effects[0].params.offsetX, 6);

  // Unknown effect loaded disabled
  assert.equal(v2.effects[1].id, 'unknown_ghost_effect');
  assert.equal(v2.effects[1].enabled, false, 'Unknown effects must load disabled');
});

console.log('==================================================================');
if (failures === 0) {
  console.log('✅ ALL EFFECTS INFRASTRUCTURE TESTS PASSED');
  process.exit(0);
} else {
  console.error(`❌ ${failures} TEST(S) FAILED`);
  process.exit(1);
}

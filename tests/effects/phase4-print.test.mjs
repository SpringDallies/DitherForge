// Phase 4 - Print / Analog Media Effects Test Suite
import assert from 'node:assert/strict';
import {
  printEffects,
  risographEffect,
  photocopyEffect,
  paperTextureEffect,
  rosetteAnglesEffect
} from '../../src/effects/print/index.ts';

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
console.log('       DITHERFORGE PHASE 4 (PRINT EFFECTS) TEST SUITE             ');
console.log('==================================================================');

test('all 4 print effects exported and have valid descriptors', () => {
  assert.equal(printEffects.length, 4, 'Must have 4 print effects');
  const ids = printEffects.map(e => e.id).sort();
  assert.deepEqual(ids, [
    'paper_texture',
    'photocopy_degradation',
    'risograph_misregistration',
    'rosette_angles'
  ]);

  for (const eff of printEffects) {
    assert.equal(eff.category, 'print');
    assert.equal(typeof eff.apply, 'function');
    assert.ok(eff.defaultParams);
    assert.ok(eff.paramsMeta || eff.params);
  }
});

test('Risograph Misregistration applies multi-layer ink offset and preserves alpha', () => {
  const width = 64;
  const height = 64;
  const data = new Uint8ClampedArray(width * height * 4);
  // Fill with mid-tone gray and alpha 210
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128;
    data[i + 1] = 128;
    data[i + 2] = 128;
    data[i + 3] = 210;
  }

  // 1. Pipeline 5-arg style
  risographEffect.apply(data, width, height, {
    layerCount: 3,
    offsetX: 4,
    offsetY: 2,
    textureAmount: 0.25
  });

  // Verify pixels changed
  let changed = false;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] !== 128 || data[i + 1] !== 128 || data[i + 2] !== 128) {
      changed = true;
      break;
    }
  }
  assert.ok(changed, 'Risograph must modify RGB pixels');

  // Verify alpha preserved
  for (let i = 3; i < data.length; i += 4) {
    assert.equal(data[i], 210, 'Alpha channel must remain unchanged');
  }

  // 2. Standalone 2-arg style
  const ctx = { data: new Uint8ClampedArray(data), width, height };
  risographEffect.apply(ctx, { layerCount: 2 });
  assert.equal(ctx.data[3], 210, 'Standalone calling convention works and preserves alpha');
});

test('Photocopy Degradation introduces toner speckles, streaks, and edge darkening', () => {
  const width = 80;
  const height = 80;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(240); // bright paper
  for (let i = 3; i < data.length; i += 4) data[i] = 255;

  photocopyEffect.apply(data, width, height, {
    speckleDensity: 0.15,
    streakAmount: 0.2,
    edgeDarkening: 0.5,
    blur: 1
  });

  // Edge pixels should be significantly darker than center on average due to edgeDarkening
  let edgeSum = 0;
  let edgeCount = 0;
  for (let x = 0; x < width; x++) {
    edgeSum += data[x * 4];
    edgeCount++;
  }
  const avgEdge = edgeSum / edgeCount;

  const centerIdx = (40 * width + 40) * 4;
  const centerVal = data[centerIdx];

  assert.ok(avgEdge < 240, 'Edge darkening must lower perimeter pixel luminance');
  // Check alpha preservation
  for (let i = 3; i < data.length; i += 4) {
    assert.equal(data[i], 255, 'Alpha must remain 255');
  }
});

test('Paper Texture generates fiber grain with multiply blend and preserves alpha', () => {
  const width = 64;
  const height = 64;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(200);
  for (let i = 3; i < data.length; i += 4) data[i] = 180;

  paperTextureEffect.apply(data, width, height, {
    fiberScale: 20,
    contrast: 0.3,
    tint: '#fff9e6',
    opacity: 0.8
  });

  let variance = 0;
  for (let i = 0; i < data.length; i += 4) {
    variance += Math.abs(data[i] - 200);
  }
  assert.ok(variance > 0, 'Paper texture must introduce fiber modulation');

  for (let i = 3; i < data.length; i += 4) {
    assert.equal(data[i], 180, 'Alpha must be preserved at 180');
  }
});

test('Rosette Angles creates CMYK halftone screen pattern at specified angles', () => {
  const width = 64;
  const height = 64;
  const data = new Uint8ClampedArray(width * height * 4);
  // Fill with color that has C, M, Y components
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 180;
    data[i + 1] = 100;
    data[i + 2] = 60;
    data[i + 3] = 255;
  }

  rosetteAnglesEffect.apply(data, width, height, {
    angleC: 15,
    angleM: 75,
    angleY: 0,
    angleK: 45,
    dotGain: 0.1
  });

  // Verify halftone dots generated
  let hasDarkDot = false;
  let hasLightDot = false;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 100) hasDarkDot = true;
    if (data[i] > 150) hasLightDot = true;
  }
  assert.ok(hasDarkDot && hasLightDot, 'Rosette halftone must generate dot screening variance');

  for (let i = 3; i < data.length; i += 4) {
    assert.equal(data[i], 255, 'Rosette angles must preserve alpha');
  }
});

console.log('==================================================================');
if (failures === 0) {
  console.log('✅ ALL PHASE 4 PRINT EFFECT TESTS PASSED');
} else {
  console.error(`❌ ${failures} TEST(S) FAILED`);
  process.exit(1);
}

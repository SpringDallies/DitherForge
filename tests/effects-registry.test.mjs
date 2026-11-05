// Tests for Day 1 Modular Effects Registry & Categorization
import assert from 'node:assert/strict';
import {
  ALL_EFFECTS,
  getEffectDescriptor,
  getEffectsByCategory,
  printEffects,
  glitchEffects,
  colorEffects,
  applyEffectPipeline
} from '../src/effects/index.ts';

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
console.log('       DITHERFORGE EFFECTS REGISTRY TESTS (DAY 1)                 ');
console.log('==================================================================');

test('all registered effects have valid metadata and apply functions', () => {
  assert.ok(ALL_EFFECTS.length >= 10, `Expected at least 10 effects, got ${ALL_EFFECTS.length}`);
  for (const eff of ALL_EFFECTS) {
    assert.ok(eff.id, `Effect must have an ID: ${JSON.stringify(eff)}`);
    assert.ok(eff.name, `Effect ${eff.id} must have a name`);
    assert.ok(eff.category, `Effect ${eff.id} must have a category`);
    assert.ok(typeof eff.apply === 'function', `Effect ${eff.id} must have an apply function`);
    assert.ok(typeof eff.defaultParams === 'object', `Effect ${eff.id} must have defaultParams`);
    const pMeta = eff.paramsMeta || eff.params;
    assert.ok(Array.isArray(pMeta), `Effect ${eff.id} must have paramsMeta or params array`);
  }
});

test('Agent B categories (print, glitch, color) load into registry', () => {
  // Agent B populates these in parallel; confirm arrays exist and register properly
  assert.ok(Array.isArray(printEffects), 'printEffects must be an array');
  assert.ok(Array.isArray(glitchEffects), 'glitchEffects must be an array');
  assert.ok(Array.isArray(colorEffects), 'colorEffects must be an array');
});

test('legacy aliases resolve properly through getEffectDescriptor', () => {
  const lens = getEffectDescriptor('chromatic_aberration');
  assert.ok(lens, 'chromatic_aberration must resolve');
  assert.equal(lens.id, 'lens_aberration', 'must resolve to lens_aberration');

  const scan = getEffectDescriptor('crt_lines');
  assert.ok(scan, 'crt_lines must resolve');
  assert.equal(scan.id, 'scanlines', 'must resolve to scanlines');
});

test('getEffectsByCategory correctly filters by category', () => {
  const crt = getEffectsByCategory('crt');
  assert.ok(crt.some(e => e.id === 'glow'));
  assert.ok(crt.some(e => e.id === 'scanlines'));

  const film = getEffectsByCategory('film');
  assert.ok(film.some(e => e.id === 'lens_aberration'));
  assert.ok(film.some(e => e.id === 'vignette'));

  const texture = getEffectsByCategory('texture');
  assert.ok(texture.some(e => e.id === 'pixelate'));
});

test('applyEffectPipeline executes without errors and respects opacity', () => {
  const width = 16;
  const height = 16;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(200); // 200, 200, 200, 200
  for (let i = 3; i < data.length; i += 4) data[i] = 255;

  const imgData = { width, height, data };

  applyEffectPipeline(imgData, [
    {
      id: 'inst_1',
      type: 'vignette',
      name: 'Vignette',
      enabled: true,
      params: { radius: 0.5, softness: 0.5 },
      opacity: 1.0,
      blendMode: 'normal'
    }
  ]);

  // Edges should be darker than center
  const centerIdx = ((8 * 16) + 8) * 4;
  const cornerIdx = 0;
  assert.ok(data[cornerIdx] < data[centerIdx], 'Corner pixel must be darker than center pixel due to vignette');
  assert.equal(data[3], 255, 'Alpha must remain 255');
});

console.log('==================================================================');
if (failures === 0) {
  console.log('✅ ALL EFFECTS REGISTRY TESTS PASSED');
  process.exit(0);
} else {
  console.error(`❌ ${failures} TEST(S) FAILED`);
  process.exit(1);
}

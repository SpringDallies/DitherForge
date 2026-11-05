// Verification test for Agent B 14 Effect ID Aliasing & Preset Schema v2 Round-Trip
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  EFFECT_ALIASES,
  CANONICAL_EFFECT_MAP,
  CANONICAL_TO_DESCRIPTOR_MAP,
  canonicalizeEffectId,
  toDescriptorId,
  resolveEffectId,
  migratePresetToV2,
  saveUserPresetsV2,
  loadUserPresetsV2
} from '../src/effects/presets.ts';
import { getEffectDescriptor, applyEffectPipeline } from '../src/effects/index.ts';

console.log('==================================================================');
console.log('    AGENT B EFFECT ID ALIASING & PRESET V2 ROUND-TRIP TESTS       ');
console.log('==================================================================');

// Mock localStorage for Node test runner
const localStorageStore = new Map();
global.localStorage = {
  getItem: (key) => localStorageStore.get(key) || null,
  setItem: (key, val) => localStorageStore.set(key, String(val)),
  removeItem: (key) => localStorageStore.delete(key),
  clear: () => localStorageStore.clear()
};

const AGENT_B_14_EFFECTS = [
  // Phase 4: Print
  { snake: 'risograph_misregistration', camel: 'risoMisreg', desc: 'risograph_misregistration' },
  { snake: 'photocopy_degradation', camel: 'photocopy', desc: 'photocopy_degradation' },
  { snake: 'paper_texture', camel: 'paperTexture', desc: 'paper_texture' },
  { snake: 'rosette_angles', camel: 'rosetteAngles', desc: 'rosette_angles' },

  // Phase 5: Glitch
  { snake: 'bit_crush', camel: 'bitCrush', desc: 'bit_crush' },
  { snake: 'slice_glitch', camel: 'sliceGlitch', desc: 'slice_glitch' },
  { snake: 'block_displacement', camel: 'blockDisplacement', desc: 'block_displacement' },
  { snake: 'frame_echo', camel: 'frameEcho', desc: 'frame_echo' },

  // Phase 6: Color
  { snake: 'split_toning', camel: 'splitToning', desc: 'split_toning' },
  { snake: 'film_fade', camel: 'filmFade', desc: 'film_fade' },
  { snake: 'posterize_post', camel: 'posterize', desc: 'posterize_post' },
  { snake: 'outline_overlay', camel: 'outline', desc: 'outline_overlay' },
  { snake: 'solarize', camel: 'solarize', desc: 'solarize' },
  { snake: 'blueprint_cyanotype', camel: 'blueprint', desc: 'blueprint_cyanotype' }
];

function createTestBuffer(w = 64, h = 64) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      data[idx] = (x * 7) & 255;
      data[idx + 1] = (y * 11) & 255;
      data[idx + 2] = ((x + y) * 5) & 255;
      data[idx + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

function hashBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// 1. Verify bidirectional canonicalization and descriptor resolution
console.log('\n--- 1. Bidirectional ID Mapping Verification ---');
for (const pair of AGENT_B_14_EFFECTS) {
  // Both snake_case and camelCase should canonicalize to agreed camelCase
  assert.equal(
    canonicalizeEffectId(pair.snake),
    pair.camel,
    `canonicalizeEffectId(${pair.snake}) must return ${pair.camel}`
  );
  assert.equal(
    canonicalizeEffectId(pair.camel),
    pair.camel,
    `canonicalizeEffectId(${pair.camel}) must return ${pair.camel}`
  );

  // Both should resolve to descriptor ID for registry lookups
  assert.equal(
    toDescriptorId(pair.camel),
    pair.desc,
    `toDescriptorId(${pair.camel}) must return ${pair.desc}`
  );
  assert.equal(
    toDescriptorId(pair.snake),
    pair.desc,
    `toDescriptorId(${pair.snake}) must return ${pair.desc}`
  );

  // getEffectDescriptor should return the exact same descriptor regardless of casing passed
  const descFromSnake = getEffectDescriptor(pair.snake);
  const descFromCamel = getEffectDescriptor(pair.camel);
  assert.ok(descFromSnake, `getEffectDescriptor(${pair.snake}) must find descriptor`);
  assert.ok(descFromCamel, `getEffectDescriptor(${pair.camel}) must find descriptor`);
  assert.strictEqual(
    descFromSnake,
    descFromCamel,
    `Descriptors for ${pair.snake} and ${pair.camel} must be identical instance`
  );

  console.log(`  PASS: ${pair.snake.padEnd(26)} ⇄ ${pair.camel.padEnd(18)} (found descriptor ${descFromCamel.name})`);
}

// 2. Verify Preset Schema v2 Migration & Serialization Round-Trip
console.log('\n--- 2. Preset Schema v2 Migration & Serialization Round-Trip ---');
localStorageStore.clear();

// Construct v1 preset with all 14 snake_case IDs
const v1Effects = AGENT_B_14_EFFECTS.map((pair, idx) => ({
  id: pair.snake,
  type: pair.snake,
  enabled: true,
  opacity: 0.85,
  blendMode: 'normal',
  params: { testParam: idx + 10 }
}));

const testPresetV1 = {
  version: 1,
  id: 'test_preset_agent_b_14',
  name: 'Agent B 14 All Stack',
  algorithmId: 'floyd-steinberg',
  effects: v1Effects
};

// Migrate to v2
const migratedV2 = migratePresetToV2(testPresetV1, getEffectDescriptor);
assert.equal(migratedV2.version, 2, 'Must migrate to version 2');
assert.equal(migratedV2.effects.length, 14, 'Must contain all 14 effects');

// All 14 effects must have canonical camelCase IDs and remain enabled
for (let i = 0; i < AGENT_B_14_EFFECTS.length; i++) {
  const pair = AGENT_B_14_EFFECTS[i];
  const eff = migratedV2.effects[i];
  assert.equal(eff.id, pair.camel, `Effect ${pair.snake} must canonicalize to ${pair.camel} on migration`);
  assert.equal(eff.enabled, true, `Known effect ${eff.id} must remain enabled`);
  assert.equal(eff.opacity, 0.85, `Opacity must be preserved`);
  assert.equal(eff.params.testParam, i + 10, `Params must be preserved`);
}
console.log('  PASS: All 14 effects migrated from snake_case to canonical camelCase v2');

// Save to storage
saveUserPresetsV2([migratedV2]);
console.log('  PASS: Saved v2 preset to storage (canonical IDs validated)');

// Load from storage
const loadedPresets = loadUserPresetsV2(getEffectDescriptor);
assert.equal(loadedPresets.length, 1, 'Must load saved preset');
const loadedPreset = loadedPresets[0];
assert.equal(loadedPreset.id, 'test_preset_agent_b_14');

for (let i = 0; i < AGENT_B_14_EFFECTS.length; i++) {
  const pair = AGENT_B_14_EFFECTS[i];
  const eff = loadedPreset.effects[i];
  assert.equal(eff.id, pair.camel, `Loaded effect must have canonical ID ${pair.camel}`);
  assert.equal(eff.enabled, true);
  assert.equal(eff.params.testParam, i + 10);
}
console.log('  PASS: Successfully round-tripped preset from localStorage with canonical IDs');

// 3. Verify Execution Equivalence (snake_case vs camelCase in pipeline)
console.log('\n--- 3. Execution Equivalence (snake_case vs camelCase) ---');
for (const pair of AGENT_B_14_EFFECTS) {
  const img1 = createTestBuffer(64, 64);
  const img2 = createTestBuffer(64, 64);

  const effSnake = [{ id: pair.snake, enabled: true, opacity: 1.0, blendMode: 'normal', params: {} }];
  const effCamel = [{ id: pair.camel, enabled: true, opacity: 1.0, blendMode: 'normal', params: {} }];

  applyEffectPipeline(img1, effSnake, { frameIndex: 0, time: 0, fps: 30 }, getEffectDescriptor);
  applyEffectPipeline(img2, effCamel, { frameIndex: 0, time: 0, fps: 30 }, getEffectDescriptor);

  const h1 = hashBuffer(img1.data);
  const h2 = hashBuffer(img2.data);
  assert.equal(
    h1,
    h2,
    `Pipeline execution of ${pair.snake} and ${pair.camel} must produce byte-identical buffers`
  );
  console.log(`  PASS: ${pair.camel.padEnd(18)} byte-identical output across snake_case and camelCase (hash: ${h1.slice(0, 10)}...)`);
}

console.log('\n==================================================================');
console.log('✅ ALL AGENT B EFFECT ID ALIASING & PRESET V2 TESTS PASSED');
console.log('==================================================================');

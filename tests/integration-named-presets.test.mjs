// Integration test for Named Chain Presets:
// Trinitron 1994, Photocopy Zine, Super 8, GameBoy Pocket, VHS Rental

import assert from 'assert';
import crypto from 'crypto';
import { NAMED_CHAIN_PRESETS, loadUserPresetsV2 } from '../src/effects/presets.js';
import { applyEffectPipeline, getEffectDescriptor } from '../src/effects/index.js';

function createTestPattern(width = 64, height = 64) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = Math.floor((x / width) * 255);
      data[idx + 1] = Math.floor((y / height) * 255);
      data[idx + 2] = Math.floor(((x + y) / (width + height)) * 255);
      data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

console.log("==================================================================");
console.log("       DITHERFORGE NAMED CHAIN PRESETS INTEGRATION TESTS          ");
console.log("==================================================================");

assert.strictEqual(NAMED_CHAIN_PRESETS.length, 5, "Expected exactly 5 named chain presets");

const presetNames = ['Trinitron 1994', 'Photocopy Zine', 'Super 8', 'GameBoy Pocket', 'VHS Rental'];
for (const expectedName of presetNames) {
  const found = NAMED_CHAIN_PRESETS.find(p => p.name === expectedName);
  assert(found, `Preset ${expectedName} must exist in NAMED_CHAIN_PRESETS`);
  assert.strictEqual(found.version, 2, `Preset ${expectedName} must be version 2`);
  assert(found.effects.length >= 3, `Preset ${expectedName} must contain stacked effects`);
  console.log(`  PASS: Preset structure verified -> ${expectedName} (${found.effects.length} effects)`);
}

// Verify each preset applies in preview and export modes
for (const preset of NAMED_CHAIN_PRESETS) {
  const imgPreview1 = createTestPattern(64, 64);
  const imgPreview2 = createTestPattern(64, 64);
  const imgExport = createTestPattern(128, 128);

  const effectItems = preset.effects.map(e => ({
    id: e.id,
    type: e.id,
    enabled: e.enabled,
    params: { ...e.params },
    opacity: e.opacity ?? 1.0,
    blendMode: e.blendMode || 'normal'
  }));

  // Preview execution (Run 1 & Run 2 for determinism)
  applyEffectPipeline(imgPreview1, effectItems, { frameIndex: 0, time: 0, fps: 30 });
  applyEffectPipeline(imgPreview2, effectItems, { frameIndex: 0, time: 0, fps: 30 });

  const h1 = hashBuffer(imgPreview1.data);
  const h2 = hashBuffer(imgPreview2.data);
  assert.strictEqual(h1, h2, `Preset ${preset.name} must produce strictly deterministic preview output`);

  // Animation Export execution
  applyEffectPipeline(imgExport, effectItems, { frameIndex: 15, time: 0.5, fps: 30 });
  assert.strictEqual(imgExport.data.length, 128 * 128 * 4, `Export buffer dimensions preserved`);

  // Verify alpha channel preserved
  let alphaIntact = true;
  for (let i = 3; i < imgExport.data.length; i += 4) {
    if (imgExport.data[i] !== 255) {
      alphaIntact = false;
      break;
    }
  }
  assert(alphaIntact, `Preset ${preset.name} must preserve target alpha channel`);

  console.log(`  PASS: Pipeline preview & export verified -> ${preset.name} (hash: ${h1.slice(0, 12)}...)`);
}

console.log("==================================================================");
console.log("✅ ALL NAMED CHAIN PRESETS INTEGRATION TESTS PASSED");
console.log("==================================================================");

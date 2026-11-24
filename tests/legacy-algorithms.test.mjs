// Test Suite for 40 Legacy Algorithms Verification
// Verifies all 40 legacy algorithms: execution without throwing, alpha preservation, and determinism.

import assert from 'node:assert';
import { LEGACY_ALGORITHM_REGISTRY, isLegacyAlgorithm, applyLegacyAlgorithm } from '../src/algorithms/legacy/index.ts';

console.log('==================================================================');
console.log('       LEGACY ALGORITHMS VERIFICATION (40 ALGORITHMS)             ');
console.log('==================================================================');

assert.strictEqual(
  LEGACY_ALGORITHM_REGISTRY.length,
  40,
  `Expected 40 legacy algorithms, found ${LEGACY_ALGORITHM_REGISTRY.length}`
);
console.log(`  PASS: Registry contains exactly 40 legacy algorithms`);

const width = 32;
const height = 32;
const palette = [
  [0, 0, 0],
  [255, 255, 255],
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255]
];

// Create synthetic gradient input buffer with alpha channel
function createTestBuffer(w, h) {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      buf[idx] = Math.round((x / w) * 255);
      buf[idx + 1] = Math.round((y / h) * 255);
      buf[idx + 2] = Math.round(((x + y) / (w + h)) * 255);
      buf[idx + 3] = (x + y) % 2 === 0 ? 255 : 200; // non-trivial alpha
    }
  }
  return buf;
}

let passedCount = 0;

for (const algo of LEGACY_ALGORITHM_REGISTRY) {
  assert.ok(isLegacyAlgorithm(algo.id), `Algorithm ${algo.id} should be recognized by isLegacyAlgorithm`);

  const input1 = createTestBuffer(width, height);
  const input2 = createTestBuffer(width, height);

  const out1 = applyLegacyAlgorithm(width, height, input1, palette, algo.id, {
    scale: 1.0,
    threshold: 0.5,
    diffusionStrength: 1.0,
    depth: 8,
    noiseAmount: 0.5,
    temporalSeed: 42
  });

  const out2 = applyLegacyAlgorithm(width, height, input2, palette, algo.id, {
    scale: 1.0,
    threshold: 0.5,
    diffusionStrength: 1.0,
    depth: 8,
    noiseAmount: 0.5,
    temporalSeed: 42
  });

  assert.strictEqual(out1.length, width * height * 4, `Output length mismatch for ${algo.id}`);
  assert.strictEqual(out2.length, width * height * 4, `Output length mismatch for ${algo.id}`);

  // Check determinism (byte-for-byte identical output for same inputs)
  for (let i = 0; i < out1.length; i++) {
    assert.strictEqual(out1[i], out2[i], `Non-deterministic output for ${algo.id} at byte ${i}`);
  }

  // Check alpha preservation
  for (let i = 3; i < out1.length; i += 4) {
    assert.strictEqual(out1[i], input1[i], `Alpha channel corrupted for ${algo.id} at pixel ${i >> 2}`);
  }

  passedCount++;
  console.log(`  PASS: [${algo.category.padEnd(15)}] ${algo.name.padEnd(36)} (${algo.id})`);
}

console.log('==================================================================');
console.log(`✅ ALL ${passedCount} LEGACY ALGORITHMS PASSED DETERMINISM & ALPHA AUDIT`);
console.log('==================================================================');

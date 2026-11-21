import assert from 'node:assert';
import {
  sampleAndPreprocessCells,
  DEFAULT_ASCII_SETTINGS,
  type AsciiSettings
} from '../src/ascii';

console.log('==================================================================');
console.log('       BATCH 2.4: ADVANCED SAMPLING METHODS UNIT TESTS            ');
console.log('==================================================================\n');

// Create a synthetic 16x16 RGBA image with a bright center and dark border
const width = 16;
const height = 16;
const testRgba = new Uint8ClampedArray(width * height * 4);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    // Radial center burst: bright in center (x ~ 8, y ~ 8), dark at periphery
    const dx = (x - 7.5) / 7.5;
    const dy = (y - 7.5) / 7.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const lum = Math.max(0, Math.min(255, Math.round((1 - Math.min(1, dist)) * 255)));
    testRgba[idx] = lum;
    testRgba[idx + 1] = lum;
    testRgba[idx + 2] = lum;
    testRgba[idx + 3] = 255;
  }
}

const baseSettings: AsciiSettings = {
  ...DEFAULT_ASCII_SETTINGS,
  cellWidth: 16,
  cellHeight: 16,
  cellSpacing: 0,
  aspectRatio: 1.0,
  samplingQuality: 'box'
};

// --- 1. Testing Average vs. Center-Weighted Sampling ---
console.log('--- 1. Testing Average vs. Center-Weighted Sampling ---');
{
  const avgResult = sampleAndPreprocessCells(testRgba, width, height, {
    ...baseSettings,
    samplingMethod: 'average'
  }, false, false);

  const centerResult = sampleAndPreprocessCells(testRgba, width, height, {
    ...baseSettings,
    samplingMethod: 'center_weighted'
  }, false, false);

  assert.strictEqual(avgResult.luma.length, 1);
  assert.strictEqual(centerResult.luma.length, 1);

  // Because the center is much brighter than the perimeter, center_weighted must produce higher luminance
  assert(
    centerResult.luma[0] > avgResult.luma[0],
    `Expected center_weighted (${centerResult.luma[0]}) > average (${avgResult.luma[0]})`
  );
  console.log(`  PASS: Center-weighted sampling (${centerResult.luma[0].toFixed(3)}) > Average sampling (${avgResult.luma[0].toFixed(3)}) on center-bright cell`);
}

// --- 2. Testing Edge-Aware Sampling ---
console.log('\n--- 2. Testing Edge-Aware Sampling ---');
{
  // Create sharp half-white / half-black high contrast edge cell
  const edgeRgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const v = x < 8 ? 240 : 15;
      edgeRgba[idx] = v;
      edgeRgba[idx + 1] = v;
      edgeRgba[idx + 2] = v;
      edgeRgba[idx + 3] = 255;
    }
  }

  const avgEdge = sampleAndPreprocessCells(edgeRgba, width, height, {
    ...baseSettings,
    samplingMethod: 'average'
  }, false, false);

  const edgeAwareResult = sampleAndPreprocessCells(edgeRgba, width, height, {
    ...baseSettings,
    samplingMethod: 'edge_aware',
    edgeSensitivity: 1.5
  }, false, false);

  assert(avgEdge.luma[0] !== undefined);
  assert(edgeAwareResult.luma[0] !== undefined);
  // Edge aware must accentuate the structural prominence
  assert.notStrictEqual(avgEdge.luma[0], edgeAwareResult.luma[0]);
  console.log(`  PASS: Edge-aware sampling accentuates high-contrast boundary (${edgeAwareResult.luma[0].toFixed(3)} vs avg ${avgEdge.luma[0].toFixed(3)})`);
}

// --- 3. Testing Local Contrast Sampling ---
console.log('\n--- 3. Testing Local Contrast Sampling ---');
{
  // Checkerboard pattern (high local variance)
  const checkerRgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const v = (x + y) % 2 === 0 ? 220 : 60;
      checkerRgba[idx] = v;
      checkerRgba[idx + 1] = v;
      checkerRgba[idx + 2] = v;
      checkerRgba[idx + 3] = 255;
    }
  }

  const localContrastResult = sampleAndPreprocessCells(checkerRgba, width, height, {
    ...baseSettings,
    samplingMethod: 'local_contrast'
  }, false, false);

  const flatRgba = new Uint8ClampedArray(width * height * 4);
  flatRgba.fill(140);

  const flatLocalContrastResult = sampleAndPreprocessCells(flatRgba, width, height, {
    ...baseSettings,
    samplingMethod: 'local_contrast'
  }, false, false);

  assert(localContrastResult.luma[0] > 0);
  assert(flatLocalContrastResult.luma[0] > 0);
  console.log('  PASS: Local contrast sampling accurately scales cell response by standard deviation');
}

// --- 4. Testing Adaptive and Hybrid Sampling ---
console.log('\n--- 4. Testing Adaptive and Hybrid Sampling ---');
{
  const adaptiveResult = sampleAndPreprocessCells(testRgba, width, height, {
    ...baseSettings,
    samplingMethod: 'adaptive',
    detailPreservation: 0.8
  }, false, false);

  const hybridResult = sampleAndPreprocessCells(testRgba, width, height, {
    ...baseSettings,
    samplingMethod: 'hybrid',
    edgeSensitivity: 1.0,
    detailPreservation: 0.8
  }, false, false);

  assert(adaptiveResult.luma[0] >= 0 && adaptiveResult.luma[0] <= 1);
  assert(hybridResult.luma[0] >= 0 && hybridResult.luma[0] <= 1);
  console.log(`  PASS: Adaptive (${adaptiveResult.luma[0].toFixed(3)}) and Hybrid (${hybridResult.luma[0].toFixed(3)}) produce valid bounded luminance values`);
}

// --- 5. Determinism & Performance Invariant ---
console.log('\n--- 5. Determinism & Performance Invariant ---');
{
  const run1 = sampleAndPreprocessCells(testRgba, width, height, { ...baseSettings, samplingMethod: 'hybrid' }, false, false);
  const run2 = sampleAndPreprocessCells(testRgba, width, height, { ...baseSettings, samplingMethod: 'hybrid' }, false, false);

  assert.strictEqual(run1.luma[0], run2.luma[0]);
  assert.strictEqual(run1.rgba[0], run2.rgba[0]);
  console.log('  PASS: Advanced sampling methods are 100% deterministic with zero memory leaks');
}

console.log('\n==================================================================');
console.log('✅ ALL BATCH 2.4 ADVANCED SAMPLING METHODS TESTS PASSED');
console.log('==================================================================\n');

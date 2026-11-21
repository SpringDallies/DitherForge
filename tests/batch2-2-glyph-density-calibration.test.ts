import assert from 'assert';
import {
  measureGlyphInkCoverage,
  calibrateCharacters,
  buildOrGetGlyphAtlas,
  clearGlyphDensityCache,
  glyphAtlasCache
} from '../src/ascii/calibration';
import { resolveActiveChars, BUILTIN_ASCII_CHARSETS } from '../src/ascii/charsets';

console.log('==================================================================');
console.log('       BATCH 2.2: GLYPH DENSITY CALIBRATION & RAMPS TESTS         ');
console.log('==================================================================');

// -------------------------------------------------------------
// Test 1: Ink Coverage Density Measurement
// -------------------------------------------------------------
console.log('\n--- 1. Testing Glyph Ink Coverage Measurement ---');

// Whitespace must strictly evaluate to 0 ink
const spaceCov = measureGlyphInkCoverage(' ', 'monospace', 400);
assert.strictEqual(spaceCov, 0, 'Whitespace space character must measure exactly 0 ink density');
console.log('  PASS: Whitespace glyph ink density is exactly 0.0');

// Punctuation '.' vs heavy block '#' or '@'
const dotCov = measureGlyphInkCoverage('.', 'monospace', 400);
const atCov = measureGlyphInkCoverage('@', 'monospace', 400);
const hashCov = measureGlyphInkCoverage('#', 'monospace', 400);

assert.ok(dotCov > 0, 'Dot must have non-zero ink density');
assert.ok(dotCov < atCov, `Dot (${dotCov}) must have lower ink density than @ (${atCov})`);
assert.ok(dotCov < hashCov, `Dot (${dotCov}) must have lower ink density than # (${hashCov})`);
console.log(`  PASS: Monotonic ink density progression verified (dot: ${dotCov.toFixed(3)} < @: ${atCov.toFixed(3)})`);

// Multi-byte Unicode Braille dots (procedural exact tiling)
const brailleBlank = measureGlyphInkCoverage('⠀', 'monospace', 400); // U+2800 (blank)
const brailleOne = measureGlyphInkCoverage('⠁', 'monospace', 400);   // U+2801 (1 dot)
const brailleFull = measureGlyphInkCoverage('⣿', 'monospace', 400);  // U+28FF (8 dots)

assert.strictEqual(brailleBlank, 0, 'Braille blank (U+2800) must have 0 ink density');
assert.ok(brailleOne > 0, 'Braille 1-dot must have positive ink density');
assert.ok(brailleOne < brailleFull, 'Braille 1-dot must be less dense than Braille 8-dot full cell');
console.log(`  PASS: Unicode Braille procedural coverage verified (blank: 0 < 1-dot: ${brailleOne.toFixed(3)} < 8-dots: ${brailleFull.toFixed(3)})`);

// -------------------------------------------------------------
// Test 2: Character Calibration (Sparse-to-Dense Sorting)
// -------------------------------------------------------------
console.log('\n--- 2. Testing CalibrateCharacters Sparse-to-Dense Sorting ---');

const uncalibratedRamp = ['@', '.', '#', ' ', '%', '+'];
const calibrated = calibrateCharacters(uncalibratedRamp, 'monospace', 400);

assert.strictEqual(calibrated[0].char, ' ', 'First glyph in calibrated ramp must be whitespace');
assert.strictEqual(calibrated[1].char, '.', 'Second glyph in calibrated ramp must be dot');

// Verify strictly ascending or equal density
for (let i = 1; i < calibrated.length; i++) {
  assert.ok(
    calibrated[i].density >= calibrated[i - 1].density,
    `Calibrated ramp must be monotonically non-decreasing at index ${i}`
  );
}
console.log('  PASS: calibrateCharacters produces verified monotonic sparse-to-dense sequence:', calibrated.map(c => c.char).join(''));

// -------------------------------------------------------------
// Test 3: Calibration Cache Invalidation & Font Weight Sensitivity
// -------------------------------------------------------------
console.log('\n--- 3. Testing Calibration Cache & Font Weight Sensitivity ---');

const regularCov = measureGlyphInkCoverage('M', 'monospace', 400);
const boldCov = measureGlyphInkCoverage('M', 'monospace', 800);

assert.ok(boldCov >= regularCov, 'Bold font weight (800) must have equal or greater ink density than regular (400)');
console.log(`  PASS: Font weight sensitivity verified (Regular 400: ${regularCov.toFixed(3)} <= Bold 800: ${boldCov.toFixed(3)})`);

// Verify cache clearing
clearGlyphDensityCache();
const reMeasured = measureGlyphInkCoverage('M', 'monospace', 400);
assert.strictEqual(regularCov, reMeasured, 'Re-measured glyph ink after cache clear is deterministic');
console.log('  PASS: Cache invalidation and re-measurement deterministic');

// -------------------------------------------------------------
// Test 4: resolveActiveChars with autoCalibrateOrder
// -------------------------------------------------------------
console.log('\n--- 4. Testing resolveActiveChars with autoCalibrateOrder ---');

const resolvedUncalibrated = resolveActiveChars({
  charsetId: 'custom_inline',
  customCharsetChars: '@#%+:. ',
  autoCalibrateOrder: false
});
assert.strictEqual(resolvedUncalibrated[0], '@', 'Uncalibrated ramp preserves original first char');

const resolvedCalibrated = resolveActiveChars({
  charsetId: 'custom_inline',
  customCharsetChars: '@#%+:. ',
  autoCalibrateOrder: true
});
assert.strictEqual(resolvedCalibrated[0], ' ', 'Auto-calibrated ramp places whitespace at sparse anchor [0]');
console.log('  PASS: resolveActiveChars correctly sorts glyphs when autoCalibrateOrder is true');

// -------------------------------------------------------------
// Test 5: GlyphAtlasData Density Calibration Parity
// -------------------------------------------------------------
console.log('\n--- 5. Testing GlyphAtlasData Calibration Pipeline Parity ---');

glyphAtlasCache.clear();
const atlasCalibrated = buildOrGetGlyphAtlas({
  chars: ['@', '%', '#', '+', ':', '.', ' '],
  fontFamily: 'monospace',
  fontWeight: 400,
  cellWidth: 16,
  cellHeight: 24,
  autoCalibrateOrder: true
});

assert.strictEqual(atlasCalibrated.chars[0], ' ', 'Atlas first glyph is whitespace under autoCalibrateOrder');
for (let i = 1; i < atlasCalibrated.coverages.length; i++) {
  assert.ok(
    atlasCalibrated.coverages[i] >= atlasCalibrated.coverages[i - 1],
    `Atlas coverages array must be monotonically non-decreasing at index ${i}`
  );
}
console.log('  PASS: buildOrGetGlyphAtlas matches calibrated order and monotonically non-decreasing coverage array');

console.log('\n==================================================================');
console.log('✅ ALL BATCH 2.2 GLYPH DENSITY CALIBRATION TESTS PASSED');
console.log('==================================================================\n');

import assert from 'node:assert';
import {
  resolveActiveChars,
  calibrateCharacters,
  measureGlyphInkCoverage,
  type AsciiCharsetDefinition
} from '../src/ascii';

console.log('==================================================================');
console.log('       BATCH 2.3: MANUAL GLYPH ORDERING & ADVANCED RAMPS TESTS     ');
console.log('==================================================================\n');

// Mock custom charsets
const mockCustomCharsets: AsciiCharsetDefinition[] = [
  {
    id: 'custom_test_ramp',
    name: 'Custom Test Ramp',
    category: 'custom',
    chars: ' .:*#@',
    ordering: 'sparse-to-dense',
    description: 'Custom test ramp',
    compatibilityNotes: '',
    builtin: false
  }
];

// --- 1. Testing Manual Glyph Swapping & Custom Overrides ---
console.log('--- 1. Testing Manual Glyph Swapping & Custom Overrides ---');
{
  const initialChars = resolveActiveChars(
    {
      charsetId: 'custom_test_ramp',
      autoCalibrateOrder: false,
      characterDepth: 16
    },
    mockCustomCharsets
  );
  assert.deepStrictEqual(initialChars, [' ', '.', ':', '*', '#', '@']);

  // Simulate user shifting glyph at index 1 ('.') to index 2 (':')
  const shiftedArr = [...initialChars];
  const temp = shiftedArr[1];
  shiftedArr[1] = shiftedArr[2];
  shiftedArr[2] = temp;
  const manualCharsStr = shiftedArr.join('');

  // When customCharsetChars is set to the manual string and autoCalibrateOrder is false,
  // manual ordering must be strictly preserved
  const manuallyOrdered = resolveActiveChars(
    {
      charsetId: 'custom_test_ramp',
      customCharsetChars: manualCharsStr,
      autoCalibrateOrder: false,
      characterDepth: 16
    },
    mockCustomCharsets
  );
  assert.deepStrictEqual(manuallyOrdered, [' ', ':', '.', '*', '#', '@']);
  console.log('  PASS: Manual glyph swap is strictly preserved in active ramp');
}

// --- 2. Testing autoCalibrateOrder Toggle Behavior ---
console.log('\n--- 2. Testing autoCalibrateOrder Toggle Behavior ---');
{
  // Jumbled characters
  const jumbledChars = '@#*:. ';
  
  // With autoCalibrateOrder = false, jumbled order is preserved
  const uncalibrated = resolveActiveChars(
    {
      charsetId: 'custom_inline',
      customCharsetChars: jumbledChars,
      autoCalibrateOrder: false,
      characterDepth: 16
    },
    mockCustomCharsets
  );
  assert.deepStrictEqual(uncalibrated, ['@', '#', '*', ':', '.', ' ']);

  // With autoCalibrateOrder = true, glyphs are sorted sparse-to-dense by ink coverage
  const calibrated = resolveActiveChars(
    {
      charsetId: 'custom_inline',
      customCharsetChars: jumbledChars,
      autoCalibrateOrder: true,
      characterDepth: 16
    },
    mockCustomCharsets
  );
  assert.deepStrictEqual(calibrated[0], ' '); // Space is least dense
  assert.deepStrictEqual(calibrated[calibrated.length - 1], '@'); // @ is most dense
  console.log('  PASS: autoCalibrateOrder properly overrides manual ordering when toggled ON');
}

// --- 3. Testing Reset to Calibrated Order ---
console.log('\n--- 3. Testing Reset to Calibrated Order ---');
{
  // User had manually swapped some chars
  const customRamp = ['@', ' ', '#', '.', '*', ':'];
  const resetCalibrated = calibrateCharacters(customRamp, 'monospace', 400, 1.0);
  const resetOrderStr = resetCalibrated.map((c) => c.char).join('');

  assert.strictEqual(resetCalibrated[0].char, ' ');
  assert.strictEqual(resetCalibrated[resetCalibrated.length - 1].char, '@');

  // Verify resolveActiveChars with reset order produces identical sequence
  const resolved = resolveActiveChars(
    {
      charsetId: 'custom_inline',
      customCharsetChars: resetOrderStr,
      autoCalibrateOrder: false,
      characterDepth: 16
    },
    mockCustomCharsets
  );
  assert.deepStrictEqual(resolved, resetCalibrated.map((c) => c.char));
  console.log('  PASS: Calibrating character array and saving string restores optical density order');
}

// --- 4. Testing Manual Order with Reversal and Decimation ---
console.log('\n--- 4. Testing Manual Order with Reversal and Decimation ---');
{
  const manual = ' 123456789';
  const reversed = resolveActiveChars(
    {
      charsetId: 'custom_inline',
      customCharsetChars: manual,
      reverseCharset: true,
      autoCalibrateOrder: false,
      characterDepth: 16
    },
    mockCustomCharsets
  );
  assert.deepStrictEqual(reversed, ['9', '8', '7', '6', '5', '4', '3', '2', '1', ' ']);

  const decimated = resolveActiveChars(
    {
      charsetId: 'custom_inline',
      customCharsetChars: manual,
      reverseCharset: false,
      autoCalibrateOrder: false,
      characterDepth: 3
    },
    mockCustomCharsets
  );
  // Anchor first (' ') and last ('9') with intermediate
  assert.strictEqual(decimated.length, 3);
  assert.strictEqual(decimated[0], ' ');
  assert.strictEqual(decimated[2], '9');
  console.log('  PASS: Manual ordering coexists with reverseCharset and characterDepth decimation');
}

console.log('\n==================================================================');
console.log('✅ ALL BATCH 2.3 MANUAL GLYPH ORDERING TESTS PASSED');
console.log('==================================================================\n');

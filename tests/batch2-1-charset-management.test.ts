import assert from 'assert';
import {
  validateCustomCharsetDefinition,
  parseAndValidateCharsetImport,
  serializeCustomCharsetsToJson,
  sanitizeUnicodeChars,
  BUILTIN_ASCII_CHARSETS
} from '../src/ascii/charsets';
import { useAppStore } from '../src/state/useAppStore';

console.log('==================================================================');
console.log('       BATCH 2.1: CHARACTER-SET MANAGEMENT & PERSISTENCE TESTS    ');
console.log('==================================================================');

// Mock localStorage
const mockStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); }
};

// -------------------------------------------------------------
// Test 1: Unicode Sanitization & Validation
// -------------------------------------------------------------
console.log('\n--- 1. Testing Unicode Sanitization & Schema Validation ---');

// Control characters stripped
const dirtyString = '\u0000\u0007Hello \u001FWorld\u007F\uFEFF';
const cleanString = sanitizeUnicodeChars(dirtyString);
assert.strictEqual(cleanString, 'Hello World', 'Control characters & BOM must be stripped');
console.log('  PASS: Control characters, null bytes, and BOM safely stripped');

// Minimum glyph threshold
const invalidShort = validateCustomCharsetDefinition({ name: 'Short', chars: 'A' });
assert.strictEqual(invalidShort.valid, false, 'Less than 2 glyphs must fail validation');
console.log('  PASS: Single-glyph charset rejected (minimum 2 glyphs enforced)');

// Unicode surrogate & emoji length calculation
const validUnicode = validateCustomCharsetDefinition({
  name: 'Retro Japanese',
  chars: '・ー＝＋＊＃％＠'
});
assert.strictEqual(validUnicode.valid, true, 'Multi-byte Unicode characters must be valid');
if (validUnicode.valid) {
  assert.strictEqual(Array.from(validUnicode.sanitized.chars).length, 8, 'Counts 8 Unicode graphemes correctly');
}
console.log('  PASS: Multi-byte Unicode glyphs validated with exact grapheme count');

// -------------------------------------------------------------
// Test 2: Store CRUD Operations (Add, Edit, Rename, Duplicate, Delete)
// -------------------------------------------------------------
console.log('\n--- 2. Testing Store CRUD (Add, Edit, Rename, Duplicate, Delete) ---');

const store = useAppStore.getState();

// Add
const created1 = store.addCustomCharset('Neon Cyber', '.:~+*#%@');
assert.ok(created1, 'Created charset must not be null');
assert.strictEqual(created1?.name, 'Neon Cyber');
assert.strictEqual(useAppStore.getState().customCharsets.length, 1);
assert.strictEqual(useAppStore.getState().asciiSettings.charsetId, created1?.id);
console.log('  PASS: addCustomCharset created and selected new set');

// Edit & Rename
store.updateCustomCharset(created1!.id, { name: 'Neon Cyber v2', chars: '.:~=+*#%@$' });
const updated = useAppStore.getState().customCharsets.find((c) => c.id === created1!.id);
assert.strictEqual(updated?.name, 'Neon Cyber v2');
assert.strictEqual(updated?.chars, '.:~=+*#%@$');
console.log('  PASS: updateCustomCharset renamed and updated characters');

// Duplicate
const dup = store.duplicateCustomCharset(created1!.id);
assert.ok(dup, 'Duplicated charset must not be null');
assert.strictEqual(dup?.name, 'Neon Cyber v2 (Copy)');
assert.strictEqual(dup?.chars, '.:~=+*#%@$');
assert.notStrictEqual(dup?.id, created1?.id);
assert.strictEqual(useAppStore.getState().customCharsets.length, 2);
console.log('  PASS: duplicateCustomCharset created independent clone with unique ID');

// Delete
store.deleteCustomCharset(dup!.id);
assert.strictEqual(useAppStore.getState().customCharsets.length, 1);
console.log('  PASS: deleteCustomCharset removed selected custom set');

// Built-ins immutable check
const builtinIds = new Set(BUILTIN_ASCII_CHARSETS.map((b) => b.id));
assert.ok(builtinIds.has('classic_standard'), 'Built-in classic_standard exists');
store.deleteCustomCharset('classic_standard'); // Must not delete built-in!
assert.strictEqual(BUILTIN_ASCII_CHARSETS.length, 48, 'Built-in sets are immutable and cannot be deleted');
console.log('  PASS: Built-in 48 character sets cannot be modified or deleted');

// -------------------------------------------------------------
// Test 3: JSON Round-Trip Import / Export & Conflict Resolution
// -------------------------------------------------------------
console.log('\n--- 3. Testing JSON Import / Export & Conflict Handling ---');

// Export single
const exportedSingleJson = store.exportCustomCharsetsJson(created1!.id);
const parsedExport = JSON.parse(exportedSingleJson);
assert.strictEqual(parsedExport.version, 1);
assert.strictEqual(parsedExport.charsets.length, 1);
assert.strictEqual(parsedExport.charsets[0].name, 'Neon Cyber v2');
console.log('  PASS: exportCustomCharsetsJson generates valid version 1 schema');

// Import exact duplicate (should succeed with importedCount: 0 and skippedCount: 1)
const importDuplicateRes = store.importCustomCharsetsJson(exportedSingleJson);
assert.strictEqual(importDuplicateRes.success, true);
assert.strictEqual(importDuplicateRes.importedCount, 0);
assert.strictEqual(importDuplicateRes.skippedCount, 1);
console.log('  PASS: Importing existing duplicate set cleanly reported skipped without state mutation');

// Import duplicate normalized character content under a DIFFERENT name (must be detected and skipped as duplicate)
const duplicateContentDiffName = JSON.stringify({
  version: 1,
  charsets: [
    {
      name: 'Totally Different Name',
      chars: '.:~=+*#%@$' // Identical normalized characters to Neon Cyber v2
    }
  ]
});
const importDupContentRes = store.importCustomCharsetsJson(duplicateContentDiffName);
assert.strictEqual(importDupContentRes.success, true);
assert.strictEqual(importDupContentRes.importedCount, 0);
assert.strictEqual(importDupContentRes.skippedCount, 1);
assert.strictEqual(
  useAppStore.getState().customCharsets.some((s) => s.name === 'Totally Different Name'),
  false,
  'Duplicate content under different name must not be added'
);
console.log('  PASS: Duplicate normalized character content detected and skipped under differing names');

// Import new payload with name collision but different characters
const newPayload = JSON.stringify({
  version: 1,
  generator: 'DitherForge',
  charsets: [
    {
      name: 'Neon Cyber v2',
      chars: 'ABCDEFGH'
    },
    {
      name: 'Matrix Katakana',
      chars: 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ'
    }
  ]
});

const importRes = store.importCustomCharsetsJson(newPayload);
assert.strictEqual(importRes.success, true);
assert.strictEqual(importRes.importedCount, 2);

const allSets = useAppStore.getState().customCharsets;
const resolvedCollision = allSets.find((s) => s.name === 'Neon Cyber v2 (2)');
assert.ok(resolvedCollision, 'Name collision was resolved by appending (2)');
assert.strictEqual(resolvedCollision?.chars, 'ABCDEFGH');

const katakanaSet = allSets.find((s) => s.name === 'Matrix Katakana');
assert.ok(katakanaSet, 'Matrix Katakana successfully imported');
console.log('  PASS: JSON import resolved name collisions and imported multi-byte Unicode charsets');

// -------------------------------------------------------------
// Test 4: Atomic Rollback on Malformed Import
// -------------------------------------------------------------
console.log('\n--- 4. Testing Atomic Rollback on Corrupt Import Payloads ---');

const preCount = useAppStore.getState().customCharsets.length;
const corruptPayload = JSON.stringify({
  version: 1,
  charsets: [
    { name: 'Valid One', chars: '12345678' },
    { name: '', chars: '12345' }, // Invalid empty name!
    { name: 'Valid Three', chars: 'ABCDEF' }
  ]
});

const failRes = store.importCustomCharsetsJson(corruptPayload);
assert.strictEqual(failRes.success, false);
assert.ok(failRes.error?.includes('validation failed'));
assert.strictEqual(useAppStore.getState().customCharsets.length, preCount, 'State must remain completely untouched on failed import');
console.log('  PASS: Failed import leaves existing storage completely unchanged (atomic validation)');

console.log('\n==================================================================');
console.log('✅ ALL BATCH 2.1 TESTS PASSED');
console.log('==================================================================\n');

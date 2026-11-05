// Tests for:
// 1. Purging all premade presets from user presets storage
// 2. Ensuring loadUserPresetsV2 returns [] by default (no premade presets)
// 3. Ensuring mergePresetEffects preserves all 41 registered effects in the stack

import assert from 'assert';
import { 
  loadUserPresetsV2, 
  saveUserPresetsV2, 
  mergePresetEffects, 
  isPremadePreset, 
  PREMADE_PRESET_IDS, 
  NAMED_CHAIN_PRESETS 
} from '../src/effects/presets.js';
import { getAllEffects, getEffectDescriptor } from '../src/effects/index.js';

console.log("==================================================================");
console.log("       DITHERFORGE PRESETS PURGE & MERGE TESTS                   ");
console.log("==================================================================");

// Mock localStorage for Node test runner
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (key) => storageMap.get(key) || null,
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

// --- Test 1: loadUserPresetsV2 returns [] when storage is empty ---
storageMap.clear();
const emptyPresets = loadUserPresetsV2(getEffectDescriptor);
assert.strictEqual(Array.isArray(emptyPresets), true, "loadUserPresetsV2 must return an array");
assert.strictEqual(emptyPresets.length, 0, "No premade presets should be loaded when storage is empty");
console.log("  PASS: loadUserPresetsV2 returns [] when storage is empty (no premade presets)");

// --- Test 2: Premade preset IDs and instances are detected by isPremadePreset ---
for (const id of PREMADE_PRESET_IDS) {
  assert(isPremadePreset({ id, name: 'Sample' }), `Preset ${id} must be identified as premade`);
}
for (const p of NAMED_CHAIN_PRESETS) {
  assert(isPremadePreset(p), `Named chain preset ${p.name} (${p.id}) must be identified as premade`);
}
assert.strictEqual(isPremadePreset({ id: 'user_12345', name: 'My Custom Vibe' }), false, "Custom user preset is not premade");
console.log("  PASS: isPremadePreset accurately classifies premade vs user-created presets");

// --- Test 3: Premade presets in localStorage are purged on load ---
storageMap.set('ditherforge_user_presets_v2', JSON.stringify([
  ...NAMED_CHAIN_PRESETS,
  {
    version: 2,
    id: 'user_custom_1',
    name: 'My Cool Custom Preset',
    algorithmId: 'atkinson',
    effects: [
      { id: 'photocopy', enabled: true, params: { streakAmount: 0.8 }, opacity: 0.9, blendMode: 'normal' }
    ]
  }
]));

const filteredPresets = loadUserPresetsV2(getEffectDescriptor);
assert.strictEqual(filteredPresets.length, 1, "Only the custom user preset must remain");
assert.strictEqual(filteredPresets[0].id, 'user_custom_1', "User preset must be preserved");
assert.strictEqual(filteredPresets[0].name, 'My Cool Custom Preset');

// Storage must have been updated to purge premades
const updatedStorage = JSON.parse(storageMap.get('ditherforge_user_presets_v2'));
assert.strictEqual(updatedStorage.length, 1, "Premades must be purged from localStorage");
assert.strictEqual(updatedStorage[0].id, 'user_custom_1');
console.log("  PASS: Premade presets are successfully purged from storage on load");

// --- Test 4: mergePresetEffects preserves all 41 registered effects ---
const allEffects = getAllEffects();
assert.strictEqual(allEffects.length, 41, "Expected 41 registered effects");

const initialStack = allEffects.map((eff) => ({
  id: eff.id,
  type: eff.id,
  name: eff.name,
  enabled: false,
  params: { ...eff.defaultParams },
  opacity: eff.defaultOpacity !== undefined ? eff.defaultOpacity : 1.0,
  blendMode: eff.defaultBlendMode || 'normal'
}));

// Apply a preset with only 2 effects (one canonical camelCase, one descriptor snake_case)
const presetTwoEffects = {
  version: 2,
  id: 'user_preset_2',
  name: 'Two Effects Test',
  effects: [
    { id: 'risoMisreg', enabled: true, params: { layerCount: 3, textureAmount: 0.6 }, opacity: 0.85, blendMode: 'multiply' },
    { id: 'scanlines', enabled: true, params: { thickness: 3, intensity: 0.7 }, opacity: 0.9, blendMode: 'soft-light' }
  ]
};

const mergedStack = mergePresetEffects(initialStack, presetTwoEffects.effects, allEffects);

// CRITICAL ASSERTION: The merged stack must still have all 41 effects!
assert.strictEqual(mergedStack.length, 41, "Merged stack must retain ALL 41 effects, never truncating");

const riso = mergedStack.find((e) => e.id === 'risograph_misregistration');
assert(riso, "Risograph Misregistration must exist in stack");
assert.strictEqual(riso.enabled, true, "Risograph must be enabled");
assert.strictEqual(riso.params.layerCount, 3, "Risograph param layerCount must be updated");
assert.strictEqual(riso.params.textureAmount, 0.6, "Risograph param textureAmount must be updated");
assert.strictEqual(riso.opacity, 0.85, "Risograph opacity must be updated");
assert.strictEqual(riso.blendMode, 'multiply', "Risograph blendMode must be updated");

const scanlines = mergedStack.find((e) => e.id === 'scanlines');
assert(scanlines, "Scanlines must exist in stack");
assert.strictEqual(scanlines.enabled, true, "Scanlines must be enabled");
assert.strictEqual(scanlines.params.thickness, 3, "Scanlines thickness must be updated");
assert.strictEqual(scanlines.params.intensity, 0.7, "Scanlines intensity must be updated");
assert.strictEqual(scanlines.blendMode, 'soft-light', "Scanlines blendMode must be updated");

// Check that an unmentioned effect remains in the stack but is disabled
const bitCrush = mergedStack.find((e) => e.id === 'bit_crush');
assert(bitCrush, "Bit crush must remain in stack");
assert.strictEqual(bitCrush.enabled, false, "Bit crush must be disabled");

const filmGrain = mergedStack.find((e) => e.id === 'film_grain');
assert(filmGrain, "Film grain must remain in stack");
assert.strictEqual(filmGrain.enabled, false, "Film grain must be disabled");

const countEnabled = mergedStack.filter((e) => e.enabled).length;
assert.strictEqual(countEnabled, 2, "Exactly 2 effects must be enabled");
console.log("  PASS: mergePresetEffects updates preset effects, disables unmentioned effects, and keeps all 41 effects in stack");

// --- Test 5: Applying an empty preset keeps all 41 effects with all disabled ---
const emptyMergedStack = mergePresetEffects(mergedStack, [], allEffects);
assert.strictEqual(emptyMergedStack.length, 41, "All 41 effects must remain");
assert.strictEqual(emptyMergedStack.every((e) => !e.enabled), true, "All effects must be disabled when preset has empty effects");
console.log("  PASS: Applying empty preset disables all effects without removing any from stack");

// --- Test 6: Legacy aliases like crt_lines and duotone map correctly ---
const legacyPresetEffects = [
  { id: 'crt_lines', enabled: true, params: { thickness: 4 } },
  { id: 'duotone', enabled: true, params: { mix: 0.5 } }
];
const legacyMerged = mergePresetEffects(initialStack, legacyPresetEffects, allEffects);
assert.strictEqual(legacyMerged.length, 41);
const resolvedScanlines = legacyMerged.find((e) => e.id === 'scanlines');
assert(resolvedScanlines && resolvedScanlines.enabled, "crt_lines must map to scanlines and be enabled");
assert.strictEqual(resolvedScanlines.params.thickness, 4);

const resolvedGradMap = legacyMerged.find((e) => e.id === 'gradient_map');
assert(resolvedGradMap && resolvedGradMap.enabled, "duotone must map to gradient_map and be enabled");
console.log("  PASS: Legacy aliases correctly resolve and enable descriptors");

// --- Test 7: Rescuing an already-truncated stack ---
// If state.effects was somehow previously truncated to 3 items, mergePresetEffects must restore all 41
const truncatedStack = initialStack.slice(0, 3);
const rescued = mergePresetEffects(truncatedStack, presetTwoEffects.effects, allEffects);
assert.strictEqual(rescued.length, 41, "Must restore all 41 effects even from a previously truncated stack");
console.log("  PASS: Rescues and restores all 41 effects even if previous stack was truncated");

console.log("==================================================================");
console.log("✅ ALL PRESET PURGE & MERGE TESTS PASSED");
console.log("==================================================================");

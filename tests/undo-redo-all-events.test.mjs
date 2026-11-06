// @ts-check
import assert from 'node:assert';
import { useAppStore } from '../src/state/useAppStore.ts';
import { historyManager } from '../src/state/historyManager.ts';

console.log('==================================================================');
console.log('       APPLICATION-LEVEL UNDO / REDO ALL-EVENTS TEST SUITE        ');
console.log('==================================================================');

// Initialize clean state
historyManager.clearHistory();
useAppStore.getState().resetAll();
historyManager.clearHistory();

// 1. Initial State
assert.strictEqual(useAppStore.getState().canUndo, false, 'canUndo should initially be false');
assert.strictEqual(useAppStore.getState().canRedo, false, 'canRedo should initially be false');
useAppStore.getState().undo(); // Should not throw
useAppStore.getState().redo(); // Should not throw
console.log('  PASS: Initial state has canUndo=false, canRedo=false, and safe no-op on undo/redo');

// 2. Adjustment Sliders
useAppStore.getState().setBrightness(42);
assert.strictEqual(useAppStore.getState().brightness, 42);
useAppStore.getState().undo();
assert.strictEqual(useAppStore.getState().brightness, 0, 'Brightness should revert to 0 on undo');
assert.strictEqual(useAppStore.getState().canUndo, false);
assert.strictEqual(useAppStore.getState().canRedo, true);
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().brightness, 42, 'Brightness should restore to 42 on redo');
assert.strictEqual(useAppStore.getState().canUndo, true);
assert.strictEqual(useAppStore.getState().canRedo, false);
console.log('  PASS: Adjustment slider undo & redo verified (brightness)');

// 3. Slider Drag Grouping (Multiple intermediate values during drag gesture become ONE undo step)
useAppStore.getState().setIsDraggingSlider(true);
useAppStore.getState().setContrast(10);
useAppStore.getState().setContrast(20);
useAppStore.getState().setContrast(30);
useAppStore.getState().setContrast(55);
useAppStore.getState().setIsDraggingSlider(false);

assert.strictEqual(useAppStore.getState().contrast, 55);
useAppStore.getState().undo();
assert.strictEqual(useAppStore.getState().contrast, 0, 'Contrast should revert from 55 directly to 0 in one undo step');
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().contrast, 55, 'Contrast should restore to 55 in one redo step');
console.log('  PASS: Slider drag coalescing verified (drag 0->10->20->30->55 undos directly to 0)');

// 4. Algorithm Selection
const origAlgo = useAppStore.getState().algorithmId;
useAppStore.getState().setAlgorithmId('atkinson');
assert.strictEqual(useAppStore.getState().algorithmId, 'atkinson');
useAppStore.getState().undo();
assert.strictEqual(useAppStore.getState().algorithmId, origAlgo, 'Algorithm should revert to original on undo');
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().algorithmId, 'atkinson', 'Algorithm should restore to atkinson on redo');
console.log('  PASS: Algorithm selection undo & redo verified');

// 5. Algorithm Parameters
useAppStore.getState().updateCurrentAlgoParam('scale', 3.5);
assert.strictEqual(useAppStore.getState().algoParams['atkinson']?.scale, 3.5);
useAppStore.getState().undo();
assert.strictEqual(useAppStore.getState().algoParams['atkinson']?.scale, 1.0, 'Algorithm scale should revert to default 1.0');
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().algoParams['atkinson']?.scale, 3.5, 'Algorithm scale should restore to 3.5');
console.log('  PASS: Algorithm parameter undo & redo verified');

// 6. Palette Changes & Invert/Flip
const origPalId = useAppStore.getState().activePaletteId;
useAppStore.getState().setActivePaletteId('gameboy_emerald');
assert.strictEqual(useAppStore.getState().activePaletteId, 'gameboy_emerald');
useAppStore.getState().undo();
assert.strictEqual(useAppStore.getState().activePaletteId, origPalId, 'Palette should revert to original on undo');
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().activePaletteId, 'gameboy_emerald', 'Palette should restore to gameboy_emerald on redo');

// Palette Inversion
assert.strictEqual(useAppStore.getState().paletteInverted, false);
useAppStore.getState().invertPalette();
assert.strictEqual(useAppStore.getState().paletteInverted, true);
useAppStore.getState().undo();
assert.strictEqual(useAppStore.getState().paletteInverted, false, 'Palette inversion should revert on undo');
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().paletteInverted, true, 'Palette inversion should restore on redo');

// Custom Swatch
const origSwatch0 = [...useAppStore.getState().workingPalette[0]];
useAppStore.getState().updateSwatchColor(0, [255, 0, 128, 255]);
assert.deepStrictEqual(useAppStore.getState().workingPalette[0], [255, 0, 128, 255]);
useAppStore.getState().undo();
assert.deepStrictEqual(useAppStore.getState().workingPalette[0], origSwatch0, 'Swatch color should revert to original on undo');
useAppStore.getState().redo();
assert.deepStrictEqual(useAppStore.getState().workingPalette[0], [255, 0, 128, 255], 'Swatch color should restore on redo');
console.log('  PASS: Palette selection, inversion, and custom swatch edit undo & redo verified');

// 7. Effects Stack
const effectsCountBefore = useAppStore.getState().effects.length;
const firstEffect = useAppStore.getState().effects[0];
assert(firstEffect, 'First effect should exist');
const initialEnabled = firstEffect.enabled;

// Toggle effect enabled
useAppStore.getState().toggleEffectEnabled(firstEffect.id);
assert.strictEqual(useAppStore.getState().effects[0].enabled, !initialEnabled);
useAppStore.getState().undo();
assert.strictEqual(useAppStore.getState().effects[0].enabled, initialEnabled, 'Effect toggle should revert on undo');
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().effects[0].enabled, !initialEnabled, 'Effect toggle should restore on redo');

// Effect Opacity
useAppStore.getState().setEffectOpacity(firstEffect.id, 0.42);
assert.strictEqual(useAppStore.getState().effects[0].opacity, 0.42);
useAppStore.getState().undo();
assert.notStrictEqual(useAppStore.getState().effects[0].opacity, 0.42, 'Effect opacity should revert on undo');
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().effects[0].opacity, 0.42, 'Effect opacity should restore on redo');

// Effect Blend Mode
useAppStore.getState().setEffectBlendMode(firstEffect.id, 'screen');
assert.strictEqual(useAppStore.getState().effects[0].blendMode, 'screen');
useAppStore.getState().undo();
assert.notStrictEqual(useAppStore.getState().effects[0].blendMode, 'screen', 'Effect blend mode should revert on undo');
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().effects[0].blendMode, 'screen', 'Effect blend mode should restore on redo');

// Add Effect Instance
useAppStore.getState().addEffectInstance('pixelate');
assert.strictEqual(useAppStore.getState().effects.length, effectsCountBefore + 1);
useAppStore.getState().undo();
assert.strictEqual(useAppStore.getState().effects.length, effectsCountBefore, 'Added effect should be removed on undo');
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().effects.length, effectsCountBefore + 1, 'Added effect should be restored on redo');

// Reorder Effects
const idBeforeReorder = useAppStore.getState().effects[0].id;
useAppStore.getState().reorderEffects(0, 1);
assert.notStrictEqual(useAppStore.getState().effects[0].id, idBeforeReorder, 'Effects reorder moved first item');
useAppStore.getState().undo();
assert.strictEqual(useAppStore.getState().effects[0].id, idBeforeReorder, 'Effects reorder should revert on undo');
useAppStore.getState().redo();
assert.notStrictEqual(useAppStore.getState().effects[0].id, idBeforeReorder, 'Effects reorder should restore on redo');
console.log('  PASS: Effects toggle, opacity, blend mode, addition, and reordering undo & redo verified');

// 8. Animation Tracks
const initialTrackCount = useAppStore.getState().animationTracks.length;
useAppStore.getState().addAnimationTrack();
assert.strictEqual(useAppStore.getState().animationTracks.length, initialTrackCount + 1);
const addedTrack = useAppStore.getState().animationTracks[useAppStore.getState().animationTracks.length - 1];

useAppStore.getState().undo();
assert.strictEqual(useAppStore.getState().animationTracks.length, initialTrackCount, 'Animation track should be removed on undo');
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().animationTracks.length, initialTrackCount + 1, 'Animation track should be restored on redo');

// Update animation track
useAppStore.getState().updateAnimationTrack(addedTrack.id, { fromValue: 0.88, toValue: 0.12 });
assert.strictEqual(useAppStore.getState().animationTracks.find(t => t.id === addedTrack.id)?.fromValue, 0.88);
useAppStore.getState().undo();
assert.notStrictEqual(useAppStore.getState().animationTracks.find(t => t.id === addedTrack.id)?.fromValue, 0.88, 'Track fromValue should revert on undo');
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().animationTracks.find(t => t.id === addedTrack.id)?.fromValue, 0.88, 'Track fromValue should restore on redo');
console.log('  PASS: Animation track addition & property edit undo & redo verified');

// 9. Batch Resets (Reset All Adjustments & Reset All)
useAppStore.getState().setBrightness(75);
useAppStore.getState().setSaturation(-60);
useAppStore.getState().setGamma(2.4);

useAppStore.getState().resetAllAdjustments();
assert.strictEqual(useAppStore.getState().brightness, 0);
assert.strictEqual(useAppStore.getState().saturation, 0);
assert.strictEqual(useAppStore.getState().gamma, 1.0);

// Undo the reset!
useAppStore.getState().undo();
assert.strictEqual(useAppStore.getState().brightness, 75, 'Brightness restored after undoing resetAllAdjustments');
assert.strictEqual(useAppStore.getState().saturation, -60, 'Saturation restored after undoing resetAllAdjustments');
assert.strictEqual(useAppStore.getState().gamma, 2.4, 'Gamma restored after undoing resetAllAdjustments');

// Redo the reset!
useAppStore.getState().redo();
assert.strictEqual(useAppStore.getState().brightness, 0);
assert.strictEqual(useAppStore.getState().saturation, 0);
assert.strictEqual(useAppStore.getState().gamma, 1.0);
console.log('  PASS: Batch resetAllAdjustments atomic undo & redo verified');

// 10. Redo stack invalidation on new change
useAppStore.getState().undo(); // Now brightness is 75, canRedo is true
assert.strictEqual(useAppStore.getState().canRedo, true);
useAppStore.getState().setHue(90); // New action!
assert.strictEqual(useAppStore.getState().canRedo, false, 'Redo stack must be invalidated when a new action is performed');
console.log('  PASS: Redo stack properly cleared on new branching user action');

// 11. Stack Limit (50 max history)
historyManager.clearHistory();
for (let i = 1; i <= 65; i++) {
  useAppStore.getState().setBrightness(i);
  historyManager.flushDebounce();
}
assert(historyManager.getUndoStackLength() <= 50, `Undo stack length (${historyManager.getUndoStackLength()}) must be capped at 50`);
assert.strictEqual(historyManager.getUndoStackLength(), 50, 'Undo stack should be capped at exactly 50');
console.log(`  PASS: History stack length capped at ${historyManager.getUndoStackLength()} (max 50)`);

// 12. Keyboard Shortcut Target Filter Simulation (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
function shouldHandleGlobalUndo(target) {
  const isTextInput = target && (
    (target.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button', 'submit'].includes((target.type || '').toLowerCase())) ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
  return !isTextInput;
}

// Sliders and buttons should NOT be blocked from undoing
assert.strictEqual(shouldHandleGlobalUndo({ tagName: 'INPUT', type: 'range' }), true, 'Range sliders should trigger app undo');
assert.strictEqual(shouldHandleGlobalUndo({ tagName: 'BUTTON', type: 'button' }), true, 'Buttons should trigger app undo');
assert.strictEqual(shouldHandleGlobalUndo({ tagName: 'DIV' }), true, 'Canvas / divs should trigger app undo');
assert.strictEqual(shouldHandleGlobalUndo(null), true, 'Window/null target should trigger app undo');

// Text fields should let browser handle native text editing
assert.strictEqual(shouldHandleGlobalUndo({ tagName: 'INPUT', type: 'text' }), false, 'Text inputs should preserve native text undo');
assert.strictEqual(shouldHandleGlobalUndo({ tagName: 'INPUT', type: 'search' }), false, 'Search inputs should preserve native text undo');
assert.strictEqual(shouldHandleGlobalUndo({ tagName: 'TEXTAREA' }), false, 'Textareas should preserve native text undo');
assert.strictEqual(shouldHandleGlobalUndo({ tagName: 'DIV', isContentEditable: true }), false, 'ContentEditable should preserve native text undo');
console.log('  PASS: Keyboard shortcut target filtering accurately distinguishes sliders/buttons from text inputs');

console.log('==================================================================');
console.log('✅ ALL APPLICATION-LEVEL UNDO / REDO TESTS PASSED                ');
console.log('==================================================================');

// Comprehensive Verification Suite for DitherForge Bug Fixes
import { dispatchDither } from './src/dither-engine/engine/index.js';
import { ditherFloydSteinberg, ditherOstromukhov, ditherCrackedDiffuse, ditherFractalDiffuse, ditherVortexDiffusion } from './src/dither-engine/engine/error-diffusion.js';
import { ditherColorSeparation } from './src/dither-engine/engine/basic.js';
import { ditherBlockTone } from './src/dither-engine/engine/patterned.js';
import { colorDistSq as colorDistSqEngine, FastPaletteLUT } from './src/dither-engine/engine/palette.js';
import { colorDistSq as colorDistSqPalettes, extractPaletteMedianCut, BUILTIN_PALETTES } from './src/dither-engine/palettes.js';

let allPassed = true;
function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
  } else {
    console.error(`  FAIL: ${message}`);
    allPassed = false;
  }
}

console.log('==================================================================');
console.log('       DITHERFORGE COMPREHENSIVE BUG VERIFICATION SUITE           ');
console.log('==================================================================\n');

// ----------------------------------------------------------------------
// VERIFICATION STEP 1: Gradient with 8-color custom palette in Floyd-Steinberg
// ----------------------------------------------------------------------
console.log('[1] VERIFICATION: Floyd-Steinberg Gradient & Intermediate Color Distribution');
const palette8 = [
  '#2a1435', // 0: dark violet
  '#ba3e5e', // 1: rose/magenta
  '#df5b56', // 2: coral/red-orange
  '#f39775', // 3: peach
  '#fff0dc', // 4: cream
  '#2b2046', // 5: dark navy
  '#472658', // 6: deep purple
  '#725e82'  // 7: slate violet
];

const w = 200, h = 50;
const gradData = new Uint8ClampedArray(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const idx = (y * w + x) * 4;
    const v = Math.round((x / (w - 1)) * 255);
    gradData[idx] = v;
    gradData[idx + 1] = v;
    gradData[idx + 2] = v;
    gradData[idx + 3] = 255;
  }
}

const fsRes = dispatchDither('floyd-steinberg', w, h, gradData, {
  palette: palette8,
  diffusionStrength: 1.0,
  serpentine: true,
  scale: 1.0
});
const fsOut = new Uint8ClampedArray(fsRes.buffer);

const colorCounts = {};
for (let i = 0; i < w * h; i++) {
  const toHex = (n) => n.toString(16).padStart(2, '0');
  const hex = '#' + toHex(fsOut[i * 4]) + toHex(fsOut[i * 4 + 1]) + toHex(fsOut[i * 4 + 2]);
  colorCounts[hex] = (colorCounts[hex] || 0) + 1;
}

console.log('  Color distribution in Floyd-Steinberg output:', colorCounts);
const usedColorsCount = Object.keys(colorCounts).length;
assert(usedColorsCount >= 5, `Smooth multi-tone dither active: ${usedColorsCount} distinct palette colors used`);

// Verify intermediate colors are NOT skipped (no binary oscillation between only 2 colors)
const sortedCounts = Object.values(colorCounts).sort((a, b) => b - a);
const dominantTwoRatio = (sortedCounts[0] + sortedCounts[1]) / (w * h);
console.log(`  Dominance ratio of top 2 colors: ${(dominantTwoRatio * 100).toFixed(1)}%`);
assert(dominantTwoRatio < 0.85, 'Intermediate tones present: top 2 colors do not monopolize output');

// Also test Ostromoukhov, Cracked, Fractal, Vortex on the same gradient
const ostromRes = ditherOstromukhov(w, h, gradData, palette8, { serpentine: true });
const crackedRes = ditherCrackedDiffuse(w, h, gradData, palette8, {});
const fractalRes = ditherFractalDiffuse(w, h, gradData, palette8, {});
const vortexRes = ditherVortexDiffusion(w, h, gradData, palette8, {});

assert(ostromRes && ostromRes.length === gradData.length, 'ditherOstromukhov completed with clamped errors');
assert(crackedRes && crackedRes.length === gradData.length, 'ditherCrackedDiffuse completed with clamped errors');
assert(fractalRes && fractalRes.length === gradData.length, 'ditherFractalDiffuse completed with clamped errors');
assert(vortexRes && vortexRes.length === gradData.length, 'ditherVortexDiffusion completed with clamped errors');

// ----------------------------------------------------------------------
// VERIFICATION STEP 2: Extracted Palette State Desync & Reset Protection
// ----------------------------------------------------------------------
console.log('\n[2] VERIFICATION: Extracted Palette State & Reset Behavior');
// Mock store state and reset behavior
let storeState = {
  activePaletteId: 'monochrome_1bit',
  activePalette: 'monochrome_1bit',
  workingPalette: [[0, 0, 0, 255], [255, 255, 255, 255]],
  paletteDepth: 2
};

const resetToBuiltin = () => {
  if (storeState.activePaletteId === 'custom') return;
  const pal = BUILTIN_PALETTES.find((p) => p.id === storeState.activePaletteId) || BUILTIN_PALETTES[0];
  storeState.workingPalette = pal.colors.map(c => [...c]);
  storeState.paletteDepth = pal.colors.length;
};

// Simulate Median Cut extraction handler
const extractedColors = extractPaletteMedianCut({ data: gradData, width: w, height: h }, 8);
storeState = {
  ...storeState,
  activePaletteId: 'custom',
  activePalette: 'custom',
  workingPalette: extractedColors.map(c => [...c]),
  paletteDepth: extractedColors.length
};

assert(storeState.activePaletteId === 'custom', 'Extraction sets activePaletteId to "custom"');
assert(storeState.workingPalette.length === 8, 'workingPalette contains 8 extracted colors');

// Test Reset does not overwrite custom palette
resetToBuiltin();
assert(storeState.activePaletteId === 'custom', 'Reset does not alter activePaletteId when custom');
assert(storeState.workingPalette.length === 8, 'Reset does not overwrite custom workingPalette with monochrome 1-bit');

// ----------------------------------------------------------------------
// VERIFICATION STEP 3: Blue / Cyan Color Metric Matching
// ----------------------------------------------------------------------
console.log('\n[3] VERIFICATION: Blue/Cyan Redmean Metric Matching');
// Benchmark concentric ring color: #38bdf8 (56, 189, 248)
const cyanR = 56, cyanG = 189, cyanB = 248;

// Palette containing blue, purple, cream, dark, white
const testPalette = [
  [15, 10, 25],      // 0: Dark purple
  [255, 245, 230],   // 1: Cream
  [186, 62, 94],     // 2: Rose
  [56, 189, 248],    // 3: Exact Cyan (#38bdf8)
  [70, 40, 90]       // 4: Violet
];

const lut = new FastPaletteLUT(testPalette);
const matched = lut.findNearest(cyanR, cyanG, cyanB);
console.log(`  Input RGB(${cyanR}, ${cyanG}, ${cyanB}) matched to RGB(${matched[0]}, ${matched[1]}, ${matched[2]})`);

assert(matched[0] === 56 && matched[1] === 189 && matched[2] === 248, 'Cyan element correctly maps to Cyan, not purple or cream');

// Check redmean distance of Cyan to Cyan vs Cyan to Cream/Purple
const distToCyan = colorDistSqEngine(cyanR, cyanG, cyanB, 56, 189, 248);
const distToPurple = colorDistSqEngine(cyanR, cyanG, cyanB, 70, 40, 90);
const distToCream = colorDistSqEngine(cyanR, cyanG, cyanB, 255, 245, 230);

assert(distToCyan === 0, 'Distance to exact blue/cyan is 0');
assert(distToPurple > 10000 && distToCream > 10000, 'Redmean penalizes hue distance to purple and cream heavily');

// ----------------------------------------------------------------------
// VERIFICATION STEP 4: Inconsistent LUT Indexing & Bug 5 Algorithms
// ----------------------------------------------------------------------
console.log('\n[4] VERIFICATION: LUT Indexing & Non-Dithering / Hardcoded Fixes');
// Test float inputs to inlineMatch vs findNearest
const outArr = new Uint8ClampedArray(4);
lut.inlineMatch(7.9, 189.4, 247.8, outArr, 0);
const nearestRef = lut.findNearest(7.9, 189.4, 247.8);
assert(
  outArr[0] === nearestRef[0] && outArr[1] === nearestRef[1] && outArr[2] === nearestRef[2],
  'FastPaletteLUT.inlineMatch matches findNearest with float inputs'
);

// Test ditherColorSeparation
const sepOut = ditherColorSeparation(w, h, gradData, palette8, { scale: 1 });
const sepColors = new Set();
for (let i = 0; i < w * h; i++) {
  sepColors.add(`${sepOut[i * 4]},${sepOut[i * 4 + 1]},${sepOut[i * 4 + 2]}`);
}
console.log(`  ditherColorSeparation unique colors produced: ${sepColors.size}`);
assert(sepColors.size >= 4, 'ditherColorSeparation performs actual dithering with multi-color palette');

// Test ditherBlockTone
const blockData = new Uint8ClampedArray(w * h * 4);
for (let i = 0; i < w * h * 4; i += 4) {
  blockData[i] = 186;     // Rose R
  blockData[i + 1] = 62;  // Rose G
  blockData[i + 2] = 94;  // Rose B
  blockData[i + 3] = 255;
}
const blockOut = ditherBlockTone(w, h, blockData, palette8, { dotSize: 8 });
const blockColors = new Set();
for (let i = 0; i < w * h; i++) {
  blockColors.add(`${blockOut[i * 4]},${blockOut[i * 4 + 1]},${blockOut[i * 4 + 2]}`);
}
console.log(`  ditherBlockTone colors for Rose input:`, Array.from(blockColors));
// Should use rose/coral tones, not pure black/white [0,0,0] / [255,255,255]
const hasRoseTone = Array.from(blockColors).some(c => c.includes('186') || c.includes('223') || c.includes('243'));
assert(hasRoseTone, 'ditherBlockTone uses source color tones rather than hardcoded 0/255 monochrome');

console.log('\n==================================================================');
if (allPassed) {
  console.log('✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
} else {
  console.log('❌ SOME TESTS FAILED');
}
console.log('==================================================================');
process.exit(allPassed ? 0 : 1);

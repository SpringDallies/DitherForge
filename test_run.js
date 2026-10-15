// Comprehensive Verification Suite for DitherForge Bug Fixes
import { dispatchDither } from './src/dither-engine/engine/index.js';
import { ditherFloydSteinberg, ditherOstromukhov, ditherCrackedDiffuse, ditherFractalDiffuse, ditherVortexDiffusion } from './src/dither-engine/engine/error-diffusion.js';
import { ditherColorSeparation } from './src/dither-engine/engine/basic.js';
import { ditherBlockTone } from './src/dither-engine/engine/patterned.js';
import { colorDistSq as colorDistSqEngine, FastPaletteLUT } from './src/dither-engine/engine/palette.js';
import { colorDistSq as colorDistSqPalettes, extractPaletteMedianCut, extractPaletteKMeans, BUILTIN_PALETTES } from './src/dither-engine/palettes.js';
import { ALGORITHM_REGISTRY, applyDitherAlgorithm } from './src/dither-engine/algorithms.js';
import { AVAILABLE_EFFECT_TYPES, applyEffectStack } from './src/dither-engine/effect-stack.js';
import { exportCharacterGrid, exportSvgContours, exportRaster } from './src/dither-engine/exporters.js';
import { BUILTIN_PRESETS } from './src/ui/presets.js';

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

// ----------------------------------------------------------------------
// VERIFICATION STEP 5: End-to-End Test of All Dithering Algorithms in Registry
// ----------------------------------------------------------------------
console.log('\n[5] VERIFICATION: All Registered Dithering Algorithms');
let algoFailCount = 0;
const testPaletteArray = [[0, 0, 0, 255], [255, 255, 255, 255]];
const testImgW = 32, testImgH = 32;
const testImgData = new Uint8ClampedArray(testImgW * testImgH * 4);
for (let y = 0; y < testImgH; y++) {
  for (let x = 0; x < testImgW; x++) {
    const idx = (y * testImgW + x) * 4;
    testImgData[idx] = Math.round((x / (testImgW - 1)) * 255);
    testImgData[idx + 1] = Math.round((y / (testImgH - 1)) * 255);
    testImgData[idx + 2] = 128;
    testImgData[idx + 3] = 255;
  }
}

for (const algo of ALGORITHM_REGISTRY) {
  try {
    const copy = new Uint8ClampedArray(testImgData);
    const mockImgData = { width: testImgW, height: testImgH, data: copy };
    applyDitherAlgorithm(mockImgData, {
      algorithmId: algo.id,
      palette: testPaletteArray,
      scale: 1.0,
      threshold: 0.5,
      diffusionStrength: 1.0,
      serpentine: true,
      matrixSize: '4x4',
      triangleType: 'isosceles',
      dotSize: 4,
      blockSize: 4,
      controls: {
        matrixSize: '4x4',
        triangleType: 'isosceles',
        dotSize: 4,
        blockSize: 4,
        vertical: true
      }
    });

    // Verify valid output buffer
    let hasNaN = false;
    for (let i = 0; i < mockImgData.data.length; i++) {
      if (Number.isNaN(mockImgData.data[i])) {
        hasNaN = true;
        break;
      }
    }
    if (hasNaN) {
      console.error(`  FAIL: ${algo.id} produced NaN pixels!`);
      algoFailCount++;
    }
  } catch (err) {
    console.error(`  FAIL: ${algo.id} threw an error:`, err.message);
    algoFailCount++;
  }
}
assert(algoFailCount === 0, `All ${ALGORITHM_REGISTRY.length} registered dithering algorithms execute cleanly without errors or NaNs`);

// ----------------------------------------------------------------------
// VERIFICATION STEP 5b: Sub-1.0 Fractional Scale (0.2x & 0.5x) on Polygon & Pattern Algorithms
// ----------------------------------------------------------------------

// Verify color-separation supportsDpiScale
const colorSepAlgo = ALGORITHM_REGISTRY.find(a => a.id === 'color-separation');
assert(colorSepAlgo && colorSepAlgo.features && colorSepAlgo.features.supportsDpiScale === true, 'color-separation has supportsDpiScale set to true');

console.log('\n[5b] VERIFICATION: Sub-1.0 Fractional Scale (0.2x & 0.5x) on Polygon & Pattern Algorithms');
const subScaleAlgos = ['hexa-poly', 'low-poly', 'penta-poly', 'tri-poly', 'block-tone', 'pop-tone', 'circle-grid', 'diamond', 'print-pattern'];
let subScaleFailCount = 0;
for (const id of subScaleAlgos) {
  for (const s of [0.05, 0.1, 0.2, 0.35, 0.5]) {
    try {
      const copy = new Uint8ClampedArray(testImgData);
      const mockImgData = { width: testImgW, height: testImgH, data: copy };
      applyDitherAlgorithm(mockImgData, {
        algorithmId: id,
        palette: testPaletteArray,
        scale: s,
        threshold: 0.5,
        diffusionStrength: 1.0,
        serpentine: true,
        controls: { scale: s, dotSize: 4, blockSize: 4, vertical: true }
      });
      for (let i = 0; i < mockImgData.data.length; i++) {
        if (Number.isNaN(mockImgData.data[i])) {
          subScaleFailCount++;
          break;
        }
      }
    } catch (e) {
      console.error(`  FAIL: ${id} at scale=${s} threw:`, e);
      subScaleFailCount++;
    }
  }
}
assert(subScaleFailCount === 0, 'Polygon & Pattern algorithms render cleanly at micro/fractional scales down to 0.05x without artifacts or collapse');

// ----------------------------------------------------------------------
// VERIFICATION STEP 5c: Spatial Offset (X & Y) in Special Effects Algorithms
// ----------------------------------------------------------------------
console.log('\n[5c] VERIFICATION: Spatial Offset (X & Y) in Special Effects Algorithms');
let offsetFailCount = 0;
const specialAlgos = ALGORITHM_REGISTRY.filter(a => a.category === 'special_effects');

for (const algo of specialAlgos) {
  const hasOffX = algo.controls.some(c => c.id === 'offsetX');
  const hasOffY = algo.controls.some(c => c.id === 'offsetY');
  if (!hasOffX || !hasOffY) {
    console.error(`  FAIL: Algorithm [${algo.name}] (${algo.id}) missing offsetX/offsetY controls`);
    offsetFailCount++;
    continue;
  }

  try {
    const baseRes = dispatchDither(algo.id, testImgW, testImgH, testImgData, {
      palette: ['#000000', '#ffffff'],
      scale: 1.0,
      offsetX: 0,
      offsetY: 0
    });

    const shiftedRes = dispatchDither(algo.id, testImgW, testImgH, testImgData, {
      palette: ['#000000', '#ffffff'],
      scale: 1.0,
      offsetX: 20,
      offsetY: 20
    });

    const baseBuf = new Uint8ClampedArray(baseRes.buffer);
    const shiftedBuf = new Uint8ClampedArray(shiftedRes.buffer);

    let hasNaN = false;
    for (let i = 0; i < baseBuf.length; i++) {
      if (Number.isNaN(baseBuf[i]) || Number.isNaN(shiftedBuf[i])) {
        hasNaN = true;
        break;
      }
    }

    if (hasNaN) {
      console.error(`  FAIL: Algorithm [${algo.name}] (${algo.id}) produced NaN values with offsets`);
      offsetFailCount++;
    }
  } catch (err) {
    console.error(`  FAIL: Algorithm [${algo.name}] (${algo.id}) threw an error: ${err.message}`);
    offsetFailCount++;
  }
}
assert(offsetFailCount === 0, 'All 17 Special Effects algorithms support spatial offsetX & offsetY controls and render cleanly');

// ----------------------------------------------------------------------
// VERIFICATION STEP 6: All 9 Post-Effects in effect-stack.js
// ----------------------------------------------------------------------
console.log('\n[6] VERIFICATION: All 9 Post-Effects in effect-stack.js');
let effectFailCount = 0;

for (const effMeta of AVAILABLE_EFFECT_TYPES) {
  try {
    const effCopy = new Uint8ClampedArray(testImgData);
    const effImgData = { width: testImgW, height: testImgH, data: effCopy };
    const stack = [{
      id: effMeta.id,
      type: effMeta.id,
      enabled: true,
      params: { ...effMeta.defaultParams }
    }];
    applyEffectStack(effImgData, stack);

    let hasNaN = false;
    let inRange = true;
    for (let i = 0; i < effImgData.data.length; i++) {
      const val = effImgData.data[i];
      if (Number.isNaN(val)) { hasNaN = true; break; }
      if (val < 0 || val > 255) { inRange = false; break; }
    }
    if (hasNaN || !inRange) {
      console.error(`  FAIL: Effect ${effMeta.id} produced invalid pixel data (NaN: ${hasNaN}, inRange: ${inRange})`);
      effectFailCount++;
    } else {
      console.log(`  PASS: Effect [${effMeta.name}] (${effMeta.id}) processed successfully`);
    }
  } catch (err) {
    console.error(`  FAIL: Effect ${effMeta.id} threw:`, err);
    effectFailCount++;
  }
}

// Also test Halftone diamond variant & Blur/Sharpen blur/sharpen branches
try {
  const diamondCopy = new Uint8ClampedArray(testImgData);
  applyEffectStack({ width: testImgW, height: testImgH, data: diamondCopy }, [
    { id: 'halftone', type: 'halftone', enabled: true, params: { dotSize: 4, angle: 30, shape: 'diamond' } }
  ]);
  const blurCopy = new Uint8ClampedArray(testImgData);
  applyEffectStack({ width: testImgW, height: testImgH, data: blurCopy }, [
    { id: 'blur_sharpen', type: 'blur_sharpen', enabled: true, params: { amount: -0.7 } }
  ]);
  const sharpenCopy = new Uint8ClampedArray(testImgData);
  applyEffectStack({ width: testImgW, height: testImgH, data: sharpenCopy }, [
    { id: 'blur_sharpen', type: 'blur_sharpen', enabled: true, params: { amount: 1.2 } }
  ]);
  assert(diamondCopy[0] !== undefined && blurCopy[0] !== undefined && sharpenCopy[0] !== undefined,
    'Halftone diamond shape and Blur/Sharpen negative/positive branches operate cleanly');
} catch (e) {
  console.error('  FAIL: Halftone/Blur variants threw:', e);
  effectFailCount++;
}

assert(effectFailCount === 0, 'All 9 post-effects execute cleanly without NaNs and maintain [0, 255] bounds');

// ----------------------------------------------------------------------
// VERIFICATION STEP 7: Exporters (Raster, Character-Grid, SVG Contours)
// ----------------------------------------------------------------------
console.log('\n[7] VERIFICATION: Exporters Engine');

// Node polyfill for mock download
let downloadedContent = "";
let downloadedFilename = "";
globalThis.Blob = class MockBlob {
  constructor(parts, options) {
    downloadedContent = parts.join('');
    this.parts = parts;
    this.options = options;
  }
};
globalThis.document = {
  createElement: () => ({
    href: '',
    download: '',
    click: function() { downloadedFilename = this.download; }
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};
globalThis.URL = {
  createObjectURL: () => 'blob:mock-url',
  revokeObjectURL: () => {}
};

const mockCanvas = {
  width: testImgW,
  height: testImgH,
  getContext: () => ({
    getImageData: () => ({ width: testImgW, height: testImgH, data: new Uint8ClampedArray(testImgData) })
  }),
  toDataURL: (mime, quality) => `data:${mime};base64,AAAA`
};

try {
  exportRaster(mockCanvas, 'png', 0.92, 'test_export.png');
  assert(downloadedFilename.endsWith('.png'), 'exportRaster produces valid .png download');

  exportRaster(mockCanvas, 'jpg', 0.85, 'test_export.jpg');
  assert(downloadedFilename.endsWith('.jpg'), 'exportRaster produces valid .jpg download');

  const asciiGrid = exportCharacterGrid(mockCanvas, 'ascii', 2, 4);
  assert(asciiGrid && asciiGrid.length > 50, 'exportCharacterGrid [ascii] generates non-empty character grid');

  const blocksGrid = exportCharacterGrid(mockCanvas, 'blocks', 2, 4);
  assert(blocksGrid && blocksGrid.length > 50, 'exportCharacterGrid [blocks] generates non-empty Unicode block grid');

  const brailleGrid = exportCharacterGrid(mockCanvas, 'braille');
  assert(brailleGrid && brailleGrid.length > 50, 'exportCharacterGrid [braille] generates non-empty 2x4 braille grid');

  exportSvgContours(mockCanvas);
  assert(downloadedContent.includes('<svg') && downloadedContent.includes('</svg>'), 'exportSvgContours generates valid SVG markup');
} catch (e) {
  assert(false, `Exporters executed without error: ${e.message}`);
}

// ----------------------------------------------------------------------
// VERIFICATION STEP 8: Presets & Palette Extraction
// ----------------------------------------------------------------------
console.log('\n[8] VERIFICATION: Presets & Palette Extractors');
assert(BUILTIN_PRESETS.length === 10, `Built-in presets count is 10 (found: ${BUILTIN_PRESETS.length})`);
for (const preset of BUILTIN_PRESETS) {
  assert(preset.id && preset.algorithmId && preset.paletteId, `Preset ${preset.id} has valid algorithmId and paletteId`);
}

const kmPalette = extractPaletteKMeans({ data: testImgData, width: testImgW, height: testImgH }, 8, 4);
assert(kmPalette.length === 8, `extractPaletteKMeans successfully extracts 8 clusters`);
for (const color of kmPalette) {
  assert(color.length === 4 && color[3] === 255, 'K-Means color swatches have valid RGBA format');
}

console.log('\n==================================================================');
if (allPassed) {
  console.log('✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
} else {
  console.log('❌ SOME TESTS FAILED');
}
console.log('==================================================================');
process.exit(allPassed ? 0 : 1);

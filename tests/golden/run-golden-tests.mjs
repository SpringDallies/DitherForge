import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const goldenHashesPath = path.join(__dirname, 'golden-hashes.json');

// Engine imports (Read-only, do not modify src/)
import { ALGORITHM_REGISTRY, applyDitherAlgorithm, applyTweaks } from '../../src/dither-engine/algorithms.js';
import { BUILTIN_PALETTES, extractPaletteMedianCut, extractPaletteKMeans } from '../../src/dither-engine/palettes.js';
import { FastPaletteLUT } from '../../src/dither-engine/engine/palette.js';
import { AVAILABLE_EFFECT_TYPES, applyEffectStack } from '../../src/dither-engine/effect-stack.js';
import { TEMPORAL_PATTERNS, applyTemporalNoise } from '../../src/dither-engine/temporal.js';
import { BUILTIN_PRESETS } from '../../src/ui/presets.js';
import { exportCharacterGrid, exportSvgContours } from '../../src/dither-engine/exporters.js';

// Seeded PRNG for stubbing Math.random ONLY when required
function createMulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fixed 64x64 synthetic test pattern with smooth gradients, diagonals & shapes
function createFixedTestPattern(width = 64, height = 64) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = Math.floor((x / (width - 1)) * 255);
      const g = Math.floor((y / (height - 1)) * 255);
      const dist = Math.hypot(x - width / 2, y - height / 2);
      const b = Math.floor((Math.sin(dist * 0.3) * 0.5 + 0.5) * 255);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

function cloneImageData(img) {
  return {
    width: img.width,
    height: img.height,
    data: new Uint8ClampedArray(img.data)
  };
}

function sha256(bufferOrStr) {
  const hash = crypto.createHash('sha256');
  if (typeof bufferOrStr === 'string') {
    hash.update(bufferOrStr, 'utf8');
  } else {
    hash.update(bufferOrStr);
  }
  return hash.digest('hex');
}

// Minimal DOM polyfill for exporters in Node
let capturedDownloadContent = "";
const origBlob = globalThis.Blob;
globalThis.Blob = class MockBlob {
  constructor(parts, options) {
    capturedDownloadContent = parts.join('');
    this.parts = parts;
    this.options = options;
  }
};
globalThis.document = {
  createElement: () => ({
    href: '',
    download: '',
    click: () => {}
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

console.log("==================================================================");
console.log("         DITHERFORGE BIT-IDENTICAL GOLDEN TEST RUNNER (v2)        ");
console.log("==================================================================");

const updateMode = process.argv.includes('--update') || !fs.existsSync(goldenHashesPath);
let existingHashes = {};
if (fs.existsSync(goldenHashesPath)) {
  existingHashes = JSON.parse(fs.readFileSync(goldenHashesPath, 'utf8'));
}

const computedHashes = {};
let totalCases = 0;
let passedCases = 0;
let failedCases = 0;
let determinismPasses = 0;
let determinismFailures = 0;

function executeTestCase(category, caseId, name, runFn) {
  totalCases++;
  // Pass 1
  const hash1 = runFn();
  // Pass 2 (Verify strict self-determinism)
  const hash2 = runFn();

  if (hash1 !== hash2) {
    console.error(`  FAIL [Determinism]: ${category} > ${name} differs between run 1 and run 2!`);
    console.error(`       Run 1: ${hash1}`);
    console.error(`       Run 2: ${hash2}`);
    failedCases++;
    determinismFailures++;
    return;
  }
  determinismPasses++;

  computedHashes[caseId] = hash1;

  if (updateMode && !existingHashes[caseId]) {
    console.log(`  RECORD NEW: [${category}] ${name} -> ${hash1.slice(0, 16)}...`);
    passedCases++;
  } else {
    const expected = existingHashes[caseId];
    if (expected === hash1) {
      console.log(`  PASS: [${category}] ${name}`);
      passedCases++;
    } else {
      console.error(`  FAIL [Golden Drift]: ${category} > ${name}`);
      console.error(`       Expected: ${expected}`);
      console.error(`       Actual:   ${hash1}`);
      failedCases++;
    }
  }
}

const basePattern = createFixedTestPattern(64, 64);
const defaultPalette = BUILTIN_PALETTES[0].colors; // Monochrome 1-bit

// 1. DYNAMIC ALGORITHMS REGISTRY (Covers every registered algorithm in ALGORITHM_REGISTRY)
console.log(`\n[1] ${ALGORITHM_REGISTRY.length} ALGORITHMS (Determinism & Golden Match)`);
for (const algo of ALGORITHM_REGISTRY) {
  executeTestCase("Algorithm", `algo_${algo.id}`, `${algo.name} (${algo.id})`, () => {
    const img = cloneImageData(basePattern);
    applyDitherAlgorithm(img, {
      algorithmId: algo.id,
      palette: defaultPalette,
      threshold: 0.5,
      scale: 1.0,
      diffusionStrength: 1.0,
      serpentine: true,
      temporalSeed: 0
    });
    return sha256(img.data);
  });
}

// 2. PALETTE EXTRACTORS & FASTPALETTELUT
console.log("\n[2] PALETTE EXTRACTORS & FASTPALETTELUT");
// Median Cut (Deterministic)
executeTestCase("Extractor", "extractor_median_cut", "Median Cut (8 colors)", () => {
  const img = cloneImageData(basePattern);
  const palette = extractPaletteMedianCut(img, 8);
  return sha256(JSON.stringify(palette));
});

// K-Means (Stubbed with Seeded PRNG)
executeTestCase("Extractor", "extractor_k_means", "K-Means (8 colors, Seeded PRNG 1337)", () => {
  const origRandom = Math.random;
  Math.random = createMulberry32(1337);
  try {
    const img = cloneImageData(basePattern);
    const palette = extractPaletteKMeans(img, 8, 8);
    return sha256(JSON.stringify(palette));
  } finally {
    Math.random = origRandom;
  }
});

// FastPaletteLUT Perceptual Matching (8 colors)
executeTestCase("Extractor", "fast_palette_lut", "FastPaletteLUT Perceptual Matching (8 colors)", () => {
  const img = cloneImageData(basePattern);
  const sinclair = BUILTIN_PALETTES.find(p => p.id === 'sinclair_spectrum') || BUILTIN_PALETTES[0];
  const lut = new FastPaletteLUT(sinclair.colors, 0.5);
  for (let i = 0; i < img.data.length; i += 4) {
    lut.inlineMatch(img.data[i], img.data[i + 1], img.data[i + 2], img.data, i);
  }
  return sha256(img.data);
});

// FastPaletteLUT Pair Matching (8 colors)
executeTestCase("Extractor", "fast_palette_lut_pair", "FastPaletteLUT Pair Matching (8 colors)", () => {
  const img = cloneImageData(basePattern);
  const sinclair = BUILTIN_PALETTES.find(p => p.id === 'sinclair_spectrum') || BUILTIN_PALETTES[0];
  const lut = new FastPaletteLUT(sinclair.colors, 0.5);
  for (let i = 0; i < img.data.length; i += 4) {
    lut.inlinePairMatch(img.data[i], img.data[i + 1], img.data[i + 2], 0.5, img.data, i);
  }
  return sha256(img.data);
});

// Note on CMYK Halftone Engine (src/dither-engine/engine/halftone.js):
// processHalftone is internal to the engine and not exposed via public API (algorithms.js / effect-stack.js / exporters.js).
// Post-effect CMYK halftone is tested in effect_halftone. Standalone halftone.js test skipped per specification.

// 3. 9 POST-EFFECTS
console.log("\n[3] 9 POST-EFFECTS STACK");
for (const eff of AVAILABLE_EFFECT_TYPES) {
  executeTestCase("Effect", `effect_${eff.id}`, `${eff.name} (${eff.id})`, () => {
    const img = cloneImageData(basePattern);
    applyEffectStack(img, [{
      id: `${eff.id}_test`,
      type: eff.id,
      enabled: true,
      params: { ...eff.defaultParams }
    }]);
    return sha256(img.data);
  });
}

// 4. 9 TEMPORAL CRT NOISE PATTERNS (Stubbed with Seeded PRNG 4242)
console.log("\n[4] 9 TEMPORAL CRT PATTERNS (Seeded PRNG 4242)");
for (const pat of TEMPORAL_PATTERNS) {
  executeTestCase("Temporal", `temporal_${pat.id}`, `${pat.name} (${pat.id})`, () => {
    const origRandom = Math.random;
    Math.random = createMulberry32(4242);
    try {
      const img = cloneImageData(basePattern);
      applyTemporalNoise(img.data, img.width, img.height, pat.id, 0.5, 1);
      return sha256(img.data);
    } finally {
      Math.random = origRandom;
    }
  });
}

// 5. 10 BUILT-IN PRESETS END-TO-END
console.log("\n[5] 10 BUILT-IN PRESETS END-TO-END");
for (const preset of BUILTIN_PRESETS) {
  executeTestCase("Preset", `preset_${preset.id}`, `${preset.name} (${preset.id})`, () => {
    const img = cloneImageData(basePattern);
    const palObj = BUILTIN_PALETTES.find(p => p.id === preset.paletteId) || BUILTIN_PALETTES[0];
    // Step 1: Tweaks
    applyTweaks(img.data, img.width, img.height, {
      brightness: preset.brightness || 0,
      contrast: preset.contrast || 0,
      saturation: preset.saturation || 0,
      gamma: preset.gamma || 1.0
    });
    // Step 2: Dither Algorithm
    applyDitherAlgorithm(img, {
      algorithmId: preset.algorithmId,
      palette: palObj.colors,
      threshold: preset.threshold !== undefined ? preset.threshold : 0.5,
      scale: preset.scale || 1.0,
      diffusionStrength: preset.diffusionStrength !== undefined ? preset.diffusionStrength : 1.0,
      serpentine: preset.serpentine !== false,
      temporalSeed: 0
    });
    // Step 3: Effect Stack
    if (preset.effects && preset.effects.length > 0) {
      applyEffectStack(img, preset.effects);
    }
    return sha256(img.data);
  });
}

// 6. EXPORTERS (ASCII, Blocks, Braille, SVG)
console.log("\n[6] EXPORTERS (ASCII, Blocks, Braille, SVG Contours)");
// Produce a dithered test image for export
const ditheredExportPattern = cloneImageData(basePattern);
applyDitherAlgorithm(ditheredExportPattern, {
  algorithmId: "floyd-steinberg",
  palette: defaultPalette,
  temporalSeed: 0
});

const mockCanvas = {
  width: ditheredExportPattern.width,
  height: ditheredExportPattern.height,
  getContext: () => ({
    getImageData: () => ditheredExportPattern
  })
};

executeTestCase("Exporter", "export_ascii", "ASCII Character Grid", () => {
  capturedDownloadContent = "";
  const result = exportCharacterGrid(mockCanvas, "ascii", 6, 12);
  return sha256(result);
});

executeTestCase("Exporter", "export_blocks", "Unicode Blocks Character Grid", () => {
  capturedDownloadContent = "";
  const result = exportCharacterGrid(mockCanvas, "blocks", 6, 12);
  return sha256(result);
});

executeTestCase("Exporter", "export_braille", "Braille Matrix 2x4 Character Grid", () => {
  capturedDownloadContent = "";
  const result = exportCharacterGrid(mockCanvas, "braille", 6, 12);
  return sha256(result);
});

executeTestCase("Exporter", "export_svg", "SVG Vector Contours", () => {
  capturedDownloadContent = "";
  exportSvgContours(mockCanvas);
  return sha256(capturedDownloadContent);
});

// Restore Blob
globalThis.Blob = origBlob;

// Save hashes if updating: strictly DO NOT regenerate existing entries, ONLY add new ones
if (updateMode) {
  const mergedHashes = { ...existingHashes };
  let addedCount = 0;
  for (const [key, val] of Object.entries(computedHashes)) {
    if (!mergedHashes[key]) {
      mergedHashes[key] = val;
      addedCount++;
    }
  }
  fs.writeFileSync(goldenHashesPath, JSON.stringify(mergedHashes, null, 2) + '\n', 'utf8');
  console.log(`\n💾 Added ${addedCount} new golden hashes (preserved ${Object.keys(existingHashes).length} existing entries, total: ${Object.keys(mergedHashes).length}) to ${goldenHashesPath}`);
}

console.log("\n==================================================================");
console.log(`DETERMINISM VERIFICATION: ${determinismPasses} passed, ${determinismFailures} failed / ${totalCases} test cases`);
if (determinismFailures > 0) {
  console.error(`❌ CRITICAL: ${determinismFailures} test cases failed strict two-run determinism check!`);
} else {
  console.log(`✅ ALL ${determinismPasses} CASES STRICTLY DETERMINISTIC (identical across repeated runs)`);
}
console.log(`GOLDEN TEST SUMMARY: ${passedCases} Passed, ${failedCases} Failed / ${totalCases} Total Cases`);
console.log("==================================================================");

if (failedCases > 0 || determinismFailures > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

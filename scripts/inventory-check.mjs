import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import real code registries
import { ALGORITHM_REGISTRY, ALGORITHM_CATEGORIES } from '../src/dither-engine/algorithms.js';
import * as palettesModule from '../src/dither-engine/palettes.js';
import { AVAILABLE_EFFECT_TYPES } from '../src/dither-engine/effect-stack.js';
import { TEMPORAL_PATTERNS } from '../src/dither-engine/temporal.js';
import { BUILTIN_PRESETS } from '../src/ui/presets.js';

let hasFailures = false;

function assert(condition, passMsg, failMsg) {
  if (condition) {
    console.log(`  PASS: ${passMsg}`);
  } else {
    console.error(`  FAIL: ${failMsg}`);
    hasFailures = true;
  }
}

console.log("==================================================================");
console.log("       DITHERFORGE FEATURE INVENTORY VERIFICATION (v3)            ");
console.log("==================================================================");

// Allow test override via CLI arg (e.g. --expect-algorithms=62)
const args = process.argv.slice(2);
const expectAlgoOverride = args.find(a => a.startsWith('--expect-algorithms='));
const EXPECTED_ALGORITHMS = expectAlgoOverride ? parseInt(expectAlgoOverride.split('=')[1], 10) : 63;

// 1. Algorithms
console.log("\n[1] ALGORITHMS & CATEGORIES (src/dither-engine/algorithms.js)");
assert(ALGORITHM_REGISTRY.length === EXPECTED_ALGORITHMS,
  `Algorithms registry count matches expected ${EXPECTED_ALGORITHMS} (found: ${ALGORITHM_REGISTRY.length})`,
  `Algorithms registry mismatch: expected ${EXPECTED_ALGORITHMS}, got ${ALGORITHM_REGISTRY.length}`);
assert(ALGORITHM_CATEGORIES.length === 6,
  `Category count matches 6 (found: ${ALGORITHM_CATEGORIES.length})`,
  `Category count mismatch: expected 6, got ${ALGORITHM_CATEGORIES.length}`);

// 2. Palettes & Extractors
console.log("\n[2] PALETTES & EXTRACTORS (src/dither-engine/palettes.js)");
const builtinPalettes = palettesModule.BUILTIN_PALETTES;
assert(builtinPalettes.length === 14,
  `Built-in palettes count matches 14 (found: ${builtinPalettes.length})`,
  `Built-in palettes mismatch: expected 14, got ${builtinPalettes.length}`);

const extractors = Object.keys(palettesModule).filter(k => k.startsWith('extractPalette'));
assert(extractors.length === 2,
  `Palette extractors count matches 2 [${extractors.join(', ')}]`,
  `Palette extractors count mismatch: expected 2 (Median Cut, K-Means), got ${extractors.length} [${extractors.join(', ')}]`);

// 3. Effects Stack
console.log("\n[3] POST-EFFECTS STACK (src/dither-engine/effect-stack.js)");
assert(AVAILABLE_EFFECT_TYPES.length === 9,
  `Post-effect types count matches 9 (found: ${AVAILABLE_EFFECT_TYPES.length})`,
  `Post-effect types count mismatch: expected 9, got ${AVAILABLE_EFFECT_TYPES.length}`);

// 4. Temporal CRT Patterns
console.log("\n[4] TEMPORAL CRT NOISE PATTERNS (src/dither-engine/temporal.js)");
assert(TEMPORAL_PATTERNS.length === 9,
  `Temporal CRT noise profiles count matches 9 (found: ${TEMPORAL_PATTERNS.length})`,
  `Temporal CRT noise profiles mismatch: expected 9, got ${TEMPORAL_PATTERNS.length}`);

// 5. Presets
console.log("\n[5] BUILT-IN PRESETS (src/ui/presets.js)");
assert(BUILTIN_PRESETS.length === 10,
  `Built-in factory presets count matches 10 (found: ${BUILTIN_PRESETS.length})`,
  `Built-in factory presets mismatch: expected 10, got ${BUILTIN_PRESETS.length}`);

// 6. Source File Parsing: index.html
console.log("\n[6] UI SOURCE PARSING (index.html)");
const indexHtmlPath = path.join(rootDir, 'index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

// Parse Themes from index.html
const themeSelectMatch = indexHtmlContent.match(/<select id="themeSelector"[^>]*>([\s\S]*?)<\/select>/);
let parsedThemes = [];
if (themeSelectMatch) {
  const optMatches = [...themeSelectMatch[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)];
  parsedThemes = optMatches.map(m => ({ id: m[1], label: m[2] }));
}
assert(parsedThemes.length === 6,
  `Themes parsed from index.html: 6 [${parsedThemes.map(t => t.id).join(', ')}]`,
  `Themes parsed from index.html mismatch: expected 6, found ${parsedThemes.length}`);

// Parse Performance Modes from index.html
const perfModeMatch = indexHtmlContent.match(/<select id="perfModeSelector"[^>]*>([\s\S]*?)<\/select>/);
let parsedPerfModes = [];
if (perfModeMatch) {
  const optMatches = [...perfModeMatch[1].matchAll(/<option value="([^"]+)"[^>]*>([^<]+)<\/option>/g)];
  parsedPerfModes = optMatches.map(m => ({ id: m[1], label: m[2] }));
}
assert(parsedPerfModes.length === 3,
  `Engine performance modes parsed from index.html: 3 [${parsedPerfModes.map(m => m.id).join(', ')}]`,
  `Engine performance modes mismatch: expected 3, found ${parsedPerfModes.length}`);

// Parse Export Buttons from index.html
const exportsDivMatch = indexHtmlContent.match(/<div class="panel-scroll-content" id="tabContentExports"[^>]*>([\s\S]*?)<\/div>\s*<\/aside>/);
let parsedExportButtons = [];
if (exportsDivMatch) {
  const btnMatches = [...exportsDivMatch[1].matchAll(/<button [^>]*id="(btnExport[A-Za-z0-9]+|btnRecordVideo)"[^>]*>([\s\S]*?)<\/button>/g)];
  parsedExportButtons = btnMatches.map(m => ({ id: m[1], text: m[2].trim().replace(/\s+/g, ' ') }));
}
assert(parsedExportButtons.length === 10,
  `Export actions parsed from index.html: 10 [${parsedExportButtons.map(b => b.id).join(', ')}]`,
  `Export actions mismatch: expected 10, found ${parsedExportButtons.length}`);

// 7. Exporter Functions (src/dither-engine/exporters.js)
console.log("\n[7] EXPORTERS ENGINE (src/dither-engine/exporters.js)");
const exportersPath = path.join(rootDir, 'src', 'dither-engine', 'exporters.js');
const exportersContent = fs.readFileSync(exportersPath, 'utf8');

const exportedFunctions = [...exportersContent.matchAll(/export function ([A-Za-z0-9_]+)/g)].map(m => m[1]);
const exportedClasses = [...exportersContent.matchAll(/export class ([A-Za-z0-9_]+)/g)].map(m => m[1]);
const allExporterExports = [...exportedFunctions, ...exportedClasses];

assert(exportedFunctions.includes('exportRaster'),
  `exportRaster present in exporters.js`,
  `exportRaster missing in exporters.js`);
assert(exportedFunctions.includes('copyCanvasToClipboard'),
  `copyCanvasToClipboard present in exporters.js`,
  `copyCanvasToClipboard missing in exporters.js`);
assert(exportedFunctions.includes('exportCharacterGrid'),
  `exportCharacterGrid present in exporters.js`,
  `exportCharacterGrid missing in exporters.js`);
assert(exportedFunctions.includes('exportSvgContours'),
  `exportSvgContours present in exporters.js`,
  `exportSvgContours missing in exporters.js`);
assert(exportedClasses.includes('VideoRecorder'),
  `VideoRecorder class present in exporters.js`,
  `VideoRecorder class missing in exporters.js`);

// 8. Event Listener Bindings in src/main.js
console.log("\n[8] EXPORT BINDINGS (src/main.js)");
const mainJsPath = path.join(rootDir, 'src', 'main.js');
const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

parsedExportButtons.forEach(btn => {
  const isBound = mainJsContent.includes(`document.getElementById("${btn.id}")`) ||
                  mainJsContent.includes(`document.getElementById('${btn.id}')`);
  assert(isBound,
    `Button #${btn.id} is bound in main.js`,
    `Button #${btn.id} is NOT bound in main.js`);
});

// Summary
console.log("\n==================================================================");
if (hasFailures) {
  console.error("❌ INVENTORY VERIFICATION FAILED: Registry or source drift detected!");
  console.log("==================================================================\n");
  process.exit(1);
} else {
  console.log("✅ INVENTORY VERIFICATION PASSED: All counts match code registries exactly.");
  console.log("==================================================================\n");
  process.exit(0);
}

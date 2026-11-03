import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const FROZEN_HASHES = {
  "src/dither-engine/algorithms.js": "4ca677060061fafd198683cc90508777725d3d0d3e030f8a97868fcf7088def6",
  "src/dither-engine/effect-stack.js": "5474d98640e15ba9580ae0ee2df128f28a1d84ae395c95ff97a3e7cc0e9dde81",
  "src/dither-engine/exporters.js": "af0c062b18736a67ec4ae2b4a3dbda7dac32b3626f47ac712aef625d9718b7e2",
  "src/dither-engine/palettes.js": "6aafb487f0be64eb24abe4c114a4488512483256b69cfa0e65aaf2fbba3217f5",
  "src/dither-engine/temporal.js": "20140ac20911e85455a29fd772b0e64a5bc484505985dbfd3e07140d572b4584",
  "src/ui/presets.js": "2c531415518af692341b864c59c2e00defc6eb5be2d0c4ffb868cd57bf7c7d93"
};

console.log("==================================================================");
console.log("         DITHERFORGE ENGINE INTEGRITY VERIFICATION                ");
console.log("==================================================================");

let hasMismatch = false;

for (const [relPath, expectedHash] of Object.entries(FROZEN_HASHES)) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`  FAIL: Missing frozen file: ${relPath}`);
    hasMismatch = true;
    continue;
  }
  const fileBuffer = fs.readFileSync(fullPath);
  const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  if (actualHash === expectedHash) {
    console.log(`  PASS: ${relPath}\n        SHA-256: ${actualHash}`);
  } else {
    console.error(`  FAIL: ${relPath}\n        Expected: ${expectedHash}\n        Actual:   ${actualHash}`);
    hasMismatch = true;
  }
}

console.log("==================================================================");
if (hasMismatch) {
  console.error("❌ ENGINE FREEZE VIOLATION: Engine files have been modified!");
  console.log("==================================================================\n");
  process.exit(1);
} else {
  console.log("✅ ENGINE FREEZE VERIFIED: All 6 engine files match golden SHA-256.");
  console.log("==================================================================\n");
  process.exit(0);
}

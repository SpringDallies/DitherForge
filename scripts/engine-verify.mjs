import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const FROZEN_HASHES = {
  "src/dither-engine/algorithms.js": "e637a8b900f99abb59df083a18f5915258d072d336d833c514b5b3fa87f2aa01",
  "src/dither-engine/effect-stack.js": "57cf7cd54301805877c0096ebef5076eff8562aba4e4d7415024ee45cf563989",
  "src/dither-engine/exporters.js": "f0f17a707a437da4129eae8a926a505c5c586bfd6d4c0349e67cd4826fd870f1",
  "src/dither-engine/palettes.js": "4802854ee5d13cb44e6be27074c27e1545310d1aec2359ce3b421b591944a867",
  "src/dither-engine/temporal.js": "f2062d3531bca24e3a4eea3e527845c61efbb58709a661ed3ff58bf4cf2b02fc",
  "src/ui/presets.js": "0bf2f44a341f2d71d635728bb609872ad4982d94b87b9a123349c93fe8b69f37"
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

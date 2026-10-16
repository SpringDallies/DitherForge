import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const FROZEN_HASHES = {
  "src/dither-engine/algorithms.js": "11d9bfd5398749deba4e65257b00d85f95c38684d4d06c66aa1da3f2425b8334",
  "src/dither-engine/effect-stack.js": "b943d25fef517a13ff881a8555849d735e405889bfc071985a6d64ff7f9fe078",
  "src/dither-engine/exporters.js": "af0c062b18736a67ec4ae2b4a3dbda7dac32b3626f47ac712aef625d9718b7e2",
  "src/dither-engine/palettes.js": "6a41e8eed201925ba7726b49f0cda9240ab51cf144bc9431d9e32b14ff48ed5b",
  "src/dither-engine/temporal.js": "20140ac20911e85455a29fd772b0e64a5bc484505985dbfd3e07140d572b4584",
  "src/ui/presets.js": "c9b5989e98ad720e11df75c7a40a88e3f9af9c7fc8527bbe20ef710fd83b98ef"
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

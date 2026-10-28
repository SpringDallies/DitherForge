import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const FROZEN_HASHES = {
  "src/dither-engine/algorithms.js": "dafaae64d6d94910d6c9150b36d534290e4bb476b41280fa2d1b4d0b3ad9695a",
  "src/dither-engine/effect-stack.js": "aee2d36105cb1f783a64103dd0a1fad0bc2fe8054c7536e38a04d4e28251a622",
  "src/dither-engine/exporters.js": "43f0537cddfd950eef403464a5c9e69ac62d3f1de104dd44728008b850fbf292",
  "src/dither-engine/palettes.js": "c6576c97219224c68dd9ee33b343976745889f055096c3b4bb7ff89a90254d5d",
  "src/dither-engine/temporal.js": "f2062d3531bca24e3a4eea3e527845c61efbb58709a661ed3ff58bf4cf2b02fc",
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

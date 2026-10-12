import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const FROZEN_HASHES = {
  "src/dither-engine/algorithms.js": "c3f684abcd8f9054d6fb98afc34748d5ca75953466f837e4d21781e0be0933f9",
  "src/dither-engine/effect-stack.js": "8d1bb8c163fc4d99e49ca5496314c839d514d5db9f2d1da29781c42ee6784976",
  "src/dither-engine/exporters.js": "1028c7f42d34b7b0a26abceb8c205f613bce1334abc7dda2b1b450b9f55dfeba",
  "src/dither-engine/palettes.js": "4802854ee5d13cb44e6be27074c27e1545310d1aec2359ce3b421b591944a867",
  "src/dither-engine/temporal.js": "20140ac20911e85455a29fd772b0e64a5bc484505985dbfd3e07140d572b4584",
  "src/ui/presets.js": "f92f4160cadcd2843cc7808f01a7643f211bf399f82721fce4dd9d93f4d86366"
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

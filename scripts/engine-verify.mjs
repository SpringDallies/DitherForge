import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const FROZEN_HASHES = {
  "src/dither-engine/algorithms.js": "30c80211ab68dd1675840ea3944d2d74af2000aea142cd3611e1eec9547f01d3",
  "src/dither-engine/effect-stack.js": "89e6e880a9bc4957112faef82d712683b6b53b6f78226bff50c565693d7ea95e",
  "src/dither-engine/exporters.js": "43f0537cddfd950eef403464a5c9e69ac62d3f1de104dd44728008b850fbf292",
  "src/dither-engine/palettes.js": "11cff264451f3e26d2c420695d255a20532a1a61b5a8c92ccd30f4722cd5dadc",
  "src/dither-engine/temporal.js": "f2062d3531bca24e3a4eea3e527845c61efbb58709a661ed3ff58bf4cf2b02fc",
  "src/ui/presets.js": "0866830c1769ca92d214c9edd140bf06f5a35064ce1189f45163c2817d0a1a73"
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

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const FROZEN_HASHES = {
  "src/dither-engine/algorithms.js": "0d017e104594cd293cd8f03a5aa3c3f68f0caf86596c1e4dfe08869b0c7c17fe",
  "src/dither-engine/effect-stack.js": "5474d98640e15ba9580ae0ee2df128f28a1d84ae395c95ff97a3e7cc0e9dde81",
  "src/dither-engine/exporters.js": "60d5f791c55ab47e9a27b64b564aee85829767c2ecc5a037a2a71b9207610933",
  "src/dither-engine/palettes.js": "523e5fb9cbb92a7b007399ab35171b2d4690639bbdcb967f7cf7e6cc558ae4c7",
  "src/dither-engine/temporal.js": "ceeccd95bfecd34c9c158245a92a9cc72ba727ffe12e1c26df89169c64b9c4d0",
  "src/ui/presets.js": "68deccd090e17c036fdaf1988d837bd90178b92e3fecec4f936f307881653c1e"
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
  const crlfBuffer = Buffer.from(fileBuffer.toString('utf8').replace(/\r?\n/g, '\r\n'));
  const crlfHash = crypto.createHash('sha256').update(crlfBuffer).digest('hex');

  if (actualHash === expectedHash || crlfHash === expectedHash) {
    console.log(`  PASS: ${relPath}\n        SHA-256: ${actualHash === expectedHash ? actualHash : crlfHash}`);
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

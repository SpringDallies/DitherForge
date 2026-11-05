import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getAllEffects, getEffectDescriptor } from '../../../src/effects/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hashesPath = path.join(__dirname, 'effect-hashes.json');

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

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

console.log("==================================================================");
console.log("       DITHERFORGE PER-EFFECT SPLIT GOLDEN TESTS                  ");
console.log("==================================================================");

let goldenHashes = {};
if (fs.existsSync(hashesPath)) {
  try {
    goldenHashes = JSON.parse(fs.readFileSync(hashesPath, 'utf8'));
  } catch (err) {
    console.warn("Could not parse existing effect-hashes.json:", err.message);
  }
}

const allEffects = getAllEffects();
let passed = 0;
let failed = 0;
let determinismPass = 0;
let determinismFail = 0;
const newHashes = { ...goldenHashes };

for (const eff of allEffects) {
  const test1 = createFixedTestPattern(64, 64);
  const test2 = createFixedTestPattern(64, 64);

  const desc = getEffectDescriptor(eff.id);
  const params = { ...(desc?.defaultParams || {}) };

  // Run 1
  try {
    if (desc?.apply.length >= 4) {
      desc.apply(test1.data, test1.width, test1.height, params, { frameIndex: 0, time: 0, fps: 30 });
    } else {
      desc?.apply(test1, params);
    }
  } catch (e) {
    console.error(`  FAIL [Execution]: ${eff.name} (${eff.id}):`, e.message);
    failed++;
    continue;
  }

  // Run 2 (Determinism check)
  if (desc?.apply.length >= 4) {
    desc.apply(test2.data, test2.width, test2.height, params, { frameIndex: 0, time: 0, fps: 30 });
  } else {
    desc?.apply(test2, params);
  }

  const h1 = hashBuffer(test1.data);
  const h2 = hashBuffer(test2.data);

  if (h1 !== h2) {
    console.error(`  FAIL [Determinism]: ${eff.name} (${eff.id}) produced non-deterministic output!`);
    determinismFail++;
  } else {
    determinismPass++;
  }

  const expectedHash = goldenHashes[eff.id];
  if (!expectedHash) {
    newHashes[eff.id] = h1;
    console.log(`  RECORD: ${eff.name} (${eff.id}) -> ${h1}`);
    passed++;
  } else if (h1 === expectedHash) {
    console.log(`  PASS: ${eff.name} (${eff.id})`);
    passed++;
  } else {
    console.error(`  FAIL [Mismatch]: ${eff.name} (${eff.id})`);
    console.error(`        Expected: ${expectedHash}`);
    console.error(`        Actual:   ${h1}`);
    failed++;
  }
}

fs.writeFileSync(hashesPath, JSON.stringify(newHashes, null, 2) + '\n', 'utf8');

console.log("==================================================================");
console.log(`SUMMARY: ${passed} passed, ${failed} failed | Determinism: ${determinismPass} passed, ${determinismFail} failed`);
console.log("==================================================================");

if (failed > 0 || determinismFail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

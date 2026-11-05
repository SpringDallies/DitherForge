// Full Gate Verification for Agent B's 14 Effects (Phases 4–6)
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { getEffectDescriptor, applyEffectPipeline } from '../src/effects/index.ts';
import { clearFrameEchoHistory } from '../src/effects/glitch/frameEcho.ts';

console.log('==================================================================');
console.log('       FULL GATE VERIFICATION: AGENT B 14 EFFECTS                 ');
console.log('==================================================================');

const AGENT_B_EFFECT_IDS = [
  // Phase 4 Print
  'risoMisreg',
  'photocopy',
  'paperTexture',
  'rosetteAngles',

  // Phase 5 Glitch
  'bitCrush',
  'sliceGlitch',
  'blockDisplacement',
  'frameEcho',

  // Phase 6 Color
  'splitToning',
  'filmFade',
  'posterize',
  'outline',
  'solarize',
  'blueprint'
];

/**
 * Creates a comprehensive visual test pattern with gradients, geometric shapes,
 * and high-contrast edges to thoroughly exercise spatial kernels and color operations.
 */
function createGateTestPattern(w = 128, h = 128) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      // Base gradient
      let r = Math.floor((x / (w - 1)) * 255);
      let g = Math.floor((y / (h - 1)) * 255);
      let b = Math.floor(((x + y) / (w + h - 2)) * 255);

      // Inset geometric contrast rectangle to exercise edge operators (Sobel, Photocopy)
      if (x >= 32 && x <= 96 && y >= 32 && y <= 96) {
        r = (r + 140) & 255;
        g = (g ^ 200) & 255;
        b = (b + 80) & 255;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

function hashBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const gateResults = [];

console.log('\n--- 1. Testing Each Effect Alone (Preview, Alpha, Determinism) ---');
for (const effId of AGENT_B_EFFECT_IDS) {
  const desc = getEffectDescriptor(effId);
  assert.ok(desc, `Effect descriptor for ${effId} must exist`);

  const img1 = createGateTestPattern(128, 128);
  const img2 = createGateTestPattern(128, 128);
  const originalHash = hashBuffer(img1.data);

  // For frameEcho, temporal=false exercises the static preview spatial echo
  const params = effId === 'frameEcho'
    ? { ...(desc.defaultParams || {}), temporal: false }
    : { ...(desc.defaultParams || {}) };

  const context = { frameIndex: 0, time: 0, fps: 30 };

  let error = null;
  const t0 = performance.now();
  try {
    clearFrameEchoHistory();
    applyEffectPipeline(img1, [{ id: effId, enabled: true, params, opacity: 1.0, blendMode: 'normal' }], context, getEffectDescriptor);
    clearFrameEchoHistory();
    applyEffectPipeline(img2, [{ id: effId, enabled: true, params, opacity: 1.0, blendMode: 'normal' }], context, getEffectDescriptor);
  } catch (err) {
    error = err;
  }
  const duration = performance.now() - t0;

  if (error) {
    console.error(`  FAIL: ${desc.name} (${effId}): ${error.message}`);
    gateResults.push({ id: effId, name: desc.name, pass: false, error: error.message });
    continue;
  }

  const h1 = hashBuffer(img1.data);
  const h2 = hashBuffer(img2.data);

  // 1. Must be deterministic
  const isDeterministic = h1 === h2;
  // 2. Must not be a silent no-op
  const hasModified = h1 !== originalHash;
  // 3. Must preserve alpha
  let alphaPreserved = true;
  for (let i = 3; i < img1.data.length; i += 4) {
    if (img1.data[i] !== 255) {
      alphaPreserved = false;
      break;
    }
  }
  // 4. No NaNs or invalid values
  let valuesValid = true;
  for (let i = 0; i < img1.data.length; i++) {
    const val = img1.data[i];
    if (Number.isNaN(val) || val < 0 || val > 255) {
      valuesValid = false;
      break;
    }
  }

  const passed = isDeterministic && hasModified && alphaPreserved && valuesValid;
  gateResults.push({
    id: effId,
    name: desc.name,
    pass: passed,
    durationMs: duration / 2,
    details: { isDeterministic, hasModified, alphaPreserved, valuesValid }
  });

  if (passed) {
    console.log(`  PASS: ${desc.name.padEnd(30)} [${effId.padEnd(18)}] | ${(duration / 2).toFixed(2).padStart(6)}ms | Det: OK | Alpha: OK | Mod: OK`);
  } else {
    console.error(`  FAIL: ${desc.name} [${effId}] | Det: ${isDeterministic}, Mod: ${hasModified}, Alpha: ${alphaPreserved}, Val: ${valuesValid}`);
  }
}

console.log('\n--- 2. Testing All 14 Effects Stacked Together in Full Pipeline ---');
const stackImg1 = createGateTestPattern(128, 128);
const stackImg2 = createGateTestPattern(128, 128);
const stackEffects = AGENT_B_EFFECT_IDS.map((id) => ({
  id,
  enabled: true,
  params: id === 'frameEcho' ? { temporal: false } : {},
  opacity: 0.85,
  blendMode: 'normal'
}));

clearFrameEchoHistory();
const tStack0 = performance.now();
applyEffectPipeline(stackImg1, stackEffects, { frameIndex: 0, time: 0, fps: 30 }, getEffectDescriptor);
clearFrameEchoHistory();
applyEffectPipeline(stackImg2, stackEffects, { frameIndex: 0, time: 0, fps: 30 }, getEffectDescriptor);
const stackDuration = (performance.now() - tStack0) / 2;

const stackHash1 = hashBuffer(stackImg1.data);
const stackHash2 = hashBuffer(stackImg2.data);
assert.equal(stackHash1, stackHash2, 'Stacked 14-effect pipeline must produce deterministic output');

let stackAlphaIntact = true;
for (let i = 3; i < stackImg1.data.length; i += 4) {
  if (stackImg1.data[i] !== 255) {
    stackAlphaIntact = false;
    break;
  }
}
assert.ok(stackAlphaIntact, 'Stacked 14-effect pipeline must preserve alpha');
console.log(`  PASS: Stacked 14-effect pipeline verified in ${stackDuration.toFixed(2)}ms (Deterministic: OK, Alpha: OK)`);

console.log('\n==================================================================');
const allPassed = gateResults.every((r) => r.pass);
if (allPassed) {
  console.log(`✅ FULL GATE VERIFICATION PASSED: All 14 Agent B effects verified alone and stacked`);
  process.exit(0);
} else {
  console.error(`❌ FULL GATE VERIFICATION FAILED`);
  process.exit(1);
}

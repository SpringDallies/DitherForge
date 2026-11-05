// Phase 6 - Color / Stylization Effects Test Suite
import assert from 'node:assert/strict';
import {
  colorEffects,
  splitToningEffect,
  filmFadeEffect,
  posterizeEffect,
  outlineEffect,
  solarizeEffect,
  blueprintEffect
} from '../../src/effects/color/index.ts';

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL: ${name}\n        ${err.message}`);
  }
}

console.log('==================================================================');
console.log('       DITHERFORGE PHASE 6 (COLOR EFFECTS) TEST SUITE             ');
console.log('==================================================================');

test('all 6 color effects exported and have valid descriptors', () => {
  assert.equal(colorEffects.length, 6, 'Must have 6 color effects');
  const ids = colorEffects.map(e => e.id).sort();
  assert.deepEqual(ids, [
    'blueprint_cyanotype',
    'film_fade',
    'outline_overlay',
    'posterize_post',
    'solarize',
    'split_toning'
  ]);

  for (const eff of colorEffects) {
    assert.equal(eff.category, 'color');
    assert.equal(typeof eff.apply, 'function');
    assert.ok(eff.defaultParams);
    assert.ok(eff.paramsMeta || eff.params);
  }
});

test('Split Toning applies warm shadows and cool highlights while preserving alpha', () => {
  const width = 16;
  const height = 16;
  const data = new Uint8ClampedArray(width * height * 4);

  // Top half shadow (dark), bottom half highlight (bright)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const v = y < 8 ? 30 : 220;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 190;
    }
  }

  splitToningEffect.apply(data, width, height, {
    shadowColor: '#ff2000', // strong red in shadows
    shadowStrength: 0.8,
    highlightColor: '#0020ff', // strong blue in highlights
    highlightStrength: 0.8,
    balance: 0.0
  });

  // Check shadow pixel: Red should be boosted
  const shadowIdx = 0;
  assert.ok(data[shadowIdx] > data[shadowIdx + 2], 'Shadow red should exceed shadow blue');

  // Check highlight pixel: Blue should be boosted
  const highlightIdx = (12 * width + 8) * 4;
  assert.ok(data[highlightIdx + 2] > data[highlightIdx], 'Highlight blue should exceed highlight red');

  // Check alpha preservation
  for (let i = 3; i < data.length; i += 4) {
    assert.equal(data[i], 190, 'Split toning must preserve alpha channel');
  }
});

test('Film Fade lifts blacks and rolls highlights while preserving alpha', () => {
  const width = 4;
  const height = 4;
  const data = new Uint8ClampedArray(width * height * 4);
  // Pixel 0 is pure black (0), Pixel 1 is pure white (255)
  data[0] = 0; data[1] = 0; data[2] = 0; data[3] = 240;
  data[4] = 255; data[5] = 255; data[6] = 255; data[7] = 240;

  filmFadeEffect.apply(data, width, height, {
    blackLift: 30,
    highlightRoll: 25,
    midtoneShift: 0.0
  });

  // Black lifted: should be around 30
  assert.ok(data[0] >= 28 && data[0] <= 32, `Black must be lifted to ~30, got ${data[0]}`);
  // White rolled: should be around 230 (255 - 25)
  assert.ok(data[4] >= 228 && data[4] <= 232, `White must be rolled to ~230, got ${data[4]}`);

  assert.equal(data[3], 240, 'Alpha must remain preserved');
  assert.equal(data[7], 240, 'Alpha must remain preserved');
});

test('Posterize (Post) quantizes continuous gradient into discrete tonal steps', () => {
  const width = 256;
  const height = 1;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let x = 0; x < 256; x++) {
    const idx = x * 4;
    data[idx] = x;
    data[idx + 1] = x;
    data[idx + 2] = x;
    data[idx + 3] = 255;
  }

  posterizeEffect.apply(data, width, height, {
    levels: 4,
    gamma: 1.0
  });

  // Measure distinct color values across the line
  const uniqueVals = new Set();
  for (let x = 0; x < 256; x++) {
    uniqueVals.add(data[x * 4]);
  }

  assert.ok(uniqueVals.size <= 4, `4 levels must yield <= 4 distinct values, got ${uniqueVals.size}`);
  for (let i = 3; i < data.length; i += 4) {
    assert.equal(data[i], 255, 'Posterize must preserve alpha');
  }
});

test('Outline / Edge Overlay detects Sobel edges and expands with thickness', () => {
  const width = 32;
  const height = 32;

  function makeStepImage() {
    const d = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const val = x < 16 ? 0 : 255; // sharp vertical edge at x=16
        d[idx] = val;
        d[idx + 1] = val;
        d[idx + 2] = val;
        d[idx + 3] = 255;
      }
    }
    return d;
  }

  const d1 = makeStepImage();
  const d2 = makeStepImage();

  // Thickness 1
  outlineEffect.apply(d1, width, height, {
    threshold: 0.1,
    thickness: 1,
    color: '#ff0000',
    blend: 'normal',
    opacity: 1.0
  });

  // Thickness 2
  outlineEffect.apply(d2, width, height, {
    threshold: 0.1,
    thickness: 2,
    color: '#ff0000',
    blend: 'normal',
    opacity: 1.0
  });

  let countD1 = 0;
  let countD2 = 0;
  for (let i = 0; i < d1.length; i += 4) {
    if (d1[i] === 255 && d1[i + 1] === 0 && d1[i + 2] === 0) countD1++;
    if (d2[i] === 255 && d2[i + 1] === 0 && d2[i + 2] === 0) countD2++;
  }

  assert.ok(countD1 > 0, 'Outline must detect step edge at x=16');
  assert.ok(countD2 > countD1, `Thickness 2 (${countD2}) must produce more edge pixels than thickness 1 (${countD1})`);

  for (let i = 3; i < d1.length; i += 4) {
    assert.equal(d1[i], 255, 'Outline must preserve alpha');
  }
});

test('Solarize inverts values above threshold with smooth softness', () => {
  const width = 10;
  const height = 10;
  const data = new Uint8ClampedArray(width * height * 4);
  // Pixels with low (50) and high (220) values
  for (let i = 0; i < data.length; i += 4) {
    const isHigh = (i / 4) >= 50;
    const v = isHigh ? 220 : 50;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 222;
  }

  solarizeEffect.apply(data, width, height, {
    threshold: 0.5, // 128
    softness: 0.0,
    perChannel: false
  });

  // Below threshold: 50 remains 50
  assert.equal(data[0], 50, 'Values below threshold must not invert');
  // Above threshold: 220 inverts to 255 - 220 = 35
  const highIdx = 50 * 4;
  assert.equal(data[highIdx], 35, 'Values above threshold must invert to 35');

  for (let i = 3; i < data.length; i += 4) {
    assert.equal(data[i], 222, 'Solarize must preserve alpha');
  }
});

test('Blueprint / Cyanotype inverts tone map and draws drafting grid', () => {
  const width = 48;
  const height = 48;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255); // bright white input
  for (let i = 3; i < data.length; i += 4) data[i] = 200;

  blueprintEffect.apply(data, width, height, {
    tint: '#0a2f64',
    gridSize: 16,
    gridOpacity: 0.5,
    invert: true
  });

  // Because input was white (255) and invert=true, inverted luminance is dark -> tinted navy/prussian
  const nonGridIdx = (5 * width + 5) * 4;
  assert.ok(data[nonGridIdx + 2] > data[nonGridIdx], 'Prussian cyan should have high blue component');

  // On grid line (x=16): grid color blended in
  const gridIdx = (5 * width + 16) * 4;
  assert.ok(data[gridIdx + 2] !== data[nonGridIdx + 2] || data[gridIdx] !== data[nonGridIdx], 'Grid line should alter color');

  for (let i = 3; i < data.length; i += 4) {
    assert.equal(data[i], 200, 'Blueprint must preserve alpha');
  }
});

console.log('==================================================================');
if (failures === 0) {
  console.log('✅ ALL PHASE 6 COLOR EFFECT TESTS PASSED');
} else {
  console.error(`❌ ${failures} TEST(S) FAILED`);
  process.exit(1);
}

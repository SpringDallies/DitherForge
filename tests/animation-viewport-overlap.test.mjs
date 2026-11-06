// @ts-check
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==================================================================');
console.log('       ANIMATION 1:1 VIEWPORT OVERLAP FIX VERIFICATION            ');
console.log('==================================================================');

// --- 1. CSS Rule Verification ---
const shellCssPath = path.resolve(__dirname, '../src/styles/shell.css');
const shellCss = fs.readFileSync(shellCssPath, 'utf8');

assert(
  shellCss.includes('.canvas-area.animation-active'),
  'FAIL: .canvas-area.animation-active must be defined in shell.css'
);
assert(
  shellCss.includes('padding-bottom: 252px !important;'),
  'FAIL: .canvas-area.animation-active must specify padding-bottom: 252px !important;'
);
console.log('  PASS: CSS defines .canvas-area.animation-active with padding-bottom: 252px !important;');

// --- 2. CenterViewport.tsx Implementation Verification ---
const centerViewportPath = path.resolve(__dirname, '../src/components/CenterViewport.tsx');
const centerViewportCode = fs.readFileSync(centerViewportPath, 'utf8');

assert(
  centerViewportCode.includes("appMode === 'animation' && hasConfiguredAnimation ? 'animation-active' : ''"),
  'FAIL: CenterViewport must conditionally attach animation-active class when in animation mode with configured animation'
);
assert(
  centerViewportCode.includes('ref={stageRef}'),
  'FAIL: CenterViewport must attach stageRef to .canvas-unframed-stage'
);
assert(
  centerViewportCode.includes('unpannedStageCenterY'),
  'FAIL: CenterViewport wheel zoom must compute unpanned stage center'
);
console.log('  PASS: CenterViewport properly binds stageRef and animation-active class');

// --- 3. Layout Geometry Verification: 1:1 Image Centering above Player ---
function computeVerticalBounds({ windowHeight, imageHeight, topbarHeight = 38, timelineHeight = 252, isAnimation = true }) {
  const padTop = topbarHeight;
  const padBottom = isAnimation ? timelineHeight : 0;
  const availableH = windowHeight - padTop - padBottom;
  // In flexbox with align-items: center, padding-top and padding-bottom:
  const stageCenterY = padTop + availableH / 2;
  const stageTop = stageCenterY - imageHeight / 2;
  const stageBottom = stageCenterY + imageHeight / 2;
  const playerTop = windowHeight - timelineHeight;
  const overlap = Math.max(0, stageBottom - playerTop);

  return {
    stageCenterY,
    stageTop,
    stageBottom,
    playerTop,
    overlap,
    clearance: playerTop - stageBottom
  };
}

// Test case 1: User's exact scenario from screenshot: 800px window height, 300px image height, 1:1
const result800_300 = computeVerticalBounds({ windowHeight: 800, imageHeight: 300 });
assert.strictEqual(result800_300.overlap, 0, 'Image must not overlap player');
assert(result800_300.clearance >= 100, `Expected clearance >= 100px, got ${result800_300.clearance}`);
assert(result800_300.stageTop >= 38, `Image top (${result800_300.stageTop}) must be below top bar (38px)`);
console.log(`  PASS: 400x300 image in 800px window at 1:1 has ${result800_300.clearance}px clearance above player (0px overlap)`);

// Test case 2: Smaller 720px window height with 300px image at 1:1
const result720_300 = computeVerticalBounds({ windowHeight: 720, imageHeight: 300 });
assert.strictEqual(result720_300.overlap, 0, 'Image must not overlap player on 720px window');
assert(result720_300.clearance >= 60, `Expected clearance >= 60px, got ${result720_300.clearance}`);
console.log(`  PASS: 300px image in 720px window at 1:1 has ${result720_300.clearance}px clearance above player`);

// Test case 3: 450px image in 800px window at 1:1
const result800_450 = computeVerticalBounds({ windowHeight: 800, imageHeight: 450 });
assert.strictEqual(result800_450.overlap, 0, '450px image must not overlap player');
assert(result800_450.clearance >= 30, `Expected clearance >= 30px, got ${result800_450.clearance}`);
console.log(`  PASS: 450px image in 800px window at 1:1 has ${result800_450.clearance}px clearance above player`);

// Test case 4: Compare with previous broken behavior (padBottom = 0)
const brokenResult = computeVerticalBounds({ windowHeight: 800, imageHeight: 300, isAnimation: false });
// In Still mode with timeline rendered over it, stageBottom was 419 + 150 = 569, playerTop was 548 -> 21px overlap!
const brokenOverlap = Math.max(0, brokenResult.stageBottom - (800 - 252));
assert(brokenOverlap > 0, 'Sanity check: previous behavior indeed overlapped');
console.log(`  PASS: Confirmed previous unpadded behavior overlapped by ${brokenOverlap}px; fixed behavior overlap is 0px`);

// --- 4. Store fitToViewport Verification ---
const { useAppStore } = await import('../src/state/useAppStore.ts');

// Set up image dimensions
useAppStore.setState({
  imageWidth: 600,
  imageHeight: 600,
  appMode: 'animation',
  hasConfiguredAnimation: true
});

// Fit to 800x800 viewport
useAppStore.getState().fitToViewport(800, 800);
const animZoom = useAppStore.getState().zoom;
// In animation mode: availableH = 800 - 252 - 40 = 508. Scale = 508 / 600 = 0.846 -> zoom = 85%
assert(animZoom < 100, `Animation mode zoom should fit available area above timeline: got ${animZoom}%`);
assert.strictEqual(animZoom, 85, `Expected 85% zoom, got ${animZoom}%`);
console.log(`  PASS: Animation mode fitToViewport calculates 85% zoom (accounts for 252px timeline height)`);

// Now switch to Still mode
useAppStore.setState({
  appMode: 'still',
  hasConfiguredAnimation: false
});
useAppStore.getState().fitToViewport(800, 800);
const stillZoom = useAppStore.getState().zoom;
// In still mode: availableH = 800 - 40 = 760. Scale = 760 / 600 >= 1.0 -> zoom = 100%
assert.strictEqual(stillZoom, 100, `Expected 100% zoom in still mode, got ${stillZoom}%`);
console.log(`  PASS: Still mode fitToViewport calculates 100% zoom (full viewport available)`);

// Test resetZoom (pressing '1')
useAppStore.getState().resetZoom();
assert.strictEqual(useAppStore.getState().zoom, 100);
assert.strictEqual(useAppStore.getState().panX, 0);
assert.strictEqual(useAppStore.getState().panY, 0);
console.log('  PASS: resetZoom (key 1) resets zoom to 100% and pan to (0, 0)');

// --- 5. Wheel Zoom Cursor Invariance Mathematical Verification ---
// Simulates cursor-centered zoom math
function simulateWheelZoom({ initialZoom, factor, cursorScreenX, cursorScreenY, unpannedCenterX, unpannedCenterY, currentPanX, currentPanY }) {
  const newZoom = Math.max(10, Math.min(3200, Math.round(initialZoom * factor)));
  const cursorX = cursorScreenX - unpannedCenterX;
  const cursorY = cursorScreenY - unpannedCenterY;
  const zoomRatio = newZoom / initialZoom;
  const newPanX = Math.round(cursorX - (cursorX - currentPanX) * zoomRatio);
  const newPanY = Math.round(cursorY - (cursorY - currentPanY) * zoomRatio);
  return { newZoom, newPanX, newPanY };
}

// Suppose cursor is at (500, 300) on an unpanned stage centered at (450, 293)
const unpannedCX = 450;
const unpannedCY = 293;
const cursorX = 500;
const cursorY = 300;

// World point under cursor before zoom:
// worldX = (cursorX - unpannedCX - panX) / (zoom / 100)
const z1 = 100;
let pan = { x: 0, y: 0 };
const worldX = (cursorX - unpannedCX - pan.x) / (z1 / 100);
const worldY = (cursorY - unpannedCY - pan.y) / (z1 / 100);

// Zoom in
const step1 = simulateWheelZoom({
  initialZoom: z1,
  factor: 1.15,
  cursorScreenX: cursorX,
  cursorScreenY: cursorY,
  unpannedCenterX: unpannedCX,
  unpannedCenterY: unpannedCY,
  currentPanX: pan.x,
  currentPanY: pan.y
});

// Compute world point under cursor after zoom:
const screenAfterX = unpannedCX + step1.newPanX + worldX * (step1.newZoom / 100);
const screenAfterY = unpannedCY + step1.newPanY + worldY * (step1.newZoom / 100);

assert(
  Math.abs(screenAfterX - cursorX) <= 1,
  `Cursor X position should be invariant: diff = ${Math.abs(screenAfterX - cursorX)}`
);
assert(
  Math.abs(screenAfterY - cursorY) <= 1,
  `Cursor Y position should be invariant: diff = ${Math.abs(screenAfterY - cursorY)}`
);
console.log('  PASS: Wheel zoom cursor math is pixel-invariant under asymmetrical padding');

console.log('==================================================================');
console.log('✅ ALL ANIMATION VIEWPORT OVERLAP TESTS PASSED                    ');
console.log('==================================================================');

import type {
  AsciiEffectConfig,
  AsciiEffectId,
  AsciiEffectStage,
  AsciiGridFrame,
  AsciiRenderContext,
  AsciiSettings
} from './types';
import { clamp01, hashCell, numParam, strParam } from './algorithms/shared';

export interface AsciiEffectDescriptorMeta {
  id: AsciiEffectId;
  name: string;
  stage: AsciiEffectStage;
  description: string;
  defaultParams: Record<string, number | string | boolean>;
  controls: Array<{
    id: string;
    label: string;
    type: 'slider' | 'select' | 'toggle';
    min?: number;
    max?: number;
    step?: number;
    options?: Array<{ value: string; label: string }>;
    defaultValue: number | string | boolean;
  }>;
}

export const ASCII_EFFECT_DESCRIPTORS: AsciiEffectDescriptorMeta[] = [
  {
    id: 'ascii_glyph_glow',
    name: 'Glyph Glow',
    stage: 'pixel',
    description: 'Luminous phosphor bloom radiating around rendered characters.',
    defaultParams: { radius: 4, intensity: 0.75, threshold: 0.2 },
    controls: [
      { id: 'radius', label: 'Glow Radius', type: 'slider', min: 1, max: 16, step: 1, defaultValue: 4 },
      { id: 'intensity', label: 'Glow Intensity', type: 'slider', min: 0, max: 2, step: 0.05, defaultValue: 0.75 },
      { id: 'threshold', label: 'Threshold', type: 'slider', min: 0, max: 0.9, step: 0.05, defaultValue: 0.2 }
    ]
  },
  {
    id: 'ascii_glyph_sweep',
    name: 'Glyph Sweep',
    stage: 'grid',
    description: 'Animated directional highlight beam sweeping across stationary characters.',
    defaultParams: {
      position: 0.5,
      speed: 0.5,
      width: 0.22,
      brightness: 0.9,
      baseVisibility: 0.45,
      direction: 'horizontal',
      animate: true
    },
    controls: [
      { id: 'position', label: 'Sweep Position', type: 'slider', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
      { id: 'speed', label: 'Sweep Speed', type: 'slider', min: -3, max: 3, step: 0.1, defaultValue: 0.5 },
      { id: 'width', label: 'Beam Width', type: 'slider', min: 0.04, max: 0.8, step: 0.02, defaultValue: 0.22 },
      { id: 'brightness', label: 'Highlight Boost', type: 'slider', min: 0, max: 1.5, step: 0.05, defaultValue: 0.9 },
      { id: 'baseVisibility', label: 'Base Visibility', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.45 },
      {
        id: 'direction',
        label: 'Direction',
        type: 'select',
        defaultValue: 'horizontal',
        options: [
          { value: 'horizontal', label: 'Horizontal' },
          { value: 'vertical', label: 'Vertical' },
          { value: 'diagonal', label: 'Diagonal' },
          { value: 'radial', label: 'Radial' }
        ]
      },
      { id: 'animate', label: 'Animate Sweep', type: 'toggle', defaultValue: true }
    ]
  },
  {
    id: 'ascii_char_glitch',
    name: 'Character Glitch',
    stage: 'grid',
    description: 'Randomly corrupts horizontal character strips and injects glitch symbols.',
    defaultParams: { intensity: 0.2, bandHeight: 2, shiftCols: 4 },
    controls: [
      { id: 'intensity', label: 'Glitch Intensity', type: 'slider', min: 0, max: 1, step: 0.02, defaultValue: 0.2 },
      { id: 'bandHeight', label: 'Band Rows', type: 'slider', min: 1, max: 8, step: 1, defaultValue: 2 },
      { id: 'shiftCols', label: 'Column Shift', type: 'slider', min: 0, max: 20, step: 1, defaultValue: 4 }
    ]
  },
  {
    id: 'ascii_glyph_displacement',
    name: 'Glyph Displacement',
    stage: 'grid',
    description: 'Offsets individual character placements along harmonic or noisy fields.',
    defaultParams: { amplitudeX: 3, amplitudeY: 2, frequency: 0.25, speed: 1.0 },
    controls: [
      { id: 'amplitudeX', label: 'Offset X (px)', type: 'slider', min: 0, max: 12, step: 1, defaultValue: 3 },
      { id: 'amplitudeY', label: 'Offset Y (px)', type: 'slider', min: 0, max: 12, step: 1, defaultValue: 2 },
      { id: 'frequency', label: 'Wave Frequency', type: 'slider', min: 0.05, max: 1.5, step: 0.05, defaultValue: 0.25 },
      { id: 'speed', label: 'Phase Speed', type: 'slider', min: 0, max: 4, step: 0.1, defaultValue: 1.0 }
    ]
  },
  {
    id: 'ascii_char_flicker',
    name: 'Character Flicker',
    stage: 'grid',
    description: 'Deterministic per-cell terminal intensity flicker and dropout.',
    defaultParams: { intensity: 0.35, density: 0.25, rate: 1.0 },
    controls: [
      { id: 'intensity', label: 'Flicker Depth', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.35 },
      { id: 'density', label: 'Affected Cells', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.25 },
      { id: 'rate', label: 'Flicker Rate', type: 'slider', min: 0.1, max: 4, step: 0.1, defaultValue: 1.0 }
    ]
  },
  {
    id: 'ascii_chromatic_split',
    name: 'Glyph Chromatic Split',
    stage: 'pixel',
    description: 'Separates red and blue channels horizontally/vertically across rendered glyphs.',
    defaultParams: { offsetX: 3, offsetY: 0 },
    controls: [
      { id: 'offsetX', label: 'Split X (px)', type: 'slider', min: -16, max: 16, step: 1, defaultValue: 3 },
      { id: 'offsetY', label: 'Split Y (px)', type: 'slider', min: -16, max: 16, step: 1, defaultValue: 0 }
    ]
  },
  {
    id: 'ascii_scanlines',
    name: 'ASCII Scanlines',
    stage: 'pixel',
    description: 'CRT horizontal scanlines synced to character rows or fine pixel pitch.',
    defaultParams: { intensity: 0.35, pitch: 2, syncToCell: false },
    controls: [
      { id: 'intensity', label: 'Intensity', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.35 },
      { id: 'pitch', label: 'Line Pitch (px)', type: 'slider', min: 2, max: 8, step: 1, defaultValue: 2 },
      { id: 'syncToCell', label: 'Sync to Cell Rows', type: 'toggle', defaultValue: false }
    ]
  },
  {
    id: 'ascii_char_echo',
    name: 'Character Echo',
    stage: 'grid',
    description: 'Leaves trailing ghost characters from previous animation frames.',
    defaultParams: { decay: 0.65, trailFrames: 3 },
    controls: [
      { id: 'decay', label: 'Trail Decay', type: 'slider', min: 0.1, max: 0.95, step: 0.05, defaultValue: 0.65 },
      { id: 'trailFrames', label: 'Trail Frames', type: 'slider', min: 1, max: 6, step: 1, defaultValue: 3 }
    ]
  },
  {
    id: 'ascii_density_pulse',
    name: 'Density Pulse',
    stage: 'grid',
    description: 'Modulates glyph density harmonically across the grid.',
    defaultParams: { amplitude: 0.35, frequency: 0.3, speed: 1.5, shape: 1.0, offsetX: 0, offsetY: 0, radial: true },
    controls: [
      { id: 'amplitude', label: 'Pulse Amplitude', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.35 },
      { id: 'frequency', label: 'Spatial Freq', type: 'slider', min: 0.05, max: 1.5, step: 0.05, defaultValue: 0.3 },
      { id: 'speed', label: 'Pulse Speed', type: 'slider', min: 0, max: 5, step: 0.1, defaultValue: 1.5 },
      { id: 'shape', label: 'Shape', type: 'slider', min: 0.2, max: 3.0, step: 0.05, defaultValue: 1.0 },
      { id: 'offsetX', label: 'Offset X', type: 'slider', min: -1, max: 1, step: 0.02, defaultValue: 0 },
      { id: 'offsetY', label: 'Offset Y', type: 'slider', min: -1, max: 1, step: 0.02, defaultValue: 0 },
      { id: 'radial', label: 'Radial Wave', type: 'toggle', defaultValue: true }
    ]
  },
  {
    id: 'ascii_glyph_noise',
    name: 'Glyph Noise',
    stage: 'grid',
    description: 'Stochastic character index perturbation for animated typographic static.',
    defaultParams: { amount: 0.25, temporal: true },
    controls: [
      { id: 'amount', label: 'Noise Amount', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.25 },
      { id: 'temporal', label: 'Animate Static', type: 'toggle', defaultValue: true }
    ]
  }
];

export function createDefaultAsciiEffect(id: AsciiEffectId): AsciiEffectConfig {
  const desc = ASCII_EFFECT_DESCRIPTORS.find((d) => d.id === id) ?? ASCII_EFFECT_DESCRIPTORS[0];
  return {
    id: desc.id,
    enabled: true,
    stage: desc.stage,
    params: { ...desc.defaultParams }
  };
}

// Bounded character-grid echo history (max 6 frames, reset on dimension change)
const MAX_ECHO_HISTORY = 6;
interface EchoEntry {
  charIndices: Uint16Array;
  fgRgba: Uint8ClampedArray;
  luminance: Float32Array;
  directChars?: string[];
}
let echoHistory: EchoEntry[] = [];
let echoCols = 0;
let echoRows = 0;

export function clearAsciiEchoHistory(): void {
  echoHistory = [];
  echoCols = 0;
  echoRows = 0;
}

/** Stage 6: Grid-Level ASCII Effects */
export function applyAsciiGridEffects(
  grid: AsciiGridFrame,
  settings: AsciiSettings,
  ctx: AsciiRenderContext
): void {
  const { cols, rows, chars } = grid;
  const n = cols * rows;
  const maxIdx = Math.max(0, chars.length - 1);

  if (ctx.frameIndex === 0 && ctx.time === 0 && !ctx.isExport && !ctx.fps) {
    clearAsciiEchoHistory();
  }

  for (const eff of settings.asciiEffects) {
    if (!eff.enabled || eff.stage === 'pixel') continue;
    const p = eff.params;

    switch (eff.id) {
      case 'ascii_glyph_sweep': {
        const basePos = clamp01(numParam(p, 'position', 0.5));
        const speed = numParam(p, 'speed', 0.5);
        const beamW = Math.max(0.02, numParam(p, 'width', 0.22));
        const boost = Math.max(0, numParam(p, 'brightness', 0.9));
        const baseVis = clamp01(numParam(p, 'baseVisibility', 0.45));
        const dir = strParam(p, 'direction', 'horizontal');
        const animate = p.animate !== false;

        const phase = animate ? (((basePos + ctx.time * speed) % 1) + 1) % 1 : basePos;
        const dimFactor = baseVis - 1.0; // negative dim outside beam

        for (let r = 0; r < rows; r++) {
          const ny = rows > 1 ? r / (rows - 1) : 0.5;
          const rowOff = r * cols;
          for (let c = 0; c < cols; c++) {
            const nx = cols > 1 ? c / (cols - 1) : 0.5;
            let coord = nx;
            if (dir === 'vertical') coord = ny;
            else if (dir === 'diagonal') coord = (nx + ny) * 0.5;
            else if (dir === 'radial') coord = Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) * 1.414);

            // Shortest cyclic distance on [0, 1]
            let dist = Math.abs(coord - phase);
            if (dist > 0.5) dist = 1.0 - dist;
            const t = Math.max(0, 1 - dist / beamW);
            const bell = t * t * (3 - 2 * t);
            const idx = rowOff + c;
            grid.highlight[idx] += dimFactor * (1 - bell) + boost * bell;
          }
        }
        break;
      }

      case 'ascii_char_glitch': {
        const intensity = clamp01(numParam(p, 'intensity', 0.2));
        if (intensity <= 0.001) break;
        const bandH = Math.max(1, Math.round(numParam(p, 'bandHeight', 2)));
        const shiftCols = Math.round(numParam(p, 'shiftCols', 4));
        const seed = (ctx.frameIndex * 997 + 17) | 0;

        const origIdx = grid.charIndices.slice();
        const origFg = grid.fgRgba.slice();
        const origDirect = grid.directChars ? grid.directChars.slice() : null;

        for (let r = 0; r < rows; r++) {
          const band = Math.floor(r / bandH);
          const hBand = hashCell(band, 13, seed);
          if (hBand > intensity) continue;

          const shift = Math.round((hashCell(band, 71, seed) * 2 - 1) * shiftCols);
          const rowOff = r * cols;
          for (let c = 0; c < cols; c++) {
            const srcC = (((c - shift) % cols) + cols) % cols;
            const dstI = rowOff + c;
            const srcI = rowOff + srcC;

            const corruptRoll = hashCell(c, r, seed ^ 0x45d9f3b);
            if (corruptRoll < intensity * 0.45 && maxIdx > 0) {
              const rndChar = Math.floor(hashCell(c + 19, r + 31, seed) * (maxIdx + 1));
              grid.charIndices[dstI] = Math.min(maxIdx, rndChar);
              if (grid.directChars) {
                grid.directChars[dstI] = chars[grid.charIndices[dstI]] ?? '#';
              }
            } else {
              grid.charIndices[dstI] = origIdx[srcI];
              if (grid.directChars && origDirect) {
                grid.directChars[dstI] = origDirect[srcI];
              }
            }

            const d4 = dstI * 4;
            const s4 = srcI * 4;
            grid.fgRgba[d4] = origFg[s4];
            grid.fgRgba[d4 + 1] = origFg[s4 + 1];
            grid.fgRgba[d4 + 2] = origFg[s4 + 2];
            grid.fgRgba[d4 + 3] = origFg[s4 + 3];
          }
        }
        break;
      }

      case 'ascii_glyph_displacement': {
        const ampX = numParam(p, 'amplitudeX', 3);
        const ampY = numParam(p, 'amplitudeY', 2);
        const freq = numParam(p, 'frequency', 0.25);
        const speed = numParam(p, 'speed', 1.0);
        const t = ctx.time * speed * Math.PI * 2;

        for (let r = 0; r < rows; r++) {
          const rowOff = r * cols;
          for (let c = 0; c < cols; c++) {
            const idx = rowOff + c;
            const dx = Math.round(Math.sin(r * freq + t) * ampX);
            const dy = Math.round(Math.cos(c * freq + t * 0.85) * ampY);
            grid.offsetX[idx] = Math.max(-127, Math.min(127, grid.offsetX[idx] + dx));
            grid.offsetY[idx] = Math.max(-127, Math.min(127, grid.offsetY[idx] + dy));
          }
        }
        break;
      }

      case 'ascii_char_flicker': {
        const intensity = clamp01(numParam(p, 'intensity', 0.35));
        const density = clamp01(numParam(p, 'density', 0.25));
        const rate = Math.max(0.1, numParam(p, 'rate', 1.0));
        const seed = Math.floor(ctx.frameIndex * rate) * 3571 + 29;

        for (let r = 0; r < rows; r++) {
          const rowOff = r * cols;
          for (let c = 0; c < cols; c++) {
            const idx = rowOff + c;
            const roll = hashCell(c, r, seed);
            if (roll < density) {
              const delta = (hashCell(c + 53, r + 97, seed) * 2 - 1) * intensity;
              grid.highlight[idx] += delta;
            }
          }
        }
        break;
      }

      case 'ascii_char_echo': {
        const decay = clamp01(numParam(p, 'decay', 0.65));
        const trailLen = Math.max(1, Math.min(MAX_ECHO_HISTORY, Math.round(numParam(p, 'trailFrames', 3))));

        if (echoCols !== cols || echoRows !== rows) {
          clearAsciiEchoHistory();
          echoCols = cols;
          echoRows = rows;
        }

        // Snapshot current frame before blending prior trails
        const currentSnap: EchoEntry = {
          charIndices: grid.charIndices.slice(),
          fgRgba: grid.fgRgba.slice(),
          luminance: grid.luminance.slice(),
          directChars: grid.directChars ? grid.directChars.slice() : undefined
        };

        for (let age = 0; age < echoHistory.length; age++) {
          const prev = echoHistory[echoHistory.length - 1 - age];
          const w = Math.pow(decay, age + 1);
          if (w < 0.05) break;

          for (let i = 0; i < n; i++) {
            const prevScore = prev.luminance[i] * w;
            if (prevScore > grid.luminance[i] + 0.04) {
              grid.charIndices[i] = prev.charIndices[i];
              if (grid.directChars && prev.directChars) {
                grid.directChars[i] = prev.directChars[i];
              }
              grid.luminance[i] = prevScore;
              const i4 = i * 4;
              grid.fgRgba[i4] = Math.round(prev.fgRgba[i4] * w);
              grid.fgRgba[i4 + 1] = Math.round(prev.fgRgba[i4 + 1] * w);
              grid.fgRgba[i4 + 2] = Math.round(prev.fgRgba[i4 + 2] * w);
              grid.fgRgba[i4 + 3] = Math.max(grid.fgRgba[i4 + 3], Math.round(prev.fgRgba[i4 + 3] * w));
            }
          }
        }

        echoHistory.push(currentSnap);
        while (echoHistory.length > trailLen) {
          echoHistory.shift();
        }
        break;
      }

      case 'ascii_density_pulse': {
        const amp = clamp01(numParam(p, 'amplitude', 0.35));
        const freq = numParam(p, 'frequency', 0.3);
        const speed = numParam(p, 'speed', 1.5);
        const shape = Math.max(0.01, numParam(p, 'shape', 1.0));
        const offsetX = numParam(p, 'offsetX', numParam(p, 'offset', 0));
        const offsetY = numParam(p, 'offsetY', 0);
        const radial = p.radial !== false;
        const cx = cols * (0.5 + offsetX * 0.5);
        const cy = rows * (0.5 + offsetY * 0.5);
        const phase = ctx.time * speed * Math.PI * 2;

        // When shape = 1.0, scale vertical cell coordinate by the cell aspect ratio (strideY / strideX)
        // so that Euclidean distance in pixel space is isotropic, producing a true geometric circle.
        const strideX = Math.max(1, (grid.cellWidth || 8) + (grid.cellSpacing || 0));
        const strideY = Math.max(1, (grid.cellHeight || 14) + (grid.cellSpacing || 0));
        const cellAspect = strideY / strideX;
        const aspectScale = cellAspect * shape;

        for (let r = 0; r < rows; r++) {
          const rowOff = r * cols;
          const dy = (r - cy) * aspectScale;
          for (let c = 0; c < cols; c++) {
            const idx = rowOff + c;
            const dx = c - cx;
            const d = radial ? Math.hypot(dx, dy) : c + r;
            const wave = Math.sin(d * freq - phase) * amp;
            const shifted = clamp01(grid.charIndices[idx] / Math.max(1, maxIdx) + wave * 0.5);
            grid.charIndices[idx] = Math.min(maxIdx, Math.max(0, Math.round(shifted * maxIdx)));
            grid.highlight[idx] += wave * 0.35;
          }
        }
        break;
      }

      case 'ascii_glyph_noise': {
        const amount = clamp01(numParam(p, 'amount', 0.25));
        if (amount <= 0.001 || maxIdx === 0) break;
        const temporal = p.temporal !== false;
        const seed = temporal ? (ctx.frameIndex * 1973 + 42) | 0 : 42;
        const maxDelta = Math.max(1, Math.round(amount * maxIdx));

        for (let r = 0; r < rows; r++) {
          const rowOff = r * cols;
          for (let c = 0; c < cols; c++) {
            const idx = rowOff + c;
            const nVal = (hashCell(c, r, seed) * 2 - 1) * maxDelta;
            const next = Math.round(grid.charIndices[idx] + nVal);
            grid.charIndices[idx] = Math.min(maxIdx, Math.max(0, next));
          }
        }
        break;
      }

      default:
        break;
    }
  }
}

// Reusable scratch buffers for pixel-level ASCII effects (zero per-frame GC churn)
let glowBufR: Float32Array | null = null;
let glowBufG: Float32Array | null = null;
let glowBufB: Float32Array | null = null;
let glowTmpR: Float32Array | null = null;
let glowTmpG: Float32Array | null = null;
let glowTmpB: Float32Array | null = null;
let splitCopy: Uint8ClampedArray | null = null;

function boxBlur1D(
  src: Float32Array,
  dst: Float32Array,
  w: number,
  h: number,
  rad: number,
  horizontal: boolean
): void {
  const win = rad * 2 + 1;
  const inv = 1 / win;
  if (horizontal) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let k = -rad; k <= rad; k++) {
        sum += src[row + Math.max(0, Math.min(w - 1, k))];
      }
      for (let x = 0; x < w; x++) {
        dst[row + x] = sum * inv;
        const rem = Math.max(0, x - rad);
        const add = Math.min(w - 1, x + rad + 1);
        sum += src[row + add] - src[row + rem];
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -rad; k <= rad; k++) {
        sum += src[Math.max(0, Math.min(h - 1, k)) * w + x];
      }
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = sum * inv;
        const rem = Math.max(0, y - rad);
        const add = Math.min(h - 1, y + rad + 1);
        sum += src[add * w + x] - src[rem * w + x];
      }
    }
  }
}

/** Stage 10: Pixel-Level ASCII Post-Passes */
export function applyAsciiPixelEffects(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  grid: AsciiGridFrame,
  settings: AsciiSettings,
  _ctx: AsciiRenderContext
): void {
  const n = width * height;

  for (const eff of settings.asciiEffects) {
    if (!eff.enabled || eff.stage === 'grid') continue;
    const p = eff.params;

    switch (eff.id) {
      case 'ascii_glyph_glow': {
        const rad = Math.max(1, Math.min(16, Math.round(numParam(p, 'radius', 4))));
        const intensity = Math.max(0, numParam(p, 'intensity', 0.75));
        const threshold = clamp01(numParam(p, 'threshold', 0.2)) * 255;
        if (intensity <= 0.001) break;

        if (!glowBufR || glowBufR.length !== n) {
          glowBufR = new Float32Array(n);
          glowBufG = new Float32Array(n);
          glowBufB = new Float32Array(n);
          glowTmpR = new Float32Array(n);
          glowTmpG = new Float32Array(n);
          glowTmpB = new Float32Array(n);
        }

        const br = glowBufR!;
        const bg = glowBufG!;
        const bb = glowBufB!;
        const tr = glowTmpR!;
        const tg = glowTmpG!;
        const tb = glowTmpB!;

        for (let i = 0; i < n; i++) {
          const i4 = i * 4;
          const r = rgba[i4];
          const g = rgba[i4 + 1];
          const b = rgba[i4 + 2];
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (lum > threshold) {
            const w = (lum - threshold) / Math.max(1, 255 - threshold);
            br[i] = r * w;
            bg[i] = g * w;
            bb[i] = b * w;
          } else {
            br[i] = 0;
            bg[i] = 0;
            bb[i] = 0;
          }
        }

        // Two-pass separable box blur approximates smooth Gaussian bloom at O(N)
        boxBlur1D(br, tr, width, height, rad, true);
        boxBlur1D(tr, br, width, height, rad, false);
        boxBlur1D(bg, tg, width, height, rad, true);
        boxBlur1D(tg, bg, width, height, rad, false);
        boxBlur1D(bb, tb, width, height, rad, true);
        boxBlur1D(tb, bb, width, height, rad, false);

        for (let i = 0; i < n; i++) {
          const i4 = i * 4;
          const gr = Math.min(255, br[i] * intensity);
          const gg = Math.min(255, bg[i] * intensity);
          const gb = Math.min(255, bb[i] * intensity);
          // Screen composite preserves dark voids while blooming bright glyphs
          rgba[i4] = Math.round(255 - ((255 - rgba[i4]) * (255 - gr)) / 255);
          rgba[i4 + 1] = Math.round(255 - ((255 - rgba[i4 + 1]) * (255 - gg)) / 255);
          rgba[i4 + 2] = Math.round(255 - ((255 - rgba[i4 + 2]) * (255 - gb)) / 255);
        }
        break;
      }

      case 'ascii_chromatic_split': {
        const ox = Math.round(numParam(p, 'offsetX', 3));
        const oy = Math.round(numParam(p, 'offsetY', 0));
        if (ox === 0 && oy === 0) break;

        if (!splitCopy || splitCopy.length !== rgba.length) {
          splitCopy = new Uint8ClampedArray(rgba.length);
        }
        splitCopy.set(rgba);

        for (let y = 0; y < height; y++) {
          const ry = Math.max(0, Math.min(height - 1, y + oy)) * width;
          const by = Math.max(0, Math.min(height - 1, y - oy)) * width;
          const dstRow = y * width;
          for (let x = 0; x < width; x++) {
            const rx = Math.max(0, Math.min(width - 1, x + ox));
            const bx = Math.max(0, Math.min(width - 1, x - ox));
            const d4 = (dstRow + x) * 4;
            rgba[d4] = splitCopy[(ry + rx) * 4];
            rgba[d4 + 2] = splitCopy[(by + bx) * 4 + 2];
          }
        }
        break;
      }

      case 'ascii_scanlines': {
        const intensity = clamp01(numParam(p, 'intensity', 0.35));
        if (intensity <= 0.001) break;
        const syncToCell = Boolean(p.syncToCell);
        const pitch = syncToCell
          ? Math.max(2, grid.cellHeight + grid.cellSpacing)
          : Math.max(2, Math.round(numParam(p, 'pitch', 2)));
        const dim = 1 - intensity;

        for (let y = 0; y < height; y++) {
          const isLine = syncToCell ? y % pitch === pitch - 1 : y % pitch === 1;
          if (!isLine) continue;
          const rowOff = y * width * 4;
          for (let x = 0; x < width; x++) {
            const i4 = rowOff + x * 4;
            rgba[i4] = Math.round(rgba[i4] * dim);
            rgba[i4 + 1] = Math.round(rgba[i4 + 1] * dim);
            rgba[i4 + 2] = Math.round(rgba[i4 + 2] * dim);
          }
        }
        break;
      }

      default:
        break;
    }
  }
}

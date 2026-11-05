// DitherForge Photographic Dust & Scratches Effect
// Physical emulsion defects: random dust specks, lint fibers, and vertical film negative scratches

import type { EffectDescriptor, ParamMeta, EffectContext } from '../types';

export interface DustScratchesParams {
  density: number;
  minSize: number;
  maxSize: number;
  scratchProbability: number;
  streakLength: number;
  colorMode: 'white' | 'black' | 'mixed';
  temporal: boolean;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'density',
    label: 'Dust Particle Density',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.02,
    defaultValue: 0.2
  },
  {
    id: 'minSize',
    label: 'Min Particle Size',
    type: 'range',
    min: 1,
    max: 3,
    step: 1,
    defaultValue: 1,
    unit: 'px'
  },
  {
    id: 'maxSize',
    label: 'Max Particle Size',
    type: 'range',
    min: 2,
    max: 6,
    step: 1,
    defaultValue: 3,
    unit: 'px'
  },
  {
    id: 'scratchProbability',
    label: 'Vertical Scratch Chance',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.3
  },
  {
    id: 'streakLength',
    label: 'Scratch Streak Length',
    type: 'range',
    min: 10,
    max: 150,
    step: 5,
    defaultValue: 45,
    unit: 'px'
  },
  {
    id: 'colorMode',
    label: 'Defect Color',
    type: 'select',
    options: [
      { value: 'mixed', label: 'Mixed (Black & White)' },
      { value: 'white', label: 'White (Positive Print Dust)' },
      { value: 'black', label: 'Black (Negative Dust)' }
    ],
    defaultValue: 'mixed'
  },
  {
    id: 'temporal',
    label: 'Reseed Each Frame',
    type: 'boolean',
    defaultValue: true
  }
];

// Seeded PRNG sequence generator (Mulberry32)
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const dustScratchesEffect: EffectDescriptor<DustScratchesParams> = {
  id: 'dust_scratches',
  name: 'Dust & Scratches',
  category: 'film',
  description: 'Photographic film stock physical damage: random dust particles, lint fibers, and vertical emulsion scratches.',
  defaultParams: {
    density: 0.2,
    minSize: 1,
    maxSize: 3,
    scratchProbability: 0.3,
    streakLength: 45,
    colorMode: 'mixed',
    temporal: true
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg, contextArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: DustScratchesParams;
    let context: EffectContext = {};

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as DustScratchesParams;
      context = (height || {}) as EffectContext;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as DustScratchesParams;
      context = contextArg || {};
    }

    const {
      density = 0.2,
      minSize = 1,
      maxSize = 3,
      scratchProbability = 0.3,
      streakLength = 45,
      colorMode = 'mixed',
      temporal = true
    } = params;

    if (density <= 0.001 && scratchProbability <= 0.001) return;

    const frameIdx = temporal ? (context.frameIndex || 0) : 0;
    const rng = createPRNG((frameIdx * 7919 + 1337) >>> 0);

    // 1. Dust Specks
    const area = w * h;
    const baseCount = Math.round((area / 1200) * density);
    const minS = Math.max(1, Math.min(minSize, maxSize));
    const maxS = Math.max(minS, maxSize);

    for (let i = 0; i < baseCount; i++) {
      const cx = Math.floor(rng() * w);
      const cy = Math.floor(rng() * h);
      const radius = minS + rng() * (maxS - minS);
      const isWhite = colorMode === 'white' ? true : colorMode === 'black' ? false : rng() > 0.45;
      const val = isWhite ? 245 : 15;
      const opacity = 0.7 + rng() * 0.3;

      const rCeil = Math.ceil(radius);
      for (let dy = -rCeil; dy <= rCeil; dy++) {
        const py = cy + dy;
        if (py < 0 || py >= h) continue;
        for (let dx = -rCeil; dx <= rCeil; dx++) {
          const px = cx + dx;
          if (px < 0 || px >= w) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 <= radius * radius) {
            const idx = (py * w + px) * 4;
            data[idx] = Math.round(data[idx] * (1 - opacity) + val * opacity);
            data[idx + 1] = Math.round(data[idx + 1] * (1 - opacity) + val * opacity);
            data[idx + 2] = Math.round(data[idx + 2] * (1 - opacity) + val * opacity);
          }
        }
      }
    }

    // 2. Vertical Scratches
    if (rng() < scratchProbability) {
      const scratchCount = 1 + Math.floor(rng() * 3);
      for (let s = 0; s < scratchCount; s++) {
        const scratchX = Math.floor(rng() * w);
        const startY = Math.floor(rng() * (h - 10));
        const len = Math.min(h - startY, Math.round(streakLength * (0.6 + rng() * 0.8)));
        const isWhite = colorMode === 'white' ? true : colorMode === 'black' ? false : rng() > 0.5;
        const val = isWhite ? 240 : 20;

        let currentX = scratchX;
        for (let y = startY; y < startY + len; y++) {
          // Slight mechanical weave
          if (rng() < 0.2) currentX += rng() > 0.5 ? 1 : -1;
          const px = Math.max(0, Math.min(w - 1, currentX));
          const idx = (y * w + px) * 4;
          const op = 0.65 + rng() * 0.25;

          data[idx] = Math.round(data[idx] * (1 - op) + val * op);
          data[idx + 1] = Math.round(data[idx + 1] * (1 - op) + val * op);
          data[idx + 2] = Math.round(data[idx + 2] * (1 - op) + val * op);
        }
      }
    }
  }
};

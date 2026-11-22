// DitherForge Photographic Dust & Scratches Effect
// Physical emulsion defects: random dust specks, lint fibers/hairs, and organic film negative scratches

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
    max: 300,
    step: 5,
    defaultValue: 60,
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
  description: 'Photographic film stock physical damage: organic dust particles, curved lint fibers, and vertical emulsion scratches.',
  defaultParams: {
    density: 0.2,
    minSize: 1,
    maxSize: 3,
    scratchProbability: 0.3,
    streakLength: 60,
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
      streakLength = 60,
      colorMode = 'mixed',
      temporal = true
    } = params;

    if (density <= 0.001 && scratchProbability <= 0.001) return;

    const frameIdx = temporal ? (context.frameIndex || 0) : 0;
    const rng = createPRNG((frameIdx * 7919 + 1337) >>> 0);

    const blendPixel = (px: number, py: number, targetVal: number, alpha: number) => {
      if (px < 0 || px >= w || py < 0 || py >= h || alpha <= 0.001) return;
      const idx = (py * w + px) * 4;
      const a = Math.min(1, alpha);
      const invA = 1 - a;
      data[idx] = (data[idx] * invA + targetVal * a) | 0;
      data[idx + 1] = (data[idx + 1] * invA + targetVal * a) | 0;
      data[idx + 2] = (data[idx + 2] * invA + targetVal * a) | 0;
    };

    const area = w * h;
    const minS = Math.max(1, Math.min(minSize, maxSize));
    const maxS = Math.max(minS, maxSize);

    // 1. Organic Dust Particles & Lint Fibers
    if (density > 0.001) {
      const baseCount = Math.round((area / 1000) * density);

      for (let i = 0; i < baseCount; i++) {
        const cx = rng() * w;
        const cy = rng() * h;
        const isWhite = colorMode === 'white' ? true : colorMode === 'black' ? false : rng() > 0.45;
        const val = isWhite ? 240 + Math.floor(rng() * 15) : 10 + Math.floor(rng() * 15);
        const opacity = 0.55 + rng() * 0.45;

        // 15% chance of curved hair / lint fiber defect
        if (rng() < 0.15) {
          const fiberLen = 4 + rng() * 14;
          let angle = rng() * Math.PI * 2;
          const curveRate = (rng() - 0.5) * 0.4;
          let fx = cx;
          let fy = cy;
          for (let step = 0; step < fiberLen; step++) {
            blendPixel(Math.floor(fx), Math.floor(fy), val, opacity * (0.8 + rng() * 0.2));
            fx += Math.cos(angle);
            fy += Math.sin(angle);
            angle += curveRate;
          }
          continue;
        }

        // Irregular dust speck with soft radial anti-aliased falloff and slight eccentricity
        const radius = minS + rng() * (maxS - minS);
        const stretchX = 0.7 + rng() * 0.6;
        const stretchY = 0.7 + rng() * 0.6;
        const rCeil = Math.ceil(radius * 1.5);

        for (let dy = -rCeil; dy <= rCeil; dy++) {
          const py = Math.floor(cy + dy);
          if (py < 0 || py >= h) continue;
          for (let dx = -rCeil; dx <= rCeil; dx++) {
            const px = Math.floor(cx + dx);
            if (px < 0 || px >= w) continue;
            const normDist = Math.hypot(dx / stretchX, dy / stretchY);
            if (normDist <= radius) {
              // Soft falloff from core to perimeter
              const edgeAlpha = Math.max(0, 1 - Math.max(0, normDist - radius * 0.5) / (radius * 0.5 + 0.01));
              blendPixel(px, py, val, opacity * edgeAlpha);
            }
          }
        }
      }
    }

    // 2. Continuous Vertical Negative & Projector Scratches
    if (scratchProbability > 0.001) {
      // Calculate how many scratches could appear
      const numScratches = Math.floor(scratchProbability * 3.5) + (rng() < (scratchProbability % 1) ? 1 : 0);

      for (let s = 0; s < numScratches; s++) {
        const scratchBaseX = rng() * w;
        const isWhite = colorMode === 'white' ? true : colorMode === 'black' ? false : rng() > 0.4;
        const val = isWhite ? 230 + Math.floor(rng() * 25) : 15 + Math.floor(rng() * 15);
        const baseAlpha = 0.45 + rng() * 0.4;

        // Long continuous streak or full-height film run
        const isContinuous = rng() < 0.45;
        const startY = isContinuous ? 0 : Math.floor(rng() * (h * 0.6));
        const maxLen = isContinuous ? h : Math.min(h - startY, Math.round(streakLength * (1.0 + rng() * 2.0)));

        let currentX = scratchBaseX;
        let wanderSpeed = 0;

        for (let y = startY; y < startY + maxLen; y++) {
          // Subtle film gate weaving jitter
          wanderSpeed += (rng() - 0.5) * 0.15;
          wanderSpeed = Math.max(-0.4, Math.min(0.4, wanderSpeed));
          currentX += wanderSpeed;

          // Occasional micro-skip / gap in emulsion scratch
          if (rng() < 0.04) continue;

          const ix = Math.floor(currentX);
          const fracX = currentX - ix;
          const localAlpha = baseAlpha * (0.8 + rng() * 0.3);

          // Subpixel anti-aliased scratch stroke
          blendPixel(ix, y, val, localAlpha * (1 - fracX));
          blendPixel(ix + 1, y, val, localAlpha * fracX);
        }
      }
    }
  }
};

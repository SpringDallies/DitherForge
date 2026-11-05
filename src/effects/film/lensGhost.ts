// DitherForge Optical Lens Ghost & Flare Effect
// Simulates internal lens barrel reflections and anti-reflective coating chromatic ghosts along the optical axis

import type { EffectDescriptor, ParamMeta } from '../types';

export interface LensGhostParams {
  sourceX: number;
  sourceY: number;
  ghostCount: number;
  chromaticOffset: number;
  intensity: number;
  tint: string;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'sourceX',
    label: 'Light Source X',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.8
  },
  {
    id: 'sourceY',
    label: 'Light Source Y',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.2
  },
  {
    id: 'ghostCount',
    label: 'Reflection Element Count',
    type: 'range',
    min: 2,
    max: 8,
    step: 1,
    defaultValue: 4
  },
  {
    id: 'chromaticOffset',
    label: 'Chromatic Ring Separation',
    type: 'range',
    min: 0,
    max: 10,
    step: 0.5,
    defaultValue: 3,
    unit: 'px'
  },
  {
    id: 'intensity',
    label: 'Flare Brightness',
    type: 'range',
    min: 0,
    max: 2,
    step: 0.05,
    defaultValue: 0.5
  },
  {
    id: 'tint',
    label: 'Coating Reflection Tint',
    type: 'color',
    defaultValue: '#a4d8ff'
  }
];

function parseHexColor(hex: string): [number, number, number] {
  if (!hex || typeof hex !== 'string') return [164, 216, 255];
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 164,
      parseInt(clean[1] + clean[1], 16) || 216,
      parseInt(clean[2] + clean[2], 16) || 255
    ];
  }
  if (clean.length >= 6) {
    return [
      parseInt(clean.slice(0, 2), 16) || 164,
      parseInt(clean.slice(2, 4), 16) || 216,
      parseInt(clean.slice(4, 6), 16) || 255
    ];
  }
  return [164, 216, 255];
}

export const lensGhostEffect: EffectDescriptor<LensGhostParams> = {
  id: 'lens_ghost',
  name: 'Lens Ghost / Flare',
  category: 'film',
  description: 'Simulates internal optical lens barrel reflections, aperture ghost discs, and anti-reflective coating glare.',
  defaultParams: {
    sourceX: 0.8,
    sourceY: 0.2,
    ghostCount: 4,
    chromaticOffset: 3,
    intensity: 0.5,
    tint: '#a4d8ff'
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'screen',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: LensGhostParams;

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as LensGhostParams;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as LensGhostParams;
    }

    const {
      sourceX = 0.8,
      sourceY = 0.2,
      ghostCount = 4,
      chromaticOffset = 3,
      intensity = 0.5,
      tint = '#a4d8ff'
    } = params;

    if (intensity <= 0.001) return;

    const [tintR, tintG, tintB] = parseHexColor(tint);
    const sx = sourceX * w;
    const sy = sourceY * h;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Optical vector through screen center
    const vx = cx - sx;
    const vy = cy - sy;
    const count = Math.max(2, Math.min(8, Math.round(ghostCount)));
    const chrom = chromaticOffset;

    // Pre-calculate ghost disc centers, sizes, and relative brightnesses
    interface GhostDef {
      gx: number;
      gy: number;
      radius: number;
      invRadius: number;
      bright: number;
      isHollow: boolean;
    }
    const ghosts: GhostDef[] = [];
    for (let i = 0; i < count; i++) {
      // Position spaced across the optical reflection vector
      const t = (i + 1) / (count + 0.5) * 2.2 - 0.4;
      const gx = cx + vx * t;
      const gy = cy + vy * t;
      const radius = Math.max(6, Math.min(w * 0.4, (20 + (i % 3) * 25) * (1.0 + Math.abs(t) * 0.5)));
      const bright = (0.2 + 0.8 * (1.0 - Math.abs(t - 1.0) / 2.0)) * intensity * 0.7;
      const isHollow = i % 2 === 1;
      ghosts.push({
        gx,
        gy,
        radius,
        invRadius: 1.0 / radius,
        bright,
        isHollow
      });
    }

    // Rasterize ghost discs additively with chromatic separation
    for (const g of ghosts) {
      const minX = Math.max(0, Math.floor(g.gx - g.radius - chrom));
      const maxX = Math.min(w - 1, Math.ceil(g.gx + g.radius + chrom));
      const minY = Math.max(0, Math.floor(g.gy - g.radius - chrom));
      const maxY = Math.min(h - 1, Math.ceil(g.gy + g.radius + chrom));

      for (let y = minY; y <= maxY; y++) {
        const dy = y - g.gy;
        const rowOffset = y * w * 4;

        for (let x = minX; x <= maxX; x++) {
          const dx = x - g.gx;
          const dist = Math.hypot(dx, dy);
          if (dist > g.radius + chrom) continue;

          // Radial profile (soft bell curve or ring halo)
          let falloff = 0;
          if (g.isHollow) {
            const ringDist = Math.abs(dist - g.radius * 0.7);
            const ringWidth = g.radius * 0.3;
            if (ringDist < ringWidth) {
              falloff = Math.cos((ringDist / ringWidth) * (Math.PI * 0.5));
            }
          } else {
            const normD = dist * g.invRadius;
            if (normD < 1.0) {
              falloff = Math.cos(normD * (Math.PI * 0.5));
            }
          }

          if (falloff <= 0.001) continue;

          // Chromatic dispersion along optical axis
          const redDist = Math.hypot(dx - (vx > 0 ? chrom : -chrom), dy);
          const blueDist = Math.hypot(dx + (vx > 0 ? chrom : -chrom), dy);

          const rGain = Math.max(0, 1.0 - (redDist * g.invRadius));
          const gGain = falloff;
          const bGain = Math.max(0, 1.0 - (blueDist * g.invRadius));

          const idx = rowOffset + x * 4;
          const addR = Math.round(g.bright * (tintR * 0.5 + 128 * rGain) * falloff);
          const addG = Math.round(g.bright * (tintG * 0.5 + 128 * gGain) * falloff);
          const addB = Math.round(g.bright * (tintB * 0.5 + 128 * bGain) * falloff);

          data[idx] = Math.min(255, data[idx] + addR);
          data[idx + 1] = Math.min(255, data[idx + 1] + addG);
          data[idx + 2] = Math.min(255, data[idx + 2] + addB);
        }
      }
    }
  }
};

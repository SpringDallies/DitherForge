// DitherForge Photographic Light Leak Effect
// Edge light intrusion through camera seal gaps with warm golden/amber/magenta gradient falloff

import type { EffectDescriptor, ParamMeta, EffectContext } from '../types';

export interface LightLeaksParams {
  direction: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'top' | 'bottom' | 'left' | 'right';
  radius: number;
  tint: string;
  secondaryTint: string;
  intensity: number;
  temporal: boolean;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'direction',
    label: 'Leak Origin Location',
    type: 'select',
    options: [
      { value: 'top_left', label: 'Top-Left Corner' },
      { value: 'top_right', label: 'Top-Right Corner' },
      { value: 'bottom_left', label: 'Bottom-Left Corner' },
      { value: 'bottom_right', label: 'Bottom-Right Corner' },
      { value: 'top', label: 'Top Edge' },
      { value: 'bottom', label: 'Bottom Edge' },
      { value: 'left', label: 'Left Edge' },
      { value: 'right', label: 'Right Edge' }
    ],
    defaultValue: 'top_left'
  },
  {
    id: 'radius',
    label: 'Leak Diffusion Spread',
    type: 'range',
    min: 0.2,
    max: 2.0,
    step: 0.05,
    defaultValue: 0.8
  },
  {
    id: 'tint',
    label: 'Primary Leak Tint (Amber)',
    type: 'color',
    defaultValue: '#ff8844'
  },
  {
    id: 'secondaryTint',
    label: 'Core Bleed Tint (Magenta)',
    type: 'color',
    defaultValue: '#ff3366'
  },
  {
    id: 'intensity',
    label: 'Exposure Intensity',
    type: 'range',
    min: 0,
    max: 2,
    step: 0.05,
    defaultValue: 0.65
  },
  {
    id: 'temporal',
    label: 'Subtle Exposure Wobble',
    type: 'boolean',
    defaultValue: true
  }
];

function parseHexColor(hex: string): [number, number, number] {
  if (!hex || typeof hex !== 'string') return [255, 136, 68];
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 255,
      parseInt(clean[1] + clean[1], 16) || 136,
      parseInt(clean[2] + clean[2], 16) || 68
    ];
  }
  if (clean.length >= 6) {
    return [
      parseInt(clean.slice(0, 2), 16) || 255,
      parseInt(clean.slice(2, 4), 16) || 136,
      parseInt(clean.slice(4, 6), 16) || 68
    ];
  }
  return [255, 136, 68];
}

export const lightLeaksEffect: EffectDescriptor<LightLeaksParams> = {
  id: 'light_leaks',
  name: 'Light Leaks',
  category: 'film',
  description: 'Simulates camera back door light leakage burning across film edges with organic warm flares.',
  defaultParams: {
    direction: 'top_left',
    radius: 0.8,
    tint: '#ff8844',
    secondaryTint: '#ff3366',
    intensity: 0.65,
    temporal: true
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'screen',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg, contextArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: LightLeaksParams;
    let context: EffectContext = {};

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as LightLeaksParams;
      context = (height || {}) as EffectContext;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as LightLeaksParams;
      context = contextArg || {};
    }

    const {
      direction = 'top_left',
      radius = 0.8,
      tint = '#ff8844',
      secondaryTint = '#ff3366',
      intensity = 0.65,
      temporal = true
    } = params;

    if (intensity <= 0.001 || radius <= 0) return;

    const frameIdx = temporal ? (context.frameIndex || 0) : 0;
    const wobble = temporal ? 1.0 + Math.sin(frameIdx * 0.2) * 0.12 : 1.0;
    const effIntensity = intensity * wobble;

    const [t1R, t1G, t1B] = parseHexColor(tint);
    const [t2R, t2G, t2B] = parseHexColor(secondaryTint);

    // Determine leak origin center in normalized coords
    let ox = 0, oy = 0;
    let isCorner = true;
    if (direction === 'top_left') { ox = 0; oy = 0; }
    else if (direction === 'top_right') { ox = w; oy = 0; }
    else if (direction === 'bottom_left') { ox = 0; oy = h; }
    else if (direction === 'bottom_right') { ox = w; oy = h; }
    else if (direction === 'top') { ox = w / 2; oy = 0; isCorner = false; }
    else if (direction === 'bottom') { ox = w / 2; oy = h; isCorner = false; }
    else if (direction === 'left') { ox = 0; oy = h / 2; isCorner = false; }
    else if (direction === 'right') { ox = w; oy = h / 2; isCorner = false; }

    const maxDist = (isCorner ? Math.hypot(w, h) : Math.max(w, h)) * Math.max(0.05, radius);
    const invMaxDist = 1.0 / maxDist;

    for (let y = 0; y < h; y++) {
      const dy = y - oy;
      const rowOffset = y * w * 4;

      for (let x = 0; x < w; x++) {
        const dx = x - ox;
        const dist = Math.hypot(dx, dy);
        if (dist >= maxDist) continue;

        const normDist = dist * invMaxDist;
        // Smooth exponential falloff
        const falloff = Math.pow(1.0 - normDist, 1.8) * effIntensity;
        if (falloff <= 0.001) continue;

        // Core transitions between secondary core tint and outer amber tint
        const coreRatio = Math.max(0, 1.0 - normDist * 2.0);
        const lkR = (t2R * coreRatio + t1R * (1.0 - coreRatio)) * falloff;
        const lkG = (t2G * coreRatio + t1G * (1.0 - coreRatio)) * falloff;
        const lkB = (t2B * coreRatio + t1B * (1.0 - coreRatio)) * falloff;

        const idx = rowOffset + x * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Screen blend mode: 255 - (255 - A) * (255 - B) / 255
        data[idx] = Math.min(255, Math.round(255 - ((255 - r) * Math.max(0, 255 - lkR)) / 255));
        data[idx + 1] = Math.min(255, Math.round(255 - ((255 - g) * Math.max(0, 255 - lkG)) / 255));
        data[idx + 2] = Math.min(255, Math.round(255 - ((255 - b) * Math.max(0, 255 - lkB)) / 255));
      }
    }
  }
};

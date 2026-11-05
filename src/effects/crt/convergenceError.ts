// DitherForge CRT Dynamic Beam Convergence Error Effect
// Simulates electron gun mis-convergence where red, green, and blue beam paths diverge towards screen corners

import type { EffectDescriptor, ParamMeta } from '../types';

export interface ConvergenceErrorParams {
  centerX: number;
  centerY: number;
  edgePx: number;
  radialExponent: number;
  redScale: number;
  greenScale: number;
  blueScale: number;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'centerX',
    label: 'Convergence Center X',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5
  },
  {
    id: 'centerY',
    label: 'Convergence Center Y',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5
  },
  {
    id: 'edgePx',
    label: 'Edge Mis-alignment',
    type: 'range',
    min: 0,
    max: 20,
    step: 0.5,
    defaultValue: 4.0,
    unit: 'px'
  },
  {
    id: 'radialExponent',
    label: 'Radial Falloff Exponent',
    type: 'range',
    min: 1.0,
    max: 3.0,
    step: 0.1,
    defaultValue: 1.8
  },
  {
    id: 'redScale',
    label: 'Red Gun Deflection',
    type: 'range',
    min: -2,
    max: 2,
    step: 0.1,
    defaultValue: 1.0
  },
  {
    id: 'blueScale',
    label: 'Blue Gun Deflection',
    type: 'range',
    min: -2,
    max: 2,
    step: 0.1,
    defaultValue: -1.0
  },
  {
    id: 'greenScale',
    label: 'Green Gun Deflection',
    type: 'range',
    min: -2,
    max: 2,
    step: 0.1,
    defaultValue: 0.0
  }
];

export const convergenceErrorEffect: EffectDescriptor<ConvergenceErrorParams> = {
  id: 'convergence_error',
  name: 'Convergence Error',
  category: 'crt',
  description: 'Simulates magnetic deflection yoke mis-convergence with radial color beam splitting at screen edges.',
  defaultParams: {
    centerX: 0.5,
    centerY: 0.5,
    edgePx: 4.0,
    radialExponent: 1.8,
    redScale: 1.0,
    greenScale: 0.0,
    blueScale: -1.0
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: ConvergenceErrorParams;

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as ConvergenceErrorParams;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as ConvergenceErrorParams;
    }

    const {
      centerX = 0.5,
      centerY = 0.5,
      edgePx = 4.0,
      radialExponent = 1.8,
      redScale = 1.0,
      greenScale = 0.0,
      blueScale = -1.0
    } = params;

    if (edgePx <= 0.01) return;

    const src = new Uint8ClampedArray(data);
    const cx = centerX * w;
    const cy = centerY * h;
    const maxRadius = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) || 1.0;
    const invMaxRadius = 1.0 / maxRadius;

    for (let y = 0; y < h; y++) {
      const dy = y - cy;
      const rowOffset = y * w * 4;

      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.001) continue;

        const normDist = dist * invMaxRadius;
        const factor = Math.pow(normDist, radialExponent) * edgePx;
        const dirX = dx / dist;
        const dirY = dy / dist;

        const idx = rowOffset + x * 4;

        // Sample Red channel
        if (Math.abs(redScale) > 0.001) {
          const rx = Math.max(0, Math.min(w - 1, Math.round(x + dirX * factor * redScale)));
          const ry = Math.max(0, Math.min(h - 1, Math.round(y + dirY * factor * redScale)));
          data[idx] = src[(ry * w + rx) * 4];
        }

        // Sample Green channel
        if (Math.abs(greenScale) > 0.001) {
          const gx = Math.max(0, Math.min(w - 1, Math.round(x + dirX * factor * greenScale)));
          const gy = Math.max(0, Math.min(h - 1, Math.round(y + dirY * factor * greenScale)));
          data[idx + 1] = src[(gy * w + gx) * 4 + 1];
        }

        // Sample Blue channel
        if (Math.abs(blueScale) > 0.001) {
          const bx = Math.max(0, Math.min(w - 1, Math.round(x + dirX * factor * blueScale)));
          const by = Math.max(0, Math.min(h - 1, Math.round(y + dirY * factor * blueScale)));
          data[idx + 2] = src[(by * w + bx) * 4 + 2];
        }
      }
    }
  }
};

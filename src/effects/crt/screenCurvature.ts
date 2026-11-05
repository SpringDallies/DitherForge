// DitherForge CRT Screen Curvature Effect
// Barrel / Pincushion geometric distortion with curved corner roll-off and configurable edge sampling

import type { EffectDescriptor, ParamMeta } from '../types';

export interface ScreenCurvatureParams {
  curvature: number;
  cornerRounding: number;
  edgeSampling: 'black' | 'clamp' | 'mirror';
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'curvature',
    label: 'Glass Curvature (Barrel / Pincushion)',
    type: 'range',
    min: -0.4,
    max: 0.5,
    step: 0.02,
    defaultValue: 0.18
  },
  {
    id: 'cornerRounding',
    label: 'Bezel Corner Roll-off',
    type: 'range',
    min: 0,
    max: 0.35,
    step: 0.01,
    defaultValue: 0.12
  },
  {
    id: 'edgeSampling',
    label: 'Edge Clamping Mode',
    type: 'select',
    options: [
      { value: 'black', label: 'Black Bezel Border' },
      { value: 'clamp', label: 'Clamp to Screen Edge' },
      { value: 'mirror', label: 'Mirror Screen Boundary' }
    ],
    defaultValue: 'black'
  }
];

export const screenCurvatureEffect: EffectDescriptor<ScreenCurvatureParams> = {
  id: 'screen_curvature',
  name: 'Screen Curvature',
  category: 'crt',
  description: 'Simulates the physical curved glass faceplate of 1980s-90s CRT monitors with corner roll-off.',
  defaultParams: {
    curvature: 0.18,
    cornerRounding: 0.12,
    edgeSampling: 'black'
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: ScreenCurvatureParams;

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as ScreenCurvatureParams;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as ScreenCurvatureParams;
    }

    const {
      curvature = 0.18,
      cornerRounding = 0.12,
      edgeSampling = 'black'
    } = params;

    if (Math.abs(curvature) < 0.001 && cornerRounding <= 0.001) return;

    // Snapshot pristine source buffer
    const src = new Uint8ClampedArray(data);
    const halfW = w * 0.5;
    const halfH = h * 0.5;
    const invHalfW = 1.0 / halfW;
    const invHalfH = 1.0 / halfH;

    const cornerRadius = Math.max(0.001, cornerRounding);
    const cornerBoxX = 1.0 - cornerRadius;
    const cornerBoxY = 1.0 - cornerRadius;

    for (let y = 0; y < h; y++) {
      const v = (y - halfH) * invHalfH;
      const v2 = v * v;
      const rowOffset = y * w * 4;

      for (let x = 0; x < w; x++) {
        const u = (x - halfW) * invHalfW;
        const u2 = u * u;
        const r2 = u2 + v2;

        // Barrel / pincushion warp function: (1 + k * r^2)
        const factor = 1.0 + curvature * r2 * 0.5;
        const srcU = u * factor;
        const srcV = v * factor;

        // Check rounded bezel corners
        const absU = Math.abs(srcU);
        const absV = Math.abs(srcV);

        let isOutsideBezel = false;
        if (absU > 1.0 || absV > 1.0) {
          isOutsideBezel = true;
        } else if (absU > cornerBoxX && absV > cornerBoxY) {
          const cdx = absU - cornerBoxX;
          const cdy = absV - cornerBoxY;
          if (cdx * cdx + cdy * cdy > cornerRadius * cornerRadius) {
            isOutsideBezel = true;
          }
        }

        const idx = rowOffset + x * 4;

        if (isOutsideBezel && edgeSampling === 'black') {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          continue;
        }

        // Map back to pixel coordinates
        let px = halfW + srcU * halfW;
        let py = halfH + srcV * halfH;

        if (edgeSampling === 'clamp') {
          px = Math.max(0, Math.min(w - 1, px));
          py = Math.max(0, Math.min(h - 1, py));
        } else if (edgeSampling === 'mirror') {
          if (px < 0) px = -px;
          if (px >= w) px = 2 * w - px - 1;
          if (py < 0) py = -py;
          if (py >= h) py = 2 * h - py - 1;
          px = Math.max(0, Math.min(w - 1, px));
          py = Math.max(0, Math.min(h - 1, py));
        } else {
          // 'black' edge sampling
          if (px < 0 || px >= w - 1 || py < 0 || py >= h - 1) {
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            continue;
          }
        }

        // Bilinear interpolation for crystal sharp anti-aliased geometry
        const x0 = Math.floor(px);
        const y0 = Math.floor(py);
        const x1 = Math.min(w - 1, x0 + 1);
        const y1 = Math.min(h - 1, y0 + 1);

        const fx = px - x0;
        const fy = py - y0;
        const fx1 = 1.0 - fx;
        const fy1 = 1.0 - fy;

        const w00 = fx1 * fy1;
        const w10 = fx * fy1;
        const w01 = fx1 * fy;
        const w11 = fx * fy;

        const i00 = (y0 * w + x0) * 4;
        const i10 = (y0 * w + x1) * 4;
        const i01 = (y1 * w + x0) * 4;
        const i11 = (y1 * w + x1) * 4;

        data[idx] = Math.round(src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11);
        data[idx + 1] = Math.round(src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11);
        data[idx + 2] = Math.round(src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11);
      }
    }
  }
};

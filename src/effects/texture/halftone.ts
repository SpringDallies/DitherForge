import type { EffectDescriptor } from '../types';

export interface HalftoneParams {
  dotSize: number;
  angle: number;
  shape: 'circle' | 'diamond';
}

export function applyHalftone(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: HalftoneParams
): void {
  const cell = Math.max(2, Number(params.dotSize || 5));
  const baseAngle = params.angle !== undefined ? Number(params.angle) : 45;
  const shape = params.shape || 'circle';
  const copy = new Uint8ClampedArray(data);

  // Print rosette angles: Cyan (base - 30), Magenta (base + 30), Yellow (base - 45), Black (base)
  const anglesDeg = [baseAngle - 30, baseAngle + 30, baseAngle - 45, baseAngle];
  const cosA = new Float64Array(4);
  const sinA = new Float64Array(4);
  for (let ch = 0; ch < 4; ch++) {
    const rad = anglesDeg[ch] * (Math.PI / 180);
    cosA[ch] = Math.cos(rad);
    sinA[ch] = Math.sin(rad);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let inkC = 0, inkM = 0, inkY = 0, inkK = 0;

      for (let ch = 0; ch < 4; ch++) {
        const ca = cosA[ch];
        const sa = sinA[ch];

        // Rotate into channel screen space (u, v)
        const u = x * ca - y * sa;
        const v = x * sa + y * ca;

        // Center of enclosing cell
        const cellU = (Math.floor(u / cell) + 0.5) * cell;
        const cellV = (Math.floor(v / cell) + 0.5) * cell;

        // Unrotate back into image space (centerX, centerY)
        const centerX = Math.max(0, Math.min(width - 1, Math.round(cellU * ca + cellV * sa)));
        const centerY = Math.max(0, Math.min(height - 1, Math.round(-cellU * sa + cellV * ca)));

        const sIdx = (centerY * width + centerX) * 4;
        const r = copy[sIdx] / 255;
        const g = copy[sIdx + 1] / 255;
        const b = copy[sIdx + 2] / 255;

        // CMYK conversion with Gray Component Replacement (GCR)
        const kMax = 1 - Math.max(r, g, b);
        const k = kMax * 0.65;
        const denom = 1 - k;
        let chVal = 0;
        if (ch === 0) {
          chVal = denom > 0.0001 ? Math.max(0, Math.min(1, (1 - r - k) / denom)) : 0;
        } else if (ch === 1) {
          chVal = denom > 0.0001 ? Math.max(0, Math.min(1, (1 - g - k) / denom)) : 0;
        } else if (ch === 2) {
          chVal = denom > 0.0001 ? Math.max(0, Math.min(1, (1 - b - k) / denom)) : 0;
        } else {
          chVal = Math.max(0, Math.min(1, k));
        }

        const du = u - cellU;
        const dv = v - cellV;
        const dist = shape === 'diamond' ? (Math.abs(du) + Math.abs(dv)) * 0.75 : Math.hypot(du, dv);

        const dotRadius = Math.sqrt(chVal) * (cell * 0.68);
        const edge = dotRadius - dist;
        // 1px smooth anti-aliased ramp
        const ink = Math.max(0, Math.min(1, edge + 0.5));

        if (ch === 0) inkC = ink;
        else if (ch === 1) inkM = ink;
        else if (ch === 2) inkY = ink;
        else inkK = ink;
      }

      // Convert CMYK inks back to RGB
      const outR = Math.round(255 * (1 - inkC) * (1 - inkK));
      const outG = Math.round(255 * (1 - inkM) * (1 - inkK));
      const outB = Math.round(255 * (1 - inkY) * (1 - inkK));

      const idx = (y * width + x) * 4;
      data[idx] = Math.max(0, Math.min(255, outR));
      data[idx + 1] = Math.max(0, Math.min(255, outG));
      data[idx + 2] = Math.max(0, Math.min(255, outB));
    }
  }
}

export const halftoneEffect: EffectDescriptor<HalftoneParams> = {
  id: 'halftone',
  name: 'CMYK Halftone',
  category: 'texture',
  description: 'Simulated 4-color offset printing rosette screen',
  defaultParams: { dotSize: 5, angle: 45, shape: 'circle' },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: [
    {
      id: 'dotSize',
      label: 'Dot Size',
      type: 'number',
      min: 2,
      max: 20,
      step: 1,
      defaultValue: 5,
      unit: 'px'
    },
    {
      id: 'angle',
      label: 'Screen Angle',
      type: 'number',
      min: 0,
      max: 360,
      step: 1,
      defaultValue: 45,
      unit: '°'
    },
    {
      id: 'shape',
      label: 'Dot Shape',
      type: 'select',
      options: [
        { value: 'circle', label: 'Circle' },
        { value: 'diamond', label: 'Diamond' }
      ],
      defaultValue: 'circle'
    }
  ],
  apply: (data, width, height, params) => applyHalftone(data, width, height, params)
};

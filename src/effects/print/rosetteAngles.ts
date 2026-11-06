// Rosette Angles Effect
// Per-ink halftone screen angle control (C/M/Y/K screen angles + dot gain)
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  clamp
} from './shared';

export interface RosetteAnglesParams {
  angleC?: number; // 0 to 90 degrees (default: 15)
  angleM?: number; // 0 to 90 degrees (default: 75)
  angleY?: number; // 0 to 90 degrees (default: 0)
  angleK?: number; // 0 to 90 degrees (default: 45)
  dotGain?: number; // 0 to 0.4 (default: 0.12)
  dotSize?: number; // 4 to 20 px (default: 8)
}

export const rosetteAnglesDefaultParams: Required<RosetteAnglesParams> = {
  angleC: 15,
  angleM: 75,
  angleY: 0,
  angleK: 45,
  dotGain: 0.12,
  dotSize: 8
};

export function applyRosetteAngles(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...rosetteAnglesDefaultParams, ...resolved.params };

  const dotSize = clamp(Math.round(p.dotSize), 3, 32);
  const dotGain = clamp(p.dotGain, 0, 0.4);

  // Convert angles to radians and precompute cos/sin
  const rad = Math.PI / 180.0;
  const angles = [p.angleC * rad, p.angleM * rad, p.angleY * rad, p.angleK * rad];
  const cosA = [Math.cos(angles[0]), Math.cos(angles[1]), Math.cos(angles[2]), Math.cos(angles[3])];
  const sinA = [Math.sin(angles[0]), Math.sin(angles[1]), Math.sin(angles[2]), Math.sin(angles[3])];

  const copy = new Uint8ClampedArray(data);
  const inv255 = 1.0 / 255.0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let inkC = 0, inkM = 0, inkY = 0, inkK = 0;

      for (let ch = 0; ch < 4; ch++) {
        const ca = cosA[ch];
        const sa = sinA[ch];

        // Screen-space coordinates for channel angle
        const u = x * ca - y * sa;
        const v = x * sa + y * ca;

        // Cell center in screen space
        const cellU = (Math.floor(u / dotSize) + 0.5) * dotSize;
        const cellV = (Math.floor(v / dotSize) + 0.5) * dotSize;

        // Sample cell center in source space
        const cx = clamp(Math.round(cellU * ca + cellV * sa), 0, width - 1);
        const cy = clamp(Math.round(-cellU * sa + cellV * ca), 0, height - 1);

        const sIdx = (cy * width + cx) * 4;
        const r = copy[sIdx] * inv255;
        const g = copy[sIdx + 1] * inv255;
        const b = copy[sIdx + 2] * inv255;

        // Rich black GCR: separates black from chromatic inks while preserving C/M/Y screen angles
        const kMax = 1.0 - Math.max(r, Math.max(g, b));
        const k = kMax * 0.65;
        const denom = 1.0 - k;
        let chVal = 0;
        if (ch === 0) chVal = denom > 0.0001 ? clamp((1.0 - r - k) / denom, 0, 1) : 0;
        else if (ch === 1) chVal = denom > 0.0001 ? clamp((1.0 - g - k) / denom, 0, 1) : 0;
        else if (ch === 2) chVal = denom > 0.0001 ? clamp((1.0 - b - k) / denom, 0, 1) : 0;
        else chVal = clamp(k, 0, 1);

        const du = u - cellU;
        const dv = v - cellV;
        const dist = Math.hypot(du, dv);
        const targetRadius = (Math.sqrt(chVal) + dotGain * 0.5) * (dotSize * 0.68);
        const edge = targetRadius - dist;
        const ink = clamp(edge + 0.5, 0, 1);

        if (ch === 0) inkC = ink;
        else if (ch === 1) inkM = ink;
        else if (ch === 2) inkY = ink;
        else inkK = ink;
      }

      const pIdx = (y * width + x) * 4;
      data[pIdx] = clamp(Math.round((1.0 - inkC) * (1.0 - inkK) * 255), 0, 255);
      data[pIdx + 1] = clamp(Math.round((1.0 - inkM) * (1.0 - inkK) * 255), 0, 255);
      data[pIdx + 2] = clamp(Math.round((1.0 - inkY) * (1.0 - inkK) * 255), 0, 255);
      // alpha data[pIdx + 3] preserved
    }
  }
}

export const rosetteAnglesParamsMeta: ParamMeta[] = [
  {
    id: 'angleC',
    label: 'Cyan Angle',
    type: 'number',
    min: 0,
    max: 90,
    step: 1,
    defaultValue: 15,
    unit: 'deg'
  },
  {
    id: 'angleM',
    label: 'Magenta Angle',
    type: 'number',
    min: 0,
    max: 90,
    step: 1,
    defaultValue: 75,
    unit: 'deg'
  },
  {
    id: 'angleY',
    label: 'Yellow Angle',
    type: 'number',
    min: 0,
    max: 90,
    step: 1,
    defaultValue: 0,
    unit: 'deg'
  },
  {
    id: 'angleK',
    label: 'Black Angle',
    type: 'number',
    min: 0,
    max: 90,
    step: 1,
    defaultValue: 45,
    unit: 'deg'
  },
  {
    id: 'dotGain',
    label: 'Dot Gain',
    type: 'number',
    min: 0,
    max: 0.4,
    step: 0.02,
    defaultValue: 0.12
  },
  {
    id: 'dotSize',
    label: 'Screen Frequency',
    type: 'number',
    min: 3,
    max: 24,
    step: 1,
    defaultValue: 8,
    unit: 'px'
  }
];

export const rosetteAnglesEffect: EffectDescriptor<RosetteAnglesParams> = {
  id: 'rosette_angles',
  name: 'Rosette Angles',
  category: 'print',
  description: 'Per-ink halftone screen angle control (CMYK rosette angles)',
  defaultParams: rosetteAnglesDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: rosetteAnglesParamsMeta,
  params: rosetteAnglesParamsMeta,
  apply: applyRosetteAngles
};

export const rosetteAnglesDescriptor = rosetteAnglesEffect;
export default rosetteAnglesEffect;

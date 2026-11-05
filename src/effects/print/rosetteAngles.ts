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
  const cosC = Math.cos(p.angleC * rad), sinC = Math.sin(p.angleC * rad);
  const cosM = Math.cos(p.angleM * rad), sinM = Math.sin(p.angleM * rad);
  const cosY = Math.cos(p.angleY * rad), sinY = Math.sin(p.angleY * rad);
  const cosK = Math.cos(p.angleK * rad), sinK = Math.sin(p.angleK * rad);

  const halfDot = dotSize * 0.5;
  const maxDistSq = halfDot * halfDot * 2;
  const inv255 = 1.0 / 255.0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;

    // Row-constant projection offsets
    const baseRotXC = -y * sinC, baseRotYC = y * cosC;
    const baseRotXM = -y * sinM, baseRotYM = y * cosM;
    const baseRotXY = -y * sinY, baseRotYY = y * cosY;
    const baseRotXK = -y * sinK, baseRotYK = y * cosK;

    for (let x = 0; x < width; x++) {
      const idx = (rowOffset + x) * 4;
      const r = data[idx] * inv255;
      const g = data[idx + 1] * inv255;
      const b = data[idx + 2] * inv255;

      // Fast RGB to CMYK
      let maxVal = r > g ? r : g;
      if (b > maxVal) maxVal = b;
      const k = 1.0 - maxVal;

      let c = 0, m = 0, yVal = 0, kVal = k;
      if (k < 0.999) {
        const invK = 1.0 / (1.0 - k);
        c = (1.0 - r - k) * invK;
        m = (1.0 - g - k) * invK;
        yVal = (1.0 - b - k) * invK;
        if (c < 0) c = 0; else if (c > 1) c = 1;
        if (m < 0) m = 0; else if (m > 1) m = 1;
        if (yVal < 0) yVal = 0; else if (yVal > 1) yVal = 1;
      }
      if (kVal < 0) kVal = 0; else if (kVal > 1) kVal = 1;

      // Cyan dot
      let hasC = 0;
      if (c > 0.001) {
        if (c >= 0.999) {
          hasC = 1;
        } else {
          const rx = x * cosC + baseRotXC;
          const ry = x * sinC + baseRotYC;
          const u = ((rx % dotSize) + dotSize) % dotSize - halfDot;
          const v = ((ry % dotSize) + dotSize) % dotSize - halfDot;
          const targetArea = c + dotGain * (1.0 - c) * 0.5;
          if (u * u + v * v <= targetArea * maxDistSq) hasC = 1;
        }
      }

      // Magenta dot
      let hasM = 0;
      if (m > 0.001) {
        if (m >= 0.999) {
          hasM = 1;
        } else {
          const rx = x * cosM + baseRotXM;
          const ry = x * sinM + baseRotYM;
          const u = ((rx % dotSize) + dotSize) % dotSize - halfDot;
          const v = ((ry % dotSize) + dotSize) % dotSize - halfDot;
          const targetArea = m + dotGain * (1.0 - m) * 0.5;
          if (u * u + v * v <= targetArea * maxDistSq) hasM = 1;
        }
      }

      // Yellow dot
      let hasY = 0;
      if (yVal > 0.001) {
        if (yVal >= 0.999) {
          hasY = 1;
        } else {
          const rx = x * cosY + baseRotXY;
          const ry = x * sinY + baseRotYY;
          const u = ((rx % dotSize) + dotSize) % dotSize - halfDot;
          const v = ((ry % dotSize) + dotSize) % dotSize - halfDot;
          const targetArea = yVal + dotGain * (1.0 - yVal) * 0.5;
          if (u * u + v * v <= targetArea * maxDistSq) hasY = 1;
        }
      }

      // Black dot
      let hasK = 0;
      if (kVal > 0.001) {
        if (kVal >= 0.999) {
          hasK = 1;
        } else {
          const rx = x * cosK + baseRotXK;
          const ry = x * sinK + baseRotYK;
          const u = ((rx % dotSize) + dotSize) % dotSize - halfDot;
          const v = ((ry % dotSize) + dotSize) % dotSize - halfDot;
          const targetArea = kVal + dotGain * (1.0 - kVal) * 0.5;
          if (u * u + v * v <= targetArea * maxDistSq) hasK = 1;
        }
      }

      // Recombine subtractive inks back to RGB
      const invDotK = 1.0 - hasK;
      data[idx] = Math.round((1.0 - hasC) * invDotK * 255);
      data[idx + 1] = Math.round((1.0 - hasM) * invDotK * 255);
      data[idx + 2] = Math.round((1.0 - hasY) * invDotK * 255);
      // alpha data[idx + 3] preserved
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

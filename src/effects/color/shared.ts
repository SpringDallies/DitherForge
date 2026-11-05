// DitherForge Phase 6 - Color / Stylization Effects Shared Utilities
import type { BlendMode, EffectCategory, EffectContext, ParamMeta } from '../types';

export type { BlendMode, EffectCategory, EffectContext, ParamMeta };

export interface EffectDescriptor<P = any> {
  id: string;
  name: string;
  category: EffectCategory;
  description?: string;
  defaultParams: P;
  defaultOpacity?: number;
  defaultBlendMode?: BlendMode;
  paramsMeta: ParamMeta[];
  params: ParamMeta[];
  apply: (
    dataOrCtx: Uint8ClampedArray | any,
    widthOrParams?: number | any,
    heightOrCtx?: number | any,
    params?: any,
    context?: EffectContext
  ) => void;
  applyFrame?: (
    ctx: any,
    params?: any,
    frameIndex?: number
  ) => void;
}

export function resolveContext(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: EffectContext
): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  params: any;
  context?: EffectContext;
} {
  if (dataOrCtx instanceof Uint8ClampedArray && typeof widthOrParams === 'number' && typeof heightOrCtx === 'number') {
    return {
      data: dataOrCtx,
      width: widthOrParams,
      height: heightOrCtx,
      params: params || {},
      context: context
    };
  }

  let data: Uint8ClampedArray;
  let width: number;
  let height: number;

  if (dataOrCtx.data && typeof dataOrCtx.width === 'number' && typeof dataOrCtx.height === 'number') {
    data = dataOrCtx.data;
    width = dataOrCtx.width;
    height = dataOrCtx.height;
  } else if (dataOrCtx.imageData && dataOrCtx.imageData.data) {
    data = dataOrCtx.imageData.data;
    width = dataOrCtx.imageData.width;
    height = dataOrCtx.imageData.height;
  } else if (typeof dataOrCtx.getImageData === 'function' && dataOrCtx.canvas) {
    const idata = dataOrCtx.getImageData(0, 0, dataOrCtx.canvas.width, dataOrCtx.canvas.height);
    data = idata.data;
    width = idata.width;
    height = idata.height;
  } else {
    throw new Error("Invalid effect context");
  }

  return {
    data,
    width,
    height,
    params: widthOrParams || {},
    context: typeof heightOrCtx === 'object' && heightOrCtx !== null ? heightOrCtx : context
  };
}

export const getBuffer = resolveContext;

export function blendChannel(base: number, blend: number, mode: BlendMode): number {
  switch (mode) {
    case 'screen':
      return 255 - Math.round(((255 - base) * (255 - blend)) / 255);
    case 'multiply':
      return Math.round((base * blend) / 255);
    case 'overlay':
      return base < 128
        ? Math.round((2 * base * blend) / 255)
        : 255 - Math.round((2 * (255 - base) * (255 - blend)) / 255);
    case 'soft-light': {
      const b = base / 255;
      const s = blend / 255;
      const res = s < 0.5
        ? b - (1 - 2 * s) * b * (1 - b)
        : b + (2 * s - 1) * ((b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b);
      return Math.round(Math.max(0, Math.min(255, res * 255)));
    }
    case 'add':
      return Math.min(255, base + blend);
    case 'normal':
    default:
      return blend;
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

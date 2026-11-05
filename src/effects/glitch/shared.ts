// DitherForge Phase 5 - Digital / Glitch Effects Shared Utilities
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

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function createRng(seed: number): () => number {
  let s = (seed | 0) + 0x6D2B79F5;
  return function () {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2D(x: number, y: number, seed: number = 0): number {
  let h = seed ^ (x * 374761393 + y * 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

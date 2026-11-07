// DitherForge Post-Effects Pipeline Type Definitions (v2)

export type BlendMode =
  | 'normal'
  | 'screen'
  | 'multiply'
  | 'overlay'
  | 'soft-light'
  | 'add';

export const BLEND_MODES: BlendMode[] = [
  'normal',
  'screen',
  'multiply',
  'overlay',
  'soft-light',
  'add'
];

export type EffectCategory =
  | 'crt'
  | 'film'
  | 'print'
  | 'glitch'
  | 'color'
  | 'texture';

export const EFFECT_CATEGORIES: { id: EffectCategory; label: string; description: string }[] = [
  { id: 'crt', label: 'CRT & Video', description: 'Phosphor masks, scanlines, analog tracking & curvature' },
  { id: 'film', label: 'Film & Optics', description: 'Halation, grain, dust, light leaks, weave & lenses' },
  { id: 'texture', label: 'Texture & Pixels', description: 'Pixelation, halftones, compression & patterns' },
  { id: 'print', label: 'Print & Ink', description: 'Screenprinting, risograph, newsprint & dithers' },
  { id: 'glitch', label: 'Glitch & Decay', description: 'Datamosh, sync errors, bitrot & corruption' },
  { id: 'color', label: 'Color & Grade', description: 'Tonal curves, duotones, LUTs & color shifts' }
];

export type ParamType = 'number' | 'range' | 'boolean' | 'select' | 'color' | 'stops';

export interface ParamOption {
  value: string;
  label: string;
}

export interface GradientStop {
  pos: number;
  color: [number, number, number];
}

export interface ParamMeta {
  id: string;
  label: string;
  type: ParamType;
  min?: number;
  max?: number;
  step?: number;
  options?: ParamOption[];
  defaultValue: any;
  unit?: string;
}

export interface EffectContext {
  frameIndex?: number;
  time?: number;
  fps?: number;
}

export interface EffectDescriptor<P = any> {
  id: string;
  name: string;
  category: EffectCategory;
  description?: string;
  defaultParams: P;
  defaultOpacity?: number;
  defaultBlendMode?: BlendMode;
  mutatesAlpha?: boolean;
  canOperateInPlace?: boolean;
  paramsMeta?: ParamMeta[];
  params?: any[];
  apply: (
    dataOrCtx: any,
    widthOrParams?: any,
    heightOrCtx?: any,
    params?: any,
    context?: EffectContext
  ) => void;
  applyFrame?: (
    ctx: any,
    params?: any,
    frameIndex?: number
  ) => void;
}

export function getEffectParamsMeta(desc?: EffectDescriptor | null): ParamMeta[] {
  if (!desc) return [];
  return desc.paramsMeta || (desc.params as ParamMeta[]) || [];
}

export interface EffectItem {
  id: string;
  type: string;
  name?: string;
  enabled: boolean;
  params: Record<string, any>;
  opacity?: number;
  blendMode?: BlendMode;
}

export interface PresetEffectV2 {
  id: string;
  enabled: boolean;
  params: Record<string, any>;
  opacity?: number;
  blendMode?: BlendMode;
}

export interface PresetV2 {
  version: 2;
  id: string;
  name: string;
  description?: string;
  algorithmId?: string;
  paletteId?: string;
  palette?: any[];
  threshold?: number;
  scale?: number;
  diffusionStrength?: number;
  serpentine?: boolean;
  depth?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  gamma?: number;
  effects: PresetEffectV2[];
}

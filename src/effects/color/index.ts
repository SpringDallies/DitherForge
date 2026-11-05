// DitherForge Phase 6 - Color / Stylization Effects Index
import type { EffectDescriptor } from '../types';
import { splitToningEffect, splitToningDescriptor } from './splitToning';
import { filmFadeEffect, filmFadeDescriptor } from './filmFade';
import { posterizeEffect, posterizeDescriptor } from './posterize';
import { outlineEffect, outlineDescriptor } from './outline';
import { solarizeEffect, solarizeDescriptor } from './solarize';
import { blueprintEffect, blueprintDescriptor } from './blueprint';

export * from './splitToning';
export * from './filmFade';
export * from './posterize';
export * from './outline';
export * from './solarize';
export * from './blueprint';

export const colorEffects: EffectDescriptor[] = [
  splitToningEffect,
  filmFadeEffect,
  posterizeEffect,
  outlineEffect,
  solarizeEffect,
  blueprintEffect
];

export {
  splitToningEffect,
  splitToningDescriptor,
  filmFadeEffect,
  filmFadeDescriptor,
  posterizeEffect,
  posterizeDescriptor,
  outlineEffect,
  outlineDescriptor,
  solarizeEffect,
  solarizeDescriptor,
  blueprintEffect,
  blueprintDescriptor
};

export default colorEffects;

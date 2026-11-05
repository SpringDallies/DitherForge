// DitherForge Phase 4 - Print / Analog Media Effects Index
import type { EffectDescriptor } from '../types';
import { risographEffect } from './risograph';
import { photocopyEffect } from './photocopy';
import { paperTextureEffect } from './paperTexture';
import { rosetteAnglesEffect } from './rosetteAngles';

export * from './risograph';
export * from './photocopy';
export * from './paperTexture';
export * from './rosetteAngles';

export const printEffects: EffectDescriptor[] = [
  risographEffect,
  photocopyEffect,
  paperTextureEffect,
  rosetteAnglesEffect
];

export {
  risographEffect,
  photocopyEffect,
  paperTextureEffect,
  rosetteAnglesEffect
};

export default printEffects;

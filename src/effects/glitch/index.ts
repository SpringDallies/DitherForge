// DitherForge Phase 5 - Digital / Glitch Effects Index
import type { EffectDescriptor } from '../types';
import { bitCrushEffect } from './bitCrush';
import { sliceGlitchEffect } from './sliceGlitch';
import { blockDisplacementEffect } from './blockDisplacement';
import { frameEchoEffect } from './frameEcho';

export * from './bitCrush';
export * from './sliceGlitch';
export * from './blockDisplacement';
export * from './frameEcho';

export const glitchEffects: EffectDescriptor[] = [
  bitCrushEffect,
  sliceGlitchEffect,
  blockDisplacementEffect,
  frameEchoEffect
];

export {
  bitCrushEffect,
  sliceGlitchEffect,
  blockDisplacementEffect,
  frameEchoEffect
};

export default glitchEffects;

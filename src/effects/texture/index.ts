import type { EffectDescriptor } from '../types';
import { pixelateEffect } from './pixelate';
import { jpegArtifactsEffect } from './jpegArtifacts';
import { halftoneEffect } from './halftone';

export const textureEffects: EffectDescriptor[] = [
  pixelateEffect,
  jpegArtifactsEffect,
  halftoneEffect
];

export { pixelateEffect, jpegArtifactsEffect, halftoneEffect };

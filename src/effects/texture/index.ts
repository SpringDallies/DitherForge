import type { EffectDescriptor } from '../types';
import { pixelateEffect } from './pixelate';
import { jpegArtifactsEffect } from './jpegArtifacts';
import { halftoneEffect } from './halftone';
import { asciiRenderEffect, ASCII_RENDER_EFFECT_ID, effectParamsToAsciiSettings } from './asciiRender';

export const textureEffects: EffectDescriptor[] = [
  pixelateEffect,
  jpegArtifactsEffect,
  halftoneEffect,
  asciiRenderEffect
];

export {
  pixelateEffect,
  jpegArtifactsEffect,
  halftoneEffect,
  asciiRenderEffect,
  ASCII_RENDER_EFFECT_ID,
  effectParamsToAsciiSettings
};

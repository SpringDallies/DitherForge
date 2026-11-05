import type { EffectDescriptor } from '../types';
import { glowEffect } from './glow';
import { inverseGlowEffect } from './inverseGlow';
import { scanlinesEffect } from './scanlines';
import { phosphorMaskEffect } from './phosphorMask';
import { vhsTrackingEffect } from './vhsTracking';
import { screenCurvatureEffect } from './screenCurvature';
import { convergenceErrorEffect } from './convergenceError';
import { scanlineJitterEffect } from './scanlineJitter';
import { interlaceCombingEffect } from './interlaceCombing';
import { phosphorBloomEffect } from './phosphorBloom';
import { headSwitchingNoiseEffect } from './headSwitchingNoise';

export const crtEffects: EffectDescriptor[] = [
  glowEffect,
  inverseGlowEffect,
  scanlinesEffect,
  phosphorMaskEffect,
  vhsTrackingEffect,
  screenCurvatureEffect,
  convergenceErrorEffect,
  scanlineJitterEffect,
  interlaceCombingEffect,
  phosphorBloomEffect,
  headSwitchingNoiseEffect
];

export {
  glowEffect,
  inverseGlowEffect,
  scanlinesEffect,
  phosphorMaskEffect,
  vhsTrackingEffect,
  screenCurvatureEffect,
  convergenceErrorEffect,
  scanlineJitterEffect,
  interlaceCombingEffect,
  phosphorBloomEffect,
  headSwitchingNoiseEffect
};

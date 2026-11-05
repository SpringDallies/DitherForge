import type { EffectDescriptor } from '../types';
import { lensAberrationEffect } from './lensAberration';
import { blurSharpenEffect } from './blurSharpen';
import { curvesLevelsEffect } from './curvesLevels';
import { vignetteEffect } from './vignette';
import { inverseVignetteEffect } from './inverseVignette';
import { halationEffect } from './halation';
import { filmGrainEffect } from './filmGrain';
import { gradientMapEffect } from './gradientMap';
import { dustScratchesEffect } from './dustScratches';
import { lightLeaksEffect } from './lightLeaks';
import { gateWeaveEffect } from './gateWeave';
import { exposureFlickerEffect } from './exposureFlicker';
import { lensGhostEffect } from './lensGhost';

export const filmEffects: EffectDescriptor[] = [
  lensAberrationEffect,
  blurSharpenEffect,
  curvesLevelsEffect,
  vignetteEffect,
  inverseVignetteEffect,
  halationEffect,
  filmGrainEffect,
  gradientMapEffect,
  dustScratchesEffect,
  lightLeaksEffect,
  gateWeaveEffect,
  exposureFlickerEffect,
  lensGhostEffect
];

export {
  lensAberrationEffect,
  blurSharpenEffect,
  curvesLevelsEffect,
  vignetteEffect,
  inverseVignetteEffect,
  halationEffect,
  filmGrainEffect,
  gradientMapEffect,
  dustScratchesEffect,
  lightLeaksEffect,
  gateWeaveEffect,
  exposureFlickerEffect,
  lensGhostEffect
};

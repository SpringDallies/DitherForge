// Film Fade Effect
// Lifted blacks, rolled highlights, midtone shift (matte analog film look)
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  clamp
} from './shared';

export interface FilmFadeParams {
  blackLift?: number;
  highlightRoll?: number;
  midtoneShift?: number;
}

export const filmFadeDefaultParams: Required<FilmFadeParams> = {
  blackLift: 22,
  highlightRoll: 18,
  midtoneShift: 0.05
};

export function applyFilmFade(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...filmFadeDefaultParams, ...resolved.params };

  const blackLift = clamp(Math.round(p.blackLift), 0, 100);
  const highlightRoll = clamp(Math.round(p.highlightRoll), 0, 100);
  const midtoneShift = clamp(p.midtoneShift, -1, 1);

  const gamma = Math.pow(2.0, -midtoneShift);
  const maxOutput = 255 - highlightRoll;
  const range = Math.max(1, maxOutput - blackLift);

  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const norm = i / 255.0;
    const curved = Math.pow(norm, gamma);
    lut[i] = clamp(Math.round(blackLift + curved * range), 0, 255);
  }

  const totalPixels = width * height;
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    data[idx] = lut[data[idx]];
    data[idx + 1] = lut[data[idx + 1]];
    data[idx + 2] = lut[data[idx + 2]];
  }
}

export const filmFadeParamsMeta: ParamMeta[] = [
  {
    id: 'blackLift',
    label: 'Black Lift',
    type: 'number',
    min: 0,
    max: 64,
    step: 1,
    defaultValue: 22,
    unit: 'levels'
  },
  {
    id: 'highlightRoll',
    label: 'Highlight Roll-off',
    type: 'number',
    min: 0,
    max: 64,
    step: 1,
    defaultValue: 18,
    unit: 'levels'
  },
  {
    id: 'midtoneShift',
    label: 'Midtone Shift',
    type: 'number',
    min: -1,
    max: 1,
    step: 0.05,
    defaultValue: 0.05
  }
];

export const filmFadeEffect: EffectDescriptor<FilmFadeParams> = {
  id: 'film_fade',
  name: 'Film Fade',
  category: 'color',
  description: 'Lifted blacks, rolled highlights, and midtone tone-mapping',
  defaultParams: filmFadeDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: filmFadeParamsMeta,
  params: filmFadeParamsMeta,
  apply: applyFilmFade
};

export const filmFadeDescriptor = filmFadeEffect;
export default filmFadeEffect;

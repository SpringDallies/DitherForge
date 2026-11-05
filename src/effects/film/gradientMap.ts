// DitherForge Duotone & Multi-Stop Gradient Map Effect
// Maps image luminance across 2-5 stops in sRGB, Linear, or Perceptual Oklab color space

import type { EffectDescriptor, ParamMeta } from '../types';

export interface GradientStop {
  pos: number; // 0.0 to 1.0
  color: [number, number, number]; // [R, G, B] 0-255
}

export interface GradientMapParams {
  preset: 'custom' | 'gameboy_dmg' | 'amber_crt' | 'cyanotype' | 'risograph_2ink' | 'sepia';
  space: 'oklab' | 'linear' | 'srgb';
  preserveLuminance: boolean;
  mix: number;
  stops?: GradientStop[];
}

export const GRADIENT_PRESETS: Record<string, GradientStop[]> = {
  gameboy_dmg: [
    { pos: 0.0, color: [15, 56, 15] },
    { pos: 0.33, color: [48, 98, 48] },
    { pos: 0.66, color: [139, 172, 15] },
    { pos: 1.0, color: [155, 188, 15] }
  ],
  amber_crt: [
    { pos: 0.0, color: [10, 4, 0] },
    { pos: 0.35, color: [102, 36, 0] },
    { pos: 0.7, color: [204, 102, 0] },
    { pos: 1.0, color: [255, 176, 0] }
  ],
  cyanotype: [
    { pos: 0.0, color: [5, 16, 38] },
    { pos: 0.35, color: [14, 42, 92] },
    { pos: 0.7, color: [41, 98, 155] },
    { pos: 1.0, color: [220, 234, 245] }
  ],
  risograph_2ink: [
    { pos: 0.0, color: [26, 16, 47] },
    { pos: 0.35, color: [178, 34, 52] },
    { pos: 0.75, color: [255, 205, 0] },
    { pos: 1.0, color: [253, 240, 213] }
  ],
  sepia: [
    { pos: 0.0, color: [28, 18, 12] },
    { pos: 0.4, color: [97, 65, 38] },
    { pos: 0.75, color: [168, 132, 97] },
    { pos: 1.0, color: [237, 220, 196] }
  ]
};

// Oklab Color Space math: sRGB -> Linear RGB -> LMS -> Oklab
function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v: number): number {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1.0 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  ];
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

// Generate pre-computed 256-entry gradient LUT
function buildGradientLUT(
  stops: GradientStop[],
  space: 'oklab' | 'linear' | 'srgb'
): Uint8Array {
  const lut = new Uint8Array(256 * 3);
  const sortedStops = [...stops].sort((a, b) => a.pos - b.pos);
  if (sortedStops.length === 0) {
    sortedStops.push({ pos: 0, color: [0, 0, 0] }, { pos: 1, color: [255, 255, 255] });
  } else if (sortedStops.length === 1) {
    sortedStops.push({ pos: 1, color: sortedStops[0].color });
  }

  // Pre-convert stops to working space
  const oklabStops = sortedStops.map((s) => rgbToOklab(s.color[0], s.color[1], s.color[2]));
  const linearStops = sortedStops.map((s) => [
    srgbToLinear(s.color[0]),
    srgbToLinear(s.color[1]),
    srgbToLinear(s.color[2])
  ]);

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let idx0 = 0;
    while (idx0 < sortedStops.length - 1 && sortedStops[idx0 + 1].pos < t) {
      idx0++;
    }
    const idx1 = Math.min(sortedStops.length - 1, idx0 + 1);

    const s0 = sortedStops[idx0];
    const s1 = sortedStops[idx1];
    const span = Math.max(0.0001, s1.pos - s0.pos);
    const f = Math.max(0, Math.min(1, (t - s0.pos) / span));

    let r = 0, g = 0, b = 0;
    if (space === 'oklab') {
      const k0 = oklabStops[idx0];
      const k1 = oklabStops[idx1];
      const L = k0[0] + (k1[0] - k0[0]) * f;
      const oA = k0[1] + (k1[1] - k0[1]) * f;
      const oB = k0[2] + (k1[2] - k0[2]) * f;
      const rgb = oklabToRgb(L, oA, oB);
      r = rgb[0]; g = rgb[1]; b = rgb[2];
    } else if (space === 'linear') {
      const l0 = linearStops[idx0];
      const l1 = linearStops[idx1];
      const lr = l0[0] + (l1[0] - l0[0]) * f;
      const lg = l0[1] + (l1[1] - l0[1]) * f;
      const lb = l0[2] + (l1[2] - l0[2]) * f;
      r = linearToSrgb(lr); g = linearToSrgb(lg); b = linearToSrgb(lb);
    } else {
      // sRGB direct
      r = Math.round(s0.color[0] + (s1.color[0] - s0.color[0]) * f);
      g = Math.round(s0.color[1] + (s1.color[1] - s0.color[1]) * f);
      b = Math.round(s0.color[2] + (s1.color[2] - s0.color[2]) * f);
    }

    const lutIdx = i * 3;
    lut[lutIdx] = r;
    lut[lutIdx + 1] = g;
    lut[lutIdx + 2] = b;
  }

  return lut;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'preset',
    label: 'Colorway Preset',
    type: 'select',
    options: [
      { value: 'gameboy_dmg', label: 'GameBoy DMG (Pea Soup Green)' },
      { value: 'amber_crt', label: 'Amber Phosphor CRT' },
      { value: 'cyanotype', label: 'Cyanotype / Blueprint' },
      { value: 'risograph_2ink', label: 'Risograph 2-Ink (Scarlet & Gold)' },
      { value: 'sepia', label: 'Vintage Photographic Sepia' },
      { value: 'custom', label: 'Custom Palette Stops' }
    ],
    defaultValue: 'gameboy_dmg'
  },
  {
    id: 'space',
    label: 'Interpolation Space',
    type: 'select',
    options: [
      { value: 'oklab', label: 'Oklab (Perceptually Uniform)' },
      { value: 'linear', label: 'Linear sRGB' },
      { value: 'srgb', label: 'Standard sRGB' }
    ],
    defaultValue: 'oklab'
  },
  {
    id: 'preserveLuminance',
    label: 'Preserve Input Luminance',
    type: 'boolean',
    defaultValue: false
  },
  {
    id: 'mix',
    label: 'Gradient Mix',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 1.0
  }
];

export const gradientMapEffect: EffectDescriptor<GradientMapParams> = {
  id: 'gradient_map',
  name: 'Duotone / Gradient Map',
  category: 'film',
  description: 'Maps grayscale tonal luminance into custom 2-5 stop color gradients using Oklab color space.',
  defaultParams: {
    preset: 'gameboy_dmg',
    space: 'oklab',
    preserveLuminance: false,
    mix: 1.0,
    stops: GRADIENT_PRESETS.gameboy_dmg
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: GradientMapParams;

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as GradientMapParams;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as GradientMapParams;
    }

    const {
      preset = 'gameboy_dmg',
      space = 'oklab',
      preserveLuminance = false,
      mix = 1.0,
      stops: customStops
    } = params;

    if (mix <= 0.001) return;

    const stops = (preset !== 'custom' && GRADIENT_PRESETS[preset])
      ? GRADIENT_PRESETS[preset]
      : (customStops && customStops.length >= 2 ? customStops : GRADIENT_PRESETS.gameboy_dmg);

    const lut = buildGradientLUT(stops, space);
    const pixelCount = w * h;
    const blendFactor = Math.max(0, Math.min(1, mix));
    const invBlend = 1.0 - blendFactor;

    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      const origR = data[idx];
      const origG = data[idx + 1];
      const origB = data[idx + 2];

      // Standard perceptual luminance
      const lum = Math.round(0.2126 * origR + 0.7152 * origG + 0.0722 * origB);
      const safeLum = Math.max(0, Math.min(255, lum));

      const lutIdx = safeLum * 3;
      let mapR = lut[lutIdx];
      let mapG = lut[lutIdx + 1];
      let mapB = lut[lutIdx + 2];

      if (preserveLuminance) {
        const mapLum = (0.2126 * mapR + 0.7152 * mapG + 0.0722 * mapB) || 1;
        const lumScale = safeLum / mapLum;
        mapR = Math.max(0, Math.min(255, Math.round(mapR * lumScale)));
        mapG = Math.max(0, Math.min(255, Math.round(mapG * lumScale)));
        mapB = Math.max(0, Math.min(255, Math.round(mapB * lumScale)));
      }

      if (blendFactor >= 0.999) {
        data[idx] = mapR;
        data[idx + 1] = mapG;
        data[idx + 2] = mapB;
      } else {
        data[idx] = Math.round(origR * invBlend + mapR * blendFactor);
        data[idx + 1] = Math.round(origG * invBlend + mapG * blendFactor);
        data[idx + 2] = Math.round(origB * invBlend + mapB * blendFactor);
      }
    }
  }
};

// DitherForge Preset Schema v2 & Migration Engine
import type { PresetV2, PresetEffectV2, EffectDescriptor } from './types';

export type { PresetV2, PresetEffectV2 };

export const EFFECT_ALIASES: Record<string, string> = {
  chromatic_aberration: 'lens_aberration',
  crt_lines: 'scanlines',
  duotone: 'gradient_map'
};

/**
 * Resolves any legacy or alias effect identifier to its canonical descriptor ID.
 */
export function resolveEffectId(rawId: string): string {
  const norm = String(rawId || '').trim();
  return EFFECT_ALIASES[norm] || norm;
}

/**
 * Adapts legacy effect parameters to the consolidated effect schemas.
 */
function adaptLegacyParams(canonicalId: string, rawId: string, params: Record<string, any> = {}): Record<string, any> {
  const p = { ...params };
  if (rawId === 'chromatic_aberration' || canonicalId === 'lens_aberration') {
    if (!p.mode) p.mode = 'uniform';
    if (p.offsetX === undefined && p.offset_x !== undefined) p.offsetX = p.offset_x;
    if (p.offsetY === undefined && p.offset_y !== undefined) p.offsetY = p.offset_y;
    if (p.offsetX === undefined) p.offsetX = 4;
    if (p.offsetY === undefined) p.offsetY = 0;
    if (p.intensity === undefined) p.intensity = Math.hypot(p.offsetX, p.offsetY);
  } else if (rawId === 'crt_lines' || canonicalId === 'scanlines') {
    if (!p.mode) p.mode = 'soft';
    if (p.thickness === undefined) p.thickness = 2;
    if (p.intensity === undefined) p.intensity = 0.4;
  }
  return p;
}

/**
 * Migrates a Preset v1 (or untyped preset object) to Preset Schema v2.
 * Unknown effect IDs are preserved with `enabled: false`.
 */
export function migratePresetToV2(
  rawPreset: any,
  registryLookup?: (id: string) => EffectDescriptor | undefined
): PresetV2 {
  if (!rawPreset || typeof rawPreset !== 'object') {
    return {
      version: 2,
      id: `preset_${Date.now()}`,
      name: 'Untitled Preset',
      effects: []
    };
  }

  const rawEffects: any[] = Array.isArray(rawPreset.effects) ? rawPreset.effects : [];
  const migratedEffects: PresetEffectV2[] = [];

  for (const rawEff of rawEffects) {
    if (!rawEff) continue;
    const rawId = String(rawEff.id || rawEff.type || '');
    const canonicalId = resolveEffectId(rawId);
    const descriptor = registryLookup ? registryLookup(canonicalId) : undefined;
    const isKnown = Boolean(descriptor);

    const params = adaptLegacyParams(canonicalId, rawId, rawEff.params);
    const opacity = typeof rawEff.opacity === 'number' ? Math.max(0, Math.min(1, rawEff.opacity)) : 1.0;
    const blendMode = rawEff.blendMode || descriptor?.defaultBlendMode || 'normal';

    // Unknown IDs must load disabled
    const enabled = isKnown ? Boolean(rawEff.enabled) : false;

    migratedEffects.push({
      id: canonicalId,
      enabled,
      params,
      opacity,
      blendMode
    });
  }

  return {
    version: 2,
    id: rawPreset.id || `preset_${Date.now()}`,
    name: rawPreset.name || 'Custom Preset',
    description: rawPreset.description,
    algorithmId: rawPreset.algorithmId,
    paletteId: rawPreset.paletteId,
    threshold: rawPreset.threshold,
    scale: rawPreset.scale,
    diffusionStrength: rawPreset.diffusionStrength,
    serpentine: rawPreset.serpentine,
    depth: rawPreset.depth,
    brightness: rawPreset.brightness,
    contrast: rawPreset.contrast,
    saturation: rawPreset.saturation,
    hue: rawPreset.hue,
    gamma: rawPreset.gamma,
    effects: migratedEffects
  };
}

const STORAGE_KEY_V2 = 'ditherforge_user_presets_v2';
const STORAGE_KEY_V1 = 'ditherforge_user_presets';

export function saveUserPresetsV2(presets: PresetV2[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save v2 presets to localStorage', e);
  }
}

export function loadUserPresetsV2(registryLookup?: (id: string) => EffectDescriptor | undefined): PresetV2[] {
  try {
    // 1. Try loading native v2 presets
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => (p.version === 2 ? p : migratePresetToV2(p, registryLookup)));
      }
    }

    // 2. Fall back and migrate v1 presets if available
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated = parsed.map((p) => migratePresetToV2(p, registryLookup));
        saveUserPresetsV2(migrated);
        return migrated;
      }
    }
  } catch (e) {
    console.error('Failed to load user presets', e);
  }
  return [...NAMED_CHAIN_PRESETS];
}

export const NAMED_CHAIN_PRESETS: PresetV2[] = [
  {
    version: 2,
    id: 'preset_trinitron_1994',
    name: 'Trinitron 1994',
    algorithmId: 'floyd-steinberg',
    effects: [
      { id: 'screen_curvature', enabled: true, params: { curvature: 0.14, cornerRounding: 0.08, edgeSampling: 'black' }, opacity: 1.0, blendMode: 'normal' },
      { id: 'phosphor_mask', enabled: true, params: { maskType: 'aperture_grille', pitch: 2, intensity: 0.35, rgbBias: 0.65, vertical: true, blendMode: 'multiply' }, opacity: 0.9, blendMode: 'multiply' },
      { id: 'scanlines', enabled: true, params: { mode: 'soft', thickness: 1.5, intensity: 0.35 }, opacity: 0.85, blendMode: 'multiply' },
      { id: 'phosphor_bloom', enabled: true, params: { threshold: 0.55, radius: 6, intensity: 0.45, tint: '#9be7ff' }, opacity: 1.0, blendMode: 'normal' },
      { id: 'convergence_error', enabled: true, params: { centerX: 0.5, centerY: 0.5, edgePx: 3.0, radialExponent: 2.0, redScale: 1.0, greenScale: 0.0, blueScale: -1.0 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'vignette', enabled: true, params: { intensity: 0.35, radius: 0.85 }, opacity: 1.0, blendMode: 'normal' }
    ]
  },
  {
    version: 2,
    id: 'preset_photocopy_zine',
    name: 'Photocopy Zine',
    algorithmId: 'atkinson',
    effects: [
      { id: 'photocopy_degradation', enabled: true, params: { contrast: 1.8, tonerScatter: 0.4, rollerDamage: true, threshold: 0.5 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'paper_texture', enabled: true, params: { textureType: 'newsprint', roughness: 0.5, fiberDensity: 0.6 }, opacity: 0.8, blendMode: 'multiply' },
      { id: 'halftone', enabled: true, params: { dotSize: 4, angle: 45, intensity: 0.7 }, opacity: 0.85, blendMode: 'normal' },
      { id: 'curves_levels', enabled: true, params: { blackPoint: 0.2, whitePoint: 0.85, gamma: 1.1 }, opacity: 1.0, blendMode: 'normal' }
    ]
  },
  {
    version: 2,
    id: 'preset_super_8',
    name: 'Super 8',
    algorithmId: 'floyd-steinberg',
    effects: [
      { id: 'gate_weave', enabled: true, params: { amplitude: 2.0, frequency: 1.0, drift: 0.35, temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'exposure_flicker', enabled: true, params: { amplitude: 0.15, frequency: 0.8, mode: 'stepped', temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'film_grain', enabled: true, params: { intensity: 0.4, size: 2, channelIndependence: 0.35, shadowWeight: 0.7, midWeight: 1.0, highlightWeight: 0.4, temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'dust_scratches', enabled: true, params: { density: 0.25, minSize: 1, maxSize: 3, scratchProbability: 0.4, streakLength: 50, colorMode: 'mixed', temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'light_leaks', enabled: true, params: { direction: 'top_left', radius: 0.85, tint: '#ff8844', secondaryTint: '#ff3366', intensity: 0.55, temporal: true }, opacity: 0.85, blendMode: 'screen' },
      { id: 'halation', enabled: true, params: { threshold: 0.6, radius: 12, tint: '#ff4a2c', intensity: 0.7, wideNarrowRatio: 0.4 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'film_fade', enabled: true, params: { lift: 0.12, fadeColor: '#2b2118' }, opacity: 0.75, blendMode: 'normal' },
      { id: 'vignette', enabled: true, params: { intensity: 0.5, radius: 0.75 }, opacity: 1.0, blendMode: 'normal' }
    ]
  },
  {
    version: 2,
    id: 'preset_gameboy_pocket',
    name: 'GameBoy Pocket',
    algorithmId: 'bayer-4x4',
    paletteId: 'monochrome_2bit',
    effects: [
      { id: 'gradient_map', enabled: true, params: { preset: 'gameboy_dmg', space: 'oklab', preserveLuminance: false, mix: 1.0 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'bit_crush', enabled: true, params: { bits: 2, ditherLevel: 0.1 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'pixelate', enabled: true, params: { blockSize: 2 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'scanlines', enabled: true, params: { mode: 'hard', thickness: 1, intensity: 0.25 }, opacity: 0.7, blendMode: 'multiply' }
    ]
  },
  {
    version: 2,
    id: 'preset_vhs_rental',
    name: 'VHS Rental',
    algorithmId: 'floyd-steinberg',
    effects: [
      { id: 'vhs_tracking', enabled: true, params: { bandHeight: 38, scrollSpeed: 1.3, bandPosition: 0.78, opacity: 0.85, shear: 20, colorSmear: 5, dropoutDensity: 0.16, temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'head_switching_noise', enabled: true, params: { height: 12, intensity: 0.9, horizontalBias: 0.4, lineJitter: 7, temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'scanline_jitter', enabled: true, params: { amplitude: 3.5, frequency: 0.2, mode: 'per_row', bandHeight: 8, temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'interlace_combing', enabled: true, params: { fieldOffset: 3.0, fieldPolarity: 'odd_first', temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'lens_aberration', enabled: true, params: { mode: 'convergence', offsetX: 3, offsetY: 0 }, opacity: 0.9, blendMode: 'normal' },
      { id: 'screen_curvature', enabled: true, params: { curvature: 0.12, cornerRounding: 0.1, edgeSampling: 'black' }, opacity: 1.0, blendMode: 'normal' }
    ]
  }
];

// DitherForge Preset Schema v2 & Migration Engine
import type { PresetV2, PresetEffectV2, EffectDescriptor, EffectItem } from './types';

export type { PresetV2, PresetEffectV2 };

/**
 * Legacy aliases & snake_case to camelCase conversion map.
 */
export const EFFECT_ALIASES: Record<string, string> = {
  // Legacy aliases (Day 1 backwards compatibility)
  chromatic_aberration: 'lens_aberration',
  crt_lines: 'scanlines',
  duotone: 'gradient_map',

  // Agent B Phase 4-6 snake_case to canonical camelCase aliases
  risograph_misregistration: 'risoMisreg',
  risographMisregistration: 'risoMisreg',
  photocopy_degradation: 'photocopy',
  photocopyDegradation: 'photocopy',
  paper_texture: 'paperTexture',
  rosette_angles: 'rosetteAngles',
  bit_crush: 'bitCrush',
  slice_glitch: 'sliceGlitch',
  block_displacement: 'blockDisplacement',
  frame_echo: 'frameEcho',
  split_toning: 'splitToning',
  film_fade: 'filmFade',
  posterize_post: 'posterize',
  posterizePost: 'posterize',
  outline_overlay: 'outline',
  outlineOverlay: 'outline',
  blueprint_cyanotype: 'blueprint',
  blueprintCyanotype: 'blueprint'
};

/**
 * Bidirectional Canonical Map: maps ANY known alias/casing to its agreed canonical form.
 */
export const CANONICAL_EFFECT_MAP: Record<string, string> = {
  // Phase 4 Print (Canonical camelCase)
  risograph_misregistration: 'risoMisreg',
  risographMisregistration: 'risoMisreg',
  risoMisreg: 'risoMisreg',
  photocopy_degradation: 'photocopy',
  photocopyDegradation: 'photocopy',
  photocopy: 'photocopy',
  paper_texture: 'paperTexture',
  paperTexture: 'paperTexture',
  rosette_angles: 'rosetteAngles',
  rosetteAngles: 'rosetteAngles',

  // Phase 5 Glitch (Canonical camelCase)
  bit_crush: 'bitCrush',
  bitCrush: 'bitCrush',
  slice_glitch: 'sliceGlitch',
  sliceGlitch: 'sliceGlitch',
  block_displacement: 'blockDisplacement',
  blockDisplacement: 'blockDisplacement',
  frame_echo: 'frameEcho',
  frameEcho: 'frameEcho',

  // Phase 6 Color (Canonical camelCase)
  split_toning: 'splitToning',
  splitToning: 'splitToning',
  film_fade: 'filmFade',
  filmFade: 'filmFade',
  posterize_post: 'posterize',
  posterizePost: 'posterize',
  posterize: 'posterize',
  outline_overlay: 'outline',
  outlineOverlay: 'outline',
  outline: 'outline',
  solarize: 'solarize',
  blueprint_cyanotype: 'blueprint',
  blueprintCyanotype: 'blueprint',
  blueprint: 'blueprint',

  // Legacy mappings
  chromatic_aberration: 'lens_aberration',
  crt_lines: 'scanlines',
  duotone: 'gradient_map'
};

/**
 * Map from canonical camelCase ID to underlying effect descriptor ID.
 */
export const CANONICAL_TO_DESCRIPTOR_MAP: Record<string, string> = {
  risoMisreg: 'risograph_misregistration',
  risographMisregistration: 'risograph_misregistration',
  photocopy: 'photocopy_degradation',
  photocopyDegradation: 'photocopy_degradation',
  paperTexture: 'paper_texture',
  rosetteAngles: 'rosette_angles',
  bitCrush: 'bit_crush',
  sliceGlitch: 'slice_glitch',
  blockDisplacement: 'block_displacement',
  frameEcho: 'frame_echo',
  splitToning: 'split_toning',
  filmFade: 'film_fade',
  posterize: 'posterize_post',
  posterizePost: 'posterize_post',
  outline: 'outline_overlay',
  outlineOverlay: 'outline_overlay',
  blueprint: 'blueprint_cyanotype',
  blueprintCyanotype: 'blueprint_cyanotype',
  solarize: 'solarize',

  // Phase 1-3 camelCase to descriptor IDs
  phosphorMask: 'phosphor_mask',
  vhsTracking: 'vhs_tracking',
  screenCurvature: 'screen_curvature',
  convergenceError: 'convergence_error',
  scanlineJitter: 'scanline_jitter',
  interlaceCombing: 'interlace_combing',
  phosphorBloom: 'phosphor_bloom',
  headSwitchingNoise: 'head_switching_noise',
  filmGrain: 'film_grain',
  gradientMap: 'gradient_map',
  dustScratches: 'dust_scratches',
  lightLeaks: 'light_leaks',
  gateWeave: 'gate_weave',
  exposureFlicker: 'exposure_flicker',
  lensGhost: 'lens_ghost',
  lensAberration: 'lens_aberration',
  blurSharpen: 'blur_sharpen',
  curvesLevels: 'curves_levels',
  inverseVignette: 'inverse_vignette',
  inverseGlow: 'inverse_glow',
  jpegArtifacts: 'jpeg_artifacts'
};

/**
 * Returns the canonical ID (camelCase for Agent B Phase 4-6 effects).
 */
export function canonicalizeEffectId(rawId: string): string {
  const norm = String(rawId || '').trim();
  return CANONICAL_EFFECT_MAP[norm] || EFFECT_ALIASES[norm] || norm;
}

/**
 * Maps any effect identifier (canonical, alias, or legacy) to its registered descriptor ID.
 */
export function toDescriptorId(rawId: string): string {
  const norm = String(rawId || '').trim();
  return CANONICAL_TO_DESCRIPTOR_MAP[norm] || norm;
}

/**
 * Resolves any legacy or alias effect identifier.
 * Preserves Day 1 compatibility: chromatic_aberration -> lens_aberration, crt_lines -> scanlines.
 */
export function resolveEffectId(rawId: string): string {
  const norm = String(rawId || '').trim();
  if (EFFECT_ALIASES[norm]) return EFFECT_ALIASES[norm];
  if (CANONICAL_EFFECT_MAP[norm]) return CANONICAL_EFFECT_MAP[norm];
  return norm;
}

/**
 * Adapts legacy effect parameters to the consolidated effect schemas.
 */
function adaptLegacyParams(canonicalId: string, rawId: string, params: Record<string, any> = {}): Record<string, any> {
  const p = { ...params };
  if (rawId === 'chromatic_aberration' || canonicalId === 'lens_aberration' || canonicalId === 'lensAberration') {
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
 * Canonicalizes all effect IDs on load.
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
    const canonicalId = canonicalizeEffectId(rawId);
    const descId = toDescriptorId(canonicalId);
    const descriptor = registryLookup
      ? (registryLookup(canonicalId) || registryLookup(descId) || registryLookup(rawId))
      : undefined;
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

/**
 * Known built-in and premade preset IDs across all versions of DitherForge.
 */
export const PREMADE_PRESET_IDS = new Set<string>([
  'preset_trinitron_1994',
  'preset_photocopy_zine',
  'preset_super_8',
  'preset_gameboy_pocket',
  'preset_vhs_rental',
  'mac_1984',
  'gameboy_classic',
  'cyberpunk_terminal',
  'c64_nostalgia',
  'amber_crt_monitor',
  'vhs_tape_decay',
  'newsprint_halftone',
  'vaporwave_sunset',
  'nordic_deep_frost',
  'pico_pixel_fantasy',
  'glitch_matrix',
  'newspaper_print',
  'synthwave_sunset',
  'newspaper_newsprint',
  'gameboy_dmg',
  'vcr_sp_mode',
  'lofi_security_cam'
]);

export function isPremadePreset(preset: any): boolean {
  if (!preset || typeof preset !== 'object') return false;
  const id = String(preset.id || '').trim();
  const name = String(preset.name || '').trim().toLowerCase();
  if (PREMADE_PRESET_IDS.has(id)) return true;
  if (NAMED_CHAIN_PRESETS.some((n) => n.id === id || n.name.toLowerCase() === name)) return true;
  return false;
}

export function saveUserPresetsV2(presets: PresetV2[]): void {
  try {
    const canonicalized = presets.map((p) => ({
      ...p,
      effects: (p.effects || []).map((e) => ({
        ...e,
        id: canonicalizeEffectId(e.id)
      }))
    }));
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(canonicalized));
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
      if (Array.isArray(parsed)) {
        const userOnly = parsed
          .filter((p) => !isPremadePreset(p))
          .map((p) => migratePresetToV2(p, registryLookup));
        if (userOnly.length !== parsed.length) {
          saveUserPresetsV2(userOnly);
        }
        return userOnly;
      }
    }

    // 2. Fall back and migrate v1 presets if available
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      if (Array.isArray(parsed)) {
        const userOnly = parsed
          .filter((p) => !isPremadePreset(p))
          .map((p) => migratePresetToV2(p, registryLookup));
        saveUserPresetsV2(userOnly);
        return userOnly;
      }
    }
  } catch (e) {
    console.error('Failed to load user presets', e);
  }
  return [];
}

/**
 * Merges preset effects into the full application effects stack.
 * Guarantees that ALL effects remain in the stack:
 * - Effects included in the preset are enabled (or set to preset.enabled) and their params/opacity/blendMode applied.
 * - Effects not included in the preset remain in the list but are disabled (enabled: false).
 * This prevents effects from disappearing from the UI upon preset selection.
 */
export function mergePresetEffects(
  currentEffects: EffectItem[] = [],
  presetEffects: PresetEffectV2[] = [],
  allDescriptors?: EffectDescriptor[]
): EffectItem[] {
  const presetMap = new Map<string, PresetEffectV2>();
  for (const pe of presetEffects) {
    if (!pe) continue;
    const rawId = String(pe.id || '').trim();
    if (!rawId) continue;
    presetMap.set(rawId, pe);
    const canonical = canonicalizeEffectId(rawId);
    if (canonical) presetMap.set(canonical, pe);
    const descId = toDescriptorId(rawId);
    if (descId) presetMap.set(descId, pe);
    const resolved = resolveEffectId(rawId);
    if (resolved) presetMap.set(resolved, pe);
  }

  const descriptors = allDescriptors && allDescriptors.length > 0 ? allDescriptors : [];
  const currentById = new Map<string, EffectItem>();
  for (const item of currentEffects) {
    if (item && item.id) {
      currentById.set(item.id, item);
      if (item.type) currentById.set(item.type, item);
      const canonical = canonicalizeEffectId(item.id);
      if (canonical) currentById.set(canonical, item);
      const descId = toDescriptorId(item.id);
      if (descId) currentById.set(descId, item);
    }
  }

  // 1. If descriptors are available, build/restore the complete stack using them as the source of truth
  if (descriptors.length > 0) {
    return descriptors.map((desc) => {
      const existing =
        currentById.get(desc.id) ||
        currentById.get(toDescriptorId(desc.id)) ||
        currentById.get(canonicalizeEffectId(desc.id));

      const match =
        presetMap.get(desc.id) ||
        presetMap.get(canonicalizeEffectId(desc.id)) ||
        presetMap.get(toDescriptorId(desc.id)) ||
        (existing ? (presetMap.get(existing.id) || (existing.type ? presetMap.get(existing.type) : undefined)) : undefined);

      if (match) {
        return {
          id: desc.id,
          type: desc.id,
          name: desc.name,
          enabled: match.enabled !== undefined ? Boolean(match.enabled) : true,
          params: {
            ...(desc.defaultParams || {}),
            ...(existing?.params || {}),
            ...(match.params || {})
          },
          opacity: match.opacity !== undefined ? match.opacity : (existing?.opacity ?? desc.defaultOpacity ?? 1.0),
          blendMode: match.blendMode || existing?.blendMode || desc.defaultBlendMode || 'normal'
        };
      }

      return {
        id: desc.id,
        type: desc.id,
        name: desc.name,
        enabled: false,
        params: {
          ...(desc.defaultParams || {}),
          ...(existing?.params || {})
        },
        opacity: existing?.opacity !== undefined ? existing.opacity : (desc.defaultOpacity ?? 1.0),
        blendMode: existing?.blendMode || desc.defaultBlendMode || 'normal'
      };
    });
  }

  // 2. Fallback if descriptors are omitted: operate on currentEffects directly
  return currentEffects.map((item) => {
    const canonical = canonicalizeEffectId(item.id);
    const descId = toDescriptorId(item.id);
    const match =
      presetMap.get(item.id) ||
      (item.type ? presetMap.get(item.type) : undefined) ||
      presetMap.get(canonical) ||
      presetMap.get(descId);

    if (match) {
      return {
        ...item,
        enabled: match.enabled !== undefined ? Boolean(match.enabled) : true,
        params: {
          ...item.params,
          ...(match.params || {})
        },
        opacity: match.opacity !== undefined ? match.opacity : (item.opacity ?? 1.0),
        blendMode: match.blendMode || item.blendMode || 'normal'
      };
    }

    return {
      ...item,
      enabled: false
    };
  });
}

/**
 * Curated Named Chain Presets (Preset Schema v2)
 * Composed using both agents' effect IDs and canonical camelCase schemas.
 */
export const NAMED_CHAIN_PRESETS: PresetV2[] = [
  {
    version: 2,
    id: 'preset_trinitron_1994',
    name: 'Trinitron 1994',
    description: 'Authentic 1990s Sony Trinitron CRT television with aperture grille phosphor mask, soft scanlines, curved tube face, beam blooming, halation, and edge convergence divergence.',
    algorithmId: 'floyd-steinberg',
    effects: [
      { id: 'screen_curvature', enabled: true, params: { curvature: 0.14, cornerRounding: 0.08, edgeSampling: 'black' }, opacity: 1.0, blendMode: 'normal' },
      { id: 'phosphor_mask', enabled: true, params: { maskType: 'aperture_grille', pitch: 2, intensity: 0.35, rgbBias: 0.65, vertical: true }, opacity: 0.9, blendMode: 'multiply' },
      { id: 'scanlines', enabled: true, params: { mode: 'soft', thickness: 1.5, intensity: 0.35 }, opacity: 0.85, blendMode: 'multiply' },
      { id: 'phosphor_bloom', enabled: true, params: { threshold: 0.55, radius: 6, intensity: 0.45, tint: '#9be7ff' }, opacity: 1.0, blendMode: 'normal' },
      { id: 'halation', enabled: true, params: { threshold: 0.65, radius: 10, tint: '#ff5a3c', intensity: 0.5, wideNarrowRatio: 0.5 }, opacity: 0.85, blendMode: 'normal' },
      { id: 'convergence_error', enabled: true, params: { centerX: 0.5, centerY: 0.5, edgePx: 3.0, radialExponent: 2.0, redScale: 1.0, greenScale: 0.0, blueScale: -1.0 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'vignette', enabled: true, params: { intensity: 0.35, radius: 0.85 }, opacity: 1.0, blendMode: 'normal' }
    ]
  },
  {
    version: 2,
    id: 'preset_photocopy_zine',
    name: 'Photocopy Zine',
    description: 'Underground punk zine photocopier aesthetic with high-contrast toner scatter, CMYK rosette screening angles, tactile fibrous newsprint, 2-ink Risograph color map, and split-toning.',
    algorithmId: 'atkinson',
    effects: [
      { id: 'photocopy', enabled: true, params: { contrast: 1.8, streakAmount: 0.35, edgeDarkening: 0.4, speckleDensity: 0.25, blur: 0.5 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'rosetteAngles', enabled: true, params: { angleC: 15, angleM: 75, angleY: 0, angleK: 45, dotGain: 0.2, dotSize: 3 }, opacity: 0.9, blendMode: 'normal' },
      { id: 'paperTexture', enabled: true, params: { fiberScale: 1.2, contrast: 0.4, tint: '#f4ecd8', opacity: 0.75, blendMode: 'multiply' }, opacity: 0.75, blendMode: 'multiply' },
      { id: 'gradient_map', enabled: true, params: { preset: 'riso_2ink', space: 'oklab', preserveLuminance: true, mix: 1.0 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'splitToning', enabled: true, params: { shadowHue: 210, shadowSaturation: 0.4, highlightHue: 35, highlightSaturation: 0.35, balance: 0.0 }, opacity: 0.85, blendMode: 'normal' }
    ]
  },
  {
    version: 2,
    id: 'preset_super_8',
    name: 'Super 8',
    description: 'Vintage 8mm home movie camera emulsion with warm red highlight halation, mechanical gate wobble, exposure flicker, physical celluloid dust, edge light leaks, and faded film blacks.',
    algorithmId: 'floyd-steinberg',
    effects: [
      { id: 'gate_weave', enabled: true, params: { amplitude: 2.0, frequency: 1.0, drift: 0.35, temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'exposure_flicker', enabled: true, params: { amplitude: 0.15, frequency: 0.8, mode: 'stepped', temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'film_grain', enabled: true, params: { intensity: 0.4, size: 2, channelIndependence: 0.35, shadowWeight: 0.7, midWeight: 1.0, highlightWeight: 0.4, temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'dust_scratches', enabled: true, params: { density: 0.25, minSize: 1, maxSize: 3, scratchProbability: 0.4, streakLength: 50, colorMode: 'mixed', temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'light_leaks', enabled: true, params: { direction: 'top_left', radius: 0.85, tint: '#ff8844', secondaryTint: '#ff3366', intensity: 0.55, temporal: true }, opacity: 0.85, blendMode: 'screen' },
      { id: 'halation', enabled: true, params: { threshold: 0.6, radius: 12, tint: '#ff4a2c', intensity: 0.7, wideNarrowRatio: 0.4 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'filmFade', enabled: true, params: { lift: 0.12, fadeColor: '#2b2118' }, opacity: 0.75, blendMode: 'normal' },
      { id: 'vignette', enabled: true, params: { intensity: 0.5, radius: 0.75 }, opacity: 1.0, blendMode: 'normal' }
    ]
  },
  {
    version: 2,
    id: 'preset_gameboy_pocket',
    name: 'GameBoy Pocket',
    description: 'Original handheld 4-shade olive-green reflective LCD with subtle passive matrix slot mask grid, horizontal pixel separation scanlines, and 2x pixel scaling.',
    algorithmId: 'bayer-4x4',
    paletteId: 'monochrome_2bit',
    effects: [
      { id: 'gradient_map', enabled: true, params: { preset: 'gameboy_dmg', space: 'oklab', preserveLuminance: false, mix: 1.0 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'phosphor_mask', enabled: true, params: { maskType: 'slot_mask', pitch: 2, intensity: 0.2, rgbBias: 0.3, vertical: false }, opacity: 0.5, blendMode: 'multiply' },
      { id: 'scanlines', enabled: true, params: { mode: 'hard', thickness: 1, intensity: 0.25 }, opacity: 0.7, blendMode: 'multiply' },
      { id: 'pixelate', enabled: true, params: { blockSize: 2 }, opacity: 1.0, blendMode: 'normal' }
    ]
  },
  {
    version: 2,
    id: 'preset_vhs_rental',
    name: 'VHS Rental',
    description: 'Worn magnetic videotape playback through consumer VCR with scrolling tracking band error, row-level horizontal jitter, helical scan head-switching noise, quantization crush, phosphor persistence echo, interlace combing, and lens aberration.',
    algorithmId: 'floyd-steinberg',
    effects: [
      { id: 'vhs_tracking', enabled: true, params: { bandHeight: 38, scrollSpeed: 1.3, bandPosition: 0.78, opacity: 0.85, shear: 20, colorSmear: 5, dropoutDensity: 0.16, temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'head_switching_noise', enabled: true, params: { height: 12, intensity: 0.9, horizontalBias: 0.4, lineJitter: 7, temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'scanline_jitter', enabled: true, params: { amplitude: 3.5, frequency: 0.2, mode: 'per_row', bandHeight: 8, temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'bitCrush', enabled: true, params: { depth: 5, sampleRate: 1, dither: 0.05 }, opacity: 1.0, blendMode: 'normal' },
      { id: 'frameEcho', enabled: true, params: { decay: 0.65, delayFrames: 2, blend: 'screen' }, opacity: 0.8, blendMode: 'normal' },
      { id: 'interlace_combing', enabled: true, params: { fieldOffset: 3.0, fieldPolarity: 'odd_first', temporal: true }, opacity: 1.0, blendMode: 'normal' },
      { id: 'lens_aberration', enabled: true, params: { mode: 'convergence', offsetX: 3, offsetY: 0 }, opacity: 0.9, blendMode: 'normal' }
    ]
  }
];

// DitherForge Post-Effects Pipeline Registry
import type { EffectCategory, EffectDescriptor, EffectItem, EffectContext } from './types';
import { crtEffects } from './crt';
import { filmEffects } from './film';
import { textureEffects } from './texture';
import { printEffects } from './print';
import { glitchEffects } from './glitch';
import { colorEffects } from './color';
import { resolveEffectId } from './presets';
import { applyEffectPipeline as execPipeline } from './pipeline';

export * from './types';
export * from './blendModes';
export * from './pipeline';
export * from './presets';
export * from './crt';
export * from './film';
export * from './texture';
export * from './print';
export * from './glitch';
export * from './color';

/**
 * All currently registered effect descriptors across categories.
 */
export const ALL_EFFECTS: EffectDescriptor[] = [
  ...crtEffects,
  ...filmEffects,
  ...textureEffects,
  ...printEffects,
  ...glitchEffects,
  ...colorEffects
];

/**
 * Map indexed by canonical effect id for O(1) execution dispatch.
 */
const REGISTRY_MAP = new Map<string, EffectDescriptor>();
for (const eff of ALL_EFFECTS) {
  REGISTRY_MAP.set(eff.id, eff);
}

/**
 * Retrieve an effect descriptor by canonical id or legacy alias.
 */
export function getEffectDescriptor(id: string): EffectDescriptor | undefined {
  const canonical = resolveEffectId(id);
  const cached = REGISTRY_MAP.get(canonical);
  if (cached) return cached;
  const dyn = getAllEffects().find((e) => e.id === canonical);
  if (dyn) REGISTRY_MAP.set(canonical, dyn);
  return dyn;
}

/**
 * Get all effects belonging to a given visual category.
 */
export function getEffectsByCategory(category: EffectCategory): EffectDescriptor[] {
  return getAllEffects().filter((e) => e.category === category);
}

/**
 * Return all registered effect descriptors across categories.
 */
export function getAllEffects(): EffectDescriptor[] {
  return [
    ...crtEffects,
    ...filmEffects,
    ...textureEffects,
    ...printEffects,
    ...glitchEffects,
    ...colorEffects
  ];
}

/**
 * Execute the active effect stack on an ImageData buffer.
 */
export function applyEffectPipeline(
  imageData: ImageData,
  effects: EffectItem[] = [],
  context: EffectContext = { frameIndex: 0, time: 0, fps: 30 }
): void {
  execPipeline(imageData, effects, context, getEffectDescriptor);
}

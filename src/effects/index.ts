// DitherForge Post-Effects Pipeline Registry
import type { EffectCategory, EffectDescriptor, EffectItem, EffectContext } from './types';
import { crtEffects } from './crt';
import { filmEffects } from './film';
import { textureEffects } from './texture';
import { printEffects } from './print';
import { glitchEffects } from './glitch';
import { colorEffects } from './color';
import { resolveEffectId, canonicalizeEffectId, toDescriptorId } from './presets';
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
 * Map indexed by canonical effect id, descriptor id, and aliases for O(1) execution dispatch.
 */
const REGISTRY_MAP = new Map<string, EffectDescriptor>();
for (const eff of ALL_EFFECTS) {
  REGISTRY_MAP.set(eff.id, eff);
  const canonical = canonicalizeEffectId(eff.id);
  if (canonical) REGISTRY_MAP.set(canonical, eff);
  const desc = toDescriptorId(eff.id);
  if (desc) REGISTRY_MAP.set(desc, eff);
}

/**
 * Retrieve an effect descriptor by canonical id, descriptor id, or legacy alias.
 */
export function getEffectDescriptor(id: string): EffectDescriptor | undefined {
  if (!id) return undefined;
  const direct = REGISTRY_MAP.get(id);
  if (direct) return direct;

  const canonical = canonicalizeEffectId(id);
  const byCanonical = REGISTRY_MAP.get(canonical);
  if (byCanonical) return byCanonical;

  const descId = toDescriptorId(id);
  const byDesc = REGISTRY_MAP.get(descId);
  if (byDesc) return byDesc;

  const resolved = resolveEffectId(id);
  const byResolved = REGISTRY_MAP.get(resolved);
  if (byResolved) return byResolved;

  const dyn = getAllEffects().find(
    (e) => e.id === id || e.id === descId || e.id === canonical || e.id === resolved
  );
  if (dyn) {
    REGISTRY_MAP.set(id, dyn);
    REGISTRY_MAP.set(canonical, dyn);
    REGISTRY_MAP.set(descId, dyn);
    return dyn;
  }
  return undefined;
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

// DitherForge Post-Effects Pipeline Execution & Ordering
import type { EffectDescriptor, EffectItem, EffectContext } from './types';
import { compositeEffectLayer } from './blendModes';

/**
 * Canonical default pipeline ordering.
 * Used when sorting a chain by physical optical/electronic signal order.
 */
export const DEFAULT_PIPELINE_ORDER: string[] = [
  // 1. Color mapping & tonality
  'gradient_map',
  'duotone',
  'curves_levels',

  // 2. Camera mechanics & optical pre-pass
  'gate_weave',
  'exposure_flicker',
  'lens_ghost',
  'lens_aberration',
  'chromatic_aberration',

  // 3. Halftone & Print
  'halftone',

  // 4. Analog Video / CRT Signal & Synthesis
  'vhs_tracking',
  'head_switching_noise',
  'scanline_jitter',
  'interlace_combing',
  'convergence_error',
  'phosphor_mask',
  'scanlines',

  // 5. Glow, Halation & Beam Blooming
  'halation',
  'phosphor_bloom',
  'glow',
  'inverse_glow',

  // 6. Film emulsion & compression artifacts
  'light_leaks',
  'film_grain',
  'dust_scratches',
  'blur_sharpen',
  'pixelate',
  'jpeg_artifacts',

  // 7. Vignette falloff
  'vignette',
  'inverse_vignette',

  // 8. Physical CRT Glass (placed after Vignette in default chain)
  'screen_curvature'
];

/**
 * Sorts an array of effect items by the canonical pipeline order.
 */
export function sortEffectsByPipelineOrder(effects: EffectItem[]): EffectItem[] {
  return [...effects].sort((a, b) => {
    const idA = a.type || a.id;
    const idB = b.type || b.id;
    const idxA = DEFAULT_PIPELINE_ORDER.indexOf(idA);
    const idxB = DEFAULT_PIPELINE_ORDER.indexOf(idB);
    const posA = idxA === -1 ? 999 : idxA;
    const posB = idxB === -1 ? 999 : idxB;
    return posA - posB;
  });
}

// Reusable scratch buffer for intermediate layer operations to prevent GC pressure
let pipelineLayerBuffer: Uint8ClampedArray | null = null;
let pipelineAlphaBuffer: Uint8ClampedArray | null = null;

/**
 * Applies a stack of effects to an ImageData buffer with blend modes, opacity,
 * alpha preservation, and deterministic frame context.
 */
export function applyEffectPipeline(
  imageData: ImageData,
  effects: EffectItem[] = [],
  context: EffectContext = { frameIndex: 0, time: 0, fps: 30 },
  registryLookup?: (id: string) => EffectDescriptor | undefined
): void {
  if (!effects || effects.length === 0) return;

  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const len = data.length;
  const numPixels = width * height;

  // Snapshot original alpha channel to guarantee transparency preservation across all post-effects
  if (!pipelineAlphaBuffer || pipelineAlphaBuffer.length !== numPixels) {
    pipelineAlphaBuffer = new Uint8ClampedArray(numPixels);
  }
  for (let i = 0, a = 3; i < numPixels; i++, a += 4) {
    pipelineAlphaBuffer[i] = data[a];
  }

  // Ensure layer scratch buffer is allocated
  if (!pipelineLayerBuffer || pipelineLayerBuffer.length !== len) {
    pipelineLayerBuffer = new Uint8ClampedArray(len);
  }

  for (let i = 0; i < effects.length; i++) {
    const item = effects[i];
    if (!item.enabled) continue;

    const effId = item.type || item.id;
    const descriptor = registryLookup ? registryLookup(effId) : undefined;
    if (!descriptor) continue;

    const opacity = item.opacity !== undefined ? Number(item.opacity) : 1.0;
    if (opacity <= 0.001) continue;

    const blendMode = item.blendMode || descriptor.defaultBlendMode || 'normal';

    // Copy base pixels into layer buffer
    pipelineLayerBuffer.set(data);

    // Apply the effect onto the layer buffer, accommodating both (data, width, height, params, context)
    // and ({ data, width, height }, params) signatures.
    try {
      if (typeof descriptor.applyFrame === 'function') {
        descriptor.applyFrame({ data: pipelineLayerBuffer, width, height }, item.params, context.frameIndex);
      } else if (descriptor.apply.length <= 2) {
        descriptor.apply({ data: pipelineLayerBuffer, width, height }, item.params);
      } else {
        descriptor.apply(pipelineLayerBuffer, width, height, item.params, context);
      }
    } catch (e) {
      try {
        descriptor.apply({ data: pipelineLayerBuffer, width, height }, item.params);
      } catch (err) {
        console.error(`Failed to apply effect ${effId}:`, err);
      }
    }

    // Composite layer onto base data with specified blendMode and opacity
    compositeEffectLayer(data, pipelineLayerBuffer, len, opacity, blendMode);
  }

  // Restore exact incoming alpha
  for (let i = 0, a = 3; i < numPixels; i++, a += 4) {
    data[a] = pipelineAlphaBuffer[i];
  }
}

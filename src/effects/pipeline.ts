// DitherForge Post-Effects Pipeline Execution & Ordering
import type { EffectDescriptor, EffectItem, EffectContext } from './types';
import { compositeEffectLayer } from './blendModes';
import { canonicalizeEffectId, toDescriptorId } from './presets';
import { clearFrameEchoHistory } from './glitch/frameEcho';

/**
 * Canonical default pipeline ordering.
 * Orders effects according to physical optical/electronic signal flow:
 * 1. Color mapping & tonality pre-pass
 * 2. Camera mechanics & optical pre-pass
 * 3. Print, ink & halftone
 * 4. Glitch & signal degradation
 * 5. Analog video / CRT signal & synthesis
 * 6. Glow, Halation & Beam Blooming
 * 7. Film emulsion, texture & compression artifacts
 * 8. Vignette falloff
 * 9. Physical CRT Glass (placed after Vignette in default chain)
 */
export const DEFAULT_PIPELINE_ORDER: string[] = [
  // 1. Color mapping & tonality
  'blueprint',
  'blueprint_cyanotype',
  'solarize',
  'posterize',
  'posterize_post',
  'gradient_map',
  'duotone',
  'splitToning',
  'split_toning',
  'filmFade',
  'film_fade',
  'curves_levels',

  // 2. Camera mechanics & optical pre-pass
  'gate_weave',
  'exposure_flicker',
  'lens_ghost',
  'lens_aberration',
  'chromatic_aberration',

  // 3. Print, ink & halftone
  'risoMisreg',
  'risograph_misregistration',
  'rosetteAngles',
  'rosette_angles',
  'halftone',
  'photocopy',
  'photocopy_degradation',
  'outline',
  'outline_overlay',

  // 4. Glitch & signal degradation
  'bitCrush',
  'bit_crush',
  'sliceGlitch',
  'slice_glitch',
  'blockDisplacement',
  'block_displacement',
  'frameEcho',
  'frame_echo',

  // 5. Analog Video / CRT Signal & Synthesis
  'vhs_tracking',
  'head_switching_noise',
  'scanline_jitter',
  'interlace_combing',
  'convergence_error',
  'phosphor_mask',
  'scanlines',

  // 6. Glow, Halation & Beam Blooming
  'halation',
  'phosphor_bloom',
  'glow',
  'inverse_glow',

  // 7. Film emulsion, paper texture & compression artifacts
  'paperTexture',
  'paper_texture',
  'light_leaks',
  'film_grain',
  'dust_scratches',
  'blur_sharpen',
  'pixelate',
  'jpeg_artifacts',

  // 8. Vignette falloff
  'vignette',
  'inverse_vignette',

  // 9. Physical CRT Glass (placed after Vignette in default chain)
  'screen_curvature'
];

/**
 * Finds the index of an effect in the canonical pipeline order, checking canonical and descriptor IDs.
 */
function getPipelineOrderIndex(id: string): number {
  const directIdx = DEFAULT_PIPELINE_ORDER.indexOf(id);
  if (directIdx !== -1) return directIdx;
  const canonicalIdx = DEFAULT_PIPELINE_ORDER.indexOf(canonicalizeEffectId(id));
  if (canonicalIdx !== -1) return canonicalIdx;
  const descIdx = DEFAULT_PIPELINE_ORDER.indexOf(toDescriptorId(id));
  if (descIdx !== -1) return descIdx;
  return 999;
}

/**
 * Sorts an array of effect items by the canonical pipeline order.
 */
export function sortEffectsByPipelineOrder(effects: EffectItem[]): EffectItem[] {
  return [...effects].sort((a, b) => {
    const idA = a.type || a.id;
    const idB = b.type || b.id;
    const posA = getPipelineOrderIndex(idA);
    const posB = getPipelineOrderIndex(idB);
    return posA - posB;
  });
}

// Reusable scratch buffer for intermediate layer operations to prevent GC pressure
let pipelineLayerBuffer: Uint8ClampedArray | null = null;
let pipelineAlphaBuffer: Uint8ClampedArray | null = null;

// Reusable shared pipeline context for multi-effect chains (luminance cache, blur scratch buffers)
export interface PipelineSharedContext {
  luminance?: Uint8Array;
  blurScratch?: Float32Array;
  lutCache?: Map<string, Uint8Array>;
}

/**
 * Applies a stack of effects to an ImageData buffer with blend modes, opacity,
 * alpha preservation, deterministic frame context, and batched shared pass acceleration.
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

  // Clear temporal buffer histories on sequence start (frame 0) for strict determinism
  if (context.frameIndex === 0) {
    try {
      clearFrameEchoHistory();
    } catch {
      // ignore
    }
  }

  // Ensure layer scratch buffer is allocated
  if (!pipelineLayerBuffer || pipelineLayerBuffer.length !== len) {
    pipelineLayerBuffer = new Uint8ClampedArray(len);
  }

  // Shared execution context across this stack
  const shared: PipelineSharedContext = {};
  const enrichedContext = { ...context, shared };

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
        descriptor.apply(pipelineLayerBuffer, width, height, item.params, enrichedContext);
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

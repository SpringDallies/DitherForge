// Master Registry and Dispatcher for 40 Legacy Dithering Algorithms
// Bridges Rust legacy algorithms into JavaScript / Web Worker with full metadata, controls, and determinism.

import type { LegacyAlgorithmParams } from './legacyAlgorithms';
import {
  applyPattern,
  applyScanlineJitter,
  applyChromaticOffset,
  applyPixelSorting,
  applyDigitalArtifacts,
  applyInterlacingTear,
  applyCrtBloom,
  applyBitCrush,
  applyVhsTracking,
  applyBadRam,
  applyWaveDistortion,
  applyQuantSlice,
  applyMatrixRake,
  applyStaticSnow,
  applySyncPulseLoss,
  applyFeedbackRinging,
  applyChromaSubsample,
  applyMoireGlitch,
  applyFixedThreshold,
  applyRandomThreshold,
  applyBlueNoise,
  applyGaussianNoise,
  applyPerlinGradient,
  applyRiemersma,
  applyTpdfNoise,
  applyCompandingCurve,
  applySpatialLattice,
  applySobelFeature,
  applyLaplacianMod,
  applyDirectionalGradient,
  applyVoronoiCellular,
  applyDiffusionBlur,
  applyQuantumStipple,
  applyIgnitionGlow,
  applyTemporalKinetic
} from './legacyAlgorithms';

export interface LegacyAlgorithmDescriptor {
  id: string;
  name: string;
  category: 'patterned' | 'glitch_effects' | 'special_effects';
  description: string;
  complexity: 'simple' | 'moderate' | 'complex';
  features: {
    supportsColorPalettes: boolean;
    supportsColorDepth: boolean;
    supportsDpiScale: boolean;
    supportsLuminanceThreshold: boolean;
    isDeterministic: boolean;
    requiresMultiPass: boolean;
  };
  controls: any[];
}

const BASE_FEATURES = {
  supportsColorPalettes: true,
  supportsColorDepth: true,
  supportsDpiScale: true,
  supportsLuminanceThreshold: true,
  isDeterministic: true,
  requiresMultiPass: false
};

export const LEGACY_ALGORITHM_REGISTRY: LegacyAlgorithmDescriptor[] = [
  // Patterned (6)
  {
    id: 'horizontal_lines',
    name: 'Horizontal Linear Grating',
    category: 'patterned',
    description: 'Horizontal linear scanline grating modulation.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'vertical_lines',
    name: 'Vertical Linear Grating',
    category: 'patterned',
    description: 'Vertical linear grating stripe pattern.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'diagonal_hatch',
    name: 'Diagonal 45° Hatch',
    category: 'patterned',
    description: '45-degree diagonal hatching dither pattern.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'concentric_diamond',
    name: 'Concentric Diamond Grid',
    category: 'patterned',
    description: 'Geometric concentric diamond lattice dithering.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'woven_basket',
    name: 'Woven Basket Tile',
    category: 'patterned',
    description: 'Interlocking woven basket weave tile matrix.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'hex_stipple',
    name: 'Hexagonal Stochastic Stipple',
    category: 'patterned',
    description: 'Hexagonal sub-grid stochastic stippling.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },

  // Glitch Effects (17)
  {
    id: 'scanline_jitter',
    name: 'Scanline Jitter',
    category: 'glitch_effects',
    description: 'Displaces horizontal scanlines with temporal sinusoidal jitter.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'chromatic_offset',
    name: 'Color Channel Offset',
    category: 'glitch_effects',
    description: 'Separates RGB color channels horizontally before palette quantization.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'pixel_sorting',
    name: 'Directional Pixel Sorting',
    category: 'glitch_effects',
    description: 'Sorts contiguous horizontal pixel runs exceeding luminance threshold.',
    complexity: 'complex',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'digital_artifacts',
    name: 'Digital Compression Artifacts',
    category: 'glitch_effects',
    description: 'Simulates coarse macroblock DCT compression quantization.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'interlacing_tear',
    name: 'Interlacing Field Tear',
    category: 'glitch_effects',
    description: 'Alternating interlacing field comb distortion.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'crt_bloom',
    name: 'CRT Phosphor Bloom',
    category: 'glitch_effects',
    description: 'Blends phosphor glow bleeding into adjacent scanline cells.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'bit_crush',
    name: 'Bit-Depth Crush Quantizer',
    category: 'glitch_effects',
    description: 'Reduces color bit precision into coarse tonal steps before matching.',
    complexity: 'simple',
    features: { ...BASE_FEATURES, supportsColorDepth: true },
    controls: []
  },
  {
    id: 'vhs_tracking',
    name: 'VHS Tracking Noise',
    category: 'glitch_effects',
    description: 'Simulates rolling magnetic head tracking noise bar distortion.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'bad_ram',
    name: 'Bad RAM Nibble Inversion',
    category: 'glitch_effects',
    description: 'Simulates faulty VRAM address lines with deterministic bitwise XOR.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'wave_distortion',
    name: 'Sinusoidal Wave Warp',
    category: 'glitch_effects',
    description: 'Applies sinusoidal horizontal wave displacement across scanlines.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'quant_slice',
    name: 'Quantization Step Slicing',
    category: 'glitch_effects',
    description: 'Hard-slices luminance spectrum into discrete quantized plateaus.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'matrix_rake',
    name: 'Diagonal Matrix Rake',
    category: 'glitch_effects',
    description: 'Rakes diagonal matrix interference patterns across the image.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'static_snow',
    name: 'Analog Static Snow',
    category: 'glitch_effects',
    description: 'Superimposes high-frequency analog broadcast RF noise.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'sync_pulse_loss',
    name: 'Sync Pulse Hold Collapse',
    category: 'glitch_effects',
    description: 'Simulates vertical sync pulse loss rolling vertical hold frames.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'feedback_ringing',
    name: 'Edge Ringing & Feedback',
    category: 'glitch_effects',
    description: 'Analog video transmission line reflection and edge ringing.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'chroma_subsample',
    name: 'YUV 4:1:1 Degradation',
    category: 'glitch_effects',
    description: 'Horizontal chroma subsampling smearing chromatic information.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'moire_glitch',
    name: 'Moiré Interference Glitch',
    category: 'glitch_effects',
    description: 'Dual-frequency interference wave beats across the raster grid.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },

  // Special, Bespoke & Temporal (17)
  {
    id: 'fixed_threshold',
    name: 'Fixed Bi-Level Cutoff',
    category: 'special_effects',
    description: 'Direct bi-level luminance thresholding against midpoint.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'random_threshold',
    name: 'Uniform White Noise Dither',
    category: 'special_effects',
    description: 'Stochastic uniform noise threshold comparison.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'blue_noise',
    name: 'Void-and-Cluster Blue Noise',
    category: 'special_effects',
    description: 'High-pass spatial frequency noise minimizing low-frequency grain.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'gaussian_noise',
    name: 'Gaussian Normal Distribution',
    category: 'special_effects',
    description: 'Box-Muller Gaussian bell curve noise distribution.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'perlin_gradient',
    name: 'Perlin Gradient Lattice',
    category: 'special_effects',
    description: 'Smooth gradient harmonic wave modulation lattice.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'riemersma',
    name: 'Riemersma Hilbert Space-Curve',
    category: 'special_effects',
    description: 'Hilbert space-filling curve error decay diffusion.',
    complexity: 'complex',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'tpdf_noise',
    name: 'Triangular PDF Noise (TPDF)',
    category: 'special_effects',
    description: 'Triangular probability density function noise eliminating quantization distortion.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'companding_curve',
    name: 'Dynamic Companding (A-Law)',
    category: 'special_effects',
    description: 'Logarithmic dynamic range companding curve.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'spatial_lattice',
    name: 'Hexagonal Spatial Lattice',
    category: 'special_effects',
    description: 'Hexagonal spatial lattice stipple distribution.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'sobel_feature',
    name: 'Sobel Silhouette Preserving',
    category: 'special_effects',
    description: 'Sobel convolution edge preservation inhibiting diffusion over contours.',
    complexity: 'complex',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'laplacian_mod',
    name: 'Laplacian Frequency Modulated',
    category: 'special_effects',
    description: '2nd-derivative Laplacian edge-enhancing frequency modulation.',
    complexity: 'complex',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'directional_gradient',
    name: 'Directional Gradient Angle',
    category: 'special_effects',
    description: 'Directional hatch gradient angle dithering.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'voronoi_cellular',
    name: 'Voronoi Cellular Stipple',
    category: 'special_effects',
    description: 'Cellular Voronoi distance metric stippling.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'diffusion_blur',
    name: 'Unsharp Diffusion Quantizer',
    category: 'special_effects',
    description: 'High-tap Burkes error diffusion quantizer.',
    complexity: 'complex',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'quantum_stipple',
    name: 'Quantum Probability Cloud',
    category: 'special_effects',
    description: 'Quantum collapse probability cloud dithering.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'ignition_glow',
    name: 'Ignition Glow (Bespoke Dither Bloom)',
    category: 'special_effects',
    description: 'Ordered 8x8 Bayer dithering with bespoke radial phosphor halo bloom.',
    complexity: 'complex',
    features: { ...BASE_FEATURES },
    controls: []
  },
  {
    id: 'temporal_kinetic',
    name: 'Temporal Kinetic Dither',
    category: 'special_effects',
    description: 'Continuous phase oscillation temporal kinetic dithering.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: []
  }
];

export const LEGACY_ALGORITHM_IDS = new Set<string>(LEGACY_ALGORITHM_REGISTRY.map((a) => a.id));

export function isLegacyAlgorithm(id: string): boolean {
  if (!id) return false;
  if (LEGACY_ALGORITHM_IDS.has(id)) return true;
  const snake = id.replace(/-/g, '_');
  return LEGACY_ALGORITHM_IDS.has(snake);
}

export function applyLegacyAlgorithm(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  palette: number[][],
  algorithmId: string,
  settings: LegacyAlgorithmParams = {}
): Uint8ClampedArray {
  const normId = algorithmId.replace(/-/g, '_');

  switch (normId) {
    // Patterned (6)
    case 'horizontal_lines':
      return applyPattern(width, height, data, palette, 'horizontal_lines', settings);
    case 'vertical_lines':
      return applyPattern(width, height, data, palette, 'vertical_lines', settings);
    case 'diagonal_hatch':
      return applyPattern(width, height, data, palette, 'diagonal_hatch', settings);
    case 'concentric_diamond':
      return applyPattern(width, height, data, palette, 'concentric_diamond', settings);
    case 'woven_basket':
      return applyPattern(width, height, data, palette, 'woven_basket', settings);
    case 'hex_stipple':
      return applyPattern(width, height, data, palette, 'hex_stipple', settings);

    // Glitch Effects (17)
    case 'scanline_jitter':
      return applyScanlineJitter(width, height, data, palette, settings);
    case 'chromatic_offset':
      return applyChromaticOffset(width, height, data, palette, settings);
    case 'pixel_sorting':
      return applyPixelSorting(width, height, data, palette, settings);
    case 'digital_artifacts':
      return applyDigitalArtifacts(width, height, data, palette, settings);
    case 'interlacing_tear':
      return applyInterlacingTear(width, height, data, palette, settings);
    case 'crt_bloom':
      return applyCrtBloom(width, height, data, palette, settings);
    case 'bit_crush':
      return applyBitCrush(width, height, data, palette, settings);
    case 'vhs_tracking':
      return applyVhsTracking(width, height, data, palette, settings);
    case 'bad_ram':
      return applyBadRam(width, height, data, palette, settings);
    case 'wave_distortion':
      return applyWaveDistortion(width, height, data, palette, settings);
    case 'quant_slice':
      return applyQuantSlice(width, height, data, palette, settings);
    case 'matrix_rake':
      return applyMatrixRake(width, height, data, palette, settings);
    case 'static_snow':
      return applyStaticSnow(width, height, data, palette, settings);
    case 'sync_pulse_loss':
      return applySyncPulseLoss(width, height, data, palette, settings);
    case 'feedback_ringing':
      return applyFeedbackRinging(width, height, data, palette, settings);
    case 'chroma_subsample':
      return applyChromaSubsample(width, height, data, palette, settings);
    case 'moire_glitch':
      return applyMoireGlitch(width, height, data, palette, settings);

    // Special & Bespoke & Temporal (17)
    case 'fixed_threshold':
      return applyFixedThreshold(width, height, data, palette, settings);
    case 'random_threshold':
      return applyRandomThreshold(width, height, data, palette, settings);
    case 'blue_noise':
      return applyBlueNoise(width, height, data, palette, settings);
    case 'gaussian_noise':
      return applyGaussianNoise(width, height, data, palette, settings);
    case 'perlin_gradient':
      return applyPerlinGradient(width, height, data, palette, settings);
    case 'riemersma':
      return applyRiemersma(width, height, data, palette, settings);
    case 'tpdf_noise':
      return applyTpdfNoise(width, height, data, palette, settings);
    case 'companding_curve':
      return applyCompandingCurve(width, height, data, palette, settings);
    case 'spatial_lattice':
      return applySpatialLattice(width, height, data, palette, settings);
    case 'sobel_feature':
      return applySobelFeature(width, height, data, palette, settings);
    case 'laplacian_mod':
      return applyLaplacianMod(width, height, data, palette, settings);
    case 'directional_gradient':
      return applyDirectionalGradient(width, height, data, palette, settings);
    case 'voronoi_cellular':
      return applyVoronoiCellular(width, height, data, palette, settings);
    case 'diffusion_blur':
      return applyDiffusionBlur(width, height, data, palette, settings);
    case 'quantum_stipple':
      return applyQuantumStipple(width, height, data, palette, settings);
    case 'ignition_glow':
      return applyIgnitionGlow(width, height, data, palette, settings);
    case 'temporal_kinetic':
      return applyTemporalKinetic(width, height, data, palette, settings);

    default:
      return data;
  }
}

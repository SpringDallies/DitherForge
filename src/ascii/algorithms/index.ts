import type { AsciiAlgorithmDescriptor, AsciiAlgorithmId } from '../types';
import { registerAsciiAlgorithm } from '../pipeline';
import {
  asciiClassicRamp,
  asciiInvertedRamp,
  asciiAdaptiveDensity,
  asciiLocalContrast,
  asciiThreshold,
  asciiPosterized,
  asciiGammaWeighted,
  asciiEdgeEnhanced
} from './tonal';
import {
  asciiBayer,
  asciiFloydSteinberg,
  asciiAtkinson,
  asciiStochastic,
  asciiBlueNoise,
  asciiErrorDiffusionBraille
} from './dithering';
import {
  asciiBraille2x4,
  asciiHalfBlock,
  asciiQuadrantBlocks,
  asciiSextantOctant,
  asciiGeometricGlyphs,
  asciiDirectionalGlyphs
} from './geometry';
import {
  asciiContourOutline,
  asciiHalftoneGlyphs,
  asciiTextMosaic,
  asciiSilhouette
} from './artistic';

const BASE_FEATURES = {
  supportsColorPalettes: true,
  supportsColorDepth: false,
  supportsDpiScale: false,
  supportsLuminanceThreshold: false,
  isDeterministic: true,
  requiresMultiPass: false
};

export const ASCII_ALGORITHM_REGISTRY: AsciiAlgorithmDescriptor[] = [
  // Family 1: Brightness & tonal mapping (1–8)
  {
    id: 'ascii-classic-ramp',
    name: 'Classic Density Ramp',
    category: 'ascii',
    family: 'tonal',
    description: 'Linear luminance-to-character density ramp mapping.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'contrastCurve', label: 'Tone Curve', type: 'slider', min: 0.4, max: 2.2, step: 0.05, defaultValue: 1.0 }
    ]
  },
  {
    id: 'ascii-inverted-ramp',
    name: 'Inverted Density Ramp',
    category: 'ascii',
    family: 'tonal',
    description: 'Paper-ink dot-gain curve optimized for dark characters on light backgrounds.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'inkWeight', label: 'Ink Weight', type: 'slider', min: 0.5, max: 2.5, step: 0.05, defaultValue: 1.15 },
      { id: 'paperFloor', label: 'Paper Floor', type: 'slider', min: 0.0, max: 0.4, step: 0.02, defaultValue: 0.08 }
    ]
  },
  {
    id: 'ascii-adaptive-density',
    name: 'Adaptive Density',
    category: 'ascii',
    family: 'tonal',
    description: 'Clipped CDF histogram equalization stretching low-contrast frames across the full charset.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'adaptationStrength', label: 'Adaptation', type: 'slider', min: 0.0, max: 1.0, step: 0.05, defaultValue: 0.75 },
      { id: 'clipLimit', label: 'Clip Limit', type: 'slider', min: 1.0, max: 8.0, step: 0.25, defaultValue: 3.0 }
    ]
  },
  {
    id: 'ascii-local-contrast',
    name: 'Local Contrast Mapping',
    category: 'ascii',
    family: 'tonal',
    description: 'Integral-image local neighborhood contrast enhancement for crisp micro-detail.',
    complexity: 'moderate',
    heavyForLiveVideo: true,
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'windowRadius', label: 'Window Radius', type: 'slider', min: 1, max: 8, step: 1, defaultValue: 3 },
      { id: 'localGain', label: 'Local Gain', type: 'slider', min: 0.0, max: 2.5, step: 0.05, defaultValue: 1.1 },
      { id: 'noiseFloor', label: 'Noise Floor', type: 'slider', min: 0.01, max: 0.2, step: 0.01, defaultValue: 0.05 }
    ]
  },
  {
    id: 'ascii-threshold',
    name: 'Threshold ASCII',
    category: 'ascii',
    family: 'tonal',
    description: 'High-contrast binary or multi-band stencil character cutoff.',
    complexity: 'simple',
    features: { ...BASE_FEATURES, supportsLuminanceThreshold: true },
    controls: [
      { id: 'threshold', label: 'Threshold', type: 'slider', min: 0.05, max: 0.95, step: 0.02, defaultValue: 0.5 },
      { id: 'bandWidth', label: 'Transition Band', type: 'slider', min: 0.0, max: 0.4, step: 0.02, defaultValue: 0.05 },
      { id: 'levels', label: 'Bands', type: 'slider', min: 2, max: 4, step: 1, defaultValue: 2 }
    ]
  },
  {
    id: 'ascii-posterized',
    name: 'Posterized ASCII',
    category: 'ascii',
    family: 'tonal',
    description: 'Quantizes luminance into flat cel-shaded glyph bands.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'posterLevels', label: 'Poster Levels', type: 'slider', min: 2, max: 16, step: 1, defaultValue: 5 },
      { id: 'stepBias', label: 'Step Bias', type: 'slider', min: -0.4, max: 0.4, step: 0.02, defaultValue: 0.0 }
    ]
  },
  {
    id: 'ascii-gamma-weighted',
    name: 'Gamma-Weighted Mapping',
    category: 'ascii',
    family: 'tonal',
    description: 'Matches linear luminance against calibrated per-font glyph ink coverage.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'gamma', label: 'Gamma', type: 'slider', min: 0.3, max: 3.0, step: 0.05, defaultValue: 1.2 },
      { id: 'coverageMatchWeight', label: 'Calibration Match', type: 'slider', min: 0.0, max: 1.0, step: 0.05, defaultValue: 1.0 }
    ]
  },
  {
    id: 'ascii-edge-enhanced',
    name: 'Edge-Enhanced ASCII',
    category: 'ascii',
    family: 'tonal',
    description: 'Blends Sobel edge magnitude with optional directional stroke glyph overrides.',
    complexity: 'moderate',
    heavyForLiveVideo: true,
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'edgeStrength', label: 'Edge Boost', type: 'slider', min: 0.0, max: 2.0, step: 0.05, defaultValue: 0.85 },
      { id: 'edgeThreshold', label: 'Edge Threshold', type: 'slider', min: 0.1, max: 0.9, step: 0.02, defaultValue: 0.35 },
      { id: 'structuralOverride', label: 'Stroke Override', type: 'toggle', defaultValue: true }
    ]
  },

  // Family 2: Dithering-based ASCII (9–14)
  {
    id: 'ascii-bayer',
    name: 'Ordered Bayer ASCII',
    category: 'ascii',
    family: 'dithering',
    description: 'Structured Bayer threshold matrix character alternation for clean gradients.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: [
      {
        id: 'matrixSize',
        label: 'Matrix Size',
        type: 'dropdown',
        defaultValue: '4x4',
        options: [
          { value: '2x2', label: '2×2' },
          { value: '4x4', label: '4×4' },
          { value: '8x8', label: '8×8' }
        ]
      },
      { id: 'ditherStrength', label: 'Dither Strength', type: 'slider', min: 0.0, max: 1.5, step: 0.05, defaultValue: 1.0 }
    ]
  },
  {
    id: 'ascii-floyd-steinberg',
    name: 'Floyd-Steinberg ASCII',
    category: 'ascii',
    family: 'dithering',
    description: 'Serpentine Floyd-Steinberg diffusion of calibrated glyph-coverage quantization error.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'diffusionStrength', label: 'Diffusion Strength', type: 'slider', min: 0.0, max: 1.2, step: 0.05, defaultValue: 0.9 },
      { id: 'serpentine', label: 'Serpentine Scan', type: 'toggle', defaultValue: true }
    ]
  },
  {
    id: 'ascii-atkinson',
    name: 'Atkinson ASCII',
    category: 'ascii',
    family: 'dithering',
    description: 'High-contrast 75%-retention Atkinson error diffusion across character cells.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'diffusionStrength', label: 'Diffusion Strength', type: 'slider', min: 0.0, max: 1.2, step: 0.05, defaultValue: 1.0 },
      { id: 'serpentine', label: 'Serpentine Scan', type: 'toggle', defaultValue: false }
    ]
  },
  {
    id: 'ascii-stochastic',
    name: 'Stochastic ASCII',
    category: 'ascii',
    family: 'dithering',
    description: 'Deterministic TPDF noise dithering eliminating contour banding.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'noiseSpread', label: 'Noise Spread', type: 'slider', min: 0.0, max: 1.0, step: 0.05, defaultValue: 0.35 },
      { id: 'temporal', label: 'Animate Grain', type: 'toggle', defaultValue: false }
    ]
  },
  {
    id: 'ascii-blue-noise',
    name: 'Blue-Noise ASCII',
    category: 'ascii',
    family: 'dithering',
    description: '32×32 tileable blue-noise mask providing organic clumpless character dispersion.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'blueNoiseStrength', label: 'Blue-Noise Strength', type: 'slider', min: 0.0, max: 1.5, step: 0.05, defaultValue: 0.9 },
      { id: 'tileOffset', label: 'Tile Phase', type: 'slider', min: 0, max: 31, step: 1, defaultValue: 0 }
    ]
  },
  {
    id: 'ascii-error-diffusion-braille',
    name: 'Error-Diffusion Braille',
    category: 'ascii',
    family: 'dithering',
    description: '2×4 sub-cell Floyd-Steinberg dot diffusion packed into Unicode Braille (U+2800..U+28FF).',
    complexity: 'complex',
    heavyForLiveVideo: true,
    usesSubCellSampling: true,
    features: { ...BASE_FEATURES, supportsLuminanceThreshold: true },
    controls: [
      { id: 'threshold', label: 'Dot Threshold', type: 'slider', min: 0.1, max: 0.9, step: 0.02, defaultValue: 0.5 },
      { id: 'diffusionStrength', label: 'Diffusion Strength', type: 'slider', min: 0.0, max: 1.2, step: 0.05, defaultValue: 1.0 },
      { id: 'serpentine', label: 'Serpentine Scan', type: 'toggle', defaultValue: true },
      { id: 'invertDots', label: 'Invert Dots', type: 'toggle', defaultValue: false }
    ]
  },

  // Family 3: Character geometry (15–20)
  {
    id: 'ascii-braille-2x4',
    name: 'Braille 2×4',
    category: 'ascii',
    family: 'geometry',
    description: 'High-resolution 2×4 sub-pixel Unicode Braille threshold matrix.',
    complexity: 'moderate',
    usesSubCellSampling: true,
    features: { ...BASE_FEATURES, supportsLuminanceThreshold: true },
    controls: [
      { id: 'threshold', label: 'Dot Threshold', type: 'slider', min: 0.05, max: 0.95, step: 0.02, defaultValue: 0.5 },
      { id: 'subDotDither', label: 'Sub-Dot Ordered Dither', type: 'slider', min: 0.0, max: 1.0, step: 0.05, defaultValue: 0.0 },
      { id: 'invertDots', label: 'Invert Dots', type: 'toggle', defaultValue: false }
    ]
  },
  {
    id: 'ascii-half-block',
    name: 'Half-Block',
    category: 'ascii',
    family: 'geometry',
    description: 'True dual-color 2× vertical resolution using Upper Half Block (▀) fg/bg pairs.',
    complexity: 'simple',
    usesSubCellSampling: true,
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'mergeThreshold', label: 'Solid Merge Threshold', type: 'slider', min: 0, max: 40, step: 1, defaultValue: 6 }
    ]
  },
  {
    id: 'ascii-quadrant-blocks',
    name: 'Quadrant Blocks',
    category: 'ascii',
    family: 'geometry',
    description: '2×2 sub-cell geometric edge fitting using all 16 Unicode quadrant blocks.',
    complexity: 'moderate',
    usesSubCellSampling: true,
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'dualColor', label: 'Dual-Color Per Cell', type: 'toggle', defaultValue: true },
      { id: 'threshold', label: 'Mono Split Threshold', type: 'slider', min: 0.1, max: 0.9, step: 0.02, defaultValue: 0.5 }
    ]
  },
  {
    id: 'ascii-sextant-octant',
    name: 'Sextant & Octant Blocks',
    category: 'ascii',
    family: 'geometry',
    description: '2×3 sub-cell Unicode Legacy Computing sextants (U+1FB00..U+1FB3B) with dual color.',
    complexity: 'complex',
    heavyForLiveVideo: true,
    usesSubCellSampling: true,
    features: { ...BASE_FEATURES },
    controls: [
      {
        id: 'mode',
        label: 'Block Mode',
        type: 'dropdown',
        defaultValue: 'auto',
        options: [
          { value: 'auto', label: 'Sextant (2×3)' },
          { value: 'quadrant-fallback', label: 'Quadrant (2×2)' }
        ]
      },
      { id: 'dualColor', label: 'Dual-Color Per Cell', type: 'toggle', defaultValue: true },
      { id: 'thresholdBias', label: 'Split Bias', type: 'slider', min: -0.3, max: 0.3, step: 0.02, defaultValue: 0.0 }
    ]
  },
  {
    id: 'ascii-geometric-glyphs',
    name: 'Geometric Glyphs',
    category: 'ascii',
    family: 'geometry',
    description: 'Matches 6-zone sub-cell luminance shapes against calibrated 2D glyph ink vectors.',
    complexity: 'complex',
    heavyForLiveVideo: true,
    usesSubCellSampling: true,
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'shapeWeight', label: 'Shape vs Luma', type: 'slider', min: 0.0, max: 1.0, step: 0.05, defaultValue: 0.75 },
      { id: 'contrastBoost', label: 'Shape Contrast', type: 'slider', min: 0.5, max: 2.5, step: 0.05, defaultValue: 1.25 }
    ]
  },
  {
    id: 'ascii-directional-glyphs',
    name: 'Directional Glyphs',
    category: 'ascii',
    family: 'geometry',
    description: 'Aligns slashes, box diagonals, or arrows tangentially along image contours.',
    complexity: 'moderate',
    heavyForLiveVideo: true,
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'edgeThreshold', label: 'Edge Threshold', type: 'slider', min: 0.05, max: 0.8, step: 0.02, defaultValue: 0.22 },
      {
        id: 'directionalSet',
        label: 'Stroke Style',
        type: 'dropdown',
        defaultValue: 'ascii-slashes',
        options: [
          { value: 'ascii-slashes', label: 'ASCII (- / | \\)' },
          { value: 'box-diagonals', label: 'Box (─ ╱ │ ╲)' },
          { value: 'arrows', label: '8-Way Arrows' }
        ]
      },
      { id: 'interiorFill', label: 'Interior Fill', type: 'slider', min: 0.0, max: 1.0, step: 0.05, defaultValue: 0.5 }
    ]
  },

  // Family 4: Artistic rendering (21–24)
  {
    id: 'ascii-contour-outline',
    name: 'Contour / Outline ASCII',
    category: 'ascii',
    family: 'artistic',
    description: 'Thinned 1-cell non-maximum-suppressed hysteresis edge contours.',
    complexity: 'complex',
    heavyForLiveVideo: true,
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'highThreshold', label: 'High Threshold', type: 'slider', min: 0.1, max: 0.9, step: 0.02, defaultValue: 0.35 },
      { id: 'lowThreshold', label: 'Low Threshold', type: 'slider', min: 0.02, max: 0.5, step: 0.02, defaultValue: 0.15 },
      { id: 'fillOpacity', label: 'Interior Shading', type: 'slider', min: 0.0, max: 1.0, step: 0.05, defaultValue: 0.0 },
      { id: 'useBoxChars', label: 'Box Drawing Strokes', type: 'toggle', defaultValue: true }
    ]
  },
  {
    id: 'ascii-halftone-glyphs',
    name: 'Halftone Glyphs',
    category: 'ascii',
    family: 'artistic',
    description: 'Rotated print-screen spot function mapped onto progressive dot/symbol glyphs.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'screenAngle', label: 'Screen Angle', type: 'slider', min: 0, max: 90, step: 1, defaultValue: 45, unit: '°' },
      { id: 'screenFreq', label: 'Screen Frequency', type: 'slider', min: 0.2, max: 4.0, step: 0.1, defaultValue: 1.0 },
      { id: 'dotGain', label: 'Dot Gain', type: 'slider', min: -0.4, max: 0.4, step: 0.02, defaultValue: 0.1 }
    ]
  },
  {
    id: 'ascii-text-mosaic',
    name: 'Text Mosaic',
    category: 'ascii',
    family: 'artistic',
    description: 'Tiles custom phrases or messages across the frame modulated by image luminance and color.',
    complexity: 'simple',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'customText', label: 'Mosaic Text', type: 'text', defaultValue: 'DITHERFORGE ' },
      { id: 'minLuminance', label: 'Min Luminance Cutoff', type: 'slider', min: 0.0, max: 0.8, step: 0.02, defaultValue: 0.08 },
      { id: 'rowStagger', label: 'Row Stagger', type: 'slider', min: 0, max: 16, step: 1, defaultValue: 0 },
      { id: 'scaleByLuma', label: 'Luminance Boost', type: 'toggle', defaultValue: false }
    ]
  },
  {
    id: 'ascii-silhouette',
    name: 'Silhouette ASCII',
    category: 'ascii',
    family: 'artistic',
    description: 'Automatic Otsu subject isolation carving shaded ASCII silhouettes against clean backgrounds.',
    complexity: 'moderate',
    features: { ...BASE_FEATURES },
    controls: [
      { id: 'autoOtsu', label: 'Auto Otsu Cutoff', type: 'toggle', defaultValue: true },
      { id: 'cutoff', label: 'Manual Cutoff', type: 'slider', min: 0.05, max: 0.95, step: 0.02, defaultValue: 0.5 },
      { id: 'invertMask', label: 'Invert Silhouette', type: 'toggle', defaultValue: false },
      { id: 'softEdge', label: 'Edge Softness', type: 'slider', min: 0.0, max: 0.3, step: 0.01, defaultValue: 0.05 }
    ]
  }
];

export const ASCII_ALGORITHM_IDS = new Set<string>(ASCII_ALGORITHM_REGISTRY.map((a) => a.id));

export function isAsciiAlgorithmId(id: string): id is AsciiAlgorithmId {
  return ASCII_ALGORITHM_IDS.has(id);
}

let registered = false;

export function registerAllAsciiAlgorithms(): void {
  if (registered) return;
  registered = true;

  // Family 1
  registerAsciiAlgorithm('ascii-classic-ramp', asciiClassicRamp);
  registerAsciiAlgorithm('ascii-inverted-ramp', asciiInvertedRamp);
  registerAsciiAlgorithm('ascii-adaptive-density', asciiAdaptiveDensity);
  registerAsciiAlgorithm('ascii-local-contrast', asciiLocalContrast);
  registerAsciiAlgorithm('ascii-threshold', asciiThreshold);
  registerAsciiAlgorithm('ascii-posterized', asciiPosterized);
  registerAsciiAlgorithm('ascii-gamma-weighted', asciiGammaWeighted);
  registerAsciiAlgorithm('ascii-edge-enhanced', asciiEdgeEnhanced);

  // Family 2
  registerAsciiAlgorithm('ascii-bayer', asciiBayer);
  registerAsciiAlgorithm('ascii-floyd-steinberg', asciiFloydSteinberg);
  registerAsciiAlgorithm('ascii-atkinson', asciiAtkinson);
  registerAsciiAlgorithm('ascii-stochastic', asciiStochastic);
  registerAsciiAlgorithm('ascii-blue-noise', asciiBlueNoise);
  registerAsciiAlgorithm('ascii-error-diffusion-braille', asciiErrorDiffusionBraille);

  // Family 3
  registerAsciiAlgorithm('ascii-braille-2x4', asciiBraille2x4);
  registerAsciiAlgorithm('ascii-half-block', asciiHalfBlock);
  registerAsciiAlgorithm('ascii-quadrant-blocks', asciiQuadrantBlocks);
  registerAsciiAlgorithm('ascii-sextant-octant', asciiSextantOctant);
  registerAsciiAlgorithm('ascii-geometric-glyphs', asciiGeometricGlyphs);
  registerAsciiAlgorithm('ascii-directional-glyphs', asciiDirectionalGlyphs);

  // Family 4
  registerAsciiAlgorithm('ascii-contour-outline', asciiContourOutline);
  registerAsciiAlgorithm('ascii-halftone-glyphs', asciiHalftoneGlyphs);
  registerAsciiAlgorithm('ascii-text-mosaic', asciiTextMosaic);
  registerAsciiAlgorithm('ascii-silhouette', asciiSilhouette);
}

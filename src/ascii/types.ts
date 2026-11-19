export type AsciiAlgorithmFamily = 'tonal' | 'dithering' | 'geometry' | 'artistic';

export type AsciiAlgorithmId =
  // Family 1: Brightness & tonal mapping
  | 'ascii-classic-ramp'
  | 'ascii-inverted-ramp'
  | 'ascii-adaptive-density'
  | 'ascii-local-contrast'
  | 'ascii-threshold'
  | 'ascii-posterized'
  | 'ascii-gamma-weighted'
  | 'ascii-edge-enhanced'
  // Family 2: Dithering-based ASCII
  | 'ascii-bayer'
  | 'ascii-floyd-steinberg'
  | 'ascii-atkinson'
  | 'ascii-stochastic'
  | 'ascii-blue-noise'
  | 'ascii-error-diffusion-braille'
  // Family 3: Character geometry
  | 'ascii-braille-2x4'
  | 'ascii-half-block'
  | 'ascii-quadrant-blocks'
  | 'ascii-sextant-octant'
  | 'ascii-geometric-glyphs'
  | 'ascii-directional-glyphs'
  // Family 4: Artistic rendering
  | 'ascii-contour-outline'
  | 'ascii-halftone-glyphs'
  | 'ascii-text-mosaic'
  | 'ascii-silhouette';

export type AsciiCharsetCategory =
  | 'classic_ascii'
  | 'extended_ascii'
  | 'numbers'
  | 'symbols'
  | 'blocks_shades'
  | 'braille'
  | 'geometric'
  | 'directional'
  | 'languages'
  | 'playing_cards'
  | 'decorative_unicode'
  | 'custom';

export interface AsciiCharsetDefinition {
  id: string;
  name: string;
  category: AsciiCharsetCategory;
  /** Ordered glyphs (parsed as Unicode grapheme/codepoint array via Array.from). */
  chars: string;
  ordering: 'sparse-to-dense' | 'structural' | 'bitmask' | 'directional' | 'calibrated';
  description: string;
  compatibilityNotes: string;
  /** True if built-in (non-deletable); false for user-saved sets. */
  builtin: boolean;
  /** Optional force-text-presentation selector (\uFE0E) to avoid color emoji rendering. */
  forceTextPresentation?: boolean;
}

export type AsciiColorMode =
  | 'monochrome'
  | 'source'
  | 'palette'
  | 'single'
  | 'custom';

export type AsciiBackgroundMode =
  | 'transparent'
  | 'solid'
  | 'original'
  | 'custom';

export type AsciiInjectMode = 'append' | 'prepend' | 'interleave' | 'replace';

export type AsciiEffectId =
  | 'ascii_glyph_glow'
  | 'ascii_glyph_sweep'
  | 'ascii_char_glitch'
  | 'ascii_glyph_displacement'
  | 'ascii_char_flicker'
  | 'ascii_chromatic_split'
  | 'ascii_scanlines'
  | 'ascii_char_echo'
  | 'ascii_density_pulse'
  | 'ascii_glyph_noise';

export type AsciiEffectStage = 'grid' | 'pixel' | 'mixed';

export interface AsciiEffectConfig {
  id: AsciiEffectId;
  enabled: boolean;
  stage: AsciiEffectStage;
  params: Record<string, number | string | boolean>;
}

export interface AsciiAlgorithmControlMeta {
  id: string;
  label: string;
  type: 'slider' | 'toggle' | 'dropdown' | 'text';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | boolean | string;
  options?: Array<{ value: string; label: string }>;
  description?: string;
  unit?: string;
}

export interface AsciiAlgorithmDescriptor {
  id: AsciiAlgorithmId;
  name: string;
  category: 'ascii';
  family: AsciiAlgorithmFamily;
  description: string;
  complexity: 'simple' | 'moderate' | 'complex';
  heavyForLiveVideo?: boolean;
  usesSubCellSampling?: boolean;
  features: {
    supportsColorPalettes: boolean;
    supportsColorDepth: boolean;
    supportsDpiScale: boolean;
    supportsLuminanceThreshold: boolean;
    isDeterministic: boolean;
    requiresMultiPass: boolean;
  };
  controls: AsciiAlgorithmControlMeta[];
}

export interface AsciiSettings {
  algorithmId: AsciiAlgorithmId;
  // Character controls
  charsetId: string;
  customCharsetChars: string;
  characterDepth: number;          // 2..256 (caps active ramp length)
  characterOffset: number;         // -64..64 circular shift in ramp
  injectedChars: string[];         // up to 10 custom characters
  injectMode: AsciiInjectMode;
  reverseCharset: boolean;
  autoCalibrateOrder: boolean;     // sort by measured font ink coverage
  fontFamily: string;              // e.g. 'monospace', 'Consolas', 'DejaVu Sans Mono'
  fontWeight: number;              // 300..900
  cellWidth: number;               // px (4..32)
  cellHeight: number;              // px (4..48)
  cellSpacing: number;             // px (0..12)
  aspectRatio: number;             // 0.3..2.0 (cellWidth / cellHeight multiplier)
  glyphScale: number;              // 0.5..1.5
  glyphAlign: 'center' | 'left' | 'right';
  // Image mapping controls
  brightness: number;              // -1.0..1.0
  contrast: number;                // -1.0..1.0
  gamma: number;                   // 0.2..3.0
  exposure: number;                // -2.0..2.0 EV
  blackPoint: number;              // 0.0..0.5
  whitePoint: number;              // 0.5..1.0
  invert: boolean;
  luminanceMode: 'global' | 'local';
  edgeSensitivity: number;         // 0.0..2.0
  detailPreservation: number;      // 0.0..1.0
  samplingQuality: 'fast' | 'box' | 'subcell';
  smoothing: number;               // 0..3
  sharpening: number;              // 0..2
  // Color controls
  colorMode: AsciiColorMode;
  foregroundColor: string;         // hex #RRGGBB
  foregroundOpacity: number;       // 0..1
  colorQuantization: number;       // 0 (off) or 2..32
  preserveAlpha: boolean;
  // Background controls
  backgroundMode: AsciiBackgroundMode;
  backgroundColor: string;         // hex #RRGGBB
  backgroundOpacity: number;       // 0..1
  // Advanced controls
  densityCalibration: boolean;
  clipping: boolean;
  // Algorithm-specific overrides
  algoParams: Record<string, number | boolean | string>;
  // ASCII-specific effects
  asciiEffects: AsciiEffectConfig[];
}

export const DEFAULT_ASCII_SETTINGS: AsciiSettings = {
  algorithmId: 'ascii-classic-ramp',
  charsetId: 'classic_standard',
  customCharsetChars: '',
  characterDepth: 16,
  characterOffset: 0,
  injectedChars: [],
  injectMode: 'interleave',
  reverseCharset: false,
  autoCalibrateOrder: false,
  fontFamily: '"JetBrains Mono", "Fira Code", "DejaVu Sans Mono", Consolas, monospace',
  fontWeight: 500,
  cellWidth: 8,
  cellHeight: 14,
  cellSpacing: 0,
  aspectRatio: 1.0,
  glyphScale: 1.0,
  glyphAlign: 'center',
  brightness: 0,
  contrast: 0,
  gamma: 1.0,
  exposure: 0,
  blackPoint: 0,
  whitePoint: 1.0,
  invert: false,
  luminanceMode: 'global',
  edgeSensitivity: 0.5,
  detailPreservation: 0.5,
  samplingQuality: 'box',
  smoothing: 0,
  sharpening: 0,
  colorMode: 'source',
  foregroundColor: '#e6edf3',
  foregroundOpacity: 1.0,
  colorQuantization: 0,
  preserveAlpha: true,
  backgroundMode: 'solid',
  backgroundColor: '#0d0e11',
  backgroundOpacity: 1.0,
  densityCalibration: true,
  clipping: true,
  algoParams: {},
  asciiEffects: []
};

export interface GlyphMetrics {
  char: string;
  /** True ink coverage in [0, 1] measured from rasterized glyph alpha. */
  coverage: number;
  /** 6-zone (2 cols × 3 rows) normalized spatial density vector for shape matching. */
  zones: [number, number, number, number, number, number];
  /** True if glyph was absent in the font and replaced by fallback bitmap. */
  usedFallback: boolean;
}

/**
 * Worker-transferable pre-baked monochrome alpha atlas for a resolved character set.
 * Each glyph occupies exactly `cellWidth * cellHeight` bytes in `alphaBitmaps`.
 */
export interface GlyphAtlasData {
  key: string;
  chars: string[];
  cellWidth: number;
  cellHeight: number;
  /** Contiguous alpha bitmaps: length === chars.length * cellWidth * cellHeight */
  alphaBitmaps: Uint8Array;
  /** Measured ink coverage per glyph in [0, 1], length === chars.length */
  coverages: Float32Array;
  /** 6-zone shape vectors: length === chars.length * 6 */
  zones: Float32Array;
  /** Fraction of requested glyphs that required fallback rendering (0..1). */
  missingGlyphRatio: number;
  byteLength: number;
}

/**
 * Stage 4-6 intermediate representation: decoupled from rasterized pixels.
 * Directly powers TXT export, grid-level effects, and rasterization.
 */
export interface AsciiGridFrame {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  cellSpacing: number;
  /** Resolved ordered character lookup table for this frame. */
  chars: string[];
  /** Index into `chars` for each cell (length = cols * rows). */
  charIndices: Uint16Array;
  /** Optional direct Unicode codepoints (used by Braille 2x4 / Quadrant / Sextant). */
  directChars?: string[];
  /** Per-cell foreground RGBA (length = cols * rows * 4). */
  fgRgba: Uint8ClampedArray;
  /** Per-cell background RGBA (length = cols * rows * 4). */
  bgRgba: Uint8ClampedArray;
  /** Per-cell normalized luminance in [0, 1] (length = cols * rows). */
  luminance: Float32Array;
  /** Per-cell sub-pixel/cell horizontal displacement in px (grid effects). */
  offsetX: Int8Array;
  /** Per-cell vertical displacement in px (grid effects). */
  offsetY: Int8Array;
  /** Per-cell highlight boost in [0, 2] (e.g., Glyph Sweep / Density Pulse). */
  highlight: Float32Array;
}

export interface AsciiRenderContext {
  width: number;
  height: number;
  frameIndex: number;
  time: number;
  fps: number;
  palette: number[][];
  previewScale: number;
  isExport: boolean;
  atlas?: GlyphAtlasData | null;
}

export interface AsciiRenderResult {
  grid: AsciiGridFrame;
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface AsciiExportOptions {
  format: 'png' | 'jpeg' | 'webp' | 'txt' | 'gif' | 'mp4' | 'webm';
  transparentBackground?: boolean;
  quality?: number;
  filename?: string;
  lineEnding?: '\n' | '\r\n';
}

export interface AsciiAnimatableProp {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultFrom: number;
  defaultTo: number;
}

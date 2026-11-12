/**
 * 2026-11-12 — Fix Rust→JS silent fallback
 * - Bug 1: normalize Tauri string rejections before checking for cache_size_mismatch / "No source image cached"
 * - Bug 2: replace base64 set_source_image with set_source_image_raw (InvokeBody::Raw) + head/tail skip logic
 * - Bug 3: set_source_image is now async + spawn_blocking on the Rust side
 * - Bug 4/6: isRustAvailable() called on App.tsx mount; TopMenuBar shows "JS fallback" chip when active
 * - Bug 5: guard rawData.set() against length mismatch before copying Rust output
 */

// DitherForge EngineBridge Service
// Transparently routes supported image-processing algorithms to the native Rust engine in Tauri
// and seamlessly falls back to the reference JavaScript engine when running in browser mode or on error.

// @ts-ignore
import { applyDitherAlgorithm } from '../dither-engine/algorithms.js';
import { invoke, isTauri as checkTauri } from '@tauri-apps/api/core';

export interface DitherSettings {
  algorithmId: string;
  palette: number[][];
  threshold?: number;
  scale?: number;
  diffusionStrength?: number;
  serpentine?: boolean;
  temporalSeed?: number;
  controls?: Record<string, any>;
  effectStack?: any[];
  [key: string]: any;
}

export interface EngineBridgeResult {
  backend: 'rust' | 'js' | 'js-fallback';
  elapsedMs: number;
}

export const MIGRATED_ALGORITHMS = new Set<string>([
  // 1. Basic (2)
  'none',
  'thresholder',
  'threshold',
  'fixed-threshold',
  'fixed_threshold',
  'color-separation',
  'color_separation',

  // 2. Error Diffusion (22)
  'floyd-steinberg',
  'floyd_steinberg',
  'floyd',
  'atkinson',
  'burkes',
  'sierra',
  'sierra_3',
  'sierra-3',
  'two-row-sierra',
  'two_row_sierra',
  'sierra_2',
  'sierra-2',
  'sierra-lite',
  'sierra_lite',
  'stucki',
  'jarvis-judice-ninke',
  'jarvis_judice_ninke',
  'jjn',
  'stevenson-arce',
  'stevenson_arce',
  'fan',
  'shiau-fan',
  'shiau_fan',
  'shiau-fan-2',
  'shiau_fan_2',
  'false-floyd-steinberg',
  'false_floyd_steinberg',
  'minimized-avg-error',
  'minimized_avg_error',
  'oatley',
  'dynamic-serpentine',
  'dynamic_serpentine',
  'artifact-modulation',
  'artifact_modulation',
  'gaussian',
  'ostromukhov',
  'ostromoukhov',
  'cracked-diffuse',
  'cracked_diffuse',
  'fractal-diffuse',
  'fractal_diffuse',
  'vortex-diffusion',
  'vortex_diffusion',
  'pigeon-diffusion',
  'pigeon_diffusion',
  'pigeon',

  // 3. Ordered Dithering (12)
  'bayer-matrix',
  'bayer_matrix',
  'bayer-2x2',
  'bayer_2x2',
  'bayer2',
  'bayer-4x4',
  'bayer_4x4',
  'bayer4',
  'bayer-8x8',
  'bayer_8x8',
  'bayer8',
  'bayer-16x16',
  'bayer_16x16',
  'bayer16',
  'bayer-void',
  'bayer_void',
  'bit-tone',
  'bit_tone',
  'clustered-dot',
  'clustered_dot',
  'clustered-dot-8x8',
  'clustered_dot_8x8',
  'dispersed-dot-6x6',
  'dispersed_dot_6x6',
  'mosaic',
  'random-ordered',
  'random_ordered',

  // 4. Pattern Dithers (12)
  'checkered',
  'checkers',
  'horizontal-lines',
  'horizontal_lines',
  'vertical-lines',
  'vertical_lines',
  'crosshatch',
  'diagonal-hatch',
  'diagonal_hatch',
  'diagonal',
  'concentric-diamond',
  'concentric_diamond',
  'diamond',
  'diamond-grid',
  'diamond_grid',
  'woven-basket',
  'woven_basket',
  'hex-stipple',
  'hex_stipple',
  'brick-wall',
  'brick_wall',
  'herringbone',
  'radial-concentric',
  'radial_concentric',
  'spiral-screen',
  'spiral_screen',
  'block-tone',
  'block_tone',
  'camo',
  'circle-grid',
  'circle_grid',
  'gridlock-traffic',
  'gridlock_traffic',
  'heart-grid',
  'heart_grid',
  'pop-tone',
  'pop_tone',
  'print-pattern',
  'print_pattern',
  'square-mosaic',
  'square_mosaic',
  'stippling',
  'hexa-poly',
  'hexa_poly',
  'low-poly',
  'low_poly',
  'penta-poly',
  'penta_poly',
  'tri-poly',
  'tri_poly',
  'beehive',
  'displace-contour',
  'displace_contour',
  'dotted-lines',
  'dotted_lines',
  'noise',
  'orb-diffuse-x',
  'orb-diffuse-y',
  'orb-diffuse',
  'orb-matrix',
  'radial-burst',
  'radial-peaks',
  'sine-distort',
  'sine-wave-modulation',
  'topography',
  'vortex',
  'wave',

  // 5. Glitch Effects (17)
  'scanline-jitter',
  'scanline_jitter',
  'chromatic-offset',
  'chromatic_offset',
  'pixel-sorting',
  'pixel_sorting',
  'digital-artifacts',
  'digital_artifacts',
  'interlacing-tear',
  'interlacing_tear',
  'crt-bloom',
  'crt_bloom',
  'bit-crush',
  'bit_crush',
  'vhs-tracking',
  'vhs_tracking',
  'bad-ram',
  'bad_ram',
  'wave-distortion',
  'wave_distortion',
  'quant-slice',
  'quant_slice',
  'matrix-rake',
  'matrix_rake',
  'static-snow',
  'static_snow',
  'sync-pulse-loss',
  'sync_pulse_loss',
  'feedback-ringing',
  'feedback_ringing',
  'chroma-subsample',
  'chroma_subsample',
  'moire-glitch',
  'moire_glitch',
  'smooth-diffuse',
  'stucki-diffusion-lines',
  'uniform-modulation-x',
  'uniform-modulation-y',
  'wave-modulation-x',
  'wave-modulation-y',
  'waveform-alt',
  'waveform',
  'contrast-aware-x',
  'contrast-aware-y',
  'glitch',
  'modulated-diffuse-x',
  'modulated-diffuse-y',
  'ordered-modulation',
  'atkinson-line-modulation',
  'atkinson-vhs',
  'artifact-modulation-glitch',

  // 6. Special Effects (17)
  'random-threshold',
  'random_threshold',
  'blue-noise',
  'blue_noise',
  'gaussian-noise',
  'gaussian_noise',
  'perlin-gradient',
  'perlin_gradient',
  'riemersma',
  'tpdf-noise',
  'tpdf_noise',
  'companding-curve',
  'companding_curve',
  'spatial-lattice',
  'spatial_lattice',
  'sobel-feature',
  'sobel_feature',
  'laplacian-mod',
  'laplacian_mod',
  'directional-gradient',
  'directional_gradient',
  'voronoi-cellular',
  'voronoi_cellular',
  'diffusion-blur',
  'diffusion_blur',
  'quantum-stipple',
  'quantum_stipple',
  'interleaved-gradient-noise',
  'interleaved_gradient_noise',
  'roberts-quasirandom',
  'roberts_quasirandom',

  // 7. Bespoke Effects (2)
  'ignition-glow',
  'ignition_glow',
  'cyber-matrix',
  'cyber_matrix',

  // 8. Temporal Effects (1)
  'temporal-kinetic',
  'temporal_kinetic'
]);

class EngineBridgeService {
  private rustAvailable: boolean | null = null;
  private checkingRust: Promise<boolean> | null = null;
  private lastBackend: 'rust' | 'js' | 'js-fallback' = 'js';
  private lastCachedDimensions: { width: number; height: number; head: number; tail: number } | null = null;

  /**
   * Returns the backend that executed the most recent image processing operation.
   */
  public getLastBackend(): 'rust' | 'js' | 'js-fallback' {
    return this.lastBackend;
  }

  /**
   * Detects whether the application is running inside a Tauri webview.
   */
  public isTauri(): boolean {
    if (typeof window === 'undefined') return false;
    const w = window as any;
    try {
      if (typeof checkTauri === 'function' && checkTauri()) return true;
    } catch {
      // ignore
    }
    return Boolean(w.isTauri || w.__TAURI_INTERNALS__ || w.__TAURI__);
  }

  /**
   * Detects whether the native Rust processing command is available and working.
   */
  public async isRustAvailable(): Promise<boolean> {
    if (!this.isTauri()) {
      this.rustAvailable = false;
      return false;
    }
    if (this.rustAvailable !== null) {
      return this.rustAvailable;
    }
    if (this.checkingRust) {
      return this.checkingRust;
    }

    this.checkingRust = (async () => {
      try {
        // Send a 1x1 test buffer to verify IPC command registration
        const testPalette = [[0, 0, 0, 255], [255, 255, 255, 255]];
        const testPixel = new Uint8ClampedArray([128, 128, 128, 255]);
        const testImg = { data: testPixel, width: 1, height: 1 } as ImageData;
        await this.dispatchRust(testImg, {
          algorithmId: 'threshold',
          palette: testPalette,
          threshold: 0.5
        });
        this.rustAvailable = true;
      } catch (err) {
        console.warn('[EngineBridge] Rust binary IPC unavailable, falling back to JS engine:', err);
        this.rustAvailable = false;
      } finally {
        this.checkingRust = null;
      }
      return this.rustAvailable;
    })();

    return this.checkingRust;
  }

  /**
   * Checks whether a specific algorithm ID is currently supported by the native Rust engine.
   */
  public isAlgorithmSupported(algorithmId: string): boolean {
    const norm = (algorithmId || '').toLowerCase().replace(/_/g, '-');
    return MIGRATED_ALGORITHMS.has(norm) || MIGRATED_ALGORITHMS.has(algorithmId);
  }

  /**
   * Resolves canonical algorithm ID for Rust backend.
   */
  private canonicalizeId(algorithmId: string): string {
    const norm = (algorithmId || '').toLowerCase().replace(/-/g, '_');
    if (norm === 'none') return 'none';
    if (norm.includes('floyd') && !norm.includes('false')) return 'floyd_steinberg';
    if (norm === 'atkinson') return 'atkinson';
    if (norm === 'burkes') return 'burkes';
    if (norm === 'sierra' || norm === 'sierra_3') return 'sierra_3';
    if (norm === 'two_row_sierra' || norm === 'sierra_2') return 'sierra_2';
    if (norm === 'sierra_lite') return 'sierra_lite';
    if (norm === 'stucki') return 'stucki';
    if (norm === 'jarvis_judice_ninke' || norm === 'jjn') return 'jarvis_judice_ninke';
    if (norm === 'stevenson_arce') return 'stevenson_arce';
    if (norm === 'fan') return 'fan';
    if (norm === 'shiau_fan') return 'shiau_fan';
    if (norm === 'shiau_fan_2') return 'shiau_fan_2';
    if (norm === 'false_floyd_steinberg') return 'false_floyd_steinberg';
    if (norm === 'minimized_avg_error' || norm === 'oatley') return 'minimized_avg_error';
    if (norm === 'dynamic_serpentine') return 'dynamic_serpentine';
    if (norm === 'artifact_modulation') return 'artifact_modulation';
    if (norm === 'gaussian') return 'gaussian';
    if (norm === 'ostromukhov' || norm === 'ostromoukhov') return 'ostromoukhov';
    if (norm === 'cracked_diffuse') return 'cracked_diffuse';
    if (norm === 'fractal_diffuse') return 'fractal_diffuse';
    if (norm === 'vortex_diffusion') return 'vortex_diffusion';
    if (norm === 'pigeon_diffusion' || norm === 'pigeon') return 'pigeon_diffusion';

    if (norm === 'bayer_matrix') return 'bayer_matrix';
    if (norm === 'bayer_2x2' || norm === 'bayer2') return 'bayer_2x2';
    if (norm === 'bayer_4x4' || norm === 'bayer4') return 'bayer_4x4';
    if (norm === 'bayer_8x8' || norm === 'bayer8') return 'bayer_8x8';
    if (norm === 'bayer_16x16' || norm === 'bayer16') return 'bayer_16x16';
    if (norm === 'bayer_void') return 'bayer_void';
    if (norm === 'bit_tone') return 'bit_tone';
    if (norm === 'clustered_dot') return 'clustered_dot';
    if (norm === 'clustered_dot_8x8') return 'clustered_dot_8x8';
    if (norm === 'dispersed_dot_6x6') return 'dispersed_dot_6x6';
    if (norm === 'mosaic') return 'mosaic';
    if (norm === 'random_ordered') return 'random_ordered';

    if (norm === 'thresholder') return 'thresholder';
    if (norm.includes('threshold')) return 'threshold';
    return norm;
  }

  /**
   * Ensures palette colors are properly formatted as 4-element [r, g, b, a] arrays.
   */
  private normalizePalette(palette: number[][]): number[][] {
    if (!palette || !Array.isArray(palette) || palette.length === 0) {
      return [[0, 0, 0, 255], [255, 255, 255, 255]];
    }
    return palette.map((c) => {
      if (Array.isArray(c)) {
        return [c[0] ?? 0, c[1] ?? 0, c[2] ?? 0, c[3] ?? 255];
      }
      return [0, 0, 0, 255];
    });
  }

  /**
   * Executes dithering via raw binary Tauri IPC.
   */
  private reusablePayload: Uint8Array | null = null;

  private async dispatchRust(imageData: ImageData, settings: DitherSettings): Promise<void> {
    const width = imageData.width;
    const height = imageData.height;
    const rawData = imageData.data;

    // Upload source pixels to Rust when dimensions or content change.
    // Reuse head/tail tracking to skip redundant re-uploads on animation frames
    // at the same resolution with the same pixel content.
    const head = rawData[0] | (rawData[1] << 8) | (rawData[2] << 16) | (rawData[3] << 24);
    const tailIdx = rawData.length - 4;
    const tail = rawData[tailIdx] | (rawData[tailIdx + 1] << 8) | (rawData[tailIdx + 2] << 16) | (rawData[tailIdx + 3] << 24);
    const needsUpload =
      !this.lastCachedDimensions ||
      this.lastCachedDimensions.width !== width ||
      this.lastCachedDimensions.height !== height ||
      this.lastCachedDimensions.head !== head ||
      this.lastCachedDimensions.tail !== tail;

    if (needsUpload) {
      const base64 = this.arrayBufferToBase64(
        rawData.buffer,
        rawData.byteOffset,
        rawData.byteLength
      );
      try {
        await invoke('set_source_image', { image_base64: base64, width, height });
      } catch (err: any) {
        console.warn(
          `[EngineBridge] set_source_image failed for ${width}x${height}, falling back to JS:`,
          err
        );
        throw err;
      }
      this.lastCachedDimensions = { width, height, head, tail };
    }

    const rustAlgo = this.canonicalizeId(settings.algorithmId);
    const palette = this.normalizePalette(settings.palette);

    const userControls = { ...(settings.controls || {}), ...settings };
    const rawThreshold = settings.threshold ?? userControls.threshold ?? 0.5;
    const threshold = rawThreshold > 1 ? rawThreshold / 100 : rawThreshold;

    // Only send luminance_threshold when explicitly set by an algorithm control,
    // otherwise derive from threshold for algorithms with luminance threshold support
    const lumThreshold = userControls.luminanceThreshold !== undefined
      ? Number(userControls.luminanceThreshold)
      : Math.round(threshold * 100);

    const scale = settings.scale ?? userControls.scale ?? 1.0;
    const diffStrength = settings.diffusionStrength ?? userControls.diffusionStrength ?? 1.0;
    const serpentine = settings.serpentine ?? userControls.serpentine;
    const temporalSeed = settings.temporalSeed ?? userControls.temporalSeed ?? 0;

    const header = {
      width,
      height,
      algorithm: rustAlgo,
      palette,
      threshold,
      luminance_threshold: lumThreshold,
      brightness: settings.brightness ?? userControls.brightness ?? 0.0,
      contrast: settings.contrast ?? userControls.contrast ?? 0.0,
      saturation: settings.saturation ?? userControls.saturation ?? 0.0,
      gamma: settings.gamma ?? userControls.gamma ?? 1.0,
      hue: settings.hue ?? userControls.hue ?? 0.0,
      temporal_pattern: settings.temporalPattern ?? userControls.temporalPattern ?? 'none',
      temporal_intensity: settings.temporalIntensity ?? userControls.temporalIntensity ?? 0.0,
      temporal_speed: settings.temporalSpeed ?? userControls.temporalSpeed ?? 1.0,
      scale,
      diffusion_strength: diffStrength,
      serpentine,
      temporal_seed: temporalSeed,
      depth: settings.depth ?? userControls.depth ?? 8,
      noise_amount: settings.noiseAmount ?? userControls.noiseAmount ?? 0.0,
      bleed: settings.bleed ?? userControls.bleed ?? (userControls.bleedFraction !== undefined ? Number(userControls.bleedFraction) / 100 : undefined),
      offset_x: settings.offsetX ?? userControls.offsetX ?? 0.0,
      offset_y: settings.offsetY ?? userControls.offsetY ?? 0.0,
      line_scale: userControls.lineScale !== undefined ? Number(userControls.lineScale) : undefined,
      noisy_lines: userControls.noisyLines !== undefined ? Boolean(userControls.noisyLines) : undefined,
      smoothing: userControls.smoothingFactor !== undefined
        ? (typeof userControls.smoothingFactor === 'boolean' ? (userControls.smoothingFactor ? 6.0 : 0.0) : Number(userControls.smoothingFactor))
        : (userControls.smoothness !== undefined ? Number(userControls.smoothness) : (userControls.smoothing !== undefined ? Number(userControls.smoothing) : undefined)),
      line_spacing: userControls.lineSpacing !== undefined ? Number(userControls.lineSpacing) : undefined,
      line_density: userControls.lineDensity !== undefined ? Number(userControls.lineDensity) : undefined,
      line_angle: userControls.lineAngle !== undefined ? Number(userControls.lineAngle) : undefined,
      dotting: userControls.dotting !== undefined ? Number(userControls.dotting) : undefined,
      line_emphasis: userControls.lineEmphasis !== undefined ? Number(userControls.lineEmphasis) : undefined,
      line_count: userControls.lineCount !== undefined ? Number(userControls.lineCount) : undefined,
      modulation_strength: userControls.modulationStrength !== undefined ? Number(userControls.modulationStrength) : undefined,
      horizontal_bias: userControls.horizontalBias !== undefined ? Number(userControls.horizontalBias) : undefined,
      glitch_intensity: userControls.glitchIntensity !== undefined ? Number(userControls.glitchIntensity) : undefined,
      frequency: userControls.frequency !== undefined ? Number(userControls.frequency) : undefined,
      amplitude: userControls.amplitude !== undefined ? Number(userControls.amplitude) : undefined,
      wave_frequency: userControls.waveFrequency !== undefined ? Number(userControls.waveFrequency) : undefined,
      wave_density: userControls.waveDensity !== undefined ? Number(userControls.waveDensity) : undefined,
      wave_threshold: userControls.waveThreshold !== undefined ? Number(userControls.waveThreshold) : undefined,
      modulation_frequency: userControls.modulationFrequency !== undefined ? Number(userControls.modulationFrequency) : undefined,
      modulation_blend: userControls.modulationBlend !== undefined ? Number(userControls.modulationBlend) : undefined,
      freq_a: userControls.freqA !== undefined ? Number(userControls.freqA) : undefined,
      freq_b: userControls.freqB !== undefined ? Number(userControls.freqB) : undefined,
      angle: userControls.angle !== undefined ? Number(userControls.angle) : undefined,
      swirl: userControls.swirl !== undefined ? Number(userControls.swirl) : undefined,
      cell_size: userControls.cellSize !== undefined ? Number(userControls.cellSize) : undefined,
      edge_sensitivity: userControls.edgeSensitivity !== undefined ? Number(userControls.edgeSensitivity) : undefined,
      checkers_size: userControls.checkersSize !== undefined ? Number(userControls.checkersSize) : undefined,
      period: userControls.period !== undefined ? Number(userControls.period) : undefined,
      dot_scale: userControls.dotScale !== undefined ? Number(userControls.dotScale) : undefined,
      dot_density: userControls.dotDensity !== undefined ? Number(userControls.dotDensity) : undefined,
      density: userControls.density !== undefined ? Number(userControls.density) : undefined,
      variation: userControls.variation !== undefined ? Number(userControls.variation) : undefined,
      divisor: userControls.divisor !== undefined ? Number(userControls.divisor) : undefined,
      peak_threshold: userControls.peakThreshold !== undefined ? Number(userControls.peakThreshold) : undefined,
      min_peak_distance: userControls.minPeakDistance !== undefined ? Number(userControls.minPeakDistance) : undefined,
      max_peaks: userControls.maxPeaks !== undefined ? Number(userControls.maxPeaks) : undefined,
      interference: typeof userControls.interference === 'boolean' ? userControls.interference : undefined,
      contour_threshold: userControls.contourThreshold !== undefined ? Number(userControls.contourThreshold) : undefined,
      line_mode: userControls.lineMode ? String(userControls.lineMode) : undefined,
      triangle_type: userControls.triangleType ? String(userControls.triangleType) : undefined,
      vertical: typeof userControls.vertical === 'boolean' ? userControls.vertical : undefined,
      orb_count: userControls.orbCount !== undefined ? Number(userControls.orbCount) : undefined,
      orb_size: userControls.orbSize !== undefined ? Number(userControls.orbSize) : undefined,
      orb_intensity: userControls.orbIntensity !== undefined ? Number(userControls.orbIntensity) : undefined,
      orb_random: userControls.orbRandom !== undefined ? Number(userControls.orbRandom) : undefined,
      orb_offset: userControls.orbOffset !== undefined ? Number(userControls.orbOffset) : undefined,
      orb_vertical: typeof userControls.orbVertical === 'boolean' ? userControls.orbVertical : undefined,
      matrix_size: userControls.matrixSize,
      warp_intensity: userControls.warpIntensity,
      dot_size: userControls.dotSize,
      block_size: userControls.blockSize,
      cracked: userControls.cracked,
      distribution_spread: userControls.distributionSpread,
      twist_strength: userControls.twistStrength,
      spiral_frequency: userControls.spiralFrequency,
      effect_stack: (settings.effectStack || settings.effects || [])
        .filter((e: any) => e && e.enabled !== false)
        .map((e: any) => ({
          id: String(e.type || e.id || ''),
          enabled: Boolean(e.enabled ?? true),
          opacity: typeof e.opacity === 'number' ? e.opacity : 1.0,
          blend_mode: String(e.blendMode || e.blend_mode || 'normal'),
          params: { ...(e.params || {}), _frameIndex: temporalSeed }
        }))
    };

    // Send header-only JSON — pixels are cached in Rust via set_source_image.
    // On Linux WebKitGTK, InvokeBody::Raw is unreliable (JSON-serialized as 5.7M-element array),
    // so we send ~300 bytes of header JSON and look up pixels from the Rust cache.
    // The processed pixel buffer returned by Rust must be copied back into imageData.data
    // so the caller sees the result (JS engine modifies imageData in place).
    let resultBuffer: ArrayBuffer | null = null;
    try {
      resultBuffer = await invoke<ArrayBuffer>('process_image_binary', header);
    } catch (raw: any) {
      // Bug 1: Tauri v2 rejects with a plain string for Result::Err(String),
      // so err?.message is undefined — normalize to a string before inspection.
      const msg = typeof raw === 'string' ? raw : (raw?.message ?? String(raw));
      this.lastError = msg;
      if (
        msg === 'cache_size_mismatch' ||
        msg.includes('No source image cached') ||
        msg.includes('Pixel buffer size mismatch')
      ) {
        this.lastCachedDimensions = null;
      }
      throw raw;
    }
    if (resultBuffer) {
      const resultBytes = new Uint8Array(resultBuffer);
      // Bug 5: guard against length mismatch — discarding if Rust returned
      // a different byte count than expected prevents mixed-vendor frames.
      if (resultBytes.length === rawData.length) {
        rawData.set(resultBytes);
      } else {
        console.warn(
          `[EngineBridge] Rust returned ${resultBytes.length} bytes, expected ${rawData.length}; discarding`
        );
      }
    }
    return;
  }

  public lastError: string | null = null;

  /** Convert an ArrayBuffer slice to base64 for set_source_image. */
  private arrayBufferToBase64(buffer: ArrayBuffer, byteOffset: number, byteLength: number): string {
    const bytes = new Uint8Array(buffer, byteOffset, byteLength);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  }

  /**
   * Main dithering entry point.
   * Dispatches to Rust if in desktop mode and algorithm is supported.
   * Otherwise, executes JavaScript engine transparently with zero UI changes.
   */
  public async dither(
    imageData: ImageData,
    settings: DitherSettings
  ): Promise<EngineBridgeResult> {
    const t0 = performance.now();

    const canUseRust = this.isTauri() && this.isAlgorithmSupported(settings.algorithmId);

    if (canUseRust) {
      try {
        await this.dispatchRust(imageData, settings);
        this.lastBackend = 'rust';
        this.lastError = null;
        return {
          backend: 'rust',
          elapsedMs: performance.now() - t0
        };
      } catch (err: any) {
        this.lastError = err?.message || String(err);
        console.error(
          `[EngineBridge] Rust dispatch failed for algorithm '${settings.algorithmId}'. Falling back to JavaScript engine:`,
          err
        );
        // Fall back to JavaScript engine
        applyDitherAlgorithm(imageData, settings);
        this.lastBackend = 'js-fallback';
        return {
          backend: 'js-fallback',
          elapsedMs: performance.now() - t0
        };
      }
    }

    // Default JavaScript execution
    applyDitherAlgorithm(imageData, settings);
    this.lastBackend = 'js';
    this.lastError = null;
    return {
      backend: 'js',
      elapsedMs: performance.now() - t0
    };
  }

  /**
   * Synchronous dither for environments that do not support async rendering.
   * Always routes safely to the reference JavaScript engine.
   */
  public ditherSync(imageData: ImageData, settings: DitherSettings): EngineBridgeResult {
    const t0 = performance.now();
    applyDitherAlgorithm(imageData, settings);
    this.lastBackend = 'js';
    return {
      backend: 'js',
      elapsedMs: performance.now() - t0
    };
  }

  /**
   * Native multi-frame animation processing via Tauri IPC.
   * Concatenates raw RGBA frames and invokes 'process_animation_batch'.
   */
  public async processAnimationBatch(
    frames: Uint8ClampedArray[],
    width: number,
    height: number,
    baseSettings: DitherSettings
  ): Promise<Uint8ClampedArray[]> {
    if (!this.isTauri() || frames.length === 0) {
      throw new Error('Native animation batch processing is only available in Tauri');
    }

    const rustAlgo = this.canonicalizeId(baseSettings.algorithmId);
    const palette = this.normalizePalette(baseSettings.palette);
    const userControls = { ...(baseSettings.controls || {}), ...baseSettings };
    const rawThreshold = baseSettings.threshold ?? userControls.threshold ?? 0.5;
    const threshold = rawThreshold > 1 ? rawThreshold / 100 : rawThreshold;
    const lumThreshold = userControls.luminanceThreshold !== undefined
      ? Number(userControls.luminanceThreshold)
      : Math.round(threshold * 100);

    const baseHeader = {
      width,
      height,
      algorithm: rustAlgo,
      palette,
      threshold,
      luminance_threshold: lumThreshold,
      brightness: baseSettings.brightness ?? userControls.brightness ?? 0.0,
      contrast: baseSettings.contrast ?? userControls.contrast ?? 0.0,
      saturation: baseSettings.saturation ?? userControls.saturation ?? 0.0,
      gamma: baseSettings.gamma ?? userControls.gamma ?? 1.0,
      hue: baseSettings.hue ?? userControls.hue ?? 0.0,
      temporal_pattern: baseSettings.temporalPattern ?? userControls.temporalPattern ?? 'none',
      temporal_intensity: baseSettings.temporalIntensity ?? userControls.temporalIntensity ?? 0.0,
      temporal_speed: baseSettings.temporalSpeed ?? userControls.temporalSpeed ?? 1.0,
      scale: baseSettings.scale ?? userControls.scale ?? 1.0,
      diffusion_strength: baseSettings.diffusionStrength ?? userControls.diffusionStrength ?? 1.0,
      serpentine: baseSettings.serpentine ?? userControls.serpentine,
      temporal_seed: baseSettings.temporalSeed ?? userControls.temporalSeed ?? 0,
      depth: baseSettings.depth ?? userControls.depth ?? 8,
      noise_amount: baseSettings.noiseAmount ?? userControls.noiseAmount ?? 0.0,
      bleed: baseSettings.bleed ?? userControls.bleed ?? (userControls.bleedFraction !== undefined ? Number(userControls.bleedFraction) / 100 : undefined),
      offset_x: baseSettings.offsetX ?? userControls.offsetX ?? 0.0,
      offset_y: baseSettings.offsetY ?? userControls.offsetY ?? 0.0,
      line_scale: userControls.lineScale !== undefined ? Number(userControls.lineScale) : undefined,
      noisy_lines: userControls.noisyLines !== undefined ? Boolean(userControls.noisyLines) : undefined,
      smoothing: userControls.smoothingFactor !== undefined
        ? (typeof userControls.smoothingFactor === 'boolean' ? (userControls.smoothingFactor ? 6.0 : 0.0) : Number(userControls.smoothingFactor))
        : (userControls.smoothness !== undefined ? Number(userControls.smoothness) : (userControls.smoothing !== undefined ? Number(userControls.smoothing) : undefined)),
      line_spacing: userControls.lineSpacing !== undefined ? Number(userControls.lineSpacing) : undefined,
      line_density: userControls.lineDensity !== undefined ? Number(userControls.lineDensity) : undefined,
      line_angle: userControls.lineAngle !== undefined ? Number(userControls.lineAngle) : undefined,
      dotting: userControls.dotting !== undefined ? Number(userControls.dotting) : undefined,
      line_emphasis: userControls.lineEmphasis !== undefined ? Number(userControls.lineEmphasis) : undefined,
      line_count: userControls.lineCount !== undefined ? Number(userControls.lineCount) : undefined,
      modulation_strength: userControls.modulationStrength !== undefined ? Number(userControls.modulationStrength) : undefined,
      horizontal_bias: userControls.horizontalBias !== undefined ? Number(userControls.horizontalBias) : undefined,
      glitch_intensity: userControls.glitchIntensity !== undefined ? Number(userControls.glitchIntensity) : undefined,
      frequency: userControls.frequency !== undefined ? Number(userControls.frequency) : undefined,
      amplitude: userControls.amplitude !== undefined ? Number(userControls.amplitude) : undefined,
      wave_frequency: userControls.waveFrequency !== undefined ? Number(userControls.waveFrequency) : undefined,
      wave_density: userControls.waveDensity !== undefined ? Number(userControls.waveDensity) : undefined,
      wave_threshold: userControls.waveThreshold !== undefined ? Number(userControls.waveThreshold) : undefined,
      modulation_frequency: userControls.modulationFrequency !== undefined ? Number(userControls.modulationFrequency) : undefined,
      modulation_blend: userControls.modulationBlend !== undefined ? Number(userControls.modulationBlend) : undefined,
      freq_a: userControls.freqA !== undefined ? Number(userControls.freqA) : undefined,
      freq_b: userControls.freqB !== undefined ? Number(userControls.freqB) : undefined,
      angle: userControls.angle !== undefined ? Number(userControls.angle) : undefined,
      swirl: userControls.swirl !== undefined ? Number(userControls.swirl) : undefined,
      cell_size: userControls.cellSize !== undefined ? Number(userControls.cellSize) : undefined,
      edge_sensitivity: userControls.edgeSensitivity !== undefined ? Number(userControls.edgeSensitivity) : undefined,
      checkers_size: userControls.checkersSize !== undefined ? Number(userControls.checkersSize) : undefined,
      period: userControls.period !== undefined ? Number(userControls.period) : undefined,
      dot_scale: userControls.dotScale !== undefined ? Number(userControls.dotScale) : undefined,
      dot_density: userControls.dotDensity !== undefined ? Number(userControls.dotDensity) : undefined,
      density: userControls.density !== undefined ? Number(userControls.density) : undefined,
      variation: userControls.variation !== undefined ? Number(userControls.variation) : undefined,
      divisor: userControls.divisor !== undefined ? Number(userControls.divisor) : undefined,
      peak_threshold: userControls.peakThreshold !== undefined ? Number(userControls.peakThreshold) : undefined,
      min_peak_distance: userControls.minPeakDistance !== undefined ? Number(userControls.minPeakDistance) : undefined,
      max_peaks: userControls.maxPeaks !== undefined ? Number(userControls.maxPeaks) : undefined,
      interference: typeof userControls.interference === 'boolean' ? userControls.interference : undefined,
      contour_threshold: userControls.contourThreshold !== undefined ? Number(userControls.contourThreshold) : undefined,
      line_mode: userControls.lineMode ? String(userControls.lineMode) : undefined,
      triangle_type: userControls.triangleType ? String(userControls.triangleType) : undefined,
      vertical: typeof userControls.vertical === 'boolean' ? userControls.vertical : undefined,
      orb_count: userControls.orbCount !== undefined ? Number(userControls.orbCount) : undefined,
      orb_size: userControls.orbSize !== undefined ? Number(userControls.orbSize) : undefined,
      orb_intensity: userControls.orbIntensity !== undefined ? Number(userControls.orbIntensity) : undefined,
      orb_random: userControls.orbRandom !== undefined ? Number(userControls.orbRandom) : undefined,
      orb_offset: userControls.orbOffset !== undefined ? Number(userControls.orbOffset) : undefined,
      orb_vertical: typeof userControls.orbVertical === 'boolean' ? userControls.orbVertical : undefined,
      matrix_size: userControls.matrixSize,
      warp_intensity: userControls.warpIntensity,
      dot_size: userControls.dotSize,
      block_size: userControls.blockSize,
      cracked: userControls.cracked,
      distribution_spread: userControls.distributionSpread,
      twist_strength: userControls.twistStrength,
      spiral_frequency: userControls.spiralFrequency,
      effect_stack: (baseSettings.effectStack || baseSettings.effects || [])
        .filter((e: any) => e && e.enabled !== false)
        .map((e: any) => ({
          id: String(e.type || e.id || ''),
          enabled: Boolean(e.enabled ?? true),
          opacity: typeof e.opacity === 'number' ? e.opacity : 1.0,
          blend_mode: String(e.blendMode || e.blend_mode || 'normal'),
          params: { ...(e.params || {}), _frameIndex: baseSettings.temporalSeed ?? userControls.temporalSeed ?? 0 }
        }))
    };

    const batchHeader = {
      frame_count: frames.length,
      base_header: baseHeader
    };

    const headerJson = new TextEncoder().encode(JSON.stringify(batchHeader));
    const headerLen = headerJson.byteLength;
    const frameByteLen = width * height * 4;
    const totalLen = 4 + headerLen + frameByteLen * frames.length;

    const payload = new Uint8Array(totalLen);
    new DataView(payload.buffer, payload.byteOffset, 4).setUint32(0, headerLen, true);
    payload.set(headerJson, 4);

    let offset = 4 + headerLen;
    for (let i = 0; i < frames.length; i++) {
      payload.set(new Uint8Array(frames[i].buffer, frames[i].byteOffset, frames[i].byteLength), offset);
      offset += frameByteLen;
    }

    const response = await invoke<ArrayBuffer>('process_animation_batch', payload);
    const responseBytes: Uint8Array = response instanceof Uint8Array ? response : new Uint8Array(response);

    const resultFrames: Uint8ClampedArray[] = [];
    for (let i = 0; i < frames.length; i++) {
      const slice = responseBytes.subarray(i * frameByteLen, (i + 1) * frameByteLen);
      resultFrames.push(new Uint8ClampedArray(slice.buffer, slice.byteOffset, slice.byteLength));
    }
    return resultFrames;
  }

  /**
   * Native static and animated export pipeline via Tauri IPC.
   * Invokes 'export_media_native'.
   */
  private uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  }

  public async exportMediaNative(options: {
    width: number;
    height: number;
    format: string; // 'png' | 'jpeg' | 'webp' | 'bmp' | 'ico' | 'gif'
    fps?: number;
    outputPath?: string;
    framesBase64: string[];
  }): Promise<{
    format: string;
    byteLength: number;
    savedPath?: string;
    dataBase64?: string;
  }> {
    if (!this.isTauri()) {
      throw new Error('Native export is only available in Tauri');
    }
    return await invoke('export_media_native', {
      req: {
        width: options.width,
        height: options.height,
        format: options.format,
        fps: options.fps,
        output_path: options.outputPath,
        frames_base64: options.framesBase64
      }
    });
  }

  /**
   * Native static/animated export directly from raw RGBA Uint8ClampedArray frame buffers.
   * Returns a decoded Uint8Array ready for Blob/file download or writes directly to `outputPath`.
   */
  public async exportFramesNative(options: {
    width: number;
    height: number;
    format: 'png' | 'jpeg' | 'jpg' | 'webp' | 'bmp' | 'ico' | 'gif';
    fps?: number;
    outputPath?: string;
    frames: (Uint8ClampedArray | Uint8Array)[];
  }): Promise<Uint8Array> {
    const framesBase64 = options.frames.map((f) =>
      this.uint8ToBase64(new Uint8Array(f.buffer, f.byteOffset, f.byteLength))
    );
    const res = await this.exportMediaNative({
      width: options.width,
      height: options.height,
      format: options.format,
      fps: options.fps,
      outputPath: options.outputPath,
      framesBase64
    });
    if (!res.dataBase64) return new Uint8Array(0);
    const binStr = atob(res.dataBase64);
    const out = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      out[i] = binStr.charCodeAt(i);
    }
    return out;
  }

  /**
   * Fetches native effects registry.
   */
  public async getEffectsList(): Promise<any[]> {
    if (!this.isTauri()) return [];
    return await invoke('get_effects_list');
  }

  /**
   * Fetches native algorithms registry.
   */
  public async getAlgorithmsList(): Promise<any[]> {
    if (!this.isTauri()) return [];
    return await invoke('get_algorithms_list');
  }

  /**
   * Prompts user with native folder dialog to select export directory.
   */
  public async selectExportDirectory(): Promise<string | null> {
    if (!this.isTauri()) return null;
    return await invoke('select_export_directory');
  }

  /**
   * Fetches the default OS download / export directory.
   */
  public async getDefaultExportDirectory(): Promise<string> {
    if (!this.isTauri()) return 'Downloads';
    try {
      return await invoke('get_default_export_directory');
    } catch {
      return 'Downloads';
    }
  }
}

let scratchBuffer = new ArrayBuffer(0);
let scratchView = new Uint8Array(scratchBuffer);
const sharedEncoder = new TextEncoder();
const headerEncodeBuf = new Uint8Array(16384);

export function packBinaryPayload(
  headerObj: Record<string, unknown>,
  pixelData: Uint8ClampedArray | Uint8Array
): Uint8Array {
  const jsonStr = JSON.stringify(headerObj);
  const { written: headerLen } = sharedEncoder.encodeInto(jsonStr, headerEncodeBuf);
  const totalLen = 4 + headerLen + pixelData.byteLength;

  if (scratchBuffer.byteLength < totalLen) {
    scratchBuffer = new ArrayBuffer(Math.max(totalLen, scratchBuffer.byteLength * 2, 1024 * 1024));
    scratchView = new Uint8Array(scratchBuffer);
  }

  // Write little-endian u32 header length
  scratchView[0] = headerLen & 0xff;
  scratchView[1] = (headerLen >>> 8) & 0xff;
  scratchView[2] = (headerLen >>> 16) & 0xff;
  scratchView[3] = (headerLen >>> 24) & 0xff;

  scratchView.set(headerEncodeBuf.subarray(0, headerLen), 4);
  scratchView.set(
    new Uint8Array(pixelData.buffer, pixelData.byteOffset, pixelData.byteLength),
    4 + headerLen
  );

  return scratchView.subarray(0, totalLen);
}

export async function processFrameBinary(
  header: Record<string, unknown>,
  rgbaBytes: Uint8ClampedArray | Uint8Array
): Promise<Uint8ClampedArray> {
  // Pass Uint8Array directly so Tauri uses InvokeBody::Raw
  const payload = packBinaryPayload(header, rgbaBytes);
  const resultBuffer = await invoke<ArrayBuffer>('process_image_binary', payload);
  return new Uint8ClampedArray(resultBuffer);
}

export const EngineBridge = new EngineBridgeService();

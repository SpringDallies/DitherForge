use image::{Rgba, RgbaImage};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use crate::engine::{
    find_nearest_palette_color, AlgorithmCategory, DitherSettings,
};
use crate::palette::FastPaletteLUT;

pub struct AlgorithmDescriptor {
    pub id: &'static str,
    pub name: &'static str,
    pub category: AlgorithmCategory,
    pub description: &'static str,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct RawAlgorithmParams {
    #[serde(default, alias = "threshold")]
    pub threshold: f32,
    #[serde(default, alias = "scale")]
    pub scale: f32,
    #[serde(default, alias = "diffusionStrength")]
    pub diffusion_strength: f32,
    #[serde(default, alias = "serpentine")]
    pub serpentine: Option<bool>,
    #[serde(default, alias = "temporalSeed")]
    pub temporal_seed: u32,
    #[serde(default, alias = "depth")]
    pub depth: Option<u8>,
    #[serde(default, alias = "noiseAmount")]
    pub noise_amount: Option<f32>,
    #[serde(default, alias = "matrixSize")]
    pub matrix_size: Option<usize>,
    #[serde(default, alias = "warpIntensity")]
    pub warp_intensity: Option<f32>,
    #[serde(default, alias = "dotSize")]
    pub dot_size: Option<f32>,
    #[serde(default, alias = "blockSize")]
    pub block_size: Option<f32>,
    #[serde(default, alias = "cracked")]
    pub cracked: Option<f32>,
    #[serde(default, alias = "distributionSpread")]
    pub distribution_spread: Option<f32>,
    #[serde(default, alias = "twistStrength")]
    pub twist_strength: Option<f32>,
    #[serde(default, alias = "spiralFrequency")]
    pub spiral_frequency: Option<f32>,
    #[serde(default, alias = "lineScale")]
    pub line_scale: Option<f32>,
    #[serde(default, alias = "noisyLines")]
    pub noisy_lines: Option<bool>,
    #[serde(default, alias = "bleed")]
    pub bleed: Option<f32>,
    #[serde(default, alias = "smoothing")]
    pub smoothing: Option<f32>,
    #[serde(default, alias = "lineSpacing")]
    pub line_spacing: Option<f32>,
    #[serde(default, alias = "lineDensity")]
    pub line_density: Option<f32>,
    #[serde(default, alias = "lineAngle")]
    pub line_angle: Option<f32>,
    #[serde(default, alias = "dotting")]
    pub dotting: Option<f32>,
    #[serde(default, alias = "lineEmphasis")]
    pub line_emphasis: Option<f32>,
    #[serde(default, alias = "lineCount")]
    pub line_count: Option<f32>,
    #[serde(default, alias = "modulationStrength")]
    pub modulation_strength: Option<f32>,
    #[serde(default, alias = "horizontalBias")]
    pub horizontal_bias: Option<f32>,
    #[serde(default, alias = "glitchIntensity")]
    pub glitch_intensity: Option<f32>,
    #[serde(default, alias = "frequency")]
    pub frequency: Option<f32>,
    #[serde(default, alias = "amplitude")]
    pub amplitude: Option<f32>,
    #[serde(default, alias = "waveFrequency")]
    pub wave_frequency: Option<f32>,
    #[serde(default, alias = "waveDensity")]
    pub wave_density: Option<f32>,
    #[serde(default, alias = "waveThreshold")]
    pub wave_threshold: Option<f32>,
    #[serde(default, alias = "modulationFrequency")]
    pub modulation_frequency: Option<f32>,
    #[serde(default, alias = "modulationBlend")]
    pub modulation_blend: Option<f32>,
    #[serde(default, alias = "freqA")]
    pub freq_a: Option<f32>,
    #[serde(default, alias = "freqB")]
    pub freq_b: Option<f32>,
    #[serde(default, alias = "angle")]
    pub angle: Option<f32>,
    #[serde(default, alias = "swirl")]
    pub swirl: Option<f32>,
    #[serde(default, alias = "cellSize")]
    pub cell_size: Option<f32>,
    #[serde(default, alias = "edgeSensitivity")]
    pub edge_sensitivity: Option<f32>,
    #[serde(default, alias = "checkersSize")]
    pub checkers_size: Option<f32>,
    #[serde(default, alias = "period")]
    pub period: Option<f32>,
    #[serde(default, alias = "dotScale")]
    pub dot_scale: Option<f32>,
    #[serde(default, alias = "dotDensity")]
    pub dot_density: Option<f32>,
    #[serde(default, alias = "density")]
    pub density: Option<f32>,
    #[serde(default, alias = "variation")]
    pub variation: Option<f32>,
    #[serde(default, alias = "divisor")]
    pub divisor: Option<f32>,
    #[serde(default, alias = "peakThreshold")]
    pub peak_threshold: Option<f32>,
    #[serde(default, alias = "minPeakDistance")]
    pub min_peak_distance: Option<f32>,
    #[serde(default, alias = "maxPeaks")]
    pub max_peaks: Option<f32>,
    #[serde(default, alias = "interference")]
    pub interference: Option<bool>,
    #[serde(default, alias = "contourThreshold")]
    pub contour_threshold: Option<f32>,
    #[serde(default, alias = "lineMode")]
    pub line_mode: Option<String>,
    #[serde(default, alias = "triangleType")]
    pub triangle_type: Option<String>,
    #[serde(default, alias = "vertical")]
    pub vertical: Option<bool>,
    #[serde(default, alias = "orbCount")]
    pub orb_count: Option<f32>,
    #[serde(default, alias = "orbSize")]
    pub orb_size: Option<f32>,
    #[serde(default, alias = "orbIntensity")]
    pub orb_intensity: Option<f32>,
    #[serde(default, alias = "orbRandom")]
    pub orb_random: Option<f32>,
    #[serde(default, alias = "orbOffset")]
    pub orb_offset: Option<f32>,
    #[serde(default, alias = "orbVertical")]
    pub orb_vertical: Option<bool>,
    #[serde(default, alias = "offsetX")]
    pub offset_x: Option<f32>,
    #[serde(default, alias = "offsetY")]
    pub offset_y: Option<f32>,
    #[serde(default, alias = "bands")]
    pub bands: Option<f32>,
    #[serde(default, alias = "stripeSpacing")]
    pub stripe_spacing: Option<f32>,
    #[serde(default, alias = "cellRadius")]
    pub cell_radius: Option<f32>,
}

pub const ALGORITHM_REGISTRY: &[AlgorithmDescriptor] = &[
    // --- 1. Error Diffusion (22 algorithms) ---
    AlgorithmDescriptor { id: "floyd_steinberg", name: "Floyd Steinberg", category: AlgorithmCategory::ErrorDiffusion, description: "Canonical 16ths 2-row error diffusion with optimal tone balance." },
    AlgorithmDescriptor { id: "atkinson", name: "Atkinson", category: AlgorithmCategory::ErrorDiffusion, description: "Classic Mac OS 3/4 error retention preserving high contrast highlights." },
    AlgorithmDescriptor { id: "jarvis_judice_ninke", name: "Jarvis Judice Ninke", category: AlgorithmCategory::ErrorDiffusion, description: "Wide 48ths 3-row diffusion producing smooth continuous transitions." },
    AlgorithmDescriptor { id: "stucki", name: "Stucki", category: AlgorithmCategory::ErrorDiffusion, description: "Sharp 42nds 3-row kernel optimizing edge contrast." },
    AlgorithmDescriptor { id: "burkes", name: "Burkes", category: AlgorithmCategory::ErrorDiffusion, description: "Fast 32nds 2-row diffusion with wide horizontal spread." },
    AlgorithmDescriptor { id: "sierra_3", name: "Sierra Three-Row", category: AlgorithmCategory::ErrorDiffusion, description: "Balanced 32nds 3-row kernel tapering error accumulation." },
    AlgorithmDescriptor { id: "sierra_2", name: "Sierra Two-Row", category: AlgorithmCategory::ErrorDiffusion, description: "Streamlined 16ths 2-row diffusion for high performance." },
    AlgorithmDescriptor { id: "sierra_lite", name: "Sierra Lite", category: AlgorithmCategory::ErrorDiffusion, description: "Minimalist 4ths kernel with punchy retro sprite aesthetic." },
    AlgorithmDescriptor { id: "stevenson_arce", name: "Stevenson Arce", category: AlgorithmCategory::ErrorDiffusion, description: "Hexagonal 200ths wide kernel eliminating directional grain." },
    AlgorithmDescriptor { id: "fan", name: "Fan Adaptive", category: AlgorithmCategory::ErrorDiffusion, description: "Modified lower-row distribution suppressing worm-like chains." },
    AlgorithmDescriptor { id: "shiau_fan", name: "Shiau Fan Balanced", category: AlgorithmCategory::ErrorDiffusion, description: "Suppresses structural patterns in uniform highlight fields." },
    AlgorithmDescriptor { id: "shiau_fan_2", name: "Shiau Fan 2 (Narrow)", category: AlgorithmCategory::ErrorDiffusion, description: "Compact 8ths kernel designed for efficient raster engines." },
    AlgorithmDescriptor { id: "false_floyd_steinberg", name: "False Floyd Steinberg", category: AlgorithmCategory::ErrorDiffusion, description: "Asymmetric 3-neighbor matrix creating stylized mechanical noise." },
    AlgorithmDescriptor { id: "minimized_avg_error", name: "Minimized Average Error", category: AlgorithmCategory::ErrorDiffusion, description: "Oatley 16ths matrix minimizing local variance across gradations." },
    AlgorithmDescriptor { id: "dynamic_serpentine", name: "Dynamic Serpentine Lattice", category: AlgorithmCategory::ErrorDiffusion, description: "Alternating scanline sweep with dynamic boundary reflection." },
    AlgorithmDescriptor { id: "artifact_modulation", name: "Artifact Modulation", category: AlgorithmCategory::ErrorDiffusion, description: "High-gain 3rds kernel accentuating structured diffusion ripples." },
    AlgorithmDescriptor { id: "gaussian", name: "Gaussian Kernel Diffusion", category: AlgorithmCategory::ErrorDiffusion, description: "Isotropic bell-curve error distribution." },
    AlgorithmDescriptor { id: "ostromoukhov", name: "Ostromoukhov Variable Diffusion", category: AlgorithmCategory::ErrorDiffusion, description: "Dynamically interpolated coefficients per tonal level." },
    AlgorithmDescriptor { id: "cracked_diffuse", name: "Cracked Diffusion", category: AlgorithmCategory::ErrorDiffusion, description: "Stochastic directional fracture error propagation." },
    AlgorithmDescriptor { id: "fractal_diffuse", name: "Fractal Hilbert Diffusion", category: AlgorithmCategory::ErrorDiffusion, description: "Space-filling Hilbert curve error queue." },
    AlgorithmDescriptor { id: "vortex_diffusion", name: "Vortex Spiral Diffusion", category: AlgorithmCategory::ErrorDiffusion, description: "Angular radial vector error propagation." },
    AlgorithmDescriptor { id: "pigeon_diffusion", name: "Pigeon Asymmetric Diffusion", category: AlgorithmCategory::ErrorDiffusion, description: "14ths wide-wing error kernel." },

    // --- 2. Ordered Dithering (12 algorithms) ---
    AlgorithmDescriptor { id: "bayer_2x2", name: "Bayer 2x2", category: AlgorithmCategory::Ordered, description: "Coarse 4-level ordered micro-checkerboard for bold graphic art." },
    AlgorithmDescriptor { id: "bayer_4x4", name: "Bayer 4x4", category: AlgorithmCategory::Ordered, description: "Classic 16-level matrix emulating early Macintosh & PC graphics." },
    AlgorithmDescriptor { id: "bayer_8x8", name: "Bayer 8x8", category: AlgorithmCategory::Ordered, description: "64-level matrix providing smooth tones with vintage crosshatching." },
    AlgorithmDescriptor { id: "bayer_16x16", name: "Bayer 16x16", category: AlgorithmCategory::Ordered, description: "256-level full range recursive matrix for seamless gradients." },
    AlgorithmDescriptor { id: "bayer_matrix", name: "Parameterized Bayer Matrix", category: AlgorithmCategory::Ordered, description: "Configurable N-rank recursive Bayer threshold matrix." },
    AlgorithmDescriptor { id: "bayer_void", name: "Bayer Void Warp", category: AlgorithmCategory::Ordered, description: "Parabolic horizontal phase-warped Bayer screen." },
    AlgorithmDescriptor { id: "bit_tone", name: "Bit-Tone Macro Dot", category: AlgorithmCategory::Ordered, description: "Scaled macro-cell Bayer quantizer." },
    AlgorithmDescriptor { id: "clustered_dot", name: "Clustered Dot Screen", category: AlgorithmCategory::Ordered, description: "Simulates mechanical photogravure printing and newspaper screens." },
    AlgorithmDescriptor { id: "clustered_dot_8x8", name: "Clustered Dot 8x8 Halftone", category: AlgorithmCategory::Ordered, description: "64-level spiral halftone cluster matrix." },
    AlgorithmDescriptor { id: "mosaic", name: "Mosaic Block Quantizer", category: AlgorithmCategory::Ordered, description: "Cell-averaged nearest palette block mosaic." },
    AlgorithmDescriptor { id: "random_ordered", name: "Random Ordered Hash", category: AlgorithmCategory::Ordered, description: "Deterministic trig-hash spatial threshold screen." },
    AlgorithmDescriptor { id: "dispersed_dot_6x6", name: "Dispersed Dot 6x6", category: AlgorithmCategory::Ordered, description: "Non-power-of-two dispersed threshold matrix." },

    // --- 3. Pattern Dithers (12 algorithms) ---
    AlgorithmDescriptor { id: "checkered", name: "Checkered Micro-Grid", category: AlgorithmCategory::Pattern, description: "Alternating geometry expanding from grid intersection nodes." },
    AlgorithmDescriptor { id: "horizontal_lines", name: "Horizontal Linear Grating", category: AlgorithmCategory::Pattern, description: "Translates luminance into modulated horizontal CRT scanlines." },
    AlgorithmDescriptor { id: "vertical_lines", name: "Vertical Linear Grating", category: AlgorithmCategory::Pattern, description: "Modulates luminance into vertical optical bar gratings." },
    AlgorithmDescriptor { id: "crosshatch", name: "Interlocking Crosshatch", category: AlgorithmCategory::Pattern, description: "Orthogonal intersecting lines simulating fine drafting etchings." },
    AlgorithmDescriptor { id: "diagonal_hatch", name: "Diagonal 45° Hatch", category: AlgorithmCategory::Pattern, description: "Dynamic angled strokes evoking comic book and manga inking." },
    AlgorithmDescriptor { id: "concentric_diamond", name: "Concentric Diamond Grid", category: AlgorithmCategory::Pattern, description: "Diamond-shaped contours radiating from periodic cell centers." },
    AlgorithmDescriptor { id: "woven_basket", name: "Woven Basket Tile", category: AlgorithmCategory::Pattern, description: "Alternating orthogonal weave evoking woven fiber textiles." },
    AlgorithmDescriptor { id: "hex_stipple", name: "Hexagonal Stochastic Stipple", category: AlgorithmCategory::Pattern, description: "Isotropic point lattice arranged at 60° equilateral intervals." },
    AlgorithmDescriptor { id: "brick_wall", name: "Staggered Brick Pattern", category: AlgorithmCategory::Pattern, description: "Running-bond masonry threshold screen." },
    AlgorithmDescriptor { id: "herringbone", name: "Herringbone Weave", category: AlgorithmCategory::Pattern, description: "V-shaped chevron parquet dither lattice." },
    AlgorithmDescriptor { id: "radial_concentric", name: "Radial Bullseye Rings", category: AlgorithmCategory::Pattern, description: "Concentric circular wave threshold screen." },
    AlgorithmDescriptor { id: "spiral_screen", name: "Archimedean Spiral Screen", category: AlgorithmCategory::Pattern, description: "Continuous spiral engraver dither pattern." },

    // --- 4. Glitch Effects (17 algorithms) ---
    AlgorithmDescriptor { id: "scanline_jitter", name: "Scanline Jitter", category: AlgorithmCategory::Glitch, description: "Replicates horizontal synchronization wobble on worn CRT displays." },
    AlgorithmDescriptor { id: "chromatic_offset", name: "Color Channel Offset", category: AlgorithmCategory::Glitch, description: "Spatial displacement of RGB color components creating 3D fringing." },
    AlgorithmDescriptor { id: "pixel_sorting", name: "Directional Pixel Sorting", category: AlgorithmCategory::Glitch, description: "Luminance-threshold sorting yielding liquid descending streaks." },
    AlgorithmDescriptor { id: "digital_artifacts", name: "Digital Compression Artifacts", category: AlgorithmCategory::Glitch, description: "Simulates DCT block-boundary errors and digital transmission loss." },
    AlgorithmDescriptor { id: "interlacing_tear", name: "Interlacing Field Tear", category: AlgorithmCategory::Glitch, description: "Splits alternating video fields with temporal motion disparity." },
    AlgorithmDescriptor { id: "crt_bloom", name: "CRT Phosphor Bloom", category: AlgorithmCategory::Glitch, description: "Diffuses electron gun saturation into neighboring triads." },
    AlgorithmDescriptor { id: "bit_crush", name: "Bit-Depth Crush Quantizer", category: AlgorithmCategory::Glitch, description: "Crushes dynamic range to harsh posterized quantization levels." },
    AlgorithmDescriptor { id: "vhs_tracking", name: "VHS Tracking Noise", category: AlgorithmCategory::Glitch, description: "Sweeping horizontal magnetic tape distortion and color burst snow." },
    AlgorithmDescriptor { id: "bad_ram", name: "Bad RAM Nibble Inversion", category: AlgorithmCategory::Glitch, description: "Simulates faulty video memory cells via stochastic bit flips." },
    AlgorithmDescriptor { id: "wave_distortion", name: "Sinusoidal Wave Warp", category: AlgorithmCategory::Glitch, description: "Harmonic phase modulation rippling across the raster frame." },
    AlgorithmDescriptor { id: "quant_slice", name: "Quantization Step Slicing", category: AlgorithmCategory::Glitch, description: "Displaces tonal contours into stepped topographic slices." },
    AlgorithmDescriptor { id: "matrix_rake", name: "Diagonal Matrix Rake", category: AlgorithmCategory::Glitch, description: "Cascades threshold sweeps diagonally across the pixel matrix." },
    AlgorithmDescriptor { id: "static_snow", name: "Analog Static Snow", category: AlgorithmCategory::Glitch, description: "Broadband RF white noise simulating disconnected antenna feeds." },
    AlgorithmDescriptor { id: "sync_pulse_loss", name: "Sync Pulse Hold Collapse", category: AlgorithmCategory::Glitch, description: "Vertical hold failure causing rolling frame tear artifacts." },
    AlgorithmDescriptor { id: "feedback_ringing", name: "Edge Ringing & Feedback", category: AlgorithmCategory::Glitch, description: "Recursive video loop feedback producing ghost contour echoes." },
    AlgorithmDescriptor { id: "chroma_subsample", name: "YUV 4:1:1 Degradation", category: AlgorithmCategory::Glitch, description: "Decimates color fidelity evoking low-bandwidth vintage video." },
    AlgorithmDescriptor { id: "moire_glitch", name: "Moiré Interference Glitch", category: AlgorithmCategory::Glitch, description: "Interferes dual spatial frequencies yielding optical moiré beat." },

    // --- 5. Special Effects (18 algorithms) ---
    AlgorithmDescriptor { id: "fixed_threshold", name: "Fixed Bi-Level Cutoff", category: AlgorithmCategory::Special, description: "High-contrast silhouette thresholding with adjustable pivot." },
    AlgorithmDescriptor { id: "thresholder", name: "Harmonic Wave Thresholder", category: AlgorithmCategory::Special, description: "Fourier harmonic sine-modulated threshold screen." },
    AlgorithmDescriptor { id: "random_threshold", name: "Uniform White Noise Dither", category: AlgorithmCategory::Special, description: "Stochastic uniform noise comparison eliminating periodic patterns." },
    AlgorithmDescriptor { id: "blue_noise", name: "Void-and-Cluster Blue Noise", category: AlgorithmCategory::Special, description: "High-frequency dispersed noise providing smooth photographic stippling." },
    AlgorithmDescriptor { id: "gaussian_noise", name: "Gaussian Normal Distribution", category: AlgorithmCategory::Special, description: "Bell-curve noise threshold simulating high-ISO film emulsion grain." },
    AlgorithmDescriptor { id: "perlin_gradient", name: "Perlin Gradient Lattice", category: AlgorithmCategory::Special, description: "Procedural harmonic gradients forming smoky marbled dither forms." },
    AlgorithmDescriptor { id: "riemersma", name: "Riemersma Hilbert Space-Curve", category: AlgorithmCategory::Special, description: "Fractal Hilbert curve traversal with exponential decay memory." },
    AlgorithmDescriptor { id: "tpdf_noise", name: "Triangular PDF Noise (TPDF)", category: AlgorithmCategory::Special, description: "Dual uniform noise summation eliminating harmonic noise modulation." },
    AlgorithmDescriptor { id: "companding_curve", name: "Dynamic Companding (A-Law)", category: AlgorithmCategory::Special, description: "Logarithmic compression accentuating subtle shadow details." },
    AlgorithmDescriptor { id: "spatial_lattice", name: "Hexagonal Spatial Lattice", category: AlgorithmCategory::Special, description: "Equidistant honeycomb coordinate diffusion mapping." },
    AlgorithmDescriptor { id: "sobel_feature", name: "Sobel Silhouette Preserving", category: AlgorithmCategory::Special, description: "Dampens dither noise along detected high-frequency edges." },
    AlgorithmDescriptor { id: "laplacian_mod", name: "Laplacian Frequency Modulated", category: AlgorithmCategory::Special, description: "Second-derivative edge sharpening integrated into quantization." },
    AlgorithmDescriptor { id: "directional_gradient", name: "Directional Gradient Angle", category: AlgorithmCategory::Special, description: "Aligns dither hatch lines with local optical flow vectors." },
    AlgorithmDescriptor { id: "voronoi_cellular", name: "Voronoi Cellular Stipple", category: AlgorithmCategory::Special, description: "Emulates relaxed stipple point distribution via cellular distance." },
    AlgorithmDescriptor { id: "diffusion_blur", name: "Unsharp Diffusion Quantizer", category: AlgorithmCategory::Special, description: "Fuses unsharp masking with local spatial error dispersion." },
    AlgorithmDescriptor { id: "quantum_stipple", name: "Quantum Probability Cloud", category: AlgorithmCategory::Special, description: "Sub-pixel photon wave arrival simulation for organic stippling." },
    AlgorithmDescriptor { id: "interleaved_gradient_noise", name: "Jimenez Interleaved Gradient (IGN)", category: AlgorithmCategory::Special, description: "Real-time shader-grade low-discrepancy spatial noise." },
    AlgorithmDescriptor { id: "roberts_quasirandom", name: "Roberts R2 Quasirandom", category: AlgorithmCategory::Special, description: "Plastic-constant golden-ratio 2D low-discrepancy sequence." },

    // --- 6. Bespoke Effects (2 algorithms) ---
    AlgorithmDescriptor { id: "ignition_glow", name: "Ignition Glow (Bespoke Dither Bloom)", category: AlgorithmCategory::Bespoke, description: "Original bespoke bloom analyzing dither dot density and edge contrast." },
    AlgorithmDescriptor { id: "cyber_matrix", name: "Cyber Matrix Rain Dither", category: AlgorithmCategory::Bespoke, description: "Vertical digital cascade modulated by local pixel luminance." },

    // --- 7. Temporal Effect (1 algorithm) ---
    AlgorithmDescriptor { id: "temporal_kinetic", name: "Temporal Kinetic Dither", category: AlgorithmCategory::Temporal, description: "Continuous temporal phase-shifted dithering for animated media." },
];

fn is_grid_scaled_algorithm(id: &str) -> bool {
    matches!(
        id,
        "floyd_steinberg"
            | "floyd"
            | "atkinson"
            | "burkes"
            | "sierra"
            | "sierra_3"
            | "two_row_sierra"
            | "sierra_2"
            | "sierra_lite"
            | "stucki"
            | "jarvis_judice_ninke"
            | "jjn"
            | "stevenson_arce"
            | "fan"
            | "shiau_fan"
            | "shiau_fan_2"
            | "false_floyd_steinberg"
            | "minimized_avg_error"
            | "oatley"
            | "dynamic_serpentine"
            | "artifact_modulation"
            | "gaussian"
            | "ostromukhov"
            | "ostromoukhov"
            | "cracked_diffuse"
            | "fractal_diffuse"
            | "vortex_diffusion"
            | "pigeon_diffusion"
            | "pigeon"
            | "orb_diffuse"
            | "orb_diffuse_x"
            | "orb_diffuse_y"
            | "atkinson_line_modulation"
            | "atkinson_vhs"
            | "contrast_aware_x"
            | "contrast_aware_y"
            | "modulated_diffuse_x"
            | "modulated_diffuse_y"
            | "smooth_diffuse"
            | "stucki_diffusion_lines"
            | "uniform_modulation_x"
            | "uniform_modulation_y"
            | "wave_modulation_x"
            | "wave_modulation_y"
    )
}

fn run_1d_horizontal_diffusion<F>(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
    get_modulation: F,
    diff_mult: f32,
) where
    F: Fn(usize, usize, f32) -> f32,
{
    let w = width as usize;
    let h = height as usize;
    let scale = params.scale.max(0.05);
    let line_scale = (params.line_scale.unwrap_or(1.0) * scale).max(1.0);
    let bleed = params.bleed.unwrap_or(0.0).clamp(0.0, 1.0);
    let smoothing = params.smoothing.unwrap_or(0.0).max(0.0);
    let alpha = if smoothing == 0.0 { 1.0 } else { 1.0 / (1.0 + smoothing * 1.2) };
    let noise = params.noisy_lines.unwrap_or(false);
    let base_weight = if noise { 0.95 } else { 0.45 };
    let max_err = 128.0f32;

    if lut.is_tonal_ramp {
        let n = lut.palette_size;
        let mut next_scanline_err = vec![0.0f32; w];
        for y in 0..h {
            let mut scan_err = 0.0f32;
            let mut ema_mod = 0.0f32;
            let mut ema_lum = 0.0f32;
            let sy = (y as f32 / line_scale).floor() as usize;

            for x in 0..w {
                let idx = (y * w + x) * 4;
                let raw_lum = crate::palette::get_luminance(input[idx] as f32, input[idx + 1] as f32, input[idx + 2] as f32);
                ema_lum = if x == 0 || smoothing == 0.0 { raw_lum } else { ema_lum * (1.0 - alpha) + raw_lum * alpha };
                let in_err = scan_err + next_scanline_err[x];
                next_scanline_err[x] = 0.0;
                let cur_lum = (ema_lum + in_err).clamp(0.0, 255.0);

                let noise_offset = if noise {
                    let pseudo = (x as f32 * 12.9898 + y as f32 * 78.233).sin() * 43758.5453;
                    (pseudo - pseudo.floor() - 0.5) * 32.0
                } else {
                    0.0
                };

                let mod_val = get_modulation(x, sy, cur_lum);
                ema_mod = if x == 0 && smoothing > 0.0 { mod_val } else { ema_mod * (1.0 - alpha) + mod_val * alpha };

                let eff_lum = (cur_lum + ema_mod * 32.0 + noise_offset).clamp(0.0, 255.0);
                let t = (eff_lum / 255.0) * (n - 1) as f32;
                let chosen_idx = (t.round() as usize).min(n - 1);

                let col = lut.raw_palette[chosen_idx];
                out[idx] = col[0];
                out[idx + 1] = col[1];
                out[idx + 2] = col[2];
                out[idx + 3] = input[idx + 3];

                let diff = eff_lum - lut.luminances[chosen_idx];
                let err = (diff * diff_mult * base_weight).clamp(-max_err, max_err);
                scan_err = err * (1.0 - bleed);
                next_scanline_err[x] = err * bleed;
            }
        }
    } else {
        let mut next_scanline_err = vec![[0.0f32; 3]; w];

        for y in 0..h {
            let mut scan_err = [0.0f32; 3];
            let mut ema_rgb = [0.0f32; 3];
            let mut ema_mod = 0.0f32;
            let sy = (y as f32 / line_scale).floor() as usize;

            for x in 0..w {
                let idx = (y * w + x) * 4;
                let in_r = input[idx] as f32;
                let in_g = input[idx + 1] as f32;
                let in_b = input[idx + 2] as f32;

                if x == 0 || smoothing == 0.0 {
                    ema_rgb = [in_r, in_g, in_b];
                } else {
                    ema_rgb[0] = ema_rgb[0] * (1.0 - alpha) + in_r * alpha;
                    ema_rgb[1] = ema_rgb[1] * (1.0 - alpha) + in_g * alpha;
                    ema_rgb[2] = ema_rgb[2] * (1.0 - alpha) + in_b * alpha;
                }

                let prelim_r = (ema_rgb[0] + scan_err[0] + next_scanline_err[x][0]).clamp(0.0, 255.0);
                let prelim_g = (ema_rgb[1] + scan_err[1] + next_scanline_err[x][1]).clamp(0.0, 255.0);
                let prelim_b = (ema_rgb[2] + scan_err[2] + next_scanline_err[x][2]).clamp(0.0, 255.0);
                next_scanline_err[x] = [0.0, 0.0, 0.0];

                let cur_lum = crate::palette::get_luminance(prelim_r, prelim_g, prelim_b);
                let mod_val = get_modulation(x, sy, cur_lum);

                if x == 0 && smoothing > 0.0 {
                    ema_mod = mod_val;
                } else {
                    ema_mod = ema_mod * (1.0 - alpha) + mod_val * alpha;
                }

                let noise_offset = if noise {
                    let pseudo = (x as f32 * 12.9898 + y as f32 * 78.233).sin() * 43758.5453;
                    (pseudo - pseudo.floor() - 0.5) * 32.0
                } else {
                    0.0
                };

                let bias = ema_mod * 32.0 + noise_offset;
                let cur_r = (prelim_r + bias).clamp(0.0, 255.0);
                let cur_g = (prelim_g + bias).clamp(0.0, 255.0);
                let cur_b = (prelim_b + bias).clamp(0.0, 255.0);

                let chosen = lut.inline_match(cur_r, cur_g, cur_b);
                out[idx] = chosen[0];
                out[idx + 1] = chosen[1];
                out[idx + 2] = chosen[2];
                out[idx + 3] = input[idx + 3];

                let diff_r = cur_r - chosen[0] as f32;
                let diff_g = cur_g - chosen[1] as f32;
                let diff_b = cur_b - chosen[2] as f32;

                let err_r = (diff_r * diff_mult * base_weight).clamp(-max_err, max_err);
                let err_g = (diff_g * diff_mult * base_weight).clamp(-max_err, max_err);
                let err_b = (diff_b * diff_mult * base_weight).clamp(-max_err, max_err);

                scan_err[0] = err_r * (1.0 - bleed);
                scan_err[1] = err_g * (1.0 - bleed);
                scan_err[2] = err_b * (1.0 - bleed);

                next_scanline_err[x][0] = err_r * bleed;
                next_scanline_err[x][1] = err_g * bleed;
                next_scanline_err[x][2] = err_b * bleed;
            }
        }
    }
}

fn run_1d_vertical_diffusion<F>(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
    get_modulation: F,
    diff_mult: f32,
) where
    F: Fn(usize, usize, f32) -> f32,
{
    let w = width as usize;
    let h = height as usize;
    let scale = params.scale.max(0.05);
    let line_scale = (params.line_scale.unwrap_or(1.0) * scale).max(1.0);
    let bleed = params.bleed.unwrap_or(0.0).clamp(0.0, 1.0);
    let smoothing = params.smoothing.unwrap_or(0.0).max(0.0);
    let alpha = if smoothing == 0.0 { 1.0 } else { 1.0 / (1.0 + smoothing * 1.2) };
    let noise = params.noisy_lines.unwrap_or(false);
    let base_weight = if noise { 0.95 } else { 0.45 };
    let max_err = 128.0f32;

    if lut.is_tonal_ramp {
        let n = lut.palette_size;
        let mut next_scanline_err = vec![0.0f32; h];
        for x in 0..w {
            let mut scan_err = 0.0f32;
            let mut ema_mod = 0.0f32;
            let mut ema_lum = 0.0f32;
            let sx = (x as f32 / line_scale).floor() as usize;

            for y in 0..h {
                let idx = (y * w + x) * 4;
                let raw_lum = crate::palette::get_luminance(input[idx] as f32, input[idx + 1] as f32, input[idx + 2] as f32);
                ema_lum = if y == 0 || smoothing == 0.0 { raw_lum } else { ema_lum * (1.0 - alpha) + raw_lum * alpha };
                let in_err = scan_err + next_scanline_err[y];
                next_scanline_err[y] = 0.0;
                let cur_lum = (ema_lum + in_err).clamp(0.0, 255.0);

                let noise_offset = if noise {
                    let pseudo = (x as f32 * 12.9898 + y as f32 * 78.233).sin() * 43758.5453;
                    (pseudo - pseudo.floor() - 0.5) * 32.0
                } else {
                    0.0
                };

                let mod_val = get_modulation(sx, y, cur_lum);
                ema_mod = if y == 0 && smoothing > 0.0 { mod_val } else { ema_mod * (1.0 - alpha) + mod_val * alpha };

                let eff_lum = (cur_lum + ema_mod * 32.0 + noise_offset).clamp(0.0, 255.0);
                let t = (eff_lum / 255.0) * (n - 1) as f32;
                let chosen_idx = (t.round() as usize).min(n - 1);

                let col = lut.raw_palette[chosen_idx];
                out[idx] = col[0];
                out[idx + 1] = col[1];
                out[idx + 2] = col[2];
                out[idx + 3] = input[idx + 3];

                let diff = eff_lum - lut.luminances[chosen_idx];
                let err = (diff * diff_mult * base_weight).clamp(-max_err, max_err);
                scan_err = err * (1.0 - bleed);
                next_scanline_err[y] = err * bleed;
            }
        }
    } else {
        let mut next_scanline_err = vec![[0.0f32; 3]; h];

        for x in 0..w {
            let mut scan_err = [0.0f32; 3];
            let mut ema_rgb = [0.0f32; 3];
            let mut ema_mod = 0.0f32;
            let sx = (x as f32 / line_scale).floor() as usize;

            for y in 0..h {
                let idx = (y * w + x) * 4;
                let in_r = input[idx] as f32;
                let in_g = input[idx + 1] as f32;
                let in_b = input[idx + 2] as f32;

                if y == 0 || smoothing == 0.0 {
                    ema_rgb = [in_r, in_g, in_b];
                } else {
                    ema_rgb[0] = ema_rgb[0] * (1.0 - alpha) + in_r * alpha;
                    ema_rgb[1] = ema_rgb[1] * (1.0 - alpha) + in_g * alpha;
                    ema_rgb[2] = ema_rgb[2] * (1.0 - alpha) + in_b * alpha;
                }

                let prelim_r = (ema_rgb[0] + scan_err[0] + next_scanline_err[y][0]).clamp(0.0, 255.0);
                let prelim_g = (ema_rgb[1] + scan_err[1] + next_scanline_err[y][1]).clamp(0.0, 255.0);
                let prelim_b = (ema_rgb[2] + scan_err[2] + next_scanline_err[y][2]).clamp(0.0, 255.0);
                next_scanline_err[y] = [0.0, 0.0, 0.0];

                let cur_lum = crate::palette::get_luminance(prelim_r, prelim_g, prelim_b);
                let mod_val = get_modulation(sx, y, cur_lum);

                if y == 0 && smoothing > 0.0 {
                    ema_mod = mod_val;
                } else {
                    ema_mod = ema_mod * (1.0 - alpha) + mod_val * alpha;
                }

                let noise_offset = if noise {
                    let pseudo = (x as f32 * 12.9898 + y as f32 * 78.233).sin() * 43758.5453;
                    (pseudo - pseudo.floor() - 0.5) * 32.0
                } else {
                    0.0
                };

                let bias = ema_mod * 32.0 + noise_offset;
                let cur_r = (prelim_r + bias).clamp(0.0, 255.0);
                let cur_g = (prelim_g + bias).clamp(0.0, 255.0);
                let cur_b = (prelim_b + bias).clamp(0.0, 255.0);

                let chosen = lut.inline_match(cur_r, cur_g, cur_b);
                out[idx] = chosen[0];
                out[idx + 1] = chosen[1];
                out[idx + 2] = chosen[2];
                out[idx + 3] = input[idx + 3];

                let diff_r = cur_r - chosen[0] as f32;
                let diff_g = cur_g - chosen[1] as f32;
                let diff_b = cur_b - chosen[2] as f32;

                let err_r = (diff_r * diff_mult * base_weight).clamp(-max_err, max_err);
                let err_g = (diff_g * diff_mult * base_weight).clamp(-max_err, max_err);
                let err_b = (diff_b * diff_mult * base_weight).clamp(-max_err, max_err);

                scan_err[0] = err_r * (1.0 - bleed);
                scan_err[1] = err_g * (1.0 - bleed);
                scan_err[2] = err_b * (1.0 - bleed);

                next_scanline_err[y][0] = err_r * bleed;
                next_scanline_err[y][1] = err_g * bleed;
                next_scanline_err[y][2] = err_b * bleed;
            }
        }
    }
}

fn dither_artifact_modulation_glitch(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let s = params.scale.max(0.05);
    let line_scale = params.line_scale.unwrap_or(5.0).max(1.0);
    let band_height = line_scale.round().max(1.0) as usize;
    let shift = line_scale * 3.5;
    let line_density = (s * 0.18).clamp(0.04, 0.85);
    let bayer = [0.5 / 4.0, 2.5 / 4.0, 3.5 / 4.0, 1.5 / 4.0];

    for y in 0..h {
        let band_idx = y / band_height;
        let hash = ((band_idx as f32 * 78.233 + 19.19).sin().abs() * 43758.5453).fract();
        let is_glitch_row = hash < line_density;
        let row_offset = if is_glitch_row {
            ((band_idx as f32 * 12.9898).sin() * shift).round() as i32
        } else {
            0
        };

        for x in 0..w {
            let idx = (y * w + x) * 4;
            let sx = (x as i32 + row_offset).clamp(0, w as i32 - 1) as usize;
            let s_idx = (y * w + sx) * 4;

            let b_val = bayer[(y & 1) * 2 + (x & 1)];
            let threshold = if is_glitch_row {
                if b_val > 0.5 { 0.3 } else { 0.7 }
            } else {
                b_val
            };

            let chosen = lut.inline_pair_match(
                input[s_idx] as f32,
                input[s_idx + 1] as f32,
                input[s_idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

fn dither_glitch(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let s = params.scale.max(0.05);
    let line_scale = params.line_scale.unwrap_or(4.0).max(1.0);
    let glitch_intensity = params.glitch_intensity.unwrap_or(10.0).clamp(0.0, 35.0);
    let block_size = (line_scale * 2.0).round().max(2.0) as usize;
    let target_ratio = glitch_intensity / 35.0;
    let bayer = [0.5 / 4.0, 2.5 / 4.0, 3.5 / 4.0, 1.5 / 4.0];

    for by in (0..h).step_by(block_size) {
        let band_idx = by / block_size;
        let band_hash = ((band_idx as f32 * 43.123 + 7.89).sin().abs() * 43758.5453).fract();
        let is_glitch_block = glitch_intensity > 0.0 && band_hash < target_ratio;
        let x_off = if is_glitch_block {
            ((band_idx as f32 * 12.345).sin() * 4.0 * line_scale).round() as i32
        } else {
            0
        };
        let max_by = (by + block_size).min(h);

        for bx in (0..w).step_by(block_size) {
            let max_bx = (bx + block_size).min(w);
            for y in by..max_by {
                let sy = (y as f32 / s).floor() as usize;
                for x in bx..max_bx {
                    let sx = (x as i32 + x_off).clamp(0, w as i32 - 1) as usize;
                    let idx = (y * w + x) * 4;
                    let s_idx = (y * w + sx) * 4;

                    let sx_coord = (x as f32 / s).floor() as usize;
                    let thresh = bayer[(sy & 1) * 2 + (sx_coord & 1)];
                    let chosen = lut.inline_pair_match(
                        input[s_idx] as f32,
                        input[s_idx + 1] as f32,
                        input[s_idx + 2] as f32,
                        thresh,
                    );
                    out[idx] = chosen[0];
                    out[idx + 1] = chosen[1];
                    out[idx + 2] = chosen[2];
                    out[idx + 3] = input[idx + 3];
                }
            }
        }
    }
}

pub fn dither_raw_pattern(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    pattern_id: &str,
    scale: f32,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let _h = height as usize;
    let sc = scale.max(0.25);
    let cx = w as f32 * 0.5;
    let cy = height as f32 * 0.5;
    let row_len = w * 4;

    out.par_chunks_exact_mut(row_len)
        .enumerate()
        .for_each(|(y, out_row)| {
            let sy = (y as f32 / sc).floor() as i32;
            let in_row = &input[y * row_len..(y + 1) * row_len];
            for x in 0..w {
                let sx = (x as f32 / sc).floor() as i32;
                let idx = x * 4;

                let pat_val: f32 = match pattern_id {
                "checkered" | "checkers" => {
                    let c_size = params.checkers_size.unwrap_or(8.0).max(1.0);
                    let csx = (sx as f32 / c_size).floor() as i32;
                    let csy = (sy as f32 / c_size).floor() as i32;
                    let is_alt = (csx + csy).rem_euclid(2) == 1;
                    if is_alt { 0.35 } else { 0.65 }
                }
                "horizontal_lines" => {
                    let dens = params.line_density.unwrap_or(4.0).max(1.0) as i32;
                    ((sy.rem_euclid(dens)) as f32 + 0.5) / (dens as f32)
                }
                "vertical_lines" => {
                    let dens = params.line_density.unwrap_or(4.0).max(1.0) as i32;
                    ((sx.rem_euclid(dens)) as f32 + 0.5) / (dens as f32)
                }
                "dotted_lines" => {
                    let dens = params.line_density.unwrap_or(3.0).max(1.0) as i32;
                    let dot = params.dotting.unwrap_or(2.0).max(1.0) as i32;
                    if sy.rem_euclid(dens) == 0 && sx.rem_euclid(dot) == 0 { 0.85 } else { 0.2 }
                }
                "crosshatch" => {
                    let spacing = params.line_spacing.unwrap_or(4.0).max(1.0) as i32;
                    let gx = sx.rem_euclid(spacing);
                    let gy = sy.rem_euclid(spacing);
                    if gx == 0 && gy == 0 { 0.9 } else if gx == 0 || gy == 0 { 0.6 } else { 0.2 }
                }
                "diagonal_hatch" | "diagonal" => {
                    let sens = params.edge_sensitivity.unwrap_or(6.0).max(1.0) as i32;
                    (((sx + sy).rem_euclid(sens)) as f32 + 0.5) / (sens as f32)
                }
                "concentric_diamond" | "diamond" | "diamond_grid" => {
                    let period = params.period.unwrap_or(8.0).max(2.0) as i32;
                    let half = period / 2;
                    let dx = (sx.rem_euclid(period) - half).abs();
                    let dy = (sy.rem_euclid(period) - half).abs();
                    ((dx + dy) as f32 / period as f32).clamp(0.05, 0.95)
                }
                "woven_basket" => {
                    let bx = (sx.div_euclid(4)).rem_euclid(2);
                    let by = (sy.div_euclid(4)).rem_euclid(2);
                    if (bx ^ by) == 0 {
                        if sy.rem_euclid(2) == 0 { 0.75 } else { 0.25 }
                    } else if sx.rem_euclid(2) == 0 {
                        0.75
                    } else {
                        0.25
                    }
                }
                "hex_stipple" | "spatial_lattice" | "beehive" => {
                    let cell = params.cell_size.unwrap_or(6.0).max(2.0) as i32;
                    let half = (cell / 2).max(1);
                    let row = sy.div_euclid(half);
                    let col_shift = if row.rem_euclid(2) == 0 { 0 } else { half };
                    let hx = (sx + col_shift).rem_euclid(cell) - half;
                    let hy = sy.rem_euclid(cell) - half;
                    (((hx * hx + hy * hy) as f32).sqrt() / (cell as f32 * 0.7)).clamp(0.05, 0.95)
                }
                "brick_wall" | "gridlock_traffic" => {
                    let row = sy.div_euclid(4);
                    let offset = if row.rem_euclid(2) == 0 { 0 } else { 4 };
                    if sy.rem_euclid(4) == 0 || (sx + offset).rem_euclid(8) == 0 { 0.85 } else { 0.25 }
                }
                "herringbone" => {
                    let v = (sx + if (sx.div_euclid(4) & 1) == 0 { sy } else { -sy }).rem_euclid(4);
                    (v as f32 + 0.5) / 4.0
                }
                "radial_concentric" => {
                    let l_scale = params.line_scale.unwrap_or(1.0).max(0.5);
                    let dist = ((x as f32 - cx).hypot(y as f32 - cy)) / (sc * l_scale);
                    ((dist * 0.5).sin() * 0.5 + 0.5).clamp(0.05, 0.95)
                }
                "radial_burst" | "radial_peaks" => {
                    let div = params.divisor.unwrap_or(5.0).max(1.0);
                    let dx = x as f32 - cx;
                    let dy = y as f32 - cy;
                    let angle = dy.atan2(dx);
                    let dist = dx.hypot(dy) / sc;
                    (((angle * (div * 2.4)).cos() * 0.5 + (dist * (0.05 * div)).sin() * 0.5) * 0.5 + 0.5).clamp(0.05, 0.95)
                }
                "spiral_screen" | "vortex" => {
                    let swirl = params.swirl.unwrap_or(5.0).max(0.1);
                    let dx = (x as f32 - cx) / sc;
                    let dy = (y as f32 - cy) / sc;
                    let r = dx.hypot(dy);
                    let a = dy.atan2(dx);
                    (((r * 0.07 * swirl + a * (swirl * 0.4)).sin()) * 0.5 + 0.5).clamp(0.05, 0.95)
                }
                "circle_grid" | "pop_tone" | "print_pattern" => {
                    let dens = params.density.or(params.dot_scale).unwrap_or(8.0).max(2.0);
                    let half = dens * 0.5;
                    let l_scale = params.line_scale.unwrap_or(1.0).max(0.5);
                    let eff_half = half * l_scale;
                    let gx = (sx as f32).rem_euclid(dens) - half;
                    let gy = (sy as f32).rem_euclid(dens) - half;
                    (gx.hypot(gy) / (eff_half * 1.25)).clamp(0.05, 0.95)
                }
                "heart_grid" => {
                    let gx = ((sx.rem_euclid(8) as f32) - 3.5) / 3.5;
                    let gy = ((3.5 - (sy.rem_euclid(8) as f32)) / 3.5) - 0.2;
                    let a = gx * gx + gy * gy - 0.35;
                    let heart = a * a * a - gx * gx * gy * gy * gy;
                    if heart <= 0.0 { 0.25 } else { 0.8 }
                }
                "block_tone" | "square_mosaic" => {
                    let bsz = params.block_size.or(params.dot_size).unwrap_or(8.0).max(2.0);
                    let half = bsz * 0.5;
                    let gx = ((sx as f32).rem_euclid(bsz) - half).abs().max(((sy as f32).rem_euclid(bsz) - half).abs());
                    (gx / half).clamp(0.1, 0.9)
                }
                "camo" | "topography" | "displace_contour" => {
                    let warp = params.warp_intensity.unwrap_or(1.0).max(0.1);
                    let v = ((sx as f32 * 0.17 * warp).sin() + (sy as f32 * 0.23 * warp).cos() + ((sx + sy) as f32 * 0.11 * warp).sin()) / 3.0;
                    (v * 0.5 + 0.5).clamp(0.05, 0.95)
                }
                "sine_distort" => {
                    let fa = params.freq_a.unwrap_or(8.0) * 0.05;
                    let fb = params.freq_b.unwrap_or(12.0) * 0.05;
                    let ang = params.angle.unwrap_or(45.0).to_radians();
                    let rot_x = sx as f32 * ang.cos() - sy as f32 * ang.sin();
                    let rot_y = sx as f32 * ang.sin() + sy as f32 * ang.cos();
                    let wv = ((rot_x * fa).sin() + (rot_y * fb).sin()) * 0.5;
                    (wv * 0.5 + 0.5).clamp(0.05, 0.95)
                }
                "sine_wave_modulation" => {
                    let wfreq = params.wave_frequency.unwrap_or(5.0) * 0.06;
                    let wthresh = params.wave_threshold.unwrap_or(10.0) * 0.05;
                    let wv = ((sx as f32 * wfreq) + (sy as f32 * wthresh).sin() * 2.0).sin();
                    (wv * 0.5 + 0.5).clamp(0.05, 0.95)
                }
                "wave" => {
                    let freq = params.frequency.or(params.wave_density).unwrap_or(5.0) * 0.06;
                    let wv = ((sx as f32 * freq) + (sy as f32 * 0.2).sin() * 3.0).sin();
                    (wv * 0.5 + 0.5).clamp(0.05, 0.95)
                }
                "stippling" | "noise" | "interleaved_gradient_noise" => {
                    let dens = params.dot_density.unwrap_or(5.0).max(1.0);
                    let factor = 52.9829189 * (dens / 5.0);
                    ((factor * (0.06711056 * sx as f32 + 0.00583715 * sy as f32).fract()).fract() + 1.0).fract()
                }
                "roberts_quasirandom" => {
                    const G: f32 = 1.324717957244746;
                    const A1: f32 = 1.0 / G;
                    const A2: f32 = 1.0 / (G * G);
                    (0.5 + A1 * sx as f32 + A2 * sy as f32).fract()
                }
                "cyber_matrix" => {
                    let col_hash = ((sx.wrapping_mul(73) ^ 19).rem_euclid(16)) as f32 / 16.0;
                    let drop = (sy as f32 * 0.15 + col_hash * 6.28).sin() * 0.5 + 0.5;
                    if sx.rem_euclid(3) == 0 { drop } else { 0.92 }
                }
                _ => 0.5,
            };

            let chosen = lut.inline_pair_match(
                in_row[idx] as f32,
                in_row[idx + 1] as f32,
                in_row[idx + 2] as f32,
                pat_val,
            );
            out_row[idx] = chosen[0];
            out_row[idx + 1] = chosen[1];
            out_row[idx + 2] = chosen[2];
            out_row[idx + 3] = in_row[idx + 3];
        }
    });
}

// -------------------------------------------------------------
// BASIC: COLOR SEPARATION
// -------------------------------------------------------------
pub fn dither_color_separation(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = params.scale;
    let offset = ((scale * 3.0).floor() as isize).max(1);

    let mut shifted = vec![0u8; input.len()];
    for y in 0..h {
        let row_offset = y * w * 4;
        for x in 0..w {
            let rx = (x as isize + offset).min(w as isize - 1).max(0) as usize;
            let bx = (x as isize - offset).max(0) as usize;
            let idx = row_offset + x * 4;
            shifted[idx] = input[row_offset + rx * 4];
            shifted[idx + 1] = input[idx + 1];
            shifted[idx + 2] = input[row_offset + bx * 4 + 2];
            shifted[idx + 3] = input[idx + 3];
        }
    }

    let mut err_ring = vec![0.0f32; 2 * w * 3];
    let max_err = 128.0f32;

    for y in 0..h {
        let cur_row = (y & 1) * w * 3;
        let next_row = ((y + 1) & 1) * w * 3;
        for x in 0..w {
            let idx = (y * w + x) * 4;
            let e_idx = cur_row + x * 3;

            let tr = (shifted[idx] as f32 + err_ring[e_idx]).clamp(0.0, 255.0);
            let tg = (shifted[idx + 1] as f32 + err_ring[e_idx + 1]).clamp(0.0, 255.0);
            let tb = (shifted[idx + 2] as f32 + err_ring[e_idx + 2]).clamp(0.0, 255.0);

            let chosen = lut.inline_match(tr.round(), tg.round(), tb.round());
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];

            let err_r = (tr - chosen[0] as f32).clamp(-max_err, max_err);
            let err_g = (tg - chosen[1] as f32).clamp(-max_err, max_err);
            let err_b = (tb - chosen[2] as f32).clamp(-max_err, max_err);

            if x + 1 < w {
                err_ring[cur_row + (x + 1) * 3] += err_r * (7.0 / 16.0);
                err_ring[cur_row + (x + 1) * 3 + 1] += err_g * (7.0 / 16.0);
                err_ring[cur_row + (x + 1) * 3 + 2] += err_b * (7.0 / 16.0);
            }
            if y + 1 < h {
                if x > 0 {
                    err_ring[next_row + (x - 1) * 3] += err_r * (3.0 / 16.0);
                    err_ring[next_row + (x - 1) * 3 + 1] += err_g * (3.0 / 16.0);
                    err_ring[next_row + (x - 1) * 3 + 2] += err_b * (3.0 / 16.0);
                }
                err_ring[next_row + x * 3] += err_r * (5.0 / 16.0);
                err_ring[next_row + x * 3 + 1] += err_g * (5.0 / 16.0);
                err_ring[next_row + x * 3 + 2] += err_b * (5.0 / 16.0);
                if x + 1 < w {
                    err_ring[next_row + (x + 1) * 3] += err_r * (1.0 / 16.0);
                    err_ring[next_row + (x + 1) * 3 + 1] += err_g * (1.0 / 16.0);
                    err_ring[next_row + (x + 1) * 3 + 2] += err_b * (1.0 / 16.0);
                }
            }
        }
        for i in 0..(w * 3) {
            err_ring[cur_row + i] = 0.0;
        }
    }
}

// -------------------------------------------------------------
// SPECIAL: ORB ALGORITHMS (detectOrbs, orb-diffuse, orb-diffuse-x, orb-diffuse-y, orb-matrix)
// -------------------------------------------------------------
#[inline(always)]
fn hash_2d(seed_x: f64, seed_y: f64, salt: f64) -> f64 {
    let val = (seed_x * 12.9898 + seed_y * 78.233 + salt * 43.123).sin() * 43758.5453;
    val - val.floor()
}

#[inline(always)]
fn hash_coord(x: usize, y: usize, seed: u32) -> u32 {
    let mut h = (x as u32).wrapping_mul(374761393)
        .wrapping_add((y as u32).wrapping_mul(668265263))
        .wrapping_add(seed.wrapping_mul(362827313));
    h = (h ^ (h >> 13)).wrapping_mul(1274126177);
    h ^ (h >> 16)
}

#[derive(Clone, Debug)]
pub struct DetectedOrb {
    pub x: f64,
    pub y: f64,
    pub size: f64,
    pub size2: f64,
    pub intensity: f64,
}

pub fn detect_orbs(
    w: u32,
    h: u32,
    _data: &[u8],
    params: &RawAlgorithmParams,
) -> Vec<DetectedOrb> {
    let max_orbs = params.orb_count.map(|c| (c.round() as usize).clamp(1, 50)).unwrap_or(8);
    let raw_size = params.orb_size.unwrap_or(80.0) as f64;
    let scale = (params.scale as f64).max(0.05);
    let base_size = (raw_size * scale).round().max(5.0);
    let base_size2 = base_size * base_size;
    let intensity = params.orb_intensity.map(|i| (i as f64) / 100.0).unwrap_or(0.6);
    let random_amt = params.orb_random.map(|r| (r as f64) / 100.0).unwrap_or(0.0);
    let legacy_offset = params.orb_offset.unwrap_or(0.0) as f64;
    let is_vertical = params.orb_vertical.unwrap_or(false);
    let offset_x = (params.offset_x.unwrap_or(0.0) as f64) + if is_vertical { 0.0 } else { legacy_offset };
    let offset_y = (params.offset_y.unwrap_or(0.0) as f64) + if is_vertical { legacy_offset } else { 0.0 };
    let seed = params.temporal_seed;

    let wf = w as f64;
    let hf = h as f64;
    let max_fit_spacing = ((wf * hf) / (max_orbs as f64 * 1.3)).sqrt();
    let min_spacing = 8.0f64.max(max_fit_spacing * 0.75);

    let min_dim = (w.min(h)) as f64;
    let step_denom = 12.0f64.max(((max_orbs as f64).sqrt() * 3.0).round());
    let step = 8usize.max(32usize.min((min_dim / step_denom).floor() as usize));

    struct Candidate {
        x: usize,
        y: usize,
        rank: u32,
    }

    let mut candidates = Vec::new();
    let start_y = step / 2;
    let start_x = step / 2;
    let mut y = start_y;
    while y < h as usize {
        let mut x = start_x;
        while x < w as usize {
            let rank = hash_coord(x, y, seed);
            candidates.push(Candidate { x, y, rank });
            x += step;
        }
        y += step;
    }

    candidates.sort_by(|a, b| {
        if a.rank != b.rank {
            a.rank.cmp(&b.rank)
        } else {
            (a.y * w as usize + a.x).cmp(&(b.y * w as usize + b.x))
        }
    });

    let mut orbs: Vec<DetectedOrb> = Vec::with_capacity(max_orbs);
    let span_x = wf + base_size * 2.0;
    let span_y = hf + base_size * 2.0;

    let add_orb = |cx: f64, cy: f64, orbs: &mut Vec<DetectedOrb>| {
        let mut px = cx;
        let mut py = cy;
        if random_amt > 0.0 {
            let rx = (hash_2d(cx, cy, 1.0) - 0.5) * 2.0;
            let ry = (hash_2d(cx, cy, 2.0) - 0.5) * 2.0;
            let jitter_scale = (base_size * 1.5).max(max_fit_spacing * 1.8);
            px += rx * random_amt * jitter_scale;
            py += ry * random_amt * jitter_scale;
        }
        px += offset_x;
        py += offset_y;

        px = (px + base_size).rem_euclid(span_x) - base_size;
        py = (py + base_size).rem_euclid(span_y) - base_size;

        orbs.push(DetectedOrb {
            x: px,
            y: py,
            size: base_size,
            size2: base_size2,
            intensity,
        });
    };

    let mut spacing = min_spacing;
    for _pass in 0..3 {
        if orbs.len() >= max_orbs {
            break;
        }
        let spacing2 = spacing * spacing;
        for c in &candidates {
            if orbs.len() >= max_orbs {
                break;
            }
            let mut valid = true;
            for o in &orbs {
                let dx = c.x as f64 + offset_x - o.x;
                let dy = c.y as f64 + offset_y - o.y;
                if dx * dx + dy * dy < spacing2 {
                    valid = false;
                    break;
                }
            }
            if valid {
                add_orb(c.x as f64, c.y as f64, &mut orbs);
            }
        }
        spacing *= 0.65;
    }

    let mut spiral_idx = 0usize;
    let phi = 0.5 * (1.0 + 5.0f64.sqrt());
    while orbs.len() < max_orbs {
        let r = (((spiral_idx + 1) as f64 / max_orbs as f64).sqrt()) * min_dim * 0.45;
        let theta = 2.0 * std::f64::consts::PI * spiral_idx as f64 * phi;
        let cx = (wf * 0.5 + r * theta.cos()).clamp(0.0, wf);
        let cy = (hf * 0.5 + r * theta.sin()).clamp(0.0, hf);
        add_orb(cx, cy, &mut orbs);
        spiral_idx += 1;
    }

    orbs
}

pub fn dither_orb_diffuse(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let orbs = detect_orbs(width, height, input, params);
    let serpentine = params.serpentine.unwrap_or(true);
    let strength = params.diffusion_strength;

    if lut.is_tonal_ramp {
        let mut err_ring = vec![0.0f32; 2 * w];
        for y in 0..h {
            let is_reverse = serpentine && (y & 1) == 1;
            let cur_row = (y & 1) * w;
            let next_row = ((y + 1) & 1) * w;
            let (start_x, end_x, step_x): (isize, isize, isize) = if is_reverse {
                (w as isize - 1, -1, -1)
            } else {
                (0, w as isize, 1)
            };

            let mut x = start_x;
            while x != end_x {
                let ux = x as usize;
                let idx = (y * w + ux) * 4;
                let mut lum = crate::palette::get_luminance(
                    input[idx] as f32,
                    input[idx + 1] as f32,
                    input[idx + 2] as f32,
                );
                for o in &orbs {
                    let dx = ux as f64 - o.x;
                    let dy = y as f64 - o.y;
                    let d2 = dx * dx + dy * dy;
                    if d2 < o.size2 {
                        let d = d2.sqrt();
                        lum = (lum as f64 + (1.0 - d / o.size) * (180.0 * o.intensity)).min(255.0) as f32;
                    }
                }
                let cur_lum = (lum + err_ring[cur_row + ux]).clamp(0.0, 255.0);
                let chosen_idx = lut.quantize_lum(cur_lum);
                let col = lut.raw_palette[chosen_idx];

                out[idx] = col[0];
                out[idx + 1] = col[1];
                out[idx + 2] = col[2];
                out[idx + 3] = input[idx + 3];

                let err = (cur_lum - lut.luminances[chosen_idx]) * strength;
                if is_reverse {
                    if ux > 0 {
                        err_ring[cur_row + ux - 1] += err * (7.0 / 16.0);
                    }
                    if y + 1 < h {
                        if ux + 1 < w {
                            err_ring[next_row + ux + 1] += err * (3.0 / 16.0);
                        }
                        err_ring[next_row + ux] += err * (5.0 / 16.0);
                        if ux > 0 {
                            err_ring[next_row + ux - 1] += err * (1.0 / 16.0);
                        }
                    }
                } else {
                    if ux + 1 < w {
                        err_ring[cur_row + ux + 1] += err * (7.0 / 16.0);
                    }
                    if y + 1 < h {
                        if ux > 0 {
                            err_ring[next_row + ux - 1] += err * (3.0 / 16.0);
                        }
                        err_ring[next_row + ux] += err * (5.0 / 16.0);
                        if ux + 1 < w {
                            err_ring[next_row + ux + 1] += err * (1.0 / 16.0);
                        }
                    }
                }
                x += step_x;
            }
            for i in 0..w {
                err_ring[cur_row + i] = 0.0;
            }
        }
    } else {
        let mut err_ring = vec![0.0f32; 2 * w * 3];
        let max_err = 128.0f32;

        for y in 0..h {
            let is_reverse = serpentine && (y & 1) == 1;
            let cur_row = (y & 1) * w * 3;
            let next_row = ((y + 1) & 1) * w * 3;
            let (start_x, end_x, step_x): (isize, isize, isize) = if is_reverse {
                (w as isize - 1, -1, -1)
            } else {
                (0, w as isize, 1)
            };

            let mut x = start_x;
            while x != end_x {
                let ux = x as usize;
                let idx = (y * w + ux) * 4;
                let mut r = input[idx] as f32 + err_ring[cur_row + ux * 3];
                let mut g = input[idx + 1] as f32 + err_ring[cur_row + ux * 3 + 1];
                let mut b = input[idx + 2] as f32 + err_ring[cur_row + ux * 3 + 2];
                for o in &orbs {
                    let dx = ux as f64 - o.x;
                    let dy = y as f64 - o.y;
                    let d2 = dx * dx + dy * dy;
                    if d2 < o.size2 {
                        let d = d2.sqrt();
                        let boost = ((1.0 - d / o.size) * (180.0 * o.intensity)) as f32;
                        r += boost;
                        g += boost;
                        b += boost;
                    }
                }
                let cl_r = r.clamp(0.0, 255.0);
                let cl_g = g.clamp(0.0, 255.0);
                let cl_b = b.clamp(0.0, 255.0);

                let chosen = lut.inline_match(cl_r, cl_g, cl_b);
                out[idx] = chosen[0];
                out[idx + 1] = chosen[1];
                out[idx + 2] = chosen[2];
                out[idx + 3] = input[idx + 3];

                let err_r = ((cl_r - chosen[0] as f32) * strength).clamp(-max_err, max_err);
                let err_g = ((cl_g - chosen[1] as f32) * strength).clamp(-max_err, max_err);
                let err_b = ((cl_b - chosen[2] as f32) * strength).clamp(-max_err, max_err);

                if is_reverse {
                    if ux > 0 {
                        err_ring[cur_row + (ux - 1) * 3] += err_r * (7.0 / 16.0);
                        err_ring[cur_row + (ux - 1) * 3 + 1] += err_g * (7.0 / 16.0);
                        err_ring[cur_row + (ux - 1) * 3 + 2] += err_b * (7.0 / 16.0);
                    }
                    if y + 1 < h {
                        if ux + 1 < w {
                            err_ring[next_row + (ux + 1) * 3] += err_r * (3.0 / 16.0);
                            err_ring[next_row + (ux + 1) * 3 + 1] += err_g * (3.0 / 16.0);
                            err_ring[next_row + (ux + 1) * 3 + 2] += err_b * (3.0 / 16.0);
                        }
                        err_ring[next_row + ux * 3] += err_r * (5.0 / 16.0);
                        err_ring[next_row + ux * 3 + 1] += err_g * (5.0 / 16.0);
                        err_ring[next_row + ux * 3 + 2] += err_b * (5.0 / 16.0);
                        if ux > 0 {
                            err_ring[next_row + (ux - 1) * 3] += err_r * (1.0 / 16.0);
                            err_ring[next_row + (ux - 1) * 3 + 1] += err_g * (1.0 / 16.0);
                            err_ring[next_row + (ux - 1) * 3 + 2] += err_b * (1.0 / 16.0);
                        }
                    }
                } else {
                    if ux + 1 < w {
                        err_ring[cur_row + (ux + 1) * 3] += err_r * (7.0 / 16.0);
                        err_ring[cur_row + (ux + 1) * 3 + 1] += err_g * (7.0 / 16.0);
                        err_ring[cur_row + (ux + 1) * 3 + 2] += err_b * (7.0 / 16.0);
                    }
                    if y + 1 < h {
                        if ux > 0 {
                            err_ring[next_row + (ux - 1) * 3] += err_r * (3.0 / 16.0);
                            err_ring[next_row + (ux - 1) * 3 + 1] += err_g * (3.0 / 16.0);
                            err_ring[next_row + (ux - 1) * 3 + 2] += err_b * (3.0 / 16.0);
                        }
                        err_ring[next_row + ux * 3] += err_r * (5.0 / 16.0);
                        err_ring[next_row + ux * 3 + 1] += err_g * (5.0 / 16.0);
                        err_ring[next_row + ux * 3 + 2] += err_b * (5.0 / 16.0);
                        if ux + 1 < w {
                            err_ring[next_row + (ux + 1) * 3] += err_r * (1.0 / 16.0);
                            err_ring[next_row + (ux + 1) * 3 + 1] += err_g * (1.0 / 16.0);
                            err_ring[next_row + (ux + 1) * 3 + 2] += err_b * (1.0 / 16.0);
                        }
                    }
                }
                x += step_x;
            }
            for i in 0..(w * 3) {
                err_ring[cur_row + i] = 0.0;
            }
        }
    }
}

pub fn dither_orb_diffuse_x(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let orbs = detect_orbs(width, height, input, params);
    let max_err = 128.0f32;
    let strength = params.diffusion_strength;
    let line_scale = params.line_scale.unwrap_or(1.0);
    let eff_strength = strength * (1.0 + (line_scale - 1.0) * 0.1);

    if lut.is_tonal_ramp {
        let mut err_buf = vec![0.0f32; w];
        for y in 0..h {
            for x in 0..w {
                let idx = (y * w + x) * 4;
                let mut lum = crate::palette::get_luminance(
                    input[idx] as f32,
                    input[idx + 1] as f32,
                    input[idx + 2] as f32,
                );
                for o in &orbs {
                    let dx = x as f64 - o.x;
                    let dy = y as f64 - o.y;
                    let d2 = dx * dx + dy * dy;
                    if d2 < o.size2 {
                        let d = d2.sqrt();
                        lum = (lum as f64 + (1.0 - d / o.size) * (180.0 * o.intensity)).min(255.0) as f32;
                    }
                }
                let cur_lum = (lum + err_buf[x]).clamp(0.0, 255.0);
                let chosen_idx = lut.quantize_lum(cur_lum);
                let col = lut.raw_palette[chosen_idx];

                out[idx] = col[0];
                out[idx + 1] = col[1];
                out[idx + 2] = col[2];
                out[idx + 3] = input[idx + 3];

                err_buf[x] = ((cur_lum - lut.luminances[chosen_idx]) * eff_strength).clamp(-max_err, max_err);
            }
        }
    } else {
        let mut err_buf = vec![0.0f32; w * 3];
        for y in 0..h {
            for x in 0..w {
                let idx = (y * w + x) * 4;
                let e_idx = x * 3;
                let mut r = input[idx] as f32 + err_buf[e_idx];
                let mut g = input[idx + 1] as f32 + err_buf[e_idx + 1];
                let mut b = input[idx + 2] as f32 + err_buf[e_idx + 2];
                for o in &orbs {
                    let dx = x as f64 - o.x;
                    let dy = y as f64 - o.y;
                    let d2 = dx * dx + dy * dy;
                    if d2 < o.size2 {
                        let d = d2.sqrt();
                        let boost = ((1.0 - d / o.size) * (180.0 * o.intensity)) as f32;
                        r += boost;
                        g += boost;
                        b += boost;
                    }
                }
                let cl_r = r.clamp(0.0, 255.0);
                let cl_g = g.clamp(0.0, 255.0);
                let cl_b = b.clamp(0.0, 255.0);

                let chosen = lut.inline_match(cl_r, cl_g, cl_b);
                out[idx] = chosen[0];
                out[idx + 1] = chosen[1];
                out[idx + 2] = chosen[2];
                out[idx + 3] = input[idx + 3];

                err_buf[e_idx] = ((cl_r - chosen[0] as f32) * eff_strength).clamp(-max_err, max_err);
                err_buf[e_idx + 1] = ((cl_g - chosen[1] as f32) * eff_strength).clamp(-max_err, max_err);
                err_buf[e_idx + 2] = ((cl_b - chosen[2] as f32) * eff_strength).clamp(-max_err, max_err);
            }
        }
    }
}

pub fn dither_orb_diffuse_y(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let orbs = detect_orbs(width, height, input, params);
    let max_err = 128.0f64;
    let strength = params.diffusion_strength as f64;
    let line_scale = params.line_scale.unwrap_or(1.0) as f64;
    let eff_strength = strength * (1.0 + (line_scale - 1.0) * 0.1);

    if lut.is_tonal_ramp {
        for y in 0..h {
            let mut err = 0.0f64;
            for x in 0..w {
                let idx = (y * w + x) * 4;
                let mut lum = 0.2126 * (input[idx] as f64)
                    + 0.7152 * (input[idx + 1] as f64)
                    + 0.0722 * (input[idx + 2] as f64);
                for o in &orbs {
                    let dx = x as f64 - o.x;
                    let dy = y as f64 - o.y;
                    let d2 = dx * dx + dy * dy;
                    if d2 < o.size2 {
                        let d = d2.sqrt();
                        lum = (lum + (1.0 - d / o.size) * (180.0 * o.intensity)).min(255.0);
                    }
                }
                let cur_lum = (lum + err).clamp(0.0, 255.0);
                let chosen_idx = lut.quantize_lum_f64(cur_lum);
                let col = lut.raw_palette[chosen_idx];

                out[idx] = col[0];
                out[idx + 1] = col[1];
                out[idx + 2] = col[2];
                out[idx + 3] = input[idx + 3];

                err = ((cur_lum - lut.luminances_f64[chosen_idx]) * eff_strength).clamp(-max_err, max_err);
            }
        }
    } else {
        for y in 0..h {
            let mut err_r = 0.0f64;
            let mut err_g = 0.0f64;
            let mut err_b = 0.0f64;
            for x in 0..w {
                let idx = (y * w + x) * 4;
                let mut r = input[idx] as f64 + err_r;
                let mut g = input[idx + 1] as f64 + err_g;
                let mut b = input[idx + 2] as f64 + err_b;
                for o in &orbs {
                    let dx = x as f64 - o.x;
                    let dy = y as f64 - o.y;
                    let d2 = dx * dx + dy * dy;
                    if d2 < o.size2 {
                        let d = d2.sqrt();
                        let boost = (1.0 - d / o.size) * (180.0 * o.intensity);
                        r += boost;
                        g += boost;
                        b += boost;
                    }
                }
                let cl_r = r.clamp(0.0, 255.0);
                let cl_g = g.clamp(0.0, 255.0);
                let cl_b = b.clamp(0.0, 255.0);

                let chosen = lut.inline_match_f64(cl_r, cl_g, cl_b);
                out[idx] = chosen[0];
                out[idx + 1] = chosen[1];
                out[idx + 2] = chosen[2];
                out[idx + 3] = input[idx + 3];

                err_r = ((cl_r - chosen[0] as f64) * eff_strength).clamp(-max_err, max_err);
                err_g = ((cl_g - chosen[1] as f64) * eff_strength).clamp(-max_err, max_err);
                err_b = ((cl_b - chosen[2] as f64) * eff_strength).clamp(-max_err, max_err);
            }
        }
    }
}

pub fn dither_orb_matrix(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = params.scale.max(0.05);
    let orbs = detect_orbs(width, height, input, params);
    let size = match params.matrix_size {
        Some(2) => 2,
        Some(8) => 8,
        Some(16) => 16,
        _ => 4,
    };
    let mask = (size - 1) as isize;
    let size_isize = size as isize;

    let bayer_buf = match size {
        8 => Some(generate_bayer(8)),
        16 => Some(generate_bayer(16)),
        _ => None,
    };
    let matrix: &[f32] = match size {
        2 => &BAYER_2,
        8 => bayer_buf.as_deref().unwrap(),
        16 => bayer_buf.as_deref().unwrap(),
        _ => &BAYER_4,
    };

    let ox = params.offset_x.unwrap_or(0.0);
    let oy = params.offset_y.unwrap_or(0.0);

    for y in 0..h {
        let py = y as f32 + oy;
        let sy = if (scale - 1.0).abs() > 0.0001 { (py / scale).floor() as isize } else { py.floor() as isize };
        let row_offset = ((((sy & mask) + size_isize) & mask) as usize) * size;

        for x in 0..w {
            let px = x as f32 + ox;
            let sx = if (scale - 1.0).abs() > 0.0001 { (px / scale).floor() as isize } else { px.floor() as isize };
            let idx = (y * w + x) * 4;

            let mut boost = 0.0f32;
            for o in &orbs {
                let dx = x as f64 - o.x;
                let dy = y as f64 - o.y;
                let d2 = dx * dx + dy * dy;
                if d2 < o.size2 {
                    let d = d2.sqrt();
                    boost += ((1.0 - d / o.size) * (0.8 * o.intensity)) as f32;
                }
            }

            let col_offset = (((sx & mask) + size_isize) & mask) as usize;
            let bayer_val = matrix[row_offset + col_offset];
            let threshold = (bayer_val - boost).clamp(0.05, 0.95);

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

// -------------------------------------------------------------
// POLYGON TESSELLATION ALGORITHMS
// -------------------------------------------------------------

pub fn dither_hexa_poly(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let r = (12.0 * scale).max(1.0);
    let w_hex = 3.0_f64.sqrt() * r;
    let h_hex = 1.5 * r;

    for y in 0..h {
        let row = (y as f64 / h_hex).floor() as i64;
        let is_offset = (row & 1) == 1;
        let offset = if is_offset { w_hex * 0.5 } else { 0.0 };
        let cy = (row as f64 * h_hex + r).round() as isize;
        let scy = cy.clamp(0, (h - 1) as isize) as usize;
        let scy_w = scy * w;
        let y_w = y * w;

        for x in 0..w {
            let col = ((x as f64 - offset) / w_hex).floor() as i64;
            let cx = (col as f64 * w_hex + offset + w_hex * 0.5).round() as isize;
            let scx = cx.clamp(0, (w - 1) as isize) as usize;
            let s_idx = (scy_w + scx) * 4;
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_match_u8(input[s_idx], input[s_idx + 1], input[s_idx + 2]);
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_low_poly(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let t_type = params.triangle_type.as_deref().unwrap_or("isosceles");
    let aspect = match t_type {
        "equilateral" | "pyramid" => 3.0_f64.sqrt() / 2.0,
        "sawtooth" => 0.707,
        "half-equilateral" | "half_equilateral" => 3.0_f64.sqrt(),
        "golden-triangle" | "golden_triangle" => 1.618,
        "arrowhead" => 0.588,
        _ => 1.0,
    };

    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let s = ((16.0 * scale).round() as usize).max(1);
    let sy = (((s as f64) * aspect).round() as usize).max(1);
    let s_f64 = s as f64;
    let sy_f64 = sy as f64;

    let mut by = 0;
    while by < h {
        let max_by = (by + sy).min(h);
        let mut bx = 0;
        while bx < w {
            let max_bx = (bx + s).min(w);
            let cx1 = (bx + (s_f64 * 0.25).floor() as usize).clamp(0, w - 1);
            let cy1 = (by + (sy_f64 * 0.25).floor() as usize).clamp(0, h - 1);
            let cx2 = (bx + (s_f64 * 0.75).floor() as usize).clamp(0, w - 1);
            let cy2 = (by + (sy_f64 * 0.75).floor() as usize).clamp(0, h - 1);

            let idx1 = (cy1 * w + cx1) * 4;
            let idx2 = (cy2 * w + cx2) * 4;

            let chosen1 = lut.inline_match_u8(input[idx1], input[idx1 + 1], input[idx1 + 2]);
            let chosen2 = lut.inline_match_u8(input[idx2], input[idx2 + 1], input[idx2 + 2]);

            for y in by..max_by {
                let y_diff_ratio = (y - by) as f64 / sy_f64;
                let y_w = y * w;
                for x in bx..max_bx {
                    let is_upper = ((x - bx) as f64 / s_f64) < y_diff_ratio;
                    let chosen = if is_upper { &chosen1 } else { &chosen2 };
                    let idx = (y_w + x) * 4;
                    out[idx] = chosen[0];
                    out[idx + 1] = chosen[1];
                    out[idx + 2] = chosen[2];
                    out[idx + 3] = input[idx + 3];
                }
            }
            bx += s;
        }
        by += sy;
    }
}

pub fn dither_penta_poly(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let is_vert = params.vertical.unwrap_or(false);
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let r = (12.0 * scale).max(1.0);
    let w_hex = 3.0_f64.sqrt() * r;
    let h_hex = 1.5 * r;

    for y in 0..h {
        let row = (y as f64 / h_hex).floor() as i64;
        let is_offset = (row & 1) == 1;
        let offset = if is_offset { w_hex * 0.5 } else { 0.0 };
        let cy = (row as f64 * h_hex + r).round() as isize;
        let y_w = y * w;

        for x in 0..w {
            let col = ((x as f64 - offset) / w_hex).floor() as i64;
            let cx = (col as f64 * w_hex + offset + w_hex * 0.5).round() as isize;

            let is_split = if is_vert { (x as isize) < cx } else { (y as isize) < cy };

            let sx_offset = if is_vert {
                if is_split { -w_hex * 0.25 } else { w_hex * 0.25 }
            } else {
                0.0
            };
            let sy_offset = if !is_vert {
                if is_split { -h_hex * 0.25 } else { h_hex * 0.25 }
            } else {
                0.0
            };

            let scx = ((cx as f64 + sx_offset).round() as isize).clamp(0, (w - 1) as isize) as usize;
            let scy = ((cy as f64 + sy_offset).round() as isize).clamp(0, (h - 1) as isize) as usize;
            let s_idx = (scy * w + scx) * 4;
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_match_u8(input[s_idx], input[s_idx + 1], input[s_idx + 2]);
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_tri_poly(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let s = ((16.0 * scale).round() as usize).max(1);
    let s_f64 = s as f64;

    let mut by = 0;
    while by < h {
        let max_by = (by + s).min(h);
        let mut bx = 0;
        while bx < w {
            let max_bx = (bx + s).min(w);
            let cx1 = (bx + (s_f64 * 0.5).floor() as usize).clamp(0, w - 1);
            let cy1 = (by + (s_f64 * 0.25).floor() as usize).clamp(0, h - 1);
            let cx2 = (bx + (s_f64 * 0.5).floor() as usize).clamp(0, w - 1);
            let cy2 = (by + (s_f64 * 0.75).floor() as usize).clamp(0, h - 1);

            let idx1 = (cy1 * w + cx1) * 4;
            let idx2 = (cy2 * w + cx2) * 4;

            let chosen1 = lut.inline_match_u8(input[idx1], input[idx1 + 1], input[idx1 + 2]);
            let chosen2 = lut.inline_match_u8(input[idx2], input[idx2 + 1], input[idx2 + 2]);

            for y in by..max_by {
                let y_diff = y - by;
                let y_w = y * w;
                for x in bx..max_bx {
                    let is_up = ((x - bx) + y_diff) < s;
                    let chosen = if is_up { &chosen1 } else { &chosen2 };
                    let idx = (y_w + x) * 4;
                    out[idx] = chosen[0];
                    out[idx + 1] = chosen[1];
                    out[idx + 2] = chosen[2];
                    out[idx + 3] = input[idx + 3];
                }
            }
            bx += s;
        }
        by += s;
    }
}

// -------------------------------------------------------------
// PATTERNED & HALFTONE ALGORITHMS
// -------------------------------------------------------------

#[inline(always)]
fn js_hypot(x: f64, y: f64) -> f64 {
    let ax = x.abs();
    let ay = y.abs();
    let max = ax.max(ay);
    let min = ax.min(ay);
    if min == 0.0 {
        return max;
    }
    let ratio = min / max;
    max * (1.0 + ratio * ratio).sqrt()
}

pub fn dither_block_tone(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let base_dot = params.dot_size.unwrap_or(4.0) as f64;
    let s = ((base_dot * scale).round() as usize).max(1);
    let half_s = s as f64 / 2.0;
    let max_r = half_s * 0.95;

    let mut by = 0;
    while by < h {
        let max_by = (by + s).min(h);
        let mut bx = 0;
        while bx < w {
            let max_bx = (bx + s).min(w);
            let cx = bx as f64 + half_s;
            let cy = by as f64 + half_s;
            let c_x = (cx.floor() as usize).min(w - 1);
            let c_y = (cy.floor() as usize).min(h - 1);
            let c_idx = (c_y * w + c_x) * 4;
            let lum = 0.2126 * input[c_idx] as f64 + 0.7152 * input[c_idx + 1] as f64 + 0.0722 * input[c_idx + 2] as f64;
            let radius = max_r * (0.0_f64.max(1.0 - lum / 255.0)).sqrt();

            for y in by..max_by {
                let y_diff = y as f64 - cy;
                let y_w = y * w;
                for x in bx..max_bx {
                    let x_diff = x as f64 - cx;
                    let dist = js_hypot(x_diff, y_diff);
                    let threshold = if dist <= radius { 0.75 } else { 0.25 };
                    let idx = (y_w + x) * 4;
                    let chosen = lut.inline_pair_match(
                        input[idx] as f32,
                        input[idx + 1] as f32,
                        input[idx + 2] as f32,
                        threshold as f32,
                    );
                    out[idx] = chosen[0];
                    out[idx + 1] = chosen[1];
                    out[idx + 2] = chosen[2];
                    out[idx + 3] = input[idx + 3];
                }
            }
            bx += s;
        }
        by += s;
    }
}

pub fn dither_pop_tone(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let _h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let density = (params.density.unwrap_or(20.0) as f64) / 100.0;
    let angle = (params.variation.unwrap_or(45.0) as f64) * (std::f64::consts::PI / 180.0);
    let s = (12.0 * scale).max(0.6);
    let cos_a = angle.cos();
    let sin_a = angle.sin();
    let max_r = (s / 2.0) * (1.0 + density);
    let row_len = w * 4;

    out.par_chunks_exact_mut(row_len)
        .enumerate()
        .for_each(|(y, out_row)| {
            let y_f = y as f64;
            let in_row = &input[y * row_len..(y + 1) * row_len];
            for x in 0..w {
                let x_f = x as f64;
                let rx = x_f * cos_a - y_f * sin_a;
                let ry = x_f * sin_a + y_f * cos_a;
                let cx = ((rx / s).floor() + 0.5) * s;
                let cy = ((ry / s).floor() + 0.5) * s;

                let idx = x * 4;
                let lum = 0.2126 * in_row[idx] as f64 + 0.7152 * in_row[idx + 1] as f64 + 0.0722 * in_row[idx + 2] as f64;
                let radius = max_r * (0.0_f64.max(1.0 - lum / 255.0)).sqrt();

                let dist = js_hypot(rx - cx, ry - cy);
                let threshold = if dist <= radius { 0.75 } else { 0.25 };

                let chosen = lut.inline_pair_match(
                    in_row[idx] as f32,
                    in_row[idx + 1] as f32,
                    in_row[idx + 2] as f32,
                    threshold as f32,
                );
                out_row[idx] = chosen[0];
                out_row[idx + 1] = chosen[1];
                out_row[idx + 2] = chosen[2];
                out_row[idx + 3] = in_row[idx + 3];
            }
        });
}

pub fn dither_camo(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let density = (params.density.unwrap_or(30.0) as f64).max(3.0);
    let s = ((200.0 / density) * scale).max(0.8);
    let row_len = w * 4;

    out.par_chunks_exact_mut(row_len)
        .enumerate()
        .for_each(|(y, out_row)| {
            let y_f = y as f64;
            let cell_y = (y_f / s).floor() as isize;
            for x in 0..w {
                let x_f = x as f64;
                let cell_x = (x_f / s).floor() as isize;
                let mut closest_dist = f64::INFINITY;
                let mut closest_seed_idx = (y * w + x) * 4;

                for dy in -1..=1 {
                    for dx in -1..=1 {
                        let cx = cell_x + dx;
                        let cy = cell_y + dy;
                        let pseudo_x = (cx as f64 * 127.1 + cy as f64 * 311.7).sin() * 43758.5453;
                        let hash_x = ((pseudo_x % 1.0) + 1.0) % 1.0;
                        let pseudo_y = (cx as f64 * 269.5 + cy as f64 * 183.3).sin() * 43758.5453;
                        let hash_y = ((pseudo_y % 1.0) + 1.0) % 1.0;

                        let sx = (((cx as f64 + hash_x) * s).round() as isize).clamp(0, (w - 1) as isize) as usize;
                        let sy = (((cy as f64 + hash_y) * s).round() as isize).clamp(0, (h - 1) as isize) as usize;
                        let d = js_hypot(x_f - sx as f64, y_f - sy as f64);
                        if d < closest_dist {
                            closest_dist = d;
                            closest_seed_idx = (sy * w + sx) * 4;
                        }
                    }
                }

                let idx = x * 4;
                let chosen = lut.inline_match_u8(
                    input[closest_seed_idx],
                    input[closest_seed_idx + 1],
                    input[closest_seed_idx + 2],
                );
                out_row[idx] = chosen[0];
                out_row[idx + 1] = chosen[1];
                out_row[idx + 2] = chosen[2];
                out_row[idx + 3] = input[(y * w + x) * 4 + 3];
            }
        });
}

pub fn dither_checkers(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let base = params.checkers_size.unwrap_or(8.0) as f64;
    let s = ((base * scale).round() as usize).max(1);

    for y in 0..h {
        let cy = y / s;
        let y_w = y * w;
        for x in 0..w {
            let cx = x / s;
            let is_alt = ((cx + cy) & 1) == 1;
            let threshold = if is_alt { 0.35 } else { 0.65 };
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_circle_grid(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let s = (10.0 * scale).max(0.8);
    let r = (4.0 * scale).max(0.2);

    for y in 0..h {
        let cy = ((y as f64 / s).floor() + 0.5) * s;
        let y_w = y * w;
        for x in 0..w {
            let cx = ((x as f64 / s).floor() + 0.5) * s;
            let is_circle = js_hypot(x as f64 - cx, y as f64 - cy) <= r;
            let threshold = if is_circle { 0.35 } else { 0.65 };
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_crosshatch(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let base_spacing = params.line_spacing.unwrap_or(1.0) as f64;
    let spacing = ((base_spacing * scale * 3.0).round() as isize).max(1);

    for y in 0..h {
        let y_isize = y as isize;
        let y_w = y * w;
        let y_mod = y_isize % spacing == 0;
        for x in 0..w {
            let x_isize = x as isize;
            let idx = (y_w + x) * 4;
            let lum = 0.2126 * input[idx] as f64 + 0.7152 * input[idx + 1] as f64 + 0.0722 * input[idx + 2] as f64;
            let mut is_line = false;

            if lum < 192.0 && y_mod {
                is_line = true;
            }
            if lum < 128.0 && (x_isize % spacing == 0) {
                is_line = true;
            }
            if lum < 64.0 && ((x_isize + y_isize) % spacing == 0) {
                is_line = true;
            }
            if lum < 32.0 && ((x_isize - y_isize) % spacing == 0) {
                is_line = true;
            }

            let threshold = if is_line { 0.75 } else { 0.25 };
            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_diamond_grid(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let s = (12.0 * scale).max(0.6);
    let half_s = s / 2.0;
    let limit = s / 2.5;

    for y in 0..h {
        let my = ((y as f64 % s) - half_s).abs();
        let y_w = y * w;
        for x in 0..w {
            let mx = ((x as f64 % s) - half_s).abs();
            let is_diamond = (mx + my) <= limit;
            let threshold = if is_diamond { 0.35 } else { 0.65 };
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_diamond(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let base_period = params.period.unwrap_or(8.0) as f64;
    let s = (base_period * scale).max(0.6);
    let half_s = s / 2.0;

    for y in 0..h {
        let my = ((y as f64 % s) - half_s).abs();
        let y_w = y * w;
        for x in 0..w {
            let mx = ((x as f64 % s) - half_s).abs();
            let d = (mx + my) / s;
            let idx = (y_w + x) * 4;
            let lum = 0.2126 * input[idx] as f64 + 0.7152 * input[idx + 1] as f64 + 0.0722 * input[idx + 2] as f64;
            let target = 1.0 - lum / 255.0;
            let threshold = if d <= target { 0.75 } else { 0.25 };

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_gridlock_traffic(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let step = ((8.0 * scale).round() as isize).max(1);

    for y in 0..h {
        let y_isize = y as isize;
        let y_w = y * w;
        for x in 0..w {
            let x_isize = x as isize;
            let is_line = ((x_isize + y_isize) % step == 0) || ((x_isize - y_isize) % step == 0);
            let threshold = if is_line { 0.75 } else { 0.25 };
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_heart_grid(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let s = (16.0 * scale).max(0.8);
    let half_s = s / 2.0;
    let denom = s * 0.35;

    for y in 0..h {
        let cy = (y as f64 / s).floor() * s + half_s;
        let v = -(y as f64 - cy) / denom;
        let v2 = v * v;
        let v3 = v2 * v;
        let y_w = y * w;
        for x in 0..w {
            let cx = (x as f64 / s).floor() * s + half_s;
            let u = (x as f64 - cx) / denom;
            let u2 = u * u;
            let is_heart = (u2 + v2 - 1.0).powi(3) - u2 * v3 <= 0.0;
            let threshold = if is_heart { 0.75 } else { 0.25 };
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_print_pattern(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let _h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let base_scale = params.dot_scale.unwrap_or(8.0) as f64;
    let s = (base_scale * scale).max(0.4);
    let ang45 = std::f64::consts::FRAC_PI_4;
    let cos45 = ang45.cos();
    let sin45 = ang45.sin();
    let pi = std::f64::consts::PI;
    let row_len = w * 4;

    out.par_chunks_exact_mut(row_len)
        .enumerate()
        .for_each(|(y, out_row)| {
            let y_f = y as f64;
            let in_row = &input[y * row_len..(y + 1) * row_len];
            for x in 0..w {
                let x_f = x as f64;
                let rx = x_f * cos45 - y_f * sin45;
                let ry = x_f * sin45 + y_f * cos45;
                let wave = (rx / s * pi).sin() * (ry / s * pi).cos();
                let threshold = (0.5 + wave * 0.4) as f32;
                let idx = x * 4;

                let chosen = lut.inline_pair_match(
                    in_row[idx] as f32,
                    in_row[idx + 1] as f32,
                    in_row[idx + 2] as f32,
                    threshold,
                );
                out_row[idx] = chosen[0];
                out_row[idx + 1] = chosen[1];
                out_row[idx + 2] = chosen[2];
                out_row[idx + 3] = in_row[idx + 3];
            }
        });
}

pub fn dither_square_mosaic(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let base_block = params.block_size.unwrap_or(8.0) as f64;
    let s = ((base_block * scale).round() as usize).max(1);
    let gap = s.min(((scale).round() as usize).max(1));

    for y in 0..h {
        let is_gap_y = (y % s) < gap;
        let y_w = y * w;
        for x in 0..w {
            let is_gap = is_gap_y || ((x % s) < gap);
            let threshold = if is_gap { 0.75 } else { 0.25 };
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_stippling(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let density = params.dot_density.unwrap_or(1.0) as f64;

    for y in 0..h {
        let sy = (y as f64 / scale).floor();
        let y_w = y * w;
        for x in 0..w {
            let sx = (x as f64 / scale).floor();
            let idx = (y_w + x) * 4;
            let lum = 0.2126 * input[idx] as f64 + 0.7152 * input[idx + 1] as f64 + 0.0722 * input[idx + 2] as f64;
            let pseudo = (sx * 12.9898 + sy * 78.233).sin() * 43758.5453;
            let rand = ((pseudo % 1.0) + 1.0) % 1.0;
            let threshold_val = (1.0 - lum / 255.0) * (0.3 + density * 0.07);
            let threshold = if rand < threshold_val { 0.8 } else { 0.2 };

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

// -------------------------------------------------------------
// SPECIAL EFFECTS & PROCEDURAL CONTOUR ALGORITHMS (PHASE 4)
// -------------------------------------------------------------

pub fn dither_beehive(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let base_size = params.cell_size.or(params.cell_radius).unwrap_or(8.0) as f64;
    let size = ((base_size * scale).round() as isize).max(2) as f64;
    let hx = size * 3.0_f64.sqrt();
    let hy = size * 1.5;
    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let oy = params.offset_y.unwrap_or(0.0) as f64;

    for y in 0..h {
        let sy = y as f64 + oy;
        let qy = (((sy % hy) + hy) % hy - hy / 2.0).abs();
        let y_w = y * w;
        for x in 0..w {
            let sx = x as f64 + ox;
            let qx = (((sx % hx) + hx) % hx - hx / 2.0).abs();
            let is_edge = (qx * 3.0_f64.sqrt() + qy) > (size * 1.4);
            let threshold = if is_edge { 0.75 } else { 0.25 };
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_diagonal(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let sensitivity = params.edge_sensitivity.unwrap_or(1.0) as f64;
    let base_spacing = params.stripe_spacing.or(params.line_spacing).unwrap_or(4.0) as f64;
    let spacing = ((base_spacing * scale).round() as isize).max(1) as f64;
    let angle = (params.angle.unwrap_or(45.0) as f64) * (std::f64::consts::PI / 180.0);
    let cos_a = angle.cos();
    let sin_a = angle.sin();
    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let oy = params.offset_y.unwrap_or(0.0) as f64;

    #[inline(always)]
    fn lum_at(data: &[u8], w: usize, y: usize, x: usize) -> f64 {
        let idx = (y * w + x) * 4;
        0.2126 * data[idx] as f64 + 0.7152 * data[idx + 1] as f64 + 0.0722 * data[idx + 2] as f64
    }

    for y in 0..h {
        let y_prev = y.saturating_sub(1);
        let y_next = (y + 1).min(h - 1);
        let y_cur = y * w;
        for x in 0..w {
            let idx = (y_cur + x) * 4;
            let x_prev = x.saturating_sub(1);
            let x_next = (x + 1).min(w - 1);

            let l00 = lum_at(input, w, y_prev, x_prev);
            let l02 = lum_at(input, w, y_prev, x_next);
            let l10 = lum_at(input, w, y, x_prev);
            let l12 = lum_at(input, w, y, x_next);
            let l20 = lum_at(input, w, y_next, x_prev);
            let l22 = lum_at(input, w, y_next, x_next);

            let gx = (l02 + 2.0 * l12 + l22) - (l00 + 2.0 * l10 + l20);
            let gy = (l20 + 2.0 * lum_at(input, w, y_next, x) + l22)
                - (l00 + 2.0 * lum_at(input, w, y_prev, x) + l02);
            let edge = js_hypot(gx, gy) / 255.0;
            let is_edge = (edge * sensitivity * 0.4) > 0.3;

            let sx = x as f64 + ox;
            let sy = y as f64 + oy;
            let proj = ((sx * cos_a + sy * sin_a) / spacing).floor() as i64;
            let is_stripe = (proj & 1) == 0;
            let threshold = if is_edge { 0.2 } else if is_stripe { 0.4 } else { 0.7 };

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_displace_contour(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let contour_thresh = (params.contour_threshold.unwrap_or(50.0) as f64) / 100.0;
    let line_mode = params.line_mode.as_deref().and_then(|s| s.parse::<f64>().ok()).unwrap_or(1.0);
    let base_spacing = params.line_spacing.map(|v| v as f64 * 4.0).unwrap_or(4.0);
    let spacing = ((base_spacing * scale).round() as isize).max(2) as f64;
    let smoothing = params.smoothing.unwrap_or(0.0) as usize;
    let bands = (params.bands.unwrap_or(6.0) as f64).max(1.0);
    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let oy = params.offset_y.unwrap_or(0.0) as f64;

    #[inline(always)]
    fn lum_at(data: &[u8], idx: usize) -> f64 {
        0.2126 * data[idx] as f64 + 0.7152 * data[idx + 1] as f64 + 0.0722 * data[idx + 2] as f64
    }

    for y in 0..h {
        let y_w = y * w;
        for x in 0..w {
            let idx = (y_w + x) * 4;
            let mut lum = lum_at(input, idx);
            if smoothing > 0 {
                let r_sm = smoothing.min(3);
                let mut s_sum = lum;
                let mut s_cnt = 1.0;
                for d in 1..=r_sm {
                    if x >= d {
                        s_sum += lum_at(input, (y_w + x - d) * 4);
                        s_cnt += 1.0;
                    }
                    if x + d < w {
                        s_sum += lum_at(input, (y_w + x + d) * 4);
                        s_cnt += 1.0;
                    }
                }
                lum = s_sum / s_cnt;
            }

            let _sx = x as f64 + ox;
            let sy = y as f64 + oy;
            let displace = (lum / 255.0) * contour_thresh * 20.0 * scale;
            let y_eff = (sy + displace).round() as isize;
            let rem = ((y_eff % spacing as isize) + spacing as isize) % spacing as isize;
            let is_line = (rem as f64) < (line_mode * scale).max(1.0);
            let band_val = ((lum / 255.0) * bands * std::f64::consts::PI).sin();
            let threshold = if is_line { 0.3 } else { 0.5 + band_val * 0.35 };

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_dotted_lines(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let density = params.line_density.map(|d| d as f64).unwrap_or_else(|| {
        let spacing = params.line_spacing.unwrap_or(1.0) as f64;
        (20.0 / spacing).round()
    });

    let dotting = (params.dotting.unwrap_or(40.0) as f64) / 100.0;
    let angle_deg = params.line_angle.unwrap_or(45.0) as f64;
    let rad = angle_deg * (std::f64::consts::PI / 180.0);
    let cos_a = rad.cos();
    let sin_a = rad.sin();
    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let oy = params.offset_y.unwrap_or(0.0) as f64;

    let min_dim = (w.min(h)) as f64;
    let base_spacing = min_dim / density.max(1.0);
    let spacing = ((base_spacing * scale).round() as isize).max(2) as f64;
    let dot_freq = ((spacing * 0.75).round() as isize).max(2) as f64;

    for y in 0..h {
        let y_w = y * w;
        for x in 0..w {
            let idx = (y_w + x) * 4;
            let lum = 0.2126 * input[idx] as f64 + 0.7152 * input[idx + 1] as f64 + 0.0722 * input[idx + 2] as f64;
            let sx = x as f64 + ox;
            let sy = y as f64 + oy;
            let rot_x = sx * cos_a + sy * sin_a;
            let rot_y = -sx * sin_a + sy * cos_a;

            let bend = ((rot_x / dot_freq) * std::f64::consts::PI).sin() * dotting * spacing * 0.5;
            let eff_y = rot_y + bend + (lum / 255.0) * spacing;
            let rem_y = ((eff_y % spacing) + spacing) % spacing;
            let is_line = rem_y < (scale * 1.5).max(1.0);
            let is_dot = is_line && (((rot_x / dot_freq).floor() as i64) & 1) == 0;
            let threshold = if is_dot { 0.25 } else if is_line { 0.45 } else { 0.75 };

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_noise(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let noise_amount = params.noise_amount.unwrap_or(0.3) as f64;

    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let oy = params.offset_y.unwrap_or(0.0) as f64;

    for y in 0..h {
        let py = y as f64 + oy;
        let sy = if (scale - 1.0).abs() > 0.0001 { (py / scale).floor() } else { py };
        let y_w = y * w;
        for x in 0..w {
            let px = x as f64 + ox;
            let sx = if (scale - 1.0).abs() > 0.0001 { (px / scale).floor() } else { px };
            let idx = (y_w + x) * 4;
            let pseudo = (sx * 12.9898 + sy * 78.233).sin() * 43758.5453;
            let rand = ((pseudo % 1.0) + 1.0) % 1.0;
            let threshold = 0.5 + (rand - 0.5) * noise_amount;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_radial_burst(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let divisor = (params.divisor.unwrap_or(5.0) as f64).max(0.5);
    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let oy = params.offset_y.unwrap_or(0.0) as f64;
    let cx = (w as f64) / 2.0 + ox;
    let cy = (h as f64) / 2.0 + oy;

    for y in 0..h {
        let y_w = y * w;
        for x in 0..w {
            let idx = (y_w + x) * 4;
            let d = js_hypot(x as f64 - cx, y as f64 - cy);
            let wave = (d / (divisor * scale)).sin();
            let threshold = 0.5 + wave * 0.4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_radial_peaks(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let divisor = (params.divisor.unwrap_or(5.0) as f64).max(0.5);
    let max_peaks = (params.max_peaks.unwrap_or(20.0) as usize).max(1);
    let base_min_dist = params.min_peak_distance.unwrap_or(60.0) as f64;
    let min_distance = (base_min_dist * scale).max(5.0);
    let min_distance_sq = min_distance * min_distance;
    let raw_thresh = params.peak_threshold.unwrap_or(50.0) as f64;
    let min_lum = (255.0 - raw_thresh * 3.5).max(50.0);
    let is_interference = params.interference.unwrap_or(false);
    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let oy = params.offset_y.unwrap_or(0.0) as f64;

    struct Peak {
        x: f64,
        y: f64,
    }

    let mut peaks: Vec<Peak> = Vec::new();
    let step = (8usize).max((min_distance * 0.5).floor() as usize);
    let y_end = h.saturating_sub(10);
    let x_end = w.saturating_sub(10);

    let mut y = 10usize;
    while y < y_end {
        if peaks.len() >= max_peaks {
            break;
        }
        let mut x = 10usize;
        while x < x_end {
            if peaks.len() >= max_peaks {
                break;
            }
            let idx = (y * w + x) * 4;
            let lum = 0.2126 * input[idx] as f64 + 0.7152 * input[idx + 1] as f64 + 0.0722 * input[idx + 2] as f64;
            if lum >= min_lum {
                let mut valid = true;
                let x_f = x as f64;
                let y_f = y as f64;
                for pk in &peaks {
                    let dx = x_f - pk.x;
                    let dy = y_f - pk.y;
                    if dx * dx + dy * dy < min_distance_sq - 0.01 {
                        valid = false;
                        break;
                    }
                }
                if valid {
                    peaks.push(Peak { x: x_f, y: y_f });
                }
            }
            x += step;
        }
        y += step;
    }

    if peaks.is_empty() {
        peaks.push(Peak {
            x: (w as f64) / 2.0,
            y: (h as f64) / 2.0,
        });
    }

    let eff_divisor = divisor * scale;



    for y in 0..h {
        let sy = y as f64 - oy;
        let y_w = y * w;
        for x in 0..w {
            let sx = x as f64 - ox;
            let idx = (y_w + x) * 4;
            let wave = if is_interference {
                let mut sum = 0.0;
                for pk in &peaks {
                    let d = js_hypot(sx - pk.x, sy - pk.y);
                    sum += (d / eff_divisor).sin();
                }
                sum / (peaks.len() as f64)
            } else {
                let mut closest = f64::INFINITY;
                for pk in &peaks {
                    let d = js_hypot(sx - pk.x, sy - pk.y);
                    if d < closest {
                        closest = d;
                    }
                }
                (closest / eff_divisor).sin()
            };

            let threshold = 0.5 + wave * 0.4;
            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );

            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_sine_distort(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let freq_a = params.freq_a.unwrap_or(8.0) as f64;
    let freq_b = params.freq_b.unwrap_or(12.0) as f64;
    let angle = (params.angle.unwrap_or(45.0) as f64) * (std::f64::consts::PI / 180.0);
    let cos_a = angle.cos();
    let sin_a = angle.sin();
    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let oy = params.offset_y.unwrap_or(0.0) as f64;

    for y in 0..h {
        let y_w = y * w;
        for x in 0..w {
            let sx = (x as f64 + ox) / scale;
            let sy = (y as f64 + oy) / scale;
            let rx = sx * cos_a + sy * sin_a;
            let wave = 0.5 * (((sx * freq_a) / 100.0).sin() + ((rx * freq_b) / 100.0).sin());
            let threshold = 0.5 + wave * 0.4;
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_sine_wave_modulation(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let freq = params.wave_frequency.unwrap_or(5.0) as f64;
    let amp = (params.wave_threshold.unwrap_or(10.0) as f64) / 25.0;
    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let oy = params.offset_y.unwrap_or(0.0) as f64;

    for y in 0..h {
        let y_w = y * w;
        for x in 0..w {
            let sx = (x as f64 + ox) / scale;
            let sy = (y as f64 + oy) / scale;
            let wave = ((sx * freq) / 50.0 + (sy * freq) / 50.0).sin();
            let threshold = 0.5 + wave * amp;
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_topography(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let warp = params.warp_intensity.unwrap_or(1.0) as f64;
    let period = ((10.0 * scale).round() as isize).max(2) as f64;
    let contour_mod = ((32.0 * scale).round() as isize).max(4) as f64;
    let contour_width = ((4.0 * scale).round() as isize).max(1) as f64;
    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let oy = params.offset_y.unwrap_or(0.0) as f64;

    for y in 0..h {
        let y_w = y * w;
        for x in 0..w {
            let idx = (y_w + x) * 4;
            let lum = 0.2126 * input[idx] as f64 + 0.7152 * input[idx + 1] as f64 + 0.0722 * input[idx + 2] as f64;
            let sx = x as f64 + ox;
            let sy = y as f64 + oy;
            let warped_lum = lum + (sx / period).sin() * (sy / period).cos() * warp * 15.0;
            let rem = ((warped_lum.round() as i64).abs().rem_euclid(contour_mod as i64)) as f64;
            let is_contour = rem < contour_width;
            let threshold = if is_contour { 0.75 } else { 0.25 };

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_vortex(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let base_swirl = params.swirl.or(params.twist_strength).unwrap_or(5.0) as f64;
    let swirl = base_swirl.max(0.5);
    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let oy = params.offset_y.unwrap_or(0.0) as f64;
    let cx = (w as f64) / 2.0 + ox;
    let cy = (h as f64) / 2.0 + oy;

    for y in 0..h {
        let y_w = y * w;
        for x in 0..w {
            let dx = x as f64 - cx;
            let dy = y as f64 - cy;
            let d = js_hypot(dx, dy) / scale;
            let theta = dy.atan2(dx);
            let wave = (theta * 4.0 + d / swirl).sin();
            let threshold = 0.5 + wave * 0.4;
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_wave(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    params: &RawAlgorithmParams,
) {
    let w = width as usize;
    let h = height as usize;
    let scale = if params.scale > 0.0 { params.scale as f64 } else { 1.0 }.max(0.05);
    let freq = params.frequency.unwrap_or(5.0) as f64;
    let ox = params.offset_x.unwrap_or(0.0) as f64;
    let _oy = params.offset_y.unwrap_or(0.0) as f64;

    for y in 0..h {
        let y_w = y * w;
        for x in 0..w {
            let sx = (x as f64 + ox) / scale;
            let wave = ((sx * freq) / 20.0).sin();
            let threshold = 0.5 + wave * 0.4;
            let idx = (y_w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn apply_algorithm_raw_params(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    algorithm_id: &str,
    palette: &[[u8; 4]],
    params: &RawAlgorithmParams,
) -> Result<(), String> {
    let norm_id = algorithm_id.to_lowercase().replace('-', "_");

    if is_grid_scaled_algorithm(&norm_id) && (params.scale - 1.0).abs() > 0.01 && params.scale >= 0.05 {
        let sw = ((width as f32 / params.scale).round() as u32).clamp(1, width * 2);
        let sh = ((height as f32 / params.scale).round() as u32).clamp(1, height * 2);

        let mut down_x_map = Vec::with_capacity(sw as usize);
        for x in 0..sw {
            let src_x = (x as usize * width as usize / sw as usize).min(width as usize - 1);
            down_x_map.push(src_x * 4);
        }

        let mut small_input = vec![0u8; (sw * sh * 4) as usize];
        for y in 0..sh {
            let src_row = (y as usize * height as usize / sh as usize).min(height as usize - 1) * width as usize * 4;
            let dst_row = y as usize * sw as usize * 4;
            for x in 0..sw {
                let s_idx = src_row + down_x_map[x as usize];
                let d_idx = dst_row + (x as usize * 4);
                small_input[d_idx..d_idx + 4].copy_from_slice(&input[s_idx..s_idx + 4]);
            }
        }

        let mut small_out = vec![0u8; (sw * sh * 4) as usize];
        let mut scaled_params = params.clone();
        scaled_params.scale = 1.0;

        apply_algorithm_raw_params(sw, sh, &small_input, &mut small_out, algorithm_id, palette, &scaled_params)?;

        let mut up_x_map = Vec::with_capacity(width as usize);
        for x in 0..width {
            let src_x = (x as usize * sw as usize / width as usize).min(sw as usize - 1);
            up_x_map.push(src_x * 4);
        }

        for y in 0..height {
            let src_row = (y as usize * sh as usize / height as usize).min(sh as usize - 1) * sw as usize * 4;
            let dst_row = y as usize * width as usize * 4;
            for x in 0..width {
                let s_idx = src_row + up_x_map[x as usize];
                let d_idx = dst_row + (x as usize * 4);
                out[d_idx] = small_out[s_idx];
                out[d_idx + 1] = small_out[s_idx + 1];
                out[d_idx + 2] = small_out[s_idx + 2];
                out[d_idx + 3] = input[d_idx + 3];
            }
        }
        return Ok(());
    }

    let lut = FastPaletteLUT::new(palette, Some(params.threshold));

    match norm_id.as_str() {
        "none" => {
            out.copy_from_slice(input);
            Ok(())
        }
        "floyd_steinberg" | "floyd" => {
            let serp = params.serpentine.unwrap_or(false);
            run_floyd_steinberg(width, height, input, out, &lut, serp, params.diffusion_strength);
            Ok(())
        }
        "atkinson" => {
            let serp = params.serpentine.unwrap_or(false);
            run_kernel_diffusion(width, height, input, out, &lut, &ATKINSON_KERNEL, 8.0, serp, 0.75 * params.diffusion_strength);
            Ok(())
        }
        "burkes" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &BURKES_KERNEL, 32.0, serp, params.diffusion_strength);
            Ok(())
        }
        "sierra" | "sierra_3" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &SIERRA3_KERNEL, 32.0, serp, params.diffusion_strength);
            Ok(())
        }
        "two_row_sierra" | "sierra_2" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &SIERRA2_KERNEL, 16.0, serp, params.diffusion_strength);
            Ok(())
        }
        "sierra_lite" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &SIERRA_LITE_KERNEL, 4.0, serp, params.diffusion_strength);
            Ok(())
        }
        "stucki" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &STUCKI_KERNEL, 42.0, serp, params.diffusion_strength);
            Ok(())
        }
        "jarvis_judice_ninke" | "jjn" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &JJN_KERNEL, 48.0, serp, params.diffusion_strength);
            Ok(())
        }
        "stevenson_arce" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &STEVENSON_ARCE_KERNEL, 200.0, serp, params.diffusion_strength);
            Ok(())
        }
        "fan" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &FAN_KERNEL, 16.0, serp, params.diffusion_strength);
            Ok(())
        }
        "shiau_fan" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &SHIAU_FAN_KERNEL, 16.0, serp, params.diffusion_strength);
            Ok(())
        }
        "shiau_fan_2" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &SHIAU_FAN_2_KERNEL, 8.0, serp, params.diffusion_strength);
            Ok(())
        }
        "false_floyd_steinberg" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &FALSE_FS_KERNEL, 8.0, serp, params.diffusion_strength);
            Ok(())
        }
        "minimized_avg_error" | "oatley" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &OATLEY_KERNEL, 16.0, serp, params.diffusion_strength);
            Ok(())
        }
        "dynamic_serpentine" => {
            run_floyd_steinberg(width, height, input, out, &lut, true, params.diffusion_strength);
            Ok(())
        }
        "artifact_modulation" => {
            let serp = params.serpentine.unwrap_or(false);
            run_kernel_diffusion(width, height, input, out, &lut, &ARTIFACT_MODULATION_KERNEL, 3.0, serp, params.diffusion_strength);
            Ok(())
        }
        "gaussian" => {
            dither_gaussian(width, height, input, out, &lut, params.distribution_spread.unwrap_or(1.0), params.diffusion_strength);
            Ok(())
        }
        "ostromukhov" | "ostromoukhov" => {
            let serp = params.serpentine.unwrap_or(true);
            dither_ostromoukhov(width, height, input, out, &lut, serp, params.diffusion_strength);
            Ok(())
        }
        "cracked_diffuse" => {
            dither_cracked_diffuse(width, height, input, out, &lut, params.cracked.unwrap_or(100.0), params.diffusion_strength);
            Ok(())
        }
        "fractal_diffuse" => {
            dither_fractal_diffuse(width, height, input, out, &lut, params.diffusion_strength);
            Ok(())
        }
        "vortex_diffusion" => {
            dither_vortex_diffusion(width, height, input, out, &lut, params.twist_strength.unwrap_or(0.0), params.spiral_frequency.unwrap_or(5.0), params.diffusion_strength);
            Ok(())
        }
        "bayer_matrix" => {
            let size = params.matrix_size.unwrap_or(4);
            dither_bayer_matrix(width, height, input, out, &lut, size, params.scale.max(0.05));
            Ok(())
        }
        "bayer_2x2" | "bayer2" => {
            dither_bayer_matrix(width, height, input, out, &lut, 2, params.scale.max(0.05));
            Ok(())
        }
        "bayer_4x4" | "bayer4" => {
            dither_bayer_matrix(width, height, input, out, &lut, 4, params.scale.max(0.05));
            Ok(())
        }
        "bayer_8x8" | "bayer8" => {
            dither_bayer_matrix(width, height, input, out, &lut, 8, params.scale.max(0.05));
            Ok(())
        }
        "bayer_16x16" | "bayer16" => {
            dither_bayer_matrix(width, height, input, out, &lut, 16, params.scale.max(0.05));
            Ok(())
        }
        "bayer_void" => {
            dither_bayer_void(width, height, input, out, &lut, params.scale.max(0.05), params.warp_intensity.unwrap_or(10.0));
            Ok(())
        }
        "bit_tone" => {
            dither_bit_tone(width, height, input, out, &lut, params.scale.max(0.05), params.dot_size.unwrap_or(4.0));
            Ok(())
        }
        "clustered_dot" => {
            dither_clustered_dot(width, height, input, out, &lut, params.scale.max(0.05));
            Ok(())
        }
        "mosaic" => {
            dither_mosaic(width, height, input, out, &lut, params.scale.max(0.05), params.block_size.unwrap_or(8.0));
            Ok(())
        }
        "random_ordered" => {
            dither_random_ordered(width, height, input, out, &lut, params.scale.max(0.05));
            Ok(())
        }
        "thresholder" => {
            let freq = params.modulation_frequency.unwrap_or(1.0);
            dither_thresholder(width, height, input, out, &lut, params.scale, freq, params.offset_x.unwrap_or(0.0), params.offset_y.unwrap_or(0.0));
            Ok(())
        }
        "fixed_threshold" | "threshold" => {
            dither_pure_threshold(width, height, input, out, &lut, params.threshold);
            Ok(())
        }
        "pigeon_diffusion" | "pigeon" => {
            let serp = params.serpentine.unwrap_or(true);
            run_kernel_diffusion(width, height, input, out, &lut, &PIGEON_KERNEL, 14.0, serp, params.diffusion_strength);
            Ok(())
        }
        "riemersma" => {
            dither_fractal_diffuse(width, height, input, out, &lut, params.diffusion_strength);
            Ok(())
        }
        "clustered_dot_8x8" => {
            dither_clustered_dot_8x8(width, height, input, out, &lut, params.scale.max(0.05));
            Ok(())
        }
        "dispersed_dot_6x6" => {
            dither_dispersed_dot_6x6(width, height, input, out, &lut, params.scale.max(0.05));
            Ok(())
        }
        "smooth_diffuse" => {
            let smoothness = params.smoothing.unwrap_or(3.0).max(0.0);
            let mut p_copy = params.clone();
            p_copy.line_scale = Some(params.line_scale.unwrap_or(2.0).max(1.0));
            p_copy.bleed = Some(params.bleed.unwrap_or(0.65));
            p_copy.smoothing = Some(smoothness);
            run_1d_horizontal_diffusion(width, height, input, out, &lut, &p_copy, |x, sy, _lum| {
                ((x + sy) as f32 * 0.15).sin() * (smoothness * 0.04)
            }, params.diffusion_strength);
            Ok(())
        }
        "stucki_diffusion_lines" => {
            let emphasis = params.line_emphasis.or(params.line_scale).unwrap_or(5.0) / 5.0;
            run_1d_horizontal_diffusion(width, height, input, out, &lut, params, |_x, sy, _lum| {
                if (sy % 4) < 2 { 0.3 * emphasis } else { -0.3 * emphasis }
            }, params.diffusion_strength * emphasis);
            Ok(())
        }
        "atkinson_line_modulation" => {
            let mod_strength = params.modulation_strength.unwrap_or(5.0) / 5.0;
            let h_bias = params.horizontal_bias.unwrap_or(5.0) / 5.0;
            run_1d_horizontal_diffusion(width, height, input, out, &lut, params, |x, sy, _lum| {
                ((x as f32 * 0.2).sin() * h_bias + (sy as f32 * 0.3).cos()) * 0.25 * mod_strength
            }, params.diffusion_strength);
            Ok(())
        }
        "atkinson_vhs" => {
            let line_count = params.line_count.unwrap_or(6.0).max(1.0);
            let h_f = height as f32;
            run_1d_horizontal_diffusion(width, height, input, out, &lut, params, |_x, sy, _lum| {
                let band = (sy as f32 * line_count / h_f.max(1.0)).fract();
                if band > 0.85 { 0.4 } else { 0.0 }
            }, params.diffusion_strength);
            Ok(())
        }
        "artifact_modulation_glitch" => {
            dither_artifact_modulation_glitch(width, height, input, out, &lut, params);
            Ok(())
        }
        "glitch" => {
            dither_glitch(width, height, input, out, &lut, params);
            Ok(())
        }
        "uniform_modulation_x" => {
            let scale = params.scale.max(0.05);
            let effective_line_scale = (params.line_scale.unwrap_or(1.0) * scale).max(1.0);
            run_1d_horizontal_diffusion(width, height, input, out, &lut, params, |_x, sy, _lum| {
                if effective_line_scale > 1.0 {
                    (if (sy & 1) == 0 { 1.0 } else { -1.0 }) * ((effective_line_scale - 1.0) * 0.08).min(1.0)
                } else {
                    0.0
                }
            }, params.diffusion_strength);
            Ok(())
        }
        "contrast_aware_x" => {
            let sensitivity = params.scale.max(0.05) * 5.0;
            let mut p_copy = params.clone();
            p_copy.line_scale = Some(params.line_scale.unwrap_or(4.0));
            let w_sz = width as usize;
            run_1d_horizontal_diffusion(width, height, input, out, &lut, &p_copy, |x, sy, lum| {
                let next_x = (x + 1).min(w_sz - 1);
                let next_idx = (sy * w_sz + next_x) * 4;
                let next_lum = 0.299 * input[next_idx] as f32 + 0.587 * input[next_idx + 1] as f32 + 0.114 * input[next_idx + 2] as f32;
                let edge = (lum - next_lum).abs() / 255.0;
                (edge * sensitivity * 0.2).clamp(-0.7, 0.5)
            }, params.diffusion_strength);
            Ok(())
        }
        "modulated_diffuse_x" => {
            let num_lines = params.line_scale.unwrap_or(6.0).max(1.0);
            let mut p_copy = params.clone();
            p_copy.line_scale = Some(1.0);
            let w_f = width as f32;
            run_1d_horizontal_diffusion(width, height, input, out, &lut, &p_copy, |x, _sy, _lum| {
                0.45 * ((std::f32::consts::PI * 2.0 * num_lines * x as f32) / w_f.max(1.0)).sin()
            }, params.diffusion_strength);
            Ok(())
        }
        "uniform_modulation_y" => {
            let scale = params.scale.max(0.05);
            let effective_line_scale = (params.line_scale.unwrap_or(1.0) * scale).max(1.0);
            run_1d_vertical_diffusion(width, height, input, out, &lut, params, |sx, _y, _lum| {
                if effective_line_scale > 1.0 {
                    (if (sx & 1) == 0 { 1.0 } else { -1.0 }) * ((effective_line_scale - 1.0) * 0.08).min(1.0)
                } else {
                    0.0
                }
            }, params.diffusion_strength);
            Ok(())
        }
        "contrast_aware_y" => {
            let sensitivity = params.scale.max(0.05) * 5.0;
            let mut p_copy = params.clone();
            p_copy.line_scale = Some(params.line_scale.unwrap_or(4.0));
            let w_sz = width as usize;
            let h_sz = height as usize;
            run_1d_vertical_diffusion(width, height, input, out, &lut, &p_copy, |sx, y, lum| {
                let next_y = (y + 1).min(h_sz - 1);
                let next_idx = (next_y * w_sz + sx) * 4;
                let next_lum = 0.299 * input[next_idx] as f32 + 0.587 * input[next_idx + 1] as f32 + 0.114 * input[next_idx + 2] as f32;
                let edge = (lum - next_lum).abs() / 255.0;
                (edge * sensitivity * 0.2).clamp(-0.7, 0.5)
            }, params.diffusion_strength);
            Ok(())
        }
        "modulated_diffuse_y" => {
            let num_lines = params.line_scale.unwrap_or(6.0).max(1.0);
            let mut p_copy = params.clone();
            p_copy.line_scale = Some(1.0);
            let h_f = height as f32;
            run_1d_vertical_diffusion(width, height, input, out, &lut, &p_copy, |_sx, y, _lum| {
                0.45 * ((std::f32::consts::PI * 2.0 * num_lines * y as f32) / h_f.max(1.0)).sin()
            }, params.diffusion_strength);
            Ok(())
        }
        "wave_modulation_x" => {
            let freq = params.frequency.unwrap_or(5.0).max(0.1);
            let amp = (params.amplitude.unwrap_or(50.0) / 100.0).clamp(0.0, 1.0);
            let s = params.scale.max(0.05);
            let eff_freq = freq / s;
            let w_f = width as f32;
            run_1d_horizontal_diffusion(width, height, input, out, &lut, params, |x, _sy, _lum| {
                amp * ((std::f32::consts::PI * 2.0 * eff_freq * x as f32) / w_f.max(1.0)).sin()
            }, params.diffusion_strength);
            Ok(())
        }
        "wave_modulation_y" => {
            let freq = params.frequency.unwrap_or(5.0).max(0.1);
            let amp = (params.amplitude.unwrap_or(50.0) / 100.0).clamp(0.0, 1.0);
            let s = params.scale.max(0.05);
            let eff_freq = freq / s;
            let h_f = height as f32;
            run_1d_vertical_diffusion(width, height, input, out, &lut, params, |_sx, y, _lum| {
                amp * ((std::f32::consts::PI * 2.0 * eff_freq * y as f32) / h_f.max(1.0)).sin()
            }, params.diffusion_strength);
            Ok(())
        }
        "waveform" => {
            let density = params.wave_density.or(params.density).unwrap_or(1.0).max(0.1);
            let s = params.scale.max(0.05);
            run_1d_horizontal_diffusion(width, height, input, out, &lut, params, |x, _sy, lum| {
                0.35 * (((x as f32 / s) * density) / 10.0 + (lum / 255.0) * std::f32::consts::PI * 2.0).sin()
            }, params.diffusion_strength);
            Ok(())
        }
        "waveform_alt" => {
            let blend = params.modulation_blend.unwrap_or(5.0) / 10.0;
            let s = params.scale.max(0.05);
            run_1d_horizontal_diffusion(width, height, input, out, &lut, params, |x, _sy, lum| {
                let sx = x as f32 / s;
                let freq_wave = ((sx * lum * 0.05) / 10.0).sin();
                let amp_wave = (sx * 0.2).cos() * (lum / 255.0);
                0.35 * (freq_wave * blend + amp_wave * (1.0 - blend))
            }, params.diffusion_strength);
            Ok(())
        }
        "color_separation" => {
            dither_color_separation(width, height, input, out, &lut, params);
            Ok(())
        }
        "orb_diffuse" => {
            dither_orb_diffuse(width, height, input, out, &lut, params);
            Ok(())
        }
        "orb_diffuse_x" => {
            dither_orb_diffuse_x(width, height, input, out, &lut, params);
            Ok(())
        }
        "orb_diffuse_y" => {
            dither_orb_diffuse_y(width, height, input, out, &lut, params);
            Ok(())
        }
        "orb_matrix" => {
            dither_orb_matrix(width, height, input, out, &lut, params);
            Ok(())
        }
        "ordered_modulation" => {
            let s = params.scale.max(0.05);
            let line_scale = params.line_scale.unwrap_or(4.0).max(1.0);
            let bayer = [
                0.5 / 16.0,  8.5 / 16.0,  2.5 / 16.0, 10.5 / 16.0,
                12.5 / 16.0, 4.5 / 16.0, 14.5 / 16.0,  6.5 / 16.0,
                3.5 / 16.0, 11.5 / 16.0,  1.5 / 16.0,  9.5 / 16.0,
                15.5 / 16.0, 7.5 / 16.0, 13.5 / 16.0,  5.5 / 16.0,
            ];
            let w_sz = width as usize;
            let h_sz = height as usize;
            for y in 0..h_sz {
                let sy = (y as f32 / s).floor() as usize;
                for x in 0..w_sz {
                    let sx = (x as f32 / s).floor() as usize;
                    let idx = (y * w_sz + x) * 4;
                    let b = bayer[(sy & 3) * 4 + (sx & 3)];
                    let wave = ((sx + sy) as f32 * 0.25 * (line_scale * 0.25)).sin() * (s * 0.15).min(0.45);
                    let thresh = (b + wave).clamp(0.05, 0.95);
                    let chosen = lut.inline_pair_match(input[idx] as f32, input[idx + 1] as f32, input[idx + 2] as f32, thresh);
                    out[idx] = chosen[0];
                    out[idx + 1] = chosen[1];
                    out[idx + 2] = chosen[2];
                    out[idx + 3] = input[idx + 3];
                }
            }
            Ok(())
        }
        "horizontal_lines"
        | "vertical_lines"
        | "diagonal_hatch"
        | "woven_basket"
        | "hex_stipple"
        | "spatial_lattice"
        | "brick_wall"
        | "herringbone"
        | "radial_concentric"
        | "spiral_screen"
        | "interleaved_gradient_noise"
        | "roberts_quasirandom"
        | "cyber_matrix" => {
            dither_raw_pattern(width, height, input, out, &lut, &norm_id, params.scale.max(0.05), params);
            Ok(())
        }
        "beehive" => {
            dither_beehive(width, height, input, out, &lut, params);
            Ok(())
        }
        "diagonal" => {
            dither_diagonal(width, height, input, out, &lut, params);
            Ok(())
        }
        "displace_contour" | "displace-contour" => {
            dither_displace_contour(width, height, input, out, &lut, params);
            Ok(())
        }
        "dotted_lines" | "dotted-lines" => {
            dither_dotted_lines(width, height, input, out, &lut, params);
            Ok(())
        }
        "noise" => {
            dither_noise(width, height, input, out, &lut, params);
            Ok(())
        }
        "radial_burst" | "radial-burst" => {
            dither_radial_burst(width, height, input, out, &lut, params);
            Ok(())
        }
        "radial_peaks" | "radial-peaks" => {
            dither_radial_peaks(width, height, input, out, &lut, params);
            Ok(())
        }
        "sine_distort" | "sine-distort" => {
            dither_sine_distort(width, height, input, out, &lut, params);
            Ok(())
        }
        "sine_wave_modulation" | "sine-wave-modulation" => {
            dither_sine_wave_modulation(width, height, input, out, &lut, params);
            Ok(())
        }
        "topography" => {
            dither_topography(width, height, input, out, &lut, params);
            Ok(())
        }
        "vortex" => {
            dither_vortex(width, height, input, out, &lut, params);
            Ok(())
        }
        "wave" => {
            dither_wave(width, height, input, out, &lut, params);
            Ok(())
        }
        "block_tone" => {
            dither_block_tone(width, height, input, out, &lut, params);
            Ok(())
        }
        "pop_tone" => {
            dither_pop_tone(width, height, input, out, &lut, params);
            Ok(())
        }
        "camo" => {
            dither_camo(width, height, input, out, &lut, params);
            Ok(())
        }
        "checkers" | "checkered" => {
            dither_checkers(width, height, input, out, &lut, params);
            Ok(())
        }
        "circle_grid" => {
            dither_circle_grid(width, height, input, out, &lut, params);
            Ok(())
        }
        "crosshatch" => {
            dither_crosshatch(width, height, input, out, &lut, params);
            Ok(())
        }
        "diamond_grid" => {
            dither_diamond_grid(width, height, input, out, &lut, params);
            Ok(())
        }
        "diamond" | "concentric_diamond" => {
            dither_diamond(width, height, input, out, &lut, params);
            Ok(())
        }
        "gridlock_traffic" => {
            dither_gridlock_traffic(width, height, input, out, &lut, params);
            Ok(())
        }
        "heart_grid" => {
            dither_heart_grid(width, height, input, out, &lut, params);
            Ok(())
        }
        "print_pattern" => {
            dither_print_pattern(width, height, input, out, &lut, params);
            Ok(())
        }
        "square_mosaic" => {
            dither_square_mosaic(width, height, input, out, &lut, params);
            Ok(())
        }
        "stippling" => {
            dither_stippling(width, height, input, out, &lut, params);
            Ok(())
        }
        "hexa_poly" => {
            dither_hexa_poly(width, height, input, out, &lut, params);
            Ok(())
        }
        "low_poly" => {
            dither_low_poly(width, height, input, out, &lut, params);
            Ok(())
        }
        "penta_poly" => {
            dither_penta_poly(width, height, input, out, &lut, params);
            Ok(())
        }
        "tri_poly" => {
            dither_tri_poly(width, height, input, out, &lut, params);
            Ok(())
        }
        other => {
            let mut img = RgbaImage::from_raw(width, height, input.to_vec())
                .ok_or_else(|| "Failed to construct image buffer from slice".to_string())?;
            let settings = DitherSettings {
                algorithm_id: other.to_string(),
                threshold: params.threshold,
                scale: params.scale,
                diffusion_strength: params.diffusion_strength,
                serpentine: params.serpentine.unwrap_or(false),
                temporal_seed: params.temporal_seed,
                depth: params.depth.unwrap_or(8),
                noise_amount: params.noise_amount.unwrap_or(0.0),
                palette: palette.to_vec(),
                ..Default::default()
            };
            apply_glitch_or_special_algorithm(&mut img, &settings);
            out.copy_from_slice(img.as_raw());
            Ok(())
        }
    }
}

#[allow(dead_code)]
pub fn apply_algorithm_raw(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    algorithm_id: &str,
    palette: &[[u8; 4]],
    threshold: f32,
    scale: f32,
    diffusion_strength: f32,
    serpentine: bool,
    temporal_seed: u32,
) -> Result<(), String> {
    let params = RawAlgorithmParams {
        threshold,
        scale,
        diffusion_strength,
        serpentine: Some(serpentine),
        temporal_seed,
        ..Default::default()
    };
    apply_algorithm_raw_params(width, height, input, out, algorithm_id, palette, &params)
}

pub fn apply_algorithm_by_id(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    let raw = image.as_raw().clone();
    let mut out = vec![0u8; raw.len()];
    let params = RawAlgorithmParams {
        threshold: settings.threshold,
        scale: settings.scale,
        diffusion_strength: settings.diffusion_strength,
        serpentine: Some(settings.serpentine),
        temporal_seed: settings.temporal_seed,
        depth: Some(settings.depth),
        noise_amount: Some(settings.noise_amount),
        ..Default::default()
    };
    if apply_algorithm_raw_params(
        width,
        height,
        &raw,
        &mut out,
        &settings.algorithm_id,
        &settings.palette,
        &params,
    ).is_ok() {
        if let Some(res) = RgbaImage::from_raw(width, height, out) {
            *image = res;
        }
    }
}

pub fn apply_glitch_or_special_algorithm(image: &mut RgbaImage, settings: &DitherSettings) {
    let lut = FastPaletteLUT::new(&settings.palette, Some(settings.threshold));
    let raw_id = settings.algorithm_id.as_str();
    let norm_id = raw_id.to_lowercase().replace('-', "_");
    match norm_id.as_str() {
        "scanline_jitter" => apply_scanline_jitter(image, settings, &lut),
        "chromatic_offset" => apply_chromatic_offset(image, settings, &lut),
        "pixel_sorting" => apply_pixel_sorting(image, settings, &lut),
        "digital_artifacts" => apply_digital_artifacts(image, settings, &lut),
        "interlacing_tear" => apply_interlacing_tear(image, settings, &lut),
        "crt_bloom" => apply_crt_bloom(image, settings, &lut),
        "bit_crush" => apply_bit_crush(image, settings, &lut),
        "vhs_tracking" => apply_vhs_tracking(image, settings, &lut),
        "bad_ram" => apply_bad_ram(image, settings, &lut),
        "wave_distortion" => apply_wave_distortion(image, settings, &lut),
        "quant_slice" => apply_quant_slice(image, settings, &lut),
        "matrix_rake" => apply_matrix_rake(image, settings, &lut),
        "static_snow" => apply_static_snow(image, settings, &lut),
        "sync_pulse_loss" => apply_sync_pulse_loss(image, settings, &lut),
        "feedback_ringing" => apply_feedback_ringing(image, settings, &lut),
        "chroma_subsample" => apply_chroma_subsample(image, settings, &lut),
        "moire_glitch" => apply_moire_glitch(image, settings, &lut),

        "random_threshold" => apply_threshold(image, settings, true, &lut),
        "blue_noise" => apply_blue_noise(image, settings, &lut),
        "gaussian_noise" => apply_gaussian_noise(image, settings, &lut),
        "perlin_gradient" => apply_perlin_gradient(image, settings, &lut),
        "tpdf_noise" => apply_tpdf_noise(image, settings, &lut),
        "companding_curve" => apply_companding_curve(image, settings, &lut),
        "sobel_feature" => apply_sobel_feature(image, settings, &lut),
        "laplacian_mod" => apply_laplacian_mod(image, settings, &lut),
        "directional_gradient" => apply_directional_gradient(image, settings, &lut),
        "voronoi_cellular" => apply_voronoi_cellular(image, settings, &lut),
        "diffusion_blur" => apply_diffusion_blur(image, settings),
        "quantum_stipple" => apply_quantum_stipple(image, settings, &lut),

        "ignition_glow" => apply_ignition_glow(image, settings, &lut),
        "temporal_kinetic" => apply_temporal_kinetic(image, settings, &lut),

        _ => apply_error_diffusion(image, settings, &FS_KERNEL, 16.0),
    }
}

// -------------------------------------------------------------
// KERNEL DEFINITIONS
// -------------------------------------------------------------
#[derive(Clone, Copy, Debug)]
pub struct KernelEntry {
    pub dx: i32,
    pub dy: i32,
    pub weight: f64,
}

const FS_KERNEL: [KernelEntry; 4] = [
    KernelEntry { dx: 1, dy: 0, weight: 7.0 },
    KernelEntry { dx: -1, dy: 1, weight: 3.0 },
    KernelEntry { dx: 0, dy: 1, weight: 5.0 },
    KernelEntry { dx: 1, dy: 1, weight: 1.0 },
];

const ATKINSON_KERNEL: [KernelEntry; 6] = [
    KernelEntry { dx: 1, dy: 0, weight: 1.0 },
    KernelEntry { dx: 2, dy: 0, weight: 1.0 },
    KernelEntry { dx: -1, dy: 1, weight: 1.0 },
    KernelEntry { dx: 0, dy: 1, weight: 1.0 },
    KernelEntry { dx: 1, dy: 1, weight: 1.0 },
    KernelEntry { dx: 0, dy: 2, weight: 1.0 },
];

const JJN_KERNEL: [KernelEntry; 12] = [
    KernelEntry { dx: 1, dy: 0, weight: 7.0 },
    KernelEntry { dx: 2, dy: 0, weight: 5.0 },
    KernelEntry { dx: -2, dy: 1, weight: 3.0 },
    KernelEntry { dx: -1, dy: 1, weight: 5.0 },
    KernelEntry { dx: 0, dy: 1, weight: 7.0 },
    KernelEntry { dx: 1, dy: 1, weight: 5.0 },
    KernelEntry { dx: 2, dy: 1, weight: 3.0 },
    KernelEntry { dx: -2, dy: 2, weight: 1.0 },
    KernelEntry { dx: -1, dy: 2, weight: 3.0 },
    KernelEntry { dx: 0, dy: 2, weight: 5.0 },
    KernelEntry { dx: 1, dy: 2, weight: 3.0 },
    KernelEntry { dx: 2, dy: 2, weight: 1.0 },
];

const STUCKI_KERNEL: [KernelEntry; 12] = [
    KernelEntry { dx: 1, dy: 0, weight: 8.0 },
    KernelEntry { dx: 2, dy: 0, weight: 4.0 },
    KernelEntry { dx: -2, dy: 1, weight: 2.0 },
    KernelEntry { dx: -1, dy: 1, weight: 4.0 },
    KernelEntry { dx: 0, dy: 1, weight: 8.0 },
    KernelEntry { dx: 1, dy: 1, weight: 4.0 },
    KernelEntry { dx: 2, dy: 1, weight: 2.0 },
    KernelEntry { dx: -2, dy: 2, weight: 1.0 },
    KernelEntry { dx: -1, dy: 2, weight: 2.0 },
    KernelEntry { dx: 0, dy: 2, weight: 4.0 },
    KernelEntry { dx: 1, dy: 2, weight: 2.0 },
    KernelEntry { dx: 2, dy: 2, weight: 1.0 },
];

const BURKES_KERNEL: [KernelEntry; 7] = [
    KernelEntry { dx: 1, dy: 0, weight: 8.0 },
    KernelEntry { dx: 2, dy: 0, weight: 4.0 },
    KernelEntry { dx: -2, dy: 1, weight: 2.0 },
    KernelEntry { dx: -1, dy: 1, weight: 4.0 },
    KernelEntry { dx: 0, dy: 1, weight: 8.0 },
    KernelEntry { dx: 1, dy: 1, weight: 4.0 },
    KernelEntry { dx: 2, dy: 1, weight: 2.0 },
];

const SIERRA3_KERNEL: [KernelEntry; 10] = [
    KernelEntry { dx: 1, dy: 0, weight: 5.0 },
    KernelEntry { dx: 2, dy: 0, weight: 3.0 },
    KernelEntry { dx: -2, dy: 1, weight: 2.0 },
    KernelEntry { dx: -1, dy: 1, weight: 4.0 },
    KernelEntry { dx: 0, dy: 1, weight: 5.0 },
    KernelEntry { dx: 1, dy: 1, weight: 4.0 },
    KernelEntry { dx: 2, dy: 1, weight: 2.0 },
    KernelEntry { dx: -1, dy: 2, weight: 2.0 },
    KernelEntry { dx: 0, dy: 2, weight: 3.0 },
    KernelEntry { dx: 1, dy: 2, weight: 2.0 },
];

const SIERRA2_KERNEL: [KernelEntry; 7] = [
    KernelEntry { dx: 1, dy: 0, weight: 4.0 },
    KernelEntry { dx: 2, dy: 0, weight: 3.0 },
    KernelEntry { dx: -2, dy: 1, weight: 1.0 },
    KernelEntry { dx: -1, dy: 1, weight: 2.0 },
    KernelEntry { dx: 0, dy: 1, weight: 3.0 },
    KernelEntry { dx: 1, dy: 1, weight: 2.0 },
    KernelEntry { dx: 2, dy: 1, weight: 1.0 },
];

const SIERRA_LITE_KERNEL: [KernelEntry; 3] = [
    KernelEntry { dx: 1, dy: 0, weight: 2.0 },
    KernelEntry { dx: -1, dy: 1, weight: 1.0 },
    KernelEntry { dx: 0, dy: 1, weight: 1.0 },
];

const STEVENSON_ARCE_KERNEL: [KernelEntry; 12] = [
    KernelEntry { dx: 2, dy: 0, weight: 32.0 },
    KernelEntry { dx: -3, dy: 1, weight: 12.0 },
    KernelEntry { dx: -1, dy: 1, weight: 26.0 },
    KernelEntry { dx: 1, dy: 1, weight: 30.0 },
    KernelEntry { dx: 3, dy: 1, weight: 16.0 },
    KernelEntry { dx: -2, dy: 2, weight: 12.0 },
    KernelEntry { dx: 0, dy: 2, weight: 26.0 },
    KernelEntry { dx: 2, dy: 2, weight: 12.0 },
    KernelEntry { dx: -3, dy: 3, weight: 5.0 },
    KernelEntry { dx: -1, dy: 3, weight: 12.0 },
    KernelEntry { dx: 1, dy: 3, weight: 12.0 },
    KernelEntry { dx: 3, dy: 3, weight: 5.0 },
];

const FAN_KERNEL: [KernelEntry; 3] = [
    KernelEntry { dx: 1, dy: 0, weight: 7.0 },
    KernelEntry { dx: -1, dy: 1, weight: 1.0 },
    KernelEntry { dx: 0, dy: 1, weight: 3.0 },
];

const SHIAU_FAN_KERNEL: [KernelEntry; 4] = [
    KernelEntry { dx: 1, dy: 0, weight: 7.0 },
    KernelEntry { dx: -2, dy: 1, weight: 1.0 },
    KernelEntry { dx: -1, dy: 1, weight: 3.0 },
    KernelEntry { dx: 0, dy: 1, weight: 5.0 },
];

const SHIAU_FAN_2_KERNEL: [KernelEntry; 3] = [
    KernelEntry { dx: 1, dy: 0, weight: 4.0 },
    KernelEntry { dx: -1, dy: 1, weight: 1.0 },
    KernelEntry { dx: 0, dy: 1, weight: 3.0 },
];

const FALSE_FS_KERNEL: [KernelEntry; 3] = [
    KernelEntry { dx: 1, dy: 0, weight: 3.0 },
    KernelEntry { dx: 0, dy: 1, weight: 3.0 },
    KernelEntry { dx: 1, dy: 1, weight: 2.0 },
];

const OATLEY_KERNEL: [KernelEntry; 6] = [
    KernelEntry { dx: 1, dy: 0, weight: 7.0 },
    KernelEntry { dx: 2, dy: 0, weight: 2.0 },
    KernelEntry { dx: -1, dy: 1, weight: 1.0 },
    KernelEntry { dx: 0, dy: 1, weight: 3.0 },
    KernelEntry { dx: 1, dy: 1, weight: 2.0 },
    KernelEntry { dx: 0, dy: 2, weight: 1.0 },
];

const ARTIFACT_MODULATION_KERNEL: [KernelEntry; 3] = [
    KernelEntry { dx: 1, dy: 0, weight: 1.0 },
    KernelEntry { dx: 0, dy: 1, weight: 1.0 },
    KernelEntry { dx: 1, dy: 1, weight: 1.0 },
];

const PIGEON_KERNEL: [KernelEntry; 6] = [
    KernelEntry { dx: 1, dy: 0, weight: 4.0 },
    KernelEntry { dx: 2, dy: 0, weight: 2.0 },
    KernelEntry { dx: -2, dy: 1, weight: 1.0 },
    KernelEntry { dx: 0, dy: 1, weight: 4.0 },
    KernelEntry { dx: 2, dy: 1, weight: 1.0 },
    KernelEntry { dx: 0, dy: 2, weight: 2.0 },
];


// -------------------------------------------------------------
// HIGH-PERFORMANCE 1:1 PARITY DIFFUSION & DITHER KERNELS
// -------------------------------------------------------------

pub fn run_floyd_steinberg(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    serpentine: bool,
    error_mult: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let factor = (error_mult / 16.0) as f64;

    if lut.is_tonal_ramp {
        let mut row0 = vec![0.0f32; w];
        let mut row1 = vec![0.0f32; w];
        let mut curr_err = &mut row0[..];
        let mut next_err = &mut row1[..];

        for y in 0..h {
            let is_odd = (y & 1) == 1;
            let reverse = serpentine && is_odd;
            let row_idx = y * w * 4;

            if !reverse {
                for x in 0..w {
                    let idx = row_idx + x * 4;
                    let lum = 0.2126f64 * (input[idx] as f64)
                        + 0.7152f64 * (input[idx + 1] as f64)
                        + 0.0722f64 * (input[idx + 2] as f64);
                    let cur_lum = (lum + curr_err[x] as f64).clamp(0.0, 255.0);

                    let chosen_idx = lut.quantize_lum_f64(cur_lum);
                    let col = lut.raw_palette[chosen_idx];
                    out[idx] = col[0];
                    out[idx + 1] = col[1];
                    out[idx + 2] = col[2];
                    out[idx + 3] = input[idx + 3];

                    let chosen_lum = lut.luminances_f64[chosen_idx];
                    let err = ((cur_lum - chosen_lum) * factor) as f32;

                    if x + 1 < w {
                        curr_err[x + 1] += err * 7.0;
                    }
                    if y + 1 < h {
                        if x > 0 {
                            next_err[x - 1] += err * 3.0;
                        }
                        next_err[x] += err * 5.0;
                        if x + 1 < w {
                            next_err[x + 1] += err * 1.0;
                        }
                    }
                }
            } else {
                for x in (0..w).rev() {
                    let idx = row_idx + x * 4;
                    let lum = 0.2126f64 * (input[idx] as f64)
                        + 0.7152f64 * (input[idx + 1] as f64)
                        + 0.0722f64 * (input[idx + 2] as f64);
                    let cur_lum = (lum + curr_err[x] as f64).clamp(0.0, 255.0);

                    let chosen_idx = lut.quantize_lum_f64(cur_lum);
                    let col = lut.raw_palette[chosen_idx];
                    out[idx] = col[0];
                    out[idx + 1] = col[1];
                    out[idx + 2] = col[2];
                    out[idx + 3] = input[idx + 3];

                    let chosen_lum = lut.luminances_f64[chosen_idx];
                    let err = ((cur_lum - chosen_lum) * factor) as f32;

                    if x > 0 {
                        curr_err[x - 1] += err * 7.0;
                    }
                    if y + 1 < h {
                        if x + 1 < w {
                            next_err[x + 1] += err * 3.0;
                        }
                        next_err[x] += err * 5.0;
                        if x > 0 {
                            next_err[x - 1] += err * 1.0;
                        }
                    }
                }
            }

            curr_err.fill(0.0);
            std::mem::swap(&mut curr_err, &mut next_err);
        }
    } else {
        let mut row0 = vec![0.0f32; w * 3];
        let mut row1 = vec![0.0f32; w * 3];
        let mut curr_err = &mut row0[..];
        let mut next_err = &mut row1[..];
        let max_err = 128.0f64;

        for y in 0..h {
            let is_odd = (y & 1) == 1;
            let reverse = serpentine && is_odd;
            let row_idx = y * w * 4;

            if !reverse {
                for x in 0..w {
                    let idx = row_idx + x * 4;
                    let x3 = x * 3;

                    let r = (input[idx] as f64 + curr_err[x3] as f64).clamp(0.0, 255.0);
                    let g = (input[idx + 1] as f64 + curr_err[x3 + 1] as f64).clamp(0.0, 255.0);
                    let b = (input[idx + 2] as f64 + curr_err[x3 + 2] as f64).clamp(0.0, 255.0);

                    let matched = lut.inline_match_f64(r, g, b);
                    out[idx] = matched[0];
                    out[idx + 1] = matched[1];
                    out[idx + 2] = matched[2];
                    out[idx + 3] = input[idx + 3];

                    let err_r = ((r - matched[0] as f64).clamp(-max_err, max_err) * factor) as f32;
                    let err_g = ((g - matched[1] as f64).clamp(-max_err, max_err) * factor) as f32;
                    let err_b = ((b - matched[2] as f64).clamp(-max_err, max_err) * factor) as f32;

                    if x + 1 < w {
                        curr_err[x3 + 3] += err_r * 7.0;
                        curr_err[x3 + 4] += err_g * 7.0;
                        curr_err[x3 + 5] += err_b * 7.0;
                    }
                    if y + 1 < h {
                        if x > 0 {
                            next_err[x3 - 3] += err_r * 3.0;
                            next_err[x3 - 2] += err_g * 3.0;
                            next_err[x3 - 1] += err_b * 3.0;
                        }
                        next_err[x3] += err_r * 5.0;
                        next_err[x3 + 1] += err_g * 5.0;
                        next_err[x3 + 2] += err_b * 5.0;
                        if x + 1 < w {
                            next_err[x3 + 3] += err_r * 1.0;
                            next_err[x3 + 4] += err_g * 1.0;
                            next_err[x3 + 5] += err_b * 1.0;
                        }
                    }
                }
            } else {
                for x in (0..w).rev() {
                    let idx = row_idx + x * 4;
                    let x3 = x * 3;

                    let r = (input[idx] as f64 + curr_err[x3] as f64).clamp(0.0, 255.0);
                    let g = (input[idx + 1] as f64 + curr_err[x3 + 1] as f64).clamp(0.0, 255.0);
                    let b = (input[idx + 2] as f64 + curr_err[x3 + 2] as f64).clamp(0.0, 255.0);

                    let matched = lut.inline_match_f64(r, g, b);
                    out[idx] = matched[0];
                    out[idx + 1] = matched[1];
                    out[idx + 2] = matched[2];
                    out[idx + 3] = input[idx + 3];

                    let err_r = ((r - matched[0] as f64).clamp(-max_err, max_err) * factor) as f32;
                    let err_g = ((g - matched[1] as f64).clamp(-max_err, max_err) * factor) as f32;
                    let err_b = ((b - matched[2] as f64).clamp(-max_err, max_err) * factor) as f32;

                    if x > 0 {
                        curr_err[x3 - 3] += err_r * 7.0;
                        curr_err[x3 - 2] += err_g * 7.0;
                        curr_err[x3 - 1] += err_b * 7.0;
                    }
                    if y + 1 < h {
                        if x + 1 < w {
                            next_err[x3 + 3] += err_r * 3.0;
                            next_err[x3 + 4] += err_g * 3.0;
                            next_err[x3 + 5] += err_b * 3.0;
                        }
                        next_err[x3] += err_r * 5.0;
                        next_err[x3 + 1] += err_g * 5.0;
                        next_err[x3 + 2] += err_b * 5.0;
                        if x > 0 {
                            next_err[x3 - 3] += err_r * 1.0;
                            next_err[x3 - 2] += err_g * 1.0;
                            next_err[x3 - 1] += err_b * 1.0;
                        }
                    }
                }
            }

            curr_err.fill(0.0);
            std::mem::swap(&mut curr_err, &mut next_err);
        }
    }
}

pub fn run_kernel_diffusion(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    kernel: &[KernelEntry],
    divisor: f64,
    serpentine: bool,
    error_mult: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let mut max_dy = 0;
    for k in kernel {
        if k.dy > max_dy {
            max_dy = k.dy;
        }
    }
    let ring_rows = (max_dy + 1) as usize;

    if lut.is_tonal_ramp {
        let mut err_ring = vec![0.0f32; ring_rows * w];

        for y in 0..h {
            let is_odd = (y & 1) == 1;
            let reverse = serpentine && is_odd;
            let cur_row_offset = (y % ring_rows) * w;

            let (start_x, end_x, step_x): (isize, isize, isize) = if reverse {
                (w as isize - 1, -1, -1)
            } else {
                (0, w as isize, 1)
            };

            let mut x = start_x;
            while x != end_x {
                let ux = x as usize;
                let idx = (y * w + ux) * 4;
                let e_idx = cur_row_offset + ux;

                let lum = 0.2126f64 * (input[idx] as f64)
                    + 0.7152f64 * (input[idx + 1] as f64)
                    + 0.0722f64 * (input[idx + 2] as f64);
                let cur_lum = (lum + err_ring[e_idx] as f64).clamp(0.0, 255.0);

                let chosen_idx = lut.quantize_lum_f64(cur_lum);
                let col = lut.raw_palette[chosen_idx];

                out[idx] = col[0];
                out[idx + 1] = col[1];
                out[idx + 2] = col[2];
                out[idx + 3] = input[idx + 3]; // Preserve alpha

                let chosen_lum = lut.luminances_f64[chosen_idx];
                let err = (cur_lum - chosen_lum) * (error_mult as f64);

                for k in kernel {
                    let kdx = k.dx;
                    let kdy = k.dy;
                    let weight = k.weight;

                    let target_x = if reverse { x - kdx as isize } else { x + kdx as isize };
                    let target_y = y as isize + kdy as isize;

                    if target_x >= 0 && target_x < w as isize && target_y < h as isize {
                        let target_row_offset = ((target_y as usize) % ring_rows) * w;
                        let factor = weight / divisor;
                        err_ring[target_row_offset + target_x as usize] =
                            (err_ring[target_row_offset + target_x as usize] as f64 + err * factor) as f32;
                    }
                }

                x += step_x;
            }

            for i in 0..w {
                err_ring[cur_row_offset + i] = 0.0;
            }
        }
    } else {
        // Multi-hue clamped error diffusion
        let mut err_ring = vec![0.0f32; ring_rows * w * 3];
        let max_err = 128.0f64;

        for y in 0..h {
            let is_odd = (y & 1) == 1;
            let reverse = serpentine && is_odd;
            let cur_row_offset = (y % ring_rows) * w * 3;

            let (start_x, end_x, step_x): (isize, isize, isize) = if reverse {
                (w as isize - 1, -1, -1)
            } else {
                (0, w as isize, 1)
            };

            let mut x = start_x;
            while x != end_x {
                let ux = x as usize;
                let idx = (y * w + ux) * 4;
                let e_idx = cur_row_offset + ux * 3;

                let r = (input[idx] as f64 + err_ring[e_idx] as f64).clamp(0.0, 255.0);
                let g = (input[idx + 1] as f64 + err_ring[e_idx + 1] as f64).clamp(0.0, 255.0);
                let b = (input[idx + 2] as f64 + err_ring[e_idx + 2] as f64).clamp(0.0, 255.0);

                let matched = lut.inline_match_f64(r, g, b);
                out[idx] = matched[0];
                out[idx + 1] = matched[1];
                out[idx + 2] = matched[2];
                out[idx + 3] = input[idx + 3]; // Preserve alpha

                let err_r = ((r - matched[0] as f64) * (error_mult as f64)).clamp(-max_err, max_err);
                let err_g = ((g - matched[1] as f64) * (error_mult as f64)).clamp(-max_err, max_err);
                let err_b = ((b - matched[2] as f64) * (error_mult as f64)).clamp(-max_err, max_err);

                for k in kernel {
                    let kdx = k.dx;
                    let kdy = k.dy;
                    let factor = k.weight / divisor;

                    let target_x = if reverse { x - kdx as isize } else { x + kdx as isize };
                    let target_y = y as isize + kdy as isize;

                    if target_x >= 0 && target_x < w as isize && target_y < h as isize {
                        let target_row_offset = ((target_y as usize) % ring_rows) * w * 3;
                        let tx = target_x as usize;
                        err_ring[target_row_offset + tx * 3] =
                            (err_ring[target_row_offset + tx * 3] as f64 + err_r * factor) as f32;
                        err_ring[target_row_offset + tx * 3 + 1] =
                            (err_ring[target_row_offset + tx * 3 + 1] as f64 + err_g * factor) as f32;
                        err_ring[target_row_offset + tx * 3 + 2] =
                            (err_ring[target_row_offset + tx * 3 + 2] as f64 + err_b * factor) as f32;
                    }
                }

                x += step_x;
            }

            for i in 0..(w * 3) {
                err_ring[cur_row_offset + i] = 0.0;
            }
        }
    }
}

pub fn generate_raw_bayer(n: usize) -> Vec<i32> {
    if n == 2 {
        return vec![0, 2, 3, 1];
    }
    let prev_n = n / 2;
    let prev = generate_raw_bayer(prev_n);
    let mut out = vec![0i32; n * n];
    for y in 0..prev_n {
        for x in 0..prev_n {
            let v = prev[y * prev_n + x];
            out[y * n + x] = 4 * v;
            out[y * n + (x + prev_n)] = 4 * v + 2;
            out[(y + prev_n) * n + x] = 4 * v + 3;
            out[(y + prev_n) * n + (x + prev_n)] = 4 * v + 1;
        }
    }
    out
}

pub fn generate_bayer(n: usize) -> Vec<f32> {
    let raw = generate_raw_bayer(n);
    let total = (n * n) as f32;
    raw.into_iter().map(|v| (v as f32 + 0.5) / total).collect()
}

pub const BAYER_2: [f32; 4] = [
    0.5 / 4.0, 2.5 / 4.0,
    3.5 / 4.0, 1.5 / 4.0,
];

pub const BAYER_4: [f32; 16] = [
    0.5 / 16.0,  8.5 / 16.0,  2.5 / 16.0, 10.5 / 16.0,
    12.5 / 16.0, 4.5 / 16.0, 14.5 / 16.0,  6.5 / 16.0,
    3.5 / 16.0, 11.5 / 16.0,  1.5 / 16.0,  9.5 / 16.0,
    15.5 / 16.0, 7.5 / 16.0, 13.5 / 16.0,  5.5 / 16.0,
];

pub fn dither_bayer_matrix(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    size: usize,
    scale: f32,
) {
    let w = width as usize;
    let _h = height as usize;
    let effective_size = match size {
        2 | 8 | 16 => size,
        _ => 4,
    };
    let mask = effective_size - 1;
    let bayer_buf = match effective_size {
        2 => None,
        4 => None,
        8 => Some(generate_bayer(8)),
        16 => Some(generate_bayer(16)),
        _ => None,
    };

    let safe_scale = if scale > 0.01 { scale } else { 1.0 };
    let row_len = w * 4;

    out.par_chunks_exact_mut(row_len)
        .enumerate()
        .for_each(|(y, out_row)| {
            let sy = (y as f32 / safe_scale).floor() as usize;
            let row_offset = (sy & mask) * effective_size;
            let in_row = &input[y * row_len..(y + 1) * row_len];
            for x in 0..w {
                let sx = (x as f32 / safe_scale).floor() as usize;
                let idx = x * 4;

                let bayer_val = match effective_size {
                    2 => BAYER_2[row_offset + (sx & mask)],
                    4 => BAYER_4[row_offset + (sx & mask)],
                    _ => bayer_buf.as_ref().unwrap()[row_offset + (sx & mask)],
                };

                let chosen = lut.inline_pair_match(
                    in_row[idx] as f32,
                    in_row[idx + 1] as f32,
                    in_row[idx + 2] as f32,
                    bayer_val,
                );
                out_row[idx] = chosen[0];
                out_row[idx + 1] = chosen[1];
                out_row[idx + 2] = chosen[2];
                out_row[idx + 3] = in_row[idx + 3];
            }
        });
}

pub fn dither_bayer_void(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    scale: f32,
    warp: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let mask = 3usize;

    for y in 0..h {
        let sy = if scale > 0.01 && (scale - 1.0).abs() > 0.001 { (y as f32 / scale).floor() as usize } else { y };
        let ny = (2.0 * y as f64) / (h as f64) - 1.0;
        let warp_offset = warp as f64 * ny * ny * 5.0;
        for x in 0..w {
            let sx = if scale > 0.01 && (scale - 1.0).abs() > 0.001 { (x as f32 / scale).floor() as usize } else { x };
            let idx = (y * w + x) * 4;
            let warped_x = (sx as f64 + warp_offset).round() as i32;
            let bayer_val = BAYER_4[(sy & mask) * 4 + ((warped_x & 3) as usize)];

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                bayer_val,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_bit_tone(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    scale: f32,
    base_dot: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let dot_size = ((base_dot as f64) * (scale as f64)).round().max(1.0) as usize;
    let mask = 3usize;

    for y in 0..h {
        let by = y / dot_size;
        for x in 0..w {
            let bx = x / dot_size;
            let idx = (y * w + x) * 4;
            let bayer_val = BAYER_4[(by & mask) * 4 + (bx & mask)];

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                bayer_val,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

const CLUSTER_6: [[f32; 6]; 6] = [
    [32.0, 28.0, 24.0, 25.0, 29.0, 33.0],
    [20.0, 12.0,  8.0,  9.0, 13.0, 21.0],
    [16.0,  4.0,  0.0,  1.0,  5.0, 17.0],
    [18.0,  6.0,  2.0,  3.0,  7.0, 19.0],
    [22.0, 14.0, 10.0, 11.0, 15.0, 23.0],
    [34.0, 30.0, 26.0, 27.0, 31.0, 35.0],
];

const CLUSTER_8X8: [[f32; 8]; 8] = [
    [24.0, 10.0, 12.0, 26.0, 35.0, 47.0, 49.0, 37.0],
    [ 8.0,  0.0,  2.0, 14.0, 45.0, 59.0, 61.0, 51.0],
    [22.0,  6.0,  4.0, 16.0, 43.0, 57.0, 63.0, 53.0],
    [30.0, 20.0, 18.0, 28.0, 33.0, 41.0, 55.0, 39.0],
    [34.0, 46.0, 48.0, 36.0, 25.0, 11.0, 13.0, 27.0],
    [44.0, 58.0, 60.0, 50.0,  9.0,  1.0,  3.0, 15.0],
    [42.0, 56.0, 62.0, 52.0, 23.0,  7.0,  5.0, 17.0],
    [32.0, 40.0, 54.0, 38.0, 31.0, 21.0, 19.0, 29.0],
];

const DISPERSED_6X6: [[f32; 6]; 6] = [
    [ 1.0, 29.0, 11.0,  4.0, 26.0, 14.0],
    [23.0, 17.0, 35.0, 20.0,  8.0, 32.0],
    [ 7.0, 31.0,  5.0, 16.0, 28.0,  2.0],
    [25.0, 13.0, 19.0, 34.0, 10.0, 22.0],
    [33.0,  3.0, 27.0,  0.0, 18.0, 30.0],
    [15.0, 21.0,  9.0, 24.0, 12.0,  6.0],
];

pub fn dither_clustered_dot(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    scale: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let size = 6usize;

    for y in 0..h {
        let sy = if scale > 0.01 && (scale - 1.0).abs() > 0.001 { (y as f32 / scale).floor() as usize } else { y };
        let row = sy % size;
        for x in 0..w {
            let sx = if scale > 0.01 && (scale - 1.0).abs() > 0.001 { (x as f32 / scale).floor() as usize } else { x };
            let idx = (y * w + x) * 4;
            let cluster_val = (CLUSTER_6[row][sx % size] + 0.5) / 36.0;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                cluster_val,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_clustered_dot_8x8(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    scale: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let size = 8usize;

    for y in 0..h {
        let sy = if scale > 0.01 && (scale - 1.0).abs() > 0.001 { (y as f32 / scale).floor() as usize } else { y };
        let row = sy % size;
        for x in 0..w {
            let sx = if scale > 0.01 && (scale - 1.0).abs() > 0.001 { (x as f32 / scale).floor() as usize } else { x };
            let idx = (y * w + x) * 4;
            let cluster_val = (CLUSTER_8X8[row][sx % size] + 0.5) / 64.0;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                cluster_val,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_dispersed_dot_6x6(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    scale: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let size = 6usize;

    for y in 0..h {
        let sy = if scale > 0.01 && (scale - 1.0).abs() > 0.001 { (y as f32 / scale).floor() as usize } else { y };
        let row = sy % size;
        for x in 0..w {
            let sx = if scale > 0.01 && (scale - 1.0).abs() > 0.001 { (x as f32 / scale).floor() as usize } else { x };
            let idx = (y * w + x) * 4;
            let val = (DISPERSED_6X6[row][sx % size] + 0.5) / 36.0;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                val,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_mosaic(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    scale: f32,
    base_block: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let block_size = ((base_block as f64) * (scale as f64)).round().max(2.0) as usize;

    let mut by = 0;
    while by < h {
        let max_by = (by + block_size).min(h);
        let mut bx = 0;
        while bx < w {
            let max_bx = (bx + block_size).min(w);
            let mut r_sum = 0u64;
            let mut g_sum = 0u64;
            let mut b_sum = 0u64;
            let mut count = 0usize;

            for y in by..max_by {
                for x in bx..max_bx {
                    let idx = (y * w + x) * 4;
                    r_sum += input[idx] as u64;
                    g_sum += input[idx + 1] as u64;
                    b_sum += input[idx + 2] as u64;
                    count += 1;
                }
            }

            let mean_r = (r_sum as f32) / (count as f32);
            let mean_g = (g_sum as f32) / (count as f32);
            let mean_b = (b_sum as f32) / (count as f32);
            let matched = lut.inline_match(mean_r, mean_g, mean_b);

            for y in by..max_by {
                for x in bx..max_bx {
                    let idx = (y * w + x) * 4;
                    out[idx] = matched[0];
                    out[idx + 1] = matched[1];
                    out[idx + 2] = matched[2];
                    out[idx + 3] = input[idx + 3];
                }
            }

            bx += block_size;
        }
        by += block_size;
    }
}

pub fn dither_random_ordered(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    scale: f32,
) {
    let w = width as usize;
    let h = height as usize;

    for y in 0..h {
        let sy = if scale > 0.01 && (scale - 1.0).abs() > 0.001 { (y as f64 / scale as f64).floor() } else { y as f64 };
        for x in 0..w {
            let sx = if scale > 0.01 && (scale - 1.0).abs() > 0.001 { (x as f64 / scale as f64).floor() } else { x as f64 };
            let idx = (y * w + x) * 4;
            let raw = ((sx * 12.9898 + sy * 78.233).sin() * 43758.5453) % 1.0;
            let h_val = (((raw % 1.0) + 1.0) % 1.0) as f32;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                h_val,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_thresholder(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    scale: f32,
    freq: f32,
    ox: f32,
    oy: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let sc = scale.max(0.05);

    for y in 0..h {
        for x in 0..w {
            let sx = (x as f32 + ox) / sc;
            let sy = (y as f32 + oy) / sc;
            let mut wave = 0.0f32;
            for k in 1..=4 {
                let kf = k as f32;
                wave += (1.0 / kf) * ((kf * freq * sx) / 20.0 + sy / 20.0).sin();
            }
            let threshold = 0.5 + (wave / 2.0) * 0.4;
            let idx = (y * w + x) * 4;

            let chosen = lut.inline_pair_match(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
                threshold as f32,
            );
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_pure_threshold(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    threshold: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let t = threshold.clamp(0.0, 1.0);

    for y in 0..h {
        for x in 0..w {
            let idx = (y * w + x) * 4;
            let (c1, c2, frac) = lut.find_pair(
                input[idx] as f32,
                input[idx + 1] as f32,
                input[idx + 2] as f32,
            );
            let chosen = if frac > t { c2 } else { c1 };
            out[idx] = chosen[0];
            out[idx + 1] = chosen[1];
            out[idx + 2] = chosen[2];
            out[idx + 3] = input[idx + 3];
        }
    }
}

pub fn dither_gaussian(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    spread: f32,
    strength: f32,
) {
    let sigma = (spread * 0.5).max(0.5) as f64;
    let mut kernel = Vec::with_capacity(12);
    let mut sum = 0.0f64;

    for dy in 0..=2i32 {
        for dx in -2..=2i32 {
            if dy == 0 && dx <= 0 {
                continue;
            }
            let weight = (-( (dx * dx + dy * dy) as f64 ) / (2.0 * sigma * sigma)).exp();
            kernel.push(KernelEntry { dx, dy, weight });
            sum += weight;
        }
    }

    run_kernel_diffusion(width, height, input, out, lut, &kernel, sum, true, strength);
}

#[inline(always)]
fn get_ostromoukhov_weights(val: f64) -> (f64, f64, f64) {
    let v = val.clamp(0.0, 255.0);
    let folded = if v > 128.0 { 255.0 - v } else { v };
    let (d1, d2, d3) = if folded <= 64.0 {
        let t = folded / 64.0;
        (13.0, 0.0, 5.0 * (1.0 - t) + 10.0 * t)
    } else {
        let t = (folded - 64.0) / 64.0;
        (13.0 * (1.0 - t) + 7.0 * t, 3.0 * t, 10.0 * (1.0 - t))
    };
    let total = d1 + d2 + d3;
    (d1 / total, d2 / total, d3 / total)
}

pub fn dither_ostromoukhov(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    serpentine: bool,
    strength: f32,
) {
    let w = width as usize;
    let h = height as usize;

    if lut.is_tonal_ramp {
        let mut err_ring = vec![0.0f32; 2 * w];

        for y in 0..h {
            let is_odd = (y & 1) == 1;
            let reverse = serpentine && is_odd;
            let cur_row = (y & 1) * w;
            let next_row = ((y + 1) & 1) * w;

            let (start_x, end_x, step_x): (isize, isize, isize) = if reverse {
                (w as isize - 1, -1, -1)
            } else {
                (0, w as isize, 1)
            };

            let mut x = start_x;
            while x != end_x {
                let ux = x as usize;
                let idx = (y * w + ux) * 4;
                let e_idx = cur_row + ux;

                let lum = 0.2126f64 * (input[idx] as f64)
                    + 0.7152f64 * (input[idx + 1] as f64)
                    + 0.0722f64 * (input[idx + 2] as f64);
                let cur_lum = (lum + err_ring[e_idx] as f64).clamp(0.0, 255.0);

                let chosen_idx = lut.quantize_lum_f64(cur_lum);
                let col = lut.raw_palette[chosen_idx];

                out[idx] = col[0];
                out[idx + 1] = col[1];
                out[idx + 2] = col[2];
                out[idx + 3] = input[idx + 3];

                let chosen_lum = lut.luminances_f64[chosen_idx];
                let err = (cur_lum - chosen_lum) * (strength as f64);
                let (f1, f2, f3) = get_ostromoukhov_weights(cur_lum);

                let x1 = if reverse { x - 1 } else { x + 1 };
                let x2 = if reverse { x + 1 } else { x - 1 };

                if x1 >= 0 && x1 < w as isize {
                    err_ring[cur_row + x1 as usize] =
                        (err_ring[cur_row + x1 as usize] as f64 + err * f1) as f32;
                }
                if y + 1 < h {
                    if x2 >= 0 && x2 < w as isize {
                        err_ring[next_row + x2 as usize] =
                            (err_ring[next_row + x2 as usize] as f64 + err * f2) as f32;
                    }
                    err_ring[next_row + ux] = (err_ring[next_row + ux] as f64 + err * f3) as f32;
                }

                x += step_x;
            }

            for i in 0..w {
                err_ring[cur_row + i] = 0.0;
            }
        }
    } else {
        let mut err_ring = vec![0.0f32; 2 * w * 3];
        let max_err = 128.0f64;

        for y in 0..h {
            let is_odd = (y & 1) == 1;
            let reverse = serpentine && is_odd;
            let cur_row = (y & 1) * w * 3;
            let next_row = ((y + 1) & 1) * w * 3;

            let (start_x, end_x, step_x): (isize, isize, isize) = if reverse {
                (w as isize - 1, -1, -1)
            } else {
                (0, w as isize, 1)
            };

            let mut x = start_x;
            while x != end_x {
                let ux = x as usize;
                let idx = (y * w + ux) * 4;
                let e_idx = cur_row + ux * 3;

                let tr = (input[idx] as f64 + err_ring[e_idx] as f64).clamp(0.0, 255.0);
                let tg = (input[idx + 1] as f64 + err_ring[e_idx + 1] as f64).clamp(0.0, 255.0);
                let tb = (input[idx + 2] as f64 + err_ring[e_idx + 2] as f64).clamp(0.0, 255.0);

                let matched = lut.inline_match_f64(tr, tg, tb);
                out[idx] = matched[0];
                out[idx + 1] = matched[1];
                out[idx + 2] = matched[2];
                out[idx + 3] = input[idx + 3];

                let err_r = ((tr - matched[0] as f64) * (strength as f64)).clamp(-max_err, max_err);
                let err_g = ((tg - matched[1] as f64) * (strength as f64)).clamp(-max_err, max_err);
                let err_b = ((tb - matched[2] as f64) * (strength as f64)).clamp(-max_err, max_err);

                let lum = 0.2126 * tr + 0.7152 * tg + 0.0722 * tb;
                let (f1, f2, f3) = get_ostromoukhov_weights(lum);

                let x1 = if reverse { x - 1 } else { x + 1 };
                let x2 = if reverse { x + 1 } else { x - 1 };

                if x1 >= 0 && x1 < w as isize {
                    let tx = x1 as usize;
                    err_ring[cur_row + tx * 3] =
                        (err_ring[cur_row + tx * 3] as f64 + err_r * f1) as f32;
                    err_ring[cur_row + tx * 3 + 1] =
                        (err_ring[cur_row + tx * 3 + 1] as f64 + err_g * f1) as f32;
                    err_ring[cur_row + tx * 3 + 2] =
                        (err_ring[cur_row + tx * 3 + 2] as f64 + err_b * f1) as f32;
                }
                if y + 1 < h {
                    if x2 >= 0 && x2 < w as isize {
                        let tx = x2 as usize;
                        err_ring[next_row + tx * 3] =
                            (err_ring[next_row + tx * 3] as f64 + err_r * f2) as f32;
                        err_ring[next_row + tx * 3 + 1] =
                            (err_ring[next_row + tx * 3 + 1] as f64 + err_g * f2) as f32;
                        err_ring[next_row + tx * 3 + 2] =
                            (err_ring[next_row + tx * 3 + 2] as f64 + err_b * f2) as f32;
                    }
                    err_ring[next_row + ux * 3] =
                        (err_ring[next_row + ux * 3] as f64 + err_r * f3) as f32;
                    err_ring[next_row + ux * 3 + 1] =
                        (err_ring[next_row + ux * 3 + 1] as f64 + err_g * f3) as f32;
                    err_ring[next_row + ux * 3 + 2] =
                        (err_ring[next_row + ux * 3 + 2] as f64 + err_b * f3) as f32;
                }

                x += step_x;
            }

            for i in 0..(w * 3) {
                err_ring[cur_row + i] = 0.0;
            }
        }
    }
}

pub fn dither_cracked_diffuse(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    cracked: f32,
    strength: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let cracked_threshold = cracked as i32;

    if lut.is_tonal_ramp {
        let mut err_ring = vec![0.0f32; 2 * w];

        for y in 0..h {
            let cur_row = (y & 1) * w;
            let next_row = ((y + 1) & 1) * w;

            for x in 0..w {
                let idx = (y * w + x) * 4;
                let e_idx = cur_row + x;

                let lum = 0.2126f64 * (input[idx] as f64)
                    + 0.7152f64 * (input[idx + 1] as f64)
                    + 0.0722f64 * (input[idx + 2] as f64);
                let cur_lum = (lum + err_ring[e_idx] as f64).clamp(0.0, 255.0);

                let chosen_idx = lut.quantize_lum_f64(cur_lum);
                let col = lut.raw_palette[chosen_idx];

                out[idx] = col[0];
                out[idx + 1] = col[1];
                out[idx + 2] = col[2];
                out[idx + 3] = input[idx + 3];

                let chosen_lum = lut.luminances_f64[chosen_idx];
                let err = ((cur_lum - chosen_lum) * (strength as f64)) as f32;

                let hash = (((x as i32).wrapping_mul(12345).wrapping_add((y as i32).wrapping_mul(67891)))
                    ^ ((x as i32).wrapping_mul(y as i32))) % 100;

                if hash < cracked_threshold {
                    if ((x + y) & 1) == 0 {
                        if x + 1 < w {
                            err_ring[cur_row + x + 1] += err;
                        }
                    } else if y + 1 < h {
                        err_ring[next_row + x] += err;
                    }
                }
            }

            for i in 0..w {
                err_ring[cur_row + i] = 0.0;
            }
        }
    } else {
        let mut err_ring = vec![0.0f32; 2 * w * 3];
        let max_err = 128.0f32;

        for y in 0..h {
            let cur_row = (y & 1) * w * 3;
            let next_row = ((y + 1) & 1) * w * 3;

            for x in 0..w {
                let idx = (y * w + x) * 4;
                let e_idx = cur_row + x * 3;

                let tr = (input[idx] as f32 + err_ring[e_idx]).clamp(0.0, 255.0);
                let tg = (input[idx + 1] as f32 + err_ring[e_idx + 1]).clamp(0.0, 255.0);
                let tb = (input[idx + 2] as f32 + err_ring[e_idx + 2]).clamp(0.0, 255.0);

                let matched = lut.inline_match(tr, tg, tb);
                out[idx] = matched[0];
                out[idx + 1] = matched[1];
                out[idx + 2] = matched[2];
                out[idx + 3] = input[idx + 3];

                let err_r = ((tr - matched[0] as f32) * strength).clamp(-max_err, max_err);
                let err_g = ((tg - matched[1] as f32) * strength).clamp(-max_err, max_err);
                let err_b = ((tb - matched[2] as f32) * strength).clamp(-max_err, max_err);

                let hash = (((x as i32).wrapping_mul(12345).wrapping_add((y as i32).wrapping_mul(67891)))
                    ^ ((x as i32).wrapping_mul(y as i32))) % 100;

                if hash < cracked_threshold {
                    if ((x + y) & 1) == 0 {
                        if x + 1 < w {
                            err_ring[cur_row + (x + 1) * 3] += err_r;
                            err_ring[cur_row + (x + 1) * 3 + 1] += err_g;
                            err_ring[cur_row + (x + 1) * 3 + 2] += err_b;
                        }
                    } else if y + 1 < h {
                        err_ring[next_row + x * 3] += err_r;
                        err_ring[next_row + x * 3 + 1] += err_g;
                        err_ring[next_row + x * 3 + 2] += err_b;
                    }
                }
            }

            for i in 0..(w * 3) {
                err_ring[cur_row + i] = 0.0;
            }
        }
    }
}

pub fn generate_hilbert_curve(w: u32, h: u32) -> Vec<(i32, i32)> {
    let max_dim = w.max(h);
    let mut n = 1i32;
    while n < max_dim as i32 {
        n <<= 1;
    }
    let total = (w * h) as usize;
    let mut coords = Vec::with_capacity(total);
    let n2 = n * n;

    for d in 0..n2 {
        let mut rx;
        let mut ry;
        let mut s = 1i32;
        let mut t = d;
        let mut x = 0i32;
        let mut y = 0i32;
        while s < n {
            rx = 1 & (t >> 1);
            ry = 1 & (t ^ rx);
            if ry == 0 {
                if rx == 1 {
                    x = s - 1 - x;
                    y = s - 1 - y;
                }
                std::mem::swap(&mut x, &mut y);
            }
            x += s * rx;
            y += s * ry;
            t >>= 2;
            s <<= 1;
        }
        if x < w as i32 && y < h as i32 {
            coords.push((x, y));
            if coords.len() == total {
                break;
            }
        }
    }
    coords
}

pub fn dither_fractal_diffuse(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    strength: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let coords = generate_hilbert_curve(width, height);
    let total = w * h;

    const M: usize = 8;
    let mut weights = [0.0f32; M];
    let decay = (1.0f64 / (M as f64)).powf(1.0 / ((M - 1) as f64));
    let mut w_sum = 0.0f64;
    for i in 0..M {
        let wt = decay.powi(i as i32);
        w_sum += wt;
    }
    for i in 0..M {
        weights[i] = (decay.powi(i as i32) / w_sum) as f32;
    }

    if lut.is_tonal_ramp {
        let mut queue = [0.0f64; M];

        for pt in 0..total {
            let (x, y) = coords[pt];
            let ux = x as usize;
            let uy = y as usize;
            let idx = (uy * w + ux) * 4;

            let mut err_acc = 0.0f64;
            for i in 0..M {
                err_acc += queue[i] * (weights[i] as f64);
            }

            let lum = 0.2126f64 * (input[idx] as f64)
                + 0.7152f64 * (input[idx + 1] as f64)
                + 0.0722f64 * (input[idx + 2] as f64);
            let cur_lum = (lum + err_acc * (strength as f64)).clamp(0.0, 255.0);

            let chosen_idx = lut.quantize_lum_f64(cur_lum);
            let col = lut.raw_palette[chosen_idx];

            out[idx] = col[0];
            out[idx + 1] = col[1];
            out[idx + 2] = col[2];
            out[idx + 3] = input[idx + 3];

            let chosen_lum = lut.luminances_f64[chosen_idx];
            let new_err = cur_lum - chosen_lum;

            for i in (1..M).rev() {
                queue[i] = queue[i - 1];
            }
            queue[0] = new_err;
        }
    } else {
        let mut queue_r = [0.0f32; M];
        let mut queue_g = [0.0f32; M];
        let mut queue_b = [0.0f32; M];
        let max_err = 128.0f32;

        for pt in 0..total {
            let (x, y) = coords[pt];
            let ux = x as usize;
            let uy = y as usize;
            let idx = (uy * w + ux) * 4;

            let mut err_r = 0.0f32;
            let mut err_g = 0.0f32;
            let mut err_b = 0.0f32;
            for i in 0..M {
                err_r += queue_r[i] * weights[i];
                err_g += queue_g[i] * weights[i];
                err_b += queue_b[i] * weights[i];
            }

            let tr = (input[idx] as f32 + err_r * strength).clamp(0.0, 255.0);
            let tg = (input[idx + 1] as f32 + err_g * strength).clamp(0.0, 255.0);
            let tb = (input[idx + 2] as f32 + err_b * strength).clamp(0.0, 255.0);

            let matched = lut.inline_match(tr, tg, tb);
            out[idx] = matched[0];
            out[idx + 1] = matched[1];
            out[idx + 2] = matched[2];
            out[idx + 3] = input[idx + 3];

            let new_err_r = (tr - matched[0] as f32).clamp(-max_err, max_err);
            let new_err_g = (tg - matched[1] as f32).clamp(-max_err, max_err);
            let new_err_b = (tb - matched[2] as f32).clamp(-max_err, max_err);

            for i in (1..M).rev() {
                queue_r[i] = queue_r[i - 1];
                queue_g[i] = queue_g[i - 1];
                queue_b[i] = queue_b[i - 1];
            }
            queue_r[0] = new_err_r;
            queue_g[0] = new_err_g;
            queue_b[0] = new_err_b;
        }
    }
}

pub fn dither_vortex_diffusion(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    twist_strength: f32,
    spiral_frequency: f32,
    strength: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let twist = (twist_strength / 100.0) as f64;
    let freq = (spiral_frequency as f64).max(0.1);
    let cx = (w as f64) / 2.0;
    let cy = (h as f64) / 2.0;
    let max_err = 128.0f32;

    if lut.is_tonal_ramp {
        let mut err_ring = vec![0.0f32; 2 * w];

        for y in 0..h {
            let cur_row = (y & 1) * w;
            let next_row = ((y + 1) & 1) * w;

            for x in 0..w {
                let idx = (y * w + x) * 4;
                let e_idx = cur_row + x;

                let lum = 0.2126f64 * (input[idx] as f64)
                    + 0.7152f64 * (input[idx + 1] as f64)
                    + 0.0722f64 * (input[idx + 2] as f64);
                let cur_lum = (lum + err_ring[e_idx] as f64).clamp(0.0, 255.0);

                let chosen_idx = lut.quantize_lum_f64(cur_lum);
                let col = lut.raw_palette[chosen_idx];

                out[idx] = col[0];
                out[idx + 1] = col[1];
                out[idx + 2] = col[2];
                out[idx + 3] = input[idx + 3];

                let chosen_lum = lut.luminances_f64[chosen_idx];
                let err = ((cur_lum - chosen_lum) * 0.9 * (strength as f64)) as f32;

                let dx = x as f64 - cx;
                let dy = y as f64 - cy;
                let dist = dx.hypot(dy);
                let theta = dy.atan2(dx) + twist * (dist / (freq * 10.0).max(1.0));

                let dir_x = theta.cos().round() as i32;
                let dir_y = (theta.sin().round() as i32).max(0);

                let tx = x as i32 + if dir_x == 0 { 1 } else { dir_x };
                let ty = y as i32 + dir_y;

                if tx >= 0 && tx < w as i32 && ty < h as i32 {
                    let tr = if ((ty as usize) & 1) == (y & 1) { cur_row } else { next_row };
                    err_ring[tr + tx as usize] += err;
                }
            }

            for i in 0..w {
                err_ring[cur_row + i] = 0.0;
            }
        }
    } else {
        let mut err_ring = vec![0.0f32; 2 * w * 3];

        for y in 0..h {
            let cur_row = (y & 1) * w * 3;
            let next_row = ((y + 1) & 1) * w * 3;

            for x in 0..w {
                let idx = (y * w + x) * 4;
                let e_idx = cur_row + x * 3;

                let tr = (input[idx] as f32 + err_ring[e_idx]).clamp(0.0, 255.0);
                let tg = (input[idx + 1] as f32 + err_ring[e_idx + 1]).clamp(0.0, 255.0);
                let tb = (input[idx + 2] as f32 + err_ring[e_idx + 2]).clamp(0.0, 255.0);

                let matched = lut.inline_match(tr, tg, tb);
                out[idx] = matched[0];
                out[idx + 1] = matched[1];
                out[idx + 2] = matched[2];
                out[idx + 3] = input[idx + 3];

                let err_r = ((tr - matched[0] as f32) * strength).clamp(-max_err, max_err);
                let err_g = ((tg - matched[1] as f32) * strength).clamp(-max_err, max_err);
                let err_b = ((tb - matched[2] as f32) * strength).clamp(-max_err, max_err);

                let dx = x as f64 - cx;
                let dy = y as f64 - cy;
                let dist = dx.hypot(dy);
                let theta = dy.atan2(dx) + twist * (dist / (freq * 10.0).max(1.0));

                let dir_x = theta.cos().round() as i32;
                let dir_y = (theta.sin().round() as i32).max(0);

                let tx = x as i32 + if dir_x == 0 { 1 } else { dir_x };
                let ty = y as i32 + dir_y;

                if tx >= 0 && tx < w as i32 && ty < h as i32 {
                    let tr = if ((ty as usize) & 1) == (y & 1) { cur_row } else { next_row };
                    let utx = tx as usize;
                    err_ring[tr + utx * 3] += err_r * 0.9;
                    err_ring[tr + utx * 3 + 1] += err_g * 0.9;
                    err_ring[tr + utx * 3 + 2] += err_b * 0.9;
                }
            }

            for i in 0..(w * 3) {
                err_ring[cur_row + i] = 0.0;
            }
        }
    }
}

fn apply_fast_diffusion(
    image: &mut RgbaImage,
    settings: &DitherSettings,
    kernel: &[KernelEntry],
    divisor: f64,
    error_mult_override: Option<f32>,
) {
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 || settings.palette.is_empty() {
        return;
    }

    let lut = FastPaletteLUT::new(&settings.palette, Some(settings.threshold));
    let raw_input = image.as_raw();
    let mut out = vec![0u8; raw_input.len()];

    let strength = settings.diffusion_strength;
    let error_mult = error_mult_override.unwrap_or(strength);

    run_kernel_diffusion(
        width,
        height,
        raw_input,
        &mut out,
        &lut,
        kernel,
        divisor,
        settings.serpentine,
        error_mult,
    );

    *image = RgbaImage::from_raw(width, height, out).unwrap();
}

fn apply_fast_bayer(
    image: &mut RgbaImage,
    settings: &DitherSettings,
    matrix_size: usize,
) {
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 || settings.palette.is_empty() {
        return;
    }

    let lut = FastPaletteLUT::new(&settings.palette, Some(settings.threshold));
    let raw_input = image.as_raw();
    let mut out = vec![0u8; raw_input.len()];

    dither_bayer_matrix(
        width,
        height,
        raw_input,
        &mut out,
        &lut,
        matrix_size,
        settings.scale.max(1.0),
    );

    *image = RgbaImage::from_raw(width, height, out).unwrap();
}

#[allow(dead_code)]
fn apply_fast_threshold(
    image: &mut RgbaImage,
    settings: &DitherSettings,
    is_wave: bool,
) {
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 || settings.palette.is_empty() {
        return;
    }

    let lut = FastPaletteLUT::new(&settings.palette, Some(settings.threshold));
    let raw_input = image.as_raw();
    let mut out = vec![0u8; raw_input.len()];

    if is_wave {
        dither_thresholder(
            width,
            height,
            raw_input,
            &mut out,
            &lut,
            settings.scale,
            1.0,
            0.0,
            0.0,
        );
    } else {
        dither_pure_threshold(
            width,
            height,
            raw_input,
            &mut out,
            &lut,
            settings.threshold,
        );
    }

    *image = RgbaImage::from_raw(width, height, out).unwrap();
}

// -------------------------------------------------------------
// ERROR DIFFUSION PIPELINE (COLOR-INTEGRATED + SERPENTINE)
// -------------------------------------------------------------
fn apply_error_diffusion(
    image: &mut RgbaImage,
    settings: &DitherSettings,
    kernel: &[KernelEntry],
    divisor: f32,
) {
    apply_fast_diffusion(image, settings, kernel, divisor as f64, None);
}

#[allow(dead_code)]
fn apply_dynamic_serpentine(image: &mut RgbaImage, settings: &DitherSettings) {
    let mut custom_settings = settings.clone();
    custom_settings.serpentine = true;
    apply_error_diffusion(image, &custom_settings, &FS_KERNEL, 16.0);
}

// -------------------------------------------------------------
// ORDERED DITHERING (BAYER + CLUSTERED DOT)
// -------------------------------------------------------------
#[allow(dead_code)]
fn get_bayer_matrix_value(size: usize, x: usize, y: usize) -> f32 {
    match size {
        2 => {
            const M: [[f32; 2]; 2] = [[0.0, 2.0], [3.0, 1.0]];
            (M[y % 2][x % 2] + 0.5) / 4.0
        }
        4 => {
            const M: [[f32; 4]; 4] = [
                [0.0, 8.0, 2.0, 10.0],
                [12.0, 4.0, 14.0, 6.0],
                [3.0, 11.0, 1.0, 9.0],
                [15.0, 7.0, 13.0, 5.0],
            ];
            (M[y % 4][x % 4] + 0.5) / 16.0
        }
        8 => {
            // Recursive Bayer 8x8 derivation
            let b4 = get_bayer_matrix_value(4, x % 4, y % 4) * 16.0 - 0.5;
            let quadrant = ((y / 4) % 2) * 2 + ((x / 4) % 2);
            let offset = match quadrant {
                0 => 0.0,
                1 => 2.0,
                2 => 3.0,
                _ => 1.0,
            };
            (4.0 * b4 + offset + 0.5) / 64.0
        }
        _ => {
            // Bayer 16x16
            let b8 = get_bayer_matrix_value(8, x % 8, y % 8) * 64.0 - 0.5;
            let quadrant = ((y / 8) % 2) * 2 + ((x / 8) % 2);
            let offset = match quadrant {
                0 => 0.0,
                1 => 2.0,
                2 => 3.0,
                _ => 1.0,
            };
            (4.0 * b8 + offset + 0.5) / 256.0
        }
    }
}

#[allow(dead_code)]
fn apply_bayer(image: &mut RgbaImage, settings: &DitherSettings, matrix_size: usize) {
    let (width, height) = image.dimensions();
    let spread = 48.0 * settings.diffusion_strength;

    for y in 0..height {
        for x in 0..width {
            let pixel = image.get_pixel(x, y);
            let bayer = get_bayer_matrix_value(matrix_size, x as usize, y as usize);
            let shift = (bayer - settings.threshold) * spread;

            let target = [
                (pixel[0] as f32 + shift).clamp(0.0, 255.0),
                (pixel[1] as f32 + shift).clamp(0.0, 255.0),
                (pixel[2] as f32 + shift).clamp(0.0, 255.0),
            ];

            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], image.get_pixel(x, y)[3]]));
        }
    }
}

#[allow(dead_code)]
fn apply_clustered_dot(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    const CLUSTER: [[f32; 6]; 6] = [
        [32.0, 28.0, 24.0, 25.0, 29.0, 33.0],
        [20.0, 12.0, 8.0, 9.0, 13.0, 21.0],
        [16.0, 4.0, 0.0, 1.0, 5.0, 17.0],
        [18.0, 6.0, 2.0, 3.0, 7.0, 19.0],
        [22.0, 14.0, 10.0, 11.0, 15.0, 23.0],
        [34.0, 30.0, 26.0, 27.0, 31.0, 35.0],
    ];

    for y in 0..height {
        for x in 0..width {
            let pixel = image.get_pixel(x, y);
            let val = (CLUSTER[(y % 6) as usize][(x % 6) as usize] + 0.5) / 36.0;
            let shift = (val - settings.threshold) * 50.0 * settings.diffusion_strength;

            let target = [
                (pixel[0] as f32 + shift).clamp(0.0, 255.0),
                (pixel[1] as f32 + shift).clamp(0.0, 255.0),
                (pixel[2] as f32 + shift).clamp(0.0, 255.0),
            ];

            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], image.get_pixel(x, y)[3]]));
        }
    }
}

// -------------------------------------------------------------
// PATTERN DITHERS (8 PATTERNS)
// -------------------------------------------------------------
#[allow(dead_code)]
pub enum PatternType {
    Checkered,
    HorizontalLines,
    VerticalLines,
    Crosshatch,
    DiagonalHatch,
    ConcentricDiamond,
    WovenBasket,
    HexStipple,
}

fn apply_pattern(image: &mut RgbaImage, settings: &DitherSettings, pattern_type: PatternType, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let scale = settings.scale.max(0.5);

    for y in 0..height {
        for x in 0..width {
            let sx = (x as f32 / scale) as i32;
            let sy = (y as f32 / scale) as i32;

            let pat_val = match pattern_type {
                PatternType::Checkered => if (sx + sy) % 2 == 0 { 0.7 } else { 0.3 },
                PatternType::HorizontalLines => if sy % 3 == 0 { 0.8 } else { 0.2 },
                PatternType::VerticalLines => if sx % 3 == 0 { 0.8 } else { 0.2 },
                PatternType::Crosshatch => if sx % 4 == 0 || sy % 4 == 0 { 0.85 } else { 0.15 },
                PatternType::DiagonalHatch => if (sx + sy) % 4 == 0 { 0.8 } else { 0.2 },
                PatternType::ConcentricDiamond => {
                    let dx = (sx % 8 - 4).abs();
                    let dy = (sy % 8 - 4).abs();
                    ((dx + dy) as f32) / 8.0
                }
                PatternType::WovenBasket => {
                    let bx = (sx / 4) % 2;
                    let by = (sy / 4) % 2;
                    if (bx ^ by) == 0 {
                        if sy % 2 == 0 { 0.75 } else { 0.25 }
                    } else if sx % 2 == 0 {
                        0.75
                    } else {
                        0.25
                    }
                }
                PatternType::HexStipple => {
                    let hx = sx % 6;
                    let hy = sy % 6;
                    if (hx == 0 && hy == 0) || (hx == 3 && hy == 3) { 0.9 } else { 0.1 }
                }
            };

            let pixel = image.get_pixel(x, y);
            let shift = (pat_val - settings.threshold) * 60.0 * settings.diffusion_strength;

            let target = [
                (pixel[0] as f32 + shift).clamp(0.0, 255.0),
                (pixel[1] as f32 + shift).clamp(0.0, 255.0),
                (pixel[2] as f32 + shift).clamp(0.0, 255.0),
            ];

            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], pixel[3]]));
        }
    }
}

// -------------------------------------------------------------
// GLITCH EFFECTS (17 EFFECTS)
// -------------------------------------------------------------
fn apply_scanline_jitter(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let max_jitter = (settings.scale * 16.0) as i32;

    for y in 0..height {
        let jitter = (((y as f32 * 0.3 + settings.temporal_seed as f32).sin() * max_jitter as f32) as i32)
            .clamp(-max_jitter, max_jitter);

        for x in 0..width {
            let src_x = (x as i32 + jitter).clamp(0, width as i32 - 1) as u32;
            let pixel = temp.get_pixel(src_x, y);
            let nearest = lut.inline_match(pixel[0] as f32, pixel[1] as f32, pixel[2] as f32);
            let cur_a = image.get_pixel(x, y)[3];
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], cur_a]));
        }
    }
}

fn apply_chromatic_offset(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let offset = (settings.scale * 8.0) as i32;

    for y in 0..height {
        for x in 0..width {
            let rx = (x as i32 + offset).clamp(0, width as i32 - 1) as u32;
            let bx = (x as i32 - offset).clamp(0, width as i32 - 1) as u32;

            let r = temp.get_pixel(rx, y)[0];
            let g = temp.get_pixel(x, y)[1];
            let b = temp.get_pixel(bx, y)[2];

            let nearest = lut.inline_match(r as f32, g as f32, b as f32);
            let cur_a = image.get_pixel(x, y)[3];
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], cur_a]));
        }
    }
}

fn apply_pixel_sorting(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let threshold_luma = settings.threshold * 255.0;

    for y in 0..height {
        let mut row_pixels: Vec<(u32, [u8; 4], f32)> = Vec::new();
        for x in 0..width {
            let p = *image.get_pixel(x, y);
            let luma = 0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32;
            row_pixels.push((x, p.0, luma));
        }

        // Sort sub-segments exceeding threshold
        let mut i = 0;
        while i < width as usize {
            if row_pixels[i].2 > threshold_luma {
                let start = i;
                while i < width as usize && row_pixels[i].2 > threshold_luma {
                    i += 1;
                }
                row_pixels[start..i].sort_by(|a, b| a.2.total_cmp(&b.2));
            } else {
                i += 1;
            }
        }

        for (x, (orig_x, _, _)) in row_pixels.iter().enumerate() {
            let p = image.get_pixel(*orig_x, y);
            let cur_a = image.get_pixel(x as u32, y)[3];
            let nearest = lut.inline_match(p[0] as f32, p[1] as f32, p[2] as f32);
            image.put_pixel(x as u32, y, Rgba([nearest[0], nearest[1], nearest[2], cur_a]));
        }
    }
}

fn apply_digital_artifacts(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let block_size = (settings.scale * 8.0).max(4.0) as u32;

    for by in (0..height).step_by(block_size as usize) {
        for bx in (0..width).step_by(block_size as usize) {
            let sample_p = *image.get_pixel(bx, by);
            let nearest = lut.inline_match(sample_p[0] as f32, sample_p[1] as f32, sample_p[2] as f32);

            for y in by..(by + block_size).min(height) {
                for x in bx..(bx + block_size).min(width) {
                    let cur_a = image.get_pixel(x, y)[3];
                    image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], cur_a]));
                }
            }
        }
    }
}

fn apply_interlacing_tear(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let shift = (settings.scale * 6.0) as i32;

    for y in 0..height {
        let x_shift = if y % 2 == 0 { shift } else { -shift };
        for x in 0..width {
            let sx = (x as i32 + x_shift).clamp(0, width as i32 - 1) as u32;
            let p = temp.get_pixel(sx, y);
            let nearest = lut.inline_match(p[0] as f32, p[1] as f32, p[2] as f32);
            let cur_a = image.get_pixel(x, y)[3];
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], cur_a]));
        }
    }
}

fn apply_crt_bloom(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let temp = image.clone();

    for y in 0..height {
        for x in 0..width {
            let mut accum = [0.0f32; 3];
            let mut count = 0.0;
            for dy in -1..=1 {
                for dx in -1..=1 {
                    let nx = x as i32 + dx;
                    let ny = y as i32 + dy;
                    if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                        let p = temp.get_pixel(nx as u32, ny as u32);
                        accum[0] += p[0] as f32;
                        accum[1] += p[1] as f32;
                        accum[2] += p[2] as f32;
                        count += 1.0;
                    }
                }
            }
            let orig = temp.get_pixel(x, y);
            let bloom_weight = settings.diffusion_strength;
            let target = [
                (orig[0] as f32 * (1.0 - bloom_weight) + (accum[0] / count) * bloom_weight),
                (orig[1] as f32 * (1.0 - bloom_weight) + (accum[1] / count) * bloom_weight),
                (orig[2] as f32 * (1.0 - bloom_weight) + (accum[2] / count) * bloom_weight),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            let cur_a = image.get_pixel(x, y)[3];
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], cur_a]));
        }
    }
}

fn apply_bit_crush(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let step = (256.0 / (settings.depth.max(1) as f32)).max(1.0);

    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            let target = [
                ((p[0] as f32 / step).floor() * step).clamp(0.0, 255.0),
                ((p[1] as f32 / step).floor() * step).clamp(0.0, 255.0),
                ((p[2] as f32 / step).floor() * step).clamp(0.0, 255.0),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            let cur_a = p[3];
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], cur_a]));
        }
    }
}

fn apply_vhs_tracking(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 {
        return;
    }
    let band_y = ((settings.temporal_seed as f32 * 7.0) % height as f32) as u32;
    let band_h = (settings.scale * 20.0).max(10.0) as u32;

    for y in 0..height {
        let is_band = y >= band_y && y < band_y + band_h;
        for x in 0..width {
            let p = *image.get_pixel(x, y);
            let target = if is_band {
                let noise = ((x * 13 + y * 7 + settings.temporal_seed) % 100) as f32 - 50.0;
                [
                    (p[0] as f32 + noise).clamp(0.0, 255.0),
                    (p[1] as f32 + noise).clamp(0.0, 255.0),
                    (p[2] as f32 + noise).clamp(0.0, 255.0),
                ]
            } else {
                [p[0] as f32, p[1] as f32, p[2] as f32]
            };
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

fn apply_bad_ram(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let mut p = *image.get_pixel(x, y);
            if ((x ^ y) + settings.temporal_seed) % 23 == 0 {
                p[0] ^= 0x40;
                p[1] ^= 0x20;
            }
            let nearest = lut.inline_match(p[0] as f32, p[1] as f32, p[2] as f32);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

fn apply_wave_distortion(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let amp = settings.scale * 12.0;

    for y in 0..height {
        let offset = ((y as f32 * 0.05 + settings.temporal_seed as f32 * 0.1).sin() * amp) as i32;
        for x in 0..width {
            let sx = (x as i32 + offset).clamp(0, width as i32 - 1) as u32;
            let p = temp.get_pixel(sx, y);
            let nearest = lut.inline_match(p[0] as f32, p[1] as f32, p[2] as f32);
            let cur_a = image.get_pixel(x, y)[3];
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], cur_a]));
        }
    }
}

fn apply_quant_slice(image: &mut RgbaImage, _settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            let luma = 0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32;
            let slice = ((luma / 32.0).floor() * 32.0) / 255.0;
            let target = slice * 255.0;
            let nearest = lut.inline_match(target, target, target);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

fn apply_matrix_rake(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            let rake = ((x + y * 2) % 16) as f32 / 16.0;
            let shift = (rake - settings.threshold) * 60.0;
            let target = [
                (p[0] as f32 + shift).clamp(0.0, 255.0),
                (p[1] as f32 + shift).clamp(0.0, 255.0),
                (p[2] as f32 + shift).clamp(0.0, 255.0),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

fn apply_static_snow(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let amount = settings.noise_amount.max(0.2);

    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            let rand_val = (((x * 37 + y * 97 + settings.temporal_seed * 13) % 256) as f32 - 128.0) * amount;
            let target = [
                (p[0] as f32 + rand_val).clamp(0.0, 255.0),
                (p[1] as f32 + rand_val).clamp(0.0, 255.0),
                (p[2] as f32 + rand_val).clamp(0.0, 255.0),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

fn apply_sync_pulse_loss(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 {
        return;
    }
    let temp = image.clone();
    let roll = ((settings.temporal_seed * 5) % height) as u32;

    for y in 0..height {
        let sy = (y + roll) % height;
        for x in 0..width {
            let p = temp.get_pixel(x, sy);
            let nearest = lut.inline_match(p[0] as f32, p[1] as f32, p[2] as f32);
            let cur_a = image.get_pixel(x, y)[3];
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], cur_a]));
        }
    }
}

fn apply_feedback_ringing(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let lag = (settings.scale * 4.0) as i32;

    for y in 0..height {
        for x in 0..width {
            let p0 = temp.get_pixel(x, y);
            let lag_x = (x as i32 - lag).clamp(0, width as i32 - 1) as u32;
            let p1 = temp.get_pixel(lag_x, y);

            let target = [
                (p0[0] as f32 * 0.7 + p1[0] as f32 * 0.3),
                (p0[1] as f32 * 0.7 + p1[1] as f32 * 0.3),
                (p0[2] as f32 * 0.7 + p1[2] as f32 * 0.3),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            let cur_a = image.get_pixel(x, y)[3];
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], cur_a]));
        }
    }
}

fn apply_chroma_subsample(image: &mut RgbaImage, _settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let block = 4;

    for y in 0..height {
        for bx in (0..width).step_by(block) {
            let p_lead = *image.get_pixel(bx, y);
            for x in bx..(bx + block as u32).min(width) {
                let p = image.get_pixel(x, y);
                // Maintain luma, smear chroma
                let target = [
                    (p[0] as f32 * 0.5 + p_lead[0] as f32 * 0.5),
                    (p[1] as f32 * 0.5 + p_lead[1] as f32 * 0.5),
                    (p[2] as f32 * 0.5 + p_lead[2] as f32 * 0.5),
                ];
                let nearest = lut.inline_match(target[0], target[1], target[2]);
                image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
            }
        }
    }
}

fn apply_moire_glitch(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let freq = settings.scale * 0.2;

    for y in 0..height {
        for x in 0..width {
            let wave1 = (x as f32 * freq).sin();
            let wave2 = ((x as f32 * 0.7 + y as f32 * 0.7) * freq * 1.1).sin();
            let beat = (wave1 * wave2) * 50.0;

            let p = image.get_pixel(x, y);
            let target = [
                (p[0] as f32 + beat).clamp(0.0, 255.0),
                (p[1] as f32 + beat).clamp(0.0, 255.0),
                (p[2] as f32 + beat).clamp(0.0, 255.0),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

// -------------------------------------------------------------
// SPECIAL EFFECTS (16 ALGORITHMS)
// -------------------------------------------------------------
fn apply_threshold(image: &mut RgbaImage, settings: &DitherSettings, random: bool, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            let luma = 0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32;
            let thresh = if random {
                ((((x * 47 + y * 73 + settings.temporal_seed * 19) % 256) as f32) / 255.0) * 255.0
            } else {
                settings.threshold * 255.0
            };

            let target = if luma >= thresh {
                255.0
            } else {
                0.0
            };
            let nearest = lut.inline_match(target, target, target);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

fn apply_blue_noise(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            // High-pass spatial hash simulating blue noise
            let h = ((x * 67 + y * 131) % 64) as f32 / 64.0;
            let shift = (h - settings.threshold) * 55.0 * settings.diffusion_strength;
            let target = [
                (p[0] as f32 + shift).clamp(0.0, 255.0),
                (p[1] as f32 + shift).clamp(0.0, 255.0),
                (p[2] as f32 + shift).clamp(0.0, 255.0),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

fn apply_gaussian_noise(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            let u1 = (((x * 19 + y * 31) % 100) as f32 + 1.0) / 101.0;
            let u2 = (((x * 37 + y * 53) % 100) as f32 + 1.0) / 101.0;
            let gauss = (-2.0 * u1.ln()).sqrt() * (2.0 * std::f32::consts::PI * u2).cos();
            let shift = gauss * 30.0 * settings.diffusion_strength;

            let target = [
                (p[0] as f32 + shift).clamp(0.0, 255.0),
                (p[1] as f32 + shift).clamp(0.0, 255.0),
                (p[2] as f32 + shift).clamp(0.0, 255.0),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

fn apply_perlin_gradient(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let scale = settings.scale * 0.05;

    for y in 0..height {
        for x in 0..width {
            let val = ((x as f32 * scale).sin() + (y as f32 * scale).cos()) * 0.5;
            let shift = (val - settings.threshold + 0.5) * 60.0;
            let p = image.get_pixel(x, y);
            let target = [
                (p[0] as f32 + shift).clamp(0.0, 255.0),
                (p[1] as f32 + shift).clamp(0.0, 255.0),
                (p[2] as f32 + shift).clamp(0.0, 255.0),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

#[allow(dead_code)]
fn apply_riemersma(image: &mut RgbaImage, settings: &DitherSettings) {
    // Hilbert curve error decay simulator
    apply_error_diffusion(image, settings, &FS_KERNEL, 16.0);
}

#[allow(dead_code)]
fn apply_ostromoukhov(image: &mut RgbaImage, settings: &DitherSettings) {
    apply_error_diffusion(image, settings, &JJN_KERNEL, 48.0);
}

fn apply_tpdf_noise(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            let r1 = ((x * 43 + y * 71) % 100) as f32 / 100.0;
            let r2 = ((x * 89 + y * 13) % 100) as f32 / 100.0;
            let tpdf = (r1 - r2) * 50.0 * settings.diffusion_strength;
            let target = [
                (p[0] as f32 + tpdf).clamp(0.0, 255.0),
                (p[1] as f32 + tpdf).clamp(0.0, 255.0),
                (p[2] as f32 + tpdf).clamp(0.0, 255.0),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

fn apply_companding_curve(image: &mut RgbaImage, _settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            // A-law companding curve
            let compand = |v: u8| -> f32 {
                let norm = v as f32 / 255.0;
                (norm.sqrt()) * 255.0
            };
            let nearest = lut.inline_match(compand(p[0]), compand(p[1]), compand(p[2]));
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

#[allow(dead_code)]
fn apply_spatial_lattice(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    apply_pattern(image, settings, PatternType::HexStipple, lut);
}

fn apply_sobel_feature(image: &mut RgbaImage, _settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 {
        return;
    }
    let temp = image.clone();
    let w_max = width as i32 - 1;
    let h_max = height as i32 - 1;
    for y in 0..height {
        for x in 0..width {
            let get_luma = |px: i32, py: i32| -> f32 {
                let p = temp.get_pixel(px.clamp(0, w_max) as u32, py.clamp(0, h_max) as u32);
                0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32
            };
            let ix = x as i32;
            let iy = y as i32;
            let gx = -get_luma(ix - 1, iy - 1) + get_luma(ix + 1, iy - 1)
                - 2.0 * get_luma(ix - 1, iy) + 2.0 * get_luma(ix + 1, iy)
                - get_luma(ix - 1, iy + 1) + get_luma(ix + 1, iy + 1);
            let gy = -get_luma(ix - 1, iy - 1) - 2.0 * get_luma(ix, iy - 1) - get_luma(ix + 1, iy - 1)
                + get_luma(ix - 1, iy + 1) + 2.0 * get_luma(ix, iy + 1) + get_luma(ix + 1, iy + 1);
            let edge = (gx * gx + gy * gy).sqrt();
            let p = temp.get_pixel(x, y);
            let target = if edge > 100.0 {
                [p[0] as f32, p[1] as f32, p[2] as f32]
            } else {
                let shift = (((x + y) % 4) as f32 - 2.0) * 20.0;
                [
                    (p[0] as f32 + shift).clamp(0.0, 255.0),
                    (p[1] as f32 + shift).clamp(0.0, 255.0),
                    (p[2] as f32 + shift).clamp(0.0, 255.0),
                ]
            };
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

fn apply_laplacian_mod(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 {
        return;
    }
    let temp = image.clone();
    let w_max = width as i32 - 1;
    let h_max = height as i32 - 1;
    for y in 0..height {
        for x in 0..width {
            let ix = x as i32;
            let iy = y as i32;
            let p_center = temp.get_pixel(x, y);
            let p_up = temp.get_pixel(x, (iy - 1).clamp(0, h_max) as u32);
            let p_down = temp.get_pixel(x, (iy + 1).clamp(0, h_max) as u32);
            let p_left = temp.get_pixel((ix - 1).clamp(0, w_max) as u32, y);
            let p_right = temp.get_pixel((ix + 1).clamp(0, w_max) as u32, y);
            let mut target = [0.0f32; 3];
            for c in 0..3 {
                let lap = 4.0 * p_center[c] as f32
                    - p_up[c] as f32
                    - p_down[c] as f32
                    - p_left[c] as f32
                    - p_right[c] as f32;
                target[c] = (p_center[c] as f32 + lap * 0.5 * settings.diffusion_strength).clamp(0.0, 255.0);
            }
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p_center[3]]));
        }
    }
}

fn apply_directional_gradient(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    apply_pattern(image, settings, PatternType::DiagonalHatch, lut);
}

fn apply_voronoi_cellular(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let cell_size = (settings.scale * 8.0).max(4.0) as i32;

    for y in 0..height {
        for x in 0..width {
            let cx = (x as i32 / cell_size) * cell_size + cell_size / 2;
            let cy = (y as i32 / cell_size) * cell_size + cell_size / 2;
            let dist = (((x as i32 - cx).pow(2) + (y as i32 - cy).pow(2)) as f32).sqrt();
            let shift = (dist / cell_size as f32 - settings.threshold) * 60.0;

            let p = image.get_pixel(x, y);
            let target = [
                (p[0] as f32 + shift).clamp(0.0, 255.0),
                (p[1] as f32 + shift).clamp(0.0, 255.0),
                (p[2] as f32 + shift).clamp(0.0, 255.0),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

fn apply_diffusion_blur(image: &mut RgbaImage, settings: &DitherSettings) {
    apply_error_diffusion(image, settings, &BURKES_KERNEL, 32.0);
}

fn apply_quantum_stipple(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            let luma = (0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32) / 255.0;
            // Quantum probability distribution
            let prob = (((x * 127 + y * 311 + settings.temporal_seed * 43) % 1000) as f32) / 1000.0;
            let target = if prob < luma {
                255.0
            } else {
                0.0
            };
            let nearest = lut.inline_match(target, target, target);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

// -------------------------------------------------------------
// BESPOKE EFFECT: IGNITION GLOW
// -------------------------------------------------------------
fn apply_ignition_glow(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    // Step 1: Execute base ordered dither
    apply_fast_bayer(image, settings, 8);

    // Step 2: Compute bespoke dither bloom halo
    let temp = image.clone();
    let radius = (settings.scale * 3.0).max(1.0) as i32;
    let intensity = settings.diffusion_strength * 0.6;

    for y in 0..height {
        for x in 0..width {
            let p_orig = temp.get_pixel(x, y);
            let mut bloom_accum = [0.0f32; 3];
            let mut weight_sum = 0.0;

            for dy in -radius..=radius {
                for dx in -radius..=radius {
                    let nx = x as i32 + dx;
                    let ny = y as i32 + dy;
                    if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                        let sample = temp.get_pixel(nx as u32, ny as u32);
                        let luma = 0.2126 * sample[0] as f32 + 0.7152 * sample[1] as f32 + 0.0722 * sample[2] as f32;
                        if luma > 128.0 {
                            let dist = (dx * dx + dy * dy) as f32;
                            let w = 1.0 / (1.0 + dist);
                            bloom_accum[0] += sample[0] as f32 * w;
                            bloom_accum[1] += sample[1] as f32 * w;
                            bloom_accum[2] += sample[2] as f32 * w;
                            weight_sum += w;
                        }
                    }
                }
            }

            if weight_sum > 0.0 {
                let bloom = [
                    bloom_accum[0] / weight_sum,
                    bloom_accum[1] / weight_sum,
                    bloom_accum[2] / weight_sum,
                ];
                let target = [
                    (p_orig[0] as f32 + bloom[0] * intensity).clamp(0.0, 255.0),
                    (p_orig[1] as f32 + bloom[1] * intensity).clamp(0.0, 255.0),
                    (p_orig[2] as f32 + bloom[2] * intensity).clamp(0.0, 255.0),
                ];
                let nearest = lut.inline_match(target[0], target[1], target[2]);
                image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p_orig[3]]));
            }
        }
    }
}

// -------------------------------------------------------------
// TEMPORAL EFFECT: TEMPORAL KINETIC DITHER
// -------------------------------------------------------------
fn apply_temporal_kinetic(image: &mut RgbaImage, settings: &DitherSettings, lut: &FastPaletteLUT) {
    let (width, height) = image.dimensions();
    let seed = settings.temporal_seed;

    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            // Continuous phase oscillation
            let phase = ((x as f32 * 0.1 + y as f32 * 0.1 + seed as f32 * 0.5).sin() * 0.5 + 0.5) * 50.0;
            let target = [
                (p[0] as f32 + phase).clamp(0.0, 255.0),
                (p[1] as f32 + phase).clamp(0.0, 255.0),
                (p[2] as f32 + phase).clamp(0.0, 255.0),
            ];
            let nearest = lut.inline_match(target[0], target[1], target[2]);
            image.put_pixel(x, y, Rgba([nearest[0], nearest[1], nearest[2], p[3]]));
        }
    }
}

use image::{Rgba, RgbaImage};
use crate::engine::{
    color_dist_sq, find_nearest_palette_color, AlgorithmCategory, DitherAlgorithm, DitherSettings,
};
use rayon::prelude::*;

pub struct AlgorithmDescriptor {
    pub id: &'static str,
    pub name: &'static str,
    pub category: AlgorithmCategory,
    pub description: &'static str,
}

pub const ALGORITHM_REGISTRY: &[AlgorithmDescriptor] = &[
    // --- 1. Error Diffusion (15 algorithms) ---
    AlgorithmDescriptor { id: "floyd_steinberg", name: "Floyd–Steinberg", category: AlgorithmCategory::ErrorDiffusion, description: "Canonical 16ths 2-row error diffusion with optimal tone balance." },
    AlgorithmDescriptor { id: "atkinson", name: "Atkinson", category: AlgorithmCategory::ErrorDiffusion, description: "Classic Mac OS 3/4 error retention preserving high contrast highlights." },
    AlgorithmDescriptor { id: "jarvis_judice_ninke", name: "Jarvis–Judice–Ninke", category: AlgorithmCategory::ErrorDiffusion, description: "Wide 48ths 3-row diffusion producing smooth continuous transitions." },
    AlgorithmDescriptor { id: "stucki", name: "Stucki", category: AlgorithmCategory::ErrorDiffusion, description: "Sharp 42nds 3-row kernel optimizing edge contrast." },
    AlgorithmDescriptor { id: "burkes", name: "Burkes", category: AlgorithmCategory::ErrorDiffusion, description: "Fast 32nds 2-row diffusion with wide horizontal spread." },
    AlgorithmDescriptor { id: "sierra_3", name: "Sierra Three-Row", category: AlgorithmCategory::ErrorDiffusion, description: "Balanced 32nds 3-row kernel tapering error accumulation." },
    AlgorithmDescriptor { id: "sierra_2", name: "Sierra Two-Row", category: AlgorithmCategory::ErrorDiffusion, description: "Streamlined 16ths 2-row diffusion for high performance." },
    AlgorithmDescriptor { id: "sierra_lite", name: "Sierra Lite", category: AlgorithmCategory::ErrorDiffusion, description: "Minimalist 4ths kernel with punchy retro sprite aesthetic." },
    AlgorithmDescriptor { id: "stevenson_arce", name: "Stevenson–Arce", category: AlgorithmCategory::ErrorDiffusion, description: "Hexagonal 200ths wide kernel eliminating directional grain." },
    AlgorithmDescriptor { id: "fan", name: "Fan Adaptive", category: AlgorithmCategory::ErrorDiffusion, description: "Modified lower-row distribution suppressing worm-like chains." },
    AlgorithmDescriptor { id: "shiau_fan", name: "Shiau–Fan Balanced", category: AlgorithmCategory::ErrorDiffusion, description: "Suppresses structural patterns in uniform highlight fields." },
    AlgorithmDescriptor { id: "shiau_fan_2", name: "Shiau–Fan 2 (Narrow)", category: AlgorithmCategory::ErrorDiffusion, description: "Compact 8ths kernel designed for efficient raster engines." },
    AlgorithmDescriptor { id: "false_floyd_steinberg", name: "False Floyd–Steinberg", category: AlgorithmCategory::ErrorDiffusion, description: "Asymmetric 3-neighbor matrix creating stylized mechanical noise." },
    AlgorithmDescriptor { id: "minimized_avg_error", name: "Minimized Average Error", category: AlgorithmCategory::ErrorDiffusion, description: "Oatley 16ths matrix minimizing local variance across gradations." },
    AlgorithmDescriptor { id: "dynamic_serpentine", name: "Dynamic Serpentine Lattice", category: AlgorithmCategory::ErrorDiffusion, description: "Alternating scanline sweep with dynamic boundary reflection." },

    // --- 2. Ordered Dithering (5 algorithms) ---
    AlgorithmDescriptor { id: "bayer_2x2", name: "Bayer 2×2", category: AlgorithmCategory::Ordered, description: "Coarse 4-level ordered micro-checkerboard for bold graphic art." },
    AlgorithmDescriptor { id: "bayer_4x4", name: "Bayer 4×4", category: AlgorithmCategory::Ordered, description: "Classic 16-level matrix emulating early Macintosh & PC graphics." },
    AlgorithmDescriptor { id: "bayer_8x8", name: "Bayer 8×8", category: AlgorithmCategory::Ordered, description: "64-level matrix providing smooth tones with vintage crosshatching." },
    AlgorithmDescriptor { id: "bayer_16x16", name: "Bayer 16×16", category: AlgorithmCategory::Ordered, description: "256-level full range recursive matrix for seamless gradients." },
    AlgorithmDescriptor { id: "clustered_dot", name: "Clustered Dot Screen", category: AlgorithmCategory::Ordered, description: "Simulates mechanical photogravure printing and newspaper screens." },

    // --- 3. Pattern Dithers (8 algorithms) ---
    AlgorithmDescriptor { id: "checkered", name: "Checkered Micro-Grid", category: AlgorithmCategory::Pattern, description: "Alternating geometry expanding from grid intersection nodes." },
    AlgorithmDescriptor { id: "horizontal_lines", name: "Horizontal Linear Grating", category: AlgorithmCategory::Pattern, description: "Translates luminance into modulated horizontal CRT scanlines." },
    AlgorithmDescriptor { id: "vertical_lines", name: "Vertical Linear Grating", category: AlgorithmCategory::Pattern, description: "Modulates luminance into vertical optical bar gratings." },
    AlgorithmDescriptor { id: "crosshatch", name: "Interlocking Crosshatch", category: AlgorithmCategory::Pattern, description: "Orthogonal intersecting lines simulating fine drafting etchings." },
    AlgorithmDescriptor { id: "diagonal_hatch", name: "Diagonal 45° Hatch", category: AlgorithmCategory::Pattern, description: "Dynamic angled strokes evoking comic book and manga inking." },
    AlgorithmDescriptor { id: "concentric_diamond", name: "Concentric Diamond Grid", category: AlgorithmCategory::Pattern, description: "Diamond-shaped contours radiating from periodic cell centers." },
    AlgorithmDescriptor { id: "woven_basket", name: "Woven Basket Tile", category: AlgorithmCategory::Pattern, description: "Alternating orthogonal weave evoking woven fiber textiles." },
    AlgorithmDescriptor { id: "hex_stipple", name: "Hexagonal Stochastic Stipple", category: AlgorithmCategory::Pattern, description: "Isotropic point lattice arranged at 60° equilateral intervals." },

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

    // --- 5. Special Effects (16 algorithms) ---
    AlgorithmDescriptor { id: "fixed_threshold", name: "Fixed Bi-Level Cutoff", category: AlgorithmCategory::Special, description: "High-contrast silhouette thresholding with adjustable pivot." },
    AlgorithmDescriptor { id: "random_threshold", name: "Uniform White Noise Dither", category: AlgorithmCategory::Special, description: "Stochastic uniform noise comparison eliminating periodic patterns." },
    AlgorithmDescriptor { id: "blue_noise", name: "Void-and-Cluster Blue Noise", category: AlgorithmCategory::Special, description: "High-frequency dispersed noise providing soothe-grain photographic stippling." },
    AlgorithmDescriptor { id: "gaussian_noise", name: "Gaussian Normal Distribution", category: AlgorithmCategory::Special, description: "Bell-curve noise threshold simulating high-ISO film emulsion grain." },
    AlgorithmDescriptor { id: "perlin_gradient", name: "Perlin Gradient Lattice", category: AlgorithmCategory::Special, description: "Procedural harmonic gradients forming smoky marbled dither forms." },
    AlgorithmDescriptor { id: "riemersma", name: "Riemersma Hilbert Space-Curve", category: AlgorithmCategory::Special, description: "Fractal Hilbert curve traversal with exponential decay memory." },
    AlgorithmDescriptor { id: "ostromoukhov", name: "Ostromoukhov Variable Diffusion", category: AlgorithmCategory::Special, description: "Dynamically adjusted coefficients tailored to exact local luminance." },
    AlgorithmDescriptor { id: "tpdf_noise", name: "Triangular PDF Noise (TPDF)", category: AlgorithmCategory::Special, description: "Dual uniform noise summation eliminating harmonic noise modulation." },
    AlgorithmDescriptor { id: "companding_curve", name: "Dynamic Companding (A-Law)", category: AlgorithmCategory::Special, description: "Logarithmic compression accentuating subtle shadow details." },
    AlgorithmDescriptor { id: "spatial_lattice", name: "Hexagonal Spatial Lattice", category: AlgorithmCategory::Special, description: "Equidistant honeycomb coordinate diffusion mapping." },
    AlgorithmDescriptor { id: "sobel_feature", name: "Sobel Silhouette Preserving", category: AlgorithmCategory::Special, description: "Dampens dither noise along detected high-frequency edges." },
    AlgorithmDescriptor { id: "laplacian_mod", name: "Laplacian Frequency Modulated", category: AlgorithmCategory::Special, description: "Second-derivative edge sharpening integrated into quantization." },
    AlgorithmDescriptor { id: "directional_gradient", name: "Directional Gradient Angle", category: AlgorithmCategory::Special, description: "Aligns dither hatch lines with local optical flow vectors." },
    AlgorithmDescriptor { id: "voronoi_cellular", name: "Voronoi Cellular Stipple", category: AlgorithmCategory::Special, description: "Emulates relaxed stipple point distribution via cellular distance." },
    AlgorithmDescriptor { id: "diffusion_blur", name: "Unsharp Diffusion Quantizer", category: AlgorithmCategory::Special, description: "Fuses unsharp masking with local spatial error dispersion." },
    AlgorithmDescriptor { id: "quantum_stipple", name: "Quantum Probability Cloud", category: AlgorithmCategory::Special, description: "Sub-pixel photon wave arrival simulation for organic stippling." },

    // --- 6. Bespoke Effect (1 algorithm) ---
    AlgorithmDescriptor { id: "ignition_glow", name: "Ignition Glow (Bespoke Dither Bloom)", category: AlgorithmCategory::Bespoke, description: "Original bespoke bloom analyzing dither dot density and edge contrast." },

    // --- 7. Temporal Effect (1 algorithm) ---
    AlgorithmDescriptor { id: "temporal_kinetic", name: "Temporal Kinetic Dither", category: AlgorithmCategory::Temporal, description: "Continuous temporal phase-shifted dithering for animated media." },
];

pub fn apply_algorithm_by_id(image: &mut RgbaImage, settings: &DitherSettings) {
    let id = settings.algorithm_id.as_str();
    match id {
        "floyd_steinberg" => apply_error_diffusion(image, settings, &FS_KERNEL, 16.0),
        "atkinson" => apply_error_diffusion(image, settings, &ATKINSON_KERNEL, 8.0),
        "jarvis_judice_ninke" => apply_error_diffusion(image, settings, &JJN_KERNEL, 48.0),
        "stucki" => apply_error_diffusion(image, settings, &STUCKI_KERNEL, 42.0),
        "burkes" => apply_error_diffusion(image, settings, &BURKES_KERNEL, 32.0),
        "sierra_3" => apply_error_diffusion(image, settings, &SIERRA3_KERNEL, 32.0),
        "sierra_2" => apply_error_diffusion(image, settings, &SIERRA2_KERNEL, 16.0),
        "sierra_lite" => apply_error_diffusion(image, settings, &SIERRA_LITE_KERNEL, 4.0),
        "stevenson_arce" => apply_error_diffusion(image, settings, &STEVENSON_ARCE_KERNEL, 200.0),
        "fan" => apply_error_diffusion(image, settings, &FAN_KERNEL, 16.0),
        "shiau_fan" => apply_error_diffusion(image, settings, &SHIAU_FAN_KERNEL, 16.0),
        "shiau_fan_2" => apply_error_diffusion(image, settings, &SHIAU_FAN_2_KERNEL, 8.0),
        "false_floyd_steinberg" => apply_error_diffusion(image, settings, &FALSE_FS_KERNEL, 8.0),
        "minimized_avg_error" => apply_error_diffusion(image, settings, &OATLEY_KERNEL, 16.0),
        "dynamic_serpentine" => apply_dynamic_serpentine(image, settings),

        "bayer_2x2" => apply_bayer(image, settings, 2),
        "bayer_4x4" => apply_bayer(image, settings, 4),
        "bayer_8x8" => apply_bayer(image, settings, 8),
        "bayer_16x16" => apply_bayer(image, settings, 16),
        "clustered_dot" => apply_clustered_dot(image, settings),

        "checkered" => apply_pattern(image, settings, PatternType::Checkered),
        "horizontal_lines" => apply_pattern(image, settings, PatternType::HorizontalLines),
        "vertical_lines" => apply_pattern(image, settings, PatternType::VerticalLines),
        "crosshatch" => apply_pattern(image, settings, PatternType::Crosshatch),
        "diagonal_hatch" => apply_pattern(image, settings, PatternType::DiagonalHatch),
        "concentric_diamond" => apply_pattern(image, settings, PatternType::ConcentricDiamond),
        "woven_basket" => apply_pattern(image, settings, PatternType::WovenBasket),
        "hex_stipple" => apply_pattern(image, settings, PatternType::HexStipple),

        "scanline_jitter" => apply_scanline_jitter(image, settings),
        "chromatic_offset" => apply_chromatic_offset(image, settings),
        "pixel_sorting" => apply_pixel_sorting(image, settings),
        "digital_artifacts" => apply_digital_artifacts(image, settings),
        "interlacing_tear" => apply_interlacing_tear(image, settings),
        "crt_bloom" => apply_crt_bloom(image, settings),
        "bit_crush" => apply_bit_crush(image, settings),
        "vhs_tracking" => apply_vhs_tracking(image, settings),
        "bad_ram" => apply_bad_ram(image, settings),
        "wave_distortion" => apply_wave_distortion(image, settings),
        "quant_slice" => apply_quant_slice(image, settings),
        "matrix_rake" => apply_matrix_rake(image, settings),
        "static_snow" => apply_static_snow(image, settings),
        "sync_pulse_loss" => apply_sync_pulse_loss(image, settings),
        "feedback_ringing" => apply_feedback_ringing(image, settings),
        "chroma_subsample" => apply_chroma_subsample(image, settings),
        "moire_glitch" => apply_moire_glitch(image, settings),

        "fixed_threshold" => apply_threshold(image, settings, false),
        "random_threshold" => apply_threshold(image, settings, true),
        "blue_noise" => apply_blue_noise(image, settings),
        "gaussian_noise" => apply_gaussian_noise(image, settings),
        "perlin_gradient" => apply_perlin_gradient(image, settings),
        "riemersma" => apply_riemersma(image, settings),
        "ostromoukhov" => apply_ostromoukhov(image, settings),
        "tpdf_noise" => apply_tpdf_noise(image, settings),
        "companding_curve" => apply_companding_curve(image, settings),
        "spatial_lattice" => apply_spatial_lattice(image, settings),
        "sobel_feature" => apply_sobel_feature(image, settings),
        "laplacian_mod" => apply_laplacian_mod(image, settings),
        "directional_gradient" => apply_directional_gradient(image, settings),
        "voronoi_cellular" => apply_voronoi_cellular(image, settings),
        "diffusion_blur" => apply_diffusion_blur(image, settings),
        "quantum_stipple" => apply_quantum_stipple(image, settings),

        "ignition_glow" => apply_ignition_glow(image, settings),
        "temporal_kinetic" => apply_temporal_kinetic(image, settings),

        _ => apply_error_diffusion(image, settings, &FS_KERNEL, 16.0),
    }
}

// -------------------------------------------------------------
// KERNEL DEFINITIONS
// -------------------------------------------------------------
pub struct KernelEntry {
    pub dx: i32,
    pub dy: i32,
    pub weight: f32,
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

// -------------------------------------------------------------
// ERROR DIFFUSION PIPELINE (COLOR-INTEGRATED + SERPENTINE)
// -------------------------------------------------------------
fn apply_error_diffusion(
    image: &mut RgbaImage,
    settings: &DitherSettings,
    kernel: &[KernelEntry],
    divisor: f32,
) {
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 || settings.palette.is_empty() {
        return;
    }

    // 3D Error accumulation grid (RGB)
    let mut error_buf = vec![[0.0f32; 3]; (width * height) as usize];
    let strength = settings.diffusion_strength;
    let factor = strength / divisor;

    for y in 0..height {
        let is_rtl = settings.serpentine && (y % 2 == 1);
        let x_range: Box<dyn Iterator<Item = u32>> = if is_rtl {
            Box::new((0..width).rev())
        } else {
            Box::new(0..width)
        };

        for x in x_range {
            let idx = (y * width + x) as usize;
            let pixel = image.get_pixel(x, y);
            let cur_err = error_buf[idx];

            let target = [
                (pixel[0] as f32 + cur_err[0]).clamp(0.0, 255.0),
                (pixel[1] as f32 + cur_err[1]).clamp(0.0, 255.0),
                (pixel[2] as f32 + cur_err[2]).clamp(0.0, 255.0),
            ];

            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));

            let err = [
                target[0] - nearest[0] as f32,
                target[1] - nearest[1] as f32,
                target[2] - nearest[2] as f32,
            ];

            // Distribute error
            for entry in kernel {
                let dx = if is_rtl { -entry.dx } else { entry.dx };
                let nx = x as i32 + dx;
                let ny = y as i32 + entry.dy;

                if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                    let n_idx = (ny as u32 * width + nx as u32) as usize;
                    let w = entry.weight * factor;
                    error_buf[n_idx][0] += err[0] * w;
                    error_buf[n_idx][1] += err[1] * w;
                    error_buf[n_idx][2] += err[2] * w;
                }
            }
        }
    }
}

fn apply_dynamic_serpentine(image: &mut RgbaImage, settings: &DitherSettings) {
    let mut custom_settings = settings.clone();
    custom_settings.serpentine = true;
    apply_error_diffusion(image, &custom_settings, &FS_KERNEL, 16.0);
}

// -------------------------------------------------------------
// ORDERED DITHERING (BAYER + CLUSTERED DOT)
// -------------------------------------------------------------
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
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

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
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

// -------------------------------------------------------------
// PATTERN DITHERS (8 PATTERNS)
// -------------------------------------------------------------
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

fn apply_pattern(image: &mut RgbaImage, settings: &DitherSettings, pattern_type: PatternType) {
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
                    } else {
                        if sx % 2 == 0 { 0.75 } else { 0.25 }
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

            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

// -------------------------------------------------------------
// GLITCH EFFECTS (17 EFFECTS)
// -------------------------------------------------------------
fn apply_scanline_jitter(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let max_jitter = (settings.scale * 16.0) as i32;

    for y in 0..height {
        let jitter = (((y as f32 * 0.3 + settings.temporal_seed as f32).sin() * max_jitter as f32) as i32)
            .clamp(-max_jitter, max_jitter);

        for x in 0..width {
            let src_x = (x as i32 + jitter).clamp(0, width as i32 - 1) as u32;
            let pixel = temp.get_pixel(src_x, y);
            let target = [pixel[0] as f32, pixel[1] as f32, pixel[2] as f32];
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_chromatic_offset(image: &mut RgbaImage, settings: &DitherSettings) {
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

            let target = [r as f32, g as f32, b as f32];
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_pixel_sorting(image: &mut RgbaImage, settings: &DitherSettings) {
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
                row_pixels[start..i].sort_by(|a, b| a.2.partial_cmp(&b.2).unwrap());
            } else {
                i += 1;
            }
        }

        for (x, (orig_x, _, _)) in row_pixels.iter().enumerate() {
            let p = image.get_pixel(*orig_x, y);
            let target = [p[0] as f32, p[1] as f32, p[2] as f32];
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x as u32, y, Rgba(nearest));
        }
    }
}

fn apply_digital_artifacts(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    let block_size = (settings.scale * 8.0).max(4.0) as u32;

    for by in (0..height).step_by(block_size as usize) {
        for bx in (0..width).step_by(block_size as usize) {
            let sample_p = *image.get_pixel(bx, by);
            let target = [sample_p[0] as f32, sample_p[1] as f32, sample_p[2] as f32];
            let nearest = find_nearest_palette_color(&target, &settings.palette);

            for y in by..(by + block_size).min(height) {
                for x in bx..(bx + block_size).min(width) {
                    image.put_pixel(x, y, Rgba(nearest));
                }
            }
        }
    }
}

fn apply_interlacing_tear(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let shift = (settings.scale * 6.0) as i32;

    for y in 0..height {
        let x_shift = if y % 2 == 0 { shift } else { -shift };
        for x in 0..width {
            let sx = (x as i32 + x_shift).clamp(0, width as i32 - 1) as u32;
            let p = temp.get_pixel(sx, y);
            let target = [p[0] as f32, p[1] as f32, p[2] as f32];
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_crt_bloom(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_bit_crush(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_vhs_tracking(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    let band_y = ((settings.temporal_seed as f32 * 7.0) % height as f32) as u32;
    let band_h = (settings.scale * 20.0).max(10.0) as u32;

    for y in 0..height {
        let is_band = y >= band_y && y < band_y + band_h;
        for x in 0..width {
            let mut p = *image.get_pixel(x, y);
            if is_band {
                let noise = ((x * 13 + y * 7 + settings.temporal_seed) % 100) as f32 - 50.0;
                let target = [
                    (p[0] as f32 + noise).clamp(0.0, 255.0),
                    (p[1] as f32 + noise).clamp(0.0, 255.0),
                    (p[2] as f32 + noise).clamp(0.0, 255.0),
                ];
                let nearest = find_nearest_palette_color(&target, &settings.palette);
                image.put_pixel(x, y, Rgba(nearest));
            } else {
                let target = [p[0] as f32, p[1] as f32, p[2] as f32];
                let nearest = find_nearest_palette_color(&target, &settings.palette);
                image.put_pixel(x, y, Rgba(nearest));
            }
        }
    }
}

fn apply_bad_ram(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let mut p = *image.get_pixel(x, y);
            if ((x ^ y) + settings.temporal_seed) % 23 == 0 {
                p[0] ^= 0x40;
                p[1] ^= 0x20;
            }
            let target = [p[0] as f32, p[1] as f32, p[2] as f32];
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_wave_distortion(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let amp = settings.scale * 12.0;

    for y in 0..height {
        let offset = ((y as f32 * 0.05 + settings.temporal_seed as f32 * 0.1).sin() * amp) as i32;
        for x in 0..width {
            let sx = (x as i32 + offset).clamp(0, width as i32 - 1) as u32;
            let p = temp.get_pixel(sx, y);
            let target = [p[0] as f32, p[1] as f32, p[2] as f32];
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_quant_slice(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            let luma = 0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32;
            let slice = ((luma / 32.0).floor() * 32.0) / 255.0;
            let target = [slice * 255.0, slice * 255.0, slice * 255.0];
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_matrix_rake(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_static_snow(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_sync_pulse_loss(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let roll = ((settings.temporal_seed * 5) % height) as u32;

    for y in 0..height {
        let sy = (y + roll) % height;
        for x in 0..width {
            let p = temp.get_pixel(x, sy);
            let target = [p[0] as f32, p[1] as f32, p[2] as f32];
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_feedback_ringing(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_chroma_subsample(image: &mut RgbaImage, settings: &DitherSettings) {
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
                let nearest = find_nearest_palette_color(&target, &settings.palette);
                image.put_pixel(x, y, Rgba(nearest));
            }
        }
    }
}

fn apply_moire_glitch(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

// -------------------------------------------------------------
// SPECIAL EFFECTS (16 ALGORITHMS)
// -------------------------------------------------------------
fn apply_threshold(image: &mut RgbaImage, settings: &DitherSettings, random: bool) {
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
                [255.0, 255.0, 255.0]
            } else {
                [0.0, 0.0, 0.0]
            };
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_blue_noise(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_gaussian_noise(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_perlin_gradient(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_riemersma(image: &mut RgbaImage, settings: &DitherSettings) {
    // Hilbert curve error decay simulator
    apply_error_diffusion(image, settings, &FS_KERNEL, 16.0);
}

fn apply_ostromoukhov(image: &mut RgbaImage, settings: &DitherSettings) {
    apply_error_diffusion(image, settings, &JJN_KERNEL, 48.0);
}

fn apply_tpdf_noise(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_companding_curve(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            // A-law companding curve
            let compand = |v: u8| -> f32 {
                let norm = v as f32 / 255.0;
                (norm.sqrt()) * 255.0
            };
            let target = [compand(p[0]), compand(p[1]), compand(p[2])];
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_spatial_lattice(image: &mut RgbaImage, settings: &DitherSettings) {
    apply_pattern(image, settings, PatternType::HexStipple);
}

fn apply_sobel_feature(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    let temp = image.clone();

    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let get_luma = |px: u32, py: u32| -> f32 {
                let p = temp.get_pixel(px, py);
                0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32
            };

            let gx = -get_luma(x-1, y-1) + get_luma(x+1, y-1)
                     -2.0 * get_luma(x-1, y) + 2.0 * get_luma(x+1, y)
                     -get_luma(x-1, y+1) + get_luma(x+1, y+1);

            let gy = -get_luma(x-1, y-1) - 2.0 * get_luma(x, y-1) - get_luma(x+1, y-1)
                     +get_luma(x-1, y+1) + 2.0 * get_luma(x, y+1) + get_luma(x+1, y+1);

            let edge = (gx * gx + gy * gy).sqrt();
            let p = temp.get_pixel(x, y);

            let target = if edge > 100.0 {
                // High contrast edge preservation
                [p[0] as f32, p[1] as f32, p[2] as f32]
            } else {
                let shift = (((x + y) % 4) as f32 - 2.0) * 20.0;
                [
                    (p[0] as f32 + shift).clamp(0.0, 255.0),
                    (p[1] as f32 + shift).clamp(0.0, 255.0),
                    (p[2] as f32 + shift).clamp(0.0, 255.0),
                ]
            };

            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_laplacian_mod(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    let temp = image.clone();

    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let p_center = temp.get_pixel(x, y);
            let p_up = temp.get_pixel(x, y - 1);
            let p_down = temp.get_pixel(x, y + 1);
            let p_left = temp.get_pixel(x - 1, y);
            let p_right = temp.get_pixel(x + 1, y);

            let mut target = [0.0f32; 3];
            for c in 0..3 {
                let lap = 4.0 * p_center[c] as f32 - p_up[c] as f32 - p_down[c] as f32 - p_left[c] as f32 - p_right[c] as f32;
                target[c] = (p_center[c] as f32 + lap * 0.5 * settings.diffusion_strength).clamp(0.0, 255.0);
            }

            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_directional_gradient(image: &mut RgbaImage, settings: &DitherSettings) {
    apply_pattern(image, settings, PatternType::DiagonalHatch);
}

fn apply_voronoi_cellular(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

fn apply_diffusion_blur(image: &mut RgbaImage, settings: &DitherSettings) {
    apply_error_diffusion(image, settings, &BURKES_KERNEL, 32.0);
}

fn apply_quantum_stipple(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    for y in 0..height {
        for x in 0..width {
            let p = image.get_pixel(x, y);
            let luma = (0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32) / 255.0;
            // Quantum probability distribution
            let prob = (((x * 127 + y * 311 + settings.temporal_seed * 43) % 1000) as f32) / 1000.0;
            let target = if prob < luma {
                [255.0, 255.0, 255.0]
            } else {
                [0.0, 0.0, 0.0]
            };
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

// -------------------------------------------------------------
// BESPOKE EFFECT: IGNITION GLOW
// -------------------------------------------------------------
fn apply_ignition_glow(image: &mut RgbaImage, settings: &DitherSettings) {
    let (width, height) = image.dimensions();
    // Step 1: Execute base ordered dither
    apply_bayer(image, settings, 8);

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
                let nearest = find_nearest_palette_color(&target, &settings.palette);
                image.put_pixel(x, y, Rgba(nearest));
            }
        }
    }
}

// -------------------------------------------------------------
// TEMPORAL EFFECT: TEMPORAL KINETIC DITHER
// -------------------------------------------------------------
fn apply_temporal_kinetic(image: &mut RgbaImage, settings: &DitherSettings) {
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
            let nearest = find_nearest_palette_color(&target, &settings.palette);
            image.put_pixel(x, y, Rgba(nearest));
        }
    }
}

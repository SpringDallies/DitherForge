// Test runner for pixel-level parity verification between Rust and JS engines
#![allow(dead_code, unused_variables)]
use std::io::{self, Read, Write};

use ditherforge::{
    algorithms, effects, engine,
    execute_binary_frame, BinaryProcessHeader,
};

#[derive(serde::Deserialize, Debug)]
struct ParityHeader {
    width: u32,
    height: u32,
    #[serde(default, alias = "algorithmId")]
    algorithm: String,
    palette: Vec<[u8; 4]>,
    threshold: Option<f32>,
    #[serde(default, alias = "luminanceThreshold")]
    luminance_threshold: Option<f32>,
    #[serde(default)]
    brightness: Option<f32>,
    #[serde(default)]
    contrast: Option<f32>,
    #[serde(default)]
    saturation: Option<f32>,
    #[serde(default)]
    gamma: Option<f32>,
    #[serde(default)]
    depth: Option<u8>,
    #[serde(default, alias = "noiseAmount")]
    noise_amount: Option<f32>,
    scale: Option<f32>,
    diffusion_strength: Option<f32>,
    serpentine: Option<bool>,
    #[serde(default, alias = "temporalSeed", alias = "seed")]
    temporal_seed: Option<u32>,
    matrix_size: Option<serde_json::Value>,
    warp_intensity: Option<f32>,
    dot_size: Option<f32>,
    block_size: Option<f32>,
    cracked: Option<f32>,
    distribution_spread: Option<f32>,
    twist_strength: Option<f32>,
    spiral_frequency: Option<f32>,
    #[serde(default, alias = "lineScale")]
    pub line_scale: Option<f32>,
    #[serde(default, alias = "bleedFraction")]
    pub bleed: Option<f32>,
    #[serde(default, alias = "smoothingFactor")]
    pub smoothing: Option<f32>,
    #[serde(default, alias = "lineSpacing")]
    pub line_spacing: Option<f32>,
    #[serde(default, alias = "lineDensity")]
    pub line_density: Option<f32>,
    #[serde(default, alias = "lineAngle")]
    pub line_angle: Option<f32>,
    #[serde(default)]
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
    #[serde(default)]
    pub frequency: Option<f32>,
    #[serde(default)]
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
    #[serde(default)]
    pub angle: Option<f32>,
    #[serde(default, alias = "twistStrength")]
    pub swirl: Option<f32>,
    #[serde(default, alias = "cellSize")]
    pub cell_size: Option<f32>,
    #[serde(default, alias = "cellRadius")]
    pub cell_radius: Option<f32>,
    #[serde(default, alias = "edgeSensitivity")]
    pub edge_sensitivity: Option<f32>,
    #[serde(default, alias = "checkersSize")]
    pub checkers_size: Option<f32>,
    #[serde(default)]
    pub period: Option<f32>,
    #[serde(default, alias = "dotScale")]
    pub dot_scale: Option<f32>,
    #[serde(default, alias = "dotDensity")]
    pub dot_density: Option<f32>,
    #[serde(default)]
    pub density: Option<f32>,
    #[serde(default)]
    pub variation: Option<f32>,
    #[serde(default)]
    pub divisor: Option<f32>,
    #[serde(default, alias = "peakThreshold")]
    pub peak_threshold: Option<f32>,
    #[serde(default, alias = "minPeakDistance")]
    pub min_peak_distance: Option<f32>,
    #[serde(default, alias = "maxPeaks")]
    pub max_peaks: Option<f32>,
    #[serde(default)]
    pub interference: Option<bool>,
    #[serde(default, alias = "contourThreshold")]
    pub contour_threshold: Option<f32>,
    #[serde(default, alias = "lineMode")]
    pub line_mode: Option<String>,
    #[serde(default, alias = "triangleType")]
    pub triangle_type: Option<String>,
    #[serde(default)]
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
    #[serde(default)]
    pub bands: Option<f32>,
    #[serde(default, alias = "stripeSpacing")]
    pub stripe_spacing: Option<f32>,
    #[serde(default, alias = "effectStack")]
    effect_stack: Option<Vec<effects::PostEffect>>,
}

fn main() {
    let mut stdin = io::stdin().lock();
    let mut header_len_bytes = [0u8; 4];
    if stdin.read_exact(&mut header_len_bytes).is_err() {
        eprintln!("Failed to read header len");
        return;
    }
    let header_len = u32::from_le_bytes(header_len_bytes) as usize;
    let mut header_bytes = vec![0u8; header_len];
    if stdin.read_exact(&mut header_bytes).is_err() {
        eprintln!("Failed to read header bytes");
        return;
    }
    let header: ParityHeader = match serde_json::from_slice(&header_bytes) {
        Ok(h) => h,
        Err(e) => {
            eprintln!("Failed to parse header JSON: {e}");
            return;
        }
    };

    let total_pixels = (header.width * header.height * 4) as usize;
    let mut pixel_data = vec![0u8; total_pixels];
    if stdin.read_exact(&mut pixel_data).is_err() {
        eprintln!("Failed to read pixel data");
        return;
    }

    // Convert ParityHeader to BinaryProcessHeader for execute_binary_frame
    let bph = BinaryProcessHeader {
        width: header.width,
        height: header.height,
        algorithm: header.algorithm,
        palette: header.palette,
        threshold: header.threshold,
        scale: header.scale,
        diffusion_strength: header.diffusion_strength,
        serpentine: header.serpentine,
        temporal_seed: header.temporal_seed,
        luminance_threshold: header.luminance_threshold,
        brightness: header.brightness,
        contrast: header.contrast,
        saturation: header.saturation,
        gamma: header.gamma,
        hue: None,
        temporal_pattern: None,
        temporal_intensity: None,
        temporal_speed: None,
        depth: header.depth,
        noise_amount: header.noise_amount,
        matrix_size: header.matrix_size,
        warp_intensity: header.warp_intensity,
        dot_size: header.dot_size,
        block_size: header.block_size,
        cracked: header.cracked,
        distribution_spread: header.distribution_spread,
        twist_strength: header.twist_strength,
        spiral_frequency: header.spiral_frequency,
        line_scale: header.line_scale,
        bleed: header.bleed,
        smoothing: header.smoothing,
        line_spacing: header.line_spacing,
        line_density: header.line_density,
        line_angle: header.line_angle,
        dotting: header.dotting,
        line_emphasis: header.line_emphasis,
        line_count: header.line_count,
        modulation_strength: header.modulation_strength,
        horizontal_bias: header.horizontal_bias,
        glitch_intensity: header.glitch_intensity,
        frequency: header.frequency,
        amplitude: header.amplitude,
        wave_frequency: header.wave_frequency,
        wave_density: header.wave_density,
        wave_threshold: header.wave_threshold,
        modulation_frequency: header.modulation_frequency,
        modulation_blend: header.modulation_blend,
        freq_a: header.freq_a,
        freq_b: header.freq_b,
        angle: header.angle,
        swirl: header.swirl,
        cell_size: header.cell_size,
        edge_sensitivity: header.edge_sensitivity,
        checkers_size: header.checkers_size,
        period: header.period,
        dot_scale: header.dot_scale,
        dot_density: header.dot_density,
        density: header.density,
        variation: header.variation,
        divisor: header.divisor,
        peak_threshold: header.peak_threshold,
        min_peak_distance: header.min_peak_distance,
        max_peaks: header.max_peaks,
        interference: header.interference,
        contour_threshold: header.contour_threshold,
        line_mode: header.line_mode,
        triangle_type: header.triangle_type,
        vertical: header.vertical,
        orb_count: header.orb_count,
        orb_size: header.orb_size,
        orb_intensity: header.orb_intensity,
        orb_random: header.orb_random,
        orb_offset: header.orb_offset,
        orb_vertical: header.orb_vertical,
        offset_x: header.offset_x,
        offset_y: header.offset_y,
        bands: header.bands,
        stripe_spacing: header.stripe_spacing,
        cell_radius: header.cell_radius,
        noisy_lines: None,
        effect_stack: header.effect_stack.unwrap_or_default(),
    };

    let mut out_data = vec![0u8; total_pixels];
    if let Err(e) = execute_binary_frame(&bph, &pixel_data) {
        eprintln!("Error in execute_binary_frame: {e}");
        return;
    }

    let mut stdout = io::stdout().lock();
    let _ = stdout.write_all(&out_data);
}

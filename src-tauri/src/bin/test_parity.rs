// Test runner for pixel-level parity verification between Rust and JS engines
use std::io::{self, Read, Write};

#[path = "../algorithms/mod.rs"]
mod algorithms;
#[path = "../effects.rs"]
mod effects;
#[path = "../engine.rs"]
mod engine;
#[path = "../palette.rs"]
mod palette;

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
    #[serde(default)]
    pub swirl: Option<f32>,
    #[serde(default, alias = "cellSize")]
    pub cell_size: Option<f32>,
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
    #[serde(default, alias = "effectStack")]
    effect_stack: Option<Vec<effects::PostEffect>>,
}

fn apply_raw_pre_adjustments(
    data: &mut [u8],
    brightness: f32,
    contrast: f32,
    saturation: f32,
    gamma: f32,
) {
    if brightness == 0.0 && contrast == 0.0 && saturation == 0.0 && (gamma - 1.0).abs() < 0.001 {
        return;
    }
    let b_offset = brightness * 128.0;
    let c_factor = if contrast >= 0.0 { 1.0 + contrast * 2.0 } else { 1.0 + contrast * 0.8 };
    let s_factor = 1.0 + saturation;
    let inv_gamma = 1.0 / gamma.max(0.01);

    if saturation == 0.0 {
        let mut tone_lut = [0u8; 256];
        for v in 0..256 {
            let mut val = (v as f32 - 128.0) * c_factor + 128.0 + b_offset;
            val = val.clamp(0.0, 255.0);
            if (inv_gamma - 1.0).abs() > 0.001 {
                val = 255.0 * (val / 255.0).powf(inv_gamma);
            }
            tone_lut[v] = val.round().clamp(0.0, 255.0) as u8;
        }

        for chunk in data.chunks_exact_mut(4) {
            chunk[0] = tone_lut[chunk[0] as usize];
            chunk[1] = tone_lut[chunk[1] as usize];
            chunk[2] = tone_lut[chunk[2] as usize];
        }
    } else {
        let mut cb_lut = [0.0f32; 256];
        for v in 0..256 {
            cb_lut[v] = (v as f32 - 128.0) * c_factor + 128.0 + b_offset;
        }

        let mut gamma_lut = [0u8; 256];
        for v in 0..256 {
            let mut val = v as f32;
            if (inv_gamma - 1.0).abs() > 0.001 {
                val = 255.0 * (v as f32 / 255.0).powf(inv_gamma);
            }
            gamma_lut[v] = val.round().clamp(0.0, 255.0) as u8;
        }

        for chunk in data.chunks_exact_mut(4) {
            let r = cb_lut[chunk[0] as usize];
            let g = cb_lut[chunk[1] as usize];
            let b = cb_lut[chunk[2] as usize];

            let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            let nr = (luma + (r - luma) * s_factor).clamp(0.0, 255.0).round() as usize;
            let ng = (luma + (g - luma) * s_factor).clamp(0.0, 255.0).round() as usize;
            let nb = (luma + (b - luma) * s_factor).clamp(0.0, 255.0).round() as usize;

            chunk[0] = gamma_lut[nr];
            chunk[1] = gamma_lut[ng];
            chunk[2] = gamma_lut[nb];
        }
    }
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

    let mut out_data = vec![0u8; total_pixels];
    let parsed_matrix_size = header.matrix_size.as_ref().and_then(|v| {
        if let Some(n) = v.as_i64() {
            Some(n as usize)
        } else if let Some(s) = v.as_str() {
            if s == "2" || s == "2x2" {
                Some(2)
            } else if s == "8" || s == "8x8" {
                Some(8)
            } else if s == "16" || s == "16x16" {
                Some(16)
            } else {
                Some(4)
            }
        } else {
            None
        }
    });

    let raw_params = algorithms::RawAlgorithmParams {
        threshold: header.threshold.unwrap_or(0.5),
        scale: header.scale.unwrap_or(1.0),
        diffusion_strength: header.diffusion_strength.unwrap_or(1.0),
        serpentine: header.serpentine,
        temporal_seed: header.temporal_seed.unwrap_or(0),
        matrix_size: parsed_matrix_size,
        warp_intensity: header.warp_intensity,
        dot_size: header.dot_size,
        block_size: header.block_size,
        cracked: header.cracked,
        distribution_spread: header.distribution_spread,
        twist_strength: header.twist_strength,
        spiral_frequency: header.spiral_frequency,
        depth: header.depth,
        noise_amount: header.noise_amount,
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
        line_mode: header.line_mode.clone(),
        triangle_type: header.triangle_type.clone(),
        vertical: header.vertical,
        orb_count: header.orb_count,
        orb_size: header.orb_size,
        orb_intensity: header.orb_intensity,
        orb_random: header.orb_random,
        orb_offset: header.orb_offset,
        orb_vertical: header.orb_vertical,
        ..Default::default()
    };

    let lum_threshold = header.luminance_threshold.unwrap_or(50.0);

    let mut b = header.brightness.unwrap_or(0.0);
    if b.abs() > 1.0 { b /= 100.0; }
    let mut c = header.contrast.unwrap_or(0.0);
    if c.abs() > 1.0 { c /= 100.0; }
    let mut s = header.saturation.unwrap_or(0.0);
    if s.abs() > 1.0 { s /= 100.0; }
    let g = header.gamma.unwrap_or(1.0);
    let has_tweaks = b != 0.0 || c != 0.0 || s != 0.0 || (g - 1.0).abs() > 0.001;

    let working_input: Vec<u8>;
    let input_slice: &[u8] = if has_tweaks || (header.algorithm != "none" && (lum_threshold - 50.0).abs() > 0.001) {
        let mut modified = pixel_data.to_vec();
        if has_tweaks {
            apply_raw_pre_adjustments(&mut modified, b, c, s, g);
        }
        if header.algorithm != "none" && (lum_threshold - 50.0).abs() > 0.001 {
            let shift = (50.0 - lum_threshold) * 4.0;
            for i in (0..modified.len()).step_by(4) {
                modified[i] = ((modified[i] as f32 + shift).round().clamp(0.0, 255.0)) as u8;
                modified[i + 1] = ((modified[i + 1] as f32 + shift).round().clamp(0.0, 255.0)) as u8;
                modified[i + 2] = ((modified[i + 2] as f32 + shift).round().clamp(0.0, 255.0)) as u8;
            }
        }
        working_input = modified;
        &working_input
    } else {
        &pixel_data
    };

    if let Err(e) = algorithms::apply_algorithm_raw_params(
        header.width,
        header.height,
        input_slice,
        &mut out_data,
        &header.algorithm,
        &header.palette,
        &raw_params,
    ) {
        eprintln!("Error in apply_algorithm_raw_params: {e}");
        return;
    }

    if let Some(ref stack) = header.effect_stack {
        if !stack.is_empty() {
            effects::apply_effect_stack_raw(header.width, header.height, &mut out_data, stack);
        }
    }

    let mut stdout = io::stdout().lock();
    let _ = stdout.write_all(&out_data);
}

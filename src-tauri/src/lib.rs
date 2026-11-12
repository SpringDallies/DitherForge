#![allow(dead_code, unused_variables)]

pub mod algorithms;
pub mod effects;
pub mod engine;
pub mod ffmpeg;
pub mod palette;

use algorithms::{apply_algorithm_raw_params, RawAlgorithmParams};
use effects::{apply_effect_stack_raw, PostEffect};
use image::{ImageReader, RgbaImage};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

pub const MAX_IMAGE_DIMENSION: u32 = 16_384;
pub const MAX_IMAGE_PIXELS: u64 = 64_000_000;

pub fn validate_image_dimensions(width: u32, height: u32) -> Result<(), String> {
    if width == 0 || height == 0 {
        return Err("Image has zero width or height".to_string());
    }
    if width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION {
        return Err(format!(
            "Image dimensions {}x{} exceed the maximum allowed dimension of {} px",
            width, height, MAX_IMAGE_DIMENSION
        ));
    }
    let pixels = (width as u64) * (height as u64);
    if pixels > MAX_IMAGE_PIXELS {
        return Err(format!(
            "Image contains {} pixels, exceeding the maximum of {} pixels",
            pixels, MAX_IMAGE_PIXELS
        ));
    }
    Ok(())
}

pub fn read_image_dimensions(bytes: &[u8]) -> Result<(u32, u32), String> {
    let reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| format!("Failed to identify image format: {}", e))?;
    reader
        .into_dimensions()
        .map_err(|e| format!("Failed to read image dimensions: {}", e))
}

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct BinaryProcessHeader {
    pub width: u32,
    pub height: u32,
    #[serde(default, alias = "algorithmId")]
    pub algorithm: String,
    pub palette: Vec<[u8; 4]>,
    #[serde(default)]
    pub threshold: Option<f32>,
    #[serde(default)]
    pub scale: Option<f32>,
    #[serde(default, alias = "diffusionStrength")]
    pub diffusion_strength: Option<f32>,
    #[serde(default)]
    pub serpentine: Option<bool>,
    #[serde(default, alias = "temporalSeed", alias = "seed")]
    pub temporal_seed: Option<u32>,
    #[serde(default, alias = "luminanceThreshold")]
    pub luminance_threshold: Option<f32>,
    #[serde(default)]
    pub brightness: Option<f32>,
    #[serde(default)]
    pub contrast: Option<f32>,
    #[serde(default)]
    pub saturation: Option<f32>,
    #[serde(default)]
    pub gamma: Option<f32>,
    #[serde(default)]
    pub hue: Option<f32>,
    #[serde(default, alias = "temporalPattern")]
    pub temporal_pattern: Option<String>,
    #[serde(default, alias = "temporalIntensity")]
    pub temporal_intensity: Option<f32>,
    #[serde(default, alias = "temporalSpeed")]
    pub temporal_speed: Option<f32>,
    #[serde(default)]
    pub depth: Option<u8>,
    #[serde(default, alias = "noiseAmount")]
    pub noise_amount: Option<f32>,
    #[serde(default, alias = "matrixSize")]
    pub matrix_size: Option<serde_json::Value>,
    #[serde(default, alias = "warpIntensity")]
    pub warp_intensity: Option<f32>,
    #[serde(default, alias = "dotSize")]
    pub dot_size: Option<f32>,
    #[serde(default, alias = "blockSize")]
    pub block_size: Option<f32>,
    #[serde(default)]
    pub cracked: Option<f32>,
    #[serde(default, alias = "distributionSpread")]
    pub distribution_spread: Option<f32>,
    #[serde(default, alias = "twistStrength")]
    pub twist_strength: Option<f32>,
    #[serde(default, alias = "spiralFrequency")]
    pub spiral_frequency: Option<f32>,
    #[serde(default, alias = "lineScale")]
    pub line_scale: Option<f32>,
    #[serde(default, alias = "bleedFraction")]
    pub bleed: Option<f32>,
    #[serde(default, alias = "smoothingFactor")]
    pub smoothing: Option<f32>,
    #[serde(default, alias = "noisyLines")]
    pub noisy_lines: Option<bool>,
    #[serde(default, alias = "offsetX")]
    pub offset_x: Option<f32>,
    #[serde(default, alias = "offsetY")]
    pub offset_y: Option<f32>,
    #[serde(default)]
    pub bands: Option<f32>,
    #[serde(default, alias = "stripeSpacing")]
    pub stripe_spacing: Option<f32>,
    #[serde(default, alias = "cellRadius")]
    pub cell_radius: Option<f32>,
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
    pub effect_stack: Vec<PostEffect>,
}

pub fn rotate_hue_hsv_buffer(data: &mut [u8], deg: f32) {
    let norm_deg = deg.rem_euclid(360.0);
    if norm_deg <= 0.001 || (360.0 - norm_deg) <= 0.001 {
        return;
    }
    let inv60 = 1.0 / 60.0;
    for chunk in data.chunks_exact_mut(4) {
        let r = chunk[0];
        let g = chunk[1];
        let b = chunk[2];
        if r == g && g == b {
            continue;
        }
        let max = r.max(g).max(b);
        let min = r.min(g).min(b);
        let delta = (max - min) as f32;
        if delta == 0.0 {
            continue;
        }
        let rf = r as f32;
        let gf = g as f32;
        let bf = b as f32;
        let mut h = if max == r {
            ((gf - bf) / delta + if g < b { 6.0 } else { 0.0 }) * 60.0
        } else if max == g {
            ((bf - rf) / delta + 2.0) * 60.0
        } else {
            ((rf - gf) / delta + 4.0) * 60.0
        };
        h = (h + norm_deg) % 360.0;
        let sector = (h * inv60) as i32;
        let f = h * inv60 - sector as f32;
        let p = min;
        let q = (max as f32 - delta * f).round().clamp(0.0, 255.0) as u8;
        let t = (min as f32 + delta * f).round().clamp(0.0, 255.0) as u8;
        match sector {
            0 => { chunk[0] = max; chunk[1] = t; chunk[2] = p; }
            1 => { chunk[0] = q; chunk[1] = max; chunk[2] = p; }
            2 => { chunk[0] = p; chunk[1] = max; chunk[2] = t; }
            3 => { chunk[0] = p; chunk[1] = q; chunk[2] = max; }
            4 => { chunk[0] = t; chunk[1] = p; chunk[2] = max; }
            _ => { chunk[0] = max; chunk[1] = p; chunk[2] = q; }
        }
    }
}

pub fn apply_raw_pre_adjustments(
    data: &mut [u8],
    brightness: f32,
    contrast: f32,
    saturation: f32,
    gamma: f32,
    hue: f32,
) {
    let has_tone = brightness != 0.0 || contrast != 0.0 || saturation != 0.0 || (gamma - 1.0).abs() > 0.001;
    if has_tone {
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
    if hue.abs() > 0.001 {
        rotate_hue_hsv_buffer(data, hue);
    }
}

pub fn apply_raw_temporal_noise(
    data: &mut [u8],
    width: u32,
    height: u32,
    pattern: &str,
    frame_idx: u32,
    intensity: f32,
    speed: f32,
) {
    let pat = pattern.trim().to_ascii_lowercase();
    if pat.is_empty() || pat == "none" || intensity <= 0.001 {
        return;
    }
    let w = width as usize;
    let h = height as usize;
    let t = (frame_idx as f32 * speed.max(0.1)).round();
    let amt = intensity.clamp(0.0, 1.0) * 40.0;
    const INV_U32_MAX: f32 = 1.0 / (u32::MAX as f32);

    let hash = |x: u32, y: u32, seed: u32| -> f32 {
        let mut h = x
            .wrapping_mul(374761393)
            .wrapping_add(y.wrapping_mul(668265263))
            .wrapping_add(seed.wrapping_mul(1274126177));
        h = (h ^ (h >> 13)).wrapping_mul(1274126177);
        (h ^ (h >> 16)) as f32 * INV_U32_MAX
    };

    match pat.as_str() {
        "grain" => {
            let seed = frame_idx.wrapping_mul(1274126177);
            for y in 0..h {
                for x in 0..w {
                    let idx = (y * w + x) * 4;
                    let n = (hash(x as u32, y as u32, seed) - 0.5) * amt * 2.0;
                    data[idx] = (data[idx] as f32 + n).clamp(0.0, 255.0) as u8;
                    data[idx + 1] = (data[idx + 1] as f32 + n).clamp(0.0, 255.0) as u8;
                    data[idx + 2] = (data[idx + 2] as f32 + n).clamp(0.0, 255.0) as u8;
                }
            }
        }
        "static" => {
            let seed = frame_idx.wrapping_mul(2246822519);
            let bs = 4usize;
            for by in (0..h).step_by(bs) {
                for bx in (0..w).step_by(bs) {
                    let n = (hash((bx / bs) as u32, (by / bs) as u32, seed) - 0.5) * amt * 2.5;
                    for dy in 0..bs {
                        let py = by + dy;
                        if py >= h { break; }
                        for dx in 0..bs {
                            let px = bx + dx;
                            if px >= w { break; }
                            let idx = (py * w + px) * 4;
                            data[idx] = (data[idx] as f32 + n).clamp(0.0, 255.0) as u8;
                            data[idx + 1] = (data[idx + 1] as f32 + n).clamp(0.0, 255.0) as u8;
                            data[idx + 2] = (data[idx + 2] as f32 + n).clamp(0.0, 255.0) as u8;
                        }
                    }
                }
            }
        }
        "scanline" | "scanlines" | "scanline_drift" | "rolling" => {
            let drift_y = (t * 4.0) % h as f32;
            for y in 0..h {
                let dist = (y as f32 - drift_y).abs();
                if dist < 16.0 {
                    let m = (dist * 0.2).sin() * amt;
                    for x in 0..w {
                        let idx = (y * w + x) * 4;
                        data[idx] = (data[idx] as f32 + m).clamp(0.0, 255.0) as u8;
                        data[idx + 1] = (data[idx + 1] as f32 + m).clamp(0.0, 255.0) as u8;
                        data[idx + 2] = (data[idx + 2] as f32 + m).clamp(0.0, 255.0) as u8;
                    }
                }
            }
        }
        "vertical_drift" => {
            let v_offset = (t * 0.3).sin() * (intensity * 6.0);
            for y in 0..h {
                let m = ((y as f32 + v_offset) * 0.1).sin() * amt;
                for x in 0..w {
                    let idx = (y * w + x) * 4;
                    data[idx] = (data[idx] as f32 + m).clamp(0.0, 255.0) as u8;
                    data[idx + 1] = (data[idx + 1] as f32 + m).clamp(0.0, 255.0) as u8;
                    data[idx + 2] = (data[idx + 2] as f32 + m).clamp(0.0, 255.0) as u8;
                }
            }
        }
        "pulse" => {
            let m = (t * 0.2).sin() * amt * 0.8;
            for i in (0..data.len()).step_by(4) {
                data[i] = (data[i] as f32 + m).clamp(0.0, 255.0) as u8;
                data[i + 1] = (data[i + 1] as f32 + m).clamp(0.0, 255.0) as u8;
                data[i + 2] = (data[i + 2] as f32 + m).clamp(0.0, 255.0) as u8;
            }
        }
        "flicker" => {
            let seed = frame_idx.wrapping_mul(2246822519);
            if hash(0, 0, seed) < 0.25 {
                let drop = -hash(1, 1, seed) * amt * 1.5;
                for i in (0..data.len()).step_by(4) {
                    data[i] = (data[i] as f32 + drop).clamp(0.0, 255.0) as u8;
                    data[i + 1] = (data[i + 1] as f32 + drop).clamp(0.0, 255.0) as u8;
                    data[i + 2] = (data[i + 2] as f32 + drop).clamp(0.0, 255.0) as u8;
                }
            }
        }
        "wave" => {
            for y in 0..h {
                let m = ((y as f32 * 0.08) + t * 0.3).sin() * amt;
                for x in 0..w {
                    let idx = (y * w + x) * 4;
                    data[idx] = (data[idx] as f32 + m).clamp(0.0, 255.0) as u8;
                    data[idx + 1] = (data[idx + 1] as f32 + m).clamp(0.0, 255.0) as u8;
                    data[idx + 2] = (data[idx + 2] as f32 + m).clamp(0.0, 255.0) as u8;
                }
            }
        }
        "shimmer" => {
            let t_int = (t * 19.0) as i64;
            for y in 0..h {
                for x in 0..w {
                    let shim = ((((x as i64) * 67 + (y as i64) * 131 + t_int) % 64) - 32) as f32 * (amt / 32.0);
                    let idx = (y * w + x) * 4;
                    data[idx] = (data[idx] as f32 + shim).clamp(0.0, 255.0) as u8;
                    data[idx + 1] = (data[idx + 1] as f32 + shim).clamp(0.0, 255.0) as u8;
                    data[idx + 2] = (data[idx + 2] as f32 + shim).clamp(0.0, 255.0) as u8;
                }
            }
        }
        "chaos" => {
            let seed = frame_idx.wrapping_mul(374761393);
            for y in 0..h {
                let line_jitter = (hash(0, y as u32, seed) - 0.5) * amt * 0.5;
                for x in 0..w {
                    let pixel_jitter = (hash(x as u32, y as u32, seed.wrapping_add(1)) - 0.5) * amt * 1.5;
                    let total = line_jitter + pixel_jitter;
                    let idx = (y * w + x) * 4;
                    data[idx] = (data[idx] as f32 + total).clamp(0.0, 255.0) as u8;
                    data[idx + 1] = (data[idx + 1] as f32 + total).clamp(0.0, 255.0) as u8;
                    data[idx + 2] = (data[idx + 2] as f32 + total).clamp(0.0, 255.0) as u8;
                }
            }
        }
        _ => {
            // Unknown pattern: do nothing rather than fall through to white noise.
        }
    }
}

pub fn execute_binary_frame(header: &BinaryProcessHeader, pixel_data: &[u8]) -> Result<Vec<u8>, String> {
    validate_image_dimensions(header.width, header.height)?;
    let expected_pixel_bytes = (header.width as usize) * (header.height as usize) * 4;
    if pixel_data.len() != expected_pixel_bytes {
        return Err(format!(
            "Pixel buffer size mismatch: expected {} bytes for {}x{} RGBA, got {}",
            expected_pixel_bytes, header.width, header.height, pixel_data.len()
        ));
    }

    let mut out_bytes = vec![0u8; expected_pixel_bytes];
    let parsed_matrix_size = header.matrix_size.as_ref().and_then(|v| {
        if let Some(n) = v.as_i64() {
            Some(n as usize)
        } else if let Some(s) = v.as_str() {
            match s {
                "2" | "2x2" => Some(2),
                "8" | "8x8" => Some(8),
                "16" | "16x16" => Some(16),
                _ => Some(4),
            }
        } else {
            None
        }
    });

    let raw_params = RawAlgorithmParams {
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
        noisy_lines: header.noisy_lines,
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
        swirl: header.swirl.or(header.twist_strength),
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
        offset_x: header.offset_x,
        offset_y: header.offset_y,
        bands: header.bands,
        stripe_spacing: header.stripe_spacing,
        cell_radius: header.cell_radius,
        ..Default::default()
    };

    let mut b = header.brightness.unwrap_or(0.0);
    if b.abs() > 1.0 { b /= 100.0; }
    let mut c = header.contrast.unwrap_or(0.0);
    if c.abs() > 1.0 { c /= 100.0; }
    let mut s = header.saturation.unwrap_or(0.0);
    if s.abs() > 1.0 { s /= 100.0; }
    let g = header.gamma.unwrap_or(1.0);
    let hue = header.hue.unwrap_or(0.0);
    let temp_pat = header.temporal_pattern.as_deref().unwrap_or("none");
    let temp_int = header.temporal_intensity.unwrap_or(0.0);
    let temp_spd = header.temporal_speed.unwrap_or(1.0);
    let noise_amt = header.noise_amount.unwrap_or(0.0);
    let has_tweaks = b != 0.0 || c != 0.0 || s != 0.0 || (g - 1.0).abs() > 0.001 || hue.abs() > 0.001;
    let has_temporal = temp_pat != "none" && !temp_pat.is_empty() && temp_int > 0.001;
    let algo_norm = header.algorithm.trim().to_lowercase().replace('-', "_");
    let lum_threshold = header.luminance_threshold.unwrap_or_else(|| {
        header.threshold.map(|t| if t <= 1.0 { (t * 100.0).round() } else { t }).unwrap_or(50.0)
    });
    let has_lum_shift = algo_norm != "none"
        && algo_norm != "threshold"
        && algo_norm != "fixed_threshold"
        && (lum_threshold - 50.0).abs() > 0.001;
    let has_pre_noise = algo_norm != "none"
        && algo_norm != "static_snow"
        && noise_amt > 0.001;
    if algo_norm == "none" {
        let mut out_bytes = pixel_data.to_vec();
        if has_tweaks {
            apply_raw_pre_adjustments(&mut out_bytes, b, c, s, g, hue);
        }
        if has_temporal {
            apply_raw_temporal_noise(
                &mut out_bytes,
                header.width,
                header.height,
                temp_pat,
                header.temporal_seed.unwrap_or(0),
                temp_int,
                temp_spd,
            );
        }
        if !header.effect_stack.is_empty() {
            apply_effect_stack_raw(header.width, header.height, &mut out_bytes, &header.effect_stack);
        }
        return Ok(out_bytes);
    }

    // Single in-place working buffer (eliminates double heap allocation when both tweaks and jitter are active)
    let mut working_buf: Option<Vec<u8>> = None;

    let temporal_seed = header.temporal_seed.unwrap_or(0);
    let needs_jitter = temporal_seed > 0
        && header.temporal_pattern.as_deref().unwrap_or("none") == "none"
        && header.noise_amount.unwrap_or(0.0) <= 0.001;

    let needs_modify = has_tweaks || has_temporal || has_lum_shift || has_pre_noise || needs_jitter;

    let final_input: &[u8] = if needs_modify {
        let mut modified = pixel_data.to_vec();
        if has_tweaks {
            apply_raw_pre_adjustments(&mut modified, b, c, s, g, hue);
        }
        if has_temporal {
            apply_raw_temporal_noise(
                &mut modified,
                header.width,
                header.height,
                temp_pat,
                header.temporal_seed.unwrap_or(0),
                temp_int,
                temp_spd,
            );
        }
        if has_lum_shift {
            let shift = (50.0 - lum_threshold) * 4.0;
            for chunk in modified.chunks_exact_mut(4) {
                chunk[0] = (chunk[0] as f32 + shift).round().clamp(0.0, 255.0) as u8;
                chunk[1] = (chunk[1] as f32 + shift).round().clamp(0.0, 255.0) as u8;
                chunk[2] = (chunk[2] as f32 + shift).round().clamp(0.0, 255.0) as u8;
            }
        }
        if has_pre_noise {
            apply_raw_temporal_noise(
                &mut modified,
                header.width,
                header.height,
                "grain",
                header.temporal_seed.unwrap_or(0),
                noise_amt * 0.5,
                1.0,
            );
        }
        if needs_jitter {
            let w = header.width as usize;
            let h = header.height as usize;
            for y in 0..h {
                for x in 0..w {
                    let idx = (y * w + x) * 4;
                    let hash_val = (((x as u32)
                        .wrapping_mul(37)
                        .wrapping_add((y as u32).wrapping_mul(97))
                        .wrapping_add(temporal_seed.wrapping_mul(13))
                        .wrapping_mul(2654435761))
                        >> 16) as f32
                        / 65536.0;
                    let jitter: i8 = ((hash_val * 2.0 - 1.0) * 3.0) as i8;
                    modified[idx] = modified[idx].saturating_add_signed(jitter);
                    modified[idx + 1] = modified[idx + 1].saturating_add_signed(jitter);
                    modified[idx + 2] = modified[idx + 2].saturating_add_signed(jitter);
                }
            }
        }
        working_buf = Some(modified);
        working_buf.as_deref().unwrap()
    } else {
        pixel_data
    };

    apply_algorithm_raw_params(
        header.width,
        header.height,
        final_input,
        &mut out_bytes,
        &header.algorithm,
        &header.palette,
        &raw_params,
    )?;

    if !header.effect_stack.is_empty() {
        apply_effect_stack_raw(header.width, header.height, &mut out_bytes, &header.effect_stack);
    }

    Ok(out_bytes)
}

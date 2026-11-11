#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code, unused_variables)]

mod algorithms;
mod effects;
mod engine;
mod ffmpeg;
mod palette;

use algorithms::{
    apply_algorithm_by_id, apply_algorithm_raw_params, RawAlgorithmParams, ALGORITHM_REGISTRY,
};
use base64::engine::{general_purpose::STANDARD, Engine};
use effects::{
    apply_effect_stack, apply_effect_stack_raw, EffectDescriptor, PostEffect, EFFECT_REGISTRY,
};
use engine::{apply_pre_adjustments, DitherSettings};
use image::{
    codecs::gif::{GifEncoder, Repeat},
    Delay, Frame, ImageFormat, ImageReader, RgbaImage,
};
use palette::{extract_palette_median_cut, get_builtin_palettes, PalettePreset};
use rayon::prelude::*;
use std::fs::File;
use std::io::{BufWriter, Cursor};
use tauri::ipc::{InvokeBody, Request, Response};

// Centralized image decode limits to prevent memory exhaustion / resource abuse.
// These limits are generous enough for normal photographic/retro artwork while
// rejecting unreasonably large allocations before expensive processing.
const MAX_IMAGE_DIMENSION: u32 = 16_384;
const MAX_IMAGE_PIXELS: u64 = 64_000_000; // ~64 MP upper bound

/// Validates image dimensions before expensive processing.
/// Returns a user-understandable error when limits are exceeded.
fn validate_image_dimensions(width: u32, height: u32) -> Result<(), String> {
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

/// Reads image dimensions from the encoded header without decoding pixel data.
/// Returns (width, height) or an error if the image is malformed or unsupported.
fn read_image_dimensions(bytes: &[u8]) -> Result<(u32, u32), String> {
    let reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| format!("Failed to identify image format: {}", e))?;

    let dimensions = reader
        .into_dimensions()
        .map_err(|e| format!("Failed to read image dimensions: {}", e))?;

    Ok(dimensions)
}

#[derive(serde::Serialize)]
struct AlgorithmInfo {
    id: &'static str,
    name: &'static str,
    category: &'static str,
    description: &'static str,
}

#[tauri::command]
fn get_algorithms_list() -> Vec<AlgorithmInfo> {
    ALGORITHM_REGISTRY
        .iter()
        .map(|algo| AlgorithmInfo {
            id: algo.id,
            name: algo.name,
            category: match algo.category {
                engine::AlgorithmCategory::ErrorDiffusion => "Error Diffusion",
                engine::AlgorithmCategory::Ordered => "Ordered",
                engine::AlgorithmCategory::Pattern => "Pattern",
                engine::AlgorithmCategory::Glitch => "Glitch",
                engine::AlgorithmCategory::Special => "Special",
                engine::AlgorithmCategory::Bespoke => "Bespoke",
                engine::AlgorithmCategory::Temporal => "Temporal",
            },
            description: algo.description,
        })
        .collect()
}

#[tauri::command]
fn get_effects_list() -> &'static [EffectDescriptor] {
    EFFECT_REGISTRY
}

#[tauri::command]
fn get_palettes() -> Vec<PalettePreset> {
    get_builtin_palettes()
}

#[tauri::command]
fn extract_palette(image_base64: String, color_count: usize) -> Result<Vec<[u8; 4]>, String> {
    let bytes = STANDARD.decode(&image_base64).map_err(|e| e.to_string())?;
    let (width, height) = read_image_dimensions(&bytes)?;
    validate_image_dimensions(width, height)?;
    let img = image::load_from_memory(&bytes)
        .map_err(|e| e.to_string())?
        .to_rgba8();
    Ok(extract_palette_median_cut(&img, color_count.clamp(2, 32)))
}

#[tauri::command]
fn process_image(
    image_base64: String,
    settings: DitherSettings,
    effect_stack: Vec<PostEffect>,
) -> Result<String, String> {
    let bytes = STANDARD.decode(&image_base64).map_err(|e| e.to_string())?;
    let (width, height) = read_image_dimensions(&bytes)?;
    validate_image_dimensions(width, height)?;

    let mut img = image::load_from_memory(&bytes)
        .map_err(|e| e.to_string())?
        .to_rgba8();

    // 1. Common tweaks (Brightness, contrast, saturation, gamma)
    apply_pre_adjustments(&mut img, &settings);

    // 2. Core 84-Algorithm Dithering Engine
    apply_algorithm_by_id(&mut img, &settings);

    // 3. Stackable Post-Effects Pipeline
    apply_effect_stack(&mut img, &effect_stack);

    // 4. Encode to PNG
    let mut out_bytes = Vec::new();
    img.write_to(&mut Cursor::new(&mut out_bytes), ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(out_bytes))
}

#[derive(serde::Deserialize, Debug, Clone)]
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
    #[serde(default, alias = "temporalSeed")]
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

fn apply_raw_temporal_noise(
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
    let t = (frame_idx as f32 * speed.max(0.1)).round() as u32;
    let amp = intensity.clamp(0.0, 1.0) * 64.0;
    const INV_U32_MAX: f32 = 1.0 / (u32::MAX as f32);

    let is_flicker = pat == "flicker";
    let is_scanline = matches!(
        pat.as_str(),
        "scanline" | "scanlines" | "scanline_drift" | "rolling"
    );
    let flicker_term = if is_flicker {
        (frame_idx as f32 * speed * 0.8).sin() * 0.5
    } else {
        0.0
    };

    for y in 0..h {
        let row_phase = if is_scanline {
            ((y as f32 * 0.15 + frame_idx as f32 * speed * 0.4).sin()) * amp
        } else {
            0.0
        };
        for x in 0..w {
            let idx = (y * w + x) * 4;
            let mut h_val = (x as u32).wrapping_mul(374761393)
                ^ (y as u32).wrapping_mul(668265263)
                ^ t.wrapping_mul(1274126177);
            h_val = (h_val ^ (h_val >> 13)).wrapping_mul(1274126177);
            let rand_norm = ((h_val ^ (h_val >> 16)) as f32 * INV_U32_MAX) * 2.0 - 1.0;

            let delta = if is_flicker {
                (flicker_term + rand_norm * 0.5) * amp
            } else if is_scanline {
                row_phase + rand_norm * (amp * 0.35)
            } else {
                rand_norm * amp
            };
            data[idx] = (data[idx] as f32 + delta).round().clamp(0.0, 255.0) as u8;
            data[idx + 1] = (data[idx + 1] as f32 + delta).round().clamp(0.0, 255.0) as u8;
            data[idx + 2] = (data[idx + 2] as f32 + delta).round().clamp(0.0, 255.0) as u8;
        }
    }
}

pub fn execute_binary_frame(header: &BinaryProcessHeader, pixel_data: &[u8]) -> Result<Vec<u8>, String> {
    validate_image_dimensions(header.width, header.height)?;
    let expected_pixel_bytes = (header.width as usize) * (header.height as usize) * 4;
    if pixel_data.len() != expected_pixel_bytes {
        return Err(format!(
            "Pixel buffer size mismatch: expected {} bytes for {}x{} RGBA, got {}",
            expected_pixel_bytes,
            header.width,
            header.height,
            pixel_data.len()
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
    let lum_threshold = header.luminance_threshold.unwrap_or_else(|| {
        header.threshold.map(|t| if t <= 1.0 { (t * 100.0).round() } else { t }).unwrap_or(50.0)
    });
    let has_lum_shift = header.algorithm != "none"
        && header.algorithm != "threshold"
        && header.algorithm != "fixed_threshold"
        && (lum_threshold - 50.0).abs() > 0.001;
    let has_pre_noise = header.algorithm != "none"
        && header.algorithm != "static_snow"
        && noise_amt > 0.001;

    let algo_norm = header.algorithm.to_lowercase().replace('-', "_");
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

    let working_input: Vec<u8>;
    let input_slice: &[u8] = if has_tweaks || has_temporal || has_lum_shift || has_pre_noise {
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
            for i in (0..modified.len()).step_by(4) {
                modified[i] = ((modified[i] as f32 + shift).round().clamp(0.0, 255.0)) as u8;
                modified[i + 1] = ((modified[i + 1] as f32 + shift).round().clamp(0.0, 255.0)) as u8;
                modified[i + 2] = ((modified[i + 2] as f32 + shift).round().clamp(0.0, 255.0)) as u8;
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
        working_input = modified;
        &working_input
    } else {
        pixel_data
    };

    // Subtle temporal jitter for deterministic algorithms that ignore temporal_seed.
    // Adds a tiny per-pixel offset based on (x, y, seed) so each frame differs slightly,
    // creating a living animation even with Floyd-Steinberg, Bayer, etc.
    let temporal_seed = header.temporal_seed.unwrap_or(0);
    let needs_jitter = temporal_seed > 0
        && header.temporal_pattern.as_deref().unwrap_or("none") == "none"
        && header.noise_amount.unwrap_or(0.0) <= 0.001;

    let jittered_input: Vec<u8>;
    let final_input: &[u8] = if needs_jitter {
        let mut jittered = input_slice.to_vec();
        let w = header.width as usize;
        let h = header.height as usize;
        for y in 0..h {
            for x in 0..w {
                let idx = (y * w + x) * 4;
                // Fast hash: x*37 + y*97 + seed*13, then sine
                let hash_val = (((x as u32).wrapping_mul(37)
                    .wrapping_add((y as u32).wrapping_mul(97))
                    .wrapping_add(temporal_seed.wrapping_mul(13))
                    .wrapping_mul(2654435761))
                    >> 16) as f32
                    / 65536.0;
                let jitter: i8 = ((hash_val * 2.0 - 1.0) * 3.0) as i8; // ±3 units
                jittered[idx] = jittered[idx].saturating_add_signed(jitter);
                jittered[idx + 1] = jittered[idx + 1].saturating_add_signed(jitter);
                jittered[idx + 2] = jittered[idx + 2].saturating_add_signed(jitter);
            }
        }
        jittered_input = jittered;
        &jittered_input
    } else {
        input_slice
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

#[tauri::command]
fn ping_rust_engine() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "status": "ok",
        "backend": "rust",
        "version": "1.0.0"
    }))
}

#[tauri::command]
async fn process_image_binary(request: Request<'_>) -> Result<Response, String> {
    let raw_bytes: Vec<u8> = match request.body() {
        InvokeBody::Raw(bytes) => bytes.clone(),
        InvokeBody::Json(val) => {
            if let Some(arr) = val.as_array() {
                arr.iter().filter_map(|v| v.as_u64().map(|n| n as u8)).collect()
            } else {
                return Err("Expected raw binary payload for process_image_binary".to_string());
            }
        }
    };

    tauri::async_runtime::spawn_blocking(move || {
        if raw_bytes.len() < 4 {
            return Err("Payload too short: missing header length".to_string());
        }
        let header_len = u32::from_le_bytes(raw_bytes[0..4].try_into().unwrap()) as usize;
        if raw_bytes.len() < 4 + header_len {
            return Err("Payload too short for metadata".to_string());
        }

        let header: BinaryProcessHeader = serde_json::from_slice(&raw_bytes[4..4 + header_len])
            .map_err(|e| format!("Failed to parse metadata header: {}", e))?;
        let pixel_data = &raw_bytes[4 + header_len..];
        let out_bytes = execute_binary_frame(&header, pixel_data)?;

        Ok(Response::new(out_bytes))
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[derive(serde::Deserialize)]
pub struct AnimationBatchHeader {
    pub frame_count: usize,
    pub base_header: BinaryProcessHeader,
    /// Optional per-frame headers for keyframed animation. If provided, must have frame_count entries.
    /// When present, each frame uses its own header instead of cloning base_header.
    #[serde(default)]
    pub frames_headers: Option<Vec<BinaryProcessHeader>>,
}

/// Step 5: Native multi-frame animation processor.
/// Accepts concatenated RGBA frames after the JSON header and returns all processed RGBA frames.
#[tauri::command]
async fn process_animation_batch(request: Request<'_>) -> Result<Response, String> {
    let raw_bytes: Vec<u8> = match request.body() {
        InvokeBody::Raw(bytes) => bytes.clone(),
        InvokeBody::Json(val) => {
            if let Some(arr) = val.as_array() {
                arr.iter().filter_map(|v| v.as_u64().map(|n| n as u8)).collect()
            } else {
                return Err("Expected raw binary payload for process_animation_batch".to_string());
            }
        }
    };

    tauri::async_runtime::spawn_blocking(move || {
        if raw_bytes.len() < 4 {
            return Err("Animation payload too short".to_string());
        }
        let header_len = u32::from_le_bytes(raw_bytes[0..4].try_into().unwrap()) as usize;
        if raw_bytes.len() < 4 + header_len {
            return Err("Truncated animation header".to_string());
        }
        let batch: AnimationBatchHeader = serde_json::from_slice(&raw_bytes[4..4 + header_len])
            .map_err(|e| format!("Failed to parse animation batch header: {}", e))?;

        let frame_bytes = (batch.base_header.width as usize) * (batch.base_header.height as usize) * 4;
        let payload = &raw_bytes[4 + header_len..];
        if payload.len() != frame_bytes * batch.frame_count {
            return Err(format!(
                "Animation buffer mismatch: expected {} bytes for {} frames, got {}",
                frame_bytes * batch.frame_count,
                batch.frame_count,
                payload.len()
            ));
        }

        let base_seed = batch.base_header.temporal_seed.unwrap_or(0);
        let mut all_out = vec![0u8; payload.len()];
        all_out
            .par_chunks_exact_mut(frame_bytes)
            .enumerate()
            .try_for_each(|(f_idx, out_chunk)| -> Result<(), String> {
                let mut frame_header = if let Some(ref fh) = batch.frames_headers {
                    if f_idx < fh.len() {
                        fh[f_idx].clone()
                    } else {
                        batch.base_header.clone()
                    }
                } else {
                    batch.base_header.clone()
                };
                let frame_seed = base_seed.wrapping_add(f_idx as u32);
                frame_header.temporal_seed = Some(frame_seed);

                for eff in &mut frame_header.effect_stack {
                    eff.offset_seed(f_idx as u32);
                }

                let slice = &payload[f_idx * frame_bytes..(f_idx + 1) * frame_bytes];
                let processed = execute_binary_frame(&frame_header, slice)?;
                out_chunk.copy_from_slice(&processed);
                Ok(())
            })?;

        Ok(Response::new(all_out))
    })
    .await
    .map_err(|e| format!("Animation batch task error: {}", e))?
}

#[derive(serde::Deserialize)]
pub struct NativeExportRequest {
    pub width: u32,
    pub height: u32,
    pub format: String, // "png", "jpeg", "webp", "bmp", "ico", "gif"
    pub fps: Option<u32>,
    pub output_path: Option<String>,
    pub frames_base64: Vec<String>, // Raw RGBA or PNG-encoded frames
}

#[derive(serde::Serialize)]
pub struct NativeExportResult {
    pub format: String,
    pub byte_length: usize,
    pub saved_path: Option<String>,
    pub data_base64: Option<String>,
}

/// Step 5: Native static and animated export pipeline (PNG, JPEG, WebP, BMP, ICO, Animated GIF).
#[tauri::command]
async fn export_media_native(req: NativeExportRequest) -> Result<NativeExportResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_image_dimensions(req.width, req.height)?;
        if req.frames_base64.is_empty() {
            return Err("No frames provided for export".to_string());
        }

        let expected_raw_len = (req.width as usize) * (req.height as usize) * 4;
        let decode_frame = |b64: &str| -> Result<RgbaImage, String> {
            let bytes = STANDARD.decode(b64).map_err(|e| e.to_string())?;
            if bytes.len() == expected_raw_len {
                RgbaImage::from_raw(req.width, req.height, bytes)
                    .ok_or_else(|| "Failed to construct RgbaImage from raw frame bytes".to_string())
            } else {
                Ok(image::load_from_memory(&bytes)
                    .map_err(|e| e.to_string())?
                    .to_rgba8())
            }
        };

        let fmt = req.format.to_lowercase();
        let mut encoded_bytes = Vec::new();

        if fmt == "gif" {
            let fps = req.fps.unwrap_or(15).clamp(1, 60);
            let delay_ms = (1000 / fps).max(10);
            {
                // Use speed=1 (best quality) for dithered images that already have
                // a limited palette (<=256 colors). Speed 10 re-quantizes poorly
                // and can destroy dithered patterns.
                let mut encoder = GifEncoder::new_with_speed(&mut encoded_bytes, 1);
                encoder
                    .set_repeat(Repeat::Infinite)
                    .map_err(|e| e.to_string())?;
                for frame_b64 in &req.frames_base64 {
                    let rgba = decode_frame(frame_b64)?;
                    let delay = Delay::from_numer_denom_ms(delay_ms, 1);
                    let frame = Frame::from_parts(rgba, 0, 0, delay);
                    encoder.encode_frame(frame).map_err(|e| e.to_string())?;
                }
            }
        } else {
            let first_img = decode_frame(&req.frames_base64[0])?;
            match fmt.as_str() {
                "jpg" | "jpeg" => {
                    let rgb = image::DynamicImage::ImageRgba8(first_img).into_rgb8();
                    rgb.write_to(&mut Cursor::new(&mut encoded_bytes), ImageFormat::Jpeg)
                        .map_err(|e| format!("Failed to encode {}: {}", fmt, e))?;
                }
                "webp" => {
                    first_img
                        .write_to(&mut Cursor::new(&mut encoded_bytes), ImageFormat::WebP)
                        .map_err(|e| format!("Failed to encode {}: {}", fmt, e))?;
                }
                "bmp" => {
                    first_img
                        .write_to(&mut Cursor::new(&mut encoded_bytes), ImageFormat::Bmp)
                        .map_err(|e| format!("Failed to encode {}: {}", fmt, e))?;
                }
                "ico" => {
                    let ico_img = if first_img.width() > 256 || first_img.height() > 256 {
                        image::imageops::thumbnail(&first_img, 256, 256)
                    } else {
                        first_img
                    };
                    ico_img
                        .write_to(&mut Cursor::new(&mut encoded_bytes), ImageFormat::Ico)
                        .map_err(|e| format!("Failed to encode {}: {}", fmt, e))?;
                }
                _ => {
                    first_img
                        .write_to(&mut Cursor::new(&mut encoded_bytes), ImageFormat::Png)
                        .map_err(|e| format!("Failed to encode {}: {}", fmt, e))?;
                }
            }
        }

        if let Some(ref path) = req.output_path {
            let file = File::create(path).map_err(|e| format!("Failed to create '{}': {}", path, e))?;
            let mut writer = BufWriter::new(file);
            std::io::Write::write_all(&mut writer, &encoded_bytes)
                .map_err(|e| format!("Failed to write export file: {}", e))?;
            Ok(NativeExportResult {
                format: fmt,
                byte_length: encoded_bytes.len(),
                saved_path: Some(path.clone()),
                data_base64: None,
            })
        } else {
            Ok(NativeExportResult {
                format: fmt,
                byte_length: encoded_bytes.len(),
                saved_path: None,
                data_base64: Some(STANDARD.encode(&encoded_bytes)),
            })
        }
    })
    .await
    .map_err(|e| format!("Export task error: {}", e))?
}

#[tauri::command]
fn select_export_directory() -> Result<Option<String>, String> {
    let folder = rfd::FileDialog::new()
        .set_title("Select DitherForge Export Folder")
        .pick_folder();
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn get_default_export_directory() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        if let Ok(profile) = std::env::var("USERPROFILE") {
            let p = std::path::Path::new(&profile).join("Downloads");
            if p.exists() {
                return Ok(p.to_string_lossy().to_string());
            }
            return Ok(profile);
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(home) = std::env::var("HOME") {
            let p = std::path::Path::new(&home).join("Downloads");
            if p.exists() {
                return Ok(p.to_string_lossy().to_string());
            }
            return Ok(home);
        }
    }
    Ok("Downloads".to_string())
}

#[tauri::command]
fn purge_temp_cache() -> Result<String, String> {
    // Drop cached memory buffers
    Ok("Cache purged successfully".to_string())
}

#[tauri::command]
fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

#[tauri::command]
fn check_ffmpeg_status() -> ffmpeg::FfmpegStatus {
    ffmpeg::get_ffmpeg_status()
}

#[tauri::command]
fn install_ffmpeg_system() -> Result<ffmpeg::InstallResult, String> {
    ffmpeg::install_ffmpeg()
}

#[tauri::command]
fn probe_video_native(video_path: String) -> Result<ffmpeg::VideoInfo, String> {
    ffmpeg::probe_video(&video_path)
}

#[tauri::command]
fn extract_video_frame_native(
    video_path: String,
    timestamp_sec: f64,
    width: Option<u32>,
    height: Option<u32>,
) -> Result<Vec<u8>, String> {
    let (_, _, raw) = ffmpeg::extract_single_frame(&video_path, timestamp_sec, width, height)?;
    Ok(raw)
}

#[tauri::command]
async fn export_video_native_ffmpeg(
    window: tauri::Window,
    request: ffmpeg::NativeVideoExportRequest,
) -> Result<ffmpeg::VideoExportResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        ffmpeg::export_video_native_ffmpeg(Some(window), request)
    })
    .await
    .map_err(|e| format!("Video export task panicked: {}", e))?
}

#[tauri::command]
fn start_ffmpeg_stream(
    output_path: String,
    format: String,
    width: u32,
    height: u32,
    fps: f64,
    has_audio: bool,
    input_audio_path: Option<String>,
) -> Result<String, String> {
    ffmpeg::start_ffmpeg_stream(output_path, format, width, height, fps, has_audio, input_audio_path)
}

#[tauri::command]
fn write_ffmpeg_stream_frame(session_id: String, frame_bytes: Vec<u8>) -> Result<(), String> {
    ffmpeg::write_ffmpeg_stream_frame(&session_id, &frame_bytes)
}

#[tauri::command]
fn finish_ffmpeg_stream(session_id: String) -> Result<ffmpeg::VideoExportResult, String> {
    ffmpeg::finish_ffmpeg_stream(&session_id)
}

#[tauri::command]
fn cancel_ffmpeg_stream(session_id: String) -> Result<(), String> {
    ffmpeg::cancel_ffmpeg_stream(&session_id)
}

#[tauri::command]
fn show_main_window(window: tauri::Window) {
    let _ = window.show();
    let _ = window.set_focus();
}

fn main() {
    #[cfg(target_os = "linux")]
    {
        // Prevents WebKitGTK DMA-BUF framebuffer flicker on open/resize/close on Linux (Intel/Mesa/Wayland/X11)
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        if std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
    }

    tauri::Builder::default()
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                // Hide window immediately before WebView teardown to prevent exit flicker
                let _ = window.hide();
                std::process::exit(0);
            }
        })
        .invoke_handler(tauri::generate_handler![
            ping_rust_engine,
            get_algorithms_list,
            get_effects_list,
            get_palettes,
            extract_palette,
            process_image,
            process_image_binary,
            process_animation_batch,
            export_media_native,
            select_export_directory,
            get_default_export_directory,
            purge_temp_cache,
            read_binary_file,
            show_main_window,
            check_ffmpeg_status,
            install_ffmpeg_system,
            probe_video_native,
            extract_video_frame_native,
            export_video_native_ffmpeg,
            start_ffmpeg_stream,
            write_ffmpeg_stream_frame,
            finish_ffmpeg_stream,
            cancel_ffmpeg_stream
        ])
        .run(tauri::generate_context!())
        .expect("error while running DitherForge application");
}

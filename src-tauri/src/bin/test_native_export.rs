// Native Animation & Export Verification Test
#![allow(dead_code, unused_variables)]
use image::{
    codecs::gif::{GifDecoder, GifEncoder, Repeat},
    AnimationDecoder, Delay, Frame, ImageFormat, RgbaImage,
};
use std::collections::HashMap;
use std::io::Cursor;

#[path = "../algorithms/mod.rs"]
mod algorithms;
#[path = "../effects.rs"]
mod effects;
#[path = "../engine.rs"]
mod engine;
#[path = "../palette.rs"]
mod palette;

const MAX_IMAGE_DIMENSION: u32 = 16384;
const MAX_IMAGE_PIXELS: u64 = 67_108_864;

fn validate_image_dimensions(width: u32, height: u32) -> Result<(), String> {
    if width == 0 || height == 0 {
        return Err("Image dimensions must be non-zero".to_string());
    }
    if width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION {
        return Err(format!(
            "Image dimensions ({}x{}) exceed the maximum allowed size of {}x{}",
            width, height, MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION
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

#[derive(serde::Deserialize, serde::Serialize, Debug, Clone, Default)]
pub struct BinaryProcessHeader {
    pub width: u32,
    pub height: u32,
    pub algorithm: String,
    pub palette: Vec<[u8; 4]>,
    #[serde(default)]
    pub threshold: Option<f32>,
    #[serde(default)]
    pub scale: Option<f32>,
    #[serde(default)]
    pub diffusion_strength: Option<f32>,
    #[serde(default)]
    pub serpentine: Option<bool>,
    #[serde(default)]
    pub temporal_seed: Option<u32>,
    #[serde(default)]
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
    #[serde(default)]
    pub matrix_size: Option<serde_json::Value>,
    #[serde(default)]
    pub warp_intensity: Option<f32>,
    #[serde(default)]
    pub dot_size: Option<f32>,
    #[serde(default)]
    pub block_size: Option<f32>,
    #[serde(default)]
    pub cracked: Option<f32>,
    #[serde(default)]
    pub distribution_spread: Option<f32>,
    #[serde(default)]
    pub twist_strength: Option<f32>,
    #[serde(default)]
    pub spiral_frequency: Option<f32>,
    #[serde(default)]
    pub effect_stack: Vec<effects::PostEffect>,
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

fn execute_binary_frame(header: &BinaryProcessHeader, pixel_data: &[u8]) -> Result<Vec<u8>, String> {
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
        ..Default::default()
    };

    let lum_threshold = header.luminance_threshold.unwrap_or_else(|| {
        header.threshold.map(|t| if t <= 1.0 { (t * 100.0).round() } else { t }).unwrap_or(50.0)
    });
    let has_lum_shift = header.algorithm != "none"
        && header.algorithm != "threshold"
        && header.algorithm != "fixed_threshold"
        && (lum_threshold - 50.0).abs() > 0.001;

    let mut b = header.brightness.unwrap_or(0.0);
    if b.abs() > 1.0 { b /= 100.0; }
    let mut c = header.contrast.unwrap_or(0.0);
    if c.abs() > 1.0 { c /= 100.0; }
    let mut s = header.saturation.unwrap_or(0.0);
    if s.abs() > 1.0 { s /= 100.0; }
    let g = header.gamma.unwrap_or(1.0);
    let has_tweaks = b != 0.0 || c != 0.0 || s != 0.0 || (g - 1.0).abs() > 0.001;

    let working_input: Vec<u8>;
    let input_slice: &[u8] = if has_tweaks || has_lum_shift {
        let mut modified = pixel_data.to_vec();
        if has_tweaks {
            apply_raw_pre_adjustments(&mut modified, b, c, s, g);
        }
        if has_lum_shift {
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
        pixel_data
    };

    algorithms::apply_algorithm_raw_params(
        header.width,
        header.height,
        input_slice,
        &mut out_bytes,
        &header.algorithm,
        &header.palette,
        &raw_params,
    )?;

    if !header.effect_stack.is_empty() {
        effects::apply_effect_stack_raw(header.width, header.height, &mut out_bytes, &header.effect_stack);
    }

    Ok(out_bytes)
}

fn execute_animation_batch(
    frame_count: usize,
    base_header: &BinaryProcessHeader,
    payload: &[u8],
) -> Result<Vec<u8>, String> {
    let frame_bytes = (base_header.width as usize) * (base_header.height as usize) * 4;
    if payload.len() != frame_bytes * frame_count {
        return Err("Payload size mismatch".to_string());
    }

    let mut all_out = Vec::with_capacity(payload.len());
    let base_seed = base_header.temporal_seed.unwrap_or(0);
    for f_idx in 0..frame_count {
        let mut frame_header = base_header.clone();
        frame_header.temporal_seed = Some(base_seed.wrapping_add(f_idx as u32));
        for eff in &mut frame_header.effect_stack {
            eff.offset_seed(f_idx as u32);
        }
        let slice = &payload[f_idx * frame_bytes..(f_idx + 1) * frame_bytes];
        let rendered = execute_binary_frame(&frame_header, slice)?;
        all_out.extend_from_slice(&rendered);
    }
    Ok(all_out)
}

fn execute_native_export(
    width: u32,
    height: u32,
    format: &str,
    fps: Option<u32>,
    frames_raw: &[Vec<u8>],
) -> Result<Vec<u8>, String> {
    validate_image_dimensions(width, height)?;
    if frames_raw.is_empty() {
        return Err("No frames provided".to_string());
    }

    let fmt = format.to_lowercase();
    let mut encoded_bytes = Vec::new();

    if fmt == "gif" {
        let target_fps = fps.unwrap_or(15).clamp(1, 60);
        let delay_ms = (1000 / target_fps).max(10);
        {
            let mut encoder = GifEncoder::new_with_speed(&mut encoded_bytes, 1);
            encoder
                .set_repeat(Repeat::Infinite)
                .map_err(|e| e.to_string())?;
            for frame_bytes in frames_raw {
                let rgba = RgbaImage::from_raw(width, height, frame_bytes.clone())
                    .ok_or_else(|| "Failed to construct RgbaImage".to_string())?;
                let delay = Delay::from_numer_denom_ms(delay_ms, 1);
                let frame = Frame::from_parts(rgba, 0, 0, delay);
                encoder.encode_frame(frame).map_err(|e| e.to_string())?;
            }
        }
    } else {
        let first_img = RgbaImage::from_raw(width, height, frames_raw[0].clone())
            .ok_or_else(|| "Failed to construct RgbaImage".to_string())?;
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

    Ok(encoded_bytes)
}

fn main() {
    println!("==================================================================");
    println!("  NATIVE ANIMATION & EXPORT BACKEND VERIFICATION                  ");
    println!("==================================================================\n");

    let width = 64u32;
    let height = 48u32;
    let frame_pixels = (width * height) as usize;
    let frame_bytes = frame_pixels * 4;
    let frame_count = 5;

    // Generate 5 distinct animated test frames
    let mut batch_payload = Vec::with_capacity(frame_bytes * frame_count);
    let mut frames_vec = Vec::with_capacity(frame_count);

    for f in 0..frame_count {
        let mut frame_data = vec![0u8; frame_bytes];
        for y in 0..height {
            for x in 0..width {
                let idx = ((y * width + x) * 4) as usize;
                frame_data[idx] = ((x * 4 + f as u32 * 20) % 256) as u8;
                frame_data[idx + 1] = ((y * 5 + f as u32 * 10) % 256) as u8;
                frame_data[idx + 2] = ((x + y + f as u32 * 30) % 256) as u8;
                frame_data[idx + 3] = 255;
            }
        }
        batch_payload.extend_from_slice(&frame_data);
        frames_vec.push(frame_data);
    }

    let palette = vec![
        [0, 0, 0, 255],
        [255, 255, 255, 255],
        [255, 0, 0, 255],
        [0, 255, 0, 255],
        [0, 0, 255, 255],
    ];

    let base_header = BinaryProcessHeader {
        width,
        height,
        algorithm: "floyd-steinberg".to_string(),
        palette: palette.clone(),
        threshold: Some(0.5),
        scale: Some(1.0),
        diffusion_strength: Some(1.0),
        serpentine: Some(true),
        temporal_seed: Some(100),
        luminance_threshold: Some(50.0),
        brightness: None,
        contrast: None,
        saturation: None,
        gamma: None,
        depth: None,
        noise_amount: None,
        matrix_size: None,
        warp_intensity: None,
        dot_size: None,
        block_size: None,
        cracked: None,
        distribution_spread: None,
        twist_strength: None,
        spiral_frequency: None,
        effect_stack: vec![
            effects::PostEffect {
                id: "vignette".to_string(),
                enabled: true,
                effect: Some(effects::PostEffectType::Vignette {
                    radius: 0.8,
                    softness: 0.3,
                }),
                params: HashMap::new(),
                ..Default::default()
            },
        ],
        ..Default::default()
    };

    // Test 1: Native Animation Batch Execution
    println!("[1] Testing Native Animation Batch Processing (5 frames)...");
    let batch_result = execute_animation_batch(frame_count, &base_header, &batch_payload)
        .expect("Animation batch processing failed");

    assert_eq!(
        batch_result.len(),
        frame_bytes * frame_count,
        "Batch result size must match exactly frame_bytes * frame_count"
    );

    // Verify alpha is 100% preserved in all output frames
    let mut alpha_ok = true;
    for i in (3..batch_result.len()).step_by(4) {
        if batch_result[i] != 255 {
            alpha_ok = false;
            break;
        }
    }
    assert!(alpha_ok, "Alpha must remain 100% preserved across all animation frames");
    println!("  PASS: Native animation batch rendered 5 frames with 100% alpha preservation.");

    // Separate rendered frames for export tests
    let mut rendered_frames = Vec::new();
    for f in 0..frame_count {
        rendered_frames.push(batch_result[f * frame_bytes..(f + 1) * frame_bytes].to_vec());
    }

    // Test 2: Native Static Format Exports (PNG, JPEG, WebP, BMP, ICO)
    println!("\n[2] Testing Native Static Image Formats Export...");

    // 2a. PNG
    let png_bytes = execute_native_export(width, height, "png", None, &rendered_frames)
        .expect("PNG export failed");
    assert!(png_bytes.len() > 8);
    assert_eq!(&png_bytes[0..8], &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], "PNG signature match");
    println!("  PASS: PNG export valid ({} bytes)", png_bytes.len());

    // 2b. JPEG
    let jpeg_bytes = execute_native_export(width, height, "jpeg", None, &rendered_frames)
        .expect("JPEG export failed");
    assert!(jpeg_bytes.len() > 3);
    assert_eq!(&jpeg_bytes[0..3], &[0xFF, 0xD8, 0xFF], "JPEG SOI marker match");
    println!("  PASS: JPEG export valid ({} bytes)", jpeg_bytes.len());

    // 2c. WebP
    let webp_bytes = execute_native_export(width, height, "webp", None, &rendered_frames)
        .expect("WebP export failed");
    assert!(webp_bytes.len() > 12);
    assert_eq!(&webp_bytes[0..4], b"RIFF", "WebP RIFF signature match");
    assert_eq!(&webp_bytes[8..12], b"WEBP", "WebP format signature match");
    println!("  PASS: WebP export valid ({} bytes)", webp_bytes.len());

    // 2d. BMP
    let bmp_bytes = execute_native_export(width, height, "bmp", None, &rendered_frames)
        .expect("BMP export failed");
    assert!(bmp_bytes.len() > 2);
    assert_eq!(&bmp_bytes[0..2], b"BM", "BMP signature match");
    println!("  PASS: BMP export valid ({} bytes)", bmp_bytes.len());

    // 2e. ICO
    let ico_bytes = execute_native_export(width, height, "ico", None, &rendered_frames)
        .expect("ICO export failed");
    assert!(ico_bytes.len() > 4);
    assert_eq!(&ico_bytes[0..4], &[0x00, 0x00, 0x01, 0x00], "ICO signature match");
    println!("  PASS: ICO export valid ({} bytes)", ico_bytes.len());

    // 2f. Large ICO auto-resize (512x512 downscaled to 256x256)
    let large_w = 512u32;
    let large_h = 512u32;
    let large_frame = vec![128u8; (large_w * large_h * 4) as usize];
    let large_ico_bytes = execute_native_export(large_w, large_h, "ico", None, &[large_frame])
        .expect("Large ICO export with auto-resize failed");
    assert!(large_ico_bytes.len() > 4);
    assert_eq!(&large_ico_bytes[0..4], &[0x00, 0x00, 0x01, 0x00], "Large ICO signature match");
    println!("  PASS: Large ICO (512x512) auto-downscaled and exported ({} bytes)", large_ico_bytes.len());

    // Test 3: Native Multi-Frame Animated GIF Export
    println!("\n[3] Testing Native Multi-Frame Animated GIF Export...");
    let gif_bytes = execute_native_export(width, height, "gif", Some(20), &rendered_frames)
        .expect("GIF export failed");

    assert!(gif_bytes.len() > 50, "GIF must be non-empty");
    assert_eq!(&gif_bytes[0..6], b"GIF89a", "GIF89a signature match");
    assert_eq!(gif_bytes[gif_bytes.len() - 1], 0x3B, "GIF trailer byte match");

    // Decode and verify all 5 frames
    let cursor = Cursor::new(&gif_bytes);
    let decoder = GifDecoder::new(cursor).expect("Failed to initialize GifDecoder");
    let frames: Vec<Frame> = decoder.into_frames().collect_frames().expect("Failed to decode frames");

    assert_eq!(frames.len(), frame_count, "GIF frame count must equal input frames");
    for (idx, frame) in frames.iter().enumerate() {
        assert_eq!(frame.buffer().width(), width, "Frame width must match");
        assert_eq!(frame.buffer().height(), height, "Frame height must match");
        println!("  Frame {} decoded: {}x{}, delay={:?}", idx, width, height, frame.delay());
    }
    println!("  PASS: Animated GIF export decoded successfully ({} frames, {} bytes)", frames.len(), gif_bytes.len());

    // Test 4: Typed Effect Seed Increments in Animation Batch
    println!("\n[4] Testing Typed Effect Seed Increments in Animation Batch...");
    let identical_input = vec![128u8; frame_bytes * 2]; // 2 identical frames
    let seed_test_header = BinaryProcessHeader {
        width,
        height,
        algorithm: "none".to_string(),
        palette: palette.clone(),
        threshold: None,
        scale: None,
        diffusion_strength: None,
        serpentine: None,
        temporal_seed: Some(1),
        luminance_threshold: None,
        brightness: None,
        contrast: None,
        saturation: None,
        gamma: None,
        depth: None,
        noise_amount: None,
        matrix_size: None,
        warp_intensity: None,
        dot_size: None,
        block_size: None,
        cracked: None,
        distribution_spread: None,
        twist_strength: None,
        spiral_frequency: None,
        effect_stack: vec![
            effects::PostEffect {
                id: "film_grain".to_string(),
                enabled: true,
                effect: Some(effects::PostEffectType::FilmGrain {
                    amount: 0.5,
                    size: 1.0,
                    seed: 100,
                }),
                params: HashMap::new(),
                ..Default::default()
            },
        ],
        ..Default::default()
    };
    let seed_batch_result = execute_animation_batch(2, &seed_test_header, &identical_input)
        .expect("Seed batch processing failed");
    let frame0 = &seed_batch_result[0..frame_bytes];
    let frame1 = &seed_batch_result[frame_bytes..2 * frame_bytes];
    assert_ne!(frame0, frame1, "Typed FilmGrain must produce different output on consecutive frames due to seed offset");
    println!("  PASS: Typed FilmGrain seed successfully offsets between animation frames.");

    // Test 5: Depth and Noise Amount Persistence
    println!("\n[5] Testing Depth and Noise Amount Parameter Persistence...");
    let depth2_header = BinaryProcessHeader {
        width,
        height,
        algorithm: "bit_crush".to_string(),
        palette: palette.clone(),
        threshold: None,
        scale: None,
        diffusion_strength: None,
        serpentine: None,
        temporal_seed: None,
        luminance_threshold: None,
        brightness: None,
        contrast: None,
        saturation: None,
        gamma: None,
        depth: Some(2),
        noise_amount: None,
        matrix_size: None,
        warp_intensity: None,
        dot_size: None,
        block_size: None,
        cracked: None,
        distribution_spread: None,
        twist_strength: None,
        spiral_frequency: None,
        effect_stack: vec![],
        ..Default::default()
    };
    let depth8_header = BinaryProcessHeader {
        depth: Some(8),
        ..depth2_header.clone()
    };
    let depth2_out = execute_binary_frame(&depth2_header, &frames_vec[0]).expect("Bit crush depth 2 failed");
    let depth8_out = execute_binary_frame(&depth8_header, &frames_vec[0]).expect("Bit crush depth 8 failed");
    assert_ne!(depth2_out, depth8_out, "Bit crush depth 2 and depth 8 must produce different results");
    println!("  PASS: Depth parameter persists correctly through RawAlgorithmParams.");

    println!("\n==================================================================");
    println!("  ALL NATIVE ANIMATION & EXPORT TESTS PASSED (100%)               ");
    println!("==================================================================");
}

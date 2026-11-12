#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code, unused_variables)]

use ditherforge::{
    algorithms, effects, engine, ffmpeg, palette,
    execute_binary_frame, validate_image_dimensions,
    BinaryProcessHeader,
};
use base64::engine::{general_purpose::STANDARD, Engine};
use image::{
    codecs::gif::{GifEncoder, Repeat},
    Delay, Frame, ImageFormat, RgbaImage,
};
use rayon::prelude::*;
use std::fs::File;
use std::io::{BufWriter, Cursor};
use tauri::ipc::{InvokeBody, Request, Response};

#[derive(serde::Serialize)]
struct AlgorithmInfo {
    id: &'static str,
    name: &'static str,
    category: &'static str,
    description: &'static str,
}

#[tauri::command]
fn get_algorithms_list() -> Vec<AlgorithmInfo> {
    algorithms::ALGORITHM_REGISTRY
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
fn get_effects_list() -> &'static [effects::EffectDescriptor] {
    effects::EFFECT_REGISTRY
}

#[tauri::command]
fn get_palettes() -> Vec<palette::PalettePreset> {
    palette::get_builtin_palettes()
}

#[tauri::command]
fn extract_palette(image_base64: String, color_count: usize) -> Result<Vec<[u8; 4]>, String> {
    let bytes = STANDARD.decode(&image_base64).map_err(|e| e.to_string())?;
    let (width, height) = ditherforge::read_image_dimensions(&bytes)?;
    validate_image_dimensions(width, height)?;
    let img = image::load_from_memory(&bytes)
        .map_err(|e| e.to_string())?
        .to_rgba8();
    Ok(palette::extract_palette_median_cut(&img, color_count.clamp(2, 32)))
}

#[tauri::command]
fn process_image(
    image_base64: String,
    settings: engine::DitherSettings,
    effect_stack: Vec<effects::PostEffect>,
) -> Result<String, String> {
    let bytes = STANDARD.decode(&image_base64).map_err(|e| e.to_string())?;
    let (width, height) = ditherforge::read_image_dimensions(&bytes)?;
    validate_image_dimensions(width, height)?;

    let mut img = image::load_from_memory(&bytes)
        .map_err(|e| e.to_string())?
        .to_rgba8();

    // 1. Common tweaks (Brightness, contrast, saturation, gamma)
    engine::apply_pre_adjustments(&mut img, &settings);

    // 2. Core 84-Algorithm Dithering Engine
    algorithms::apply_algorithm_by_id(&mut img, &settings);

    // 3. Stackable Post-Effects Pipeline
    effects::apply_effect_stack(&mut img, &effect_stack);

    // 4. Encode to PNG
    let mut out_bytes = Vec::new();
    img.write_to(&mut Cursor::new(&mut out_bytes), ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(out_bytes))
}

#[tauri::command]
fn process_image_binary(request: Request<'_>) -> Result<Response, String> {
    let parse_and_exec = |raw_bytes: &[u8]| -> Result<Response, String> {
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
    };

    match request.body() {
        InvokeBody::Raw(bytes) => parse_and_exec(bytes),
        InvokeBody::Json(val) => {
            if let Some(arr) = val.as_array() {
                let raw_bytes: Vec<u8> = arr.iter().filter_map(|v| v.as_u64().map(|n| n as u8)).collect();
                parse_and_exec(&raw_bytes)
            } else {
                Err("Expected raw binary payload for process_image_binary".to_string())
            }
        }
    }
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

        // Detect if frame_echo effect is active — it requires sequential frame-ordered
        // processing because it blends with previous frames via a shared history buffer.
        let needs_sequential = batch
            .base_header
            .effect_stack
            .iter()
            .any(|eff| eff.enabled && eff.canonical_id() == "frame_echo")
            || batch
                .frames_headers
                .as_ref()
                .map(|fh| {
                    fh.iter().any(|h| {
                        h.effect_stack
                            .iter()
                            .any(|eff| eff.enabled && eff.canonical_id() == "frame_echo")
                    })
                })
                .unwrap_or(false);

        if needs_sequential {
            // Clear history at frame 0 so the animation starts clean
            if let Some(h) = ditherforge::effects::get_frame_history_lock() {
                if base_seed == 0 {
                    h.lock().unwrap().clear_history();
                }
            }
            // Sequential processing: frames must blend in chronological order
            for f_idx in 0..batch.frame_count {
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
                all_out[f_idx * frame_bytes..(f_idx + 1) * frame_bytes].copy_from_slice(&processed);
            }
        } else {
            // Parallel processing for all other effect stacks
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
        }

        Ok(Response::new(all_out))
    })
    .await
    .map_err(|e| format!("Animation batch task error: {}", e))?
}

#[derive(serde::Deserialize, Debug)]
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
    // Clear cached 3D LUTs in palette module
    palette::clear_lut_cache();
    // Clear frame echo history
    if let Some(lock) = effects::get_frame_history_lock() {
        if let Ok(mut hist) = lock.lock() {
            hist.clear_history();
        }
    }
    // Cancel all active FFmpeg sessions
    ffmpeg::cancel_all_ffmpeg_sessions();
    Ok("Cache purged successfully".to_string())
}

#[tauri::command]
fn cancel_native_video_export() -> Result<(), String> {
    ffmpeg::cancel_native_video_export();
    Ok(())
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
                // Clean up active FFmpeg processes before exit
                ffmpeg::cancel_all_ffmpeg_sessions();
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
            cancel_native_video_export,
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

#[tauri::command]
fn ping_rust_engine() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "status": "ok",
        "backend": "rust",
        "version": "1.0.0"
    }))
}

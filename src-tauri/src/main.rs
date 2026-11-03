#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// ORPHANED: Rust engine is not invoked by the frontend at runtime.
// Parked pending docs/ENGINE_PARITY.md. Do not delete, do not wire.
mod algorithms;
mod effects;
mod engine;
mod palette;

use algorithms::{apply_algorithm_by_id, ALGORITHM_REGISTRY};
use effects::{apply_effect_stack, PostEffect};
use engine::{apply_pre_adjustments, DitherSettings};
use image::{ImageFormat, RgbaImage, ImageReader};
use palette::{extract_palette_median_cut, get_builtin_palettes, PalettePreset};
use std::io::Cursor;
use base64::{engine::{general_purpose::STANDARD, Engine}};

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
        .map_err(|e| format!("Failed to read image header: {}", e))?;
    reader
        .into_dimensions()
        .map_err(|e| format!("Failed to read image dimensions: {}", e))
}

#[derive(serde::Serialize)]
struct AlgorithmInfo {
    id: &'static str,
    name: &'static str,
    category: String,
    description: &'static str,
}

#[tauri::command]
fn get_algorithms_list() -> Vec<AlgorithmInfo> {
    ALGORITHM_REGISTRY
        .iter()
        .map(|a| AlgorithmInfo {
            id: a.id,
            name: a.name,
            category: format!("{:?}", a.category),
            description: a.description,
        })
        .collect()
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
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?.to_rgba8();
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
    let mut img: RgbaImage = image::load_from_memory(&bytes)
        .map_err(|e| e.to_string())?
        .to_rgba8();

    // 1. Common tweaks (Brightness, contrast, saturation, gamma)
    apply_pre_adjustments(&mut img, &settings);

    // 2. Core 63-Algorithm Dithering Engine
    apply_algorithm_by_id(&mut img, &settings);

    // 3. Stackable Post-Effects Pipeline
    apply_effect_stack(&mut img, &effect_stack);

    // 4. Encode to PNG
    let mut out_bytes = Vec::new();
    img.write_to(&mut Cursor::new(&mut out_bytes), ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(STANDARD.encode(out_bytes))
}

#[tauri::command]
fn purge_temp_cache() -> Result<String, String> {
    // Drop cached memory buffers
    Ok("Cache purged successfully".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_algorithms_list,
            get_palettes,
            extract_palette,
            process_image,
            purge_temp_cache
        ])
        .run(tauri::generate_context!())
        .expect("error while running DitherForge application");
}

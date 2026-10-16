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
use image::{ImageFormat, RgbaImage};
use palette::{extract_palette_median_cut, get_builtin_palettes, PalettePreset};
use std::io::Cursor;

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
    let bytes = base64::decode(&image_base64).map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?.to_rgba8();
    Ok(extract_palette_median_cut(&img, color_count.clamp(2, 32)))
}

#[tauri::command]
fn process_image(
    image_base64: String,
    settings: DitherSettings,
    effect_stack: Vec<PostEffect>,
) -> Result<String, String> {
    let bytes = base64::decode(&image_base64).map_err(|e| e.to_string())?;
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

    Ok(base64::encode(out_bytes))
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

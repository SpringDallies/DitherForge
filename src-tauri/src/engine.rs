use image::{Rgba, RgbaImage};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AlgorithmCategory {
    ErrorDiffusion,
    Ordered,
    Pattern,
    Glitch,
    Special,
    Bespoke,
    Temporal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DitherSettings {
    pub algorithm_id: String,
    pub threshold: f32,          // 0.0 to 1.0
    pub scale: f32,              // Pattern scale
    pub diffusion_strength: f32, // 0.0 to 1.0
    pub serpentine: bool,        // Left-to-right alternating
    pub depth: u8,               // 1 to 32
    pub brightness: f32,         // -1.0 to 1.0
    pub contrast: f32,           // -1.0 to 1.0
    pub saturation: f32,         // -1.0 to 1.0
    pub gamma: f32,              // 0.1 to 3.0
    pub noise_amount: f32,       // 0.0 to 1.0
    pub temporal_seed: u32,      // Seed for animation frames
    pub palette: Vec<[u8; 4]>,   // Array of RGBA swatches
}

impl Default for DitherSettings {
    fn default() -> Self {
        Self {
            algorithm_id: "floyd_steinberg".to_string(),
            threshold: 0.5,
            scale: 1.0,
            diffusion_strength: 1.0,
            serpentine: true,
            depth: 8,
            brightness: 0.0,
            contrast: 0.0,
            saturation: 0.0,
            gamma: 1.0,
            noise_amount: 0.0,
            temporal_seed: 0,
            palette: vec![
                [0, 0, 0, 255],
                [255, 255, 255, 255],
            ],
        }
    }
}

#[allow(dead_code)]
pub trait DitherAlgorithm: Send + Sync {
    fn apply(&self, image: &mut RgbaImage, settings: &DitherSettings);
    fn name(&self) -> &str;
    fn category(&self) -> AlgorithmCategory;
    fn default_settings(&self) -> DitherSettings;
}

#[allow(dead_code)]
#[inline(always)]
pub fn color_dist_sq(c1: &[f32; 3], c2: &[u8; 4]) -> f32 {
    let r1 = c1[0];
    let g1 = c1[1];
    let b1 = c1[2];
    let r2 = c2[0] as f32;
    let g2 = c2[1] as f32;
    let b2 = c2[2] as f32;
    let r_bar = (r1 + r2) * 0.5;
    let dr = r1 - r2;
    let dg = g1 - g2;
    let db = b1 - b2;
    // Fast Redmean color distance matching JavaScript engine:
    (2.0 + r_bar / 256.0) * dr * dr + 4.0 * dg * dg + (2.0 + (255.0 - r_bar) / 256.0) * db * db
}

#[allow(dead_code)]
#[inline(always)]
pub fn find_nearest_palette_color(color: &[f32; 3], palette: &[[u8; 4]]) -> [u8; 4] {
    if palette.is_empty() {
        return [0, 0, 0, 255];
    }
    let mut min_dist = f32::MAX;
    let mut best_color = palette[0];

    for swatch in palette {
        let dist = color_dist_sq(color, swatch);
        if dist < min_dist {
            min_dist = dist;
            best_color = *swatch;
        }
    }
    best_color
}

/// Native color-integrated pixel dither:
/// Computes color distance in RGB space, finds nearest palette swatch,
/// and stores residual 3D error into `error_out`.
#[allow(dead_code)]
#[inline(always)]
pub fn dither_pixel_with_color(
    pixel: &[f32; 3],
    palette: &[[u8; 4]],
    _threshold: f32,
    error_out: &mut [f32; 3],
) -> Rgba<u8> {
    let target = [
        (pixel[0] + error_out[0]).clamp(0.0, 255.0),
        (pixel[1] + error_out[1]).clamp(0.0, 255.0),
        (pixel[2] + error_out[2]).clamp(0.0, 255.0),
    ];
    let nearest = find_nearest_palette_color(&target, palette);
    error_out[0] = target[0] - (nearest[0] as f32);
    error_out[1] = target[1] - (nearest[1] as f32);
    error_out[2] = target[2] - (nearest[2] as f32);

    Rgba(nearest)
}

/// Applies common image adjustments (brightness, contrast, saturation, gamma)
pub fn apply_pre_adjustments(image: &mut RgbaImage, settings: &DitherSettings) {
    crate::apply_raw_pre_adjustments(
        image.as_mut(),
        settings.brightness,
        settings.contrast,
        settings.saturation,
        settings.gamma,
        0.0,
    );
}

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

pub trait DitherAlgorithm: Send + Sync {
    fn apply(&self, image: &mut RgbaImage, settings: &DitherSettings);
    fn name(&self) -> &str;
    fn category(&self) -> AlgorithmCategory;
    fn default_settings(&self) -> DitherSettings;
}

#[inline(always)]
pub fn color_dist_sq(c1: &[f32; 3], c2: &[u8; 4]) -> f32 {
    let dr = c1[0] - (c2[0] as f32);
    let dg = c1[1] - (c2[1] as f32);
    let db = c1[2] - (c2[2] as f32);
    // Rec. 709 luminance weighted metric for optimal visual perception
    0.2126 * dr * dr + 0.7152 * dg * dg + 0.0722 * db * db
}

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
    if settings.brightness == 0.0
        && settings.contrast == 0.0
        && settings.saturation == 0.0
        && settings.gamma == 1.0
    {
        return;
    }

    let b_offset = settings.brightness * 128.0;
    let c_factor = if settings.contrast >= 0.0 {
        1.0 + settings.contrast * 2.0
    } else {
        1.0 + settings.contrast * 0.8
    };
    let s_factor = 1.0 + settings.saturation;
    let inv_gamma = 1.0 / settings.gamma.max(0.01);

    for pixel in image.pixels_mut() {
        let mut r = pixel[0] as f32;
        let mut g = pixel[1] as f32;
        let mut b = pixel[2] as f32;

        // Brightness & Contrast
        r = ((r - 128.0) * c_factor + 128.0) + b_offset;
        g = ((g - 128.0) * c_factor + 128.0) + b_offset;
        b = ((b - 128.0) * c_factor + 128.0) + b_offset;

        // Saturation
        let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = luma + (r - luma) * s_factor;
        g = luma + (g - luma) * s_factor;
        b = luma + (b - luma) * s_factor;

        // Gamma correction
        if settings.gamma != 1.0 {
            r = 255.0 * (r.clamp(0.0, 255.0) / 255.0).powf(inv_gamma);
            g = 255.0 * (g.clamp(0.0, 255.0) / 255.0).powf(inv_gamma);
            b = 255.0 * (b.clamp(0.0, 255.0) / 255.0).powf(inv_gamma);
        }

        pixel[0] = r.clamp(0.0, 255.0) as u8;
        pixel[1] = g.clamp(0.0, 255.0) as u8;
        pixel[2] = b.clamp(0.0, 255.0) as u8;
    }
}

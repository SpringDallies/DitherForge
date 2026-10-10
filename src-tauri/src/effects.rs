use image::{Rgba, RgbaImage};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PostEffectType {
    Glow { radius: f32, intensity: f32 },
    BlurSharpen { amount: f32 }, // < 0 = blur, > 0 = sharpen
    ChromaticAberration { offset_x: f32, offset_y: f32 },
    JpegArtifacts { quality: f32 },
    Halftone { dot_size: f32, angle: f32, shape: String },
    Scanlines { thickness: f32, intensity: f32 },
    Pixelate { block_size: u32 },
    CurvesLevels { black_point: f32, white_point: f32, gamma: f32 },
    Vignette { radius: f32, softness: f32 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostEffect {
    pub id: String,
    pub enabled: bool,
    pub effect: PostEffectType,
}

pub fn apply_effect_stack(image: &mut RgbaImage, stack: &[PostEffect]) {
    for effect_item in stack {
        if !effect_item.enabled {
            continue;
        }
        match &effect_item.effect {
            PostEffectType::Glow { radius, intensity } => apply_glow(image, *radius, *intensity),
            PostEffectType::BlurSharpen { amount } => apply_blur_sharpen(image, *amount),
            PostEffectType::ChromaticAberration { offset_x, offset_y } => {
                apply_chromatic_aberration(image, *offset_x, *offset_y)
            }
            PostEffectType::JpegArtifacts { quality } => apply_jpeg_artifacts(image, *quality),
            PostEffectType::Halftone { dot_size, angle, shape } => {
                apply_halftone(image, *dot_size, *angle, shape)
            }
            PostEffectType::Scanlines { thickness, intensity } => {
                apply_scanlines(image, *thickness, *intensity)
            }
            PostEffectType::Pixelate { block_size } => apply_pixelate(image, *block_size),
            PostEffectType::CurvesLevels { black_point, white_point, gamma } => {
                apply_curves_levels(image, *black_point, *white_point, *gamma)
            }
            PostEffectType::Vignette { radius, softness } => {
                apply_vignette(image, *radius, *softness)
            }
        }
    }
}

fn apply_glow(image: &mut RgbaImage, radius: f32, intensity: f32) {
    let (width, height) = image.dimensions();
    let r = radius.max(1.0) as i32;
    let temp = image.clone();

    for y in 0..height {
        for x in 0..width {
            let mut accum = [0.0f32; 3];
            let mut w_sum = 0.0;
            for dy in -r..=r {
                for dx in -r..=r {
                    let nx = x as i32 + dx;
                    let ny = y as i32 + dy;
                    if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                        let p = temp.get_pixel(nx as u32, ny as u32);
                        let w = 1.0 / (1.0 + (dx * dx + dy * dy) as f32);
                        accum[0] += p[0] as f32 * w;
                        accum[1] += p[1] as f32 * w;
                        accum[2] += p[2] as f32 * w;
                        w_sum += w;
                    }
                }
            }
            let orig = temp.get_pixel(x, y);
            let glow = [accum[0] / w_sum, accum[1] / w_sum, accum[2] / w_sum];
            let mut out = *orig;
            out[0] = (orig[0] as f32 + glow[0] * intensity).clamp(0.0, 255.0) as u8;
            out[1] = (orig[1] as f32 + glow[1] * intensity).clamp(0.0, 255.0) as u8;
            out[2] = (orig[2] as f32 + glow[2] * intensity).clamp(0.0, 255.0) as u8;
            image.put_pixel(x, y, out);
        }
    }
}

fn apply_blur_sharpen(image: &mut RgbaImage, amount: f32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();

    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let center = temp.get_pixel(x, y);
            let avg_r = (temp.get_pixel(x - 1, y)[0] as f32 + temp.get_pixel(x + 1, y)[0] as f32 + temp.get_pixel(x, y - 1)[0] as f32 + temp.get_pixel(x, y + 1)[0] as f32) * 0.25;
            let avg_g = (temp.get_pixel(x - 1, y)[1] as f32 + temp.get_pixel(x + 1, y)[1] as f32 + temp.get_pixel(x, y - 1)[1] as f32 + temp.get_pixel(x, y + 1)[1] as f32) * 0.25;
            let avg_b = (temp.get_pixel(x - 1, y)[2] as f32 + temp.get_pixel(x + 1, y)[2] as f32 + temp.get_pixel(x, y - 1)[2] as f32 + temp.get_pixel(x, y + 1)[2] as f32) * 0.25;

            let mut out = *center;
            out[0] = (center[0] as f32 + (center[0] as f32 - avg_r) * amount).clamp(0.0, 255.0) as u8;
            out[1] = (center[1] as f32 + (center[1] as f32 - avg_g) * amount).clamp(0.0, 255.0) as u8;
            out[2] = (center[2] as f32 + (center[2] as f32 - avg_b) * amount).clamp(0.0, 255.0) as u8;
            image.put_pixel(x, y, out);
        }
    }
}

fn apply_chromatic_aberration(image: &mut RgbaImage, offset_x: f32, offset_y: f32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let ox = offset_x as i32;
    let oy = offset_y as i32;

    for y in 0..height {
        for x in 0..width {
            let rx = (x as i32 + ox).clamp(0, width as i32 - 1) as u32;
            let ry = (y as i32 + oy).clamp(0, height as i32 - 1) as u32;
            let bx = (x as i32 - ox).clamp(0, width as i32 - 1) as u32;
            let by = (y as i32 - oy).clamp(0, height as i32 - 1) as u32;

            let r = temp.get_pixel(rx, ry)[0];
            let g = temp.get_pixel(x, y)[1];
            let b = temp.get_pixel(bx, by)[2];
            image.put_pixel(x, y, Rgba([r, g, b, 255]));
        }
    }
}

fn apply_jpeg_artifacts(image: &mut RgbaImage, quality: f32) {
    let (width, height) = image.dimensions();
    let block = 8;
    let quant_step = ((1.0 - quality.clamp(0.0, 1.0)) * 64.0).max(1.0);

    for by in (0..height).step_by(block) {
        for bx in (0..width).step_by(block) {
            let p_lead = *image.get_pixel(bx, by);
            let q_r = ((p_lead[0] as f32 / quant_step).floor() * quant_step) as u8;
            let q_g = ((p_lead[1] as f32 / quant_step).floor() * quant_step) as u8;
            let q_b = ((p_lead[2] as f32 / quant_step).floor() * quant_step) as u8;

            for y in by..(by + block as u32).min(height) {
                for x in bx..(bx + block as u32).min(width) {
                    let mut p = *image.get_pixel(x, y);
                    p[0] = (p[0] as f32 * 0.4 + q_r as f32 * 0.6) as u8;
                    p[1] = (p[1] as f32 * 0.4 + q_g as f32 * 0.6) as u8;
                    p[2] = (p[2] as f32 * 0.4 + q_b as f32 * 0.6) as u8;
                    image.put_pixel(x, y, p);
                }
            }
        }
    }
}

fn apply_halftone(image: &mut RgbaImage, dot_size: f32, angle: f32, _shape: &str) {
    let (width, height) = image.dimensions();
    let cell = dot_size.max(2.0);
    let rad = angle.to_radians();
    let cos_a = rad.cos();
    let sin_a = rad.sin();

    for y in 0..height {
        for x in 0..width {
            let rx = (x as f32 * cos_a - y as f32 * sin_a).abs();
            let ry = (x as f32 * sin_a + y as f32 * cos_a).abs();
            let dx = (rx % cell) - (cell * 0.5);
            let dy = (ry % cell) - (cell * 0.5);
            let dist = (dx * dx + dy * dy).sqrt();

            let p = image.get_pixel(x, y);
            let luma = 0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32;
            let radius = (1.0 - luma / 255.0) * (cell * 0.5);

            if dist > radius {
                image.put_pixel(x, y, Rgba([255, 255, 255, 255]));
            } else {
                image.put_pixel(x, y, Rgba([0, 0, 0, 255]));
            }
        }
    }
}

fn apply_scanlines(image: &mut RgbaImage, thickness: f32, intensity: f32) {
    let (width, height) = image.dimensions();
    let period = (thickness * 2.0).max(2.0) as u32;

    for y in 0..height {
        if y % period < (period / 2) {
            for x in 0..width {
                let mut p = *image.get_pixel(x, y);
                p[0] = (p[0] as f32 * (1.0 - intensity)).clamp(0.0, 255.0) as u8;
                p[1] = (p[1] as f32 * (1.0 - intensity)).clamp(0.0, 255.0) as u8;
                p[2] = (p[2] as f32 * (1.0 - intensity)).clamp(0.0, 255.0) as u8;
                image.put_pixel(x, y, p);
            }
        }
    }
}

fn apply_pixelate(image: &mut RgbaImage, block_size: u32) {
    let (width, height) = image.dimensions();
    let bs = block_size.max(1);

    for by in (0..height).step_by(bs as usize) {
        for bx in (0..width).step_by(bs as usize) {
            let sample = *image.get_pixel(bx, by);
            for y in by..(by + bs).min(height) {
                for x in bx..(bx + bs).min(width) {
                    image.put_pixel(x, y, sample);
                }
            }
        }
    }
}

fn apply_curves_levels(image: &mut RgbaImage, black_point: f32, white_point: f32, gamma: f32) {
    let (width, height) = image.dimensions();
    let span = (white_point - black_point).max(0.001);
    let inv_gamma = 1.0 / gamma.max(0.01);

    for y in 0..height {
        for x in 0..width {
            let mut p = *image.get_pixel(x, y);
            for c in 0..3 {
                let norm = (p[c] as f32 / 255.0 - black_point) / span;
                let adjusted = norm.clamp(0.0, 1.0).powf(inv_gamma);
                p[c] = (adjusted * 255.0) as u8;
            }
            image.put_pixel(x, y, p);
        }
    }
}

fn apply_vignette(image: &mut RgbaImage, radius: f32, softness: f32) {
    let (width, height) = image.dimensions();
    let cx = width as f32 * 0.5;
    let cy = height as f32 * 0.5;
    let max_dist = (cx * cx + cy * cy).sqrt() * radius;

    for y in 0..height {
        for x in 0..width {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let dist = (dx * dx + dy * dy).sqrt();
            let factor = (1.0 - (dist / max_dist).clamp(0.0, 1.0).powf(softness)).clamp(0.0, 1.0);

            let mut p = *image.get_pixel(x, y);
            p[0] = (p[0] as f32 * factor) as u8;
            p[1] = (p[1] as f32 * factor) as u8;
            p[2] = (p[2] as f32 * factor) as u8;
            image.put_pixel(x, y, p);
        }
    }
}

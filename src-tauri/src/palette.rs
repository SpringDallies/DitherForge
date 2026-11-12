use image::RgbaImage;
use serde::{Deserialize, Serialize};

#[inline(always)]
pub fn get_luminance(r: f32, g: f32, b: f32) -> f32 {
    (0.2126f64 * (r as f64) + 0.7152f64 * (g as f64) + 0.0722f64 * (b as f64)) as f32
}

/// Fast perceptual Redmean color distance squared matching JavaScript engine:
/// (2 + r_bar / 256) * dr^2 + 4 * dg^2 + (2 + (255 - r_bar) / 256) * db^2
#[inline(always)]
pub fn redmean_dist_sq(r1: f32, g1: f32, b1: f32, r2: f32, g2: f32, b2: f32) -> f32 {
    let r_bar = (r1 + r2) * 0.5;
    let dr = r1 - r2;
    let dg = g1 - g2;
    let db = b1 - b2;
    (2.0 + r_bar / 256.0) * dr * dr + 4.0 * dg * dg + (2.0 + (255.0 - r_bar) / 256.0) * db * db
}

/// FastPaletteLUT: 1:1 Rust equivalent of JavaScript FastPaletteLUT in palette.js
#[derive(Clone, Debug)]
pub struct FastPaletteLUT {
    pub raw_palette: Vec<[u8; 3]>,
    pub palette_size: usize,
    pub luminances: Vec<f32>,
    pub luminances_f64: Vec<f64>,
    pub threshold_bias: f32,
    pub sorted_palette: Vec<[u8; 3]>,
    pub sorted_luminances: Vec<f32>,
    pub sorted_luminances_f64: Vec<f64>,
    pub sorted_to_orig: Vec<usize>,
    pub is_tonal_ramp: bool,
    pub table: Vec<u8>, // 32 * 32 * 32 * 3 bytes (96 KB)
}

use std::sync::{Arc, Mutex, OnceLock};

const MAX_LUT_CACHE: usize = 8;
static LUT_CACHE: OnceLock<Mutex<Vec<(Vec<[u8; 4]>, u32, Arc<FastPaletteLUT>)>>> = OnceLock::new();

pub fn clear_lut_cache() {
    if let Some(mutex) = LUT_CACHE.get() {
        if let Ok(mut guard) = mutex.lock() {
            guard.clear();
        }
    }
}

impl FastPaletteLUT {
    pub fn new(palette: &[[u8; 4]], threshold_bias_opt: Option<f32>) -> Arc<Self> {
        let mut bias = threshold_bias_opt.unwrap_or(0.5);
        if bias > 1.0 {
            bias /= 100.0;
        }
        let threshold_bias = if bias.is_nan() { 0.5 } else { bias.clamp(0.0, 1.0) };
        let bias_bits = threshold_bias.to_bits();

        let cache_mutex = LUT_CACHE.get_or_init(|| Mutex::new(Vec::with_capacity(MAX_LUT_CACHE)));
        if let Ok(guard) = cache_mutex.lock() {
            if let Some((_, _, cached_lut)) = guard.iter().find(|(pal, bias, _)| pal.as_slice() == palette && *bias == bias_bits) {
                return cached_lut.clone();
            }
        }

        let raw_palette: Vec<[u8; 3]> = if palette.is_empty() {
            vec![[0, 0, 0], [255, 255, 255]]
        } else {
            palette.iter().map(|c| [c[0], c[1], c[2]]).collect()
        };

        let palette_size = raw_palette.len();
        let luminances_f64: Vec<f64> = raw_palette
            .iter()
            .map(|c| 0.2126 * (c[0] as f64) + 0.7152 * (c[1] as f64) + 0.0722 * (c[2] as f64))
            .collect();
        let luminances: Vec<f32> = luminances_f64.iter().map(|&l| l as f32).collect();

        // Build luminance-sorted palette
        let mut indexed: Vec<(usize, [u8; 3], f64)> = raw_palette
            .iter()
            .enumerate()
            .map(|(i, &c)| (i, c, luminances_f64[i]))
            .collect();
        indexed.sort_by(|a, b| a.2.partial_cmp(&b.2).unwrap_or(std::cmp::Ordering::Equal));

        let sorted_palette: Vec<[u8; 3]> = indexed.iter().map(|item| item.1).collect();
        let sorted_luminances_f64: Vec<f64> = indexed.iter().map(|item| item.2).collect();
        let sorted_luminances: Vec<f32> = sorted_luminances_f64.iter().map(|&l| l as f32).collect();
        let sorted_to_orig: Vec<usize> = indexed.iter().map(|item| item.0).collect();

        // Check if monotonically sorted by luminance (tonal ramp)
        let mut is_mono = true;
        for i in 1..palette_size {
            if luminances_f64[i] < luminances_f64[i - 1] - 5.0 {
                is_mono = false;
                break;
            }
        }
        let is_tonal_ramp = is_mono;

        // 32x32x32 Fast Redmean Lookup Table for instant O(1) 3D nearest matches
        let mut table = vec![0u8; 32 * 32 * 32 * 3];
        for r in 0..32 {
            let r_val = ((r << 3) + 4) as f32;
            for g in 0..32 {
                let g_val = ((g << 3) + 4) as f32;
                for b in 0..32 {
                    let b_val = ((b << 3) + 4) as f32;
                    let mut min_dist = f32::INFINITY;
                    let mut best = raw_palette[0];
                    for p in &raw_palette {
                        let d = redmean_dist_sq(r_val, g_val, b_val, p[0] as f32, p[1] as f32, p[2] as f32);
                        if d < min_dist {
                            min_dist = d;
                            best = *p;
                        }
                    }
                    let idx = (r * 1024 + g * 32 + b) * 3;
                    table[idx] = best[0];
                    table[idx + 1] = best[1];
                    table[idx + 2] = best[2];
                }
            }
        }

        let built = Arc::new(Self {
            raw_palette,
            palette_size,
            luminances,
            luminances_f64,
            threshold_bias,
            sorted_palette,
            sorted_luminances,
            sorted_luminances_f64,
            sorted_to_orig,
            is_tonal_ramp,
            table,
        });

        if let Ok(mut guard) = cache_mutex.lock() {
            if guard.len() >= MAX_LUT_CACHE {
                guard.remove(0);
            }
            guard.push((palette.to_vec(), bias_bits, built.clone()));
        }

        built
    }

    #[inline(always)]
    pub fn inline_match(&self, r: f32, g: f32, b: f32) -> [u8; 3] {
        let ir = ((r.round() as i32) >> 3).clamp(0, 31) as usize;
        let ig = ((g.round() as i32) >> 3).clamp(0, 31) as usize;
        let ib = ((b.round() as i32) >> 3).clamp(0, 31) as usize;
        let idx = (ir * 1024 + ig * 32 + ib) * 3;
        [self.table[idx], self.table[idx + 1], self.table[idx + 2]]
    }

    #[inline(always)]
    pub fn inline_match_u8(&self, r: u8, g: u8, b: u8) -> [u8; 3] {
        let ir = (r as usize) >> 3;
        let ig = (g as usize) >> 3;
        let ib = (b as usize) >> 3;
        let idx = (ir * 1024 + ig * 32 + ib) * 3;
        [self.table[idx], self.table[idx + 1], self.table[idx + 2]]
    }

    #[inline(always)]
    pub fn inline_match_f64(&self, r: f64, g: f64, b: f64) -> [u8; 3] {
        let ir = ((r.round() as i32) >> 3).clamp(0, 31) as usize;
        let ig = ((g.round() as i32) >> 3).clamp(0, 31) as usize;
        let ib = ((b.round() as i32) >> 3).clamp(0, 31) as usize;
        let idx = (ir * 1024 + ig * 32 + ib) * 3;
        [self.table[idx], self.table[idx + 1], self.table[idx + 2]]
    }

    #[inline(always)]
    pub fn quantize_lum(&self, cur_lum: f32) -> usize {
        let lums = &self.sorted_luminances;
        let n = self.palette_size;
        let bias = self.threshold_bias.clamp(0.05, 0.95);
        let sorted_idx = if cur_lum <= lums[0] {
            0
        } else if cur_lum >= lums[n - 1] {
            n - 1
        } else {
            let hi = lums.partition_point(|&l| l < cur_lum).clamp(1, n - 1);
            let i = hi - 1;
            let mid = lums[i] + (lums[i + 1] - lums[i]) * bias;
            if cur_lum < mid { i } else { i + 1 }
        };
        self.sorted_to_orig[sorted_idx]
    }

    #[inline(always)]
    pub fn quantize_lum_f64(&self, cur_lum: f64) -> usize {
        let lums = &self.sorted_luminances_f64;
        let n = self.palette_size;
        let bias = (self.threshold_bias as f64).clamp(0.05, 0.95);
        let sorted_idx = if cur_lum <= lums[0] {
            0
        } else if cur_lum >= lums[n - 1] {
            n - 1
        } else {
            let hi = lums.partition_point(|&l| l < cur_lum).clamp(1, n - 1);
            let i = hi - 1;
            let mid = lums[i] + (lums[i + 1] - lums[i]) * bias;
            if cur_lum < mid { i } else { i + 1 }
        };
        self.sorted_to_orig[sorted_idx]
    }

    #[inline(always)]
    pub fn find_pair(&self, r: f32, g: f32, b: f32) -> ([u8; 3], [u8; 3], f32) {
        if self.is_tonal_ramp {
            let lum = get_luminance(r, g, b);
            let lums = &self.sorted_luminances;
            let pal = &self.sorted_palette;
            let n = self.palette_size;
            if lum <= lums[0] {
                return (pal[0], pal[1.min(n - 1)], 0.0);
            }
            if lum >= lums[n - 1] {
                return (pal[(n.saturating_sub(2)).max(0)], pal[n - 1], 1.0);
            }
            let hi = lums.partition_point(|&l| l < lum).clamp(1, n - 1);
            let i = hi - 1;
            let span = lums[i + 1] - lums[i];
            let frac = if span > 0.0 { (lum - lums[i]) / span } else { 0.5 };
            (pal[i], pal[i + 1], frac)
        } else {
            let mut best_idx = 0;
            let mut best_dist = f32::INFINITY;
            let mut second_idx = 0;
            let mut second_dist = f32::INFINITY;

            for (i, p) in self.raw_palette.iter().enumerate() {
                let d = redmean_dist_sq(r, g, b, p[0] as f32, p[1] as f32, p[2] as f32);
                if d < best_dist {
                    second_dist = best_dist;
                    second_idx = best_idx;
                    best_dist = d;
                    best_idx = i;
                } else if d < second_dist {
                    second_dist = d;
                    second_idx = i;
                }
            }

            let (idx_dark, idx_light) = if self.luminances[best_idx] > self.luminances[second_idx] {
                (second_idx, best_idx)
            } else {
                (best_idx, second_idx)
            };

            let c1 = self.raw_palette[idx_dark];
            let c2 = self.raw_palette[idx_light];
            let lum1 = self.luminances[idx_dark];
            let lum2 = self.luminances[idx_light];
            let lum = get_luminance(r, g, b);

            let frac = if (lum2 - lum1).abs() > 2.0 {
                ((lum - lum1) / (lum2 - lum1)).clamp(0.0, 1.0)
            } else {
                let d1 = redmean_dist_sq(r, g, b, c1[0] as f32, c1[1] as f32, c1[2] as f32).max(0.0).sqrt();
                let d2 = redmean_dist_sq(r, g, b, c2[0] as f32, c2[1] as f32, c2[2] as f32).max(0.0).sqrt();
                let total = d1 + d2;
                if total > 0.0 { d1 / total } else { 0.5 }
            };

            (c1, c2, frac)
        }
    }

    #[inline(always)]
    pub fn inline_pair_match(&self, r: f32, g: f32, b: f32, threshold: f32) -> [u8; 3] {
        let (c1, c2, frac) = self.find_pair(r, g, b);
        let eff_threshold = (threshold + (self.threshold_bias - 0.5) * 0.5).clamp(0.05, 0.95);
        if frac > eff_threshold { c2 } else { c1 }

    }

}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PalettePreset {
    pub id: &'static str,
    pub name: &'static str,
    pub colors: Vec<[u8; 4]>,
}

pub fn get_builtin_palettes() -> Vec<PalettePreset> {
    vec![
        PalettePreset {
            id: "monochrome_1bit",
            name: "Monochrome 1-Bit",
            colors: vec![[0, 0, 0, 255], [255, 255, 255, 255]],
        },
        PalettePreset {
            id: "gameboy_emerald",
            name: "GameBoy Emerald",
            colors: vec![
                [15, 56, 15, 255],
                [48, 98, 48, 255],
                [139, 172, 15, 255],
                [155, 188, 15, 255],
            ],
        },
        PalettePreset {
            id: "phosphor_amber",
            name: "Phosphor Amber CRT",
            colors: vec![
                [10, 5, 0, 255],
                [80, 40, 0, 255],
                [180, 100, 10, 255],
                [255, 176, 0, 255],
            ],
        },
        PalettePreset {
            id: "cyberpunk_neon",
            name: "Cyberpunk 2084",
            colors: vec![
                [11, 13, 19, 255],
                [255, 0, 128, 255],
                [0, 240, 255, 255],
                [255, 230, 0, 255],
                [112, 0, 255, 255],
            ],
        },
        PalettePreset {
            id: "cga_mode_1",
            name: "CGA Mode 1 (Cyan/Magenta)",
            colors: vec![
                [0, 0, 0, 255],
                [85, 255, 255, 255],
                [255, 85, 255, 255],
                [255, 255, 255, 255],
            ],
        },
        PalettePreset {
            id: "c64_heritage",
            name: "C64 Heritage",
            colors: vec![
                [0, 0, 0, 255],
                [255, 255, 255, 255],
                [136, 0, 0, 255],
                [170, 255, 238, 255],
                [204, 68, 204, 255],
                [0, 204, 85, 255],
                [0, 0, 170, 255],
                [238, 238, 119, 255],
                [221, 136, 85, 255],
                [102, 68, 0, 255],
                [255, 119, 119, 255],
                [51, 51, 51, 255],
                [119, 119, 119, 255],
                [170, 255, 102, 255],
                [0, 136, 255, 255],
                [187, 187, 187, 255],
            ],
        },
        PalettePreset {
            id: "nordic_frost",
            name: "Nordic Frost",
            colors: vec![
                [14, 21, 37, 255],
                [43, 76, 126, 255],
                [100, 149, 196, 255],
                [195, 222, 243, 255],
                [245, 250, 255, 255],
            ],
        },
        PalettePreset {
            id: "vaporwave_pink",
            name: "Vaporwave Neon",
            colors: vec![
                [36, 20, 60, 255],
                [140, 48, 130, 255],
                [245, 90, 155, 255],
                [78, 205, 196, 255],
                [255, 230, 109, 255],
            ],
        },
        PalettePreset {
            id: "solar_flare",
            name: "Solar Flare",
            colors: vec![
                [20, 10, 15, 255],
                [120, 20, 30, 255],
                [220, 70, 20, 255],
                [250, 160, 30, 255],
                [255, 240, 120, 255],
            ],
        },
        PalettePreset {
            id: "pico_fantasy",
            name: "PICO Fantasy 16",
            colors: vec![
                [0, 0, 0, 255],
                [29, 43, 83, 255],
                [126, 37, 83, 255],
                [0, 135, 81, 255],
                [171, 82, 54, 255],
                [95, 87, 79, 255],
                [194, 195, 199, 255],
                [255, 241, 232, 255],
                [255, 0, 77, 255],
                [255, 163, 0, 255],
                [255, 236, 39, 255],
                [0, 228, 54, 255],
                [41, 173, 255, 255],
                [131, 118, 156, 255],
                [255, 119, 168, 255],
                [255, 204, 170, 255],
            ],
        },
        PalettePreset {
            id: "sepia_daguerreotype",
            name: "Sepia Daguerreotype",
            colors: vec![
                [28, 20, 14, 255],
                [78, 54, 38, 255],
                [142, 107, 76, 255],
                [206, 172, 136, 255],
                [248, 232, 212, 255],
            ],
        },
    ]
}

#[inline(always)]
fn compute_rgb_bounds(pixels: &[[u8; 3]]) -> (u8, u8, u8) {
    let mut min = [255u8; 3];
    let mut max = [0u8; 3];
    for p in pixels {
        min[0] = min[0].min(p[0]);
        max[0] = max[0].max(p[0]);
        min[1] = min[1].min(p[1]);
        max[1] = max[1].max(p[1]);
        min[2] = min[2].min(p[2]);
        max[2] = max[2].max(p[2]);
    }
    (max[0] - min[0], max[1] - min[1], max[2] - min[2])
}

/// Median Cut Algorithm to extract K colors from an image
pub fn extract_palette_median_cut(image: &RgbaImage, target_count: usize) -> Vec<[u8; 4]> {
    let pixels: Vec<[u8; 3]> = image
        .pixels()
        .step_by(4)
        .map(|p| [p[0], p[1], p[2]])
        .collect();

    if pixels.is_empty() {
        return vec![[0, 0, 0, 255], [255, 255, 255, 255]];
    }

    let mut boxes = vec![pixels];

    while boxes.len() < target_count {
        let mut best_box_idx = 0;
        let mut max_range = 0u8;
        let mut best_ranges = (0u8, 0u8, 0u8);

        for (i, b) in boxes.iter().enumerate() {
            if b.len() <= 1 {
                continue;
            }
            let (rr, gr, br) = compute_rgb_bounds(b);
            let range = rr.max(gr).max(br);
            if range > max_range {
                max_range = range;
                best_box_idx = i;
                best_ranges = (rr, gr, br);
            }
        }

        if max_range == 0 {
            break;
        }

        let mut b = boxes.swap_remove(best_box_idx);
        let (r_range, g_range, b_range) = best_ranges;
        let channel = if r_range >= g_range && r_range >= b_range {
            0
        } else if g_range >= r_range && g_range >= b_range {
            1
        } else {
            2
        };

        let median = b.len() / 2;
        b.select_nth_unstable_by_key(median, |p| p[channel]);
        let b2 = b.split_off(median);
        boxes.push(b);
        boxes.push(b2);
    }

    boxes
        .into_iter()
        .map(|b| {
            if b.is_empty() {
                return [0, 0, 0, 255];
            }
            let len = b.len() as u64;
            let sum_r: u64 = b.iter().map(|p| p[0] as u64).sum();
            let sum_g: u64 = b.iter().map(|p| p[1] as u64).sum();
            let sum_b: u64 = b.iter().map(|p| p[2] as u64).sum();
            [(sum_r / len) as u8, (sum_g / len) as u8, (sum_b / len) as u8, 255]
        })
        .collect()
}


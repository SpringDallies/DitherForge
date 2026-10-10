use image::RgbaImage;
use serde::{Deserialize, Serialize};

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

/// Median Cut Algorithm to extract K colors from an image
pub fn extract_palette_median_cut(image: &RgbaImage, target_count: usize) -> Vec<[u8; 4]> {
    let mut pixels: Vec<[u8; 3]> = image
        .pixels()
        .step_by(4) // Subsample for fast processing
        .map(|p| [p[0], p[1], p[2]])
        .collect();

    if pixels.is_empty() {
        return vec![[0, 0, 0, 255], [255, 255, 255, 255]];
    }

    let mut boxes = vec![pixels];

    while boxes.len() < target_count {
        let mut best_box_idx = 0;
        let mut max_range = -1i32;

        for (i, b) in boxes.iter().enumerate() {
            if b.len() <= 1 {
                continue;
            }
            let (min_r, max_r) = b.iter().fold((255, 0), |(mn, mx), p| (mn.min(p[0]), mx.max(p[0])));
            let (min_g, max_g) = b.iter().fold((255, 0), |(mn, mx), p| (mn.min(p[1]), mx.max(p[1])));
            let (min_b, max_b) = b.iter().fold((255, 0), |(mn, mx), p| (mn.min(p[2]), mx.max(p[2])));

            let range = ((max_r - min_r) as i32).max((max_g - min_g) as i32).max((max_b - min_b) as i32);
            if range > max_range {
                max_range = range;
                best_box_idx = i;
            }
        }

        if max_range <= 0 {
            break;
        }

        let mut b = boxes.swap_remove(best_box_idx);
        let (min_r, max_r) = b.iter().fold((255, 0), |(mn, mx), p| (mn.min(p[0]), mx.max(p[0])));
        let (min_g, max_g) = b.iter().fold((255, 0), |(mn, mx), p| (mn.min(p[1]), mx.max(p[1])));
        let (min_b, max_b) = b.iter().fold((255, 0), |(mn, mx), p| (mn.min(p[2]), mx.max(p[2])));

        let r_range = max_r - min_r;
        let g_range = max_g - min_g;
        let b_range = max_b - min_b;

        let channel = if r_range >= g_range && r_range >= b_range {
            0
        } else if g_range >= r_range && g_range >= b_range {
            1
        } else {
            2
        };

        b.sort_by_key(|p| p[channel]);
        let median = b.len() / 2;
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

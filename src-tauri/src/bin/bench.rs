// DitherForge Phase 1 Audit: Rust Native Engine Benchmark
// Physical Hardware Target: Intel Core i3-3240T (2 cores / 4 threads, 2.9 GHz, 8 GB DDR3)

#[path = "../algorithms/mod.rs"]
mod algorithms;
#[path = "../effects.rs"]
mod effects;
#[path = "../engine.rs"]
mod engine;
#[path = "../palette.rs"]
mod palette;

use algorithms::apply_algorithm_by_id;
use effects::{apply_effect_stack, PostEffect, PostEffectType};
use engine::DitherSettings;
use image::{ImageFormat, Rgba, RgbaImage};
use std::io::Cursor;
use std::time::Instant;
use base64::{engine::{general_purpose::STANDARD, Engine}};

struct Resolution {
    name: &'static str,
    w: u32,
    h: u32,
}

const RESOLUTIONS: &[Resolution] = &[
    Resolution { name: "320x240", w: 320, h: 240 },
    Resolution { name: "400x300", w: 400, h: 300 },
    Resolution { name: "640x480", w: 640, h: 480 },
    Resolution { name: "1280x720", w: 1280, h: 720 },
];

const ALGORITHMS: &[&str] = &[
    "floyd_steinberg",
    "atkinson",
    "bayer_8x8",
    "checkered",
    "blue_noise",
];

fn create_test_image(w: u32, h: u32) -> RgbaImage {
    let mut img = RgbaImage::new(w, h);
    for y in 0..h {
        for x in 0..w {
            let r = ((x as f32 / (w - 1) as f32) * 255.0) as u8;
            let g = ((y as f32 / (h - 1) as f32) * 255.0) as u8;
            let dx = x as f32 - (w as f32 / 2.0);
            let dy = y as f32 - (h as f32 / 2.0);
            let dist = (dx * dx + dy * dy).sqrt();
            let b = (((dist * 0.05).sin() * 0.5 + 0.5) * 255.0) as u8;
            img.put_pixel(x, y, Rgba([r, g, b, 255]));
        }
    }
    img
}

fn main() {
    println!("==================================================================");
    println!("       DITHERFORGE RUST ENGINE BENCHMARK (EMPIRICAL HARDWARE)     ");
    println!("==================================================================");

    let test_palette = vec![
        [15, 56, 15, 255],
        [48, 98, 48, 255],
        [139, 172, 15, 255],
        [155, 188, 15, 255],
    ];

    for res in RESOLUTIONS {
        println!("\n=== Resolution: {} ({}x{}) ===", res.name, res.w, res.h);

        // 1. Dithering Algorithms Benchmark
        for &algo in ALGORITHMS {
            let mut settings = DitherSettings::default();
            settings.algorithm_id = algo.to_string();
            settings.palette = test_palette.clone();
            settings.threshold = 0.5;
            settings.scale = 1.0;
            settings.diffusion_strength = 1.0;
            settings.serpentine = true;

            // Warmup
            let mut warm_img = create_test_image(res.w, res.h);
            apply_algorithm_by_id(&mut warm_img, &settings);

            let runs = 5;
            let mut total_dur = std::time::Duration::ZERO;

            for _ in 0..runs {
                let mut img = create_test_image(res.w, res.h);
                let t0 = Instant::now();
                apply_algorithm_by_id(&mut img, &settings);
                total_dur += t0.elapsed();
            }

            let avg_ms = total_dur.as_secs_f64() * 1000.0 / (runs as f64);
            println!("  Algo {:<16}: {:>7.2} ms", algo, avg_ms);
        }

        // 2. Individual Effects Benchmark
        let effect_cases: &[(&str, PostEffectType)] = &[
            ("glow", PostEffectType::Glow { radius: 2.0, intensity: 0.35 }),
            ("scanlines", PostEffectType::Scanlines { thickness: 1.0, intensity: 0.2 }),
            ("pixelate", PostEffectType::Pixelate { block_size: 4 }),
            ("curves_levels", PostEffectType::CurvesLevels { black_point: 0.05, white_point: 0.95, gamma: 1.0 }),
            ("vignette", PostEffectType::Vignette { radius: 0.8, softness: 0.5 }),
        ];

        for &(eff_name, ref eff_type) in effect_cases {
            let stack = vec![PostEffect {
                id: eff_name.to_string(),
                enabled: true,
                effect: Some(eff_type.clone()),
                params: std::collections::HashMap::new(),
                ..Default::default()
            }];

            // Warmup
            let mut warm_img = create_test_image(res.w, res.h);
            apply_effect_stack(&mut warm_img, &stack);

            let runs = 5;
            let mut total_dur = std::time::Duration::ZERO;

            for _ in 0..runs {
                let mut img = create_test_image(res.w, res.h);
                let t0 = Instant::now();
                apply_effect_stack(&mut img, &stack);
                total_dur += t0.elapsed();
            }

            let avg_ms = total_dur.as_secs_f64() * 1000.0 / (runs as f64);
            println!("  Effect {:<14}: {:>7.2} ms", eff_name, avg_ms);
        }

        // 3. PNG Encoding + Base64 Roundtrip (Current IPC Architecture)
        let img = create_test_image(res.w, res.h);
        let t0 = Instant::now();
        let mut png_bytes = Vec::new();
        img.write_to(&mut Cursor::new(&mut png_bytes), ImageFormat::Png).unwrap();
        let b64 = STANDARD.encode(&png_bytes);
        let decoded_bytes = STANDARD.decode(&b64).unwrap();
        let _img_back: RgbaImage = image::load_from_memory(&decoded_bytes).unwrap().to_rgba8();
        let ipc_roundtrip_ms = t0.elapsed().as_secs_f64() * 1000.0;

        // 4. Raw Buffer Clone (Proposed Direct Binary IPC Architecture)
        let t1 = Instant::now();
        let raw_slice = img.as_raw();
        let mut target_vec = vec![0u8; raw_slice.len()];
        target_vec.copy_from_slice(raw_slice);
        let raw_transfer_ms = t1.elapsed().as_secs_f64() * 1000.0;

        println!("  Current Base64+PNG IPC: {:>7.2} ms (PNG size: {} KB, B64: {} KB)",
            ipc_roundtrip_ms, png_bytes.len() / 1024, b64.len() / 1024);
        println!("  Proposed Raw Binary IPC: {:>7.2} ms (Raw: {} KB)",
            raw_transfer_ms, raw_slice.len() / 1024);
    }
}

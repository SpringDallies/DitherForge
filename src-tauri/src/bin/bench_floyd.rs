// Benchmark comparing current generic Floyd-Steinberg against specialized optimized Floyd-Steinberg
#![allow(dead_code, unused_variables)]
use std::time::Instant;

#[path = "../algorithms/mod.rs"]
mod algorithms;
#[path = "../effects.rs"]
mod effects;
#[path = "../engine.rs"]
mod engine;
#[path = "../palette.rs"]
mod palette;

use algorithms::{apply_algorithm_raw_params, RawAlgorithmParams};
use palette::FastPaletteLUT;

fn create_gradient_image(w: u32, h: u32) -> Vec<u8> {
    let mut buf = vec![0u8; (w * h * 4) as usize];
    for y in 0..h {
        for x in 0..w {
            let idx = ((y * w + x) * 4) as usize;
            buf[idx] = ((x as f32 / w as f32) * 255.0) as u8;
            buf[idx + 1] = ((y as f32 / h as f32) * 255.0) as u8;
            buf[idx + 2] = ((((x ^ y) & 63) as f32 / 63.0) * 255.0) as u8;
            buf[idx + 3] = 255;
        }
    }
    buf
}

// Specialized direct Floyd-Steinberg implementation
pub fn run_floyd_steinberg_optimized(
    width: u32,
    height: u32,
    input: &[u8],
    out: &mut [u8],
    lut: &FastPaletteLUT,
    serpentine: bool,
    error_mult: f32,
) {
    let w = width as usize;
    let h = height as usize;
    let factor = error_mult / 16.0;

    if lut.is_tonal_ramp {
        // Tonal ramp (monochrome / grayscale / single gradient ramp)
        let mut row0 = vec![0.0f32; w];
        let mut row1 = vec![0.0f32; w];

        let mut curr_err = &mut row0[..];
        let mut next_err = &mut row1[..];

        for y in 0..h {
            let is_odd = (y & 1) == 1;
            let reverse = serpentine && is_odd;
            let row_idx = y * w * 4;

            if !reverse {
                // Left to right
                for x in 0..w {
                    let idx = row_idx + x * 4;
                    let lum = 0.2126f64 * (input[idx] as f64)
                        + 0.7152f64 * (input[idx + 1] as f64)
                        + 0.0722f64 * (input[idx + 2] as f64);
                    let cur_lum = (lum + curr_err[x] as f64).clamp(0.0, 255.0);

                    let chosen_idx = lut.quantize_lum_f64(cur_lum);
                    let col = lut.raw_palette[chosen_idx];
                    out[idx] = col[0];
                    out[idx + 1] = col[1];
                    out[idx + 2] = col[2];
                    out[idx + 3] = input[idx + 3];

                    let chosen_lum = lut.luminances_f64[chosen_idx];
                    let err = ((cur_lum - chosen_lum) * (factor as f64)) as f32;

                    // Distribute to neighbors
                    if x + 1 < w {
                        curr_err[x + 1] += err * 7.0;
                    }
                    if y + 1 < h {
                        if x > 0 {
                            next_err[x - 1] += err * 3.0;
                        }
                        next_err[x] += err * 5.0;
                        if x + 1 < w {
                            next_err[x + 1] += err * 1.0;
                        }
                    }
                }
            } else {
                // Right to left (serpentine)
                for x in (0..w).rev() {
                    let idx = row_idx + x * 4;
                    let lum = 0.2126f64 * (input[idx] as f64)
                        + 0.7152f64 * (input[idx + 1] as f64)
                        + 0.0722f64 * (input[idx + 2] as f64);
                    let cur_lum = (lum + curr_err[x] as f64).clamp(0.0, 255.0);

                    let chosen_idx = lut.quantize_lum_f64(cur_lum);
                    let col = lut.raw_palette[chosen_idx];
                    out[idx] = col[0];
                    out[idx + 1] = col[1];
                    out[idx + 2] = col[2];
                    out[idx + 3] = input[idx + 3];

                    let chosen_lum = lut.luminances_f64[chosen_idx];
                    let err = ((cur_lum - chosen_lum) * (factor as f64)) as f32;

                    // Distribute to neighbors (mirrored)
                    if x > 0 {
                        curr_err[x - 1] += err * 7.0;
                    }
                    if y + 1 < h {
                        if x + 1 < w {
                            next_err[x + 1] += err * 3.0;
                        }
                        next_err[x] += err * 5.0;
                        if x > 0 {
                            next_err[x - 1] += err * 1.0;
                        }
                    }
                }
            }

            // Zero current row error buffer and swap
            curr_err.fill(0.0);
            std::mem::swap(&mut curr_err, &mut next_err);
        }
    } else {
        // Multi-hue color error diffusion
        let mut row0 = vec![0.0f32; w * 3];
        let mut row1 = vec![0.0f32; w * 3];
        let mut curr_err = &mut row0[..];
        let mut next_err = &mut row1[..];
        let max_err = 128.0f32;

        for y in 0..h {
            let is_odd = (y & 1) == 1;
            let reverse = serpentine && is_odd;
            let row_idx = y * w * 4;

            if !reverse {
                for x in 0..w {
                    let idx = row_idx + x * 4;
                    let x3 = x * 3;

                    let r = (input[idx] as f32 + curr_err[x3]).clamp(0.0, 255.0);
                    let g = (input[idx + 1] as f32 + curr_err[x3 + 1]).clamp(0.0, 255.0);
                    let b = (input[idx + 2] as f32 + curr_err[x3 + 2]).clamp(0.0, 255.0);

                    let matched = lut.inline_match(r, g, b);
                    out[idx] = matched[0];
                    out[idx + 1] = matched[1];
                    out[idx + 2] = matched[2];
                    out[idx + 3] = input[idx + 3];

                    let err_r = (r - matched[0] as f32).clamp(-max_err, max_err) * factor;
                    let err_g = (g - matched[1] as f32).clamp(-max_err, max_err) * factor;
                    let err_b = (b - matched[2] as f32).clamp(-max_err, max_err) * factor;

                    if x + 1 < w {
                        curr_err[x3 + 3] += err_r * 7.0;
                        curr_err[x3 + 4] += err_g * 7.0;
                        curr_err[x3 + 5] += err_b * 7.0;
                    }
                    if y + 1 < h {
                        if x > 0 {
                            next_err[x3 - 3] += err_r * 3.0;
                            next_err[x3 - 2] += err_g * 3.0;
                            next_err[x3 - 1] += err_b * 3.0;
                        }
                        next_err[x3] += err_r * 5.0;
                        next_err[x3 + 1] += err_g * 5.0;
                        next_err[x3 + 2] += err_b * 5.0;
                        if x + 1 < w {
                            next_err[x3 + 3] += err_r * 1.0;
                            next_err[x3 + 4] += err_g * 1.0;
                            next_err[x3 + 5] += err_b * 1.0;
                        }
                    }
                }
            } else {
                for x in (0..w).rev() {
                    let idx = row_idx + x * 4;
                    let x3 = x * 3;

                    let r = (input[idx] as f32 + curr_err[x3]).clamp(0.0, 255.0);
                    let g = (input[idx + 1] as f32 + curr_err[x3 + 1]).clamp(0.0, 255.0);
                    let b = (input[idx + 2] as f32 + curr_err[x3 + 2]).clamp(0.0, 255.0);

                    let matched = lut.inline_match(r, g, b);
                    out[idx] = matched[0];
                    out[idx + 1] = matched[1];
                    out[idx + 2] = matched[2];
                    out[idx + 3] = input[idx + 3];

                    let err_r = (r - matched[0] as f32).clamp(-max_err, max_err) * factor;
                    let err_g = (g - matched[1] as f32).clamp(-max_err, max_err) * factor;
                    let err_b = (b - matched[2] as f32).clamp(-max_err, max_err) * factor;

                    if x > 0 {
                        curr_err[x3 - 3] += err_r * 7.0;
                        curr_err[x3 - 2] += err_g * 7.0;
                        curr_err[x3 - 1] += err_b * 7.0;
                    }
                    if y + 1 < h {
                        if x + 1 < w {
                            next_err[x3 + 3] += err_r * 3.0;
                            next_err[x3 + 4] += err_g * 3.0;
                            next_err[x3 + 5] += err_b * 3.0;
                        }
                        next_err[x3] += err_r * 5.0;
                        next_err[x3 + 1] += err_g * 5.0;
                        next_err[x3 + 2] += err_b * 5.0;
                        if x > 0 {
                            next_err[x3 - 3] += err_r * 1.0;
                            next_err[x3 - 2] += err_g * 1.0;
                            next_err[x3 - 1] += err_b * 1.0;
                        }
                    }
                }
            }

            curr_err.fill(0.0);
            std::mem::swap(&mut curr_err, &mut next_err);
        }
    }
}

fn compare_implementations(name: &str, w: u32, h: u32, palette: &[[u8; 4]], serpentine: bool, runs: usize) {
    let input = create_gradient_image(w, h);
    let mut out_curr = vec![0u8; input.len()];
    let mut out_opt = vec![0u8; input.len()];
    let params = RawAlgorithmParams {
        threshold: 0.5,
        scale: 1.0,
        diffusion_strength: 1.0,
        serpentine: Some(serpentine),
        temporal_seed: 0,
        ..Default::default()
    };
    let lut = FastPaletteLUT::new(palette, Some(0.5));

    // Verify 100% exact parity first!
    apply_algorithm_raw_params(w, h, &input, &mut out_curr, "floyd_steinberg", palette, &params).unwrap();
    run_floyd_steinberg_optimized(w, h, &input, &mut out_opt, &lut, serpentine, 1.0);

    let mut diff_count = 0;
    for i in 0..out_curr.len() {
        if out_curr[i] != out_opt[i] {
            diff_count += 1;
        }
    }
    assert_eq!(diff_count, 0, "PARITY ERROR! {} pixels differed between original and optimized!", diff_count);

    // Benchmark Original
    for _ in 0..5 {
        apply_algorithm_raw_params(w, h, &input, &mut out_curr, "floyd_steinberg", palette, &params).unwrap();
    }
    let mut orig_times = Vec::with_capacity(runs);
    for _ in 0..runs {
        let t0 = Instant::now();
        apply_algorithm_raw_params(w, h, &input, &mut out_curr, "floyd_steinberg", palette, &params).unwrap();
        orig_times.push(t0.elapsed().as_secs_f64() * 1000.0);
    }
    let orig_avg: f64 = orig_times.iter().sum::<f64>() / runs as f64;

    // Benchmark Optimized
    for _ in 0..5 {
        run_floyd_steinberg_optimized(w, h, &input, &mut out_opt, &lut, serpentine, 1.0);
    }
    let mut opt_times = Vec::with_capacity(runs);
    for _ in 0..runs {
        let t0 = Instant::now();
        run_floyd_steinberg_optimized(w, h, &input, &mut out_opt, &lut, serpentine, 1.0);
        opt_times.push(t0.elapsed().as_secs_f64() * 1000.0);
    }
    let opt_avg: f64 = opt_times.iter().sum::<f64>() / runs as f64;
    let speedup = orig_avg / opt_avg;

    println!(
        "  {:<12} ({}x{}) [serp={}] | Original: {:>6.2} ms | Optimized: {:>6.2} ms | Speedup: {:>5.2}x | Parity: 100.00%",
        name, w, h, serpentine, orig_avg, opt_avg, speedup
    );
}

fn main() {
    println!("=========================================================================================");
    println!("       FLOYD-STEINBERG OPTIMIZATION BENCHMARK & PARITY TEST                               ");
    println!("=========================================================================================");

    let mono_pal = [[0, 0, 0, 255], [255, 255, 255, 255]];
    let gameboy_pal = [
        [15, 56, 15, 255],
        [48, 98, 48, 255],
        [139, 172, 15, 255],
        [155, 188, 15, 255],
    ];
    let cyberpunk_pal = [
        [11, 13, 19, 255],
        [255, 0, 128, 255],
        [0, 240, 255, 255],
        [255, 230, 0, 255],
        [112, 0, 255, 255],
    ];

    println!("\n--- Monochrome 1-Bit Palette (Default) ---");
    compare_implementations("400x300", 400, 300, &mono_pal, false, 40);
    compare_implementations("512x512", 512, 512, &mono_pal, false, 40);
    compare_implementations("1920x1080", 1920, 1080, &mono_pal, false, 20);

    println!("\n--- Monochrome Serpentine Mode ---");
    compare_implementations("400x300", 400, 300, &mono_pal, true, 40);
    compare_implementations("512x512", 512, 512, &mono_pal, true, 40);

    println!("\n--- GameBoy Emerald Palette (4 Colors Tonal Ramp) ---");
    compare_implementations("400x300", 400, 300, &gameboy_pal, false, 40);
    compare_implementations("512x512", 512, 512, &gameboy_pal, false, 40);

    println!("\n--- Cyberpunk Palette (5 Colors Multi-Hue 3D LUT) ---");
    compare_implementations("400x300", 400, 300, &cyberpunk_pal, false, 40);
    compare_implementations("512x512", 512, 512, &cyberpunk_pal, false, 40);
    compare_implementations("1920x1080", 1920, 1080, &cyberpunk_pal, false, 20);
}

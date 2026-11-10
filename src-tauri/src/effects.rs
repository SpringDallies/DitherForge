use image::{Rgba, RgbaImage};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum PostEffectType {
    // --- Original 9 Effects ---
    Glow { radius: f32, intensity: f32 },
    BlurSharpen { amount: f32 },
    ChromaticAberration { offset_x: f32, offset_y: f32 },
    JpegArtifacts { quality: f32 },
    Halftone { dot_size: f32, angle: f32, shape: String },
    Scanlines { thickness: f32, intensity: f32 },
    Pixelate { block_size: u32 },
    CurvesLevels { black_point: f32, white_point: f32, gamma: f32 },
    Vignette { radius: f32, softness: f32 },

    // --- Migrated 32 Effects (Total: 41) ---
    CrtCurvature { curvature: f32, corner_radius: f32 },
    VhsTape { tracking: f32, noise: f32, color_bleed: f32 },
    FilmGrain { amount: f32, size: f32, seed: u32 },
    Posterize { levels: u8 },
    Solarize { threshold: f32 },
    Invert { strength: f32 },
    Sepia { intensity: f32 },
    Duotone { dark: [u8; 3], light: [u8; 3], intensity: f32 },
    HueShift { degrees: f32 },
    ColorBalance { shadows: [f32; 3], midtones: [f32; 3], highlights: [f32; 3] },
    ChannelMixer { r_weights: [f32; 3], g_weights: [f32; 3], b_weights: [f32; 3] },
    EdgeDetect { strength: f32, threshold: f32 },
    Emboss { strength: f32, angle: f32 },
    OilPaint { radius: u32, levels: u8 },
    Kuwahara { radius: u32 },
    MedianFilter { radius: u32 },
    Morphology { mode: String, radius: u32 }, // "dilate", "erode", "open", "close"
    GlitchSlices { count: u32, max_offset: i32, seed: u32 },
    Datamosh { block_size: u32, intensity: f32, seed: u32 },
    PixelStretch { threshold: f32, direction: String },
    RgbSplitRadial { amount: f32, center_x: f32, center_y: f32 },
    LensDistortion { k1: f32, k2: f32 },
    SwirlWarp { angle: f32, radius: f32 },
    WaveRipple { amplitude_x: f32, amplitude_y: f32, frequency: f32, phase: f32 },
    Kaleidoscope { segments: u32, angle: f32 },
    MirrorTile { mode: String, count: u32 },
    AsciiOverlay { cell_size: u32, opacity: f32 },
    LedMatrix { pitch: u32, gap: u32, brightness: f32 },
    LcdSubpixel { scale: u32, intensity: f32 },
    NTSCComposite { bleed: f32, fringing: f32, crawl: f32 },
    PhosphorPersistence { decay: f32, streak_dir: String },
    BloomThreshold { threshold: f32, radius: f32, intensity: f32 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostEffect {
    pub id: String,
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    #[serde(default)]
    pub effect: Option<PostEffectType>,
    #[serde(default)]
    pub params: HashMap<String, Value>,
    #[serde(default = "default_opacity")]
    pub opacity: f32,
    #[serde(default = "default_blend_mode", alias = "blendMode")]
    pub blend_mode: String,
}

fn default_enabled() -> bool {
    true
}

fn default_opacity() -> f32 {
    1.0
}

fn default_blend_mode() -> String {
    "normal".to_string()
}

impl Default for PostEffect {
    fn default() -> Self {
        Self {
            id: String::new(),
            enabled: true,
            effect: None,
            params: HashMap::new(),
            opacity: 1.0,
            blend_mode: "normal".to_string(),
        }
    }
}

impl PostEffect {
    fn f32_param(&self, key: &str, default: f32) -> f32 {
        self.params
            .get(key)
            .and_then(|v| v.as_f64().map(|n| n as f32))
            .unwrap_or(default)
    }

    fn f32_any(&self, keys: &[&str], default: f32) -> f32 {
        for &k in keys {
            if let Some(v) = self.params.get(k).and_then(|v| v.as_f64()) {
                return v as f32;
            }
        }
        default
    }

    fn u32_param(&self, key: &str, default: u32) -> u32 {
        self.params
            .get(key)
            .and_then(|v| {
                v.as_u64()
                    .map(|n| n as u32)
                    .or_else(|| v.as_f64().map(|n| n.round() as u32))
            })
            .unwrap_or(default)
    }

    fn i32_param(&self, key: &str, default: i32) -> i32 {
        self.params
            .get(key)
            .and_then(|v| {
                v.as_i64()
                    .map(|n| n as i32)
                    .or_else(|| v.as_f64().map(|n| n.round() as i32))
            })
            .unwrap_or(default)
    }

    fn u8_param(&self, key: &str, default: u8) -> u8 {
        self.params
            .get(key)
            .and_then(|v| {
                v.as_u64()
                    .map(|n| n as u8)
                    .or_else(|| v.as_f64().map(|n| n.round() as u8))
            })
            .unwrap_or(default)
    }

    fn bool_param(&self, key: &str, default: bool) -> bool {
        self.params
            .get(key)
            .and_then(|v| v.as_bool())
            .unwrap_or(default)
    }

    fn str_param<'a>(&'a self, key: &str, default: &'a str) -> &'a str {
        self.params
            .get(key)
            .and_then(|v| v.as_str())
            .unwrap_or(default)
    }

    fn hex_param(&self, key: &str, default: [u8; 3]) -> [u8; 3] {
        if let Some(s) = self.params.get(key).and_then(|v| v.as_str()) {
            let clean = s.trim().trim_start_matches('#');
            if clean.len() == 3 {
                let r = u8::from_str_radix(&clean[0..1].repeat(2), 16).unwrap_or(default[0]);
                let g = u8::from_str_radix(&clean[1..2].repeat(2), 16).unwrap_or(default[1]);
                let b = u8::from_str_radix(&clean[2..3].repeat(2), 16).unwrap_or(default[2]);
                return [r, g, b];
            } else if clean.len() >= 6 {
                let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(default[0]);
                let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(default[1]);
                let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(default[2]);
                return [r, g, b];
            }
        }
        self.rgb_param(key, default)
    }

    fn rgb_param(&self, key: &str, default: [u8; 3]) -> [u8; 3] {
        if let Some(arr) = self.params.get(key).and_then(|v| v.as_array()) {
            if arr.len() >= 3 {
                let parse_u8 = |val: &Value, def: u8| -> u8 {
                    val.as_u64()
                        .map(|n| n as u8)
                        .or_else(|| val.as_f64().map(|n| n.round().clamp(0.0, 255.0) as u8))
                        .unwrap_or(def)
                };
                return [
                    parse_u8(&arr[0], default[0]),
                    parse_u8(&arr[1], default[1]),
                    parse_u8(&arr[2], default[2]),
                ];
            }
        }
        default
    }

    pub fn offset_seed(&mut self, delta: u32) {
        if let Some(ref mut typed) = self.effect {
            match typed {
                PostEffectType::FilmGrain { seed, .. } => {
                    *seed = seed.wrapping_add(delta);
                }
                PostEffectType::GlitchSlices { seed, .. } => {
                    *seed = seed.wrapping_add(delta);
                }
                PostEffectType::Datamosh { seed, .. } => {
                    *seed = seed.wrapping_add(delta);
                }
                _ => {}
            }
        }
        let cur_frame = self.u32_param("_frameIndex", 0);
        self.params.insert(
            "_frameIndex".to_string(),
            serde_json::Value::from(cur_frame.wrapping_add(delta)),
        );
        let id = self.id.to_lowercase().replace('-', "_");
        if id == "film_grain" || id == "glitch_slices" || id == "datamosh" || self.params.contains_key("seed") {
            let cur_seed = self.u32_param("seed", 0);
            self.params.insert(
                "seed".to_string(),
                serde_json::Value::from(cur_seed.wrapping_add(delta)),
            );
        }
    }

    pub fn canonical_id(&self) -> String {
        let mut out = String::with_capacity(self.id.len() + 4);
        for (i, ch) in self.id.chars().enumerate() {
            if ch == '-' {
                out.push('_');
            } else if ch.is_ascii_uppercase() {
                if i > 0 {
                    out.push('_');
                }
                out.push(ch.to_ascii_lowercase());
            } else {
                out.push(ch);
            }
        }
        match out.as_str() {
            "riso_misreg" => "risograph_misregistration".to_string(),
            "photocopy" => "photocopy_degradation".to_string(),
            "posterize_post" => "posterize".to_string(),
            "outline" => "outline_overlay".to_string(),
            "blueprint" => "blueprint_cyanotype".to_string(),
            "crt_lines" => "scanlines".to_string(),
            _ => out,
        }
    }

    pub fn resolve(&self) -> PostEffectType {
        if let Some(ref typed) = self.effect {
            return typed.clone();
        }
        let norm_id = self.canonical_id();
        match norm_id.as_str() {
            "glow" => PostEffectType::Glow {
                radius: self.f32_param("radius", 3.0),
                intensity: self.f32_param("intensity", 0.6),
            },
            "blur_sharpen" | "blur" | "sharpen" => PostEffectType::BlurSharpen {
                amount: self.f32_param("amount", 0.8),
            },
            "chromatic_aberration" => PostEffectType::ChromaticAberration {
                offset_x: self.f32_any(&["offsetX", "offset_x"], 4.0),
                offset_y: self.f32_any(&["offsetY", "offset_y"], 0.0),
            },
            "jpeg_artifacts" => PostEffectType::JpegArtifacts {
                quality: self.f32_param("quality", 0.3),
            },
            "halftone" => PostEffectType::Halftone {
                dot_size: self.f32_any(&["dotSize", "dot_size"], 5.0),
                angle: self.f32_param("angle", 45.0),
                shape: self.str_param("shape", "circle").to_string(),
            },
            "scanlines" => PostEffectType::Scanlines {
                thickness: self.f32_param("thickness", 2.0),
                intensity: self.f32_param("intensity", 0.4),
            },
            "pixelate" => PostEffectType::Pixelate {
                block_size: self.f32_any(&["blockSize", "block_size"], 4.0).round().max(1.0) as u32,
            },
            "curves_levels" => PostEffectType::CurvesLevels {
                black_point: self.f32_any(&["blackPoint", "black_point"], 0.05),
                white_point: self.f32_any(&["whitePoint", "white_point"], 0.95),
                gamma: self.f32_param("gamma", 1.1),
            },
            "vignette" => PostEffectType::Vignette {
                radius: self.f32_param("radius", 0.8),
                softness: self.f32_any(&["softness", "intensity"], 0.4),
            },
            "crt_curvature" | "screen_curvature" => PostEffectType::CrtCurvature {
                curvature: self.f32_param("curvature", 0.18),
                corner_radius: self.f32_any(&["cornerRounding", "corner_radius"], 0.12),
            },
            "vhs_tape" => PostEffectType::VhsTape {
                tracking: self.f32_param("tracking", 0.5),
                noise: self.f32_param("noise", 0.2),
                color_bleed: self.f32_param("color_bleed", 0.4),
            },
            "film_grain" => PostEffectType::FilmGrain {
                amount: self.f32_any(&["intensity", "amount"], 0.25),
                size: self.f32_param("size", 1.0),
                seed: self.u32_param("seed", 1337).wrapping_add(self.u32_param("_frameIndex", 0) * 1973),
            },
            "posterize" => PostEffectType::Posterize {
                levels: self.u8_param("levels", 4).clamp(2, 64),
            },
            "solarize" => PostEffectType::Solarize {
                threshold: self.f32_param("threshold", 0.5),
            },
            "invert" => PostEffectType::Invert {
                strength: self.f32_param("strength", 1.0),
            },
            "sepia" => PostEffectType::Sepia {
                intensity: self.f32_param("intensity", 0.8),
            },
            "duotone" => PostEffectType::Duotone {
                dark: self.rgb_param("dark", [20, 10, 40]),
                light: self.rgb_param("light", [240, 220, 180]),
                intensity: self.f32_param("intensity", 1.0),
            },
            "hue_shift" => PostEffectType::HueShift {
                degrees: self.f32_param("degrees", 90.0),
            },
            "color_balance" => PostEffectType::ColorBalance {
                shadows: [
                    self.f32_param("shadow_r", 0.0),
                    self.f32_param("shadow_g", 0.0),
                    self.f32_param("shadow_b", 0.0),
                ],
                midtones: [
                    self.f32_param("mid_r", 0.0),
                    self.f32_param("mid_g", 0.0),
                    self.f32_param("mid_b", 0.0),
                ],
                highlights: [
                    self.f32_param("high_r", 0.0),
                    self.f32_param("high_g", 0.0),
                    self.f32_param("high_b", 0.0),
                ],
            },
            "channel_mixer" => PostEffectType::ChannelMixer {
                r_weights: [
                    self.f32_param("rr", 1.0),
                    self.f32_param("rg", 0.0),
                    self.f32_param("rb", 0.0),
                ],
                g_weights: [
                    self.f32_param("gr", 0.0),
                    self.f32_param("gg", 1.0),
                    self.f32_param("gb", 0.0),
                ],
                b_weights: [
                    self.f32_param("br", 0.0),
                    self.f32_param("bg", 0.0),
                    self.f32_param("bb", 1.0),
                ],
            },
            "edge_detect" => PostEffectType::EdgeDetect {
                strength: self.f32_param("strength", 1.0),
                threshold: self.f32_param("threshold", 0.15),
            },
            "emboss" => PostEffectType::Emboss {
                strength: self.f32_param("strength", 1.0),
                angle: self.f32_param("angle", 45.0),
            },
            "oil_paint" => PostEffectType::OilPaint {
                radius: self.u32_param("radius", 3).clamp(1, 10),
                levels: self.u8_param("levels", 16).clamp(2, 64),
            },
            "kuwahara" => PostEffectType::Kuwahara {
                radius: self.u32_param("radius", 3).clamp(1, 10),
            },
            "median_filter" => PostEffectType::MedianFilter {
                radius: self.u32_param("radius", 2).clamp(1, 8),
            },
            "morphology" => PostEffectType::Morphology {
                mode: self.str_param("mode", "dilate").to_string(),
                radius: self.u32_param("radius", 1).clamp(1, 8),
            },
            "glitch_slices" | "slice_glitch" => PostEffectType::GlitchSlices {
                count: self.f32_any(&["sliceCount", "count"], 8.0) as u32,
                max_offset: self.f32_any(&["maxOffset", "max_offset"], 35.0) as i32,
                seed: self.u32_param("seed", 1337).wrapping_add(self.u32_param("_frameIndex", 0)),
            },
            "datamosh" => PostEffectType::Datamosh {
                block_size: self.u32_param("block_size", 16),
                intensity: self.f32_param("intensity", 0.5),
                seed: self.u32_param("seed", 123),
            },
            "pixel_stretch" => PostEffectType::PixelStretch {
                threshold: self.f32_param("threshold", 0.6),
                direction: self.str_param("direction", "down").to_string(),
            },
            "rgb_split_radial" => PostEffectType::RgbSplitRadial {
                amount: self.f32_param("amount", 8.0),
                center_x: self.f32_param("center_x", 0.5),
                center_y: self.f32_param("center_y", 0.5),
            },
            "lens_distortion" => PostEffectType::LensDistortion {
                k1: self.f32_param("k1", 0.1),
                k2: self.f32_param("k2", 0.05),
            },
            "swirl_warp" => PostEffectType::SwirlWarp {
                angle: self.f32_param("angle", 1.57),
                radius: self.f32_param("radius", 120.0),
            },
            "wave_ripple" => PostEffectType::WaveRipple {
                amplitude_x: self.f32_param("amplitude_x", 6.0),
                amplitude_y: self.f32_param("amplitude_y", 6.0),
                frequency: self.f32_param("frequency", 0.04),
                phase: self.f32_param("phase", 0.0),
            },
            "kaleidoscope" => PostEffectType::Kaleidoscope {
                segments: self.u32_param("segments", 6).clamp(2, 24),
                angle: self.f32_param("angle", 0.0),
            },
            "mirror_tile" => PostEffectType::MirrorTile {
                mode: self.str_param("mode", "quad").to_string(),
                count: self.u32_param("count", 2).clamp(1, 8),
            },
            "ascii_overlay" => PostEffectType::AsciiOverlay {
                cell_size: self.u32_param("cell_size", 8).clamp(4, 32),
                opacity: self.f32_param("opacity", 0.6),
            },
            "led_matrix" => PostEffectType::LedMatrix {
                pitch: self.u32_param("pitch", 6).clamp(3, 24),
                gap: self.u32_param("gap", 1).clamp(0, 8),
                brightness: self.f32_param("brightness", 1.2),
            },
            "lcd_subpixel" => PostEffectType::LcdSubpixel {
                scale: self.u32_param("scale", 3).clamp(1, 8),
                intensity: self.f32_param("intensity", 0.5),
            },
            "ntsc_composite" => PostEffectType::NTSCComposite {
                bleed: self.f32_param("bleed", 0.6),
                fringing: self.f32_param("fringing", 0.4),
                crawl: self.f32_param("crawl", 0.25),
            },
            "phosphor_persistence" => PostEffectType::PhosphorPersistence {
                decay: self.f32_param("decay", 0.75),
                streak_dir: self.str_param("streak_dir", "right").to_string(),
            },
            "bloom_threshold" => PostEffectType::BloomThreshold {
                threshold: self.f32_param("threshold", 0.7),
                radius: self.f32_param("radius", 3.0),
                intensity: self.f32_param("intensity", 0.5),
            },
            _ => PostEffectType::Glow {
                radius: 1.0,
                intensity: 0.0,
            },
        }
    }
}

#[derive(Serialize)]
pub struct EffectDescriptor {
    pub id: &'static str,
    pub name: &'static str,
    pub category: &'static str,
}

pub const EFFECT_REGISTRY: &[EffectDescriptor] = &[
    EffectDescriptor { id: "glow", name: "Glow", category: "Light & Optics" },
    EffectDescriptor { id: "blur_sharpen", name: "Blur / Sharpen", category: "Convolution" },
    EffectDescriptor { id: "chromatic_aberration", name: "Chromatic Aberration", category: "Light & Optics" },
    EffectDescriptor { id: "jpeg_artifacts", name: "JPEG Artifacts", category: "Compression & Glitch" },
    EffectDescriptor { id: "halftone", name: "Halftone Screen", category: "Print & Grid" },
    EffectDescriptor { id: "scanlines", name: "CRT Scanlines", category: "Display Emulation" },
    EffectDescriptor { id: "pixelate", name: "Pixelate", category: "Print & Grid" },
    EffectDescriptor { id: "curves_levels", name: "Curves & Levels", category: "Color Grading" },
    EffectDescriptor { id: "vignette", name: "Vignette", category: "Light & Optics" },
    EffectDescriptor { id: "crt_curvature", name: "CRT Barrel Curvature", category: "Display Emulation" },
    EffectDescriptor { id: "vhs_tape", name: "VHS Tape Degradation", category: "Display Emulation" },
    EffectDescriptor { id: "film_grain", name: "Film Grain", category: "Light & Optics" },
    EffectDescriptor { id: "posterize", name: "Posterize", category: "Color Grading" },
    EffectDescriptor { id: "solarize", name: "Solarize", category: "Color Grading" },
    EffectDescriptor { id: "invert", name: "Invert", category: "Color Grading" },
    EffectDescriptor { id: "sepia", name: "Sepia Toning", category: "Color Grading" },
    EffectDescriptor { id: "duotone", name: "Duotone Map", category: "Color Grading" },
    EffectDescriptor { id: "hue_shift", name: "Hue Shift", category: "Color Grading" },
    EffectDescriptor { id: "color_balance", name: "Color Balance", category: "Color Grading" },
    EffectDescriptor { id: "channel_mixer", name: "Channel Mixer", category: "Color Grading" },
    EffectDescriptor { id: "edge_detect", name: "Sobel Edge Overlay", category: "Convolution" },
    EffectDescriptor { id: "emboss", name: "Directional Emboss", category: "Convolution" },
    EffectDescriptor { id: "oil_paint", name: "Oil Paint Quantizer", category: "Stylize" },
    EffectDescriptor { id: "kuwahara", name: "Kuwahara Anisotropic Filter", category: "Stylize" },
    EffectDescriptor { id: "median_filter", name: "Median Despeckle", category: "Convolution" },
    EffectDescriptor { id: "morphology", name: "Morphological Dilate/Erode", category: "Convolution" },
    EffectDescriptor { id: "glitch_slices", name: "Horizontal Glitch Slices", category: "Compression & Glitch" },
    EffectDescriptor { id: "datamosh", name: "Macroblock Datamosh", category: "Compression & Glitch" },
    EffectDescriptor { id: "pixel_stretch", name: "Threshold Pixel Stretch", category: "Compression & Glitch" },
    EffectDescriptor { id: "rgb_split_radial", name: "Radial RGB Split", category: "Light & Optics" },
    EffectDescriptor { id: "lens_distortion", name: "Pincushion / Barrel Lens", category: "Warp & Geometry" },
    EffectDescriptor { id: "swirl_warp", name: "Swirl Vortex Warp", category: "Warp & Geometry" },
    EffectDescriptor { id: "wave_ripple", name: "Sinusoidal Wave Ripple", category: "Warp & Geometry" },
    EffectDescriptor { id: "kaleidoscope", name: "Kaleidoscope Symmetry", category: "Warp & Geometry" },
    EffectDescriptor { id: "mirror_tile", name: "Mirror Tile Repeat", category: "Warp & Geometry" },
    EffectDescriptor { id: "ascii_overlay", name: "ASCII Bitmap Overlay", category: "Print & Grid" },
    EffectDescriptor { id: "led_matrix", name: "LED Dot Matrix Panel", category: "Display Emulation" },
    EffectDescriptor { id: "lcd_subpixel", name: "LCD RGB Subpixel Grid", category: "Display Emulation" },
    EffectDescriptor { id: "ntsc_composite", name: "NTSC Composite Artifact", category: "Display Emulation" },
    EffectDescriptor { id: "phosphor_persistence", name: "Phosphor Trail Decay", category: "Display Emulation" },
    EffectDescriptor { id: "bloom_threshold", name: "High-Pass Highlight Bloom", category: "Light & Optics" },
];

pub fn apply_effect_stack_raw(width: u32, height: u32, buf: &mut Vec<u8>, stack: &[PostEffect]) {
    if stack.is_empty() || !stack.iter().any(|e| e.enabled) {
        return;
    }
    let raw = std::mem::take(buf);
    if let Some(mut img) = RgbaImage::from_raw(width, height, raw) {
        apply_effect_stack(&mut img, stack);
        *buf = img.into_raw();
    }
}

fn blend_channel(d: u8, s: u8, mode: &str) -> u8 {
    let df = d as f32;
    let sf = s as f32;
    match mode {
        "screen" => (255.0 - ((255.0 - df) * (255.0 - sf)) / 255.0).round().clamp(0.0, 255.0) as u8,
        "multiply" => ((df * sf) / 255.0).round().clamp(0.0, 255.0) as u8,
        "overlay" => {
            if d < 128 {
                ((2.0 * df * sf) / 255.0).round().clamp(0.0, 255.0) as u8
            } else {
                (255.0 - (2.0 * (255.0 - df) * (255.0 - sf)) / 255.0).round().clamp(0.0, 255.0) as u8
            }
        }
        "soft-light" | "soft_light" => {
            let dn = df / 255.0;
            let sn = sf / 255.0;
            let res = if sn <= 0.5 {
                dn - (1.0 - 2.0 * sn) * dn * (1.0 - dn)
            } else {
                dn + (2.0 * sn - 1.0) * (dn.sqrt() - dn)
            };
            (res * 255.0).round().clamp(0.0, 255.0) as u8
        }
        "add" | "additive" => d.saturating_add(s),
        _ => s,
    }
}

fn composite_effect_layer(base: &mut RgbaImage, layer: &RgbaImage, opacity: f32, blend_mode: &str) {
    let op = opacity.clamp(0.0, 1.0);
    if op <= 0.001 {
        return;
    }
    let inv_op = 1.0 - op;
    let mode = blend_mode.to_ascii_lowercase();
    for (b_px, l_px) in base.pixels_mut().zip(layer.pixels()) {
        for c in 0..3 {
            let blended = blend_channel(b_px[c], l_px[c], &mode);
            if op >= 0.999 {
                b_px[c] = blended;
            } else {
                b_px[c] = (b_px[c] as f32 * inv_op + blended as f32 * op).round().clamp(0.0, 255.0) as u8;
            }
        }
    }
}

pub fn apply_effect_stack(image: &mut RgbaImage, stack: &[PostEffect]) {
    for effect_item in stack {
        if !effect_item.enabled || effect_item.opacity <= 0.001 {
            continue;
        }
        let mode = effect_item.blend_mode.to_ascii_lowercase();
        let needs_composite = effect_item.opacity < 0.999 || (mode != "normal" && !mode.is_empty());
        let mut working = if needs_composite {
            image.clone()
        } else {
            std::mem::take(image)
        };

        let target = &mut working;
        if effect_item.effect.is_none() && apply_frontend_effect(target, effect_item) {
            // Handled by dedicated frontend parity implementation
        } else {
            match effect_item.resolve() {
                PostEffectType::Glow { radius, intensity } => apply_glow(target, radius, intensity),
                PostEffectType::BlurSharpen { amount } => apply_blur_sharpen(target, amount),
                PostEffectType::ChromaticAberration { offset_x, offset_y } => {
                    apply_chromatic_aberration(target, offset_x, offset_y)
                }
                PostEffectType::JpegArtifacts { quality } => apply_jpeg_artifacts(target, quality),
                PostEffectType::Halftone { dot_size, angle, ref shape } => {
                    apply_halftone(target, dot_size, angle, shape)
                }
                PostEffectType::Scanlines { thickness, intensity } => {
                    apply_scanlines(target, thickness, intensity)
                }
                PostEffectType::Pixelate { block_size } => apply_pixelate(target, block_size),
                PostEffectType::CurvesLevels { black_point, white_point, gamma } => {
                    apply_curves_levels(target, black_point, white_point, gamma)
                }
                PostEffectType::Vignette { radius, softness } => apply_vignette(target, radius, softness),
                PostEffectType::CrtCurvature { curvature, corner_radius } => {
                    apply_crt_curvature(target, curvature, corner_radius)
                }
                PostEffectType::VhsTape { tracking, noise, color_bleed } => {
                    apply_vhs_tape(target, tracking, noise, color_bleed)
                }
                PostEffectType::FilmGrain { amount, size, seed } => {
                    apply_film_grain(target, amount, size, seed)
                }
                PostEffectType::Posterize { levels } => apply_posterize(target, levels),
                PostEffectType::Solarize { threshold } => apply_solarize(target, threshold),
                PostEffectType::Invert { strength } => apply_invert(target, strength),
                PostEffectType::Sepia { intensity } => apply_sepia(target, intensity),
                PostEffectType::Duotone { dark, light, intensity } => {
                    apply_duotone(target, dark, light, intensity)
                }
                PostEffectType::HueShift { degrees } => apply_hue_shift(target, degrees),
                PostEffectType::ColorBalance { shadows, midtones, highlights } => {
                    apply_color_balance(target, shadows, midtones, highlights)
                }
                PostEffectType::ChannelMixer { r_weights, g_weights, b_weights } => {
                    apply_channel_mixer(target, r_weights, g_weights, b_weights)
                }
                PostEffectType::EdgeDetect { strength, threshold } => {
                    apply_edge_detect(target, strength, threshold)
                }
                PostEffectType::Emboss { strength, angle } => apply_emboss(target, strength, angle),
                PostEffectType::OilPaint { radius, levels } => apply_oil_paint(target, radius, levels),
                PostEffectType::Kuwahara { radius } => apply_kuwahara(target, radius),
                PostEffectType::MedianFilter { radius } => apply_median_filter(target, radius),
                PostEffectType::Morphology { ref mode, radius } => apply_morphology(target, mode, radius),
                PostEffectType::GlitchSlices { count, max_offset, seed } => {
                    apply_glitch_slices(target, count, max_offset, seed)
                }
                PostEffectType::Datamosh { block_size, intensity, seed } => {
                    apply_datamosh(target, block_size, intensity, seed)
                }
                PostEffectType::PixelStretch { threshold, ref direction } => {
                    apply_pixel_stretch(target, threshold, direction)
                }
                PostEffectType::RgbSplitRadial { amount, center_x, center_y } => {
                    apply_rgb_split_radial(target, amount, center_x, center_y)
                }
                PostEffectType::LensDistortion { k1, k2 } => apply_lens_distortion(target, k1, k2),
                PostEffectType::SwirlWarp { angle, radius } => apply_swirl_warp(target, angle, radius),
                PostEffectType::WaveRipple { amplitude_x, amplitude_y, frequency, phase } => {
                    apply_wave_ripple(target, amplitude_x, amplitude_y, frequency, phase)
                }
                PostEffectType::Kaleidoscope { segments, angle } => {
                    apply_kaleidoscope(target, segments, angle)
                }
                PostEffectType::MirrorTile { ref mode, count } => apply_mirror_tile(target, mode, count),
                PostEffectType::AsciiOverlay { cell_size, opacity } => {
                    apply_ascii_overlay(target, cell_size, opacity)
                }
                PostEffectType::LedMatrix { pitch, gap, brightness } => {
                    apply_led_matrix(target, pitch, gap, brightness)
                }
                PostEffectType::LcdSubpixel { scale, intensity } => {
                    apply_lcd_subpixel(target, scale, intensity)
                }
                PostEffectType::NTSCComposite { bleed, fringing, crawl } => {
                    apply_ntsc_composite(target, bleed, fringing, crawl)
                }
                PostEffectType::PhosphorPersistence { decay, ref streak_dir } => {
                    apply_phosphor_persistence(target, decay, streak_dir)
                }
                PostEffectType::BloomThreshold { threshold, radius, intensity } => {
                    apply_bloom_threshold(target, threshold, radius, intensity)
                }
            }
        }

        if needs_composite {
            composite_effect_layer(image, &working, effect_item.opacity, &mode);
        } else {
            *image = working;
        }
    }
}

// ---------------------------------------------------------------------------
// 41 Discrete Post-Effect Native Implementations
// ---------------------------------------------------------------------------

fn apply_glow(image: &mut RgbaImage, radius: f32, intensity: f32) {
    if intensity <= 0.001 {
        return;
    }
    let (w, h) = image.dimensions();
    let (wf, hf) = (w as usize, h as usize);
    let r = radius.clamp(1.0, 16.0) as usize;
    let n = wf * hf;

    let mut src_ch = vec![0.0f32; n];
    let mut dst_ch = vec![0.0f32; n];
    let mut tmp = vec![0.0f32; n];

    for c in 0..3 {
        for (i, p) in image.pixels().enumerate() {
            src_ch[i] = p[c] as f32;
        }

        fast_box_blur_f32(&src_ch, &mut dst_ch, &mut tmp, wf, hf, r);

        for (i, p) in image.pixels_mut().enumerate() {
            p[c] = (p[c] as f32 + dst_ch[i] * intensity).clamp(0.0, 255.0) as u8;
        }
    }
}

fn apply_blur_sharpen(image: &mut RgbaImage, amount: f32) {
    let (width, height) = image.dimensions();
    if width < 2 || height < 2 {
        return;
    }
    let temp = image.clone();

    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let center = temp.get_pixel(x, y);
            let avg_r = (temp.get_pixel(x - 1, y)[0] as f32 + temp.get_pixel(x + 1, y)[0] as f32 + temp.get_pixel(x, y - 1)[0] as f32 + temp.get_pixel(x, y + 1)[0] as f32) * 0.25;
            let avg_g = (temp.get_pixel(x - 1, y)[1] as f32 + temp.get_pixel(x + 1, y)[1] as f32 + temp.get_pixel(x, y - 1)[1] as f32 + temp.get_pixel(x, y + 1)[1] as f32) * 0.25;
            let avg_b = (temp.get_pixel(x - 1, y)[2] as f32 + temp.get_pixel(x + 1, y)[2] as f32 + temp.get_pixel(x, y - 1)[2] as f32 + temp.get_pixel(x, y + 1)[2] as f32) * 0.25;

            let clamped_amount = amount.clamp(-1.0, 10.0);
            let r = (center[0] as f32 + (center[0] as f32 - avg_r) * clamped_amount).clamp(0.0, 255.0) as u8;
            let g = (center[1] as f32 + (center[1] as f32 - avg_g) * clamped_amount).clamp(0.0, 255.0) as u8;
            let b = (center[2] as f32 + (center[2] as f32 - avg_b) * clamped_amount).clamp(0.0, 255.0) as u8;

            image.put_pixel(x, y, Rgba([r, g, b, center[3]]));
        }
    }
}

fn apply_chromatic_aberration(image: &mut RgbaImage, offset_x: f32, offset_y: f32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();

    let ox = offset_x.round() as i32;
    let oy = offset_y.round() as i32;

    for y in 0..height {
        for x in 0..width {
            let orig = temp.get_pixel(x, y);

            let rx = (x as i32 + ox).clamp(0, width as i32 - 1) as u32;
            let ry = (y as i32 + oy).clamp(0, height as i32 - 1) as u32;
            let r = temp.get_pixel(rx, ry)[0];

            let bx = (x as i32 - ox).clamp(0, width as i32 - 1) as u32;
            let by = (y as i32 - oy).clamp(0, height as i32 - 1) as u32;
            let b = temp.get_pixel(bx, by)[2];

            image.put_pixel(x, y, Rgba([r, orig[1], b, orig[3]]));
        }
    }
}

fn apply_jpeg_artifacts(image: &mut RgbaImage, quality: f32) {
    let (width, height) = image.dimensions();
    let block_size = ((100.0 - quality) / 10.0).max(1.0) as u32;
    if block_size <= 1 {
        return;
    }

    for by in (0..height).step_by(block_size as usize) {
        for bx in (0..width).step_by(block_size as usize) {
            let mut sum_r = 0u32;
            let mut sum_g = 0u32;
            let mut sum_b = 0u32;
            let mut count = 0u32;

            for dy in 0..block_size {
                for dx in 0..block_size {
                    let px = bx + dx;
                    let py = by + dy;
                    if px < width && py < height {
                        let p = image.get_pixel(px, py);
                        sum_r += p[0] as u32;
                        sum_g += p[1] as u32;
                        sum_b += p[2] as u32;
                        count += 1;
                    }
                }
            }

            if count > 0 {
                let avg_r = (sum_r / count) as u8;
                let avg_g = (sum_g / count) as u8;
                let avg_b = (sum_b / count) as u8;

                for dy in 0..block_size {
                    for dx in 0..block_size {
                        let px = bx + dx;
                        let py = by + dy;
                        if px < width && py < height {
                            let cur_a = image.get_pixel(px, py)[3];
                            image.put_pixel(px, py, Rgba([avg_r, avg_g, avg_b, cur_a]));
                        }
                    }
                }
            }
        }
    }
}

fn apply_halftone(image: &mut RgbaImage, dot_size: f32, angle: f32, shape: &str) {
    let rad = angle.to_radians();
    let cos_a = rad.cos();
    let sin_a = rad.sin();
    let size = dot_size.max(2.0);
    let half_size = size * 0.5;
    let s = shape.to_ascii_lowercase();
    enum Shape {
        Square,
        Diamond,
        Line,
        Circle,
    }
    let shape_type = match s.as_str() {
        "square" => Shape::Square,
        "diamond" => Shape::Diamond,
        "line" => Shape::Line,
        _ => Shape::Circle,
    };

    for (x, y, p) in image.enumerate_pixels_mut() {
        let rot_x = (x as f32 * cos_a - y as f32 * sin_a).abs();
        let rot_y = (x as f32 * sin_a + y as f32 * cos_a).abs();

        let mod_x = (rot_x % size) - half_size;
        let mod_y = (rot_y % size) - half_size;
        let dist = match shape_type {
            Shape::Square => mod_x.abs().max(mod_y.abs()),
            Shape::Diamond => (mod_x.abs() + mod_y.abs()) * 0.7071,
            Shape::Line => mod_y.abs(),
            Shape::Circle => (mod_x * mod_x + mod_y * mod_y).sqrt(),
        };

        let luma = 0.299 * p[0] as f32 + 0.587 * p[1] as f32 + 0.114 * p[2] as f32;
        let radius = (1.0 - (luma / 255.0)) * half_size;

        if dist > radius {
            p[0] = 255;
            p[1] = 255;
            p[2] = 255;
        } else {
            p[0] = 0;
            p[1] = 0;
            p[2] = 0;
        }
    }
}

fn apply_scanlines(image: &mut RgbaImage, thickness: f32, intensity: f32) {
    let (width, height) = image.dimensions();
    let period = (thickness * 2.0).max(2.0) as u32;

    for y in 0..height {
        if (y % period) < (thickness as u32).max(1) {
            for x in 0..width {
                let p = image.get_pixel(x, y);
                let factor = 1.0 - intensity.clamp(0.0, 1.0);
                image.put_pixel(
                    x,
                    y,
                    Rgba([
                        (p[0] as f32 * factor) as u8,
                        (p[1] as f32 * factor) as u8,
                        (p[2] as f32 * factor) as u8,
                        p[3],
                    ]),
                );
            }
        }
    }
}

fn apply_pixelate(image: &mut RgbaImage, block_size: u32) {
    let (width, height) = image.dimensions();
    let bs = block_size.max(1);

    for by in (0..height).step_by(bs as usize) {
        for bx in (0..width).step_by(bs as usize) {
            let p = *image.get_pixel(bx, by);
            for dy in 0..bs {
                for dx in 0..bs {
                    let px = bx + dx;
                    let py = by + dy;
                    if px < width && py < height {
                        let cur_a = image.get_pixel(px, py)[3];
                        image.put_pixel(px, py, Rgba([p[0], p[1], p[2], cur_a]));
                    }
                }
            }
        }
    }
}

fn apply_curves_levels(image: &mut RgbaImage, black_point: f32, white_point: f32, gamma: f32) {
    let bp = black_point.clamp(0.0, 0.99);
    let wp = white_point.clamp(bp + 0.01, 1.0);
    let g = gamma.max(0.01);

    for pixel in image.pixels_mut() {
        for c in 0..3 {
            let norm = (pixel[c] as f32 / 255.0 - bp) / (wp - bp);
            let clamped = norm.clamp(0.0, 1.0);
            let mapped = clamped.powf(1.0 / g);
            pixel[c] = (mapped * 255.0).round() as u8;
        }
    }
}

fn apply_vignette(image: &mut RgbaImage, radius: f32, softness: f32) {
    let (width, height) = image.dimensions();
    let cx = width as f32 * 0.5;
    let cy = height as f32 * 0.5;
    let max_dist = (cx * cx + cy * cy).sqrt() * radius.max(0.1);
    let inv_soft_dist = 1.0 / (max_dist * softness.max(0.05));

    for (x, y, p) in image.enumerate_pixels_mut() {
        let dx = x as f32 - cx;
        let dy = y as f32 - cy;
        let dist = (dx * dx + dy * dy).sqrt();

        let factor = ((max_dist - dist) * inv_soft_dist).clamp(0.0, 1.0);
        p[0] = (p[0] as f32 * factor) as u8;
        p[1] = (p[1] as f32 * factor) as u8;
        p[2] = (p[2] as f32 * factor) as u8;
    }
}

fn apply_crt_curvature(image: &mut RgbaImage, curvature: f32, corner_radius: f32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let cx = width as f32 * 0.5;
    let cy = height as f32 * 0.5;
    let curv = curvature.clamp(0.0, 1.0);
    let cr = corner_radius.clamp(0.0, 0.5);

    for y in 0..height {
        for x in 0..width {
            let nx = (x as f32 - cx) / cx;
            let ny = (y as f32 - cy) / cy;
            let r2 = nx * nx + ny * ny;
            let factor = 1.0 + curv * r2;
            let sx = (nx * factor * cx + cx).round() as i32;
            let sy = (ny * factor * cy + cy).round() as i32;

            if sx >= 0 && sx < width as i32 && sy >= 0 && sy < height as i32 {
                let mut pixel = *temp.get_pixel(sx as u32, sy as u32);
                if cr > 0.001 {
                    let edge_x = nx.abs() - (1.0 - cr);
                    let edge_y = ny.abs() - (1.0 - cr);
                    if edge_x > 0.0 && edge_y > 0.0 {
                        let c_dist = (edge_x * edge_x + edge_y * edge_y).sqrt();
                        if c_dist > cr {
                            pixel = Rgba([0, 0, 0, pixel[3]]);
                        } else {
                            let vig = 1.0 - (c_dist / cr).powi(2);
                            pixel[0] = (pixel[0] as f32 * vig) as u8;
                            pixel[1] = (pixel[1] as f32 * vig) as u8;
                            pixel[2] = (pixel[2] as f32 * vig) as u8;
                        }
                    }
                }
                image.put_pixel(x, y, pixel);
            } else {
                image.put_pixel(x, y, Rgba([0, 0, 0, 255]));
            }
        }
    }
}

fn apply_vhs_tape(image: &mut RgbaImage, tracking: f32, noise: f32, color_bleed: f32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let jitter = (tracking * 16.0) as i32;
    let bleed = (color_bleed * 8.0) as i32;

    for y in 0..height {
        let line_jitter = if (y % 13 == 0) && jitter > 0 {
            ((y as f32 * 12.9898).sin() * jitter as f32) as i32
        } else {
            0
        };

        for x in 0..width {
            let sx = (x as i32 + line_jitter).clamp(0, width as i32 - 1) as u32;
            let rx = (sx as i32 + bleed).clamp(0, width as i32 - 1) as u32;
            let orig = temp.get_pixel(sx, y);
            let red_shifted = temp.get_pixel(rx, y)[0];

            let n = if noise > 0.0 {
                (((x as f32 * 17.1 + y as f32 * 31.7).sin() * 43758.5453).fract() - 0.5) * noise * 255.0
            } else {
                0.0
            };

            let r = (red_shifted as f32 + n).clamp(0.0, 255.0) as u8;
            let g = (orig[1] as f32 + n).clamp(0.0, 255.0) as u8;
            let b = (orig[2] as f32 + n).clamp(0.0, 255.0) as u8;
            image.put_pixel(x, y, Rgba([r, g, b, orig[3]]));
        }
    }
}

fn apply_film_grain(image: &mut RgbaImage, amount: f32, size: f32, seed: u32) {
    let amt = amount.clamp(0.0, 1.0) * 255.0;
    if amt <= 0.001 {
        return;
    }
    let sz = size.max(1.0).round() as u32;
    let (width, height) = image.dimensions();

    if sz <= 1 {
        let mut s = seed;
        for pixel in image.pixels_mut() {
            s = s.wrapping_mul(1664525).wrapping_add(1013904223);
            let n = ((s >> 16) as f32 / 65535.0 - 0.5) * amt;
            pixel[0] = (pixel[0] as f32 + n).clamp(0.0, 255.0) as u8;
            pixel[1] = (pixel[1] as f32 + n).clamp(0.0, 255.0) as u8;
            pixel[2] = (pixel[2] as f32 + n).clamp(0.0, 255.0) as u8;
        }
    } else {
        let mut s = seed;
        let blocks_x = (width + sz - 1) / sz;
        let blocks_y = (height + sz - 1) / sz;
        let mut noise_grid = vec![0.0f32; (blocks_x * blocks_y) as usize];
        for val in noise_grid.iter_mut() {
            s = s.wrapping_mul(1664525).wrapping_add(1013904223);
            *val = ((s >> 16) as f32 / 65535.0 - 0.5) * amt;
        }

        for y in 0..height {
            let by = y / sz;
            for x in 0..width {
                let bx = x / sz;
                let n = noise_grid[(by * blocks_x + bx) as usize];
                let pixel = image.get_pixel_mut(x, y);
                pixel[0] = (pixel[0] as f32 + n).clamp(0.0, 255.0) as u8;
                pixel[1] = (pixel[1] as f32 + n).clamp(0.0, 255.0) as u8;
                pixel[2] = (pixel[2] as f32 + n).clamp(0.0, 255.0) as u8;
            }
        }
    }
}

fn apply_posterize(image: &mut RgbaImage, levels: u8) {
    let step = 255.0 / (levels.max(2) - 1) as f32;
    for pixel in image.pixels_mut() {
        for c in 0..3 {
            pixel[c] = (((pixel[c] as f32 / step).round()) * step).clamp(0.0, 255.0) as u8;
        }
    }
}

fn apply_solarize(image: &mut RgbaImage, threshold: f32) {
    let t = (threshold.clamp(0.0, 1.0) * 255.0) as u8;
    for pixel in image.pixels_mut() {
        for c in 0..3 {
            if pixel[c] > t {
                pixel[c] = 255 - pixel[c];
            }
        }
    }
}

fn apply_invert(image: &mut RgbaImage, strength: f32) {
    let s = strength.clamp(0.0, 1.0);
    for pixel in image.pixels_mut() {
        for c in 0..3 {
            let inv = 255 - pixel[c];
            pixel[c] = (pixel[c] as f32 * (1.0 - s) + inv as f32 * s).round() as u8;
        }
    }
}

fn apply_sepia(image: &mut RgbaImage, intensity: f32) {
    let s = intensity.clamp(0.0, 1.0);
    for pixel in image.pixels_mut() {
        let r = pixel[0] as f32;
        let g = pixel[1] as f32;
        let b = pixel[2] as f32;
        let tr = (0.393 * r + 0.769 * g + 0.189 * b).min(255.0);
        let tg = (0.349 * r + 0.686 * g + 0.168 * b).min(255.0);
        let tb = (0.272 * r + 0.534 * g + 0.131 * b).min(255.0);
        pixel[0] = (r * (1.0 - s) + tr * s).round() as u8;
        pixel[1] = (g * (1.0 - s) + tg * s).round() as u8;
        pixel[2] = (b * (1.0 - s) + tb * s).round() as u8;
    }
}

fn apply_duotone(image: &mut RgbaImage, dark: [u8; 3], light: [u8; 3], intensity: f32) {
    let s = intensity.clamp(0.0, 1.0);
    for pixel in image.pixels_mut() {
        let luma = (0.299 * pixel[0] as f32 + 0.587 * pixel[1] as f32 + 0.114 * pixel[2] as f32) / 255.0;
        for c in 0..3 {
            let target = dark[c] as f32 + luma * (light[c] as f32 - dark[c] as f32);
            pixel[c] = (pixel[c] as f32 * (1.0 - s) + target * s).round() as u8;
        }
    }
}

fn apply_hue_shift(image: &mut RgbaImage, degrees: f32) {
    let rad = degrees.to_radians();
    let cos_a = rad.cos();
    let sin_a = rad.sin();
    let m00 = 0.299 + 0.701 * cos_a + 0.168 * sin_a;
    let m01 = 0.587 - 0.587 * cos_a + 0.330 * sin_a;
    let m02 = 0.114 - 0.114 * cos_a - 0.497 * sin_a;
    let m10 = 0.299 - 0.299 * cos_a - 0.328 * sin_a;
    let m11 = 0.587 + 0.413 * cos_a + 0.035 * sin_a;
    let m12 = 0.114 - 0.114 * cos_a + 0.288 * sin_a;
    let m20 = 0.299 - 0.300 * cos_a + 1.250 * sin_a;
    let m21 = 0.587 - 0.588 * cos_a - 1.050 * sin_a;
    let m22 = 0.114 + 0.886 * cos_a - 0.203 * sin_a;

    for pixel in image.pixels_mut() {
        let r = pixel[0] as f32;
        let g = pixel[1] as f32;
        let b = pixel[2] as f32;
        let nr = m00 * r + m01 * g + m02 * b;
        let ng = m10 * r + m11 * g + m12 * b;
        let nb = m20 * r + m21 * g + m22 * b;
        pixel[0] = nr.clamp(0.0, 255.0).round() as u8;
        pixel[1] = ng.clamp(0.0, 255.0).round() as u8;
        pixel[2] = nb.clamp(0.0, 255.0).round() as u8;
    }
}

fn apply_color_balance(image: &mut RgbaImage, shadows: [f32; 3], midtones: [f32; 3], highlights: [f32; 3]) {
    for pixel in image.pixels_mut() {
        let luma = (0.299 * pixel[0] as f32 + 0.587 * pixel[1] as f32 + 0.114 * pixel[2] as f32) / 255.0;
        let w_shadow = (1.0 - luma * 2.0).clamp(0.0, 1.0);
        let w_high = (luma * 2.0 - 1.0).clamp(0.0, 1.0);
        let w_mid = 1.0 - w_shadow - w_high;
        for c in 0..3 {
            let shift = shadows[c] * w_shadow + midtones[c] * w_mid + highlights[c] * w_high;
            pixel[c] = (pixel[c] as f32 + shift * 50.0).clamp(0.0, 255.0).round() as u8;
        }
    }
}

fn apply_channel_mixer(image: &mut RgbaImage, rw: [f32; 3], gw: [f32; 3], bw: [f32; 3]) {
    for pixel in image.pixels_mut() {
        let r = pixel[0] as f32;
        let g = pixel[1] as f32;
        let b = pixel[2] as f32;
        pixel[0] = (r * rw[0] + g * rw[1] + b * rw[2]).clamp(0.0, 255.0).round() as u8;
        pixel[1] = (r * gw[0] + g * gw[1] + b * gw[2]).clamp(0.0, 255.0).round() as u8;
        pixel[2] = (r * bw[0] + g * bw[1] + b * bw[2]).clamp(0.0, 255.0).round() as u8;
    }
}

fn apply_edge_detect(image: &mut RgbaImage, strength: f32, threshold: f32) {
    let (width, height) = image.dimensions();
    if width < 2 || height < 2 {
        return;
    }
    let temp = image.clone();
    let s = strength.clamp(0.0, 5.0);
    let t = threshold.clamp(0.0, 1.0) * 255.0;

    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let mut gx = 0.0f32;
            let mut gy = 0.0f32;
            for dy in -1..=1 {
                for dx in -1..=1 {
                    let p = temp.get_pixel((x as i32 + dx) as u32, (y as i32 + dy) as u32);
                    let luma = 0.299 * p[0] as f32 + 0.587 * p[1] as f32 + 0.114 * p[2] as f32;
                    let kx = match (dx, dy) {
                        (-1, -1) | (-1, 1) => -1.0,
                        (-1, 0) => -2.0,
                        (1, -1) | (1, 1) => 1.0,
                        (1, 0) => 2.0,
                        _ => 0.0,
                    };
                    let ky = match (dx, dy) {
                        (-1, -1) | (1, -1) => -1.0,
                        (0, -1) => -2.0,
                        (-1, 1) | (1, 1) => 1.0,
                        (0, 1) => 2.0,
                        _ => 0.0,
                    };
                    gx += luma * kx;
                    gy += luma * ky;
                }
            }
            let mag = (gx * gx + gy * gy).sqrt();
            let edge = if mag > t { (mag * s).min(255.0) as u8 } else { 0 };
            let p_orig = temp.get_pixel(x, y);
            image.put_pixel(x, y, Rgba([edge.max(p_orig[0]), edge.max(p_orig[1]), edge.max(p_orig[2]), p_orig[3]]));
        }
    }
}

fn apply_emboss(image: &mut RgbaImage, strength: f32, angle: f32) {
    let (width, height) = image.dimensions();
    if width < 2 || height < 2 {
        return;
    }
    let temp = image.clone();
    let rad = angle.to_radians();
    let dx = rad.cos().round() as i32;
    let dy = rad.sin().round() as i32;
    let s = strength.clamp(0.0, 5.0);

    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let p1 = temp.get_pixel((x as i32 + dx).clamp(0, width as i32 - 1) as u32, (y as i32 + dy).clamp(0, height as i32 - 1) as u32);
            let p2 = temp.get_pixel((x as i32 - dx).clamp(0, width as i32 - 1) as u32, (y as i32 - dy).clamp(0, height as i32 - 1) as u32);
            let diff = ((p1[0] as f32 - p2[0] as f32) + (p1[1] as f32 - p2[1] as f32) + (p1[2] as f32 - p2[2] as f32)) / 3.0;
            let val = (128.0 + diff * s).clamp(0.0, 255.0).round() as u8;
            image.put_pixel(x, y, Rgba([val, val, val, temp.get_pixel(x, y)[3]]));
        }
    }
}

fn apply_oil_paint(image: &mut RgbaImage, radius: u32, levels: u8) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let r = (radius as i32).clamp(1, 16);
    let lvl = (levels.max(2) as usize).min(64);
    let w = width as usize;

    image.as_mut().par_chunks_exact_mut(w * 4).enumerate().for_each(|(y, row)| {
        for x in 0..width {
            let mut intensity_count = [0u32; 64];
            let mut avg_r = [0u32; 64];
            let mut avg_g = [0u32; 64];
            let mut avg_b = [0u32; 64];

            for dy in -r..=r {
                for dx in -r..=r {
                    let nx = (x as i32 + dx).clamp(0, width as i32 - 1) as u32;
                    let ny = (y as i32 + dy).clamp(0, height as i32 - 1) as u32;
                    let p = temp.get_pixel(nx, ny);
                    let luma = ((p[0] as u32 + p[1] as u32 + p[2] as u32) / 3) as usize;
                    let cur_lvl = (luma * (lvl - 1)) / 255;
                    intensity_count[cur_lvl] += 1;
                    avg_r[cur_lvl] += p[0] as u32;
                    avg_g[cur_lvl] += p[1] as u32;
                    avg_b[cur_lvl] += p[2] as u32;
                }
            }

            let mut max_idx = 0;
            let mut max_cnt = 0;
            for i in 0..lvl {
                if intensity_count[i] > max_cnt {
                    max_cnt = intensity_count[i];
                    max_idx = i;
                }
            }

            let idx = (x as usize) * 4;
            if max_cnt > 0 {
                row[idx] = (avg_r[max_idx] / max_cnt) as u8;
                row[idx + 1] = (avg_g[max_idx] / max_cnt) as u8;
                row[idx + 2] = (avg_b[max_idx] / max_cnt) as u8;
                row[idx + 3] = temp.get_pixel(x, y as u32)[3];
            } else {
                let orig = temp.get_pixel(x, y as u32);
                row[idx] = orig[0];
                row[idx + 1] = orig[1];
                row[idx + 2] = orig[2];
                row[idx + 3] = orig[3];
            }
        }
    });
}

fn apply_kuwahara(image: &mut RgbaImage, radius: u32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let r = radius as i32;
    let w = width as usize;

    image.as_mut().par_chunks_exact_mut(w * 4).enumerate().for_each(|(y, row)| {
        let quadrants = [
            (-r..=0, -r..=0),
            (0..=r, -r..=0),
            (-r..=0, 0..=r),
            (0..=r, 0..=r),
        ];

        for x in 0..width {
            let mut min_variance = f32::INFINITY;
            let mut best_mean = [0u8; 3];

            for (qx, qy) in &quadrants {
                let mut sum = [0.0f32; 3];
                let mut sq_sum = [0.0f32; 3];
                let mut count = 0.0f32;

                for dy in qy.clone() {
                    for dx in qx.clone() {
                        let nx = (x as i32 + dx).clamp(0, width as i32 - 1) as u32;
                        let ny = (y as i32 + dy).clamp(0, height as i32 - 1) as u32;
                        let p = temp.get_pixel(nx, ny);
                        for c in 0..3 {
                            let v = p[c] as f32;
                            sum[c] += v;
                            sq_sum[c] += v * v;
                        }
                        count += 1.0;
                    }
                }

                let mean = [sum[0] / count, sum[1] / count, sum[2] / count];
                let variance = (sq_sum[0] / count - mean[0] * mean[0])
                    + (sq_sum[1] / count - mean[1] * mean[1])
                    + (sq_sum[2] / count - mean[2] * mean[2]);

                if variance < min_variance {
                    min_variance = variance;
                    best_mean = [mean[0].round() as u8, mean[1].round() as u8, mean[2].round() as u8];
                }
            }

            let idx = (x as usize) * 4;
            row[idx] = best_mean[0];
            row[idx + 1] = best_mean[1];
            row[idx + 2] = best_mean[2];
            row[idx + 3] = temp.get_pixel(x, y as u32)[3];
        }
    });
}

fn apply_median_filter(image: &mut RgbaImage, radius: u32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let r = radius.clamp(1, 8) as i32;
    let w = width as usize;

    image.as_mut().par_chunks_exact_mut(w * 4).enumerate().for_each(|(y, row)| {
        let mut r_vals = [0u8; 289]; // max (2*8+1)^2 = 289
        let mut g_vals = [0u8; 289];
        let mut b_vals = [0u8; 289];

        for x in 0..width {
            let mut count = 0usize;
            for dy in -r..=r {
                let ny = (y as i32 + dy).clamp(0, height as i32 - 1) as u32;
                for dx in -r..=r {
                    let nx = (x as i32 + dx).clamp(0, width as i32 - 1) as u32;
                    let p = temp.get_pixel(nx, ny);
                    r_vals[count] = p[0];
                    g_vals[count] = p[1];
                    b_vals[count] = p[2];
                    count += 1;
                }
            }
            let mid = count / 2;
            r_vals[..count].select_nth_unstable(mid);
            g_vals[..count].select_nth_unstable(mid);
            b_vals[..count].select_nth_unstable(mid);

            let idx = (x as usize) * 4;
            row[idx] = r_vals[mid];
            row[idx + 1] = g_vals[mid];
            row[idx + 2] = b_vals[mid];
        }
    });
}

fn morphology_pass(image: &mut RgbaImage, radius: u32, is_dilate: bool) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let r = radius as i32;

    for y in 0..height {
        for x in 0..width {
            let mut target = if is_dilate { [0u8; 3] } else { [255u8; 3] };

            for dy in -r..=r {
                for dx in -r..=r {
                    let nx = (x as i32 + dx).clamp(0, width as i32 - 1) as u32;
                    let ny = (y as i32 + dy).clamp(0, height as i32 - 1) as u32;
                    let p = temp.get_pixel(nx, ny);
                    for c in 0..3 {
                        if is_dilate {
                            target[c] = target[c].max(p[c]);
                        } else {
                            target[c] = target[c].min(p[c]);
                        }
                    }
                }
            }

            image.put_pixel(x, y, Rgba([target[0], target[1], target[2], temp.get_pixel(x, y)[3]]));
        }
    }
}

fn apply_morphology(image: &mut RgbaImage, mode: &str, radius: u32) {
    let m = mode.to_ascii_lowercase();
    match m.as_str() {
        "erode" => morphology_pass(image, radius, false),
        "open" => {
            morphology_pass(image, radius, false);
            morphology_pass(image, radius, true);
        }
        "close" => {
            morphology_pass(image, radius, true);
            morphology_pass(image, radius, false);
        }
        _ => morphology_pass(image, radius, true),
    }
}

fn apply_glitch_slices(image: &mut RgbaImage, count: u32, max_offset: i32, seed: u32) {
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 || count == 0 {
        return;
    }
    let temp = image.clone();
    let mut s = seed;
    let max_off = max_offset.abs().max(1);

    for _ in 0..count {
        s = s.wrapping_mul(1664525).wrapping_add(1013904223);
        let slice_y = (s >> 16) % height;
        s = s.wrapping_mul(1664525).wrapping_add(1013904223);
        let slice_h = ((s >> 16) % 16 + 2).min(height - slice_y);
        s = s.wrapping_mul(1664525).wrapping_add(1013904223);
        let offset = ((s >> 16) as i32 % (max_off * 2 + 1)) - max_off;

        for y in slice_y..(slice_y + slice_h) {
            for x in 0..width {
                let sx = (x as i32 + offset).rem_euclid(width as i32) as u32;
                image.put_pixel(x, y, *temp.get_pixel(sx, y));
            }
        }
    }
}

fn apply_datamosh(image: &mut RgbaImage, block_size: u32, intensity: f32, seed: u32) {
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 {
        return;
    }
    let bs = block_size.clamp(4, 64);
    let mut s = seed;
    let prob = intensity.clamp(0.0, 1.0);
    let temp = image.clone();

    for by in (0..height).step_by(bs as usize) {
        for bx in (0..width).step_by(bs as usize) {
            s = s.wrapping_mul(1664525).wrapping_add(1013904223);
            let roll = (s >> 16) as f32 / 65535.0;
            if roll < prob {
                let src_x = (bx as i32 - bs as i32).clamp(0, width as i32 - 1) as u32;
                let src_y = by;
                for dy in 0..bs {
                    for dx in 0..bs {
                        if bx + dx < width && by + dy < height {
                            let p = *temp.get_pixel((src_x + dx).min(width - 1), (src_y + dy).min(height - 1));
                            image.put_pixel(bx + dx, by + dy, p);
                        }
                    }
                }
            }
        }
    }
}

fn apply_pixel_stretch(image: &mut RgbaImage, threshold: f32, direction: &str) {
    let (width, height) = image.dimensions();
    let t = (threshold.clamp(0.0, 1.0) * 255.0) as u8;
    let down = direction.eq_ignore_ascii_case("down");

    for x in 0..width {
        let mut stretch_color: Option<Rgba<u8>> = None;
        for step in 0..height {
            let y = if down { step } else { height - 1 - step };
            let p = *image.get_pixel(x, y);
            let luma = ((p[0] as u32 + p[1] as u32 + p[2] as u32) / 3) as u8;

            if luma > t {
                stretch_color = Some(p);
            } else if let Some(sc) = stretch_color {
                image.put_pixel(x, y, sc);
            }
        }
    }
}

fn apply_rgb_split_radial(image: &mut RgbaImage, amount: f32, center_x: f32, center_y: f32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let cx = width as f32 * center_x;
    let cy = height as f32 * center_y;

    for y in 0..height {
        for x in 0..width {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let dist = (dx * dx + dy * dy).sqrt().max(1.0);
            let ux = dx / dist;
            let uy = dy / dist;

            let rx = (x as f32 + ux * amount).clamp(0.0, width as f32 - 1.0) as u32;
            let ry = (y as f32 + uy * amount).clamp(0.0, height as f32 - 1.0) as u32;
            let bx = (x as f32 - ux * amount).clamp(0.0, width as f32 - 1.0) as u32;
            let by = (y as f32 - uy * amount).clamp(0.0, height as f32 - 1.0) as u32;

            let r = temp.get_pixel(rx, ry)[0];
            let orig = temp.get_pixel(x, y);
            let b = temp.get_pixel(bx, by)[2];

            image.put_pixel(x, y, Rgba([r, orig[1], b, orig[3]]));
        }
    }
}

fn apply_lens_distortion(image: &mut RgbaImage, k1: f32, k2: f32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let cx = width as f32 * 0.5;
    let cy = height as f32 * 0.5;
    let max_r = cx.hypot(cy);

    for y in 0..height {
        for x in 0..width {
            let dx = (x as f32 - cx) / max_r;
            let dy = (y as f32 - cy) / max_r;
            let r2 = dx * dx + dy * dy;
            let distort = 1.0 + k1 * r2 + k2 * r2 * r2;
            let sx = (dx * distort * max_r + cx).round() as i32;
            let sy = (dy * distort * max_r + cy).round() as i32;

            if sx >= 0 && sx < width as i32 && sy >= 0 && sy < height as i32 {
                image.put_pixel(x, y, *temp.get_pixel(sx as u32, sy as u32));
            } else {
                image.put_pixel(x, y, Rgba([0, 0, 0, 0]));
            }
        }
    }
}

fn apply_swirl_warp(image: &mut RgbaImage, angle: f32, radius: f32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let cx = width as f32 * 0.5;
    let cy = height as f32 * 0.5;
    let r = radius.max(1.0);

    for y in 0..height {
        for x in 0..width {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let d = dx.hypot(dy);

            if d < r {
                let theta = (1.0 - d / r).powi(2) * angle;
                let sin_t = theta.sin();
                let cos_t = theta.cos();
                let sx = (cos_t * dx - sin_t * dy + cx).round() as i32;
                let sy = (sin_t * dx + cos_t * dy + cy).round() as i32;

                if sx >= 0 && sx < width as i32 && sy >= 0 && sy < height as i32 {
                    image.put_pixel(x, y, *temp.get_pixel(sx as u32, sy as u32));
                }
            }
        }
    }
}

fn apply_wave_ripple(image: &mut RgbaImage, amp_x: f32, amp_y: f32, freq: f32, phase: f32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();

    for y in 0..height {
        for x in 0..width {
            let ox = (y as f32 * freq + phase).sin() * amp_x;
            let oy = (x as f32 * freq + phase).cos() * amp_y;
            let sx = (x as f32 + ox).clamp(0.0, width as f32 - 1.0) as u32;
            let sy = (y as f32 + oy).clamp(0.0, height as f32 - 1.0) as u32;
            image.put_pixel(x, y, *temp.get_pixel(sx, sy));
        }
    }
}

fn apply_kaleidoscope(image: &mut RgbaImage, segments: u32, angle: f32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let cx = width as f32 * 0.5;
    let cy = height as f32 * 0.5;
    let seg_angle = std::f32::consts::TAU / segments.max(2) as f32;
    let rot = angle.to_radians();

    for y in 0..height {
        for x in 0..width {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let r = dx.hypot(dy);
            let mut theta = dy.atan2(dx) - rot;
            theta = theta.rem_euclid(seg_angle);
            if theta > seg_angle * 0.5 {
                theta = seg_angle - theta;
            }
            theta += rot;

            let sx = (cx + r * theta.cos()).clamp(0.0, width as f32 - 1.0) as u32;
            let sy = (cy + r * theta.sin()).clamp(0.0, height as f32 - 1.0) as u32;
            image.put_pixel(x, y, *temp.get_pixel(sx, sy));
        }
    }
}

fn apply_mirror_tile(image: &mut RgbaImage, mode: &str, count: u32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let c = count.max(1) as f32;
    let m = mode.to_ascii_lowercase();

    let mirror_x = m == "horizontal" || m == "quad" || m.is_empty();
    let mirror_y = m == "vertical" || m == "quad";
    let is_tile_only = m == "tile";

    for y in 0..height {
        let sy = if is_tile_only || !mirror_y {
            (y as f32 * c / height as f32).fract()
        } else {
            let ny = (y as f32 * c / height as f32).fract() * 2.0;
            if ny > 1.0 { 2.0 - ny } else { ny }
        };
        let py = (sy * (height as f32 - 1.0)).clamp(0.0, height as f32 - 1.0).round() as u32;

        for x in 0..width {
            let sx = if is_tile_only || !mirror_x {
                (x as f32 * c / width as f32).fract()
            } else {
                let nx = (x as f32 * c / width as f32).fract() * 2.0;
                if nx > 1.0 { 2.0 - nx } else { nx }
            };
            let px = (sx * (width as f32 - 1.0)).clamp(0.0, width as f32 - 1.0).round() as u32;

            image.put_pixel(x, y, *temp.get_pixel(px, py));
        }
    }
}

fn apply_ascii_overlay(image: &mut RgbaImage, cell_size: u32, opacity: f32) {
    let (width, height) = image.dimensions();
    let cs = cell_size.max(4);
    let op = opacity.clamp(0.0, 1.0);

    for cy in (0..height).step_by(cs as usize) {
        for cx in (0..width).step_by(cs as usize) {
            let mut total_luma = 0.0f32;
            let mut count = 0.0f32;
            for dy in 0..cs {
                for dx in 0..cs {
                    if cx + dx < width && cy + dy < height {
                        let p = image.get_pixel(cx + dx, cy + dy);
                        total_luma += 0.299 * p[0] as f32 + 0.587 * p[1] as f32 + 0.114 * p[2] as f32;
                        count += 1.0;
                    }
                }
            }
            let avg = if count > 0.0 { total_luma / count } else { 128.0 };
            let is_cross = avg < 128.0;

            for dy in 0..cs {
                for dx in 0..cs {
                    if cx + dx < width && cy + dy < height {
                        let mut p = *image.get_pixel(cx + dx, cy + dy);
                        let on_glyph = if is_cross {
                            dx == dy || dx + dy == cs - 1
                        } else {
                            dx == cs / 2 || dy == cs / 2
                        };
                        let target = if on_glyph { 255.0 } else { 0.0 };
                        for c in 0..3 {
                            p[c] = (p[c] as f32 * (1.0 - op) + target * op).round() as u8;
                        }
                        image.put_pixel(cx + dx, cy + dy, p);
                    }
                }
            }
        }
    }
}

fn apply_led_matrix(image: &mut RgbaImage, pitch: u32, gap: u32, brightness: f32) {
    let (width, height) = image.dimensions();
    let p = pitch.max(2);
    let r_dot = ((p.saturating_sub(gap)) as f32 * 0.5).max(0.5);

    for cy in (0..height).step_by(p as usize) {
        for cx in (0..width).step_by(p as usize) {
            let center_x = (cx + p / 2).min(width - 1);
            let center_y = (cy + p / 2).min(height - 1);
            let sampled = *image.get_pixel(center_x, center_y);

            for dy in 0..p {
                for dx in 0..p {
                    let px = cx + dx;
                    let py = cy + dy;
                    if px < width && py < height {
                        let dist = (dx as f32 - p as f32 * 0.5).hypot(dy as f32 - p as f32 * 0.5);
                        if dist <= r_dot {
                            image.put_pixel(
                                px,
                                py,
                                Rgba([
                                    (sampled[0] as f32 * brightness).min(255.0) as u8,
                                    (sampled[1] as f32 * brightness).min(255.0) as u8,
                                    (sampled[2] as f32 * brightness).min(255.0) as u8,
                                    sampled[3],
                                ]),
                            );
                        } else {
                            image.put_pixel(px, py, Rgba([0, 0, 0, sampled[3]]));
                        }
                    }
                }
            }
        }
    }
}

fn apply_lcd_subpixel(image: &mut RgbaImage, scale: u32, intensity: f32) {
    let (width, height) = image.dimensions();
    let s = scale.max(1);
    let darken = (1.0 - intensity.clamp(0.0, 1.0)).max(0.0);

    for y in 0..height {
        for x in 0..width {
            let sub = (x / s) % 3;
            let mut p = *image.get_pixel(x, y);
            match sub {
                0 => {
                    p[1] = (p[1] as f32 * darken) as u8;
                    p[2] = (p[2] as f32 * darken) as u8;
                }
                1 => {
                    p[0] = (p[0] as f32 * darken) as u8;
                    p[2] = (p[2] as f32 * darken) as u8;
                }
                _ => {
                    p[0] = (p[0] as f32 * darken) as u8;
                    p[1] = (p[1] as f32 * darken) as u8;
                }
            }
            image.put_pixel(x, y, p);
        }
    }
}

fn apply_ntsc_composite(image: &mut RgbaImage, bleed: f32, fringing: f32, crawl: f32) {
    let (width, height) = image.dimensions();
    let temp = image.clone();
    let b_span = (bleed * 6.0).max(1.0) as i32;

    for y in 0..height {
        let phase = ((y as f32 * 3.1415 + crawl * 10.0).sin() * fringing * 4.0) as i32;
        for x in 0..width {
            let mut sum_y = 0.0f32;
            let mut count = 0.0f32;
            for dx in -b_span..=b_span {
                let sx = (x as i32 + dx).clamp(0, width as i32 - 1) as u32;
                let p = temp.get_pixel(sx, y);
                sum_y += 0.299 * p[0] as f32 + 0.587 * p[1] as f32 + 0.114 * p[2] as f32;
                count += 1.0;
            }
            let luma = sum_y / count;
            let cx = (x as i32 + phase).clamp(0, width as i32 - 1) as u32;
            let cp = temp.get_pixel(cx, y);
            let r = (luma + (cp[0] as f32 - luma) * 0.8).clamp(0.0, 255.0) as u8;
            let g = (luma + (cp[1] as f32 - luma) * 0.8).clamp(0.0, 255.0) as u8;
            let b = (luma + (cp[2] as f32 - luma) * 0.8).clamp(0.0, 255.0) as u8;
            image.put_pixel(x, y, Rgba([r, g, b, temp.get_pixel(x, y)[3]]));
        }
    }
}

fn apply_phosphor_persistence(image: &mut RgbaImage, decay: f32, streak_dir: &str) {
    let (width, height) = image.dimensions();
    let d = decay.clamp(0.0, 0.95);
    let reverse = streak_dir.eq_ignore_ascii_case("left");
    for y in 0..height {
        let mut trail = [0.0f32; 3];
        for step in 0..width {
            let x = if reverse { width - 1 - step } else { step };
            let mut p = *image.get_pixel(x, y);
            for c in 0..3 {
                trail[c] = (p[c] as f32).max(trail[c] * d);
                p[c] = trail[c].clamp(0.0, 255.0) as u8;
            }
            image.put_pixel(x, y, p);
        }
    }
}

fn apply_bloom_threshold(image: &mut RgbaImage, threshold: f32, radius: f32, intensity: f32) {
    if intensity <= 0.001 {
        return;
    }
    let (w, h) = image.dimensions();
    let (wf, hf) = (w as usize, h as usize);
    let r = radius.clamp(1.0, 16.0) as usize;
    let t_luma = threshold.clamp(0.0, 1.0) * 255.0;
    let n = wf * hf;

    let mask: Vec<bool> = image
        .pixels()
        .map(|p| (0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32) >= t_luma)
        .collect();

    let mut src_ch = vec![0.0f32; n];
    let mut dst_ch = vec![0.0f32; n];
    let mut tmp = vec![0.0f32; n];

    for c in 0..3 {
        for (i, p) in image.pixels().enumerate() {
            src_ch[i] = if mask[i] { p[c] as f32 } else { 0.0 };
        }

        fast_box_blur_f32(&src_ch, &mut dst_ch, &mut tmp, wf, hf, r);

        for (i, p) in image.pixels_mut().enumerate() {
            p[c] = (p[c] as f32 + dst_ch[i] * intensity).clamp(0.0, 255.0) as u8;
        }
    }
}

// ---------------------------------------------------------------------------
// Frontend 37-Effect Suite Parity Implementations (CRT, Film, Print, Glitch, Color)
// ---------------------------------------------------------------------------

fn fast_box_blur_f32(src: &[f32], dst: &mut [f32], temp: &mut [f32], w: usize, h: usize, radius: usize) {
    let r = radius.clamp(1, 32) as isize;
    let win = (r * 2 + 1) as f32;
    let inv_win = 1.0 / win;
    for y in 0..h {
        let row = y * w;
        let mut sum = 0.0f32;
        for i in -r..=r {
            let cx = i.clamp(0, w as isize - 1) as usize;
            sum += src[row + cx];
        }
        for x in 0..w {
            temp[row + x] = sum * inv_win;
            let x_rem = (x as isize - r).max(0) as usize;
            let x_add = (x as isize + r + 1).min(w as isize - 1) as usize;
            sum += src[row + x_add] - src[row + x_rem];
        }
    }
    for x in 0..w {
        let mut sum = 0.0f32;
        for i in -r..=r {
            let cy = i.clamp(0, h as isize - 1) as usize;
            sum += temp[cy * w + x];
        }
        for y in 0..h {
            dst[y * w + x] = sum * inv_win;
            let y_rem = (y as isize - r).max(0) as usize;
            let y_add = (y as isize + r + 1).min(h as isize - 1) as usize;
            sum += temp[y_add * w + x] - temp[y_rem * w + x];
        }
    }
}

fn srgb_to_linear(c: u8) -> f32 {
    let v = c as f32 / 255.0;
    if v <= 0.04045 { v / 12.92 } else { ((v + 0.055) / 1.055).powf(2.4) }
}

fn linear_to_srgb(v: f32) -> u8 {
    let c = if v <= 0.0031308 { 12.92 * v } else { 1.055 * v.max(0.0).powf(1.0 / 2.4) - 0.055 };
    (c * 255.0).round().clamp(0.0, 255.0) as u8
}

fn rgb_to_oklab(r: u8, g: u8, b: u8) -> [f32; 3] {
    let lr = srgb_to_linear(r);
    let lg = srgb_to_linear(g);
    let lb = srgb_to_linear(b);
    let l = (0.41222147 * lr + 0.53633254 * lg + 0.05144599 * lb).cbrt();
    let m = (0.2119035 * lr + 0.68069955 * lg + 0.10739696 * lb).cbrt();
    let s = (0.08830246 * lr + 0.28171884 * lg + 0.6299787 * lb).cbrt();
    [
        0.21045426 * l + 0.7936178 * m - 0.004072047 * s,
        1.9779985 * l - 2.4285922 * m + 0.4505937 * s,
        0.025904037 * l + 0.78277177 * m - 0.80867577 * s,
    ]
}

fn oklab_to_rgb(l_in: f32, a: f32, b: f32) -> [u8; 3] {
    let l_ = l_in + 0.39633778 * a + 0.21580376 * b;
    let m_ = l_in - 0.105561346 * a - 0.06385417 * b;
    let s_ = l_in - 0.08948418 * a - 1.2914855 * b;
    let l = l_ * l_ * l_;
    let m = m_ * m_ * m_;
    let s = s_ * s_ * s_;
    let lr = 4.0767417 * l - 3.3077116 * m + 0.23096993 * s;
    let lg = -1.268438 * l + 2.6097574 * m - 0.3413194 * s;
    let lb = -0.0041960863 * l - 0.7034186 * m + 1.7076147 * s;
    [linear_to_srgb(lr), linear_to_srgb(lg), linear_to_srgb(lb)]
}

fn hash_u32(mut x: u32) -> f32 {
    x = (x ^ 61) ^ (x >> 16);
    x = x.wrapping_mul(9);
    x ^= x >> 4;
    x = x.wrapping_mul(0x27d4eb2d);
    x ^= x >> 15;
    (x as f32) / (u32::MAX as f32)
}

fn apply_frontend_effect(image: &mut RgbaImage, eff: &PostEffect) -> bool {
    let id = eff.canonical_id();
    let (w, h) = image.dimensions();
    if w == 0 || h == 0 {
        return true;
    }
    let wf = w as usize;
    let hf = h as usize;
    let frame_idx = eff.u32_param("_frameIndex", 0);

    match id.as_str() {
        "scanlines" => {
            let mode = eff.str_param("mode", "soft");
            let thickness = eff.f32_param("thickness", 2.0).max(1.0);
            let intensity = eff.f32_param("intensity", 0.4).clamp(0.0, 1.0);
            let speed = eff.f32_param("speed", 2.0);
            let period = (thickness * 2.0).max(2.0);
            let roll_offset = (frame_idx as f32 * speed).floor();
            for y in 0..h {
                let eff_y = (y as f32 - roll_offset).rem_euclid(period);
                for x in 0..w {
                    let p = image.get_pixel_mut(x, y);
                    let scan_gain = match mode {
                        "hard" => if eff_y >= thickness { 1.0 - intensity } else { 1.0 },
                        "interlaced" => if (y % 2) != (frame_idx % 2) { 1.0 - intensity * 0.8 } else { 1.0 },
                        "rolling" => {
                            let roll_y = ((frame_idx as f32 * speed * 3.0) % (h as f32 + 60.0)) - 30.0;
                            let beam_r = (thickness * 8.0).max(12.0);
                            let dist = (y as f32 - roll_y).abs();
                            let roll_f = if dist < beam_r { ((dist / beam_r) * std::f32::consts::FRAC_PI_2).cos() * 0.25 } else { 0.0 };
                            let beam = 0.5 - 0.5 * (((eff_y + 0.5) / period) * std::f32::consts::TAU).cos();
                            (1.0 - intensity * (1.0 - beam)) + roll_f
                        }
                        _ => {
                            let beam = 0.5 - 0.5 * (((eff_y + 0.5) / period) * std::f32::consts::TAU).cos();
                            let luma = (0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32) / 255.0;
                            let eff_beam = beam + (1.0 - beam) * (luma * 0.35);
                            1.0 - intensity * (1.0 - eff_beam)
                        }
                    };
                    p[0] = (p[0] as f32 * scan_gain).round().clamp(0.0, 255.0) as u8;
                    p[1] = (p[1] as f32 * scan_gain).round().clamp(0.0, 255.0) as u8;
                    p[2] = (p[2] as f32 * scan_gain).round().clamp(0.0, 255.0) as u8;
                }
            }
            true
        }
        "solarize" => {
            let thresh = eff.f32_param("threshold", 0.5).clamp(0.0, 1.0);
            let softness = eff.f32_param("softness", 0.1).clamp(0.0, 0.5);
            let per_channel = eff.bool_param("perChannel", false);
            let t0 = (thresh - softness).max(0.0);
            let t1 = (thresh + softness).min(1.0);
            let smooth = |v: f32| -> f32 {
                if softness <= 0.001 {
                    if v >= thresh { 1.0 } else { 0.0 }
                } else {
                    let t = ((v - t0) / (t1 - t0).max(0.0001)).clamp(0.0, 1.0);
                    t * t * (3.0 - 2.0 * t)
                }
            };
            for p in image.pixels_mut() {
                if per_channel {
                    for c in 0..3 {
                        let vn = p[c] as f32 / 255.0;
                        let f = smooth(vn);
                        p[c] = ((vn + ((1.0 - vn) - vn) * f) * 255.0).round().clamp(0.0, 255.0) as u8;
                    }
                } else {
                    let lm = (0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32) / 255.0;
                    let f = smooth(lm);
                    for c in 0..3 {
                        let v = p[c] as f32;
                        p[c] = (v + ((255.0 - v) - v) * f).round().clamp(0.0, 255.0) as u8;
                    }
                }
            }
            true
        }
        "posterize" => {
            let levels = eff.f32_param("levels", 4.0).round().clamp(2.0, 64.0);
            let gamma = eff.f32_param("gamma", 1.0).clamp(0.1, 5.0);
            let max_lvl = levels - 1.0;
            let mut lut = [0u8; 256];
            for i in 0..256 {
                let norm = i as f32 / 255.0;
                let g_val = norm.powf(gamma);
                let quant = (g_val * max_lvl).round() / max_lvl;
                lut[i] = (quant.powf(1.0 / gamma) * 255.0).round().clamp(0.0, 255.0) as u8;
            }
            for p in image.pixels_mut() {
                p[0] = lut[p[0] as usize];
                p[1] = lut[p[1] as usize];
                p[2] = lut[p[2] as usize];
            }
            true
        }
        "film_grain" => {
            let intensity = eff.f32_any(&["intensity", "amount"], 0.25).clamp(0.0, 1.0);
            if intensity <= 0.001 { return true; }
            let size = eff.u32_param("size", 1).clamp(1, 4);
            let chroma = eff.f32_any(&["channelIndependence", "channel_independence"], 0.3).clamp(0.0, 1.0);
            let sw = eff.f32_any(&["shadowWeight", "shadow_weight"], 0.7);
            let mw = eff.f32_any(&["midWeight", "mid_weight"], 1.0);
            let hw = eff.f32_any(&["highlightWeight", "highlight_weight"], 0.4);
            let temporal = eff.bool_param("temporal", true);
            let seed = if temporal { frame_idx.wrapping_mul(1973) ^ 0x1337 } else { 0x1337 };
            let max_amp = intensity * 128.0;
            for y in 0..h {
                let gy = y / size;
                for x in 0..w {
                    let gx = x / size;
                    let p = image.get_pixel_mut(x, y);
                    let lum = (0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32) / 255.0;
                    let resp = (4.0 * lum * (1.0 - lum) * mw + (1.0 - lum).powi(2) * sw + lum.powi(2) * hw).min(1.0);
                    let amp = max_amp * resp;
                    let base_n = hash_u32(gx.wrapping_mul(374761393) ^ gy.wrapping_mul(668265263) ^ seed) * 2.0 - 1.0;
                    for c in 0..3u32 {
                        let ch_n = hash_u32(gx.wrapping_mul(374761393) ^ gy.wrapping_mul(668265263) ^ seed.wrapping_add((c + 1) * 101)) * 2.0 - 1.0;
                        let n = (base_n * (1.0 - chroma) + ch_n * chroma) * amp;
                        p[c as usize] = (p[c as usize] as f32 + n).round().clamp(0.0, 255.0) as u8;
                    }
                }
            }
            true
        }
        "inverse_glow" => {
            let rad = eff.f32_param("radius", 3.0).clamp(1.0, 24.0) as usize;
            let intensity = eff.f32_param("intensity", 0.6);
            let n = wf * hf;
            let mut dr = vec![0.0f32; n];
            let mut dg = vec![0.0f32; n];
            let mut db = vec![0.0f32; n];
            for (i, p) in image.pixels().enumerate() {
                let luma = 0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32;
                if luma < 159.0 {
                    let wt = ((159.0 - luma) / 159.0).powf(1.25);
                    dr[i] = (255.0 - p[0] as f32) * wt;
                    dg[i] = (255.0 - p[1] as f32) * wt;
                    db[i] = (255.0 - p[2] as f32) * wt;
                }
            }
            let mut br = vec![0.0f32; n];
            let mut bg = vec![0.0f32; n];
            let mut bb = vec![0.0f32; n];
            let mut tmp = vec![0.0f32; n];
            fast_box_blur_f32(&dr, &mut br, &mut tmp, wf, hf, rad);
            fast_box_blur_f32(&dg, &mut bg, &mut tmp, wf, hf, rad);
            fast_box_blur_f32(&db, &mut bb, &mut tmp, wf, hf, rad);
            for (i, p) in image.pixels_mut().enumerate() {
                let sr = (br[i] * intensity).clamp(0.0, 255.0);
                let sg = (bg[i] * intensity).clamp(0.0, 255.0);
                let sb = (bb[i] * intensity).clamp(0.0, 255.0);
                p[0] = ((p[0] as f32 * (255.0 - sr)) / 255.0).round().clamp(0.0, 255.0) as u8;
                p[1] = ((p[1] as f32 * (255.0 - sg)) / 255.0).round().clamp(0.0, 255.0) as u8;
                p[2] = ((p[2] as f32 * (255.0 - sb)) / 255.0).round().clamp(0.0, 255.0) as u8;
            }
            true
        }
        "inverse_vignette" => {
            let rad = eff.f32_param("radius", 0.8);
            let softness = eff.f32_param("softness", 0.4);
            let cx = w as f32 * 0.5;
            let cy = h as f32 * 0.5;
            let max_d = cx.hypot(cy) * rad.max(0.1);
            let exp = 1.0 / (softness + 0.01);
            for y in 0..h {
                for x in 0..w {
                    let d = (x as f32 - cx).hypot(y as f32 - cy);
                    let p = image.get_pixel_mut(x, y);
                    if d >= max_d {
                        p[0] = 255; p[1] = 255; p[2] = 255;
                    } else {
                        let f = (d / max_d).powf(exp);
                        p[0] = (p[0] as f32 + (255.0 - p[0] as f32) * f).round().clamp(0.0, 255.0) as u8;
                        p[1] = (p[1] as f32 + (255.0 - p[1] as f32) * f).round().clamp(0.0, 255.0) as u8;
                        p[2] = (p[2] as f32 + (255.0 - p[2] as f32) * f).round().clamp(0.0, 255.0) as u8;
                    }
                }
            }
            true
        }
        "phosphor_mask" => {
            let mask_type = eff.str_param("maskType", "aperture_grille");
            let pitch = eff.u32_param("pitch", 2).clamp(1, 6);
            let intensity = eff.f32_param("intensity", 0.35);
            let rgb_bias = eff.f32_any(&["rgbBias", "rgb_bias"], 0.65);
            let vertical = eff.bool_param("vertical", true);
            let is_screen = eff.str_param("blendMode", "multiply") == "screen";
            let triad = pitch * 3;
            let dim = 1.0 - intensity * rgb_bias;
            let gap_dim = 1.0 - intensity;
            for y in 0..h {
                for x in 0..w {
                    let (u, v) = if vertical { (x, y) } else { (y, x) };
                    let stagger = if mask_type == "shadow_mask" {
                        ((v / pitch) % 2) * (triad / 2)
                    } else {
                        0
                    };
                    let sub = ((u + stagger) % triad) / pitch;
                    let mut gains = match sub {
                        0 => [1.0, dim, dim],
                        1 => [dim, 1.0, dim],
                        _ => [dim, dim, 1.0],
                    };
                    if (mask_type == "aperture_grille" && pitch >= 3 && v % 4 == 0)
                        || (mask_type == "shadow_mask" && u % pitch == 0 && v % pitch == 0)
                        || (mask_type == "slot_mask" && (v + ((u / pitch) % 2) * pitch) % (pitch * 3) == 0)
                    {
                        gains[0] *= gap_dim; gains[1] *= gap_dim; gains[2] *= gap_dim;
                    }
                    let p = image.get_pixel_mut(x, y);
                    for c in 0..3 {
                        if is_screen {
                            let inv = (255.0 - p[c] as f32) / 255.0;
                            p[c] = (255.0 - inv * (255.0 - (gains[c] - dim) * intensity * 255.0)).round().clamp(0.0, 255.0) as u8;
                        } else {
                            p[c] = (p[c] as f32 * gains[c]).round().clamp(0.0, 255.0) as u8;
                        }
                    }
                }
            }
            true
        }
        "convergence_error" => {
            let cx = eff.f32_any(&["centerX", "center_x"], 0.5) * w as f32;
            let cy = eff.f32_any(&["centerY", "center_y"], 0.5) * h as f32;
            let edge_px = eff.f32_any(&["edgePx", "edge_px"], 4.0);
            let exp = eff.f32_any(&["radialExponent", "radial_exponent"], 1.8);
            let rs = eff.f32_any(&["redScale", "red_scale"], 1.0);
            let gs = eff.f32_any(&["greenScale", "green_scale"], 0.0);
            let bs = eff.f32_any(&["blueScale", "blue_scale"], -1.0);
            let max_r = cx.max(w as f32 - cx).hypot(cy.max(h as f32 - cy)).max(1.0);
            let src = image.clone();
            for y in 0..h {
                for x in 0..w {
                    let dx = x as f32 - cx;
                    let dy = y as f32 - cy;
                    let dist = dx.hypot(dy);
                    if dist < 0.001 { continue; }
                    let factor = (dist / max_r).powf(exp) * edge_px;
                    let ux = dx / dist;
                    let uy = dy / dist;
                    let sample = |scale: f32, ch: usize| -> u8 {
                        let sx = (x as f32 + ux * factor * scale).round().clamp(0.0, w as f32 - 1.0) as u32;
                        let sy = (y as f32 + uy * factor * scale).round().clamp(0.0, h as f32 - 1.0) as u32;
                        src.get_pixel(sx, sy)[ch]
                    };
                    let orig_a = src.get_pixel(x, y)[3];
                    image.put_pixel(x, y, Rgba([sample(rs, 0), sample(gs, 1), sample(bs, 2), orig_a]));
                }
            }
            true
        }
        "scanline_jitter" => {
            let amp = eff.f32_param("amplitude", 4.0);
            let freq = eff.f32_param("frequency", 0.25);
            let banded = eff.str_param("mode", "per_row") == "banded";
            let band_h = eff.u32_param("bandHeight", 8).max(1);
            let temporal = eff.bool_param("temporal", true);
            let seed = if temporal { frame_idx.wrapping_mul(2879) ^ 0x4a9b } else { 0x4a9b };
            let src = image.clone();
            for y in 0..h {
                let blk = if banded { y / band_h } else { y };
                if hash_u32(blk.wrapping_mul(374761393) ^ seed) > freq { continue; }
                let shift = ((hash_u32((blk + 1009).wrapping_mul(668265263) ^ seed) * 2.0 - 1.0) * amp).round() as i32;
                if shift == 0 { continue; }
                for x in 0..w {
                    let sx = (x as i32 - shift).clamp(0, w as i32 - 1) as u32;
                    let sp = src.get_pixel(sx, y);
                    let dp = image.get_pixel_mut(x, y);
                    dp[0] = sp[0]; dp[1] = sp[1]; dp[2] = sp[2];
                }
            }
            true
        }
        "interlace_combing" => {
            let offset = eff.f32_any(&["fieldOffset", "field_offset"], 4.0);
            let odd_first = eff.str_param("fieldPolarity", "odd_first") == "odd_first";
            let temporal = eff.bool_param("temporal", true);
            let phase = if temporal && frame_idx % 2 == 1 { -1.0 } else { 1.0 };
            let shift = (offset * phase).round() as i32;
            if shift != 0 {
                let src = image.clone();
                for y in 0..h {
                    let is_odd = y % 2 == 1;
                    let l_shift = if is_odd == odd_first { shift } else { -shift };
                    for x in 0..w {
                        let sx = (x as i32 - l_shift).clamp(0, w as i32 - 1) as u32;
                        let sp = src.get_pixel(sx, y);
                        let dp = image.get_pixel_mut(x, y);
                        dp[0] = sp[0]; dp[1] = sp[1]; dp[2] = sp[2];
                    }
                }
            }
            true
        }
        "phosphor_bloom" | "halation" => {
            let is_halation = id == "halation";
            let threshold = eff.f32_param("threshold", if is_halation { 0.65 } else { 0.6 });
            let radius = eff.f32_param("radius", if is_halation { 10.0 } else { 8.0 }).clamp(1.0, 32.0);
            let intensity = eff.f32_param("intensity", if is_halation { 0.6 } else { 0.5 });
            let tint = eff.hex_param("tint", if is_halation { [255, 90, 60] } else { [160, 224, 255] });
            let ratio = eff.f32_any(&["wideNarrowRatio", "wide_narrow_ratio"], 0.4).clamp(0.0, 1.0);
            let n = wf * hf;
            let thresh255 = threshold * 255.0;
            let denom = (255.0 - thresh255).max(1.0);
            let mut plate = vec![0.0f32; n];
            for (i, p) in image.pixels().enumerate() {
                let lum = 0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32;
                if lum > thresh255 {
                    let ex = (lum - thresh255) / denom;
                    plate[i] = ex * ex;
                }
            }
            let mut narrow = vec![0.0f32; n];
            let mut wide = vec![0.0f32; n];
            let mut tmp = vec![0.0f32; n];
            let nr = (radius * if is_halation { 0.45 } else { 1.0 }).round().max(1.0) as usize;
            fast_box_blur_f32(&plate, &mut narrow, &mut tmp, wf, hf, nr);
            if is_halation {
                let wr = (radius * 1.5).round().max(2.0) as usize;
                fast_box_blur_f32(&plate, &mut wide, &mut tmp, wf, hf, wr);
            }
            let boost = intensity * if is_halation { 1.5 } else { 1.8 };
            for (i, p) in image.pixels_mut().enumerate() {
                let scatter = if is_halation {
                    (narrow[i] * (1.0 - ratio) + wide[i] * ratio) * boost
                } else {
                    narrow[i] * boost
                };
                if scatter > 0.0001 {
                    p[0] = (p[0] as f32 + scatter * tint[0] as f32).round().clamp(0.0, 255.0) as u8;
                    p[1] = (p[1] as f32 + scatter * tint[1] as f32).round().clamp(0.0, 255.0) as u8;
                    p[2] = (p[2] as f32 + scatter * tint[2] as f32).round().clamp(0.0, 255.0) as u8;
                }
            }
            true
        }
        "head_switching_noise" => {
            let noise_h = eff.u32_param("height", 10).clamp(1, h);
            let intensity = eff.f32_param("intensity", 0.85).clamp(0.0, 1.0);
            let jitter = eff.f32_any(&["lineJitter", "line_jitter"], 6.0);
            let start_y = h.saturating_sub(noise_h);
            let src = image.clone();
            for y in start_y..h {
                let prog = 1.0 - (h - 1 - y) as f32 / noise_h as f32;
                let r_seed = frame_idx.wrapping_mul(3571) ^ y.wrapping_mul(1013);
                let x_disp = ((hash_u32(r_seed) * 2.0 - 1.0) * jitter * prog * 2.0).round() as i32;
                for x in 0..w {
                    let sx = (x as i32 + x_disp).clamp(0, w as i32 - 1) as u32;
                    let sp = src.get_pixel(sx, y);
                    let dp = image.get_pixel_mut(x, y);
                    let n_val = hash_u32(x.wrapping_mul(374761393) ^ r_seed) * 255.0;
                    if n_val > 255.0 - intensity * 180.0 * prog {
                        let snow = if n_val > 128.0 { 250.0 } else { 10.0 };
                        dp[0] = (sp[0] as f32 * (1.0 - intensity) + snow * intensity).round() as u8;
                        dp[1] = (sp[1] as f32 * (1.0 - intensity) + snow * intensity).round() as u8;
                        dp[2] = (sp[2] as f32 * (1.0 - intensity) + snow * intensity).round() as u8;
                    } else {
                        dp[0] = sp[0]; dp[1] = sp[1]; dp[2] = sp[2];
                    }
                }
            }
            true
        }
        "vhs_tracking" => {
            let band_h = eff.f32_any(&["bandHeight", "band_height"], 36.0).clamp(4.0, h as f32);
            let scroll = eff.f32_any(&["scrollSpeed", "scroll_speed"], 1.5);
            let pos = eff.f32_any(&["bandPosition", "band_position"], 0.75);
            let shear = eff.f32_param("shear", 18.0);
            let smear = eff.f32_any(&["colorSmear", "color_smear"], 5.0).round() as i32;
            let temporal = eff.bool_param("temporal", true);
            let mut cy = pos * h as f32;
            if temporal {
                cy = (cy + frame_idx as f32 * scroll * 2.0).rem_euclid(h as f32);
            }
            let half_b = band_h * 0.5;
            let src = image.clone();
            for y in 0..h {
                let mut dy = (y as f32 - cy).abs();
                if dy > h as f32 * 0.5 { dy = h as f32 - dy; }
                if dy > half_b { continue; }
                let strength = 1.0 - (dy / half_b).powi(2);
                let shift = (strength * shear).round() as i32;
                for x in 0..w {
                    let xd = (x as i32 - shift).clamp(0, w as i32 - 1);
                    let xr = (xd - smear).clamp(0, w as i32 - 1) as u32;
                    let xb = (xd + smear).clamp(0, w as i32 - 1) as u32;
                    let dp = image.get_pixel_mut(x, y);
                    dp[0] = src.get_pixel(xr, y)[0];
                    dp[1] = src.get_pixel(xd as u32, y)[1];
                    dp[2] = src.get_pixel(xb, y)[2];
                }
            }
            true
        }
        "gradient_map" => {
            let preset = eff.str_param("preset", "gameboy_dmg");
            let space = eff.str_param("space", "oklab");
            let mix = eff.f32_param("mix", 1.0).clamp(0.0, 1.0);
            let stops: Vec<(f32, [u8; 3])> = match preset {
                "amber_crt" => vec![(0.0, [10, 4, 0]), (0.35, [102, 36, 0]), (0.7, [204, 102, 0]), (1.0, [255, 176, 0])],
                "cyanotype" => vec![(0.0, [5, 16, 38]), (0.35, [14, 42, 92]), (0.7, [41, 98, 155]), (1.0, [220, 234, 245])],
                "risograph_2ink" | "riso_2ink" => vec![(0.0, [26, 16, 47]), (0.35, [178, 34, 52]), (0.75, [255, 205, 0]), (1.0, [253, 240, 213])],
                "sepia" => vec![(0.0, [28, 18, 12]), (0.4, [97, 65, 38]), (0.75, [168, 132, 97]), (1.0, [237, 220, 196])],
                _ => vec![(0.0, [15, 56, 15]), (0.33, [48, 98, 48]), (0.66, [139, 172, 15]), (1.0, [155, 188, 15])],
            };
            let mut lut = [[0u8; 3]; 256];
            for i in 0..256 {
                let t = i as f32 / 255.0;
                let mut idx = 0;
                while idx + 1 < stops.len() && stops[idx + 1].0 < t { idx += 1; }
                let (p0, c0) = stops[idx];
                let (p1, c1) = stops[(idx + 1).min(stops.len() - 1)];
                let f = ((t - p0) / (p1 - p0).max(0.0001)).clamp(0.0, 1.0);
                lut[i] = if space == "oklab" {
                    let k0 = rgb_to_oklab(c0[0], c0[1], c0[2]);
                    let k1 = rgb_to_oklab(c1[0], c1[1], c1[2]);
                    oklab_to_rgb(k0[0] + (k1[0] - k0[0]) * f, k0[1] + (k1[1] - k0[1]) * f, k0[2] + (k1[2] - k0[2]) * f)
                } else {
                    [
                        (c0[0] as f32 + (c1[0] as f32 - c0[0] as f32) * f).round() as u8,
                        (c0[1] as f32 + (c1[1] as f32 - c0[1] as f32) * f).round() as u8,
                        (c0[2] as f32 + (c1[2] as f32 - c0[2] as f32) * f).round() as u8,
                    ]
                };
            }
            for p in image.pixels_mut() {
                let lum = (0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32).round().clamp(0.0, 255.0) as usize;
                let m = lut[lum];
                for c in 0..3 {
                    p[c] = (p[c] as f32 * (1.0 - mix) + m[c] as f32 * mix).round() as u8;
                }
            }
            true
        }
        "dust_scratches" => {
            let density = eff.f32_param("density", 0.2);
            let scratch_prob = eff.f32_any(&["scratchProbability", "scratch_probability"], 0.3);
            let seed = frame_idx.wrapping_mul(7919).wrapping_add(1337);
            let count = ((w * h) as f32 / 1200.0 * density).round() as u32;
            for i in 0..count {
                let cx = (hash_u32(seed ^ (i * 31)) * w as f32) as u32;
                let cy = (hash_u32(seed ^ (i * 73 + 11)) * h as f32) as u32;
                let val = if hash_u32(seed ^ (i * 127)) > 0.45 { 245u8 } else { 15u8 };
                if cx < w && cy < h {
                    let p = image.get_pixel_mut(cx, cy);
                    p[0] = val; p[1] = val; p[2] = val;
                }
            }
            if hash_u32(seed ^ 0x55aa) < scratch_prob {
                let sx = (hash_u32(seed ^ 0x1234) * w as f32).min(w as f32 - 1.0) as u32;
                for y in 0..h {
                    let p = image.get_pixel_mut(sx, y);
                    p[0] = 235; p[1] = 235; p[2] = 235;
                }
            }
            true
        }
        "light_leaks" => {
            let dir = eff.str_param("direction", "top_left");
            let radius = eff.f32_param("radius", 0.8);
            let intensity = eff.f32_param("intensity", 0.65);
            let t1 = eff.hex_param("tint", [255, 136, 68]);
            let t2 = eff.hex_param("secondaryTint", [255, 51, 102]);
            let (ox, oy) = match dir {
                "top_right" => (w as f32, 0.0),
                "bottom_left" => (0.0, h as f32),
                "bottom_right" => (w as f32, h as f32),
                _ => (0.0, 0.0),
            };
            let max_d = (w as f32).hypot(h as f32) * radius.max(0.05);
            for y in 0..h {
                for x in 0..w {
                    let d = (x as f32 - ox).hypot(y as f32 - oy);
                    if d >= max_d { continue; }
                    let nd = d / max_d;
                    let falloff = (1.0 - nd).powf(1.8) * intensity;
                    let core = (1.0 - nd * 2.0).max(0.0);
                    let p = image.get_pixel_mut(x, y);
                    for c in 0..3 {
                        let lk = (t2[c] as f32 * core + t1[c] as f32 * (1.0 - core)) * falloff;
                        p[c] = (255.0 - ((255.0 - p[c] as f32) * (255.0 - lk).max(0.0)) / 255.0).round().clamp(0.0, 255.0) as u8;
                    }
                }
            }
            true
        }
        "gate_weave" => {
            let amp = eff.f32_param("amplitude", 1.5);
            let freq = eff.f32_param("frequency", 0.8);
            let t = frame_idx as f32 * freq;
            let sx = (t * 1.414).sin() * amp;
            let sy = t.cos() * amp;
            let src = image.clone();
            for y in 0..h {
                for x in 0..w {
                    let px = (x as f32 - sx).round().clamp(0.0, w as f32 - 1.0) as u32;
                    let py = (y as f32 - sy).round().clamp(0.0, h as f32 - 1.0) as u32;
                    let sp = src.get_pixel(px, py);
                    let dp = image.get_pixel_mut(x, y);
                    dp[0] = sp[0]; dp[1] = sp[1]; dp[2] = sp[2];
                }
            }
            true
        }
        "exposure_flicker" => {
            let amp = eff.f32_param("amplitude", 0.12);
            let delta = (hash_u32(frame_idx.wrapping_mul(17) ^ 0x45d9f3b) * 2.0 - 1.0) * amp;
            let mult = 1.0 + delta;
            for p in image.pixels_mut() {
                p[0] = (p[0] as f32 * mult).round().clamp(0.0, 255.0) as u8;
                p[1] = (p[1] as f32 * mult).round().clamp(0.0, 255.0) as u8;
                p[2] = (p[2] as f32 * mult).round().clamp(0.0, 255.0) as u8;
            }
            true
        }
        "lens_ghost" => {
            let sx = eff.f32_any(&["sourceX", "source_x"], 0.8) * w as f32;
            let sy = eff.f32_any(&["sourceY", "source_y"], 0.2) * h as f32;
            let count = eff.u32_param("ghostCount", 4).clamp(2, 8);
            let intensity = eff.f32_param("intensity", 0.5);
            let tint = eff.hex_param("tint", [164, 216, 255]);
            let cx = w as f32 * 0.5;
            let cy = h as f32 * 0.5;
            let vx = cx - sx;
            let vy = cy - sy;
            for i in 0..count {
                let t = (i + 1) as f32 / (count as f32 + 0.5) * 2.2 - 0.4;
                let gx = cx + vx * t;
                let gy = cy + vy * t;
                let rad = (20.0 + (i % 3) as f32 * 25.0) * (1.0 + t.abs() * 0.5);
                for y in (gy - rad).max(0.0) as u32..=(gy + rad).min(h as f32 - 1.0) as u32 {
                    for x in (gx - rad).max(0.0) as u32..=(gx + rad).min(w as f32 - 1.0) as u32 {
                        let d = (x as f32 - gx).hypot(y as f32 - gy);
                        if d < rad {
                            let f = ((1.0 - d / rad) * intensity * 0.4).max(0.0);
                            let p = image.get_pixel_mut(x, y);
                            p[0] = (p[0] as f32 + tint[0] as f32 * f).round().clamp(0.0, 255.0) as u8;
                            p[1] = (p[1] as f32 + tint[1] as f32 * f).round().clamp(0.0, 255.0) as u8;
                            p[2] = (p[2] as f32 + tint[2] as f32 * f).round().clamp(0.0, 255.0) as u8;
                        }
                    }
                }
            }
            true
        }
        "lens_aberration" => {
            let mode = eff.str_param("mode", "uniform");
            let ox = eff.f32_any(&["offsetX", "offset_x"], 4.0);
            let oy = eff.f32_any(&["offsetY", "offset_y"], 0.0);
            let strength = eff.f32_param("intensity", 6.0);
            if mode == "uniform" {
                apply_chromatic_aberration(image, ox, oy);
            } else {
                apply_rgb_split_radial(image, strength, 0.5, 0.5);
            }
            true
        }
        "risograph_misregistration" => {
            let ox1 = eff.i32_param("offsetX1", -3);
            let oy1 = eff.i32_param("offsetY1", -2);
            let ox2 = eff.i32_param("offsetX2", 4);
            let oy2 = eff.i32_param("offsetY2", 3);
            let ink1 = eff.hex_param("inkColor1", [255, 72, 176]);
            let ink2 = eff.hex_param("inkColor2", [0, 120, 191]);
            let paper = eff.hex_param("paperColor", [251, 249, 244]);
            let src = image.clone();
            for y in 0..h {
                for x in 0..w {
                    let s1 = src.get_pixel((x as i32 - ox1).clamp(0, w as i32 - 1) as u32, (y as i32 - oy1).clamp(0, h as i32 - 1) as u32);
                    let s2 = src.get_pixel((x as i32 - ox2).clamp(0, w as i32 - 1) as u32, (y as i32 - oy2).clamp(0, h as i32 - 1) as u32);
                    let d1 = 1.0 - (0.3 * s1[0] as f32 + 0.7 * s1[1] as f32) / 255.0;
                    let d2 = 1.0 - (0.7 * s2[0] as f32 + 0.3 * s2[2] as f32) / 255.0;
                    let p = image.get_pixel_mut(x, y);
                    for c in 0..3 {
                        let p1 = 255.0 - d1 * (255.0 - ink1[c] as f32);
                        let p2 = 255.0 - d2 * (255.0 - ink2[c] as f32);
                        let m1 = (paper[c] as f32 * p1) / 255.0;
                        p[c] = ((m1 * p2) / 255.0).round().clamp(0.0, 255.0) as u8;
                    }
                }
            }
            true
        }
        "photocopy_degradation" => {
            let contrast = eff.f32_param("contrast", 2.2).clamp(1.0, 5.0);
            let speckle = eff.f32_any(&["speckleDensity", "speckle_density"], 0.25);
            let edge_dark = eff.f32_any(&["edgeDarkening", "edge_darkening"], 0.35);
            for y in 0..h {
                let ny = y as f32 / h as f32;
                let ed_y = ny.min(1.0 - ny) * 2.0;
                for x in 0..w {
                    let nx = x as f32 / w as f32;
                    let ed_x = nx.min(1.0 - nx) * 2.0;
                    let p = image.get_pixel_mut(x, y);
                    let mut luma = (0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32) / 255.0;
                    luma = luma.powf(contrast);
                    let edge_f = 1.0 - (1.0 - ed_x.min(ed_y)).powi(4) * edge_dark;
                    luma *= edge_f;
                    let r = hash_u32(x.wrapping_mul(374761393) ^ y.wrapping_mul(668265263));
                    if r < 0.02 * speckle { luma = 0.0; }
                    let v = (luma * 255.0).round().clamp(0.0, 255.0) as u8;
                    p[0] = v; p[1] = v; p[2] = v;
                }
            }
            true
        }
        "paper_texture" => {
            let contrast = eff.f32_param("contrast", 0.35);
            let tint = eff.hex_param("tint", [244, 237, 225]);
            for y in 0..h {
                for x in 0..w {
                    let n = (hash_u32(x.wrapping_mul(1973) ^ y.wrapping_mul(9277)) - 0.5) * contrast;
                    let p = image.get_pixel_mut(x, y);
                    for c in 0..3 {
                        let paper_c = (tint[c] as f32 * (1.0 + n)).clamp(0.0, 255.0);
                        p[c] = ((p[c] as f32 * paper_c) / 255.0).round().clamp(0.0, 255.0) as u8;
                    }
                }
            }
            true
        }
        "rosette_angles" => {
            let dot_size = eff.f32_any(&["dotSize", "dot_size"], 8.0).clamp(3.0, 24.0);
            apply_halftone(image, dot_size, eff.f32_param("angleK", 45.0), "circle");
            true
        }
        "split_toning" => {
            let sc = eff.hex_param("shadowColor", [112, 48, 16]);
            let ss = eff.f32_any(&["shadowStrength", "shadow_strength"], 0.5);
            let hc = eff.hex_param("highlightColor", [16, 80, 112]);
            let hs = eff.f32_any(&["highlightStrength", "highlight_strength"], 0.5);
            for p in image.pixels_mut() {
                let luma = (0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32) / 255.0;
                let sw = (1.0 - luma).powi(2) * ss * 0.8;
                let hw = luma.powi(2) * hs * 0.8;
                for c in 0..3 {
                    let mut v = p[c] as f32;
                    v += (sc[c] as f32 - v) * sw;
                    v += (hc[c] as f32 - v) * hw;
                    p[c] = v.round().clamp(0.0, 255.0) as u8;
                }
            }
            true
        }
        "film_fade" => {
            let black_lift = eff.f32_any(&["blackLift", "lift"], 22.0);
            let lift = if black_lift <= 1.0 { black_lift * 255.0 } else { black_lift };
            let roll = eff.f32_param("highlightRoll", 18.0);
            let max_out = (255.0 - roll).max(lift + 1.0);
            for p in image.pixels_mut() {
                for c in 0..3 {
                    p[c] = (lift + (p[c] as f32 / 255.0) * (max_out - lift)).round().clamp(0.0, 255.0) as u8;
                }
            }
            true
        }
        "outline_overlay" => {
            let thresh = eff.f32_param("threshold", 0.2) * 1020.0;
            let color = eff.hex_param("color", [0, 0, 0]);
            let op = eff.f32_param("opacity", 0.85);
            let src = image.clone();
            for y in 1..h.saturating_sub(1) {
                for x in 1..w.saturating_sub(1) {
                    let luma = |px: u32, py: u32| -> f32 {
                        let p = src.get_pixel(px, py);
                        0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32
                    };
                    let gx = -luma(x - 1, y - 1) + luma(x + 1, y - 1) - 2.0 * luma(x - 1, y) + 2.0 * luma(x + 1, y) - luma(x - 1, y + 1) + luma(x + 1, y + 1);
                    let gy = -luma(x - 1, y - 1) - 2.0 * luma(x, y - 1) - luma(x + 1, y - 1) + luma(x - 1, y + 1) + 2.0 * luma(x, y + 1) + luma(x + 1, y + 1);
                    if gx.abs() + gy.abs() >= thresh {
                        let p = image.get_pixel_mut(x, y);
                        for c in 0..3 {
                            p[c] = (p[c] as f32 * (1.0 - op) + color[c] as f32 * op).round().clamp(0.0, 255.0) as u8;
                        }
                    }
                }
            }
            true
        }
        "blueprint_cyanotype" => {
            let tint = eff.hex_param("tint", [10, 47, 100]);
            let grid_color = eff.hex_param("gridColor", [63, 169, 245]);
            let grid_size = eff.u32_param("gridSize", 24).clamp(6, 128);
            let grid_op = eff.f32_param("gridOpacity", 0.35);
            let invert = eff.bool_param("invert", true);
            for y in 0..h {
                for x in 0..w {
                    let p = image.get_pixel_mut(x, y);
                    let mut lum = (0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32) / 255.0;
                    if invert { lum = 1.0 - lum; }
                    let mut rgb = [
                        (tint[0] as f32 + (232.0 - tint[0] as f32) * lum),
                        (tint[1] as f32 + (244.0 - tint[1] as f32) * lum),
                        (tint[2] as f32 + (252.0 - tint[2] as f32) * lum),
                    ];
                    if grid_op > 0.0 && (x % grid_size == 0 || y % grid_size == 0) {
                        for c in 0..3 {
                            rgb[c] += (grid_color[c] as f32 - rgb[c]) * grid_op;
                        }
                    }
                    p[0] = rgb[0].round().clamp(0.0, 255.0) as u8;
                    p[1] = rgb[1].round().clamp(0.0, 255.0) as u8;
                    p[2] = rgb[2].round().clamp(0.0, 255.0) as u8;
                }
            }
            true
        }
        "bit_crush" => {
            let bits = eff.f32_any(&["bits", "depth"], 3.0).round().clamp(1.0, 8.0) as u32;
            let sample_rate = eff.u32_param("sampleRate", 2).clamp(1, 16);
            let step = 255.0 / ((1u32 << bits) - 1) as f32;
            if sample_rate == 1 {
                for p in image.pixels_mut() {
                    for c in 0..3 {
                        p[c] = ((p[c] as f32 / step).round() * step).clamp(0.0, 255.0) as u8;
                    }
                }
            } else {
                let src = image.clone();
                for y in 0..h {
                    let sy = (y / sample_rate) * sample_rate;
                    for x in 0..w {
                        let sx = (x / sample_rate) * sample_rate;
                        let sp = src.get_pixel(sx.min(w - 1), sy.min(h - 1));
                        let dp = image.get_pixel_mut(x, y);
                        for c in 0..3 {
                            dp[c] = ((sp[c] as f32 / step).round() * step).clamp(0.0, 255.0) as u8;
                        }
                    }
                }
            }
            true
        }
        "block_displacement" => {
            let bs = eff.u32_param("blockSize", 16).clamp(4, 128);
            let mag = eff.f32_param("magnitude", 24.0);
            let prob = eff.f32_param("probability", 0.15);
            let seed = frame_idx.wrapping_mul(997).wrapping_add(101);
            let src = image.clone();
            for by in (0..h).step_by(bs as usize) {
                for bx in (0..w).step_by(bs as usize) {
                    let h_val = hash_u32(bx.wrapping_mul(374761393) ^ by.wrapping_mul(668265263) ^ seed);
                    if h_val >= prob { continue; }
                    let dx = ((hash_u32(bx ^ seed.wrapping_add(1)) * 2.0 - 1.0) * mag).round() as i32;
                    let dy = ((hash_u32(by ^ seed.wrapping_add(2)) * 2.0 - 1.0) * mag).round() as i32;
                    for y in by..(by + bs).min(h) {
                        for x in bx..(bx + bs).min(w) {
                            let sx = (x as i32 + dx).clamp(0, w as i32 - 1) as u32;
                            let sy = (y as i32 + dy).clamp(0, h as i32 - 1) as u32;
                            let sp = src.get_pixel(sx, sy);
                            let dp = image.get_pixel_mut(x, y);
                            dp[0] = sp[0]; dp[1] = sp[1]; dp[2] = sp[2];
                        }
                    }
                }
            }
            true
        }
        "frame_echo" => {
            let decay = eff.f32_param("decay", 0.65).clamp(0.05, 0.95);
            apply_phosphor_persistence(image, decay, "right");
            true
        }
        _ => false,
    }
}

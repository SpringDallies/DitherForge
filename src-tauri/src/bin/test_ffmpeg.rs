use std::process::Command;

#[path = "../algorithms/mod.rs"]
mod algorithms;
#[path = "../effects.rs"]
mod effects;
#[path = "../engine.rs"]
mod engine;
#[path = "../palette.rs"]
mod palette;
#[path = "../ffmpeg.rs"]
mod ffmpeg;

// Replicate BinaryProcessHeader and execute_binary_frame from main.rs for standalone test binary
use algorithms::{apply_algorithm_raw_params, RawAlgorithmParams};
use effects::apply_effect_stack_raw;

#[derive(serde::Deserialize, serde::Serialize, Debug, Clone)]
pub struct BinaryProcessHeader {
    pub width: u32,
    pub height: u32,
    #[serde(default, alias = "algorithmId")]
    pub algorithm: String,
    pub palette: Vec<[u8; 4]>,
    #[serde(default)]
    pub threshold: Option<f32>,
    #[serde(default)]
    pub scale: Option<f32>,
    #[serde(default, alias = "diffusionStrength")]
    pub diffusion_strength: Option<f32>,
    #[serde(default)]
    pub serpentine: Option<bool>,
    #[serde(default, alias = "temporalSeed")]
    pub temporal_seed: Option<u32>,
    #[serde(default, alias = "luminanceThreshold")]
    pub luminance_threshold: Option<f32>,
    #[serde(default)]
    pub brightness: Option<f32>,
    #[serde(default)]
    pub contrast: Option<f32>,
    #[serde(default)]
    pub saturation: Option<f32>,
    #[serde(default)]
    pub gamma: Option<f32>,
    #[serde(default)]
    pub hue: Option<f32>,
    #[serde(default, alias = "temporalPattern")]
    pub temporal_pattern: Option<String>,
    #[serde(default, alias = "temporalIntensity")]
    pub temporal_intensity: Option<f32>,
    #[serde(default, alias = "temporalSpeed")]
    pub temporal_speed: Option<f32>,
    #[serde(default)]
    pub depth: Option<u8>,
    #[serde(default, alias = "noiseAmount")]
    pub noise_amount: Option<f32>,
    #[serde(default, alias = "matrixSize")]
    pub matrix_size: Option<serde_json::Value>,
    #[serde(default, alias = "warpIntensity")]
    pub warp_intensity: Option<f32>,
    #[serde(default, alias = "dotSize")]
    pub dot_size: Option<f32>,
    #[serde(default, alias = "blockSize")]
    pub block_size: Option<f32>,
    #[serde(default)]
    pub cracked: Option<f32>,
    #[serde(default, alias = "distributionSpread")]
    pub distribution_spread: Option<f32>,
    #[serde(default, alias = "twistStrength")]
    pub twist_strength: Option<f32>,
    #[serde(default, alias = "spiralFrequency")]
    pub spiral_frequency: Option<f32>,
    #[serde(default, alias = "lineScale")]
    pub line_scale: Option<f32>,
    #[serde(default, alias = "bleedFraction")]
    pub bleed: Option<f32>,
    #[serde(default, alias = "smoothingFactor")]
    pub smoothing: Option<f32>,
    #[serde(default, alias = "lineSpacing")]
    pub line_spacing: Option<f32>,
    #[serde(default, alias = "lineDensity")]
    pub line_density: Option<f32>,
    #[serde(default, alias = "lineAngle")]
    pub line_angle: Option<f32>,
    #[serde(default)]
    pub dotting: Option<f32>,
    #[serde(default, alias = "lineEmphasis")]
    pub line_emphasis: Option<f32>,
    #[serde(default, alias = "lineCount")]
    pub line_count: Option<f32>,
    #[serde(default, alias = "modulationStrength")]
    pub modulation_strength: Option<f32>,
    #[serde(default, alias = "horizontalBias")]
    pub horizontal_bias: Option<f32>,
    #[serde(default, alias = "glitchIntensity")]
    pub glitch_intensity: Option<f32>,
    #[serde(default)]
    pub frequency: Option<f32>,
    #[serde(default)]
    pub amplitude: Option<f32>,
    #[serde(default, alias = "waveFrequency")]
    pub wave_frequency: Option<f32>,
    #[serde(default, alias = "waveDensity")]
    pub wave_density: Option<f32>,
    #[serde(default, alias = "waveThreshold")]
    pub wave_threshold: Option<f32>,
    #[serde(default, alias = "modulationFrequency")]
    pub modulation_frequency: Option<f32>,
    #[serde(default, alias = "modulationBlend")]
    pub modulation_blend: Option<f32>,
    #[serde(default, alias = "freqA")]
    pub freq_a: Option<f32>,
    #[serde(default, alias = "freqB")]
    pub freq_b: Option<f32>,
    #[serde(default)]
    pub angle: Option<f32>,
    #[serde(default)]
    pub swirl: Option<f32>,
    #[serde(default, alias = "cellSize")]
    pub cell_size: Option<f32>,
    #[serde(default, alias = "edgeSensitivity")]
    pub edge_sensitivity: Option<f32>,
    #[serde(default, alias = "checkersSize")]
    pub checkers_size: Option<f32>,
    #[serde(default)]
    pub period: Option<f32>,
    #[serde(default, alias = "dotScale")]
    pub dot_scale: Option<f32>,
    #[serde(default, alias = "dotDensity")]
    pub dot_density: Option<f32>,
    #[serde(default)]
    pub density: Option<f32>,
    #[serde(default)]
    pub variation: Option<f32>,
    #[serde(default)]
    pub divisor: Option<f32>,
    #[serde(default, alias = "peakThreshold")]
    pub peak_threshold: Option<f32>,
    #[serde(default, alias = "minPeakDistance")]
    pub min_peak_distance: Option<f32>,
    #[serde(default, alias = "maxPeaks")]
    pub max_peaks: Option<f32>,
    #[serde(default)]
    pub interference: Option<bool>,
    #[serde(default, alias = "contourThreshold")]
    pub contour_threshold: Option<f32>,
    #[serde(default, alias = "lineMode")]
    pub line_mode: Option<String>,
    #[serde(default, alias = "triangleType")]
    pub triangle_type: Option<String>,
    #[serde(default)]
    pub vertical: Option<bool>,
    #[serde(default, alias = "orbCount")]
    pub orb_count: Option<f32>,
    #[serde(default, alias = "orbSize")]
    pub orb_size: Option<f32>,
    #[serde(default, alias = "orbIntensity")]
    pub orb_intensity: Option<f32>,
    #[serde(default, alias = "orbRandom")]
    pub orb_random: Option<f32>,
    #[serde(default, alias = "orbOffset")]
    pub orb_offset: Option<f32>,
    #[serde(default, alias = "orbVertical")]
    pub orb_vertical: Option<bool>,
    #[serde(default, alias = "effectStack")]
    pub effect_stack: Vec<effects::PostEffect>,
}

pub fn rotate_hue_hsv_buffer(data: &mut [u8], deg: f32) {
    let norm_deg = deg.rem_euclid(360.0);
    if norm_deg <= 0.001 || (360.0 - norm_deg) <= 0.001 {
        return;
    }
    let inv60 = 1.0 / 60.0;
    for chunk in data.chunks_exact_mut(4) {
        let r = chunk[0];
        let g = chunk[1];
        let b = chunk[2];
        if r == g && g == b {
            continue;
        }
        let max = r.max(g).max(b);
        let min = r.min(g).min(b);
        let delta = (max - min) as f32;
        if delta == 0.0 {
            continue;
        }
        let rf = r as f32;
        let gf = g as f32;
        let bf = b as f32;
        let mut h = if max == r {
            ((gf - bf) / delta + if g < b { 6.0 } else { 0.0 }) * 60.0
        } else if max == g {
            ((bf - rf) / delta + 2.0) * 60.0
        } else {
            ((rf - gf) / delta + 4.0) * 60.0
        };
        h = (h + norm_deg) % 360.0;
        let sector = (h * inv60) as i32;
        let f = h * inv60 - sector as f32;
        let p = min;
        let q = (max as f32 - delta * f).round().clamp(0.0, 255.0) as u8;
        let t = (min as f32 + delta * f).round().clamp(0.0, 255.0) as u8;
        match sector {
            0 => { chunk[0] = max; chunk[1] = t; chunk[2] = p; }
            1 => { chunk[0] = q; chunk[1] = max; chunk[2] = p; }
            2 => { chunk[0] = p; chunk[1] = max; chunk[2] = t; }
            3 => { chunk[0] = p; chunk[1] = q; chunk[2] = max; }
            4 => { chunk[0] = t; chunk[1] = p; chunk[2] = max; }
            _ => { chunk[0] = max; chunk[1] = p; chunk[2] = q; }
        }
    }
}

pub fn apply_raw_pre_adjustments(
    data: &mut [u8],
    brightness: f32,
    contrast: f32,
    saturation: f32,
    gamma: f32,
    hue: f32,
) {
    let has_tone = brightness != 0.0 || contrast != 0.0 || saturation != 0.0 || (gamma - 1.0).abs() > 0.001;
    if has_tone {
        let b_offset = brightness * 128.0;
        let c_factor = if contrast >= 0.0 { 1.0 + contrast * 2.0 } else { 1.0 + contrast * 0.8 };
        let s_factor = 1.0 + saturation;
        let inv_gamma = 1.0 / gamma.max(0.01);

        if saturation == 0.0 {
            let mut tone_lut = [0u8; 256];
            for v in 0..256 {
                let mut val = (v as f32 - 128.0) * c_factor + 128.0 + b_offset;
                val = val.clamp(0.0, 255.0);
                if (inv_gamma - 1.0).abs() > 0.001 {
                    val = 255.0 * (val / 255.0).powf(inv_gamma);
                }
                tone_lut[v] = val.round().clamp(0.0, 255.0) as u8;
            }
            for chunk in data.chunks_exact_mut(4) {
                chunk[0] = tone_lut[chunk[0] as usize];
                chunk[1] = tone_lut[chunk[1] as usize];
                chunk[2] = tone_lut[chunk[2] as usize];
            }
        } else {
            for chunk in data.chunks_exact_mut(4) {
                let mut r = (chunk[0] as f32 - 128.0) * c_factor + 128.0 + b_offset;
                let mut g = (chunk[1] as f32 - 128.0) * c_factor + 128.0 + b_offset;
                let mut b = (chunk[2] as f32 - 128.0) * c_factor + 128.0 + b_offset;
                let luma = 0.299 * r + 0.587 * g + 0.114 * b;
                r = luma + (r - luma) * s_factor;
                g = luma + (g - luma) * s_factor;
                b = luma + (b - luma) * s_factor;
                r = r.clamp(0.0, 255.0);
                g = g.clamp(0.0, 255.0);
                b = b.clamp(0.0, 255.0);
                if (inv_gamma - 1.0).abs() > 0.001 {
                    r = 255.0 * (r / 255.0).powf(inv_gamma);
                    g = 255.0 * (g / 255.0).powf(inv_gamma);
                    b = 255.0 * (b / 255.0).powf(inv_gamma);
                }
                chunk[0] = r.round().clamp(0.0, 255.0) as u8;
                chunk[1] = g.round().clamp(0.0, 255.0) as u8;
                chunk[2] = b.round().clamp(0.0, 255.0) as u8;
            }
        }
    }
    if hue.abs() > 0.001 {
        rotate_hue_hsv_buffer(data, hue);
    }
}

pub fn execute_binary_frame(header: &BinaryProcessHeader, pixel_data: &[u8]) -> Result<Vec<u8>, String> {
    let expected_pixel_bytes = (header.width as usize) * (header.height as usize) * 4;
    let mut out_bytes = vec![0u8; expected_pixel_bytes];
    let raw_params = RawAlgorithmParams {
        threshold: header.threshold.unwrap_or(0.5),
        scale: header.scale.unwrap_or(1.0),
        diffusion_strength: header.diffusion_strength.unwrap_or(1.0),
        serpentine: header.serpentine,
        temporal_seed: header.temporal_seed.unwrap_or(0),
        ..Default::default()
    };

    let mut b = header.brightness.unwrap_or(0.0);
    if b.abs() > 1.0 { b /= 100.0; }
    let mut c = header.contrast.unwrap_or(0.0);
    if c.abs() > 1.0 { c /= 100.0; }
    let mut s = header.saturation.unwrap_or(0.0);
    if s.abs() > 1.0 { s /= 100.0; }
    let g = header.gamma.unwrap_or(1.0);
    let hue = header.hue.unwrap_or(0.0);

    let mut working = pixel_data.to_vec();
    apply_raw_pre_adjustments(&mut working, b, c, s, g, hue);

    apply_algorithm_raw_params(
        header.width,
        header.height,
        &working,
        &mut out_bytes,
        &header.algorithm,
        &header.palette,
        &raw_params,
    )?;

    if !header.effect_stack.is_empty() {
        apply_effect_stack_raw(header.width, header.height, &mut out_bytes, &header.effect_stack);
    }

    Ok(out_bytes)
}

fn main() {
    println!("==================================================================");
    println!("       DITHERFORGE FFMPEG NATIVE BACKEND VERIFICATION SUITE       ");
    println!("==================================================================");

    // 1. Status and Detection
    println!("\n[1] FFMPEG SYSTEM DETECTION");
    let status = ffmpeg::get_ffmpeg_status();
    println!("  ffmpeg_available: {}", status.ffmpeg_available);
    println!("  ffprobe_available: {}", status.ffprobe_available);
    println!("  version: {:?}", status.version);
    println!("  ffmpeg_path: {:?}", status.ffmpeg_path);
    println!("  ffprobe_path: {:?}", status.ffprobe_path);
    println!("  package_manager: {:?}", status.package_manager);
    println!("  install_command: {:?}", status.install_command);
    println!("  terminal_available: {:?}", status.terminal_available);

    assert!(status.ffmpeg_available, "FFmpeg should be detected on this host");
    assert!(status.ffprobe_available, "ffprobe should be detected on this host");
    println!("  ✅ [PASS] Detection successfully located FFmpeg and ffprobe.");

    // 2. Generate a 1-second sample video with audio for testing
    let sample_video = "/tmp/df_test_input.mp4";
    println!("\n[2] GENERATING CONTROLLED TEST MEDIA: {}", sample_video);
    let gen_status = Command::new("ffmpeg")
        .args([
            "-y",
            "-f", "lavfi", "-i", "testsrc=duration=1:size=320x240:rate=30",
            "-f", "lavfi", "-i", "sine=frequency=1000:duration=1",
            "-c:v", "libx264", "-c:a", "aac",
            sample_video
        ])
        .output()
        .expect("Failed to create sample video with ffmpeg");
    assert!(gen_status.status.success(), "Sample video generation failed");

    // 3. Probe Video
    println!("\n[3] PROBE TEST MEDIA WITH ffprobe");
    let probe_info = ffmpeg::probe_video(sample_video).expect("Failed to probe sample video");
    println!("  Dimensions: {}x{}", probe_info.width, probe_info.height);
    println!("  FPS: {}", probe_info.fps);
    println!("  Duration: {:.2}s", probe_info.duration);
    println!("  Total frames: {}", probe_info.total_frames);
    println!("  Has audio: {}", probe_info.has_audio);
    println!("  Video codec: {}", probe_info.video_codec);
    println!("  Audio codec: {:?}", probe_info.audio_codec);

    assert_eq!(probe_info.width, 320);
    assert_eq!(probe_info.height, 240);
    assert_eq!(probe_info.total_frames, 30);
    assert!(probe_info.has_audio, "Expected sample video to contain audio stream");
    println!("  ✅ [PASS] Probe extracted correct resolution, frame count and audio.");

    // 4. Extract Single Frame
    println!("\n[4] EXTRACT SINGLE RGBA FRAME");
    let (fw, fh, raw_rgba) = ffmpeg::extract_single_frame(sample_video, 0.5, None, None)
        .expect("Failed to extract single frame");
    assert_eq!(fw, 320);
    assert_eq!(fh, 240);
    assert_eq!(raw_rgba.len(), 320 * 240 * 4);
    println!("  ✅ [PASS] Extracted pristine RGBA frame of {} bytes.", raw_rgba.len());

    // 5. Test Native Export: MP4 (H.264 + AAC audio preservation)
    println!("\n[5] NATIVE VIDEO EXPORT: MP4 (H.264 + Audio Sync)");
    let mp4_out = "/tmp/df_test_export.mp4";
    let req_mp4 = ffmpeg::NativeVideoExportRequest {
        input_video_path: Some(sample_video.to_string()),
        output_path: mp4_out.to_string(),
        format: "mp4".to_string(),
        fps: Some(30.0),
        duration: 1.0,
        audio_sync: Some(true),
        header: BinaryProcessHeader {
            width: 320,
            height: 240,
            algorithm: "floyd_steinberg".to_string(),
            palette: vec![[0, 0, 0, 255], [255, 255, 255, 255]],
            threshold: Some(0.5),
            scale: Some(1.0),
            diffusion_strength: Some(1.0),
            serpentine: Some(true),
            temporal_seed: Some(0),
            luminance_threshold: None,
            brightness: Some(0.0),
            contrast: Some(0.0),
            saturation: Some(0.0),
            gamma: Some(1.0),
            hue: Some(0.0),
            temporal_pattern: None,
            temporal_intensity: None,
            temporal_speed: None,
            depth: Some(8),
            noise_amount: None,
            matrix_size: None,
            warp_intensity: None,
            dot_size: None,
            block_size: None,
            cracked: None,
            distribution_spread: None,
            twist_strength: None,
            spiral_frequency: None,
            line_scale: None,
            bleed: None,
            smoothing: None,
            line_spacing: None,
            line_density: None,
            line_angle: None,
            dotting: None,
            line_emphasis: None,
            line_count: None,
            modulation_strength: None,
            horizontal_bias: None,
            glitch_intensity: None,
            frequency: None,
            amplitude: None,
            wave_frequency: None,
            wave_density: None,
            wave_threshold: None,
            modulation_frequency: None,
            modulation_blend: None,
            freq_a: None,
            freq_b: None,
            angle: None,
            swirl: None,
            cell_size: None,
            edge_sensitivity: None,
            checkers_size: None,
            period: None,
            dot_scale: None,
            dot_density: None,
            density: None,
            variation: None,
            divisor: None,
            peak_threshold: None,
            min_peak_distance: None,
            max_peaks: None,
            interference: None,
            contour_threshold: None,
            line_mode: None,
            triangle_type: None,
            vertical: None,
            orb_count: None,
            orb_size: None,
            orb_intensity: None,
            orb_random: None,
            orb_offset: None,
            orb_vertical: None,
            effect_stack: vec![],
        },
    };

    let mp4_res = ffmpeg::export_video_native_ffmpeg(None, req_mp4)
        .expect("MP4 export failed");
    println!("  Exported MP4 in {:.2}ms, size: {} bytes, frames: {}", mp4_res.elapsed_ms, mp4_res.file_size_bytes, mp4_res.total_frames);
    assert!(mp4_res.file_size_bytes > 1000);

    // Verify exported MP4 by probing it
    let probe_mp4 = ffmpeg::probe_video(mp4_out).expect("Failed to probe exported MP4");
    assert_eq!(probe_mp4.width, 320);
    assert_eq!(probe_mp4.height, 240);
    assert_eq!(probe_mp4.video_codec, "h264");
    assert!(probe_mp4.has_audio, "Exported MP4 must preserve audio stream");
    println!("  ✅ [PASS] Exported MP4 verified: H.264 video + synchronized AAC audio.");

    // 6. Test Native Export: WebM (VP9 + Opus audio)
    println!("\n[6] NATIVE VIDEO EXPORT: WebM (VP9)");
    let webm_out = "/tmp/df_test_export.webm";
    let req_webm = ffmpeg::NativeVideoExportRequest {
        input_video_path: Some(sample_video.to_string()),
        output_path: webm_out.to_string(),
        format: "webm".to_string(),
        fps: Some(30.0),
        duration: 1.0,
        audio_sync: Some(true),
        header: BinaryProcessHeader {
            width: 320,
            height: 240,
            algorithm: "bayer_4x4".to_string(),
            palette: vec![[0, 0, 0, 255], [255, 255, 255, 255]],
            threshold: Some(0.35),
            scale: Some(1.0),
            diffusion_strength: Some(1.0),
            serpentine: Some(true),
            temporal_seed: Some(0),
            luminance_threshold: None,
            brightness: Some(0.0),
            contrast: Some(0.0),
            saturation: Some(0.0),
            gamma: Some(1.0),
            hue: Some(0.0),
            temporal_pattern: None,
            temporal_intensity: None,
            temporal_speed: None,
            depth: Some(8),
            noise_amount: None,
            matrix_size: None,
            warp_intensity: None,
            dot_size: None,
            block_size: None,
            cracked: None,
            distribution_spread: None,
            twist_strength: None,
            spiral_frequency: None,
            line_scale: None,
            bleed: None,
            smoothing: None,
            line_spacing: None,
            line_density: None,
            line_angle: None,
            dotting: None,
            line_emphasis: None,
            line_count: None,
            modulation_strength: None,
            horizontal_bias: None,
            glitch_intensity: None,
            frequency: None,
            amplitude: None,
            wave_frequency: None,
            wave_density: None,
            wave_threshold: None,
            modulation_frequency: None,
            modulation_blend: None,
            freq_a: None,
            freq_b: None,
            angle: None,
            swirl: None,
            cell_size: None,
            edge_sensitivity: None,
            checkers_size: None,
            period: None,
            dot_scale: None,
            dot_density: None,
            density: None,
            variation: None,
            divisor: None,
            peak_threshold: None,
            min_peak_distance: None,
            max_peaks: None,
            interference: None,
            contour_threshold: None,
            line_mode: None,
            triangle_type: None,
            vertical: None,
            orb_count: None,
            orb_size: None,
            orb_intensity: None,
            orb_random: None,
            orb_offset: None,
            orb_vertical: None,
            effect_stack: vec![],
        },
    };

    let webm_res = ffmpeg::export_video_native_ffmpeg(None, req_webm)
        .expect("WebM export failed");
    println!("  Exported WebM in {:.2}ms, size: {} bytes", webm_res.elapsed_ms, webm_res.file_size_bytes);
    assert!(webm_res.file_size_bytes > 500);

    let probe_webm = ffmpeg::probe_video(webm_out).expect("Failed to probe exported WebM");
    assert_eq!(probe_webm.width, 320);
    assert_eq!(probe_webm.height, 240);
    assert_eq!(probe_webm.video_codec, "vp9");
    println!("  ✅ [PASS] Exported WebM verified: VP9 video codec.");

    // 7. Test Streaming Encode Session (Frame-by-frame IPC simulation)
    println!("\n[7] STREAMING FRAME-BY-FRAME ENCODE SESSION");
    let stream_out = "/tmp/df_test_stream.mp4";
    let sid = ffmpeg::start_ffmpeg_stream(
        stream_out.to_string(),
        "mp4".to_string(),
        160,
        120,
        30.0,
        false,
        None
    ).expect("Failed to start stream");
    println!("  Session ID: {}", sid);

    // Write 15 synthetic checkerboard frames
    let frame_len = 160 * 120 * 4;
    let mut syn_frame = vec![0u8; frame_len];
    for f in 0..15 {
        for y in 0..120 {
            for x in 0..160 {
                let idx = (y * 160 + x) * 4;
                let c = if ((x + f * 4) / 16 + y / 16) % 2 == 0 { 255 } else { 0 };
                syn_frame[idx] = c;
                syn_frame[idx + 1] = c;
                syn_frame[idx + 2] = c;
                syn_frame[idx + 3] = 255;
            }
        }
        ffmpeg::write_ffmpeg_stream_frame(&sid, &syn_frame).expect("Failed to write stream frame");
    }

    let stream_res = ffmpeg::finish_ffmpeg_stream(&sid).expect("Failed to finish stream");
    println!("  Stream finished: {} frames, {} bytes in {:.2}ms", stream_res.total_frames, stream_res.file_size_bytes, stream_res.elapsed_ms);
    assert_eq!(stream_res.total_frames, 15);
    assert!(stream_res.file_size_bytes > 500);

    let probe_stream = ffmpeg::probe_video(stream_out).expect("Failed to probe stream output");
    assert_eq!(probe_stream.width, 160);
    assert_eq!(probe_stream.height, 120);
    println!("  ✅ [PASS] Stream encode verified: 15 frames encoded without intermediate files.");

    println!("\n==================================================================");
    println!("✅ ALL FFMPEG NATIVE BACKEND TESTS PASSED SUCCESSFULLY");
    println!("==================================================================");
}

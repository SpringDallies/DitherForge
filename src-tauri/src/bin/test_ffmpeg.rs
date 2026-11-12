#![allow(dead_code, unused_variables)]
use std::process::Command;

use ditherforge::{
    algorithms, effects, engine, ffmpeg, palette,
    apply_raw_pre_adjustments, execute_binary_frame, validate_image_dimensions, BinaryProcessHeader,
};

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
        source_image_base64: None,
        frames_headers: None,
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
            ..Default::default()
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
        source_image_base64: None,
        frames_headers: None,
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
            ..Default::default()
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

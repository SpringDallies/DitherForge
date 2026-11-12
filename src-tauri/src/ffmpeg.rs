use crate::BinaryProcessHeader;
use image::RgbaImage;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::Emitter;
use base64::engine::{general_purpose::STANDARD, Engine as _};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Global cancellation flag for native video exports.
static NATIVE_EXPORT_CANCELLED: AtomicBool = AtomicBool::new(false);

/// Request cancellation of any in-progress native video export.
pub fn cancel_native_video_export() {
    NATIVE_EXPORT_CANCELLED.store(true, Ordering::SeqCst);
}

/// Cancel all active FFmpeg streaming sessions and mark exports as cancelled.
pub fn cancel_all_ffmpeg_sessions() {
    cancel_native_video_export();
    let ids: Vec<String> = if let Ok(guard) = SESSIONS.lock() {
        guard.as_ref().map(|m| m.keys().cloned().collect()).unwrap_or_default()
    } else {
        Vec::new()
    };
    for id in ids {
        let _ = cancel_ffmpeg_stream(&id);
    }
}

/// RAII guard for a child process: ensures both `.kill()` and `.wait()` are called on drop,
/// preventing orphaned/zombie FFmpeg processes on early returns or loop breaks.
struct ChildGuard(Option<Child>);

impl ChildGuard {
    fn take(&mut self) -> Option<Child> {
        self.0.take()
    }
}

impl Drop for ChildGuard {
    fn drop(&mut self) {
        if let Some(mut child) = self.0.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

pub fn create_command<S: AsRef<std::ffi::OsStr>>(program: S) -> Command {
    #[allow(unused_mut)]
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

static CACHED_FFMPEG: Mutex<Option<Option<PathBuf>>> = Mutex::new(None);
static CACHED_FFPROBE: Mutex<Option<Option<PathBuf>>> = Mutex::new(None);

/// Information about the host system's FFmpeg/ffprobe installation.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FfmpegStatus {
    pub ffmpeg_available: bool,
    pub ffprobe_available: bool,
    pub version: Option<String>,
    pub ffmpeg_path: Option<String>,
    pub ffprobe_path: Option<String>,
    pub package_manager: Option<String>,
    pub install_command: Option<String>,
    pub terminal_available: Option<String>,
    pub os: String,
}

/// Result of an in-app installation attempt.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstallResult {
    pub success: bool,
    pub message: String,
    pub installed_path: Option<String>,
    pub command_used: Option<String>,
}

/// Metadata extracted from a video via ffprobe.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VideoInfo {
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub duration: f64,
    pub total_frames: u64,
    pub has_audio: bool,
    pub video_codec: String,
    pub audio_codec: Option<String>,
}

/// Request to export a video file natively using FFmpeg.
#[derive(Deserialize, Debug)]
pub struct NativeVideoExportRequest {
    pub input_video_path: Option<String>,
    pub output_path: String,
    pub format: String, // "mp4", "webm", "mov"
    pub fps: Option<f64>,
    pub duration: f64,
    pub header: BinaryProcessHeader,
    /// Source image base64 (RGBA raw or PNG) for still-to-video export.
    /// Required when input_video_path is None.
    #[serde(default)]
    pub source_image_base64: Option<String>,
    pub audio_sync: Option<bool>,
}

/// Result of a video export operation.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VideoExportResult {
    pub success: bool,
    pub output_path: String,
    pub format: String,
    pub duration: f64,
    pub total_frames: u64,
    pub file_size_bytes: u64,
    pub elapsed_ms: f64,
}

/// Progress update emitted to the frontend during export.
#[derive(Serialize, Clone, Debug)]
pub struct VideoExportProgress {
    pub current_frame: u64,
    pub total_frames: u64,
    pub percent: f32,
    pub fps: f64,
}

/// Streaming encode session state for frontend-pushed frames.
pub struct StreamSession {
    child: Child,
    stdin: ChildStdin,
    stderr_drain: Option<std::thread::JoinHandle<Vec<u8>>>,
    width: u32,
    height: u32,
    fps: f64,
    frames_written: u64,
    output_path: String,
    format: String,
    start_time: Instant,
    cancelled: Arc<AtomicBool>,
}

static SESSIONS: Mutex<Option<HashMap<String, StreamSession>>> = Mutex::new(None);

#[allow(dead_code)]
fn get_sessions() -> &'static Mutex<Option<HashMap<String, StreamSession>>> {
    &SESSIONS
}

/// Searches the system for the FFmpeg executable across PATH and known directories.
pub fn find_ffmpeg_path() -> Option<PathBuf> {
    if let Ok(guard) = CACHED_FFMPEG.lock() {
        if let Some(cached) = &*guard {
            return cached.clone();
        }
    }
    let res = find_ffmpeg_path_uncached();
    if let Ok(mut guard) = CACHED_FFMPEG.lock() {
        *guard = Some(res.clone());
    }
    res
}

pub fn find_ffmpeg_path_uncached() -> Option<PathBuf> {
    // 1. Direct PATH check via Command
    if let Ok(output) = create_command("ffmpeg").arg("-version").output() {
        if output.status.success() {
            // Retrieve actual path via `which` or `where`
            #[cfg(target_os = "windows")]
            {
                if let Ok(which_out) = create_command("where").arg("ffmpeg").output() {
                    if let Ok(s) = String::from_utf8(which_out.stdout) {
                        if let Some(first_line) = s.lines().next() {
                            let p = PathBuf::from(first_line.trim());
                            if p.is_file() {
                                return Some(p);
                            }
                        }
                    }
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                if let Ok(which_out) = create_command("which").arg("ffmpeg").output() {
                    if let Ok(s) = String::from_utf8(which_out.stdout) {
                        let p = PathBuf::from(s.trim());
                        if p.is_file() {
                            return Some(p);
                        }
                    }
                }
            }
            return Some(PathBuf::from("ffmpeg"));
        }
    }

    // 2. Windows-specific well-known paths (e.g. WinGet Gyan.FFmpeg, Scoop, Chocolatey)
    #[cfg(target_os = "windows")]
    {
        let mut candidates = Vec::new();

        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let local_path = PathBuf::from(&local_app_data);
            candidates.push(local_path.join(r"Microsoft\WinGet\Links\ffmpeg.exe"));

            // Search under Microsoft\WinGet\Packages for Gyan.FFmpeg
            let pkg_dir = local_path.join(r"Microsoft\WinGet\Packages");
            if pkg_dir.is_dir() {
                if let Ok(entries) = std::fs::read_dir(&pkg_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_dir() {
                            let fname = path.file_name().unwrap_or_default().to_string_lossy();
                            if fname.contains("FFmpeg") || fname.contains("ffmpeg") {
                                // Walk subdirectories for ffmpeg.exe
                                for sub in &[
                                    path.join("bin").join("ffmpeg.exe"),
                                    path.join("ffmpeg.exe"),
                                ] {
                                    if sub.is_file() {
                                        candidates.push(sub.clone());
                                    }
                                }
                                if let Ok(sub_entries) = std::fs::read_dir(&path) {
                                    for sub_entry in sub_entries.flatten() {
                                        let sp = sub_entry.path();
                                        if sp.is_dir() {
                                            let bin_p = sp.join("bin").join("ffmpeg.exe");
                                            if bin_p.is_file() {
                                                candidates.push(bin_p);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if let Ok(prog_files) = std::env::var("ProgramFiles") {
            let pf = PathBuf::from(&prog_files);
            candidates.push(pf.join(r"ffmpeg\bin\ffmpeg.exe"));
            candidates.push(pf.join(r"ffmpeg\ffmpeg.exe"));
        }

        if let Ok(user_profile) = std::env::var("USERPROFILE") {
            let up = PathBuf::from(&user_profile);
            candidates.push(up.join(r"scoop\shims\ffmpeg.exe"));
        }

        candidates.push(PathBuf::from(r"C:\ffmpeg\bin\ffmpeg.exe"));
        candidates.push(PathBuf::from(r"C:\ProgramData\chocolatey\bin\ffmpeg.exe"));

        for cand in candidates {
            if cand.is_file() {
                if let Ok(out) = create_command(&cand).arg("-version").output() {
                    if out.status.success() {
                        return Some(cand);
                    }
                }
            }
        }
    }

    // 3. Linux/Unix well-known paths
    #[cfg(not(target_os = "windows"))]
    {
        let unix_candidates = [
            "/usr/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
            "/snap/bin/ffmpeg",
            "/opt/ffmpeg/bin/ffmpeg",
        ];
        for cand in &unix_candidates {
            let p = PathBuf::from(cand);
            if p.is_file() {
                if let Ok(out) = create_command(&p).arg("-version").output() {
                    if out.status.success() {
                        return Some(p);
                    }
                }
            }
        }

        // Check ~/.local/bin/ffmpeg
        if let Ok(home) = std::env::var("HOME") {
            let home_p = PathBuf::from(home).join(".local/bin/ffmpeg");
            if home_p.is_file() {
                if let Ok(out) = create_command(&home_p).arg("-version").output() {
                    if out.status.success() {
                        return Some(home_p);
                    }
                }
            }
        }
    }

    None
}

/// Searches the system for the ffprobe executable across PATH and known directories.
pub fn find_ffprobe_path() -> Option<PathBuf> {
    if let Ok(guard) = CACHED_FFPROBE.lock() {
        if let Some(cached) = &*guard {
            return cached.clone();
        }
    }
    let res = find_ffprobe_path_uncached();
    if let Ok(mut guard) = CACHED_FFPROBE.lock() {
        *guard = Some(res.clone());
    }
    res
}

pub fn find_ffprobe_path_uncached() -> Option<PathBuf> {
    // 1. Direct PATH check
    if let Ok(output) = create_command("ffprobe").arg("-version").output() {
        if output.status.success() {
            #[cfg(target_os = "windows")]
            {
                if let Ok(which_out) = create_command("where").arg("ffprobe").output() {
                    if let Ok(s) = String::from_utf8(which_out.stdout) {
                        if let Some(first_line) = s.lines().next() {
                            let p = PathBuf::from(first_line.trim());
                            if p.is_file() {
                                return Some(p);
                            }
                        }
                    }
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                if let Ok(which_out) = create_command("which").arg("ffprobe").output() {
                    if let Ok(s) = String::from_utf8(which_out.stdout) {
                        let p = PathBuf::from(s.trim());
                        if p.is_file() {
                            return Some(p);
                        }
                    }
                }
            }
            return Some(PathBuf::from("ffprobe"));
        }
    }

    // 2. Check sibling of found ffmpeg
    if let Some(ffmpeg_path) = find_ffmpeg_path() {
        if let Some(parent) = ffmpeg_path.parent() {
            #[cfg(target_os = "windows")]
            let probe_name = "ffprobe.exe";
            #[cfg(not(target_os = "windows"))]
            let probe_name = "ffprobe";

            let probe_candidate = parent.join(probe_name);
            if probe_candidate.is_file() {
                if let Ok(out) = create_command(&probe_candidate).arg("-version").output() {
                    if out.status.success() {
                        return Some(probe_candidate);
                    }
                }
            }
        }
    }

    // 3. Fallback standard paths
    #[cfg(not(target_os = "windows"))]
    {
        for p in &["/usr/bin/ffprobe", "/usr/local/bin/ffprobe", "/snap/bin/ffprobe"] {
            let pb = PathBuf::from(p);
            if pb.is_file() {
                return Some(pb);
            }
        }
    }

    None
}

/// Forces a refresh of the cached FFmpeg and ffprobe binary paths.
pub fn refresh_ffmpeg_cache() -> (Option<PathBuf>, Option<PathBuf>) {
    let ffmpeg = find_ffmpeg_path_uncached();
    if let Ok(mut guard) = CACHED_FFMPEG.lock() {
        *guard = Some(ffmpeg.clone());
    }
    let ffprobe = find_ffprobe_path_uncached();
    if let Ok(mut guard) = CACHED_FFPROBE.lock() {
        *guard = Some(ffprobe.clone());
    }
    (ffmpeg, ffprobe)
}

/// Detects the Linux distribution and corresponding package manager command.
fn detect_linux_distro_pm() -> (Option<String>, Option<String>) {
    let mut os_info = String::new();
    if let Ok(c) = std::fs::read_to_string("/etc/os-release") {
        os_info.push_str(&c);
    } else if let Ok(c) = std::fs::read_to_string("/usr/lib/os-release") {
        os_info.push_str(&c);
    }

    let lower = os_info.to_lowercase();
    let is_arch = lower.contains("id=arch") || lower.contains("id_like=arch") || lower.contains("id=endeavouros") || lower.contains("id=manjaro");
    let is_debian = lower.contains("id=ubuntu") || lower.contains("id=debian") || lower.contains("id=pop") || lower.contains("id=mint") || lower.contains("id_like=debian");
    let is_fedora = lower.contains("id=fedora") || lower.contains("id=rhel") || lower.contains("id_like=rhel");
    let is_suse = lower.contains("id=opensuse") || lower.contains("id=suse") || lower.contains("id_like=suse");
    let is_alpine = lower.contains("id=alpine");

    if is_arch {
        (Some("pacman".to_string()), Some("sudo pacman -S --noconfirm ffmpeg".to_string()))
    } else if is_debian {
        (Some("apt".to_string()), Some("sudo apt update && sudo apt install -y ffmpeg".to_string()))
    } else if is_fedora {
        (Some("dnf".to_string()), Some("sudo dnf install -y ffmpeg".to_string()))
    } else if is_suse {
        (Some("zypper".to_string()), Some("sudo zypper install -y ffmpeg".to_string()))
    } else if is_alpine {
        (Some("apk".to_string()), Some("sudo apk add ffmpeg".to_string()))
    } else {
        // Inspect available binaries directly
        for (bin, cmd) in &[
            ("pacman", "sudo pacman -S --noconfirm ffmpeg"),
            ("apt", "sudo apt update && sudo apt install -y ffmpeg"),
            ("dnf", "sudo dnf install -y ffmpeg"),
            ("zypper", "sudo zypper install -y ffmpeg"),
            ("apk", "sudo apk add ffmpeg"),
        ] {
            if create_command("which").arg(bin).output().map(|o| o.status.success()).unwrap_or(false) {
                return (Some((*bin).to_string()), Some((*cmd).to_string()));
            }
        }
        (None, None)
    }
}

/// Finds an available terminal emulator on Linux.
fn find_linux_terminal() -> Option<String> {
    let terminals = [
        "x-terminal-emulator",
        "gnome-terminal",
        "konsole",
        "ptyxis",
        "xfce4-terminal",
        "alacritty",
        "kitty",
        "foot",
        "terminator",
        "xterm",
    ];
    for t in &terminals {
        if let Ok(out) = create_command("which").arg(t).output() {
            if out.status.success() {
                return Some((*t).to_string());
            }
        }
    }
    None
}

/// Checks whether WinGet is available on Windows.
#[allow(dead_code)]
fn check_windows_winget() -> bool {
    #[cfg(target_os = "windows")]
    {
        if let Ok(out) = create_command("winget").arg("--version").output() {
            return out.status.success();
        }
    }
    false
}

/// Queries FFmpeg and ffprobe status, returning structured information and install recommendations.
pub fn get_ffmpeg_status() -> FfmpegStatus {
    let ffmpeg_path = find_ffmpeg_path();
    let ffprobe_path = find_ffprobe_path();
    let ffmpeg_available = ffmpeg_path.is_some();
    let ffprobe_available = ffprobe_path.is_some();

    let mut version = None;
    if let Some(ref path) = ffmpeg_path {
        if let Ok(out) = create_command(path).arg("-version").output() {
            if let Ok(s) = String::from_utf8(out.stdout) {
                if let Some(first_line) = s.lines().next() {
                    version = Some(first_line.trim().to_string());
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let winget_avail = check_windows_winget();
        let (pm, cmd) = if winget_avail {
            (
                Some("winget".to_string()),
                Some("winget install -e --id Gyan.FFmpeg".to_string()),
            )
        } else {
            (
                Some("manual".to_string()),
                Some("https://www.gyan.dev/ffmpeg/builds/".to_string()),
            )
        };

        FfmpegStatus {
            ffmpeg_available,
            ffprobe_available,
            version,
            ffmpeg_path: ffmpeg_path.map(|p| p.to_string_lossy().to_string()),
            ffprobe_path: ffprobe_path.map(|p| p.to_string_lossy().to_string()),
            package_manager: pm,
            install_command: cmd,
            terminal_available: None,
            os: "windows".to_string(),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let (pm, cmd) = detect_linux_distro_pm();
        let term = find_linux_terminal();

        FfmpegStatus {
            ffmpeg_available,
            ffprobe_available,
            version,
            ffmpeg_path: ffmpeg_path.map(|p| p.to_string_lossy().to_string()),
            ffprobe_path: ffprobe_path.map(|p| p.to_string_lossy().to_string()),
            package_manager: pm,
            install_command: cmd,
            terminal_available: term,
            os: std::env::consts::OS.to_string(),
        }
    }
}

/// Executes in-app FFmpeg installation for Windows or Linux.
pub fn install_ffmpeg() -> Result<InstallResult, String> {
    let status = get_ffmpeg_status();
    if status.ffmpeg_available && status.ffprobe_available {
        return Ok(InstallResult {
            success: true,
            message: "FFmpeg and ffprobe are already installed and available".to_string(),
            installed_path: status.ffmpeg_path,
            command_used: None,
        });
    }

    #[cfg(target_os = "windows")]
    {
        if !check_windows_winget() {
            return Err("WinGet is not available on this system. Please install FFmpeg manually from https://www.gyan.dev/ffmpeg/builds/".to_string());
        }

        let child = create_command("winget")
            .args([
                "install",
                "-e",
                "--id",
                "Gyan.FFmpeg",
                "--accept-source-agreements",
                "--accept-package-agreements",
            ])
            .output()
            .map_err(|e| format!("Failed to execute winget: {}", e))?;

        let stdout = String::from_utf8_lossy(&child.stdout).to_string();
        let stderr = String::from_utf8_lossy(&child.stderr).to_string();

        if !child.status.success() {
            return Err(format!(
                "WinGet installation failed (code {:?}): {}\n{}",
                child.status.code(),
                stdout,
                stderr
            ));
        }

        // Re-check for FFmpeg path (including newly populated WinGet directories)
        let newly_found = refresh_ffmpeg_cache().0;
        Ok(InstallResult {
            success: newly_found.is_some(),
            message: if newly_found.is_some() {
                "FFmpeg installed successfully via WinGet".to_string()
            } else {
                "WinGet completed. Please restart DitherForge if FFmpeg is not recognized immediately.".to_string()
            },
            installed_path: newly_found.map(|p| p.to_string_lossy().to_string()),
            command_used: Some("winget install -e --id Gyan.FFmpeg".to_string()),
        })
    }

    #[cfg(not(target_os = "windows"))]
    {
        let (_pm, cmd_opt) = detect_linux_distro_pm();
        let install_cmd = cmd_opt.ok_or_else(|| {
            "Could not detect package manager for this distribution. Please install FFmpeg via your system package manager.".to_string()
        })?;

        let terminal = find_linux_terminal().ok_or_else(|| {
            format!(
                "No terminal emulator detected. Please open a terminal and run:\n{}",
                install_cmd
            )
        })?;

        // Launch terminal with sudo command so user can review and provide password safely
        let full_script = format!(
            "echo '=== DitherForge FFmpeg Installer ==='; echo 'Running: {}'; {}; echo ''; echo 'Installation finished. Press Enter to close this terminal.'; read line",
            install_cmd, install_cmd
        );

        let mut term_cmd = create_command(&terminal);
        match terminal.as_str() {
            "konsole" => {
                term_cmd.args(["-e", "bash", "-c", &full_script]);
            }
            "gnome-terminal" | "ptyxis" | "xfce4-terminal" | "terminator" => {
                term_cmd.args(["--", "bash", "-c", &full_script]);
            }
            _ => {
                term_cmd.args(["-e", "bash", "-c", &full_script]);
            }
        }

        term_cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn terminal {}: {}", terminal, e))?;

        Ok(InstallResult {
            success: true,
            message: format!(
                "Launched {} with command '{}'. Complete the installation in the terminal window.",
                terminal, install_cmd
            ),
            installed_path: None,
            command_used: Some(install_cmd),
        })
    }
}

/// Probes a video file using a single ffprobe invocation.
pub fn probe_video(video_path: &str) -> Result<VideoInfo, String> {
    let probe_bin = find_ffprobe_path()
        .ok_or_else(|| "ffprobe is not available on this system".to_string())?;

    let out = create_command(&probe_bin)
        .args([
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type,width,height,r_frame_rate,duration,nb_frames,codec_name:format=duration",
            "-of",
            "json",
            video_path,
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffprobe: {}", e))?;

    if !out.status.success() {
        return Err(format!(
            "ffprobe failed: {}",
            String::from_utf8_lossy(&out.stderr)
        ));
    }

    let json_val: serde_json::Value = serde_json::from_slice(&out.stdout)
        .map_err(|e| format!("Failed to parse ffprobe JSON output: {}", e))?;

    let streams = json_val["streams"]
        .as_array()
        .ok_or_else(|| "No streams array in ffprobe output".to_string())?;

    let v_stream = streams
        .iter()
        .find(|s| s["codec_type"].as_str() == Some("video"))
        .ok_or_else(|| "No video stream found in file".to_string())?;

    let width = v_stream["width"].as_u64().unwrap_or(0) as u32;
    let height = v_stream["height"].as_u64().unwrap_or(0) as u32;
    let video_codec = v_stream["codec_name"].as_str().unwrap_or("unknown").to_string();

    let fps_str = v_stream["r_frame_rate"].as_str().unwrap_or("30/1");
    let fps = if let Some((num, den)) = fps_str.split_once('/') {
        let n: f64 = num.parse().unwrap_or(30.0);
        let d: f64 = den.parse().unwrap_or(1.0);
        if d > 0.0 { n / d } else { 30.0 }
    } else {
        fps_str.parse().unwrap_or(30.0)
    };

    let duration: f64 = v_stream["duration"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .or_else(|| {
            json_val["format"]["duration"]
                .as_str()
                .and_then(|s| s.parse().ok())
        })
        .unwrap_or(0.0);

    let total_frames: u64 = v_stream["nb_frames"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or_else(|| (duration * fps).round().max(1.0) as u64);

    let a_stream = streams.iter().find(|s| s["codec_type"].as_str() == Some("audio"));
    let has_audio = a_stream.is_some();
    let audio_codec = a_stream.and_then(|s| s["codec_name"].as_str().map(|c| c.to_string()));

    Ok(VideoInfo {
        width,
        height,
        fps,
        duration,
        total_frames,
        has_audio,
        video_codec,
        audio_codec,
    })
}

/// Extracts a single RGBA frame at timestamp `t` from a video file.
pub fn extract_single_frame(
    video_path: &str,
    timestamp_sec: f64,
    target_width: Option<u32>,
    target_height: Option<u32>,
) -> Result<(u32, u32, Vec<u8>), String> {
    let ffmpeg_bin = find_ffmpeg_path()
        .ok_or_else(|| "FFmpeg is not available on this system".to_string())?;

    let (w, h) = match (target_width, target_height) {
        (Some(tw), Some(th)) => (tw, th),
        _ => {
            let info = probe_video(video_path)?;
            (target_width.unwrap_or(info.width), target_height.unwrap_or(info.height))
        }
    };

    let mut cmd = create_command(&ffmpeg_bin);
    cmd.args([
        "-nostdin",
        "-ss",
        &format!("{:.3}", timestamp_sec),
        "-i",
        video_path,
        "-vframes",
        "1",
    ]);

    if target_width.is_some() || target_height.is_some() {
        cmd.args(["-vf", &format!("scale={}:{}", w, h)]);
    }

    cmd.args(["-f", "rawvideo", "-pix_fmt", "rgba", "-"]);
    cmd.stdout(Stdio::piped()).stderr(Stdio::null());

    let output = cmd.output().map_err(|e| format!("FFmpeg frame extraction failed: {}", e))?;
    let expected_len = (w * h * 4) as usize;
    if output.stdout.len() < expected_len {
        return Err(format!(
            "FFmpeg extracted {} bytes, expected {} for {}x{} RGBA",
            output.stdout.len(),
            expected_len,
            w,
            h
        ));
    }

    Ok((w, h, output.stdout[..expected_len].to_vec()))
}

/// Native end-to-end video export pipeline:
/// Decodes via FFmpeg -> Processes in Rust engine -> Encodes via FFmpeg with audio preservation.
pub fn export_video_native_ffmpeg(
    window: Option<tauri::Window>,
    request: NativeVideoExportRequest,
) -> Result<VideoExportResult, String> {
    let start_instant = Instant::now();
    let ffmpeg_bin = find_ffmpeg_path()
        .ok_or_else(|| "FFmpeg is not available on this system".to_string())?;

    let width = request.header.width;
    let height = request.header.height;
    let byte_len = (width * height * 4) as usize;

    let target_fps = request.fps.unwrap_or(30.0).clamp(1.0, 120.0);
    let duration = request.duration.max(0.1);
    let total_frames = (duration * target_fps).round().max(1.0) as u64;

    // Check audio availability on source video
    let mut has_audio = false;
    if let Some(ref in_path) = request.input_video_path {
        if Path::new(in_path).is_file() {
            if let Ok(info) = probe_video(in_path) {
                has_audio = info.has_audio;
            }
        }
    }

    NATIVE_EXPORT_CANCELLED.store(false, Ordering::SeqCst);

    // 1. Configure and spawn the FFmpeg encoder child process
    let mut enc_cmd = create_command(&ffmpeg_bin);
    enc_cmd.args([
        "-y",
        "-v",
        "error",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "-s",
        &format!("{}x{}", width, height),
        "-r",
        &format!("{:.3}", target_fps),
        "-i",
        "-",
    ]);

    // If source video has audio, include it as input #1 and map audio stream
    if has_audio && request.audio_sync.unwrap_or(true) {
        if let Some(ref in_path) = request.input_video_path {
            enc_cmd.args(["-i", in_path, "-map", "0:v:0", "-map", "1:a:0?"]);
        }
    }

    let fmt = request.format.to_lowercase();
    match fmt.as_str() {
        "mp4" => {
            enc_cmd.args([
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-preset",
                "veryfast",
                "-crf",
                "20",
            ]);
            if has_audio {
                enc_cmd.args(["-c:a", "aac", "-b:a", "192k"]);
            }
        }
        "webm" => {
            enc_cmd.args([
                "-c:v",
                "libvpx-vp9",
                "-pix_fmt",
                "yuv420p",
                "-crf",
                "30",
                "-b:v",
                "0",
                "-cpu-used",
                "4",
                "-row-mt",
                "1",
            ]);
            if has_audio {
                enc_cmd.args(["-c:a", "libopus", "-b:a", "128k"]);
            }
        }
        "mov" => {
            enc_cmd.args([
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-preset",
                "veryfast",
                "-crf",
                "18",
            ]);
            if has_audio {
                enc_cmd.args(["-c:a", "aac", "-b:a", "256k"]);
            }
        }
        _ => {
            enc_cmd.args(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast"]);
        }
    }

    enc_cmd.arg(&request.output_path);
    enc_cmd.stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::piped());

    let mut encoder_child = enc_cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn FFmpeg encoder: {}", e))?;
    let mut encoder_stdin = encoder_child
        .stdin
        .take()
        .ok_or_else(|| "Failed to open FFmpeg encoder stdin".to_string())?;
    let enc_stderr = encoder_child.stderr.take();
    let stderr_drain = std::thread::spawn(move || {
        let mut err_buf = Vec::new();
        if let Some(mut r) = enc_stderr {
            let _ = r.read_to_end(&mut err_buf);
        }
        err_buf
    });
    // Wrap encoder in ChildGuard so any early `?` return kills & reaps it
    let mut encoder_guard = ChildGuard(Some(encoder_child));

    // 2. If input video exists, spawn FFmpeg decoder piping raw RGBA to Rust
    let mut decoder_child = if let Some(ref in_path) = request.input_video_path {
        if Path::new(in_path).is_file() {
            let mut dec_cmd = create_command(&ffmpeg_bin);
            dec_cmd.args([
                "-nostdin",
                "-v",
                "error",
                "-i",
                in_path,
                "-vf",
                &format!("scale={}:{}", width, height),
                "-r",
                &format!("{:.3}", target_fps),
                "-f",
                "rawvideo",
                "-pix_fmt",
                "rgba",
                "-",
            ]);
            dec_cmd.stdout(Stdio::piped()).stderr(Stdio::null());
            Some(
                dec_cmd
                    .spawn()
                    .map_err(|e| format!("Failed to spawn FFmpeg decoder: {e}",))?,
            )
        } else {
            None
        }
    } else {
        None
    };

    // Wrap decoder in ChildGuard so it's always killed and reaped on exit
    let mut decoder_guard = ChildGuard(decoder_child.take());

    let mut decoder_reader = decoder_guard
        .0
        .as_mut()
        .and_then(|c| c.stdout.take())
        .map(BufReader::new);

    // Reusable single-frame buffer for bounded memory usage (low-end hardware compliant)
    let mut frame_buf = vec![0u8; byte_len];

    // Pre-decode source image for still-to-video (no input video file)
    let source_image: Option<RgbaImage> = if request.input_video_path.is_none() {
        if let Some(ref b64) = request.source_image_base64 {
            let bytes = STANDARD
                .decode(b64)
                .map_err(|e| format!("Failed to decode source image base64: {e}"))?;
            let img = if bytes.len() == byte_len {
                RgbaImage::from_raw(width, height, bytes)
                    .ok_or_else(|| "Failed to construct RgbaImage from raw RGBA bytes".to_string())?
            } else {
                let decoded = image::load_from_memory(&bytes)
                    .map_err(|e| format!("Failed to load source image: {e}"))?
                    .to_rgba8();
                if decoded.width() == width && decoded.height() == height {
                    decoded
                } else {
                    image::imageops::resize(
                        &decoded,
                        width,
                        height,
                        image::imageops::FilterType::Triangle,
                    )
                }
            };
            Some(img)
        } else {
            return Err("Neither input_video_path nor source_image_base64 was provided".to_string());
        }
    } else {
        None
    };

    let mut actual_frames = 0u64;

    let loop_result: Result<(), String> = (|| {
        for frame_idx in 0..total_frames {
            if NATIVE_EXPORT_CANCELLED.load(Ordering::SeqCst) {
                return Err("Video export cancelled by user".to_string());
            }
            if let Some(ref mut reader) = decoder_reader {
                if let Err(e) = reader.read_exact(&mut frame_buf) {
                    if frame_idx > 0 {
                        break;
                    }
                    return Err(format!("Failed to read frame {} from decoder: {e}", frame_idx));
                }
            } else if let Some(ref src_img) = source_image {
                // Still-to-video: source image already resized to exact dimensions above
                frame_buf.copy_from_slice(src_img.as_raw());
            }
            // else: frame_buf stays zeros (shouldn't happen if source_image is set)

            let mut frame_header = request.header.clone();
            frame_header.temporal_seed = Some(frame_idx as u32);
            // Offset post-effect seeds per frame so film_grain, scanlines, vhs_tracking,
            // gate_weave, exposure_flicker, glitch_slices etc. animate during export
            for eff in &mut frame_header.effect_stack {
                eff.offset_seed(frame_idx as u32);
            }

            // Execute unified Rust image processing pipeline
            let processed_frame = crate::execute_binary_frame(&frame_header, &frame_buf)?;

            // Pipe processed raw RGBA frame to FFmpeg encoder stdin
            encoder_stdin
                .write_all(&processed_frame)
                .map_err(|e| format!("Failed to write frame {} to encoder stdin: {}", frame_idx, e))?;

            actual_frames += 1;

            // Emit non-blocking progress to UI every 5 frames
            if frame_idx % 5 == 0 || frame_idx == total_frames - 1 {
                if let Some(ref win) = window {
                    let _ = win.emit(
                        "video-export-progress",
                        VideoExportProgress {
                            current_frame: frame_idx + 1,
                            total_frames,
                            percent: ((frame_idx + 1) as f32) / (total_frames as f32),
                            fps: target_fps,
                        },
                    );
                }
            }
        }
        Ok(())
    })();

    // Always close encoder stdin before waiting or cleaning up
    drop(encoder_stdin);

    if let Err(err) = loop_result {
        drop(encoder_guard); // Kills and waits on encoder_child
        let _ = stderr_drain.join();
        let _ = std::fs::remove_file(&request.output_path);
        return Err(err);
    }

    let mut encoder_child = encoder_guard.take().unwrap();
    let enc_status = encoder_child
        .wait()
        .map_err(|e| format!("Error waiting for FFmpeg encoder: {}", e))?;
    let stderr_output = stderr_drain.join().unwrap_or_default();
    if !enc_status.success() {
        let _ = std::fs::remove_file(&request.output_path);
        return Err(format!(
            "FFmpeg encoding failed: {}",
            String::from_utf8_lossy(&stderr_output)
        ));
    }

    let file_size_bytes = std::fs::metadata(&request.output_path)
        .map(|m| m.len())
        .unwrap_or(0);
    let elapsed_ms = start_instant.elapsed().as_secs_f64() * 1000.0;
    let actual_duration = if target_fps > 0.0 {
        (actual_frames as f64) / target_fps
    } else {
        duration
    };

    Ok(VideoExportResult {
        success: true,
        output_path: request.output_path,
        format: fmt,
        duration: actual_duration,
        total_frames: actual_frames,
        file_size_bytes,
        elapsed_ms,
    })
}

/// Initializes a streaming FFmpeg video encoding session.
pub fn start_ffmpeg_stream(
    output_path: String,
    format: String,
    width: u32,
    height: u32,
    fps: f64,
    has_audio: bool,
    input_audio_path: Option<String>,
) -> Result<String, String> {
    let ffmpeg_bin = find_ffmpeg_path().ok_or_else(|| "FFmpeg is not available on this system".to_string())?;
    let mut enc_cmd = create_command(&ffmpeg_bin);
    enc_cmd.args([
        "-y",
        "-v",
        "error",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "-s",
        &format!("{}x{}", width, height),
        "-r",
        &format!("{:.3}", fps),
        "-i",
        "-",
    ]);

    if has_audio {
        if let Some(ref in_audio) = input_audio_path {
            if Path::new(in_audio).is_file() {
                enc_cmd.args(["-i", in_audio, "-map", "0:v:0", "-map", "1:a:0?"]);
            }
        }
    }

    let fmt = format.to_lowercase();
    match fmt.as_str() {
        "mp4" => {
            enc_cmd.args(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "20"]);
            if has_audio {
                enc_cmd.args(["-c:a", "aac", "-b:a", "192k"]);
            }
        }
        "webm" => {
            enc_cmd.args(["-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-crf", "30", "-b:v", "0", "-cpu-used", "4", "-row-mt", "1"]);
            if has_audio {
                enc_cmd.args(["-c:a", "libopus", "-b:a", "128k"]);
            }
        }
        "mov" => {
            enc_cmd.args(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "18"]);
            if has_audio {
                enc_cmd.args(["-c:a", "aac", "-b:a", "256k"]);
            }
        }
        _ => {
            enc_cmd.args(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast"]);
        }
    }

    enc_cmd.arg(&output_path);
    enc_cmd.stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::piped());

    let mut child = enc_cmd.spawn().map_err(|e| format!("Failed to start FFmpeg stream encoder: {}", e))?;
    let stdin = child.stdin.take().ok_or_else(|| "Failed to take stdin of FFmpeg stream".to_string())?;

    let child_stderr = child.stderr.take();
    let stderr_drain = Some(std::thread::spawn(move || {
        let mut err_buf = Vec::new();
        if let Some(mut r) = child_stderr {
            let _ = r.read_to_end(&mut err_buf);
        }
        err_buf
    }));

    let session_id = format!(
        "ff_stream_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    );

    let session = StreamSession {
        child,
        stdin,
        stderr_drain,
        width,
        height,
        fps,
        frames_written: 0,
        output_path,
        format: fmt,
        start_time: Instant::now(),
        cancelled: Arc::new(AtomicBool::new(false)),
    };

    let mut guard = SESSIONS.lock().unwrap();
    if guard.is_none() {
        *guard = Some(HashMap::new());
    }
    guard.as_mut().unwrap().insert(session_id.clone(), session);

    Ok(session_id)
}

/// Appends a raw RGBA frame to an active streaming FFmpeg encoder.
pub fn write_ffmpeg_stream_frame(session_id: &str, frame_bytes: &[u8]) -> Result<(), String> {
    let mut guard = SESSIONS.lock().unwrap();
    let sessions = guard.as_mut().ok_or_else(|| "No active streaming sessions".to_string())?;
    let session = sessions
        .get_mut(session_id)
        .ok_or_else(|| format!("Session {} not found", session_id))?;

    let expected = (session.width * session.height * 4) as usize;
    if frame_bytes.len() < expected {
        return Err(format!(
            "Frame size {} is less than expected {} for {}x{} RGBA",
            frame_bytes.len(),
            expected,
            session.width,
            session.height
        ));
    }

    session
        .stdin
        .write_all(&frame_bytes[..expected])
        .map_err(|e| format!("Failed to write frame to FFmpeg: {}", e))?;
    session.frames_written += 1;
    Ok(())
}

/// Finalizes a streaming FFmpeg video encoding session and returns file statistics.
pub fn finish_ffmpeg_stream(session_id: &str) -> Result<VideoExportResult, String> {
    let session = {
        let mut guard = SESSIONS.lock().unwrap();
        let sessions = guard.as_mut().ok_or_else(|| "No active streaming sessions".to_string())?;
        sessions
            .remove(session_id)
            .ok_or_else(|| format!("Session {} not found", session_id))?
    };

    let StreamSession {
        mut child,
        stdin,
        stderr_drain,
        width: _,
        height: _,
        fps,
        frames_written,
        output_path,
        format,
        start_time,
        cancelled: _,
    } = session;
    drop(stdin);

    let status = child
        .wait()
        .map_err(|e| format!("Error waiting for FFmpeg stream child: {}", e))?;

    let stderr_bytes = if let Some(h) = stderr_drain {
        h.join().unwrap_or_default()
    } else {
        Vec::new()
    };

    if !status.success() {
        return Err(format!(
            "FFmpeg stream encoding failed: {}",
            String::from_utf8_lossy(&stderr_bytes)
        ));
    }

    let file_size_bytes = std::fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);
    let duration = if fps > 0.0 { (frames_written as f64) / fps } else { 0.0 };
    let elapsed_ms = start_time.elapsed().as_secs_f64() * 1000.0;

    Ok(VideoExportResult {
        success: true,
        output_path,
        format,
        duration,
        total_frames: frames_written,
        file_size_bytes,
        elapsed_ms,
    })
}

/// Cancels and kills an active streaming FFmpeg encode session.
pub fn cancel_ffmpeg_stream(session_id: &str) -> Result<(), String> {
    let session = {
        let mut guard = SESSIONS.lock().unwrap();
        if let Some(ref mut sessions) = *guard {
            sessions.remove(session_id)
        } else {
            None
        }
    };
    if let Some(mut s) = session {
        s.cancelled.store(true, Ordering::SeqCst);
        let _ = s.child.kill();
        let _ = s.child.wait();
        drop(s.stdin);
        if let Some(drain) = s.stderr_drain {
            let _ = drain.join();
        }
        let _ = std::fs::remove_file(&s.output_path);
    }
    Ok(())
}

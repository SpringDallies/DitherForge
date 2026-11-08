import { invoke } from '@tauri-apps/api/core';

export interface FfmpegStatus {
  ffmpeg_available: boolean;
  ffprobe_available: boolean;
  version: string | null;
  ffmpeg_path: string | null;
  ffprobe_path: string | null;
  package_manager: string | null;
  install_command: string | null;
  terminal_available: string | null;
  os: string;
}

export interface InstallResult {
  success: boolean;
  message: string;
  installed_path: string | null;
  command_used: string | null;
}

export interface VideoInfo {
  width: number;
  height: number;
  fps: number;
  duration: number;
  total_frames: number;
  has_audio: boolean;
  video_codec: string;
  audio_codec: string | null;
}

export interface VideoExportResult {
  success: boolean;
  output_path: string;
  format: string;
  duration: number;
  total_frames: number;
  file_size_bytes: number;
  elapsed_ms: number;
}

export interface NativeVideoExportRequest {
  input_video_path?: string | null;
  output_path: string;
  format: string; // 'mp4' | 'webm' | 'mov'
  fps?: number;
  duration: number;
  header: any;
  audio_sync?: boolean;
}

class FfmpegService {
  private cachedStatus: FfmpegStatus | null = null;
  private checkingStatus: Promise<FfmpegStatus> | null = null;

  /**
   * Checks whether the app is running inside a Tauri desktop environment.
   */
  public isTauri(): boolean {
    const w = typeof window !== 'undefined' ? (window as any) : {};
    return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
  }

  /**
   * Queries FFmpeg and ffprobe availability and system installation info.
   */
  public async getStatus(forceRefresh = false): Promise<FfmpegStatus> {
    if (!this.isTauri()) {
      return {
        ffmpeg_available: false,
        ffprobe_available: false,
        version: null,
        ffmpeg_path: null,
        ffprobe_path: null,
        package_manager: null,
        install_command: null,
        terminal_available: null,
        os: 'browser'
      };
    }

    if (this.cachedStatus && !forceRefresh) {
      return this.cachedStatus;
    }

    if (this.checkingStatus && !forceRefresh) {
      return this.checkingStatus;
    }

    this.checkingStatus = (async () => {
      try {
        const status = await invoke<FfmpegStatus>('check_ffmpeg_status');
        this.cachedStatus = status;
        return status;
      } catch (err) {
        console.warn('[FfmpegService] check_ffmpeg_status error:', err);
        const fallback: FfmpegStatus = {
          ffmpeg_available: false,
          ffprobe_available: false,
          version: null,
          ffmpeg_path: null,
          ffprobe_path: null,
          package_manager: null,
          install_command: null,
          terminal_available: null,
          os: 'unknown'
        };
        this.cachedStatus = fallback;
        return fallback;
      } finally {
        this.checkingStatus = null;
      }
    })();

    return this.checkingStatus;
  }

  /**
   * Quickly returns whether FFmpeg is available natively.
   */
  public async isAvailable(): Promise<boolean> {
    const status = await this.getStatus();
    return status.ffmpeg_available;
  }

  /**
   * Triggers the platform-specific FFmpeg installer.
   */
  public async install(): Promise<InstallResult> {
    if (!this.isTauri()) {
      throw new Error('In-app FFmpeg installation is only available in the desktop application.');
    }
    const res = await invoke<InstallResult>('install_ffmpeg_system');
    // Invalidate cached status to force re-detection
    this.cachedStatus = null;
    await this.getStatus(true);
    return res;
  }

  /**
   * Probes video metadata using native ffprobe.
   */
  public async probeVideo(videoPath: string): Promise<VideoInfo> {
    return await invoke<VideoInfo>('probe_video_native', { videoPath });
  }

  /**
   * Extracts a single RGBA frame at timestamp `timestampSec` from a local video file.
   */
  public async extractFrame(
    videoPath: string,
    timestampSec: number,
    targetWidth?: number,
    targetHeight?: number
  ): Promise<Uint8Array> {
    const raw = await invoke<number[]>('extract_video_frame_native', {
      videoPath,
      timestampSec,
      width: targetWidth,
      height: targetHeight
    });
    return new Uint8Array(raw);
  }

  /**
   * Runs the native streaming video export with full audio sync and bounded memory usage.
   */
  public async exportVideo(request: NativeVideoExportRequest): Promise<VideoExportResult> {
    return await invoke<VideoExportResult>('export_video_native_ffmpeg', { request });
  }

  /**
   * Starts an incremental frame-by-frame streaming encode session.
   */
  public async startStream(
    outputPath: string,
    format: string,
    width: number,
    height: number,
    fps: number,
    hasAudio = false,
    inputAudioPath?: string
  ): Promise<string> {
    return await invoke<string>('start_ffmpeg_stream', {
      outputPath,
      format,
      width,
      height,
      fps,
      hasAudio,
      inputAudioPath
    });
  }

  /**
   * Writes a raw RGBA frame to an active stream session.
   */
  public async writeStreamFrame(sessionId: string, frameBytes: Uint8Array | Uint8ClampedArray): Promise<void> {
    // Pass raw array buffer or numbers
    await invoke('write_ffmpeg_stream_frame', {
      sessionId,
      frameBytes: Array.from(frameBytes)
    });
  }

  /**
   * Finishes an active streaming session and closes FFmpeg stdin.
   */
  public async finishStream(sessionId: string): Promise<VideoExportResult> {
    return await invoke<VideoExportResult>('finish_ffmpeg_stream', { sessionId });
  }

  /**
   * Cancels and kills an active streaming session.
   */
  public async cancelStream(sessionId: string): Promise<void> {
    await invoke('cancel_ffmpeg_stream', { sessionId });
  }
}

export const ffmpegService = new FfmpegService();

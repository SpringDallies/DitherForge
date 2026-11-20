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

const textEncoder = new TextEncoder();
let streamPacketScratch = new Uint8Array(0);

/**
 * Packs a stream frame into a raw binary IPC packet:
 * [u32 LE sessionIdByteLen][UTF-8 sessionId][raw RGBA bytes]
 * Avoids Array.from() and multi-megabyte JSON serialization overhead per frame.
 */
export function packFfmpegStreamFramePacket(
  sessionId: string,
  frameBytes: Uint8Array | Uint8ClampedArray
): Uint8Array {
  const idBytes = textEncoder.encode(sessionId);
  const idLen = idBytes.byteLength;
  const totalLen = 4 + idLen + frameBytes.byteLength;

  if (streamPacketScratch.byteLength < totalLen) {
    streamPacketScratch = new Uint8Array(totalLen);
  }

  streamPacketScratch[0] = idLen & 0xff;
  streamPacketScratch[1] = (idLen >>> 8) & 0xff;
  streamPacketScratch[2] = (idLen >>> 16) & 0xff;
  streamPacketScratch[3] = (idLen >>> 24) & 0xff;
  streamPacketScratch.set(idBytes, 4);
  streamPacketScratch.set(
    new Uint8Array(frameBytes.buffer, frameBytes.byteOffset, frameBytes.byteLength),
    4 + idLen
  );

  return streamPacketScratch.subarray(0, totalLen);
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
   * Receives a raw binary Response (ArrayBuffer) from Tauri with zero JSON array overhead.
   */
  public async extractFrame(
    videoPath: string,
    timestampSec: number,
    targetWidth?: number,
    targetHeight?: number
  ): Promise<Uint8Array> {
    const raw = await invoke<ArrayBuffer | Uint8Array | number[]>('extract_video_frame_native', {
      videoPath,
      timestampSec,
      width: targetWidth,
      height: targetHeight
    });
    if (raw instanceof Uint8Array) return raw;
    if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
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
   * Writes a raw RGBA frame to an active stream session using InvokeBody::Raw binary IPC.
   */
  public async writeStreamFrame(sessionId: string, frameBytes: Uint8Array | Uint8ClampedArray): Promise<void> {
    const packet = packFfmpegStreamFramePacket(sessionId, frameBytes);
    await invoke('write_ffmpeg_stream_frame', packet);
  }

  /**
   * Finishes an active streaming session and closes FFmpeg stdin.
   */
  public async finishStream(sessionId: string): Promise<VideoExportResult> {
    try {
      return await invoke<VideoExportResult>('finish_ffmpeg_stream', { sessionId });
    } finally {
      // Release large stream scratch buffer once export session ends
      if (streamPacketScratch.byteLength > 1024 * 1024) {
        streamPacketScratch = new Uint8Array(0);
      }
    }
  }

  /**
   * Cancels and kills an active streaming session.
   */
  public async cancelStream(sessionId: string): Promise<void> {
    try {
      await invoke('cancel_ffmpeg_stream', { sessionId });
    } finally {
      if (streamPacketScratch.byteLength > 1024 * 1024) {
        streamPacketScratch = new Uint8Array(0);
      }
    }
  }
}

export const ffmpegService = new FfmpegService();

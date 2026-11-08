import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Terminal, Download, Copy, Check, RefreshCw } from 'lucide-react';
import { ffmpegService, FfmpegStatus } from '../../services/ffmpegService';

interface FfmpegInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: FfmpegStatus | null;
  onRefresh: () => Promise<void>;
}

export const FfmpegInstallModal: React.FC<FfmpegInstallModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefresh
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  if (!isOpen) return null;

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleRunInstaller = async () => {
    setIsInstalling(true);
    setInstallMessage(null);
    setInstallError(null);
    try {
      const res = await ffmpegService.install();
      if (res.success) {
        setInstallMessage(res.message);
        await onRefresh();
      } else {
        setInstallError(res.message);
      }
    } catch (err: any) {
      setInstallError(err?.message || 'Failed to launch installer');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleCheckAgain = async () => {
    setIsChecking(true);
    try {
      await onRefresh();
    } finally {
      setIsChecking(false);
    }
  };

  const isInstalled = Boolean(status?.ffmpeg_available && status?.ffprobe_available);
  const isWindows = status?.os === 'windows';
  const installCmd =
    status?.install_command ||
    (isWindows ? 'winget install -e --id Gyan.FFmpeg' : 'sudo apt install ffmpeg');

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '540px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              Native Video Engine (FFmpeg)
            </h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
            style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isInstalled ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '16px',
                background: 'color-mix(in srgb, var(--status-success, #22c55e) 10%, transparent)',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid color-mix(in srgb, var(--status-success, #22c55e) 30%, transparent)'
              }}
            >
              <CheckCircle size={36} style={{ color: 'var(--status-success, #22c55e)', marginBottom: '10px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                FFmpeg &amp; ffprobe are Active
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                {status?.version || 'FFmpeg version installed'}
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginTop: '8px',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {status?.ffmpeg_path}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '12px', lineHeight: 1.4 }}>
                Native video streaming, H.264 / VP9 encoding, and pristine audio synchronization are active.
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.45 }}>
                FFmpeg is recommended for optimal performance in Animation Mode, providing high-speed video decoding, H.264/VP9 encoding, and audio synchronization.
              </div>

              {/* Install Instructions Card */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)' }}>
                  {isWindows ? 'Recommended Installation (WinGet)' : `Package Manager (${status?.package_manager || 'Linux'})`}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-primary)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs, 4px)',
                    border: '1px solid var(--border-color)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    color: 'var(--text-main)'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                    {installCmd}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCommand(installCmd)}
                    title="Copy command"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: isCopied ? 'var(--status-success, #22c55e)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px 4px'
                    }}
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Primary Action Button */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="unified-pill-btn"
                    disabled={isInstalling}
                    onClick={handleRunInstaller}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '8px 14px'
                    }}
                  >
                    <Download size={14} />
                    {isInstalling
                      ? 'Installing...'
                      : isWindows
                      ? 'Install with WinGet'
                      : status?.terminal_available
                      ? `Install via Terminal (${status.terminal_available})`
                      : 'Launch Installer'}
                  </button>

                  <button
                    type="button"
                    className="btn-default"
                    disabled={isChecking}
                    onClick={handleCheckAgain}
                    title="Check if FFmpeg was installed"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={13} className={isChecking ? 'spin' : ''} />
                    Check Status
                  </button>
                </div>

                {isWindows && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    WinGet unavailable?{' '}
                    <a
                      href="https://www.gyan.dev/ffmpeg/builds/"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                    >
                      Download Gyan FFmpeg manually
                    </a>
                  </div>
                )}
              </div>

              {/* Status / Output Messages */}
              {installMessage && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--status-success, #22c55e)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs, 4px)',
                    background: 'color-mix(in srgb, var(--status-success, #22c55e) 12%, transparent)'
                  }}
                >
                  {installMessage}
                </div>
              )}

              {installError && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--status-danger, #ef4444)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs, 4px)',
                    background: 'color-mix(in srgb, var(--status-danger, #ef4444) 12%, transparent)'
                  }}
                >
                  {installError}
                </div>
              )}

              {/* Fallback Notice */}
              <div
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '12px',
                  lineHeight: 1.4
                }}
              >
                <strong>Browser Fallback:</strong> If FFmpeg is not installed, DitherForge will automatically use the built-in browser video engine (Canvas + MediaRecorder). FFmpeg is not required for normal image editing.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-tertiary)'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {isInstalled ? 'Backend: Native FFmpeg' : 'Backend: Browser Fallback'}
          </span>
          <button
            type="button"
            className="btn-default"
            onClick={onClose}
            style={{ padding: '6px 14px', cursor: 'pointer' }}
          >
            {isInstalled ? 'Done' : 'Continue with Browser Fallback'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

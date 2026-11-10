import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Video, Terminal, Download, Copy, Check, RefreshCw } from 'lucide-react';
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

  // Proactively fetch/refresh status whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setIsChecking(true);
    onRefresh().finally(() => {
      setIsChecking(false);
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    (isWindows ? 'winget install -e --id Gyan.FFmpeg' : 'sudo dnf install -y ffmpeg');

  const pkgLabel = status?.package_manager
    ? status.package_manager.toUpperCase()
    : isWindows
    ? 'WINGET'
    : 'LINUX';

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog ffmpeg-modal"
        style={{ maxWidth: '520px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ffmpeg-modal-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={16} style={{ color: 'var(--text-dim)' }} />
            <span id="ffmpeg-modal-title" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Native Video Engine (FFmpeg)
            </span>
          </div>
          <button className="tool-icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {status === null && isChecking ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 20px', gap: '12px' }}>
              <RefreshCw size={22} className="spin" style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Detecting FFmpeg installation...
              </div>
            </div>
          ) : isInstalled ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={22} style={{ color: '#4ade80', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    FFmpeg &amp; ffprobe are Active
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {status?.version ? status.version.split('\n')[0] : 'Installed and operational'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-xs, 4px)',
                  border: '1px solid var(--border-color)',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.74rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-dim)' }}>ffmpeg binary:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                    {status?.ffmpeg_path || '/usr/bin/ffmpeg'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-dim)' }}>ffprobe binary:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                    {status?.ffprobe_path || '/usr/bin/ffprobe'}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.45 }}>
                Native video streaming, H.264 / VP9 encoding, and audio synchronization are active and hardware-accelerated.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button
                  type="button"
                  className="btn-default"
                  disabled={isChecking}
                  onClick={handleCheckAgain}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <RefreshCw size={12} className={isChecking ? 'spin' : ''} />
                  Re-check Status
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.45 }}>
                FFmpeg is recommended for optimal video decoding and encoding in Animation Mode, providing high-speed frame extraction and audio synchronization.
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
                <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)' }}>
                  PACKAGE MANAGER ({pkgLabel})
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

                {/* Primary Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  {status?.terminal_available ? (
                    <button
                      type="button"
                      className="btn-default"
                      disabled={isInstalling}
                      onClick={handleRunInstaller}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        fontSize: '0.78rem'
                      }}
                    >
                      <Terminal size={14} />
                      {isInstalling ? 'Launching...' : `Run in ${status.terminal_available}`}
                    </button>
                  ) : isWindows ? (
                    <button
                      type="button"
                      className="btn-default"
                      disabled={isInstalling}
                      onClick={handleRunInstaller}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        fontSize: '0.78rem'
                      }}
                    >
                      <Download size={14} />
                      {isInstalling ? 'Installing...' : 'Install via WinGet'}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="btn-default"
                    disabled={isChecking}
                    onClick={handleCheckAgain}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '0.78rem'
                    }}
                  >
                    <RefreshCw size={13} className={isChecking ? 'spin' : ''} />
                    Check Status
                  </button>
                </div>

                {isWindows && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Manual download:{' '}
                    <a
                      href="https://www.gyan.dev/ffmpeg/builds/"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                    >
                      gyan.dev/ffmpeg/builds
                    </a>
                  </div>
                )}
              </div>

              {/* Status / Output Messages */}
              {installMessage && (
                <div
                  style={{
                    fontSize: '0.76rem',
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
                    fontSize: '0.76rem',
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
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '10px',
                  lineHeight: 1.4
                }}
              >
                <strong>Browser Fallback:</strong> If FFmpeg is not installed, DitherForge will automatically use the built-in browser engine (Canvas + MediaRecorder). FFmpeg is not required for normal image editing.
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
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Backend: {isInstalled ? 'Native FFmpeg' : 'Browser Fallback'}
          </span>
          <button
            type="button"
            className="btn-default"
            onClick={onClose}
            style={{ padding: '4px 14px', fontSize: '0.8rem' }}
          >
            {isInstalled ? 'Done' : 'Continue with Browser Fallback'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

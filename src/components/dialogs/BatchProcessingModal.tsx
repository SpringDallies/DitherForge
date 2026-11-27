/**
 * BatchProcessingModal.tsx
 * Allows users to drop/select multiple image files, choose format and scale,
 * run dither batch processing using the active algorithm and palette,
 * and download the results as a single ZIP archive.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../state/useAppStore';
import { runBatchProcessing } from '../../utils/batchProcessing';
import { Dropdown } from '../common/Dropdown';
import { TerminalWindow } from '../common/TerminalWindow';
import { getStoredSettings } from './SettingsDialog';
// @ts-ignore
import { ALGORITHM_REGISTRY } from '../../dither-engine/algorithms.js';
import { LEGACY_ALGORITHM_REGISTRY } from '../../algorithms/legacy';
import {
  X,
  UploadCloud,
  FileImage,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Layers,
  Sparkles
} from 'lucide-react';

interface BatchProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_ALGORITHMS: any[] = [...ALGORITHM_REGISTRY, ...LEGACY_ALGORITHM_REGISTRY];

export const BatchProcessingModal: React.FC<BatchProcessingModalProps> = ({
  isOpen,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [scale, setScale] = useState<1 | 2 | 4>(1);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState<number>(0.92);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uiSkin, setUiSkin] = useState<string>(() => {
    try {
      return getStoredSettings().uiSkin || 'default';
    } catch {
      return 'default';
    }
  });
  useEffect(() => {
    const syncSkin = () => setUiSkin(getStoredSettings().uiSkin || 'default');
    window.addEventListener('ditherforge_settings_changed', syncSkin);
    return () => window.removeEventListener('ditherforge_settings_changed', syncSkin);
  }, []);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; filename: string }>({
    current: 0,
    total: 0,
    filename: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [completedZipBlob, setCompletedZipBlob] = useState<Blob | null>(null);
  const [openBatchMenu, setOpenBatchMenu] = useState<'scale' | 'format' | null>(null);

  useEffect(() => {
    if (isOpen) setOpenBatchMenu(null);
  }, [isOpen]);

  useEffect(() => {
    if (!openBatchMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.export-exe-opt-wrap')) {
        setOpenBatchMenu(null);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [openBatchMenu]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const storeState = useAppStore();

  // Escape key closes modal (only when not actively processing)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  const handleFilesSelected = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const validFiles: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      if (f.type.startsWith('image/')) {
        validFiles.push(f);
      }
    }
    setFiles((prev) => [...prev, ...validFiles]);
    setCompletedZipBlob(null);
    setError(null);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setCompletedZipBlob(null);
  };

  const handleClearAll = () => {
    setFiles([]);
    setCompletedZipBlob(null);
    setError(null);
  };

  const handleStartBatch = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setCompletedZipBlob(null);
    setProgress({ current: 0, total: files.length, filename: '' });

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const result = await runBatchProcessing({
        files,
        scale,
        format,
        quality,
        state: storeState,
        signal: abortCtrl.signal,
        onProgress: (current, total, filename) => {
          setProgress({ current, total, filename });
        }
      });

      setCompletedZipBlob(result.zipBlob);

      // Auto-trigger download of the ZIP archive
      const url = URL.createObjectURL(result.zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ditherforge_batch_${storeState.algorithmId}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err.message?.includes('aborted')) {
        setError('Batch processing was canceled.');
      } else {
        setError(err.message || 'Error occurred during batch processing.');
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  const currentAlgo = ALL_ALGORITHMS.find((a: any) => a.id === storeState.algorithmId);
  const algoName = currentAlgo?.name || storeState.algorithmId;
  const activeEffectsCount = Array.isArray(storeState.effects)
    ? storeState.effects.filter((e: any) => e.enabled).length
    : 0;

  const isTerminal = uiSkin === 'terminal';

  const batchContent = (
    <>
        {/* Modal Body */}
        <div className="modal-body" style={{ padding: isTerminal ? '0' : '16px 20px' }}>
          {/* Active Settings Context Banner */}
          <div className="batch-info-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <Sparkles size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Active Pipeline:</span>
              <span className="batch-info-tag">{algoName}</span>
            </div>
            {activeEffectsCount > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', flexShrink: 0 }}>
                +{activeEffectsCount} effect{activeEffectsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* File Dropzone */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isProcessing) setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (!isProcessing) handleFilesSelected(e.dataTransfer.files);
            }}
            className={`batch-dropzone ${isDragOver ? 'drag-active' : ''} ${isProcessing ? 'disabled' : ''}`}
          >
            <UploadCloud size={uiSkin === 'terminal' ? 20 : 32} className="batch-dropzone-icon" />
            <div className="batch-dropzone-title">
              {uiSkin === 'terminal' ? 'Drop images or click' : 'Click or drag & drop images here'}
            </div>
            {uiSkin !== 'terminal' && (
              <div className="batch-dropzone-hint">PNG, JPEG, WebP, GIF supported</div>
            )}
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="batch-files-container">
              <div className="batch-files-header">
                <span>Selected Images ({files.length})</span>
                {!isProcessing && (
                  <button
                    onClick={handleClearAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-crimson, #f87171)',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trash2 size={12} />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              <div className="batch-files-list">
                {files.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="batch-file-item">
                    <div className="batch-file-info">
                      <FileImage size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                      <span className="batch-file-name">{file.name}</span>
                      <span className="batch-file-size">({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    {!isProcessing && (
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="tool-icon-btn"
                        style={{ width: '22px', height: '22px', padding: 0 }}
                        title="Remove file"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Settings Grid */}
          <div className="batch-form-grid">
            <div className="batch-form-group">
              <label className="batch-form-label">{uiSkin === 'terminal' ? 'Format' : 'Output Format'}</label>
              <Dropdown
                id="batch-format-dropdown"
                value={format}
                onChange={(val) => setFormat(val as 'png' | 'jpeg' | 'webp')}
                width="100%"
                disabled={isProcessing}
                items={
                  uiSkin === 'terminal'
                    ? [
                        { id: 'png', label: 'PNG' },
                        { id: 'jpeg', label: 'JPEG' },
                        { id: 'webp', label: 'WebP' }
                      ]
                    : [
                        { id: 'png', label: 'PNG (Lossless)', hint: 'Best fidelity' },
                        { id: 'jpeg', label: 'JPEG (Compressed)', hint: 'Smaller files' },
                        { id: 'webp', label: 'WebP (Modern)', hint: 'High efficiency' }
                      ]
                }
              />
            </div>

            <div className="batch-form-group">
              <label className="batch-form-label">{uiSkin === 'terminal' ? 'Scale' : 'Resolution Scale'}</label>
              <Dropdown
                id="batch-scale-dropdown"
                value={String(scale)}
                onChange={(val) => setScale(Number(val) as 1 | 2 | 4)}
                width="100%"
                disabled={isProcessing}
                items={
                  uiSkin === 'terminal'
                    ? [
                        { id: '1', label: '1x' },
                        { id: '2', label: '2x' },
                        { id: '4', label: '4x' }
                      ]
                    : [
                        { id: '1', label: '1x (Original Size)' },
                        { id: '2', label: '2x (High Res)' },
                        { id: '4', label: '4x (Ultra HD)' }
                      ]
                }
              />
            </div>
          </div>

          {/* Quality Slider (for JPEG / WebP) */}
          {format !== 'png' && (
            <div style={{ marginTop: '14px' }}>
              <div className="batch-slider-row">
                <span className="batch-form-label" style={{ marginBottom: 0 }}>Compression Quality</span>
                <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: 600 }}>
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                className="control-slider"
                min="10"
                max="100"
                step="1"
                value={Math.round(quality * 100)}
                disabled={isProcessing}
                style={{
                  '--slider-fill': `${((quality * 100 - 10) / 90) * 100}%`
                } as React.CSSProperties}
                onChange={(e) => setQuality(Number(e.target.value) / 100)}
              />
            </div>
          )}

          {/* In-Progress Status Bar */}
          {isProcessing && (
            <div className="batch-progress-card">
              <div className="batch-progress-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-main)' }}>
                  <Loader2 size={14} className="batch-spin" style={{ color: 'var(--accent-primary)' }} />
                  <span>Processing {progress.current} of {progress.total}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {Math.round((progress.current / (progress.total || 1)) * 100)}%
                </span>
              </div>
              <div className="batch-progress-bar-bg">
                <div
                  className="batch-progress-bar-fill"
                  style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                />
              </div>
              {progress.filename && (
                <div className="batch-progress-filename">
                  Current: {progress.filename}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="batch-error-banner">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {completedZipBlob && !isProcessing && (
            <div className="batch-success-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={15} style={{ flexShrink: 0 }} />
                <span>Batch complete! ZIP downloaded successfully.</span>
              </div>
              <button
                onClick={() => {
                  const url = URL.createObjectURL(completedZipBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ditherforge_batch_${storeState.algorithmId}_${Date.now()}.zip`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  textDecoration: 'underline',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Download size={12} />
                <span>Download Again</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="batch-footer-actions">
          {isProcessing ? (
            <button
              onClick={handleCancel}
              className="btn-default"
              style={{ color: 'var(--accent-crimson, #f87171)', borderColor: 'var(--border-color)' }}
            >
              Cancel Batch
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="btn-default"
                style={{ minWidth: '80px' }}
              >
                Close
              </button>
              <button
                onClick={handleStartBatch}
                disabled={files.length === 0}
                className="btn-primary"
                style={{
                  width: 'auto',
                  minWidth: '180px',
                  background: files.length > 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: files.length > 0 ? 'var(--text-on-accent, #ffffff)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 'var(--radius-pill, 999px)',
                  fontWeight: 600
                }}
              >
                <Download size={14} />
                <span>
                  {isTerminal ? `Export ZIP (${files.length})` : `Process & Download ZIP (${files.length})`}
                </span>
              </button>
            </>
          )}
        </div>
    </>
  );

  if (isTerminal) {
    const formatLabel = format === 'jpeg' ? 'JPG' : format === 'webp' ? 'WebP' : 'PNG';
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
      <TerminalWindow
        title="Batch.exe"
        isOpen={isOpen}
        onClose={() => {
          if (!isProcessing) onClose();
        }}
        defaultSize={{ w: 430, h: 270 }}
        minSize={{ w: 320, h: 220 }}
        disableResize={openBatchMenu !== null}
        className="df-tw-scroll df-settings-exe"
        dataModal="batch"
        ariaLabelledBy="batch-dialog-title"
      >
        <div className="batch-exe-wrap">
          <div className="settings-exe-row" style={{ marginBottom: '12px' }}>
            <span className="settings-exe-label">Active Pipeline</span>
            <span className="settings-exe-dots" />
            <span className="settings-exe-readonly">
              {algoName}{activeEffectsCount > 0 ? ` +${activeEffectsCount} fx` : ''}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = '';
            }}
          />

          <div
            className={`batch-exe-dropzone ${isDragOver ? 'drag-over' : ''}`}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isProcessing) setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (!isProcessing) handleFilesSelected(e.dataTransfer.files);
            }}
          >
            Drop images or click
          </div>

          {files.length > 0 && (
            <div className="settings-exe-scroll" style={{ marginTop: '10px', maxHeight: '140px' }}>
              {files.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="settings-exe-row" style={{ marginBottom: '6px' }}>
                  <span className="settings-exe-label" style={{ maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {file.name}
                  </span>
                  <span className="settings-exe-dots" />
                  <span className="settings-exe-readonly" style={{ fontSize: '12px', marginRight: '8px' }}>
                    {(file.size / 1024).toFixed(0)}KB
                  </span>
                  {!isProcessing && (
                    <button
                      type="button"
                      className="settings-exe-btn"
                      style={{ height: 'auto', padding: 0, fontSize: '12px' }}
                      onClick={() => handleRemoveFile(idx)}
                      aria-label={`Remove ${file.name}`}
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
              {!isProcessing && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="button" className="settings-exe-btn muted" onClick={handleClearAll}>
                    Clear All
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ fontSize: '12px', color: '#f87171', marginTop: '8px' }}>
              {error}
            </div>
          )}

          {completedZipBlob && !isProcessing && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--tm-text-muted)' }}>
              <span>Batch complete</span>
              <button
                type="button"
                className="settings-exe-link"
                style={{ fontSize: '12px' }}
                onClick={() => {
                  const url = URL.createObjectURL(completedZipBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ditherforge_batch_${storeState.algorithmId}_${Date.now()}.zip`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                Download Again
              </button>
            </div>
          )}

          <div
            className={`export-exe-action-bar ${files.length === 0 && !isProcessing ? 'disabled' : ''}`}
            style={{ marginTop: 'auto' }}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (isProcessing) {
                handleCancel();
              } else if (files.length > 0) {
                void handleStartBatch();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isProcessing) handleCancel();
                else if (files.length > 0) void handleStartBatch();
              }
            }}
          >
            <span className="export-exe-btn">
              {isProcessing ? `Cancel (${pct}%)` : `Export ZIP (${files.length})`}
            </span>

            {!isProcessing && (
              <div className="export-exe-options">
                <div className="export-exe-opt-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="export-exe-opt-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenBatchMenu((cur) => (cur === 'scale' ? null : 'scale'));
                    }}
                  >
                    {scale}x
                  </button>
                  {openBatchMenu === 'scale' && (
                    <div className="export-exe-opt-menu">
                      {([1, 2, 4] as const).map((sc) => (
                        <button
                          key={sc}
                          type="button"
                          className={`export-exe-opt-item ${scale === sc ? 'active' : ''}`}
                          onClick={() => {
                            setScale(sc);
                            setOpenBatchMenu(null);
                          }}
                        >
                          <span>{sc}x</span>
                          {scale === sc && <span>*</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="export-exe-opt-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="export-exe-opt-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenBatchMenu((cur) => (cur === 'format' ? null : 'format'));
                    }}
                  >
                    {formatLabel}
                  </button>
                  {openBatchMenu === 'format' && (
                    <div className="export-exe-opt-menu">
                      {([
                        { id: 'png', label: 'PNG' },
                        { id: 'jpeg', label: 'JPG' },
                        { id: 'webp', label: 'WebP' }
                      ] as const).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`export-exe-opt-item ${format === opt.id ? 'active' : ''}`}
                          onClick={() => {
                            setFormat(opt.id);
                            setOpenBatchMenu(null);
                          }}
                        >
                          <span>{opt.label}</span>
                          {format === opt.id && <span>*</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </TerminalWindow>
    );
  }

  return createPortal(
    <div
      className="modal-backdrop"
      style={{
        background: 'rgba(0, 0, 0, 0.70)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={() => {
        if (!isProcessing) onClose();
      }}
    >
      <div
        className="modal-dialog batch-dialog"
        data-df-modal="batch"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-dialog-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={18} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <div id="batch-dialog-title" style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                Batch Image Processing
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Process multiple images simultaneously using your active settings
              </div>
            </div>
          </div>
          <button
            className="tool-icon-btn"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close"
            style={{ opacity: isProcessing ? 0.4 : 1 }}
          >
            <X size={16} />
          </button>
        </div>
        {batchContent}
      </div>
    </div>,
    document.body
  );
};

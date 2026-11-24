/**
 * BatchProcessingModal.tsx
 * Allows users to drop/select multiple image files, choose format and scale,
 * run dither batch processing, and download the results as a single ZIP archive.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../../state/useAppStore';
import { runBatchProcessing } from '../../utils/batchProcessing';
import {
  X,
  UploadCloud,
  FileImage,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download
} from 'lucide-react';

interface BatchProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchProcessingModal: React.FC<BatchProcessingModalProps> = ({
  isOpen,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [scale, setScale] = useState<1 | 2 | 4>(1);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState<number>(0.92);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; filename: string }>({
    current: 0,
    total: 0,
    filename: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [completedZipBlob, setCompletedZipBlob] = useState<Blob | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const storeState = useAppStore();

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

      // Auto-trigger download of the ZIP
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.15s ease-out' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div
        className="w-full max-w-xl bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl shadow-2xl flex flex-col overflow-hidden text-[var(--text-color)]"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--surface-header)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Batch Image Processing
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Apply active dithering settings ({storeState.algorithmId}) to multiple images
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* File Dropzone */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <div
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!isProcessing) handleFilesSelected(e.dataTransfer.files);
              }}
              className={`border-2 border-dashed border-[var(--border-color)] rounded-xl p-6 text-center cursor-pointer hover:border-[var(--accent-color)] hover:bg-[var(--surface-hover)] transition-all ${
                isProcessing ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <UploadCloud size={32} className="mx-auto text-[var(--text-secondary)] mb-2" />
              <div className="text-sm font-medium text-[var(--text-primary)]">
                Click or drag & drop images here
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                PNG, JPEG, WebP, GIF supported
              </div>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                <span>Selected Images ({files.length})</span>
                {!isProcessing && (
                  <button
                    onClick={handleClearAll}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-36 overflow-y-auto divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg bg-[var(--surface-bg)]">
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between px-3 py-2 text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <FileImage size={14} className="text-[var(--text-secondary)] flex-shrink-0" />
                      <span className="truncate text-[var(--text-primary)]">{file.name}</span>
                      <span className="text-[var(--text-secondary)] flex-shrink-0">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    {!isProcessing && (
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Options */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Output Format
              </label>
              <select
                value={format}
                disabled={isProcessing}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full bg-[var(--surface-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-color)]"
              >
                <option value="png">PNG (Lossless)</option>
                <option value="jpeg">JPEG (Compressed)</option>
                <option value="webp">WebP (Modern)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Resolution Scale
              </label>
              <select
                value={scale}
                disabled={isProcessing}
                onChange={(e) => setScale(Number(e.target.value) as any)}
                className="w-full bg-[var(--surface-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-color)]"
              >
                <option value="1">1x (Original)</option>
                <option value="2">2x (High Res)</option>
                <option value="4">4x (Ultra HD)</option>
              </select>
            </div>
          </div>

          {/* Quality Slider for JPEG / WebP */}
          {format !== 'png' && (
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
                <span>Quality</span>
                <span className="font-mono">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.01"
                value={quality}
                disabled={isProcessing}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full h-1 bg-[var(--surface-input)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]"
              />
            </div>
          )}

          {/* Progress / Status Display */}
          {isProcessing && (
            <div className="bg-[var(--surface-input)] border border-[var(--border-color)] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center space-x-2 text-[var(--text-primary)] font-medium">
                  <Loader2 size={14} className="animate-spin text-[var(--accent-color)]" />
                  <span>Processing {progress.current} of {progress.total}</span>
                </span>
                <span className="text-[var(--text-secondary)] font-mono">
                  {Math.round((progress.current / (progress.total || 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-[var(--border-color)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--accent-color)] h-full transition-all duration-200"
                  style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] truncate">
                {progress.filename}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-3 rounded-lg">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {completedZipBlob && !isProcessing && (
            <div className="flex items-center justify-between text-xs text-green-400 bg-green-400/10 border border-green-400/20 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle size={15} className="flex-shrink-0" />
                <span>Batch complete! ZIP downloaded.</span>
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
                className="flex items-center space-x-1 underline hover:text-green-300"
              >
                <Download size={12} />
                <span>Download Again</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 px-5 py-4 border-t border-[var(--border-color)] bg-[var(--surface-header)]">
          {isProcessing ? (
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleStartBatch}
                disabled={files.length === 0}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-color)] text-white hover:brightness-110 active:brightness-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download size={14} />
                <span>Process & Download ZIP ({files.length})</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Copy, Check } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
// @ts-ignore
import { exportRaster, copyCanvasToClipboard, exportCharacterGrid, exportSvgContours } from '../../dither-engine/exporters.js';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'image' | 'text' | 'vector';
type ImageFormat = 'png' | 'jpg' | 'webp';
type CharSetType = 'ascii' | 'blocks' | 'braille';

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('image');

  // Image tab state
  const [format, setFormat] = useState<ImageFormat>('png');
  const [quality, setQuality] = useState<number>(0.92);
  const [filename, setFilename] = useState<string>('ditherforge_export');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Text tab state
  const [charSet, setCharSet] = useState<CharSetType>('ascii');
  const [cellWidth, setCellWidth] = useState<number>(6);
  const [cellHeight, setCellHeight] = useState<number>(12);

  // Canvas refs
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Get active canvas from viewport
  const getSourceCanvas = (): HTMLCanvasElement | null => {
    return (document.getElementById('mainViewportCanvas') as HTMLCanvasElement) ||
           (document.querySelector('canvas.preview-canvas') as HTMLCanvasElement) ||
           null;
  };

  // Reset tab to 'image' and read settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('image');
      setIsCopied(false);
      setCopyError(null);

      // Read default format from ditherforge_settings in localStorage
      try {
        const stored = localStorage.getItem('ditherforge_settings');
        if (stored) {
          const settings = JSON.parse(stored);
          if (settings.defaultExportFormat && ['png', 'jpg', 'webp'].includes(settings.defaultExportFormat)) {
            setFormat(settings.defaultExportFormat);
          }
        }
      } catch (e) {
        // Fallback default format is 'png'
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Render Image Preview on Canvas
  useEffect(() => {
    if (!isOpen || activeTab !== 'image') return;
    const sourceCanvas = getSourceCanvas();
    const previewCanvas = previewCanvasRef.current;
    if (!sourceCanvas || !previewCanvas) return;

    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    if (srcW === 0 || srcH === 0) return;

    const maxW = 580;
    const maxH = 190;
    const scale = Math.min(maxW / srcW, maxH / srcH, 1.0);

    const destW = Math.round(srcW * scale);
    const destH = Math.round(srcH * scale);

    previewCanvas.width = destW;
    previewCanvas.height = destH;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas, 0, 0, destW, destH);
  }, [isOpen, activeTab]);

  // Generate Text Preview (first ~10 lines without triggering file download)
  const textPreview = useMemo(() => {
    if (!isOpen || activeTab !== 'text') return '';
    const sourceCanvas = getSourceCanvas();
    if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) {
      return '(No active image loaded in viewport)';
    }

    try {
      const ctx = sourceCanvas.getContext('2d');
      if (!ctx) return '';
      const width = sourceCanvas.width;
      const height = sourceCanvas.height;
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      const ASCII_RAMP = " .:-=+*#%@";
      const BLOCK_RAMP = " ░▒▓█";

      let resultText = "";

      if (charSet === "braille") {
        const bCols = Math.min(80, Math.floor(width / 2));
        const bRows = Math.min(10, Math.floor(height / 4));

        for (let by = 0; by < bRows; by++) {
          let line = "";
          for (let bx = 0; bx < bCols; bx++) {
            let code = 0x2800;
            const dots = [
              [0, 0, 0x01], [0, 1, 0x02], [0, 2, 0x04],
              [1, 0, 0x08], [1, 1, 0x10], [1, 2, 0x20],
              [0, 3, 0x40], [1, 3, 0x80]
            ];
            for (let d = 0; d < dots.length; d++) {
              const px = bx * 2 + dots[d][0];
              const py = by * 4 + dots[d][1];
              if (px < width && py < height) {
                const idx = (py * width + px) * 4;
                const luma = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
                if (luma > 128) code |= dots[d][2];
              }
            }
            line += String.fromCharCode(code);
          }
          resultText += line + "\n";
        }
      } else {
        const ramp = charSet === "blocks" ? BLOCK_RAMP : ASCII_RAMP;
        const cW = Math.max(1, cellWidth);
        const cH = Math.max(1, cellHeight);
        const cols = Math.min(80, Math.floor(width / cW));
        const rows = Math.min(10, Math.floor(height / cH));

        for (let r = 0; r < rows; r++) {
          let line = "";
          for (let c = 0; c < cols; c++) {
            let lumaSum = 0;
            let count = 0;
            for (let dy = 0; dy < cH; dy++) {
              for (let dx = 0; dx < cW; dx++) {
                const px = c * cW + dx;
                const py = r * cH + dy;
                if (px < width && py < height) {
                  const idx = (py * width + px) * 4;
                  lumaSum += 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
                  count++;
                }
              }
            }
            const avgLuma = count > 0 ? lumaSum / count : 0;
            const rampIdx = Math.floor((avgLuma / 256) * ramp.length);
            line += ramp[Math.min(ramp.length - 1, Math.max(0, rampIdx))];
          }
          resultText += line + "\n";
        }
      }

      return resultText || '(Empty output)';
    } catch (e) {
      return '(Preview generation error)';
    }
  }, [isOpen, activeTab, charSet, cellWidth, cellHeight]);

  // Generate Vector SVG Header Preview
  const vectorPreview = useMemo(() => {
    if (!isOpen || activeTab !== 'vector') return '';
    const sourceCanvas = getSourceCanvas();
    if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) {
      return '(No active image loaded in viewport)';
    }
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <g shape-rendering="crispEdges">
    <rect x="0" y="0" ...`;
  }, [isOpen, activeTab]);

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    const canvas = getSourceCanvas();
    if (!canvas) {
      setCopyError('No canvas available to copy');
      return;
    }
    try {
      setCopyError(null);
      await copyCanvasToClipboard(canvas);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err: any) {
      setCopyError(err?.message || 'Failed to copy to clipboard');
    }
  };

  // Handle Image Export
  const handleExportImage = () => {
    const canvas = getSourceCanvas();
    if (!canvas) return;

    // Trigger export
    exportRaster(canvas, format, quality, filename);

    // Write back defaultExportFormat to localStorage
    try {
      const stored = localStorage.getItem('ditherforge_settings');
      const settings = stored ? JSON.parse(stored) : {};
      localStorage.setItem('ditherforge_settings', JSON.stringify({
        ...settings,
        defaultExportFormat: format
      }));
    } catch (e) {
      // Storage error ignored
    }

    onClose();
  };

  // Handle Text Export
  const handleExportText = () => {
    const canvas = getSourceCanvas();
    if (!canvas) return;
    exportCharacterGrid(canvas, charSet, Math.max(1, cellWidth), Math.max(1, cellHeight));
    onClose();
  };

  // Handle Vector Export
  const handleExportVector = () => {
    const canvas = getSourceCanvas();
    if (!canvas) return;
    exportSvgContours(canvas);
    onClose();
  };

  if (!isOpen) return null;

  const hasSourceCanvas = Boolean(getSourceCanvas());

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="export-dialog" 
        onClick={(e) => e.stopPropagation()} 
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} style={{ color: 'var(--text-dim)' }} />
            <span id="export-dialog-title" style={{ fontWeight: 600, fontSize: '0.95rem' }}>Export</span>
          </div>
          <Tooltip text="Close dialog">
            <button className="tool-icon-btn" onClick={onClose} aria-label="Close dialog">
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        {/* Tab Navigation */}
        <div className="export-tabs">
          <button 
            className={`export-tab-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            Image
          </button>
          <button 
            className={`export-tab-btn ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            Text
          </button>
          <button 
            className={`export-tab-btn ${activeTab === 'vector' ? 'active' : ''}`}
            onClick={() => setActiveTab('vector')}
          >
            Vector
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '16px 20px' }}>
          {/* TAB 1: IMAGE */}
          {activeTab === 'image' && (
            <div>
              <div className="export-form-row">
                <label className="export-form-label" htmlFor="export-image-format">Format</label>
                <div className="export-form-control">
                  <select 
                    id="export-image-format"
                    className="export-select"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as ImageFormat)}
                  >
                    <option value="png">PNG (Lossless 24/32-bit)</option>
                    <option value="jpg">JPG (Web Compressed)</option>
                    <option value="webp">WebP (Modern Lightweight)</option>
                  </select>
                </div>
              </div>

              {format === 'jpg' && (
                <div 
                  className="export-transparency-hint" 
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted, #D8D8D8)',
                    marginBottom: '12px',
                    padding: '6px 10px',
                    background: 'color-mix(in srgb, var(--status-warning) 12%, transparent)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  💡 <strong>Transparency Notice:</strong> JPEG does not support alpha channels. Transparent areas will be flattened to black. Use <strong>PNG</strong> to preserve transparent pixels.
                </div>
              )}

              {(format === 'jpg' || format === 'webp') && (
                <div className="export-form-row">
                  <label className="export-form-label" htmlFor="export-image-quality">Quality</label>
                  <div className="export-form-control" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      id="export-image-quality"
                      type="range"
                      className="slider"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <div 
                      className="slider-value-box"
                      style={{ width: '48px', textAlign: 'center', height: '28px', lineHeight: '26px' }}
                    >
                      {Math.round(quality * 100)}
                    </div>
                  </div>
                </div>
              )}

              <div className="export-form-row">
                <label className="export-form-label" htmlFor="export-image-filename">Filename</label>
                <div className="export-form-control">
                  <input 
                    id="export-image-filename"
                    type="text"
                    className="export-input"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="ditherforge_export"
                  />
                </div>
              </div>

              <div className="export-preview-container">
                <div className="export-preview-label">Preview:</div>
                <div className="export-preview-box">
                  {hasSourceCanvas ? (
                    <canvas 
                      ref={previewCanvasRef} 
                      style={{ maxWidth: '100%', maxHeight: '180px', display: 'block', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      No active image loaded in viewport
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEXT */}
          {activeTab === 'text' && (
            <div>
              <div className="export-form-row">
                <label className="export-form-label" htmlFor="export-text-charset">Character Set</label>
                <div className="export-form-control">
                  <select 
                    id="export-text-charset"
                    className="export-select"
                    value={charSet}
                    onChange={(e) => setCharSet(e.target.value as CharSetType)}
                  >
                    <option value="ascii">ASCII Ramp ( .:-=+*#%@)</option>
                    <option value="blocks">Unicode Blocks ( ░▒▓█)</option>
                    <option value="braille">Unicode Braille Matrix 2×4</option>
                  </select>
                </div>
              </div>

              <div className="export-form-row">
                <label className="export-form-label" htmlFor="export-text-cellw">Cell Width</label>
                <div className="export-form-control">
                  <input 
                    id="export-text-cellw"
                    type="number"
                    min="1"
                    max="64"
                    className="export-input"
                    value={cellWidth}
                    onChange={(e) => setCellWidth(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={charSet === 'braille'}
                  />
                  {charSet === 'braille' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      (Fixed 2×4 dot subgrid)
                    </span>
                  )}
                </div>
              </div>

              <div className="export-form-row">
                <label className="export-form-label" htmlFor="export-text-cellh">Cell Height</label>
                <div className="export-form-control">
                  <input 
                    id="export-text-cellh"
                    type="number"
                    min="1"
                    max="64"
                    className="export-input"
                    value={cellHeight}
                    onChange={(e) => setCellHeight(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={charSet === 'braille'}
                  />
                  {charSet === 'braille' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      (Fixed 2×4 dot subgrid)
                    </span>
                  )}
                </div>
              </div>

              <div className="export-preview-container">
                <div className="export-preview-label">Preview (first ~10 lines):</div>
                <div className="export-text-preview">
                  {textPreview}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VECTOR */}
          {activeTab === 'vector' && (
            <div>
              <div className="export-form-row">
                <label className="export-form-label">Format</label>
                <div className="export-form-control">
                  <input 
                    type="text"
                    className="export-input"
                    value="SVG Vector Contours (1px Crisp Rects)"
                    readOnly
                    style={{ opacity: 0.85, cursor: 'default' }}
                  />
                </div>
              </div>

              <div className="export-preview-container">
                <div className="export-preview-label">Preview (SVG header snippet):</div>
                <div className="export-text-preview" style={{ height: '140px' }}>
                  {vectorPreview}
                </div>
              </div>
            </div>
          )}

          {copyError && (
            <div style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '8px' }}>
              {copyError}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="export-footer-actions">
          {activeTab === 'image' && (
            <button 
              type="button"
              className="action-btn"
              onClick={handleCopy}
              disabled={!hasSourceCanvas}
              style={{ minWidth: '90px' }}
            >
              {isCopied ? (
                <>
                  <Check size={14} style={{ color: 'var(--text-dim)' }} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}

          <button 
            type="button"
            className="action-btn primary"
            disabled={!hasSourceCanvas}
            onClick={() => {
              if (activeTab === 'image') handleExportImage();
              else if (activeTab === 'text') handleExportText();
              else if (activeTab === 'vector') handleExportVector();
            }}
            style={{ 
              background: 'var(--accent-primary)', 
              color: 'var(--text-on-accent)',
              borderRadius: '10px', 
              fontWeight: 600, 
              border: 'none',
              minWidth: '100px'
            }}
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

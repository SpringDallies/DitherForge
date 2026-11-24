import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Copy, Check } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { Dropdown } from '../common/Dropdown';
import { exportRaster, copyCanvasToClipboard, exportCharacterGrid, exportSvgContours } from '../../dither-engine/exporters.js';
import {
  downloadAnimatedGif,
  downloadFrameSequenceZip,
  getExportCanvas,
  renderFullResolutionAsciiGrid
} from '../../utils/animationExport';
import {
  copyAsciiGridText,
  downloadAsciiGridText,
  gridFrameToText
} from '../../ascii/exporters';
import type { AsciiGridFrame } from '../../ascii/types';
import { useAppStore } from '../../state/useAppStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'image' | 'text' | 'vector';
type ImageFormat = 'png' | 'jpg' | 'webp' | 'gif' | 'zip';
type CharSetType = 'dedicated' | 'ascii' | 'blocks' | 'braille';

interface DedicatedGridState {
  grid: AsciiGridFrame | null;
  seq: number;
  loading: boolean;
  error: string | null;
}

interface GridInputSnapshot {
  renderMode: string;
  asciiSettings: any;
  customCharsets: any;
  currentTime: number;
  fps: number;
  duration: number;
  appMode: string;
  animationTracks: any;
  sourceImageData: any;
  sourceVideoUrl: string | null;
  videoPlaybackMode: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  gamma: number;
  blur: number;
  denoise: number;
  highlight: number;
  depth: number;
  workingPalette: any;
  previewPaletteId: string | null;
  savedPalettes: any;
  paletteDepth: number;
  effects: any;
}

function captureGridInputSnapshot(state: any): GridInputSnapshot {
  return {
    renderMode: state.renderMode,
    asciiSettings: state.asciiSettings,
    customCharsets: state.customCharsets,
    currentTime: state.currentTime,
    fps: state.fps,
    duration: state.duration,
    appMode: state.appMode,
    animationTracks: state.animationTracks,
    sourceImageData: state.sourceImageData,
    sourceVideoUrl: state.sourceVideoUrl,
    videoPlaybackMode: state.videoPlaybackMode,
    brightness: state.brightness,
    contrast: state.contrast,
    saturation: state.saturation,
    hue: state.hue,
    gamma: state.gamma,
    blur: state.blur,
    denoise: state.denoise,
    highlight: state.highlight,
    depth: state.depth,
    workingPalette: state.workingPalette,
    previewPaletteId: state.previewPaletteId,
    savedPalettes: state.savedPalettes,
    paletteDepth: state.paletteDepth,
    effects: state.effects
  };
}

function isSameGridInputSnapshot(a: GridInputSnapshot | null, b: GridInputSnapshot): boolean {
  if (!a) return false;
  return (
    a.renderMode === b.renderMode &&
    a.asciiSettings === b.asciiSettings &&
    a.customCharsets === b.customCharsets &&
    a.currentTime === b.currentTime &&
    a.fps === b.fps &&
    a.duration === b.duration &&
    a.appMode === b.appMode &&
    a.animationTracks === b.animationTracks &&
    a.sourceImageData === b.sourceImageData &&
    a.sourceVideoUrl === b.sourceVideoUrl &&
    a.videoPlaybackMode === b.videoPlaybackMode &&
    a.brightness === b.brightness &&
    a.contrast === b.contrast &&
    a.saturation === b.saturation &&
    a.hue === b.hue &&
    a.gamma === b.gamma &&
    a.blur === b.blur &&
    a.denoise === b.denoise &&
    a.highlight === b.highlight &&
    a.depth === b.depth &&
    a.workingPalette === b.workingPalette &&
    a.previewPaletteId === b.previewPaletteId &&
    a.savedPalettes === b.savedPalettes &&
    a.paletteDepth === b.paletteDepth &&
    a.effects === b.effects
  );
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('image');

  const [format, setFormat] = useState<ImageFormat>('png');
  const [resolutionScale, setResolutionScale] = useState<number>(1);
  const [quality, setQuality] = useState<number>(0.92);
  const [filename, setFilename] = useState<string>('ditherforge_export');
  const [isExportingSequence, setIsExportingSequence] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const addToast = useAppStore((state) => state.addToast);
  const renderMode = useAppStore((state) => state.renderMode);
  const algorithmId = useAppStore((state) => state.algorithmId);
  const isAsciiMode = renderMode === 'ascii' || (typeof algorithmId === 'string' && algorithmId.startsWith('ascii-'));
  const asciiSettings = useAppStore((state) => state.asciiSettings);
  const customCharsets = useAppStore((state) => state.customCharsets);
  const currentTime = useAppStore((state) => state.currentTime);
  const fps = useAppStore((state) => state.fps);
  const duration = useAppStore((state) => state.duration);
  const appMode = useAppStore((state) => state.appMode);
  const animationTracks = useAppStore((state) => state.animationTracks);
  const sourceImageData = useAppStore((state) => state.sourceImageData);
  const sourceVideoUrl = useAppStore((state) => state.sourceVideoUrl);
  const videoPlaybackMode = useAppStore((state) => state.videoPlaybackMode);
  const brightness = useAppStore((state) => state.brightness);
  const contrast = useAppStore((state) => state.contrast);
  const saturation = useAppStore((state) => state.saturation);
  const hue = useAppStore((state) => state.hue);
  const gamma = useAppStore((state) => state.gamma);
  const blur = useAppStore((state) => state.blur);
  const denoise = useAppStore((state) => state.denoise);
  const highlight = useAppStore((state) => state.highlight);
  const depth = useAppStore((state) => state.depth);
  const workingPalette = useAppStore((state) => state.workingPalette);
  const previewPaletteId = useAppStore((state) => state.previewPaletteId);
  const savedPalettes = useAppStore((state) => state.savedPalettes);
  const paletteDepth = useAppStore((state) => state.paletteDepth);
  const effects = useAppStore((state) => state.effects);

  const [charSet, setCharSet] = useState<CharSetType>('ascii');
  const [cellWidth, setCellWidth] = useState<number>(6);
  const [cellHeight, setCellHeight] = useState<number>(12);

  const [dedicatedGridState, setDedicatedGridState] = useState<DedicatedGridState>({
    grid: null,
    seq: 0,
    loading: false,
    error: null
  });
  const gridRequestSeqRef = useRef<number>(0);
  const inFlightGridRef = useRef<{
    seq: number;
    promise: Promise<AsciiGridFrame | null>;
    inputSnap: GridInputSnapshot;
  } | null>(null);
  const settledGridRef = useRef<{
    seq: number;
    grid: AsciiGridFrame | null;
    inputSnap: GridInputSnapshot | null;
  }>({ seq: 0, grid: null, inputSnap: null });
  const isOpenRef = useRef<boolean>(isOpen);
  isOpenRef.current = isOpen;

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const getSourceCanvas = (): HTMLCanvasElement | null => {
    return getExportCanvas();
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('image');
      setIsCopied(false);
      setCopyError(null);

      const state = useAppStore.getState();
      setCharSet(isAsciiMode ? 'dedicated' : 'ascii');

      if (state.appMode === 'animation') {
        setFormat('gif');
      } else {
        try {
          const stored = localStorage.getItem('ditherforge_settings');
          if (stored) {
            const settings = JSON.parse(stored);
            if (settings.defaultExportFormat && ['png', 'jpg', 'webp', 'gif'].includes(settings.defaultExportFormat)) {
              setFormat(settings.defaultExportFormat);
            }
          }
        } catch (e) {
        }
      }
    }
  }, [isOpen]);

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

  useEffect(() => {
    if (!isOpen || activeTab !== 'text' || !isAsciiMode || charSet !== 'dedicated') {
      gridRequestSeqRef.current += 1;
      inFlightGridRef.current = null;
      settledGridRef.current = { seq: 0, grid: null, inputSnap: null };
      setDedicatedGridState({ grid: null, seq: 0, loading: false, error: null });
      return;
    }

    const stateNow = useAppStore.getState();
    const inputSnap = captureGridInputSnapshot(stateNow);
    const seq = ++gridRequestSeqRef.current;
    let cancelled = false;

    setDedicatedGridState((prev) => ({
      grid: prev.grid,
      seq,
      loading: true,
      error: null
    }));

    const promise = renderFullResolutionAsciiGrid(stateNow);
    inFlightGridRef.current = { seq, promise, inputSnap };

    promise
      .then((grid) => {
        if (cancelled || seq !== gridRequestSeqRef.current) return;
        settledGridRef.current = { seq, grid, inputSnap };
        if (inFlightGridRef.current?.seq === seq) {
          inFlightGridRef.current = null;
        }
        setDedicatedGridState({ grid, seq, loading: false, error: null });
      })
      .catch((err: any) => {
        if (cancelled || seq !== gridRequestSeqRef.current) return;
        settledGridRef.current = { seq, grid: null, inputSnap: null };
        if (inFlightGridRef.current?.seq === seq) {
          inFlightGridRef.current = null;
        }
        setDedicatedGridState({
          grid: null,
          seq,
          loading: false,
          error: err?.message || 'Failed to generate ASCII text grid'
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    activeTab,
    renderMode,
    charSet,
    asciiSettings,
    customCharsets,
    currentTime,
    fps,
    duration,
    appMode,
    animationTracks,
    sourceImageData,
    sourceVideoUrl,
    videoPlaybackMode,
    brightness,
    contrast,
    saturation,
    hue,
    gamma,
    blur,
    denoise,
    highlight,
    depth,
    workingPalette,
    previewPaletteId,
    savedPalettes,
    paletteDepth,
    effects
  ]);

  const getFreshDedicatedGrid = useCallback(async (): Promise<AsciiGridFrame | null> => {
    for (let attempt = 0; attempt < 16; attempt++) {
      if (!isOpenRef.current) return null;
      const latestState = useAppStore.getState();
      const isLatestAscii = latestState.renderMode === 'ascii' || (typeof latestState.algorithmId === 'string' && latestState.algorithmId.startsWith('ascii-'));
      if (!isLatestAscii) return null;
      const latestSnap = captureGridInputSnapshot(latestState);
      const activeSeq = gridRequestSeqRef.current;

      const inFlight = inFlightGridRef.current;
      if (
        inFlight &&
        inFlight.seq === activeSeq &&
        isSameGridInputSnapshot(inFlight.inputSnap, latestSnap)
      ) {
        const grid = await inFlight.promise;
        const postSnap = captureGridInputSnapshot(useAppStore.getState());
        if (
          gridRequestSeqRef.current === activeSeq &&
          isSameGridInputSnapshot(inFlight.inputSnap, postSnap)
        ) {
          settledGridRef.current = { seq: activeSeq, grid, inputSnap: inFlight.inputSnap };
          setDedicatedGridState({ grid, seq: activeSeq, loading: false, error: null });
          return grid;
        }
        continue;
      }

      if (
        settledGridRef.current.seq === activeSeq &&
        settledGridRef.current.grid &&
        isSameGridInputSnapshot(settledGridRef.current.inputSnap, latestSnap)
      ) {
        return settledGridRef.current.grid;
      }

      const seq = ++gridRequestSeqRef.current;
      const promise = renderFullResolutionAsciiGrid(latestState);
      inFlightGridRef.current = { seq, promise, inputSnap: latestSnap };
      const grid = await promise;
      const postSnap = captureGridInputSnapshot(useAppStore.getState());
      if (inFlightGridRef.current?.seq === seq) {
        inFlightGridRef.current = null;
      }
      if (
        gridRequestSeqRef.current === seq &&
        isSameGridInputSnapshot(latestSnap, postSnap)
      ) {
        settledGridRef.current = { seq, grid, inputSnap: latestSnap };
        setDedicatedGridState({ grid, seq, loading: false, error: null });
        return grid;
      }
    }
    throw new Error('ASCII grid state kept changing during export; please retry.');
  }, []);

  const textPreview = useMemo(() => {
    if (!isOpen || activeTab !== 'text') return '';

    if (charSet === 'dedicated' && isAsciiMode) {
      if (dedicatedGridState.loading && !dedicatedGridState.grid) {
        return '(Generating ASCII grid for selected frame...)';
      }
      if (dedicatedGridState.error) {
        return `(${dedicatedGridState.error})`;
      }
      if (!dedicatedGridState.grid) {
        return '(No active image loaded in viewport)';
      }
      const fullText = gridFrameToText(dedicatedGridState.grid, '\n');
      const lines = fullText.split('\n').slice(0, 10).map((line) => line.slice(0, 80));
      return lines.join('\n') || '(Empty output)';
    }

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
  }, [isOpen, activeTab, charSet, cellWidth, cellHeight, renderMode, dedicatedGridState]);

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

  const handleCopy = async () => {
    if (activeTab === 'text') {
      try {
        setCopyError(null);
        if (charSet === 'dedicated' && isAsciiMode) {
          const grid = await getFreshDedicatedGrid();
          if (!grid) {
            setCopyError('No ASCII grid available to copy');
            return;
          }
          await copyAsciiGridText(grid, '\n');
        } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(textPreview);
        }
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500);
      } catch (err: any) {
        setCopyError(err?.message || 'Failed to copy text to clipboard');
      }
      return;
    }

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

  const handleExportImage = () => {
    if (format === 'zip') {
      setIsExportingSequence(true);
      setExportProgress(0);
      const stateSnapshot = {
        ...useAppStore.getState(),
        imageFileName: filename.trim() || useAppStore.getState().imageFileName || 'ditherforge_export'
      };
      downloadFrameSequenceZip(stateSnapshot, {
        scale: resolutionScale,
        customFilename: filename.trim() || undefined,
        onProgress: (p) => setExportProgress(Math.round(p * 100))
      })
        .then(() => {
          addToast('Frame sequence exported to Downloads folder', 'success');
          setIsExportingSequence(false);
          onClose();
        })
        .catch((err) => {
          console.error('Frame sequence export failed:', err);
          addToast('Frame sequence export failed', 'error');
          setIsExportingSequence(false);
        });
      return;
    }

    if (format === 'gif') {
      const stateSnapshot = {
        ...useAppStore.getState(),
        imageFileName: filename.trim() || useAppStore.getState().imageFileName || 'ditherforge_export'
      };
      downloadAnimatedGif(stateSnapshot)
        .then(() => addToast('Exported to Downloads folder', 'success'))
        .catch((err) => {
          console.error('GIF export failed:', err);
          addToast('GIF export failed', 'error');
        });
      onClose();
      return;
    }

    const canvas = getSourceCanvas();
    if (!canvas) return;

    exportRaster(canvas, format, quality, filename, resolutionScale);

    try {
      const stored = localStorage.getItem('ditherforge_settings');
      const settings = stored ? JSON.parse(stored) : {};
      localStorage.setItem('ditherforge_settings', JSON.stringify({
        ...settings,
        defaultExportFormat: format
      }));
    } catch (e) {
    }

    addToast(`Exported to Downloads folder`, 'success');
    onClose();
  };

  const handleExportText = async () => {
    if (charSet === 'dedicated' && isAsciiMode) {
      try {
        setCopyError(null);
        const grid = await getFreshDedicatedGrid();
        if (!grid) return;
        downloadAsciiGridText(grid, {
          filename: filename.trim() || 'ditherforge_ascii',
          lineEnding: '\n'
        });
        addToast('Exported to Downloads folder', 'success');
        onClose();
      } catch (err: any) {
        setCopyError(err?.message || 'Failed to export ASCII text');
        addToast('ASCII text export failed', 'error');
      }
      return;
    }

    const canvas = getSourceCanvas();
    if (!canvas) return;
    exportCharacterGrid(canvas, charSet === 'dedicated' ? 'ascii' : charSet, Math.max(1, cellWidth), Math.max(1, cellHeight));
    addToast('Exported to Downloads folder', 'success');
    onClose();
  };

  const handleExportVector = () => {
    const canvas = getSourceCanvas();
    if (!canvas) return;
    exportSvgContours(canvas);
    addToast('Exported to Downloads folder', 'success');
    onClose();
  };

  if (!isOpen) return null;

  const hasSourceCanvas = Boolean(getSourceCanvas());
  const textCharsetItems = [
    ...(isAsciiMode
      ? [{ id: 'dedicated', label: 'Active ASCII Grid', hint: 'Exact engine output' }]
      : []),
    { id: 'ascii', label: 'ASCII Ramp', hint: ' .:-=+*#%@' },
    { id: 'blocks', label: 'Unicode Blocks', hint: ' ░▒▓█' },
    { id: 'braille', label: 'Unicode Braille', hint: '2×4 Matrix' }
  ];
  const disableCellInputs = charSet === 'braille' || charSet === 'dedicated';

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
                  <Dropdown
                    id="export-image-format"
                    value={format}
                    onChange={(val) => setFormat(val as ImageFormat)}
                    width="100%"
                    items={[
                      { id: 'png', label: 'PNG', hint: 'Lossless 24/32-bit' },
                      { id: 'jpg', label: 'JPG', hint: 'Web Compressed' },
                      { id: 'webp', label: 'WebP', hint: 'Modern Lightweight' },
                      { id: 'gif', label: 'GIF', hint: 'Animated / Multi-Frame' },
                      { id: 'zip', label: 'PNG Sequence (ZIP)', hint: 'All Animation Frames' }
                    ]}
                  />
                </div>
              </div>

              <div className="export-form-row">
                <label className="export-form-label" htmlFor="export-resolution-scale">Scale</label>
                <div className="export-form-control">
                  <Dropdown
                    id="export-resolution-scale"
                    value={String(resolutionScale)}
                    onChange={(val) => setResolutionScale(Number(val))}
                    width="100%"
                    items={[
                      { id: '1', label: '1x (Original)', hint: 'Native resolution' },
                      { id: '2', label: '2x (Crisp)', hint: 'Pixel-perfect 2x upscale' },
                      { id: '4', label: '4x (Ultra HD)', hint: 'Pixel-perfect 4x upscale' }
                    ]}
                  />
                </div>
              </div>

              {format === 'jpg' && (
                <div
                  className="export-transparency-hint"
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted, #D8D8D8)',
                    marginBottom: '12px',
                    padding: '8px 12px',
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
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '26px' }}>
                      <input
                        id="export-image-quality"
                        type="range"
                        className="control-slider"
                        min="0.1"
                        max="1.0"
                        step="0.01"
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                        style={{
                          flex: 1,
                          width: '100%',
                          '--slider-fill': `${Math.max(0, Math.min(100, ((quality - 0.1) / (1.0 - 0.1)) * 100)).toFixed(1)}%`
                        } as React.CSSProperties}
                      />
                    </div>
                    <div
                      className="control-num-input"
                      style={{
                        width: '56px',
                        minWidth: '56px',
                        maxWidth: '56px',
                        flex: '0 0 56px',
                        textAlign: 'center',
                        height: '28px',
                        lineHeight: '26px',
                        fontSize: '0.78rem',
                        marginTop: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {Math.round(quality * 100)}%
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
                    <>
                      <canvas
                        ref={previewCanvasRef}
                        style={{ maxWidth: '100%', maxHeight: '180px', display: 'block', objectFit: 'contain' }}
                      />
                      {getSourceCanvas() && (
                        <div className="export-preview-badge">
                          {(getSourceCanvas()?.width || 0) * resolutionScale} × {(getSourceCanvas()?.height || 0) * resolutionScale} px
                          {resolutionScale > 1 && ` (${resolutionScale}x)`}
                        </div>
                      )}
                    </>
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
                  <Dropdown
                    id="export-text-charset"
                    value={charSet}
                    onChange={(val) => setCharSet(val as CharSetType)}
                    width="100%"
                    items={textCharsetItems}
                  />
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
                    disabled={disableCellInputs}
                  />
                  {charSet === 'braille' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      (Fixed 2×4 dot subgrid)
                    </span>
                  )}
                  {charSet === 'dedicated' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      (Uses active ASCII layout)
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
                    disabled={disableCellInputs}
                  />
                  {charSet === 'braille' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      (Fixed 2×4 dot subgrid)
                    </span>
                  )}
                  {charSet === 'dedicated' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      (Uses active ASCII layout)
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
          {(activeTab === 'image' || activeTab === 'text') && (
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
            disabled={!hasSourceCanvas || isExportingSequence}
            onClick={() => {
              if (activeTab === 'image') handleExportImage();
              else if (activeTab === 'text') void handleExportText();
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
            <span>{isExportingSequence ? `Exporting (${exportProgress}%)` : 'Export'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


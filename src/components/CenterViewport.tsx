import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../state/useAppStore';
// Import real frozen dither engine UNCHANGED via allowJs
// @ts-ignore
import { applyDitherAlgorithm, applyTweaks } from '../dither-engine/algorithms.js';
// @ts-ignore
import { BUILTIN_PALETTES } from '../dither-engine/palettes.js';
import { createProxyImageData } from '../utils/samplePattern';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Columns, 
  Grid,
  UploadCloud,
  FolderOpen,
  Sparkles,
  MoveHorizontal
} from 'lucide-react';

export const CenterViewport: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Store state
  const hasImage = useAppStore((state) => state.hasImage);
  const sourceImageData = useAppStore((state) => state.sourceImageData);
  const loadImageFromData = useAppStore((state) => state.loadImageFromData);
  const loadSampleImage = useAppStore((state) => state.loadSampleImage);

  const algorithmId = useAppStore((state) => state.algorithmId);
  const algoParams = useAppStore((state) => state.algoParams);
  const brightness = useAppStore((state) => state.brightness);
  const contrast = useAppStore((state) => state.contrast);
  const saturation = useAppStore((state) => state.saturation);
  const gamma = useAppStore((state) => state.gamma);
  const activePaletteId = useAppStore((state) => state.activePalette);

  const updateMode = useAppStore((state) => state.updateMode);
  const isDraggingSlider = useAppStore((state) => state.isDraggingSlider);
  const setLastRenderMs = useAppStore((state) => state.setLastRenderMs);

  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const panX = useAppStore((state) => state.panX);
  const panY = useAppStore((state) => state.panY);
  const setPan = useAppStore((state) => state.setPan);
  const fitToViewport = useAppStore((state) => state.fitToViewport);
  const resetZoom = useAppStore((state) => state.resetZoom);

  const showBeforeAfter = useAppStore((state) => state.showBeforeAfter);
  const toggleBeforeAfter = useAppStore((state) => state.toggleBeforeAfter);
  const splitRatio = useAppStore((state) => state.splitRatio);
  const setSplitRatio = useAppStore((state) => state.setSplitRatio);

  // Local interaction states
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, startPanX: 0, startPanY: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  const currentParams = algoParams[algorithmId] ?? {
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 1.0,
    serpentine: false,
    noiseAmount: 0.3
  };

  // Keyboard Navigation: 0 (Fit), 1 (1:1), \ (Compare), Space (Pan)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === '0') {
        e.preventDefault();
        const container = containerRef.current;
        if (container) {
          fitToViewport(container.clientWidth, container.clientHeight);
        }
      } else if (e.key === '1') {
        e.preventDefault();
        resetZoom();
      } else if (e.key === '\\') {
        e.preventDefault();
        toggleBeforeAfter();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(zoom + 20);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom(zoom - 20);
      } else if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [zoom, fitToViewport, resetZoom, toggleBeforeAfter, setZoom]);

  // Handle Image File Loading
  const processImageFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = img.naturalWidth;
        offscreen.height = img.naturalHeight;
        const ctx = offscreen.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
        loadImageFromData(imgData, file.name);

        // Auto-fit newly loaded image to viewport
        const container = containerRef.current;
        if (container) {
          fitToViewport(container.clientWidth, container.clientHeight);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [loadImageFromData, fitToViewport]);

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Pipeline execution core
  const executeRenderPipeline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImageData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine whether to use fast proxy during slider dragging in Live Mode
    let renderSource = sourceImageData;
    let isProxy = false;
    if (updateMode === 'live' && isDraggingSlider) {
      const proxyResult = createProxyImageData(sourceImageData, 450);
      renderSource = proxyResult.data;
      isProxy = proxyResult.scale < 1.0;
    }

    const width = renderSource.width;
    const height = renderSource.height;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Step 1: Clone working buffer (pristine sourceImageData is NEVER mutated)
    const workingData = new Uint8ClampedArray(renderSource.data);

    // Step 2: Apply adjustments (brightness, contrast, saturation, gamma)
    applyTweaks(workingData, width, height, {
      brightness: brightness / 100,
      contrast: contrast / 100,
      saturation: saturation / 100,
      gamma: gamma
    });

    // Step 3: Lookup active palette by ID
    const palObj = BUILTIN_PALETTES.find((p: any) => p.id === activePaletteId) || BUILTIN_PALETTES[0];
    const palette = palObj.colors;

    // Step 4: Apply Dither Algorithm
    const ditherImageData = new ImageData(workingData, width, height);
    const t0 = performance.now();
    applyDitherAlgorithm(ditherImageData, {
      algorithmId,
      palette,
      threshold: currentParams.threshold,
      scale: currentParams.scale,
      diffusionStrength: currentParams.diffusionStrength,
      serpentine: currentParams.serpentine,
      noiseAmount: currentParams.noiseAmount ?? 0.3,
      temporalSeed: 0
    });
    const elapsed = performance.now() - t0;
    setLastRenderMs(elapsed);

    // Step 5: Render to canvas (Before/After split or full output)
    if (showBeforeAfter && !isProxy) {
      const splitX = Math.round(width * splitRatio);
      const compositeData = new ImageData(new Uint8ClampedArray(ditherImageData.data), width, height);
      
      // Left side: Pristine sourceImageData BEFORE any tweaks
      const originalData = sourceImageData.data;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < splitX; x++) {
          const idx = (y * width + x) * 4;
          compositeData.data[idx] = originalData[idx];
          compositeData.data[idx + 1] = originalData[idx + 1];
          compositeData.data[idx + 2] = originalData[idx + 2];
          compositeData.data[idx + 3] = originalData[idx + 3];
        }
        // Crisp 1px split indicator
        if (splitX >= 0 && splitX < width) {
          const splitIdx = (y * width + splitX) * 4;
          compositeData.data[splitIdx] = 0;
          compositeData.data[splitIdx + 1] = 255;
          compositeData.data[splitIdx + 2] = 204;
          compositeData.data[splitIdx + 3] = 255;
        }
      }
      ctx.putImageData(compositeData, 0, 0);
    } else {
      ctx.putImageData(ditherImageData, 0, 0);
    }
  }, [
    sourceImageData,
    updateMode,
    isDraggingSlider,
    brightness,
    contrast,
    saturation,
    gamma,
    activePaletteId,
    algorithmId,
    currentParams.threshold,
    currentParams.scale,
    currentParams.diffusionStrength,
    currentParams.serpentine,
    currentParams.noiseAmount,
    showBeforeAfter,
    splitRatio,
    setLastRenderMs
  ]);

  // Execution scheduler according to [Precise | Live | Settle]
  useEffect(() => {
    if (!sourceImageData) return;

    if (updateMode === 'settle') {
      // Settle Mode: Debounce 180ms on interactive changes
      const timer = setTimeout(() => {
        executeRenderPipeline();
      }, 180);
      return () => clearTimeout(timer);
    } else {
      // Precise Mode (immediate) and Live Mode (proxy during drag, full on release)
      executeRenderPipeline();
    }
  }, [
    sourceImageData,
    executeRenderPipeline,
    updateMode,
    algorithmId,
    currentParams.threshold,
    currentParams.scale,
    currentParams.diffusionStrength,
    currentParams.serpentine,
    currentParams.noiseAmount,
    brightness,
    contrast,
    saturation,
    gamma,
    activePaletteId,
    showBeforeAfter,
    splitRatio,
    isDraggingSlider
  ]);

  // Wheel Zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(Math.round(zoom * factor));
  };

  // Pan Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // If middle click or space key held, initiate pan
    if (e.button === 1 || isSpacePressed || e.button === 0) {
      if (isDraggingSplitter) return;
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        startPanX: panX,
        startPanY: panY
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSplitter && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.05, Math.min(0.95, relativeX)));
      return;
    }

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan(panStart.startPanX + dx, panStart.startPanY + dy);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingSplitter(false);
  };

  // Split Divider Dragging
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingSplitter(true);
  };

  const handleFitClick = () => {
    const container = containerRef.current;
    if (container) {
      fitToViewport(container.clientWidth, container.clientHeight);
    }
  };

  return (
    <main 
      className="center-viewport"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) processImageFile(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {/* Viewport Toolbar */}
      <div className="viewport-toolbar">
        <div className="toolbar-group">
          <button 
            className="tool-icon-btn" 
            onClick={() => setZoom(zoom - 20)} 
            title="Zoom Out (-)"
          >
            <ZoomOut size={13} />
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', minWidth: '44px', textAlign: 'center', fontSize: '0.75rem' }}>
            {Math.round(zoom)}%
          </span>
          <button 
            className="tool-icon-btn" 
            onClick={() => setZoom(zoom + 20)} 
            title="Zoom In (+)"
          >
            <ZoomIn size={13} />
          </button>
          <button 
            className="tool-icon-btn" 
            onClick={resetZoom} 
            title="Reset to 1:1 Pixel Native Resolution (Key: 1)"
          >
            1:1
          </button>
          <button 
            className="tool-icon-btn" 
            onClick={handleFitClick} 
            title="Fit to Viewport (Key: 0)"
          >
            <Maximize2 size={13} /> Fit
          </button>
        </div>

        <div className="toolbar-group">
          <button 
            className={`tool-icon-btn ${showBeforeAfter ? 'active' : ''}`} 
            onClick={toggleBeforeAfter}
            title="Toggle Split-Screen Compare View (Key: \)"
          >
            <Columns size={13} /> Compare
          </button>
          <button 
            className="tool-icon-btn" 
            disabled={true}
            title="Pixel-grid overlay (Phase 7)"
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
            <Grid size={13} /> Grid
          </button>
        </div>
      </div>

      {/* Main Canvas / Empty State Dropzone Area */}
      <div 
        ref={containerRef}
        className="canvas-area"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          cursor: isDraggingSplitter ? 'ew-resize' : isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default'
        }}
      >
        {!hasImage || !sourceImageData ? (
          /* Empty Dropzone State */
          <div className={`viewport-dropzone ${isDragOver ? 'drag-active' : ''}`}>
            <div className="dropzone-icon">
              <UploadCloud size={32} />
            </div>
            <div className="dropzone-title">Drop an image here to dither</div>
            <p className="dropzone-desc">
              Supports PNG, JPG, WEBP, GIF, BMP. Runs entirely in your browser with bit-identical retro accuracy.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button 
                className="action-btn primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderOpen size={13} /> Open Image
              </button>
              <button 
                className="action-btn"
                onClick={loadSampleImage}
              >
                <Sparkles size={13} /> Calibration Pattern
              </button>
            </div>
          </div>
        ) : (
          /* Active Viewport Canvas & Split Overlay */
          <div 
            style={{
              position: 'relative',
              display: 'inline-block',
              transform: `translate(${panX}px, ${panY}px) scale(${zoom / 100})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.05s ease-out',
              userSelect: 'none'
            }}
          >
            <canvas 
              ref={canvasRef} 
              className="preview-canvas"
              style={{
                display: 'block',
                imageRendering: 'pixelated',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)'
              }}
            />

            {/* Before/After Split Screen Divider Handle */}
            {showBeforeAfter && canvasRef.current && (
              <>
                <div 
                  className="compare-badge before" 
                  style={{ transform: `scale(${100 / Math.max(50, zoom)})`, transformOrigin: 'top left' }}
                >
                  ORIGINAL
                </div>
                <div 
                  className="compare-badge after"
                  style={{ transform: `scale(${100 / Math.max(50, zoom)})`, transformOrigin: 'top right' }}
                >
                  DITHERED
                </div>
                <div 
                  className="split-divider-overlay"
                  style={{ left: `${splitRatio * 100}%` }}
                  onMouseDown={handleSplitterMouseDown}
                >
                  <div className="split-handle">
                    <MoveHorizontal size={12} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

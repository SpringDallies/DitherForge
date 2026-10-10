import React, { useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../state/useAppStore';
// Import real frozen dither engine UNCHANGED via allowJs
// @ts-ignore
import { applyDitherAlgorithm, applyTweaks, ALGORITHM_REGISTRY } from '../dither-engine/algorithms.js';
// @ts-ignore
import { BUILTIN_PALETTES } from '../dither-engine/palettes.js';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Columns, 
  Grid
} from 'lucide-react';

const PATTERN_WIDTH = 400;
const PATTERN_HEIGHT = 300;

// Generate deterministic high-fidelity synthetic benchmark sample pattern
function createBuiltInSamplePattern(width = PATTERN_WIDTH, height = PATTERN_HEIGHT): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Rich multi-stop gradient background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#0c1024');
  grad.addColorStop(0.35, '#2e1c4a');
  grad.addColorStop(0.7, '#8b2d56');
  grad.addColorStop(1, '#ff6e40');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. High-contrast central shaded sphere with 3D specular highlight
  const sphereX = width * 0.48;
  const sphereY = height * 0.44;
  const sphereRadius = Math.min(width, height) * 0.32;

  const sphereGrad = ctx.createRadialGradient(
    sphereX - sphereRadius * 0.35,
    sphereY - sphereRadius * 0.35,
    sphereRadius * 0.05,
    sphereX,
    sphereY,
    sphereRadius
  );
  sphereGrad.addColorStop(0, '#ffffff');
  sphereGrad.addColorStop(0.2, '#ffd5a5');
  sphereGrad.addColorStop(0.55, '#c84b31');
  sphereGrad.addColorStop(0.85, '#2d132c');
  sphereGrad.addColorStop(1, '#0f051d');

  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(sphereX, sphereY, sphereRadius, 0, Math.PI * 2);
  ctx.fill();

  // 3. High-frequency checkerboard pattern
  const cbX = 20;
  const cbY = 20;
  const cbSize = 60;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(cbX - 4, cbY - 4, cbSize + 8, cbSize + 8);
  for (let cy = 0; cy < 6; cy++) {
    for (let cx = 0; cx < 6; cx++) {
      ctx.fillStyle = (cx + cy) % 2 === 0 ? '#ffffff' : '#111827';
      ctx.fillRect(cbX + cx * 10, cbY + cy * 10, 10, 10);
    }
  }

  // 4. Concentric rings for frequency testing
  const ringX = width - 50;
  const ringY = 50;
  for (let r = 35; r > 5; r -= 6) {
    ctx.beginPath();
    ctx.arc(ringX, ringY, r, 0, Math.PI * 2);
    ctx.strokeStyle = r % 12 === 0 ? '#ffffff' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 5. Linear 16-step grayscale gradient ramp along bottom
  const rampY = height - 36;
  const rampH = 18;
  const rampW = width - 40;
  const rampX = 20;
  const steps = 16;
  const stepW = rampW / steps;
  for (let s = 0; s < steps; s++) {
    const val = Math.round((s / (steps - 1)) * 255);
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(rampX + s * stepW, rampY, stepW + 1, rampH);
  }

  // 6. Test Typography
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('DITHERFORGE BENCHMARK PATTERN', 22, height - 10);

  return ctx.getImageData(0, 0, width, height);
}

export const CenterViewport: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Pipeline & store state
  const algorithmId = useAppStore((state) => state.algorithmId);
  const algoParams = useAppStore((state) => state.algoParams);
  const brightness = useAppStore((state) => state.brightness);
  const contrast = useAppStore((state) => state.contrast);
  const saturation = useAppStore((state) => state.saturation);
  const gamma = useAppStore((state) => state.gamma);
  const activePaletteName = useAppStore((state) => state.activePalette);
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const splitRatio = useAppStore((state) => state.splitRatio);
  const showBeforeAfter = useAppStore((state) => state.showBeforeAfter);
  const setShowBeforeAfter = useAppStore((state) => state.setShowBeforeAfter);
  const setLastRenderMs = useAppStore((state) => state.setLastRenderMs);

  // Cached base pattern
  const basePattern = useMemo(() => {
    return createBuiltInSamplePattern(PATTERN_WIDTH, PATTERN_HEIGHT);
  }, []);

  const currentAlgo = ALGORITHM_REGISTRY.find((a: any) => a.id === algorithmId) || ALGORITHM_REGISTRY[0];
  const currentParams = algoParams[algorithmId] ?? {
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 1.0,
    serpentine: false,
    noiseAmount: 0.3
  };

  // Wire real dither pipeline to preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = PATTERN_WIDTH;
    const height = PATTERN_HEIGHT;
    canvas.width = width;
    canvas.height = height;

    // Step 1: Clone base pattern data
    const workingData = new Uint8ClampedArray(basePattern.data);

    // Step 2: Apply real tweaks (brightness, contrast, saturation, gamma)
    applyTweaks(workingData, width, height, {
      brightness: brightness / 100,
      contrast: contrast / 100,
      saturation: saturation / 100,
      gamma: gamma
    });

    // Save pre-dithered state for split-screen compare
    const preDitheredCopy = showBeforeAfter ? new Uint8ClampedArray(workingData) : null;

    // Step 3: Lookup active palette
    const palObj = BUILTIN_PALETTES.find((p: any) => p.name === activePaletteName) || BUILTIN_PALETTES[0];
    const palette = palObj.colors;

    // Step 4: Run REAL dither algorithm
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

    // Step 5: Render to canvas (with optional split-screen before/after)
    if (showBeforeAfter && preDitheredCopy) {
      const splitX = Math.round(width * splitRatio);
      const compositeData = new ImageData(new Uint8ClampedArray(ditherImageData.data), width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < splitX; x++) {
          const idx = (y * width + x) * 4;
          compositeData.data[idx] = preDitheredCopy[idx];
          compositeData.data[idx + 1] = preDitheredCopy[idx + 1];
          compositeData.data[idx + 2] = preDitheredCopy[idx + 2];
          compositeData.data[idx + 3] = preDitheredCopy[idx + 3];
        }
        // Split line
        const splitIdx = (y * width + splitX) * 4;
        if (splitX >= 0 && splitX < width) {
          compositeData.data[splitIdx] = 255;
          compositeData.data[splitIdx + 1] = 255;
          compositeData.data[splitIdx + 2] = 255;
          compositeData.data[splitIdx + 3] = 255;
        }
      }
      ctx.putImageData(compositeData, 0, 0);
    } else {
      ctx.putImageData(ditherImageData, 0, 0);
    }
  }, [
    basePattern,
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
    activePaletteName,
    showBeforeAfter,
    splitRatio,
    setLastRenderMs
  ]);

  return (
    <main className="center-viewport">
      {/* Viewport Toolbar */}
      <div className="viewport-toolbar">
        <div className="toolbar-group">
          <button 
            className="tool-icon-btn" 
            onClick={() => setZoom(Math.max(25, zoom - 25))} 
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'center', fontSize: '0.75rem' }}>
            {Math.round(zoom)}%
          </span>
          <button 
            className="tool-icon-btn" 
            onClick={() => setZoom(Math.min(400, zoom + 25))} 
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button 
            className="tool-icon-btn" 
            onClick={() => setZoom(100)} 
            title="Reset to 100% (Key: 1)"
          >
            1:1
          </button>
          <button 
            className="tool-icon-btn" 
            onClick={() => setZoom(100)} 
            title="Fit to Window (Key: 0)"
          >
            <Maximize2 size={13} /> Fit
          </button>
        </div>

        <div className="toolbar-group">
          <button 
            className={`tool-icon-btn ${showBeforeAfter ? 'active' : ''}`} 
            onClick={() => setShowBeforeAfter(!showBeforeAfter)}
            title="Toggle Split-Screen Compare View"
          >
            <Columns size={13} /> Compare
          </button>
          <button 
            className="tool-icon-btn" 
            title="1-Bit Pixel Grid Overlay (Key: G)"
          >
            <Grid size={13} /> Grid
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="canvas-area">
        <canvas 
          ref={canvasRef} 
          className="preview-canvas"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center center',
            imageRendering: 'pixelated',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)'
          }}
        />
      </div>
    </main>
  );
};

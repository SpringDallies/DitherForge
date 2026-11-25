/**
 * Batch Image Processing Pipeline for DitherForge
 * Processes multiple image files using the active dither + tweaks + palette + effect pipeline,
 * and packages them into a ZIP archive.
 */

import JSZip from 'jszip';
import { ditherWorkerClient } from '../workers/ditherWorkerClient';

export interface BatchProcessingOptions {
  files: File[];
  scale: 1 | 2 | 4;
  format: 'png' | 'jpeg' | 'webp';
  quality: number; // 0.1 to 1.0 (for jpeg/webp)
  state: any; // snapshot of app state
  onProgress: (current: number, total: number, filename: string) => void;
  signal?: AbortSignal;
}

export interface BatchProcessingResult {
  zipBlob: Blob;
  count: number;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to decode image: ${file.name}`));
    };
    img.src = url;
  });
}

function renderScaledCanvas(
  sourceCanvas: HTMLCanvasElement,
  scale: number
): HTMLCanvasElement {
  if (scale === 1) return sourceCanvas;
  const scaled = document.createElement('canvas');
  scaled.width = sourceCanvas.width * scale;
  scaled.height = sourceCanvas.height * scale;
  const ctx = scaled.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sourceCanvas,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
      0,
      0,
      scaled.width,
      scaled.height
    );
  }
  return scaled;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' | 'webp',
  quality: number
): Promise<Blob> {
  const mime = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create image blob from canvas'));
      },
      mime,
      quality
    );
  });
}

/**
 * Runs batch processing over a collection of images and returns a ZIP file containing the dithered outputs.
 */
export async function runBatchProcessing(
  options: BatchProcessingOptions
): Promise<BatchProcessingResult> {
  const { files, scale, format, quality, state, onProgress, signal } = options;
  const zip = new JSZip();

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) {
      throw new Error('Batch processing aborted by user.');
    }

    const file = files[i];
    onProgress(i + 1, files.length, file.name);

    // 1. Decode image onto offscreen canvas
    const img = await loadImageFromFile(file);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = w;
    sourceCanvas.height = h;
    const sCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!sCtx) continue;

    sCtx.drawImage(img, 0, 0);
    const rawImageData = sCtx.getImageData(0, 0, w, h);

    // 2. Execute Dither + Tweaks + Post-Effects via unified worker/engine pipeline
    let ditheredImageData: ImageData = rawImageData;
    const algoId = state.algorithmId || 'floyd_steinberg';
    const currentAlgoParams = (state.algoParams && state.algoParams[algoId]) || {};

    let palette: number[][] = Array.isArray(state.workingPalette) && state.workingPalette.length > 0
      ? state.workingPalette.map((c: number[]) => [...c])
      : [[0, 0, 0], [255, 255, 255]];

    if (state.paletteDepth && state.paletteDepth > 0 && state.paletteDepth < palette.length) {
      palette = palette.slice(0, state.paletteDepth);
    }
    if (state.paletteFlipped) {
      palette = [...palette].reverse();
    }
    if (state.paletteInverted) {
      palette = palette.map((c: number[]) => [255 - c[0], 255 - c[1], 255 - c[2]]);
    }

    const activeEffects = Array.isArray(state.effects)
      ? state.effects.filter((e: any) => e.enabled)
      : [];

    const tweaks = {
      brightness: (state.brightness ?? 0) / 100,
      contrast: (state.contrast ?? 0) / 100,
      saturation: (state.saturation ?? 0) / 100,
      gamma: state.gamma ?? 1.0,
      hue: state.hue ?? 0
    };

    try {
      const clonedBuffer = new Uint8ClampedArray(rawImageData.data).buffer;
      const res = await ditherWorkerClient.execute({
        buffer: clonedBuffer,
        width: w,
        height: h,
        tweaks,
        algorithmId: algoId,
        palette,
        params: { ...currentAlgoParams, depth: state.depth ?? 8 },
        effects: activeEffects,
        renderMode: state.renderMode || 'dither',
        asciiSettings: state.asciiSettings,
        customCharsets: state.customCharsets,
        fps: state.fps ?? 30,
        frameIndex: 0,
        time: 0,
        isExport: true,
        coalesce: false
      });

      if (res.success && res.buffer) {
        const outW = res.width || w;
        const outH = res.height || h;
        const outBytes = new Uint8ClampedArray(res.buffer);
        ditheredImageData = new ImageData(outBytes, outW, outH);
      }
    } catch (e) {
      console.warn('[BatchProcessing] Worker execution failed, using raw fallback:', e);
    }

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = ditheredImageData.width;
    finalCanvas.height = ditheredImageData.height;
    const fCtx = finalCanvas.getContext('2d')!;
    fCtx.putImageData(ditheredImageData, 0, 0);

    // 4. Scale up if requested
    const outCanvas = renderScaledCanvas(finalCanvas, scale);

    // 5. Convert to blob and add to ZIP
    const blob = await canvasToBlob(outCanvas, format, quality);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const outExt = format === 'jpeg' ? 'jpg' : format;
    const outName = `${baseName}_dither_${algoId}_${scale}x.${outExt}`;

    zip.file(outName, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { zipBlob, count: files.length };
}

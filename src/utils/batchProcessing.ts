/**
 * Batch Image Processing Pipeline for DitherForge
 * Processes multiple image files using the active dither + tweaks + palette + effect pipeline,
 * and packages them into a ZIP archive.
 */

import JSZip from 'jszip';
import { ditherWorkerClient } from '../workers/ditherWorkerClient';
import { isLegacyAlgorithm, applyLegacyAlgorithm } from '../algorithms/legacy';
import { applyEffectPipeline } from '../effects';

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

    // 2. Execute Dither
    let ditheredImageData: ImageData;
    const algoId = state.algorithmId;
    const algoParams = state.algoParams || {};
    const palette = state.workingPalette || [[0, 0, 0], [255, 255, 255]];

    if (isLegacyAlgorithm(algoId)) {
      const clonedBytes = new Uint8ClampedArray(rawImageData.data);
      const outBytes = applyLegacyAlgorithm(w, h, clonedBytes, palette, algoId, algoParams);
      ditheredImageData = new ImageData(outBytes, w, h);
    } else {
      // Use Worker or Fallback client
      const tweaks = {
        brightness: state.brightness ?? 0,
        contrast: state.contrast ?? 0,
        saturation: state.saturation ?? 0,
        gamma: state.gamma ?? 1.0,
        hue: state.hue ?? 0,
        blur: state.blur ?? 0,
        denoise: state.denoise ?? 0,
        highlight: state.highlight ?? 0,
        depth: state.depth ?? 0
      };

      try {
        const res = await ditherWorkerClient.requestDither({
          imageData: rawImageData,
          algorithmId: algoId,
          algoParams,
          palette,
          tweaks
        });
        ditheredImageData = res.resultImageData;
      } catch (e) {
        // Fallback: draw unmodified raw
        ditheredImageData = rawImageData;
      }
    }

    // 3. Apply post effects if any
    if (Array.isArray(state.effects) && state.effects.length > 0) {
      const activeEffects = state.effects.filter((e: any) => e.enabled);
      if (activeEffects.length > 0) {
        try {
          applyEffectPipeline(ditheredImageData, activeEffects, {
            palette,
            fps: state.fps ?? 30,
            frameIndex: 0,
            time: 0
          });
        } catch (e) {
          console.warn('[BatchProcessing] Failed to apply post effects:', e);
        }
      }
    }

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = w;
    finalCanvas.height = h;
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

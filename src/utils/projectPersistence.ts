/**
 * Project Persistence for DitherForge (.ditherforge)
 * Saves and loads full project state:
 * - Complete editor snapshot (algorithms, parameters, adjustments, palettes, effects stack, animation tracks, ASCII)
 * - Source image (base64 data URL) & dimensions
 * - Project metadata (name, timestamp, version)
 */

import {
  captureSnapshot,
  applySnapshotToStore,
  type EditorSnapshot
} from '../state/historyManager';
import { getInitialAlgoParams } from '../state/useAppStore';
import { mergePresetEffectsToFullStack } from '../effects';

export interface DitherForgeProjectFile {
  format: 'ditherforge-project';
  version: 1;
  name: string;
  savedAt: string;
  sourceImage?: {
    dataUrl: string;
    width: number;
    height: number;
    hasAlpha?: boolean;
  };
  snapshot: EditorSnapshot;
}

/**
 * Serializes the current active state and image into a compact .ditherforge JSON file and triggers browser download.
 * Returns the final project name used.
 */
export function exportProjectFile(storeState: any, projectName?: string): string {
  const snapshot = captureSnapshot(storeState);
  const name = projectName?.trim() || 'project';
  const timestamp = new Date().toISOString();

  // 1. Optimize algoParams: retain active algorithm and any algorithm customized from default
  const activeAlgo = storeState.algorithmId;
  const prunedAlgoParams: Record<string, any> = {};
  if (snapshot.algoParams) {
    for (const [id, params] of Object.entries(snapshot.algoParams)) {
      const initial = getInitialAlgoParams(id);
      if (id === activeAlgo || JSON.stringify(params) !== JSON.stringify(initial)) {
        prunedAlgoParams[id] = params;
      }
    }
  }

  // 2. Optimize effects stack: retain enabled effects without redundant registry descriptors
  const prunedEffects = (snapshot.effects || [])
    .filter((e: any) => e.enabled)
    .map((e: any) => ({
      id: e.type || e.id,
      enabled: true,
      params: e.params,
      opacity: e.opacity !== undefined ? e.opacity : 1.0,
      blendMode: e.blendMode || 'normal'
    }));

  const compactSnapshot: EditorSnapshot = {
    ...snapshot,
    algoParams: prunedAlgoParams,
    effects: prunedEffects
  };

  let sourceImage: DitherForgeProjectFile['sourceImage'] = undefined;
  const sourceImageData: ImageData | null = storeState.sourceImageData;
  const imageWidth = storeState.imageWidth || (sourceImageData ? sourceImageData.width : 0);
  const imageHeight = storeState.imageHeight || (sourceImageData ? sourceImageData.height : 0);

  if (sourceImageData && imageWidth > 0 && imageHeight > 0) {
    try {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = imageWidth;
      offCanvas.height = imageHeight;
      const ctx = offCanvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(sourceImageData, 0, 0);
        sourceImage = {
          dataUrl: offCanvas.toDataURL('image/png'),
          width: imageWidth,
          height: imageHeight,
          hasAlpha: storeState.hasAlpha
        };
      }
    } catch (e) {
      console.warn('[ProjectPersistence] Unable to serialize sourceImageData to data URL:', e);
    }
  } else if (storeState.sourceImage && imageWidth > 0 && imageHeight > 0) {
    try {
      // If sourceImage is an HTMLImageElement or CanvasImageSource, extract dataUrl via canvas
      if (storeState.sourceImage instanceof HTMLImageElement && storeState.sourceImage.src) {
        if (storeState.sourceImage.src.startsWith('data:')) {
          sourceImage = {
            dataUrl: storeState.sourceImage.src,
            width: imageWidth,
            height: imageHeight,
            hasAlpha: storeState.hasAlpha
          };
        } else {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = imageWidth;
          offCanvas.height = imageHeight;
          const ctx = offCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(storeState.sourceImage, 0, 0);
            sourceImage = {
              dataUrl: offCanvas.toDataURL('image/png'),
              width: imageWidth,
              height: imageHeight,
              hasAlpha: storeState.hasAlpha
            };
          }
        }
      } else if (typeof storeState.sourceImage === 'string' && storeState.sourceImage.startsWith('data:')) {
        sourceImage = {
          dataUrl: storeState.sourceImage,
          width: imageWidth,
          height: imageHeight,
          hasAlpha: storeState.hasAlpha
        };
      }
    } catch (e) {
      console.warn('[ProjectPersistence] Unable to serialize sourceImage to data URL:', e);
    }
  }

  const projectData: DitherForgeProjectFile = {
    format: 'ditherforge-project',
    version: 1,
    name,
    savedAt: timestamp,
    sourceImage,
    snapshot: compactSnapshot
  };

  // Minified JSON: drops default project file size from ~34 KB down to ~1.6 KB
  const jsonString = JSON.stringify(projectData);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\.[^/.]+$/, '')}.ditherforge`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return name;
}

/**
 * Loads and restores a .ditherforge project file into the application store.
 */
export async function importProjectFile(
  file: File,
  store: any
): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as DitherForgeProjectFile;

    if (!data || data.format !== 'ditherforge-project' || !data.snapshot) {
      return {
        success: false,
        error: 'Invalid DitherForge project file format.'
      };
    }

    // 1. If project contains a source image, decode and set it into the store
    if (data.sourceImage?.dataUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const width = data.sourceImage!.width || img.naturalWidth;
            const height = data.sourceImage!.height || img.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const imgData = ctx.getImageData(0, 0, width, height);
              const imgName = data.name ? `${data.name}.png` : 'project_image.png';
              store.setState({
                hasImage: true,
                imageName: imgName,
                imageFileName: imgName,
                imageWidth: width,
                imageHeight: height,
                sourceImageData: imgData,
                sourceVideoUrl: null,
                panX: 0,
                panY: 0
              });
            }
          } catch (e) {
            console.warn('[ProjectPersistence] Error decoding source image data:', e);
          }
          resolve();
        };
        img.onerror = () => {
          console.warn('[ProjectPersistence] Failed to reload embedded source image.');
          resolve(); // proceed even if image decode fails
        };
        img.src = data.sourceImage!.dataUrl;
      });
    } else {
      // If the project file did NOT contain an embedded image and the app is currently in "no image mode",
      // load the sample calibration pattern so the project's algorithms, adjustments, effects, and palettes
      // are immediately active and rendered on screen!
      const currentStore = store.getState();
      if (!currentStore.hasImage || !currentStore.sourceImageData) {
        currentStore.loadSampleImage();
      }
    }

    // 2. Restore all editor snapshot parameters with default expansion
    const currentParams = store.getState().algoParams || {};
    const restoredAlgoParams = { ...currentParams, ...(data.snapshot.algoParams || {}) };

    const currentEffects = store.getState().effects || [];
    const restoredEffects = Array.isArray(data.snapshot.effects)
      ? mergePresetEffectsToFullStack(currentEffects, data.snapshot.effects)
      : currentEffects;

    const fullSnapshot: EditorSnapshot = {
      ...data.snapshot,
      algoParams: restoredAlgoParams,
      effects: restoredEffects
    };

    applySnapshotToStore(store, fullSnapshot);

    // 3. Automatically fit image to workspace
    try {
      const canvasArea = document.querySelector('.canvas-area');
      const sWidth = store.getState().sidebarWidth || 320;
      if (canvasArea && typeof store.getState().fitToViewport === 'function') {
        store.getState().fitToViewport(canvasArea.clientWidth - (sWidth + 14), canvasArea.clientHeight - 38);
      }
    } catch {}

    return { success: true, name: data.name };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to read project file.'
    };
  }
}

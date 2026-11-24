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
 * Serializes the current active state and image into a .ditherforge JSON file and triggers browser download.
 */
export function exportProjectFile(storeState: any, projectName?: string): void {
  const snapshot = captureSnapshot(storeState);
  const name = projectName || 'project';
  const timestamp = new Date().toISOString();

  let sourceImage: DitherForgeProjectFile['sourceImage'] = undefined;
  if (storeState.sourceImage && storeState.imageWidth && storeState.imageHeight) {
    try {
      // If sourceImage is an HTMLImageElement or CanvasImageSource, extract dataUrl via canvas
      if (storeState.sourceImage instanceof HTMLImageElement && storeState.sourceImage.src) {
        if (storeState.sourceImage.src.startsWith('data:')) {
          sourceImage = {
            dataUrl: storeState.sourceImage.src,
            width: storeState.imageWidth,
            height: storeState.imageHeight,
            hasAlpha: storeState.hasAlpha
          };
        } else {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = storeState.imageWidth;
          offCanvas.height = storeState.imageHeight;
          const ctx = offCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(storeState.sourceImage, 0, 0);
            sourceImage = {
              dataUrl: offCanvas.toDataURL('image/png'),
              width: storeState.imageWidth,
              height: storeState.imageHeight,
              hasAlpha: storeState.hasAlpha
            };
          }
        }
      } else if (typeof storeState.sourceImage === 'string' && storeState.sourceImage.startsWith('data:')) {
        sourceImage = {
          dataUrl: storeState.sourceImage,
          width: storeState.imageWidth,
          height: storeState.imageHeight,
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
    snapshot
  };

  const jsonString = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\.[^/.]+$/, '')}.ditherforge`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Loads and restores a .ditherforge project file into the application store.
 */
export async function importProjectFile(
  file: File,
  store: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as DitherForgeProjectFile;

    if (!data || data.format !== 'ditherforge-project' || !data.snapshot) {
      return {
        success: false,
        error: 'Invalid DitherForge project file format.'
      };
    }

    // 1. If project contains a source image, decode and set it first
    if (data.sourceImage?.dataUrl) {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          store.setState({
            sourceImage: img,
            imageWidth: data.sourceImage!.width || img.naturalWidth,
            imageHeight: data.sourceImage!.height || img.naturalHeight,
            hasAlpha: Boolean(data.sourceImage!.hasAlpha)
          });
          resolve();
        };
        img.onerror = () => {
          console.warn('[ProjectPersistence] Failed to reload embedded source image.');
          resolve(); // proceed even if image decode fails
        };
        img.src = data.sourceImage!.dataUrl;
      });
    }

    // 2. Restore all editor snapshot parameters
    applySnapshotToStore(store, data.snapshot);

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to read project file.'
    };
  }
}

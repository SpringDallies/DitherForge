import type { AsciiCharsetDefinition, AsciiSettings, GlyphAtlasData } from './types';
import { findCharsetById, resolveActiveChars } from './charsets';
import { computeGridLayout } from './pipeline';
import { buildOrGetGlyphAtlas } from './calibration';

export interface SerializedGlyphAtlas {
  key: string;
  chars: string[];
  cellWidth: number;
  cellHeight: number;
  alphaBitmaps: ArrayBuffer;
  coverages: ArrayBuffer;
  zones: ArrayBuffer;
  missingGlyphRatio: number;
  byteLength: number;
}

export const DEFAULT_WORKER_ATLAS_CACHE_LIMIT = 16;

export function buildAtlasForAsciiSettings(
  settings: AsciiSettings,
  width: number,
  height: number,
  customCharsets?: AsciiCharsetDefinition[]
): GlyphAtlasData {
  const charsetDef = findCharsetById(settings.charsetId, customCharsets);
  const chars = resolveActiveChars(
    {
      charsetId: settings.charsetId,
      customCharsetChars: settings.customCharsetChars,
      injectedChars: settings.injectedChars,
      injectMode: settings.injectMode,
      reverseCharset: settings.reverseCharset,
      characterDepth: settings.characterDepth,
      characterOffset: settings.characterOffset
    },
    customCharsets
  );

  const { cellW, cellH } = computeGridLayout(width, height, settings);

  return buildOrGetGlyphAtlas({
    chars,
    fontFamily: settings.fontFamily,
    fontWeight: settings.fontWeight,
    cellWidth: cellW,
    cellHeight: cellH,
    glyphScale: settings.glyphScale,
    glyphAlign: settings.glyphAlign,
    autoCalibrateOrder: settings.autoCalibrateOrder,
    forceTextPresentation: charsetDef.forceTextPresentation
  });
}

export function serializeGlyphAtlas(atlas: GlyphAtlasData): {
  payload: SerializedGlyphAtlas;
  transferables: ArrayBuffer[];
} {
  const alphaCopy = atlas.alphaBitmaps.slice();
  const covCopy = atlas.coverages.slice();
  const zoneCopy = atlas.zones.slice();

  const payload: SerializedGlyphAtlas = {
    key: atlas.key,
    chars: atlas.chars.slice(),
    cellWidth: atlas.cellWidth,
    cellHeight: atlas.cellHeight,
    alphaBitmaps: alphaCopy.buffer,
    coverages: covCopy.buffer,
    zones: zoneCopy.buffer,
    missingGlyphRatio: atlas.missingGlyphRatio,
    byteLength: atlas.byteLength
  };

  return {
    payload,
    transferables: [alphaCopy.buffer, covCopy.buffer, zoneCopy.buffer]
  };
}

export function deserializeGlyphAtlas(payload: SerializedGlyphAtlas): GlyphAtlasData {
  return {
    key: payload.key,
    chars: payload.chars,
    cellWidth: payload.cellWidth,
    cellHeight: payload.cellHeight,
    alphaBitmaps: new Uint8Array(payload.alphaBitmaps),
    coverages: new Float32Array(payload.coverages),
    zones: new Float32Array(payload.zones),
    missingGlyphRatio: payload.missingGlyphRatio,
    byteLength: payload.byteLength
  };
}

export class WorkerAtlasLruCache {
  private map: Map<string, GlyphAtlasData> = new Map();
  private readonly maxEntries: number;

  constructor(maxEntries: number = DEFAULT_WORKER_ATLAS_CACHE_LIMIT) {
    this.maxEntries = Math.max(2, maxEntries);
  }

  public get(key: string): GlyphAtlasData | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    this.map.delete(key);
    this.map.set(key, hit);
    return hit;
  }

  public set(atlas: GlyphAtlasData): void {
    if (this.map.has(atlas.key)) {
      this.map.delete(atlas.key);
    } else if (this.map.size >= this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
    this.map.set(atlas.key, atlas);
  }

  public has(key: string): boolean {
    return this.map.has(key);
  }

  public delete(key: string): void {
    this.map.delete(key);
  }

  public clear(): void {
    this.map.clear();
  }

  public get size(): number {
    return this.map.size;
  }
}

export class MainThreadAtlasSyncTracker {
  private syncedKeys: Set<string> = new Set();
  private readonly maxEntries: number;

  constructor(maxEntries: number = DEFAULT_WORKER_ATLAS_CACHE_LIMIT) {
    this.maxEntries = Math.max(2, maxEntries);
  }

  public syncIfNeeded(atlas: GlyphAtlasData): {
    key: string;
    payload?: SerializedGlyphAtlas;
    transferables: ArrayBuffer[];
  } {
    if (this.syncedKeys.has(atlas.key)) {
      this.syncedKeys.delete(atlas.key);
      this.syncedKeys.add(atlas.key);
      return { key: atlas.key, transferables: [] };
    }

    if (this.syncedKeys.size >= this.maxEntries) {
      const oldestKey = this.syncedKeys.keys().next().value;
      if (oldestKey !== undefined) {
        this.syncedKeys.delete(oldestKey);
      }
    }
    this.syncedKeys.add(atlas.key);

    const { payload, transferables } = serializeGlyphAtlas(atlas);
    return {
      key: atlas.key,
      payload,
      transferables
    };
  }

  public invalidateKeys(keys: string[]): void {
    for (let i = 0; i < keys.length; i++) {
      this.syncedKeys.delete(keys[i]);
    }
  }

  public reset(): void {
    this.syncedKeys.clear();
  }
}

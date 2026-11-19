import { ALGORITHM_REGISTRY } from '../dither-engine/algorithms.js';
import { BUILTIN_PALETTES } from '../dither-engine/palettes.js';
import { applyTweaksFast } from '../utils/fastTweaks';
import {
  ASCII_ALGORITHM_REGISTRY,
  DEFAULT_ASCII_SETTINGS,
  buildOrGetGlyphAtlas,
  computeGridLayout,
  createDefaultAsciiEffect,
  findCharsetById,
  isAsciiAlgorithmId,
  renderAsciiFrame,
  resolveActiveChars,
  type AsciiAlgorithmId,
  type AsciiCharsetDefinition,
  type AsciiEffectId,
  type AsciiRenderResult,
  type AsciiSettings,
  type GlyphAtlasData
} from './index';

/**
 * Combined algorithm registry merging frozen ALGORITHM_REGISTRY (84) + ASCII_ALGORITHM_REGISTRY (24) = 108.
 * Never mutates the frozen ALGORITHM_REGISTRY array.
 */
export function getCombinedAlgorithmRegistry(): any[] {
  return [...ALGORITHM_REGISTRY, ...ASCII_ALGORITHM_REGISTRY];
}

export function findCombinedAlgorithm(id: string): any {
  const combined = getCombinedAlgorithmRegistry();
  const exact = combined.find((a) => a.id === id);
  if (exact) return exact;
  const norm = (id || '').replace(/_/g, '-');
  return combined.find((a) => a.id === norm) || ALGORITHM_REGISTRY[0];
}

/**
 * Resolves and caches a GlyphAtlasData on the main thread (using OS Canvas 2D fonts where available)
 * ready to be synced once-per-key into dither.worker.ts.
 */
export function prepareAtlasForSettings(
  settings: AsciiSettings,
  width: number,
  height: number,
  customCharsets?: AsciiCharsetDefinition[]
): GlyphAtlasData {
  const charsetDef = findCharsetById(settings.charsetId, customCharsets);
  const chars = resolveActiveChars({
    charsetId: settings.charsetId,
    customCharsetChars: settings.customCharsetChars,
    injectedChars: settings.injectedChars,
    injectMode: settings.injectMode,
    reverseCharset: settings.reverseCharset,
    characterDepth: settings.characterDepth,
    characterOffset: settings.characterOffset,
    customSets: customCharsets
  });
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

function upsertAsciiEffectParam(
  settings: AsciiSettings,
  effectId: AsciiEffectId,
  paramKey: string,
  value: number
): void {
  const existing = settings.asciiEffects.find((e) => e.id === effectId);
  if (existing) {
    existing.enabled = true;
    existing.params = { ...existing.params, [paramKey]: value };
  } else {
    const created = createDefaultAsciiEffect(effectId);
    created.params[paramKey] = value;
    settings.asciiEffects.push(created);
  }
}

/**
 * Applies active animation-track overrides (evaluated into `effStyleOverrides`) onto a cloned AsciiSettings.
 * Used identically by CenterViewport.tsx (live preview) and animationExport.ts (offline exports).
 */
export function resolveEffectiveAsciiSettings(
  baseSettings: AsciiSettings | undefined,
  algorithmId: string,
  effAlgoParams: Record<string, any>
): AsciiSettings {
  const base = baseSettings ?? DEFAULT_ASCII_SETTINGS;
  const resolvedAlgoId: AsciiAlgorithmId = isAsciiAlgorithmId(algorithmId)
    ? algorithmId
    : base.algorithmId;

  const eff: AsciiSettings = {
    ...base,
    algorithmId: resolvedAlgoId,
    injectedChars: [...(base.injectedChars || [])],
    algoParams: { ...(base.algoParams || {}), ...(effAlgoParams || {}) },
    asciiEffects: (base.asciiEffects || []).map((e) => ({
      ...e,
      params: { ...(e.params || {}) }
    }))
  };

  // Map animatable ASCII style track overrides onto AsciiSettings fields
  if (typeof effAlgoParams.characterDepth === 'number') {
    eff.characterDepth = Math.max(2, Math.min(256, Math.round(effAlgoParams.characterDepth)));
  }
  if (typeof effAlgoParams.characterOffset === 'number') {
    eff.characterOffset = Math.round(effAlgoParams.characterOffset);
  }
  if (typeof effAlgoParams.cellWidth === 'number') {
    eff.cellWidth = Math.max(4, Math.min(32, Math.round(effAlgoParams.cellWidth)));
  }
  if (typeof effAlgoParams.cellHeight === 'number') {
    eff.cellHeight = Math.max(4, Math.min(48, Math.round(effAlgoParams.cellHeight)));
  }
  if (typeof effAlgoParams.cellSpacing === 'number') {
    eff.cellSpacing = Math.max(0, Math.min(12, Math.round(effAlgoParams.cellSpacing)));
  }
  if (typeof effAlgoParams.asciiBrightness === 'number') {
    eff.brightness = Math.max(-1, Math.min(1, effAlgoParams.asciiBrightness));
  }
  if (typeof effAlgoParams.asciiContrast === 'number') {
    eff.contrast = Math.max(-1, Math.min(1, effAlgoParams.asciiContrast));
  }
  if (typeof effAlgoParams.asciiGamma === 'number') {
    eff.gamma = Math.max(0.2, Math.min(3.0, effAlgoParams.asciiGamma));
  }
  if (typeof effAlgoParams.foregroundOpacity === 'number') {
    eff.foregroundOpacity = Math.max(0, Math.min(1, effAlgoParams.foregroundOpacity));
  }
  if (typeof effAlgoParams.backgroundOpacity === 'number') {
    eff.backgroundOpacity = Math.max(0, Math.min(1, effAlgoParams.backgroundOpacity));
  }
  if (typeof effAlgoParams.sweepPosition === 'number') {
    upsertAsciiEffectParam(eff, 'ascii_glyph_sweep', 'position', effAlgoParams.sweepPosition);
  }
  if (typeof effAlgoParams.sweepSpeed === 'number') {
    upsertAsciiEffectParam(eff, 'ascii_glyph_sweep', 'speed', effAlgoParams.sweepSpeed);
  }
  if (typeof effAlgoParams.glitchIntensity === 'number') {
    upsertAsciiEffectParam(eff, 'ascii_char_glitch', 'intensity', effAlgoParams.glitchIntensity);
  }
  if (typeof effAlgoParams.flickerIntensity === 'number') {
    upsertAsciiEffectParam(eff, 'ascii_char_flicker', 'intensity', effAlgoParams.flickerIntensity);
  }
  if (typeof effAlgoParams.densityPulseAmp === 'number') {
    upsertAsciiEffectParam(eff, 'ascii_density_pulse', 'amplitude', effAlgoParams.densityPulseAmp);
  }

  return eff;
}

/**
 * Produces a deterministic full-resolution AsciiRenderResult (including true AsciiGridFrame)
 * directly from the current Zustand store state for ExportModal TXT & Image export.
 */
export function renderAsciiExportFromStore(storeState: any): AsciiRenderResult | null {
  const src: ImageData | null = storeState?.sourceImageData;
  if (!src || src.width <= 0 || src.height <= 0) return null;

  const width = src.width;
  const height = src.height;
  const work = new Uint8ClampedArray(src.data);

  applyTweaksFast(work, width, height, {
    brightness: (storeState.brightness || 0) / 100,
    contrast: (storeState.contrast || 0) / 100,
    saturation: (storeState.saturation || 0) / 100,
    gamma: storeState.gamma || 1.0,
    hue: storeState.hue || 0
  });

  const palette: number[][] =
    storeState.workingPalette && storeState.workingPalette.length > 0
      ? storeState.workingPalette.slice(
          0,
          Math.max(2, Math.min(storeState.paletteDepth || storeState.workingPalette.length, storeState.workingPalette.length))
        )
      : BUILTIN_PALETTES[0].colors;

  // If using composable ASCII effect in stack while on a non-ASCII algorithm, read its params
  let effectiveSettings: AsciiSettings;
  const asciiEffItem = (storeState.effects || []).find(
    (e: any) => e && e.enabled && (e.id === 'ascii_render' || e.type === 'ascii_render')
  );

  if (isAsciiAlgorithmId(storeState.algorithmId)) {
    const algoParams = storeState.algoParams?.[storeState.algorithmId] || {};
    effectiveSettings = resolveEffectiveAsciiSettings(storeState.asciiSettings, storeState.algorithmId, algoParams);
  } else if (asciiEffItem) {
    const p = asciiEffItem.params || {};
    effectiveSettings = {
      ...DEFAULT_ASCII_SETTINGS,
      ...(storeState.asciiSettings || {}),
      algorithmId: isAsciiAlgorithmId(p.algorithmId) ? p.algorithmId : (storeState.asciiSettings?.algorithmId || 'ascii-classic-ramp'),
      charsetId: typeof p.charsetId === 'string' ? p.charsetId : (storeState.asciiSettings?.charsetId || 'classic_standard'),
      cellWidth: typeof p.cellWidth === 'number' ? p.cellWidth : (storeState.asciiSettings?.cellWidth || 8),
      cellHeight: typeof p.cellHeight === 'number' ? p.cellHeight : (storeState.asciiSettings?.cellHeight || 14),
      characterDepth: typeof p.characterDepth === 'number' ? p.characterDepth : (storeState.asciiSettings?.characterDepth || 16),
      characterOffset: typeof p.characterOffset === 'number' ? p.characterOffset : 0,
      colorMode: p.colorMode || storeState.asciiSettings?.colorMode || 'source',
      backgroundMode: p.backgroundMode || storeState.asciiSettings?.backgroundMode || 'solid'
    };
  } else {
    effectiveSettings = resolveEffectiveAsciiSettings(storeState.asciiSettings, 'ascii-classic-ramp', {});
  }

  const atlas = prepareAtlasForSettings(effectiveSettings, width, height, storeState.customCharsets);
  const t = storeState.currentTime || 0;
  const fps = storeState.fps || 30;
  const frameIndex = Math.round(t * fps);

  return renderAsciiFrame(work, effectiveSettings, {
    width,
    height,
    frameIndex,
    time: t,
    fps,
    palette,
    previewScale: 1.0,
    isExport: true,
    atlas
  });
}

/** Validates an incoming AsciiSettings object (e.g. from imported preset JSON) with safe defaults. */
export function sanitizeAsciiSettings(raw: unknown): AsciiSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ASCII_SETTINGS, algoParams: {}, asciiEffects: [], injectedChars: [] };
  }
  const r = raw as Record<string, any>;
  const safeAlgo: AsciiAlgorithmId = isAsciiAlgorithmId(String(r.algorithmId || ''))
    ? (r.algorithmId as AsciiAlgorithmId)
    : DEFAULT_ASCII_SETTINGS.algorithmId;

  const num = (v: unknown, def: number, min: number, max: number) =>
    typeof v === 'number' && isFinite(v) ? Math.max(min, Math.min(max, v)) : def;

  return {
    ...DEFAULT_ASCII_SETTINGS,
    algorithmId: safeAlgo,
    charsetId: typeof r.charsetId === 'string' && r.charsetId.trim() ? r.charsetId : DEFAULT_ASCII_SETTINGS.charsetId,
    customCharsetChars: typeof r.customCharsetChars === 'string' ? r.customCharsetChars : '',
    characterDepth: Math.round(num(r.characterDepth, DEFAULT_ASCII_SETTINGS.characterDepth, 2, 256)),
    characterOffset: Math.round(num(r.characterOffset, 0, -64, 64)),
    injectedChars: Array.isArray(r.injectedChars)
      ? r.injectedChars.filter((c) => typeof c === 'string').slice(0, 10)
      : [],
    injectMode: ['append', 'prepend', 'interleave', 'replace'].includes(r.injectMode)
      ? r.injectMode
      : DEFAULT_ASCII_SETTINGS.injectMode,
    reverseCharset: Boolean(r.reverseCharset),
    autoCalibrateOrder: Boolean(r.autoCalibrateOrder),
    fontFamily: typeof r.fontFamily === 'string' && r.fontFamily.trim() ? r.fontFamily : DEFAULT_ASCII_SETTINGS.fontFamily,
    fontWeight: Math.round(num(r.fontWeight, DEFAULT_ASCII_SETTINGS.fontWeight, 300, 900)),
    cellWidth: Math.round(num(r.cellWidth, DEFAULT_ASCII_SETTINGS.cellWidth, 4, 32)),
    cellHeight: Math.round(num(r.cellHeight, DEFAULT_ASCII_SETTINGS.cellHeight, 4, 48)),
    cellSpacing: Math.round(num(r.cellSpacing, DEFAULT_ASCII_SETTINGS.cellSpacing, 0, 12)),
    aspectRatio: num(r.aspectRatio, DEFAULT_ASCII_SETTINGS.aspectRatio, 0.3, 2.0),
    glyphScale: num(r.glyphScale, DEFAULT_ASCII_SETTINGS.glyphScale, 0.5, 1.5),
    glyphAlign: ['center', 'left', 'right'].includes(r.glyphAlign) ? r.glyphAlign : 'center',
    brightness: num(r.brightness, 0, -1, 1),
    contrast: num(r.contrast, 0, -1, 1),
    gamma: num(r.gamma, 1.0, 0.2, 3.0),
    exposure: num(r.exposure, 0, -2, 2),
    blackPoint: num(r.blackPoint, 0, 0, 0.5),
    whitePoint: num(r.whitePoint, 1, 0.5, 1),
    invert: Boolean(r.invert),
    luminanceMode: r.luminanceMode === 'local' ? 'local' : 'global',
    edgeSensitivity: num(r.edgeSensitivity, 0.5, 0, 2),
    detailPreservation: num(r.detailPreservation, 0.5, 0, 1),
    samplingQuality: ['fast', 'box', 'subcell'].includes(r.samplingQuality) ? r.samplingQuality : 'box',
    smoothing: num(r.smoothing, 0, 0, 3),
    sharpening: num(r.sharpening, 0, 0, 2),
    colorMode: ['monochrome', 'source', 'palette', 'single', 'custom'].includes(r.colorMode) ? r.colorMode : 'source',
    foregroundColor: typeof r.foregroundColor === 'string' ? r.foregroundColor : DEFAULT_ASCII_SETTINGS.foregroundColor,
    foregroundOpacity: num(r.foregroundOpacity, 1, 0, 1),
    colorQuantization: Math.round(num(r.colorQuantization, 0, 0, 32)),
    preserveAlpha: r.preserveAlpha !== false,
    backgroundMode: ['transparent', 'solid', 'original', 'custom'].includes(r.backgroundMode) ? r.backgroundMode : 'solid',
    backgroundColor: typeof r.backgroundColor === 'string' ? r.backgroundColor : DEFAULT_ASCII_SETTINGS.backgroundColor,
    backgroundOpacity: num(r.backgroundOpacity, 1, 0, 1),
    densityCalibration: r.densityCalibration !== false,
    clipping: r.clipping !== false,
    algoParams: r.algoParams && typeof r.algoParams === 'object' ? { ...r.algoParams } : {},
    asciiEffects: Array.isArray(r.asciiEffects)
      ? r.asciiEffects
          .filter((e: any) => e && typeof e.id === 'string')
          .map((e: any) => ({
            id: e.id,
            enabled: Boolean(e.enabled),
            stage: e.stage === 'pixel' || e.stage === 'mixed' ? e.stage : 'grid',
            params: e.params && typeof e.params === 'object' ? { ...e.params } : {}
          }))
      : []
  };
}

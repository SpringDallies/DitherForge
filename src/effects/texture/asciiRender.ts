// src/effects/texture/asciiRender.ts
// Composable ASCII Render Effect (id: 'ascii_render', category: 'texture')

import type { EffectContext, EffectDescriptor, ParamMeta } from '../types';
import {
  ASCII_ALGORITHM_REGISTRY,
  BUILTIN_ASCII_CHARSETS,
  DEFAULT_ASCII_SETTINGS,
  isAsciiAlgorithmId,
  renderAsciiFrame,
  type AsciiAlgorithmId,
  type AsciiBackgroundMode,
  type AsciiColorMode,
  type AsciiSettings,
  type GlyphAtlasData
} from '../../ascii';

export const ASCII_RENDER_EFFECT_ID = 'ascii_render';

export interface AsciiRenderEffectParams {
  algorithmId: AsciiAlgorithmId;
  charsetId: string;
  cellWidth: number;
  cellHeight: number;
  characterDepth: number;
  characterOffset: number;
  colorMode: AsciiColorMode;
  backgroundMode: AsciiBackgroundMode;
  foregroundColor: string;
  backgroundColor: string;
  invert: boolean;
}

export const DEFAULT_ASCII_RENDER_EFFECT_PARAMS: AsciiRenderEffectParams = {
  algorithmId: 'ascii-classic-ramp',
  charsetId: 'classic_standard',
  cellWidth: 8,
  cellHeight: 14,
  characterDepth: 16,
  characterOffset: 0,
  colorMode: 'source',
  backgroundMode: 'solid',
  foregroundColor: '#e6edf3',
  backgroundColor: '#0d0e11',
  invert: false
};

export function effectParamsToAsciiSettings(params?: Partial<AsciiRenderEffectParams>): AsciiSettings {
  const p = params || {};
  const algoId: AsciiAlgorithmId =
    p.algorithmId && isAsciiAlgorithmId(p.algorithmId)
      ? p.algorithmId
      : 'ascii-classic-ramp';

  return {
    ...DEFAULT_ASCII_SETTINGS,
    algorithmId: algoId,
    charsetId: p.charsetId || 'classic_standard',
    cellWidth: Number(p.cellWidth ?? 8),
    cellHeight: Number(p.cellHeight ?? 14),
    characterDepth: Number(p.characterDepth ?? 16),
    characterOffset: Number(p.characterOffset ?? 0),
    colorMode: (p.colorMode as AsciiColorMode) || 'source',
    blendMode: 'normal',
    backgroundMode: (p.backgroundMode as AsciiBackgroundMode) || 'solid',
    backgroundBlur: 0,
    foregroundColor: p.foregroundColor || '#e6edf3',
    backgroundColor: p.backgroundColor || '#0d0e11',
    invert: Boolean(p.invert)
  };
}

const asciiEffectParamsMeta: ParamMeta[] = [
  {
    id: 'algorithmId',
    label: 'ASCII Algorithm',
    type: 'select',
    defaultValue: 'ascii-classic-ramp',
    options: ASCII_ALGORITHM_REGISTRY.map((a) => ({ value: a.id, label: a.name }))
  },
  {
    id: 'charsetId',
    label: 'Character Set',
    type: 'select',
    defaultValue: 'classic_standard',
    options: BUILTIN_ASCII_CHARSETS.map((c) => ({ value: c.id, label: c.name }))
  },
  {
    id: 'cellWidth',
    label: 'Cell Width',
    type: 'number',
    min: 4,
    max: 32,
    step: 1,
    defaultValue: 8,
    unit: 'px'
  },
  {
    id: 'cellHeight',
    label: 'Cell Height',
    type: 'number',
    min: 4,
    max: 48,
    step: 1,
    defaultValue: 14,
    unit: 'px'
  },
  {
    id: 'characterDepth',
    label: 'Character Depth',
    type: 'number',
    min: 2,
    max: 64,
    step: 1,
    defaultValue: 16
  },
  {
    id: 'characterOffset',
    label: 'Character Offset',
    type: 'number',
    min: -32,
    max: 32,
    step: 1,
    defaultValue: 0
  },
  {
    id: 'colorMode',
    label: 'Color Mode',
    type: 'select',
    defaultValue: 'source',
    options: [
      { value: 'source', label: 'Source Colors' },
      { value: 'monochrome', label: 'Monochrome' },
      { value: 'palette', label: 'Active Palette' },
      { value: 'single', label: 'Single Tint' }
    ]
  },
  {
    id: 'backgroundMode',
    label: 'Background',
    type: 'select',
    defaultValue: 'solid',
    options: [
      { value: 'solid', label: 'Solid Color' },
      { value: 'transparent', label: 'Transparent' },
      { value: 'original', label: 'Original Image' }
    ]
  },
  {
    id: 'foregroundColor',
    label: 'Foreground Color',
    type: 'color',
    defaultValue: '#e6edf3'
  },
  {
    id: 'backgroundColor',
    label: 'Background Color',
    type: 'color',
    defaultValue: '#0d0e11'
  },
  {
    id: 'invert',
    label: 'Invert Density',
    type: 'boolean',
    defaultValue: false
  }
];

let asciiScratchIn: Uint8ClampedArray | null = null;

export function applyAsciiRenderEffect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: Partial<AsciiRenderEffectParams>,
  context?: EffectContext
): void {
  if (width <= 0 || height <= 0) return;
  // Guard: Avoid duplicate ASCII rendering if the dedicated ASCII algorithm pipeline is active
  if ((context as any)?.renderMode === 'ascii') return;

  if (!asciiScratchIn || asciiScratchIn.length !== data.length) {
    asciiScratchIn = new Uint8ClampedArray(data.length);
  }
  asciiScratchIn.set(data);

  const settings = effectParamsToAsciiSettings(params);

  // Resolve atlas from context or effectItemId
  const itemId = context?.effectItemId || ASCII_RENDER_EFFECT_ID;
  const atlasKey = context?.asciiEffectAtlasKeys?.[itemId] ?? context?.asciiEffectAtlasKeys?.[ASCII_RENDER_EFFECT_ID];
  const atlas = (atlasKey && context?.asciiAtlases?.[atlasKey]) || (context as any)?.asciiAtlas || null;

  const palette = context?.palette ?? [[0, 0, 0, 255], [255, 255, 255, 255]];

  renderAsciiFrame(
    asciiScratchIn,
    settings,
    {
      width,
      height,
      frameIndex: context?.frameIndex ?? 0,
      time: context?.time ?? 0,
      fps: context?.fps ?? 30,
      palette,
      previewScale: 1.0,
      isExport: false,
      atlas,
      customCharsets: context?.customCharsets
    },
    data
  );
}

export const asciiRenderEffect: EffectDescriptor<AsciiRenderEffectParams> = {
  id: ASCII_RENDER_EFFECT_ID,
  name: 'ASCII Render',
  category: 'texture',
  description: 'Composable character-grid ASCII rendering powered by the shared ASCII engine.',
  defaultParams: DEFAULT_ASCII_RENDER_EFFECT_PARAMS,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  mutatesAlpha: false,
  canOperateInPlace: false,
  paramsMeta: asciiEffectParamsMeta,
  apply: (data, width, height, params, context) =>
    applyAsciiRenderEffect(data, width, height, params || {}, context)
};

export const asciiEffects: EffectDescriptor[] = [asciiRenderEffect];

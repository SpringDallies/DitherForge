// Blueprint / Cyanotype Effect
// Architectural blueprint: tonal inversion + Prussian blue/cyan toning + drafting grid
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  hexToRgb,
  clamp
} from './shared';

export interface BlueprintParams {
  tint?: string; // Deep Prussian Cyan tone (default: '#0a2f64')
  gridSize?: number; // 8 to 64 pixels (default: 24)
  gridOpacity?: number; // 0 to 1 (default: 0.35)
  gridColor?: string; // (default: '#3fa9f5')
  invert?: boolean; // (default: true)
}

export const blueprintDefaultParams: Required<BlueprintParams> = {
  tint: '#0a2f64',
  gridSize: 24,
  gridOpacity: 0.35,
  gridColor: '#3fa9f5',
  invert: true
};

export function applyBlueprint(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...blueprintDefaultParams, ...resolved.params };

  const tint = hexToRgb(p.tint);
  const gridColor = hexToRgb(p.gridColor);
  const gridSize = clamp(Math.round(p.gridSize), 6, 128);
  const gridOpacity = clamp(p.gridOpacity, 0, 1);
  const invert = Boolean(p.invert);

  const totalPixels = width * height;

  // Preserve alpha
  const origAlpha = new Uint8ClampedArray(totalPixels);
  for (let i = 0, a = 3; i < totalPixels; i++, a += 4) {
    origAlpha[i] = data[a];
  }

  // Prussian Blue Gradient endpoints:
  // Dark: Deep Navy Tint
  // Mid: Vibrant Cyan
  // High: Pale Blueprint Paper Highlight
  const cMid: [number, number, number] = [26, 107, 186];
  const cHigh: [number, number, number] = [232, 244, 252];

  // Precompute 256-entry lookup table for tone-mapping
  const lutR = new Uint8Array(256);
  const lutG = new Uint8Array(256);
  const lutB = new Uint8Array(256);

  for (let i = 0; i < 256; i++) {
    const norm = invert ? (255 - i) / 255.0 : i / 255.0;
    let r: number, g: number, b: number;
    if (norm < 0.5) {
      const t = norm / 0.5;
      r = tint[0] + (cMid[0] - tint[0]) * t;
      g = tint[1] + (cMid[1] - tint[1]) * t;
      b = tint[2] + (cMid[2] - tint[2]) * t;
    } else {
      const t = (norm - 0.5) / 0.5;
      r = cMid[0] + (cHigh[0] - cMid[0]) * t;
      g = cMid[1] + (cHigh[1] - cMid[1]) * t;
      b = cMid[2] + (cHigh[2] - cMid[2]) * t;
    }
    lutR[i] = clamp(Math.round(r), 0, 255);
    lutG[i] = clamp(Math.round(g), 0, 255);
    lutB[i] = clamp(Math.round(b), 0, 255);
  }

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    const isGridY = (y % gridSize === 0) || ((y + 1) % (gridSize * 4) === 0);

    for (let x = 0; x < width; x++) {
      const idx = (rowOffset + x) * 4;

      // Extract luminance
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);

      let outR = lutR[luma];
      let outG = lutG[luma];
      let outB = lutB[luma];

      // Drafting coordinate grid lines
      const isGridX = (x % gridSize === 0) || ((x + 1) % (gridSize * 4) === 0);
      if (gridOpacity > 0 && (isGridY || isGridX)) {
        const major = ((y + 1) % (gridSize * 4) === 0) || ((x + 1) % (gridSize * 4) === 0);
        const op = major ? Math.min(1, gridOpacity * 1.5) : gridOpacity * 0.7;
        outR = clamp(Math.round(outR + (gridColor[0] - outR) * op), 0, 255);
        outG = clamp(Math.round(outG + (gridColor[1] - outG) * op), 0, 255);
        outB = clamp(Math.round(outB + (gridColor[2] - outB) * op), 0, 255);
      }

      data[idx] = outR;
      data[idx + 1] = outG;
      data[idx + 2] = outB;
      data[idx + 3] = origAlpha[rowOffset + x];
    }
  }
}

export const blueprintParamsMeta: ParamMeta[] = [
  {
    id: 'tint',
    label: 'Blueprint Tint',
    type: 'color',
    defaultValue: '#0a2f64'
  },
  {
    id: 'gridSize',
    label: 'Grid Spacing',
    type: 'number',
    min: 8,
    max: 64,
    step: 4,
    defaultValue: 24
  },
  {
    id: 'gridOpacity',
    label: 'Grid Opacity',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.35
  },
  {
    id: 'gridColor',
    label: 'Grid Line Color',
    type: 'color',
    defaultValue: '#3fa9f5'
  },
  {
    id: 'invert',
    label: 'Invert Luminance',
    type: 'boolean',
    defaultValue: true
  }
];

export const blueprintEffect: EffectDescriptor<BlueprintParams> = {
  id: 'blueprint_cyanotype',
  name: 'Blueprint / Cyanotype',
  category: 'color',
  description: 'Architectural blueprint cyanotype with drafting coordinate grid',
  defaultParams: blueprintDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: blueprintParamsMeta,
  params: blueprintParamsMeta,
  apply: applyBlueprint
};

export const blueprintDescriptor = blueprintEffect;
export default blueprintEffect;

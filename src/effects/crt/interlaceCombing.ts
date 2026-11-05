// DitherForge Interlace Combing Effect
// Emulates 480i / 576i interlaced field offset with characteristic jagged edge combing

import type { EffectDescriptor, ParamMeta, EffectContext } from '../types';

export interface InterlaceCombingParams {
  fieldOffset: number;
  fieldPolarity: 'odd_first' | 'even_first';
  temporal: boolean;
}

const paramsMeta: ParamMeta[] = [
  {
    id: 'fieldOffset',
    label: 'Field Offset Distance',
    type: 'range',
    min: -20,
    max: 20,
    step: 0.5,
    defaultValue: 4.0,
    unit: 'px'
  },
  {
    id: 'fieldPolarity',
    label: 'Field Order',
    type: 'select',
    options: [
      { value: 'odd_first', label: 'Upper Field First (Odd)' },
      { value: 'even_first', label: 'Lower Field First (Even)' }
    ],
    defaultValue: 'odd_first'
  },
  {
    id: 'temporal',
    label: 'Animate Field Bobbing',
    type: 'boolean',
    defaultValue: true
  }
];

export const interlaceCombingEffect: EffectDescriptor<InterlaceCombingParams> = {
  id: 'interlace_combing',
  name: 'Interlace Combing',
  category: 'crt',
  description: 'Simulates 480i / 576i alternate field capture timing creating distinctive serrated combing artifacts.',
  defaultParams: {
    fieldOffset: 4.0,
    fieldPolarity: 'odd_first',
    temporal: true
  },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta,
  apply: (dataOrCtx, widthOrParams, height, paramsArg, contextArg) => {
    let data: Uint8ClampedArray;
    let w: number;
    let h: number;
    let params: InterlaceCombingParams;
    let context: EffectContext = {};

    if (dataOrCtx && dataOrCtx.data && typeof dataOrCtx.width === 'number') {
      data = dataOrCtx.data;
      w = dataOrCtx.width;
      h = dataOrCtx.height;
      params = (widthOrParams || {}) as InterlaceCombingParams;
      context = (height || {}) as EffectContext;
    } else {
      data = dataOrCtx;
      w = widthOrParams;
      h = height;
      params = (paramsArg || {}) as InterlaceCombingParams;
      context = contextArg || {};
    }

    const {
      fieldOffset = 4.0,
      fieldPolarity = 'odd_first',
      temporal = true
    } = params;

    if (Math.abs(fieldOffset) <= 0.01) return;

    const frameIdx = temporal ? (context.frameIndex || 0) : 0;
    // Alternate field phase across frames in temporal mode
    const phase = temporal ? (frameIdx % 2 === 0 ? 1 : -1) : 1;
    const isOddDominant = fieldPolarity === 'odd_first';
    const shift = Math.round(fieldOffset * phase);
    if (shift === 0) return;

    const src = new Uint8ClampedArray(data);

    for (let y = 0; y < h; y++) {
      const isOddLine = y % 2 === 1;
      // Determine if this line moves forward or backwards
      const lineShift = (isOddLine === isOddDominant) ? shift : -shift;
      if (lineShift === 0) continue;

      const rowOffset = y * w * 4;

      for (let x = 0; x < w; x++) {
        const srcX = Math.max(0, Math.min(w - 1, x - lineShift));
        const srcIdx = rowOffset + srcX * 4;
        const dstIdx = rowOffset + x * 4;

        data[dstIdx] = src[srcIdx];
        data[dstIdx + 1] = src[srcIdx + 1];
        data[dstIdx + 2] = src[srcIdx + 2];
      }
    }
  }
};

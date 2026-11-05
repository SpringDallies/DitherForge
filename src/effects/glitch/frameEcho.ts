// Frame Echo / Trail Effect
// Blends prior frames into trailing ghost artifacts with exponential decay
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  clamp
} from './shared';

export interface FrameEchoParams {
  decay?: number; // 0 to 1 (default: 0.65)
  frameCount?: number; // 2 to 12 (default: 4)
  blendMode?: 'average' | 'additive' | 'screen';
  temporal?: boolean; // (default: true)
}

export const frameEchoDefaultParams: Required<FrameEchoParams> = {
  decay: 0.65,
  frameCount: 4,
  blendMode: 'average',
  temporal: true
};

// Global frame buffer ring to hold recent frame history
let historyBuffer: Uint8ClampedArray[] = [];
let historyWidth = 0;
let historyHeight = 0;

export function clearFrameEchoHistory(): void {
  historyBuffer = [];
  historyWidth = 0;
  historyHeight = 0;
}

export function applyFrameEcho(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...frameEchoDefaultParams, ...resolved.params };

  const decay = clamp(p.decay, 0.05, 0.98);
  const maxFrames = clamp(Math.round(p.frameCount), 1, 16);
  const blendMode = p.blendMode;
  const temporal = p.temporal;

  const totalLen = width * height * 4;

  if (historyWidth !== width || historyHeight !== height) {
    clearFrameEchoHistory();
    historyWidth = width;
    historyHeight = height;
  }

  const currentSnapshot = new Uint8ClampedArray(data);
  historyBuffer.push(currentSnapshot);

  while (historyBuffer.length > maxFrames) {
    historyBuffer.shift();
  }

  if (historyBuffer.length === 1 && !temporal) {
    // Static fallback: spatial lateral shadow echo
    const shift = Math.max(2, Math.round(width * 0.01));
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = (rowOffset + x) * 4;
        const echoX = Math.max(0, x - shift);
        const echoIdx = (rowOffset + echoX) * 4;

        if (blendMode === 'additive') {
          const r = data[idx] + (currentSnapshot[echoIdx] * decay);
          const g = data[idx + 1] + (currentSnapshot[echoIdx + 1] * decay);
          const b = data[idx + 2] + (currentSnapshot[echoIdx + 2] * decay);
          data[idx] = r > 255 ? 255 : r;
          data[idx + 1] = g > 255 ? 255 : g;
          data[idx + 2] = b > 255 ? 255 : b;
        } else {
          const invW = 1.0 / (1 + decay);
          data[idx] = (data[idx] + currentSnapshot[echoIdx] * decay) * invW;
          data[idx + 1] = (data[idx + 1] + currentSnapshot[echoIdx + 1] * decay) * invW;
          data[idx + 2] = (data[idx + 2] + currentSnapshot[echoIdx + 2] * decay) * invW;
        }
        // alpha data[idx + 3] preserved
      }
    }
    return;
  }

  const count = historyBuffer.length;
  if (count <= 1) return;

  const weights = new Float32Array(count);
  let totalWeight = 0;
  for (let i = 0; i < count; i++) {
    const age = count - 1 - i;
    const w = Math.pow(decay, age);
    weights[i] = w;
    totalWeight += w;
  }

  if (blendMode === 'additive') {
    for (let idx = 0; idx < totalLen; idx += 4) {
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      for (let f = 0; f < count - 1; f++) {
        const fData = historyBuffer[f];
        const w = weights[f];
        r += fData[idx] * w;
        g += fData[idx + 1] * w;
        b += fData[idx + 2] * w;
      }

      data[idx] = r > 255 ? 255 : r;
      data[idx + 1] = g > 255 ? 255 : g;
      data[idx + 2] = b > 255 ? 255 : b;
      // alpha data[idx + 3] preserved
    }
  } else if (blendMode === 'screen') {
    for (let idx = 0; idx < totalLen; idx += 4) {
      let invR = (255 - data[idx]) * 0.0039215686;
      let invG = (255 - data[idx + 1]) * 0.0039215686;
      let invB = (255 - data[idx + 2]) * 0.0039215686;

      for (let f = 0; f < count - 1; f++) {
        const fData = historyBuffer[f];
        const w = weights[f];
        invR *= 1.0 - (fData[idx] * 0.0039215686) * w;
        invG *= 1.0 - (fData[idx + 1] * 0.0039215686) * w;
        invB *= 1.0 - (fData[idx + 2] * 0.0039215686) * w;
      }

      const r = (1.0 - invR) * 255;
      const g = (1.0 - invG) * 255;
      const b = (1.0 - invB) * 255;
      data[idx] = r < 0 ? 0 : r > 255 ? 255 : r;
      data[idx + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      data[idx + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      // alpha data[idx + 3] preserved
    }
  } else {
    // Average blending
    const invTotalWeight = 1.0 / totalWeight;
    for (let idx = 0; idx < totalLen; idx += 4) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let f = 0; f < count; f++) {
        const fData = historyBuffer[f];
        const w = weights[f];
        r += fData[idx] * w;
        g += fData[idx + 1] * w;
        b += fData[idx + 2] * w;
      }

      data[idx] = r * invTotalWeight;
      data[idx + 1] = g * invTotalWeight;
      data[idx + 2] = b * invTotalWeight;
      // alpha data[idx + 3] preserved
    }
  }
}

export function applyFrameEchoFrame(ctx: any, params: any = {}, frameIndex: number = 0): void {
  applyFrameEcho(ctx, params, { frameIndex });
}

export const frameEchoParamsMeta: ParamMeta[] = [
  {
    id: 'decay',
    label: 'Decay Rate',
    type: 'number',
    min: 0.1,
    max: 0.95,
    step: 0.05,
    defaultValue: 0.65
  },
  {
    id: 'frameCount',
    label: 'Trail Length',
    type: 'number',
    min: 2,
    max: 12,
    step: 1,
    defaultValue: 4
  },
  {
    id: 'blendMode',
    label: 'Blend Mode',
    type: 'select',
    defaultValue: 'average',
    options: [
      { value: 'average', label: 'Average' },
      { value: 'additive', label: 'Additive' },
      { value: 'screen', label: 'Screen' }
    ]
  },
  {
    id: 'temporal',
    label: 'Temporal Animation',
    type: 'boolean',
    defaultValue: true
  }
];

export const frameEchoEffect: EffectDescriptor<FrameEchoParams> = {
  id: 'frame_echo',
  name: 'Frame Echo / Trail',
  category: 'glitch',
  description: 'Blends prior frames into trailing ghost motion blur artifacts',
  defaultParams: frameEchoDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: frameEchoParamsMeta,
  params: frameEchoParamsMeta,
  apply: applyFrameEcho,
  applyFrame: applyFrameEchoFrame
};

export const frameEchoDescriptor = frameEchoEffect;
export default frameEchoEffect;

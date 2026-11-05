import type { EffectDescriptor, EffectContext } from '../types';

export type ScanlineMode = 'soft' | 'hard' | 'interlaced' | 'rolling';

export interface ScanlinesParams {
  mode: ScanlineMode;
  thickness: number;
  intensity: number;
  speed?: number;
}

export function applyScanlines(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: ScanlinesParams,
  context?: EffectContext
): void {
  const mode = params.mode || 'soft';
  const thickness = Math.max(1, Math.floor(params.thickness || 2));
  const intensity = params.intensity !== undefined ? Number(params.intensity) : 0.4;
  const speed = params.speed !== undefined ? Number(params.speed) : 2.0;
  const period = Math.max(2, thickness * 2);
  const frameIdx = context?.frameIndex ?? 0;

  const boost = 1 + intensity * 0.08;
  const dim = 1 - intensity * 0.04;

  if (mode === 'soft') {
    // Exact sinusoidal beam formula with luma-adaptive core
    for (let y = 0; y < height; y++) {
      const phase = ((y % period) + 0.5) / period;
      const beam = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const effectiveBeam = beam + (1 - beam) * (luma * 0.35);
        const scanGain = 1 - intensity * (1 - effectiveBeam);

        const sub = x % 3;
        const modR = sub === 0 ? boost : dim;
        const modG = sub === 1 ? boost : dim;
        const modB = sub === 2 ? boost : dim;

        data[idx] = Math.max(0, Math.min(255, Math.round(r * scanGain * modR)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g * scanGain * modG)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b * scanGain * modB)));
      }
    }
  } else if (mode === 'hard') {
    // Sharp rectangular alternating scanline bars
    for (let y = 0; y < height; y++) {
      const inGap = (y % period) >= thickness;
      const scanGain = inGap ? 1 - intensity : 1.0;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = Math.max(0, Math.min(255, Math.round(data[idx] * scanGain)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(data[idx + 1] * scanGain)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(data[idx + 2] * scanGain)));
      }
    }
  } else if (mode === 'interlaced') {
    // Alternating even/odd fields based on frame index
    const activeField = frameIdx % 2;
    for (let y = 0; y < height; y++) {
      const isDimmField = (y % 2) !== activeField;
      const scanGain = isDimmField ? 1 - intensity * 0.8 : 1.0;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = Math.max(0, Math.min(255, Math.round(data[idx] * scanGain)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(data[idx + 1] * scanGain)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(data[idx + 2] * scanGain)));
      }
    }
  } else if (mode === 'rolling') {
    // Moving cathode-ray beam bar traversing vertically
    const rollY = Math.floor((frameIdx * speed * 3) % (height + 60)) - 30;
    const beamRadius = Math.max(12, thickness * 8);

    for (let y = 0; y < height; y++) {
      const dist = Math.abs(y - rollY);
      const rollFactor = dist < beamRadius ? Math.cos((dist / beamRadius) * (Math.PI / 2)) * 0.25 : 0;

      // Base soft scanline
      const phase = ((y % period) + 0.5) / period;
      const beam = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
      const scanGain = (1 - intensity * (1 - beam)) + rollFactor;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = Math.max(0, Math.min(255, Math.round(data[idx] * scanGain)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(data[idx + 1] * scanGain)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(data[idx + 2] * scanGain)));
      }
    }
  }
}

export const scanlinesEffect: EffectDescriptor<ScanlinesParams> = {
  id: 'scanlines',
  name: 'Scanlines',
  category: 'crt',
  description: 'Cathode-ray tube horizontal raster lines with soft, hard, interlaced or rolling beam profiles',
  defaultParams: { mode: 'soft', thickness: 2, intensity: 0.4, speed: 2.0 },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: [
    {
      id: 'mode',
      label: 'Raster Profile',
      type: 'select',
      options: [
        { value: 'soft', label: 'Soft Sinusoidal' },
        { value: 'hard', label: 'Hard Mask' },
        { value: 'interlaced', label: 'Interlaced Field' },
        { value: 'rolling', label: 'Rolling Beam' }
      ],
      defaultValue: 'soft'
    },
    {
      id: 'thickness',
      label: 'Line Thickness',
      type: 'number',
      min: 1,
      max: 8,
      step: 1,
      defaultValue: 2,
      unit: 'px'
    },
    {
      id: 'intensity',
      label: 'Intensity',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.4
    },
    {
      id: 'speed',
      label: 'Roll Speed',
      type: 'number',
      min: 0.5,
      max: 10,
      step: 0.5,
      defaultValue: 2.0
    }
  ],
  apply: (data, width, height, params, context) => applyScanlines(data, width, height, params, context)
};

// Solarize Effect
// Sabattier darkroom effect: partial tonal inversion at threshold
import {
  EffectDescriptor,
  ParamMeta,
  resolveContext,
  clamp,
  smoothstep
} from './shared';

export interface SolarizeParams {
  threshold?: number; // 0 to 1 (default: 0.5)
  softness?: number; // 0 to 0.5 (default: 0.1)
  perChannel?: boolean; // (default: false)
  radius?: number; // 0 to 8 (default: 1)
}

export const solarizeDefaultParams: Required<SolarizeParams> = {
  threshold: 0.5,
  softness: 0.1,
  perChannel: false,
  radius: 1
};

export function applySolarize(
  dataOrCtx: any,
  widthOrParams?: any,
  heightOrCtx?: any,
  params?: any,
  context?: any
): void {
  const resolved = resolveContext(dataOrCtx, widthOrParams, heightOrCtx, params, context);
  const { data, width, height } = resolved;
  const p = { ...solarizeDefaultParams, ...resolved.params };

  const thresh = clamp(p.threshold, 0, 1);
  const softness = clamp(p.softness, 0, 0.5);
  const perChannel = Boolean(p.perChannel);
  const radius = clamp(Math.round(p.radius ?? 1), 0, 8);

  const totalPixels = width * height;

  // Preserve alpha strictly
  const origAlpha = new Uint8ClampedArray(totalPixels);
  for (let i = 0, a = 3; i < totalPixels; i++, a += 4) {
    origAlpha[i] = data[a];
  }

  // Precompute luminance buffer
  const luma = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    luma[i] = (0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2]) / 255.0;
  }

  const t0 = Math.max(0, thresh - softness);
  const t1 = Math.min(1, thresh + softness);

  if (radius <= 0) {
    // Direct point-based Sabattier curve (preserves highlights, avoids total blackout)
    function solarizeVal(v: number): number {
      if (softness <= 0.001) {
        return v >= thresh ? 1.0 - v : v;
      }
      const factor = smoothstep(t0, t1, v);
      const inverted = 1.0 - v;
      return v + (inverted - v) * factor;
    }

    if (perChannel) {
      const lut = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        lut[i] = clamp(Math.round(solarizeVal(i / 255.0) * 255), 0, 255);
      }
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        data[idx] = lut[data[idx]];
        data[idx + 1] = lut[data[idx + 1]];
        data[idx + 2] = lut[data[idx + 2]];
        data[idx + 3] = origAlpha[i];
      }
    } else {
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lm = luma[i];

        let factor: number;
        if (softness <= 0.001) {
          factor = lm >= thresh ? 1.0 : 0.0;
        } else {
          factor = smoothstep(t0, t1, lm);
        }

        if (factor > 0) {
          data[idx] = clamp(Math.round(r + ((255 - r) - r) * factor), 0, 255);
          data[idx + 1] = clamp(Math.round(g + ((255 - g) - g) * factor), 0, 255);
          data[idx + 2] = clamp(Math.round(b + ((255 - b) - b) * factor), 0, 255);
        }
        data[idx + 3] = origAlpha[i];
      }
    }
    return;
  }

  // Regionally-aware Sabattier: Separable 1D box filter for local tone density
  // Allows dithered patterns (which represent tones as dot density) to invert
  // highlights into negative dither without mapping all dots to pitch black.
  const kSize = radius * 2 + 1;

  if (perChannel) {
    // Process each channel R, G, B with its own local density map
    const chLocal = new Float32Array(totalPixels);
    const blurH = new Float32Array(totalPixels);

    for (let c = 0; c < 3; c++) {
      // Horizontal pass for channel c
      for (let y = 0; y < height; y++) {
        const rOffset = y * width;
        for (let x = 0; x < width; x++) {
          let sum = 0;
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = clamp(x + dx, 0, width - 1);
            sum += data[(rOffset + nx) * 4 + c];
          }
          blurH[rOffset + x] = sum / (kSize * 255.0);
        }
      }

      // Vertical pass for channel c
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          let sum = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            const ny = clamp(y + dy, 0, height - 1);
            sum += blurH[ny * width + x];
          }
          chLocal[y * width + x] = sum / kSize;
        }
      }

      // Apply channel solarization based on local channel density
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4 + c;
        const val = data[idx];
        const cl = chLocal[i];

        let factor = 0;
        if (softness <= 0.001) {
          factor = cl >= thresh ? 1.0 : 0.0;
        } else {
          factor = smoothstep(t0, t1, cl);
        }

        if (factor > 0) {
          const inv = 255 - val;
          data[idx] = clamp(Math.round(val + (inv - val) * factor), 0, 255);
        }
      }
    }

    for (let i = 0; i < totalPixels; i++) {
      data[i * 4 + 3] = origAlpha[i];
    }
  } else {
    // Luminance-guided solarization using local luminance density
    const blurH = new Float32Array(totalPixels);
    for (let y = 0; y < height; y++) {
      const rOffset = y * width;
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = clamp(x + dx, 0, width - 1);
          sum += luma[rOffset + nx];
        }
        blurH[rOffset + x] = sum / kSize;
      }
    }

    const localLuma = new Float32Array(totalPixels);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let sum = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = clamp(y + dy, 0, height - 1);
          sum += blurH[ny * width + x];
        }
        localLuma[y * width + x] = sum / kSize;
      }
    }

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const ll = localLuma[i];

      let factor = 0;
      if (softness <= 0.001) {
        factor = ll >= thresh ? 1.0 : 0.0;
      } else {
        factor = smoothstep(t0, t1, ll);
      }

      if (factor > 0) {
        data[idx] = clamp(Math.round(r + ((255 - r) - r) * factor), 0, 255);
        data[idx + 1] = clamp(Math.round(g + ((255 - g) - g) * factor), 0, 255);
        data[idx + 2] = clamp(Math.round(b + ((255 - b) - b) * factor), 0, 255);
      }
      data[idx + 3] = origAlpha[i];
    }
  }
}

export const solarizeParamsMeta: ParamMeta[] = [
  {
    id: 'threshold',
    label: 'Inversion Threshold',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.02,
    defaultValue: 0.5
  },
  {
    id: 'softness',
    label: 'Transition Softness',
    type: 'number',
    min: 0,
    max: 0.5,
    step: 0.02,
    defaultValue: 0.1
  },
  {
    id: 'perChannel',
    label: 'Per-Channel Mode',
    type: 'boolean',
    defaultValue: false
  },
  {
    id: 'radius',
    label: 'Integration Radius',
    type: 'number',
    min: 0,
    max: 8,
    step: 1,
    defaultValue: 1,
    unit: 'px'
  }
];

export const solarizeEffect: EffectDescriptor<SolarizeParams> = {
  id: 'solarize',
  name: 'Solarize',
  category: 'color',
  description: 'Sabattier darkroom effect: partial tonal inversion at threshold',
  defaultParams: solarizeDefaultParams,
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: solarizeParamsMeta,
  params: solarizeParamsMeta,
  apply: applySolarize
};

export const solarizeDescriptor = solarizeEffect;
export default solarizeEffect;

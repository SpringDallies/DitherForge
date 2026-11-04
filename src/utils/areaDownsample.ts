/**
 * Area-Based Downsampling with Linear-Light sRGB Gamma Correction and Premultiplied Alpha
 *
 * Implements mathematical area-box integration for minification:
 * 1. Precomputes sRGB <-> Linear light transfer function LUTs.
 * 2. For each target pixel [dx, dy], integrates contributing source pixels with exact
 *    subpixel area weights.
 * 3. Accumulates in linear photometric light with premultiplied alpha: (RGB_lin * alpha).
 * 4. Normalizes by accumulated alpha and area, then maps back to sRGB.
 *
 * This completely prevents:
 * - Spatial aliasing and moiré interference across high-frequency dither patterns.
 * - Non-linear sRGB midtone darkening (e.g. 50% dither checkerboards averaging to dark
 *   127/128 charcoal instead of true 50% physical luminance ~186/188).
 * - Color fringing on translucent/alpha edges.
 */

// 256-entry sRGB -> Linear lookup table
export const sRGBToLinearLUT = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  sRGBToLinearLUT[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// 4096-entry Linear -> sRGB lookup table for O(1) transfer conversion
const LINEAR_LUT_SIZE = 4096;
export const linearTosRGBLUT = new Uint8Array(LINEAR_LUT_SIZE + 1);
for (let i = 0; i <= LINEAR_LUT_SIZE; i++) {
  const lin = i / LINEAR_LUT_SIZE;
  const srgb = lin <= 0.0031308 ? 12.92 * lin : 1.055 * Math.pow(lin, 1 / 2.4) - 0.055;
  linearTosRGBLUT[i] = Math.max(0, Math.min(255, Math.round(srgb * 255)));
}

/**
 * Fast O(1) mapping from linear light [0, 1] to 8-bit sRGB [0, 255].
 */
export function linearToSrgbFast(lin: number): number {
  if (lin <= 0) return 0;
  if (lin >= 1) return 255;
  return linearTosRGBLUT[(lin * LINEAR_LUT_SIZE + 0.5) | 0];
}

/**
 * Downsamples source RGBA buffer to destination dimensions using gamma-correct area integration.
 *
 * @param src - Source Uint8ClampedArray or Uint8Array (length: sw * sh * 4)
 * @param sw  - Source width
 * @param sh  - Source height
 * @param dw  - Destination width
 * @param dh  - Destination height
 * @param outBuf - Optional pre-allocated destination buffer (length: dw * dh * 4)
 * @returns Destination Uint8ClampedArray
 */
export function downsampleAreaGamma(
  src: Uint8ClampedArray | Uint8Array,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  outBuf?: Uint8ClampedArray
): Uint8ClampedArray {
  const dst = outBuf || new Uint8ClampedArray(dw * dh * 4);
  const xRatio = sw / dw;
  const yRatio = sh / dh;

  for (let dy = 0; dy < dh; dy++) {
    const syStart = dy * yRatio;
    const syEnd = (dy + 1) * yRatio;
    const syMin = syStart | 0;
    const syMax = Math.min(sh - 1, syEnd | 0);
    const dstRow = dy * dw * 4;

    for (let dx = 0; dx < dw; dx++) {
      const sxStart = dx * xRatio;
      const sxEnd = (dx + 1) * xRatio;
      const sxMin = sxStart | 0;
      const sxMax = Math.min(sw - 1, sxEnd | 0);

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let totalWeight = 0;

      for (let sy = syMin; sy <= syMax; sy++) {
        const y0 = sy < syStart ? syStart : sy;
        const y1 = sy + 1 > syEnd ? syEnd : sy + 1;
        const yWeight = y1 - y0;
        if (yWeight <= 0) continue;
        const srcRow = sy * sw * 4;

        for (let sx = sxMin; sx <= sxMax; sx++) {
          const x0 = sx < sxStart ? sxStart : sx;
          const x1 = sx + 1 > sxEnd ? sxEnd : sx + 1;
          const weight = (x1 - x0) * yWeight;
          if (weight <= 0) continue;

          const sIdx = srcRow + sx * 4;
          const a = (src[sIdx + 3] / 255) * weight;
          totalWeight += weight;
          aSum += a;

          rSum += sRGBToLinearLUT[src[sIdx]] * a;
          gSum += sRGBToLinearLUT[src[sIdx + 1]] * a;
          bSum += sRGBToLinearLUT[src[sIdx + 2]] * a;
        }
      }

      const dIdx = dstRow + dx * 4;
      if (totalWeight > 0 && aSum > 0) {
        const invA = 1 / aSum;
        dst[dIdx] = linearToSrgbFast(rSum * invA);
        dst[dIdx + 1] = linearToSrgbFast(gSum * invA);
        dst[dIdx + 2] = linearToSrgbFast(bSum * invA);
        dst[dIdx + 3] = ((aSum / totalWeight) * 255 + 0.5) | 0;
      } else {
        dst[dIdx] = 0;
        dst[dIdx + 1] = 0;
        dst[dIdx + 2] = 0;
        dst[dIdx + 3] = 0;
      }
    }
  }

  return dst;
}

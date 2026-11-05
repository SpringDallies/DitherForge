import type { EffectDescriptor } from '../types';

export interface JpegArtifactsParams {
  quality: number;
}

export function applyJpegArtifacts(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: JpegArtifactsParams
): void {
  const q = Math.max(0.01, Math.min(1, params.quality !== undefined ? Number(params.quality) : 0.3));
  const severity = 1 - q;
  const yStep = Math.max(2, Math.round(severity * 42));
  const chromaBlock = severity > 0.5 ? 4 : 2;
  const cStep = Math.max(4, Math.round(severity * 68));

  const blockY = new Float32Array(64);
  const blockCb = new Float32Array(64);
  const blockCr = new Float32Array(64);

  for (let by = 0; by < height; by += 8) {
    const bH = Math.min(8, height - by);
    for (let bx = 0; bx < width; bx += 8) {
      const bW = Math.min(8, width - bx);
      let sumY = 0;
      const count = bW * bH;

      // Extract 8x8 block YCbCr
      for (let dy = 0; dy < bH; dy++) {
        for (let dx = 0; dx < bW; dx++) {
          const idx = ((by + dy) * width + (bx + dx)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
          const cbVal = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
          const crVal = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
          const bIdx = dy * 8 + dx;
          blockY[bIdx] = yVal;
          blockCb[bIdx] = cbVal;
          blockCr[bIdx] = crVal;
          sumY += yVal;
        }
      }

      // Quantize DC luma
      const meanY = sumY / count;
      const quantMeanY = Math.round(meanY / yStep) * yStep;

      // Subsample and quantize chroma in chromaBlock x chromaBlock sub-blocks
      for (let cby = 0; cby < bH; cby += chromaBlock) {
        const curCH = Math.min(chromaBlock, bH - cby);
        for (let cbx = 0; cbx < bW; cbx += chromaBlock) {
          const curCW = Math.min(chromaBlock, bW - cbx);
          let sumCb = 0, sumCr = 0, subCount = 0;
          for (let cdy = 0; cdy < curCH; cdy++) {
            for (let cdx = 0; cdx < curCW; cdx++) {
              const bIdx = (cby + cdy) * 8 + (cbx + cdx);
              sumCb += blockCb[bIdx];
              sumCr += blockCr[bIdx];
              subCount++;
            }
          }
          const quantCb = Math.round((sumCb / subCount) / cStep) * cStep;
          const quantCr = Math.round((sumCr / subCount) / cStep) * cStep;
          for (let cdy = 0; cdy < curCH; cdy++) {
            for (let cdx = 0; cdx < curCW; cdx++) {
              const bIdx = (cby + cdy) * 8 + (cbx + cdx);
              blockCb[bIdx] = quantCb;
              blockCr[bIdx] = quantCr;
            }
          }
        }
      }

      // Attenuate AC luma, quantize, add mosquito ringing on block boundaries, convert to RGB
      const acFactor = Math.max(0.15, q);
      for (let dy = 0; dy < bH; dy++) {
        for (let dx = 0; dx < bW; dx++) {
          const bIdx = dy * 8 + dx;
          const origY = blockY[bIdx];
          const ac = (origY - meanY) * acFactor;
          const quantAc = Math.round(ac / yStep) * yStep;
          let finalY = quantMeanY + quantAc;

          // Deterministic mosquito ringing along 8x8 block boundaries
          if (dy === 0 || dy === bH - 1 || dx === 0 || dx === bW - 1) {
            finalY += Math.sin((dx + dy) * 1.5) * (severity * 12);
          }
          finalY = Math.max(0, Math.min(255, finalY));

          const cb = blockCb[bIdx] - 128;
          const cr = blockCr[bIdx] - 128;

          const outR = Math.max(0, Math.min(255, Math.round(finalY + 1.402 * cr)));
          const outG = Math.max(0, Math.min(255, Math.round(finalY - 0.344136 * cb - 0.714136 * cr)));
          const outB = Math.max(0, Math.min(255, Math.round(finalY + 1.772 * cb)));

          const idx = ((by + dy) * width + (bx + dx)) * 4;
          data[idx] = outR;
          data[idx + 1] = outG;
          data[idx + 2] = outB;
        }
      }
    }
  }
}

export const jpegArtifactsEffect: EffectDescriptor<JpegArtifactsParams> = {
  id: 'jpeg_artifacts',
  name: 'JPEG Artifacts',
  category: 'texture',
  description: '8x8 discrete cosine transform block compression and chroma subsampling',
  defaultParams: { quality: 0.3 },
  defaultOpacity: 1.0,
  defaultBlendMode: 'normal',
  paramsMeta: [
    {
      id: 'quality',
      label: 'Quality',
      type: 'number',
      min: 0.05,
      max: 1.0,
      step: 0.05,
      defaultValue: 0.3
    }
  ],
  apply: (data, width, height, params) => applyJpegArtifacts(data, width, height, params)
};

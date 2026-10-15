// Category: Palette & Color Matching Utilities
// Unified perceptual color matching and tonal ladder quantization

export function parseHexColor(hex) {
  if (typeof hex !== 'string') {
    if (Array.isArray(hex)) return [hex[0], hex[1], hex[2]];
    if (hex && typeof hex.r === 'number') return [hex.r, hex.g, hex.b];
    return [0, 0, 0];
  }
  let c = hex.replace(/^#/, '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function parsePalette(paletteInput) {
  if (!paletteInput || !Array.isArray(paletteInput) || paletteInput.length === 0) {
    return [[0, 0, 0], [255, 255, 255]];
  }
  return paletteInput.map(parseHexColor);
}

export function getLuminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Perceptual redmean color distance squared (fast human-vision weighted)
export function redmeanDistSq(r1, g1, b1, r2, g2, b2) {
  const rBar = (r1 + r2) * 0.5;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (2 + rBar / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rBar) / 256) * db * db;
}

export function colorDistSq(r1, g1, b1, r2, g2, b2) {
  return redmeanDistSq(r1, g1, b1, r2, g2, b2);
}

export class FastPaletteLUT {
  constructor(palette, optionsOrBias = 0.5) {
    this.rawPalette = parsePalette(palette);
    this.paletteSize = this.rawPalette.length;
    this.luminances = this.rawPalette.map(c => getLuminance(c[0], c[1], c[2]));

    let bias = 0.5;
    if (typeof optionsOrBias === 'number') {
      bias = optionsOrBias;
    } else if (optionsOrBias && optionsOrBias.threshold !== undefined) {
      bias = Number(optionsOrBias.threshold);
    }
    if (bias > 1.0) bias = bias / 100;
    this.thresholdBias = isNaN(bias) ? 0.5 : Math.max(0.0, Math.min(1.0, bias));

    // Build luminance-sorted palette for consistent dark->light pair ordering
    const indexed = this.rawPalette.map((c, idx) => ({ color: c, lum: this.luminances[idx], origIdx: idx }));
    indexed.sort((a, b) => a.lum - b.lum);
    this.sortedPalette = indexed.map(item => item.color);
    this.sortedLuminances = indexed.map(item => item.lum);
    this.sortedToOriginalIndex = indexed.map(item => item.origIdx);

    // Check if monotonically sorted by luminance (tonal ramp)
    let isMono = true;
    for (let i = 1; i < this.paletteSize; i++) {
      if (this.luminances[i] < this.luminances[i - 1] - 5) {
        isMono = false;
        break;
      }
    }
    this.isTonalRamp = isMono;

    // 32x32x32 Fast Redmean Lookup Table for instant O(1) 3D nearest matches
    this.table = new Uint8Array(32 * 32 * 32 * 3);
    for (let r = 0; r < 32; r++) {
      const rVal = (r << 3) + 4;
      for (let g = 0; g < 32; g++) {
        const gVal = (g << 3) + 4;
        for (let b = 0; b < 32; b++) {
          const bVal = (b << 3) + 4;
          let minDist = Infinity;
          let best = this.rawPalette[0];
          for (let i = 0; i < this.paletteSize; i++) {
            const p = this.rawPalette[i];
            const d = redmeanDistSq(rVal, gVal, bVal, p[0], p[1], p[2]);
            if (d < minDist) {
              minDist = d;
              best = p;
            }
          }
          const idx = (r * 1024 + g * 32 + b) * 3;
          this.table[idx] = best[0];
          this.table[idx + 1] = best[1];
          this.table[idx + 2] = best[2];
        }
      }
    }
  }

  findNearest(r, g, b) {
    const ir = Math.max(0, Math.min(31, Math.round(r) >> 3));
    const ig = Math.max(0, Math.min(31, Math.round(g) >> 3));
    const ib = Math.max(0, Math.min(31, Math.round(b) >> 3));
    const idx = (ir * 1024 + ig * 32 + ib) * 3;
    return [this.table[idx], this.table[idx + 1], this.table[idx + 2]];
  }

  inlineMatch(r, g, b, out, offset) {
    const ir = Math.max(0, Math.min(31, Math.round(r) >> 3));
    const ig = Math.max(0, Math.min(31, Math.round(g) >> 3));
    const ib = Math.max(0, Math.min(31, Math.round(b) >> 3));
    const idx = (ir * 1024 + ig * 32 + ib) * 3;
    out[offset] = this.table[idx];
    out[offset + 1] = this.table[idx + 1];
    out[offset + 2] = this.table[idx + 2];
  }

  quantizeLum(curLum) {
    const lums = this.sortedLuminances;
    const N = this.paletteSize;
    let sortedIdx = 0;
    if (curLum <= lums[0]) {
      sortedIdx = 0;
    } else if (curLum >= lums[N - 1]) {
      sortedIdx = N - 1;
    } else {
      sortedIdx = N - 1;
      for (let i = 0; i < N - 1; i++) {
        if (curLum <= lums[i + 1]) {
          const mid = (lums[i] + lums[i + 1]) * 0.5;
          sortedIdx = curLum < mid ? i : i + 1;
          break;
        }
      }
    }
    return this.sortedToOriginalIndex ? this.sortedToOriginalIndex[sortedIdx] : sortedIdx;
  }

  findPair(r, g, b) {
    if (this.isTonalRamp) {
      const lum = getLuminance(r, g, b);
      const lums = this.sortedLuminances;
      const pal = this.sortedPalette;
      const N = this.paletteSize;
      if (lum <= lums[0]) {
        const c = pal[0];
        return { c1: c, c2: pal[Math.min(1, N - 1)], frac: 0 };
      }
      if (lum >= lums[N - 1]) {
        const c = pal[N - 1];
        return { c1: pal[Math.max(0, N - 2)], c2: c, frac: 1 };
      }
      for (let i = 0; i < N - 1; i++) {
        if (lum >= lums[i] && lum <= lums[i + 1]) {
          const span = lums[i + 1] - lums[i];
          const frac = span > 0 ? (lum - lums[i]) / span : 0.5;
          return {
            c1: pal[i],
            c2: pal[i + 1],
            frac
          };
        }
      }
      const c = pal[N - 1];
      return { c1: c, c2: c, frac: 1 };
    } else {
      let bestIdx = 0, bestDist = Infinity;
      let secondIdx = 0, secondDist = Infinity;
      for (let i = 0; i < this.paletteSize; i++) {
        const p = this.rawPalette[i];
        const d = redmeanDistSq(r, g, b, p[0], p[1], p[2]);
        if (d < bestDist) {
          secondDist = bestDist;
          secondIdx = bestIdx;
          bestDist = d;
          bestIdx = i;
        } else if (d < secondDist) {
          secondDist = d;
          secondIdx = i;
        }
      }
      // Order c1 (darker) and c2 (brighter) by luminance so pattern thresholds behave consistently
      let idxDark = bestIdx, idxLight = secondIdx;
      if (this.luminances[bestIdx] > this.luminances[secondIdx]) {
        idxDark = secondIdx;
        idxLight = bestIdx;
      }
      const c1 = this.rawPalette[idxDark];
      const c2 = this.rawPalette[idxLight];
      const lum1 = this.luminances[idxDark];
      const lum2 = this.luminances[idxLight];
      const lum = getLuminance(r, g, b);
      let frac = 0.5;
      if (Math.abs(lum2 - lum1) > 2) {
        frac = Math.max(0, Math.min(1, (lum - lum1) / (lum2 - lum1)));
      } else {
        const d1 = Math.sqrt(Math.max(0, redmeanDistSq(r, g, b, c1[0], c1[1], c1[2])));
        const d2 = Math.sqrt(Math.max(0, redmeanDistSq(r, g, b, c2[0], c2[1], c2[2])));
        const total = d1 + d2;
        frac = total > 0 ? d1 / total : 0.5;
      }
      return { c1, c2, frac };
    }
  }

  inlinePairMatch(r, g, b, threshold, out, offset) {
    const { c1, c2, frac } = this.findPair(r, g, b);
    // Smooth, continuous bias across [0.05, 0.95] without step discontinuities at 0.35 or 0.65
    const effThreshold = Math.max(0.05, Math.min(0.95, threshold + (this.thresholdBias - 0.5) * 0.5));
    const chosen = frac > effThreshold ? c2 : c1;
    out[offset] = chosen[0];
    out[offset + 1] = chosen[1];
    out[offset + 2] = chosen[2];
  }
}
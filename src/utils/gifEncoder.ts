/**
 * Dependency-free GIF89a Encoder with LZW compression and median-cut color quantization.
 * Supports multi-frame looping animated GIFs directly from canvas frames.
 * Optimized with reusable typed-array scratch buffers for low-end CPU/RAM hardware.
 */

export interface GifFrameOptions {
  /** Frame duration in milliseconds (e.g. 100 for 10 FPS, 33 for 30 FPS). Default: 100 */
  delay?: number;
  /** Disposal method: 1 = do not dispose, 2 = restore to background. Default: 2 */
  dispose?: number;
  /** Transparent color index if any (null if none). Default: null */
  transparent?: number | null;
}

interface QuantizedFrame {
  palette: [number, number, number][];
  indexed: Uint8Array;
  transparentIndex: number | null;
}

const HASH_BITS = 16;
const HASH_SIZE = 1 << HASH_BITS; // 65536
const HASH_MASK = HASH_SIZE - 1;

// LZW open-addressing hash table constants (prime-sized or power-of-two > 4096 * 2)
const LZW_HASH_SIZE = 16384;
const LZW_HASH_MASK = LZW_HASH_SIZE - 1;

export class GifEncoder {
  private width: number;
  private height: number;
  private loopCount: number;
  private chunks: Uint8Array[] = [];
  private currentChunk: Uint8Array = new Uint8Array(65536);
  private chunkPos: number = 0;
  private totalBytes: number = 0;

  // Reusable per-instance buffers to eliminate per-frame heap allocations
  private indexedBuffer: Uint8Array;
  private hashKeys: Int32Array;
  private hashCounts: Uint32Array;
  private hashIndices: Int32Array;
  private usedSlots: Uint32Array;

  // Reusable LZW dictionary & sub-block buffers
  private lzwKey: Int32Array = new Int32Array(LZW_HASH_SIZE);
  private lzwVal: Uint16Array = new Uint16Array(LZW_HASH_SIZE);
  private lzwStamp: Uint32Array = new Uint32Array(LZW_HASH_SIZE);
  private lzwGen: number = 1;
  private lzwSubBlock: Uint8Array = new Uint8Array(255);

  constructor(width: number, height: number, loopCount: number = 0) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.loopCount = loopCount;

    const totalPixels = this.width * this.height;
    this.indexedBuffer = new Uint8Array(totalPixels);
    this.hashKeys = new Int32Array(HASH_SIZE);
    this.hashKeys.fill(-1);
    this.hashCounts = new Uint32Array(HASH_SIZE);
    this.hashIndices = new Int32Array(HASH_SIZE);
    this.usedSlots = new Uint32Array(HASH_SIZE);

    this.writeHeader();
  }

  private writeByte(b: number): void {
    if (this.chunkPos === this.currentChunk.length) {
      this.chunks.push(this.currentChunk);
      this.currentChunk = new Uint8Array(65536);
      this.chunkPos = 0;
    }
    this.currentChunk[this.chunkPos++] = b & 0xFF;
    this.totalBytes++;
  }

  private writeBytes(arr: number[] | Uint8Array): void {
    const len = arr.length;
    let srcOffset = 0;
    while (srcOffset < len) {
      if (this.chunkPos === this.currentChunk.length) {
        this.chunks.push(this.currentChunk);
        this.currentChunk = new Uint8Array(65536);
        this.chunkPos = 0;
      }
      const space = this.currentChunk.length - this.chunkPos;
      const toCopy = Math.min(space, len - srcOffset);
      if (arr instanceof Uint8Array) {
        this.currentChunk.set(arr.subarray(srcOffset, srcOffset + toCopy), this.chunkPos);
      } else {
        for (let i = 0; i < toCopy; i++) {
          this.currentChunk[this.chunkPos + i] = arr[srcOffset + i] & 0xFF;
        }
      }
      this.chunkPos += toCopy;
      srcOffset += toCopy;
      this.totalBytes += toCopy;
    }
  }

  private writeUint16(val: number): void {
    this.writeByte(val & 0xFF);
    this.writeByte((val >> 8) & 0xFF);
  }

  private writeHeader(): void {
    // 1. Signature & Version: "GIF89a"
    this.writeBytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

    // 2. Logical Screen Descriptor
    this.writeUint16(this.width);
    this.writeUint16(this.height);
    // Packed byte: No Global Color Table, 8 bits/pixel color resolution
    this.writeByte(0x70);
    this.writeByte(0); // Background color index
    this.writeByte(0); // Pixel aspect ratio

    // 3. Netscape 2.0 Application Extension for looping
    this.writeBytes([0x21, 0xFF, 0x0B]); // Introducer, label, block size (11)
    const netscape = 'NETSCAPE2.0';
    for (let i = 0; i < netscape.length; i++) {
      this.writeByte(netscape.charCodeAt(i));
    }
    this.writeByte(0x03); // Sub-block length
    this.writeByte(0x01); // Sub-block index
    this.writeUint16(this.loopCount); // 0 = loop forever
    this.writeByte(0x00); // Block terminator
  }

  /**
   * Quantize RGBA pixels to an indexed palette of up to 256 colors.
   * Always inspects actual frame pixels so post-processing effect colors are preserved.
   */
  private quantize(pixelsRgba: Uint8ClampedArray): QuantizedFrame {
    const totalPixels = this.width * this.height;
    if (this.indexedBuffer.length !== totalPixels) {
      this.indexedBuffer = new Uint8Array(totalPixels);
    }
    const indexed = this.indexedBuffer;
    const hashKeys = this.hashKeys;
    const hashCounts = this.hashCounts;
    const hashIndices = this.hashIndices;
    const usedSlots = this.usedSlots;

    let usedCount = 0;
    let hasTransparent = false;
    let overflowedHash = false;

    // 1. Scan unique colors and transparency using open-addressing hash table
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const a = pixelsRgba[idx + 3];
      if (a < 128) {
        hasTransparent = true;
      } else {
        const rgb = (pixelsRgba[idx] << 16) | (pixelsRgba[idx + 1] << 8) | pixelsRgba[idx + 2];
        let slot = ((rgb * 2654435761) >>> 16) & HASH_MASK;
        let probes = 0;
        while (true) {
          const k = hashKeys[slot];
          if (k === rgb) {
            hashCounts[slot]++;
            break;
          }
          if (k === -1) {
            hashKeys[slot] = rgb;
            hashCounts[slot] = 1;
            usedSlots[usedCount++] = slot;
            break;
          }
          slot = (slot + 1) & HASH_MASK;
          if (++probes >= 128 || usedCount >= 49152) {
            overflowedHash = true;
            break;
          }
        }
        if (overflowedHash) break;
      }
    }

    // Fallback to Map only if frame has >49k distinct colors or hash probe cap hit
    if (overflowedHash) {
      for (let i = 0; i < usedCount; i++) {
        hashKeys[usedSlots[i]] = -1;
      }
      return this.quantizeFallbackMap(pixelsRgba, totalPixels, indexed);
    }

    const maxColors = hasTransparent ? 255 : 256;

    // 2. Fast path: distinct colors fit in GIF palette directly
    if (usedCount <= maxColors) {
      const palette: [number, number, number][] = [];
      let transparentIndex: number | null = null;

      if (hasTransparent) {
        transparentIndex = 0;
        palette.push([0, 0, 0]);
      }

      for (let i = 0; i < usedCount; i++) {
        const slot = usedSlots[i];
        const rgb = hashKeys[slot];
        hashIndices[slot] = palette.length;
        palette.push([(rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF]);
      }

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        if (hasTransparent && pixelsRgba[idx + 3] < 128) {
          indexed[i] = transparentIndex!;
        } else {
          const rgb = (pixelsRgba[idx] << 16) | (pixelsRgba[idx + 1] << 8) | pixelsRgba[idx + 2];
          let slot = ((rgb * 2654435761) >>> 16) & HASH_MASK;
          while (hashKeys[slot] !== rgb) {
            slot = (slot + 1) & HASH_MASK;
          }
          indexed[i] = hashIndices[slot];
        }
      }

      for (let i = 0; i < usedCount; i++) {
        hashKeys[usedSlots[i]] = -1;
      }

      return { palette, indexed, transparentIndex };
    }

    // 3. Median Cut Quantization for frames with >maxColors unique colors
    const uniqueList: { r: number; g: number; b: number; rgb: number; count: number }[] = new Array(usedCount);
    for (let i = 0; i < usedCount; i++) {
      const slot = usedSlots[i];
      const rgb = hashKeys[slot];
      const count = hashCounts[slot];
      hashIndices[slot] = -1; // mark as unmapped for nearest-color lookup
      uniqueList[i] = {
        r: (rgb >> 16) & 0xFF,
        g: (rgb >> 8) & 0xFF,
        b: rgb & 0xFF,
        rgb,
        count
      };
    }

    const palette = this.runMedianCut(uniqueList, maxColors, hasTransparent);
    const transparentIndex: number | null = hasTransparent ? 0 : null;
    const startIdx = hasTransparent ? 1 : 0;
    const palLen = palette.length;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      if (hasTransparent && pixelsRgba[idx + 3] < 128) {
        indexed[i] = transparentIndex!;
      } else {
        const r = pixelsRgba[idx];
        const g = pixelsRgba[idx + 1];
        const b = pixelsRgba[idx + 2];
        const rgb = (r << 16) | (g << 8) | b;

        let slot = ((rgb * 2654435761) >>> 16) & HASH_MASK;
        while (hashKeys[slot] !== rgb) {
          slot = (slot + 1) & HASH_MASK;
        }

        let match = hashIndices[slot];
        if (match === -1) {
          let minD = Infinity;
          match = startIdx;
          for (let p = startIdx; p < palLen; p++) {
            const pr = palette[p][0];
            const pg = palette[p][1];
            const pb = palette[p][2];
            const d = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
            if (d < minD) {
              minD = d;
              match = p;
              if (d === 0) break;
            }
          }
          hashIndices[slot] = match;
        }
        indexed[i] = match;
      }
    }

    for (let i = 0; i < usedCount; i++) {
      hashKeys[usedSlots[i]] = -1;
    }

    return { palette, indexed, transparentIndex };
  }

  private runMedianCut(
    uniqueList: { r: number; g: number; b: number; rgb: number; count: number }[],
    maxColors: number,
    hasTransparent: boolean
  ): [number, number, number][] {
    class ColorBox {
      colors: typeof uniqueList;
      minR = 255; maxR = 0;
      minG = 255; maxG = 0;
      minB = 255; maxB = 0;
      total = 0;
      rRange = 0; gRange = 0; bRange = 0; maxRange = 0;

      constructor(colors: typeof uniqueList) {
        this.colors = colors;
        this.recalculate();
      }

      recalculate(): void {
        let minR = 255, maxR = 0;
        let minG = 255, maxG = 0;
        let minB = 255, maxB = 0;
        let total = 0;

        for (let i = 0; i < this.colors.length; i++) {
          const c = this.colors[i];
          if (c.r < minR) minR = c.r;
          if (c.r > maxR) maxR = c.r;
          if (c.g < minG) minG = c.g;
          if (c.g > maxG) maxG = c.g;
          if (c.b < minB) minB = c.b;
          if (c.b > maxB) maxB = c.b;
          total += c.count;
        }
        this.minR = minR; this.maxR = maxR;
        this.minG = minG; this.maxG = maxG;
        this.minB = minB; this.maxB = maxB;
        this.total = total;
        this.rRange = maxR - minR;
        this.gRange = maxG - minG;
        this.bRange = maxB - minB;
        this.maxRange = Math.max(this.rRange, this.gRange, this.bRange);
      }

      split(): [ColorBox, ColorBox] | null {
        if (this.colors.length <= 1) return null;
        let sortKey: 'r' | 'g' | 'b' = 'r';
        if (this.gRange >= this.rRange && this.gRange >= this.bRange) sortKey = 'g';
        else if (this.bRange >= this.rRange && this.bRange >= this.gRange) sortKey = 'b';

        this.colors.sort((a, b) => a[sortKey] - b[sortKey]);

        const half = this.total / 2;
        let accum = 0;
        let splitIdx = 0;
        for (let i = 0; i < this.colors.length - 1; i++) {
          accum += this.colors[i].count;
          if (accum >= half) {
            splitIdx = i + 1;
            break;
          }
        }
        if (splitIdx === 0) splitIdx = Math.floor(this.colors.length / 2);

        return [
          new ColorBox(this.colors.slice(0, splitIdx)),
          new ColorBox(this.colors.slice(splitIdx))
        ];
      }

      averageColor(): [number, number, number] {
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let i = 0; i < this.colors.length; i++) {
          const c = this.colors[i];
          rSum += c.r * c.count;
          gSum += c.g * c.count;
          bSum += c.b * c.count;
          count += c.count;
        }
        if (count === 0) return [0, 0, 0];
        return [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)];
      }
    }

    const boxes: ColorBox[] = [new ColorBox(uniqueList)];
    while (boxes.length < maxColors) {
      let bestIdx = -1;
      let bestRange = -1;
      for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].colors.length > 1 && boxes[i].maxRange > bestRange) {
          bestRange = boxes[i].maxRange;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;

      const box = boxes.splice(bestIdx, 1)[0];
      const result = box.split();
      if (result) {
        boxes.push(result[0], result[1]);
      } else {
        boxes.push(box);
        break;
      }
    }

    const palette: [number, number, number][] = [];
    if (hasTransparent) {
      palette.push([0, 0, 0]);
    }
    for (let i = 0; i < boxes.length; i++) {
      palette.push(boxes[i].averageColor());
    }
    return palette;
  }

  private quantizeFallbackMap(
    pixelsRgba: Uint8ClampedArray,
    totalPixels: number,
    indexed: Uint8Array
  ): QuantizedFrame {
    const colorCounts = new Map<number, number>();
    let hasTransparent = false;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      if (pixelsRgba[idx + 3] < 128) {
        hasTransparent = true;
      } else {
        const rgb = (pixelsRgba[idx] << 16) | (pixelsRgba[idx + 1] << 8) | pixelsRgba[idx + 2];
        colorCounts.set(rgb, (colorCounts.get(rgb) || 0) + 1);
      }
    }

    const maxColors = hasTransparent ? 255 : 256;
    const uniqueList: { r: number; g: number; b: number; rgb: number; count: number }[] = [];
    for (const [rgb, count] of colorCounts.entries()) {
      uniqueList.push({
        r: (rgb >> 16) & 0xFF,
        g: (rgb >> 8) & 0xFF,
        b: rgb & 0xFF,
        rgb,
        count
      });
    }

    const palette = this.runMedianCut(uniqueList, maxColors, hasTransparent);
    const transparentIndex: number | null = hasTransparent ? 0 : null;
    const startIdx = hasTransparent ? 1 : 0;
    const lookupCache = new Map<number, number>();

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      if (hasTransparent && pixelsRgba[idx + 3] < 128) {
        indexed[i] = transparentIndex!;
      } else {
        const r = pixelsRgba[idx];
        const g = pixelsRgba[idx + 1];
        const b = pixelsRgba[idx + 2];
        const rgb = (r << 16) | (g << 8) | b;
        let match = lookupCache.get(rgb);
        if (match === undefined) {
          let minD = Infinity;
          match = startIdx;
          for (let p = startIdx; p < palette.length; p++) {
            const pr = palette[p][0];
            const pg = palette[p][1];
            const pb = palette[p][2];
            const d = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
            if (d < minD) {
              minD = d;
              match = p;
              if (d === 0) break;
            }
          }
          lookupCache.set(rgb, match);
        }
        indexed[i] = match;
      }
    }

    return { palette, indexed, transparentIndex };
  }

  /**
   * Add a frame to the animated GIF.
   */
  public addFrame(
    frameSource: ImageData | Uint8ClampedArray | HTMLCanvasElement,
    options: GifFrameOptions = {}
  ): void {
    let rgbaData: Uint8ClampedArray;

    if (typeof HTMLCanvasElement !== 'undefined' && frameSource instanceof HTMLCanvasElement) {
      const ctx = frameSource.getContext('2d');
      if (!ctx) throw new Error('Cannot acquire 2D context from canvas');
      rgbaData = ctx.getImageData(0, 0, this.width, this.height).data;
    } else if (typeof ImageData !== 'undefined' && frameSource instanceof ImageData) {
      rgbaData = frameSource.data;
    } else if (frameSource instanceof Uint8ClampedArray) {
      rgbaData = frameSource;
    } else {
      throw new Error('Unsupported frame source passed to GifEncoder');
    }

    const { palette, indexed, transparentIndex } = this.quantize(rgbaData);

    const delayMs = options.delay ?? 100;
    // GIF delay is stored in units of 1/100 of a second (clamped to at least 2 = 20ms)
    const delayHundredths = Math.max(2, Math.round(delayMs / 10));
    const disposal = options.dispose ?? 2; // Restore to background by default
    const effectiveTrans = options.transparent !== undefined ? options.transparent : transparentIndex;

    // Graphic Control Extension
    this.writeBytes([0x21, 0xF9, 0x04]);
    const hasTrans = effectiveTrans !== null && effectiveTrans !== undefined;
    const packedGce = ((disposal & 0x07) << 2) | (hasTrans ? 0x01 : 0x00);
    this.writeByte(packedGce);
    this.writeUint16(delayHundredths);
    this.writeByte(hasTrans ? (effectiveTrans! & 0xFF) : 0);
    this.writeByte(0x00); // Block terminator

    // Calculate Local Color Table size: 2^(N+1) entries
    let n = 1;
    while ((1 << (n + 1)) < palette.length && n < 7) {
      n++;
    }
    const colorCount = 1 << (n + 1);

    // Image Descriptor
    this.writeByte(0x2C);
    this.writeUint16(0); // Left position
    this.writeUint16(0); // Top position
    this.writeUint16(this.width);
    this.writeUint16(this.height);
    // Local Color Table Flag (0x80) | Table Size (N)
    this.writeByte(0x80 | (n & 0x07));

    // Write Local Color Table (RGB triplets)
    for (let i = 0; i < colorCount; i++) {
      if (i < palette.length) {
        this.writeByte(palette[i][0]);
        this.writeByte(palette[i][1]);
        this.writeByte(palette[i][2]);
      } else {
        this.writeByte(0);
        this.writeByte(0);
        this.writeByte(0);
      }
    }

    // Minimum LZW code size
    const minCodeSize = Math.max(2, n + 1);
    this.writeByte(minCodeSize);

    // Compress indexed pixel stream using GIF LZW
    this.writeLzwData(indexed, minCodeSize);
  }

  private writeLzwData(pixels: Uint8Array, minCodeSize: number): void {
    const clearCode = 1 << minCodeSize;
    const eofCode = clearCode + 1;

    let codeSize = minCodeSize + 1;
    let nextCode = eofCode + 1;

    // Advance generation counter for O(1) dictionary reset
    let gen = ++this.lzwGen;
    if (gen >= 0xFFFFFFFF) {
      this.lzwStamp.fill(0);
      gen = this.lzwGen = 1;
    }

    const lzwKey = this.lzwKey;
    const lzwVal = this.lzwVal;
    const lzwStamp = this.lzwStamp;
    const subBlock = this.lzwSubBlock;

    let curBits = 0;
    let curAccum = 0;
    let subBlockLen = 0;

    const emitByte = (b: number): void => {
      subBlock[subBlockLen++] = b;
      if (subBlockLen === 255) {
        this.writeByte(255);
        this.writeBytes(subBlock);
        subBlockLen = 0;
      }
    };

    const emitCode = (code: number): void => {
      curAccum |= (code << curBits);
      curBits += codeSize;
      while (curBits >= 8) {
        emitByte(curAccum & 0xFF);
        curAccum >>= 8;
        curBits -= 8;
      }
    };

    const flushBits = (): void => {
      if (curBits > 0) {
        emitByte(curAccum & 0xFF);
        curAccum = 0;
        curBits = 0;
      }
      if (subBlockLen > 0) {
        this.writeByte(subBlockLen);
        this.writeBytes(subBlock.subarray(0, subBlockLen));
        subBlockLen = 0;
      }
      this.writeByte(0); // Terminator
    };

    emitCode(clearCode);

    const len = pixels.length;
    if (len > 0) {
      let prefix = pixels[0];

      for (let i = 1; i < len; i++) {
        const c = pixels[i];
        const key = (prefix << 8) | c;
        let slot = ((key * 2654435761) >>> 18) & LZW_HASH_MASK;

        let found = false;
        while (lzwStamp[slot] === gen) {
          if (lzwKey[slot] === key) {
            prefix = lzwVal[slot];
            found = true;
            break;
          }
          slot = (slot + 1) & LZW_HASH_MASK;
        }

        if (!found) {
          emitCode(prefix);

          if (nextCode < 4096) {
            lzwStamp[slot] = gen;
            lzwKey[slot] = key;
            lzwVal[slot] = nextCode++;
            if (nextCode === (1 << codeSize) + 1 && codeSize < 12) {
              codeSize++;
            }
          } else {
            emitCode(clearCode);
            gen = ++this.lzwGen;
            if (gen >= 0xFFFFFFFF) {
              this.lzwStamp.fill(0);
              gen = this.lzwGen = 1;
            }
            codeSize = minCodeSize + 1;
            nextCode = eofCode + 1;
          }
          prefix = c;
        }
      }

      emitCode(prefix);
    }

    emitCode(eofCode);
    flushBits();
  }

  /**
   * Finalize the GIF stream and return the complete binary byte array.
   */
  public finish(): Uint8Array {
    this.writeByte(0x3B); // GIF Trailer
    if (this.chunkPos > 0) {
      this.chunks.push(this.currentChunk.subarray(0, this.chunkPos));
      this.chunkPos = 0;
    }
    const result = new Uint8Array(this.totalBytes);
    let offset = 0;
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}

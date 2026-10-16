/**
 * Dependency-free GIF89a Encoder with LZW compression and median-cut color quantization.
 * Supports multi-frame looping animated GIFs directly from canvas frames.
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

export class GifEncoder {
  private width: number;
  private height: number;
  private loopCount: number;
  private bytes: number[] = [];

  constructor(width: number, height: number, loopCount: number = 0) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.loopCount = loopCount;

    this.writeHeader();
  }

  private writeByte(b: number): void {
    this.bytes.push(b & 0xFF);
  }

  private writeBytes(arr: number[] | Uint8Array): void {
    for (let i = 0; i < arr.length; i++) {
      this.bytes.push(arr[i] & 0xFF);
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
   */
  private quantize(pixelsRgba: Uint8ClampedArray): QuantizedFrame {
    const totalPixels = this.width * this.height;
    const colorCounts = new Map<number, number>();
    let hasTransparent = false;
    let transparentRgb = -1;

    // Scan unique colors and transparency
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const a = pixelsRgba[idx + 3];
      if (a < 128) {
        hasTransparent = true;
        transparentRgb = 0x00FFFFFF;
      } else {
        const rgb = (pixelsRgba[idx] << 16) | (pixelsRgba[idx + 1] << 8) | pixelsRgba[idx + 2];
        colorCounts.set(rgb, (colorCounts.get(rgb) || 0) + 1);
      }
    }

    const maxColors = hasTransparent ? 255 : 256;

    // Fast path: distinct colors fit in palette directly
    if (colorCounts.size <= maxColors) {
      const palette: [number, number, number][] = [];
      const colorToIndex = new Map<number, number>();
      let transparentIndex: number | null = null;

      if (hasTransparent) {
        transparentIndex = 0;
        palette.push([0, 0, 0]); // dummy transparent entry
      }

      for (const rgb of colorCounts.keys()) {
        palette.push([(rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF]);
        colorToIndex.set(rgb, palette.length - 1);
      }

      const indexed = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        if (hasTransparent && pixelsRgba[idx + 3] < 128) {
          indexed[i] = transparentIndex!;
        } else {
          const rgb = (pixelsRgba[idx] << 16) | (pixelsRgba[idx + 1] << 8) | pixelsRgba[idx + 2];
          indexed[i] = colorToIndex.get(rgb) ?? 0;
        }
      }

      return { palette, indexed, transparentIndex };
    }

    // Median Cut Quantization for images with >256 unique colors
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
    let transparentIndex: number | null = null;
    if (hasTransparent) {
      transparentIndex = 0;
      palette.push([0, 0, 0]);
    }
    for (let i = 0; i < boxes.length; i++) {
      palette.push(boxes[i].averageColor());
    }

    const indexed = new Uint8Array(totalPixels);
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
          match = hasTransparent ? 1 : 0;
          const startIdx = hasTransparent ? 1 : 0;
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

    // Graphic Control Extension
    this.writeBytes([0x21, 0xF9, 0x04]);
    const hasTrans = transparentIndex !== null;
    const packedGce = ((disposal & 0x07) << 2) | (hasTrans ? 0x01 : 0x00);
    this.writeByte(packedGce);
    this.writeUint16(delayHundredths);
    this.writeByte(hasTrans ? (transparentIndex! & 0xFF) : 0);
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

    const dict = new Map<number, number>();

    let curBits = 0;
    let curAccum = 0;
    const subBlock = new Uint8Array(255);
    let subBlockLen = 0;

    const emitByte = (b: number): void => {
      subBlock[subBlockLen++] = b;
      if (subBlockLen === 255) {
        this.writeByte(255);
        for (let j = 0; j < 255; j++) {
          this.writeByte(subBlock[j]);
        }
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
        for (let j = 0; j < subBlockLen; j++) {
          this.writeByte(subBlock[j]);
        }
        subBlockLen = 0;
      }
      this.writeByte(0); // Terminator
    };

    emitCode(clearCode);

    if (pixels.length > 0) {
      let prefix = pixels[0];

      for (let i = 1; i < pixels.length; i++) {
        const c = pixels[i];
        const key = (prefix << 16) | c;

        const val = dict.get(key);
        if (val !== undefined) {
          prefix = val;
        } else {
          emitCode(prefix);

          if (nextCode < 4096) {
            dict.set(key, nextCode++);
            if (nextCode === (1 << codeSize) + 1 && codeSize < 12) {
              codeSize++;
            }
          } else {
            emitCode(clearCode);
            dict.clear();
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
    return new Uint8Array(this.bytes);
  }
}

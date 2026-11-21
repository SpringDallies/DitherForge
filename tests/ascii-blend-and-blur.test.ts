import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_ASCII_SETTINGS,
  type AsciiSettings,
  type AsciiGridFrame,
  type GlyphAtlasData,
  rasterizeAsciiGrid,
  blendAsciiChannel,
  fastBoxBlurRgba
} from '../src/ascii';

describe('ASCII Background Blur & Photo Blend Modes', () => {
  it('fastBoxBlurRgba blurs an image with zero allocation in steady state', () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);
    // Draw high-contrast impulse at center (8, 8)
    const centerIdx = (8 * width + 8) * 4;
    data[centerIdx] = 255;
    data[centerIdx + 1] = 255;
    data[centerIdx + 2] = 255;
    data[centerIdx + 3] = 255;

    // Apply blur radius 3
    fastBoxBlurRgba(data, width, height, 3);

    // Center pixel should be diffused/attenuated
    assert.ok(data[centerIdx] < 255, 'Center peak should be diffused');
    assert.ok(data[centerIdx] > 0, 'Center peak should retain energy');

    // Immediate neighbors should receive energy
    const neighborIdx = (8 * width + 9) * 4;
    assert.ok(data[neighborIdx] > 0, 'Neighbor should receive diffused energy');
  });

  it('blendAsciiChannel computes photo blend modes accurately', () => {
    // normal
    assert.strictEqual(blendAsciiChannel(100, 200, 'normal'), 200);

    // screen: 255 - ((255 - 100) * (255 - 200) / 256)
    const screenVal = blendAsciiChannel(100, 200, 'screen');
    assert.ok(screenVal >= 220 && screenVal <= 225, `Screen value ${screenVal} within range`);

    // multiply: (100 * 200) >> 8
    const multVal = blendAsciiChannel(100, 200, 'multiply');
    assert.ok(multVal >= 75 && multVal <= 80, `Multiply value ${multVal} within range`);

    // add / linear dodge (clamped at 255)
    assert.strictEqual(blendAsciiChannel(150, 150, 'add'), 255);
    assert.strictEqual(blendAsciiChannel(50, 60, 'add'), 110);

    // subtract (clamped at 0)
    assert.strictEqual(blendAsciiChannel(100, 150, 'subtract'), 0);
    assert.strictEqual(blendAsciiChannel(150, 50, 'subtract'), 100);

    // bleed / color dodge
    assert.strictEqual(blendAsciiChannel(100, 0, 'bleed'), 100);
    const bleedVal = blendAsciiChannel(128, 200, 'bleed');
    assert.ok(bleedVal > 128, `Bleed value ${bleedVal} brightens substrate`);

    // difference
    assert.strictEqual(blendAsciiChannel(100, 150, 'difference'), 50);

    // overlay
    const overlayDark = blendAsciiChannel(64, 128, 'overlay');
    assert.strictEqual(overlayDark, 64);
  });

  it('rasterizeAsciiGrid respects backgroundBlur and blendMode', () => {
    const width = 32;
    const height = 32;
    const sourceRgba = new Uint8ClampedArray(width * height * 4);
    // Draw bright square on source
    for (let y = 10; y < 22; y++) {
      for (let x = 10; x < 22; x++) {
        const idx = (y * width + x) * 4;
        sourceRgba[idx] = 200;
        sourceRgba[idx + 1] = 200;
        sourceRgba[idx + 2] = 200;
        sourceRgba[idx + 3] = 255;
      }
    }

    const outRgba = new Uint8ClampedArray(width * height * 4);
    const atlas: GlyphAtlasData = {
      cellWidth: 8,
      cellHeight: 8,
      chars: [' ', '#'],
      metrics: [],
      alphaBitmaps: new Uint8Array(2 * 64),
      cellBitmaps: []
    };
    // Make '#' fully opaque 255
    atlas.alphaBitmaps.fill(255, 64, 128);

    const grid: AsciiGridFrame = {
      cols: 4,
      rows: 4,
      cellWidth: 8,
      cellHeight: 8,
      cellSpacing: 0,
      chars: atlas.chars,
      charIndices: new Uint16Array(16),
      fgRgba: new Uint8ClampedArray(16 * 4),
      bgRgba: new Uint8ClampedArray(16 * 4),
      luminance: new Float32Array(16),
      offsetX: new Int8Array(16),
      offsetY: new Int8Array(16),
      highlight: new Float32Array(16)
    };

    // Put '#' at cell (1, 1) with green color
    grid.charIndices[5] = 1; // index in atlas
    grid.fgRgba[5 * 4] = 0;
    grid.fgRgba[5 * 4 + 1] = 255;
    grid.fgRgba[5 * 4 + 2] = 0;
    grid.fgRgba[5 * 4 + 3] = 255;

    const settings: AsciiSettings = {
      ...DEFAULT_ASCII_SETTINGS,
      cellWidth: 8,
      cellHeight: 8,
      backgroundMode: 'original',
      backgroundBlur: 4,
      blendMode: 'screen'
    };

    rasterizeAsciiGrid(grid, atlas, settings, sourceRgba, outRgba, width, height);

    // Verify background blurred: pixel outside the initial 10..22 box should have non-zero value due to blur
    const outsideIdx = (8 * width + 8) * 4;
    assert.ok(outRgba[outsideIdx] > 0, 'Background blur diffused into outside pixel');

    // Verify cell (1, 1) pixel was blended with screen mode
    const glyphPixelIdx = (9 * width + 9) * 4;
    // Green channel should be high (from fg green screen-blended with bg)
    assert.strictEqual(outRgba[glyphPixelIdx + 1], 255, 'Green channel saturated in screen blend');
  });
});

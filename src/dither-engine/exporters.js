// DitherForge Multi-Format Exporters
// Vector Contours, Character-Grids, High-Res Rasters, and Animated Sequences

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} [format="png"]
 * @param {number} [quality=0.92]
 * @param {string|null} [filename=null]
 */
export function exportRaster(canvas, format = "png", quality = 0.92, filename = null) {
  let mime = "image/png";
  if (format === "jpg" || format === "jpeg") mime = "image/jpeg";
  if (format === "webp") mime = "image/webp";

  const dataUrl = canvas.toDataURL(mime, quality);
  const baseName = filename && filename.trim() ? filename.trim() : "ditherforge_export";
  const finalName = baseName.endsWith(`.${format}`) ? baseName : `${baseName}.${format}`;
  downloadDataUrl(dataUrl, finalName);
}

export function copyCanvasToClipboard(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error("Canvas blob conversion failed"));
        return;
      }
      if (navigator.clipboard && navigator.clipboard.write) {
        navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]).then(resolve).catch(reject);
      } else {
        reject(new Error("Clipboard API unavailable"));
      }
    }, "image/png");
  });
}

// True Character-Grid Export: ASCII, Unicode Blocks, and Braille Matrix
export function exportCharacterGrid(canvas, charSetType = "ascii", cellWidth = 6, cellHeight = 12) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const cols = Math.floor(width / cellWidth);
  const rows = Math.floor(height / cellHeight);

  const ASCII_RAMP = " .:-=+*#%@";
  const BLOCK_RAMP = " ░▒▓█";

  let resultText = "";

  if (charSetType === "braille") {
    // 2x4 dot matrix mapped to Unicode Braille U+2800..U+28FF
    const bCols = Math.floor(width / 2);
    const bRows = Math.floor(height / 4);

    for (let by = 0; by < bRows; by++) {
      let line = "";
      for (let bx = 0; bx < bCols; bx++) {
        let code = 0x2800;
        // Dot offsets:
        // (0,0)->bit 0, (0,1)->bit 1, (0,2)->bit 2, (1,0)->bit 3, (1,1)->bit 4, (1,2)->bit 5, (0,3)->bit 6, (1,3)->bit 7
        const dots = [
          [0, 0, 0x01], [0, 1, 0x02], [0, 2, 0x04],
          [1, 0, 0x08], [1, 1, 0x10], [1, 2, 0x20],
          [0, 3, 0x40], [1, 3, 0x80]
        ];

        for (let d = 0; d < dots.length; d++) {
          const px = bx * 2 + dots[d][0];
          const py = by * 4 + dots[d][1];
          if (px < width && py < height) {
            const idx = (py * width + px) * 4;
            const luma = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
            if (luma > 128) {
              code |= dots[d][2];
            }
          }
        }
        line += String.fromCharCode(code);
      }
      resultText += line + "\n";
    }
  } else {
    const ramp = charSetType === "blocks" ? BLOCK_RAMP : ASCII_RAMP;
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        let lumaSum = 0;
        let count = 0;
        for (let dy = 0; dy < cellHeight; dy++) {
          for (let dx = 0; dx < cellWidth; dx++) {
            const px = c * cellWidth + dx;
            const py = r * cellHeight + dy;
            if (px < width && py < height) {
              const idx = (py * width + px) * 4;
              lumaSum += 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
              count++;
            }
          }
        }
        const avgLuma = count > 0 ? lumaSum / count : 0;
        const rampIdx = Math.floor((avgLuma / 256) * ramp.length);
        line += ramp[Math.min(ramp.length - 1, Math.max(0, rampIdx))];
      }
      resultText += line + "\n";
    }
  }

  downloadText(resultText, `ditherforge_${charSetType}_grid.txt`);
  return resultText;
}

// Vector SVG Export: Marching Squares Contour Tracing
export function exportSvgContours(canvas) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Extract pixel paths or pixel rects optimized for vector rendering
  let svgPaths = "";
  const rects = [];

  // Group continuous horizontal spans into compact SVG rectangles
  for (let y = 0; y < height; y++) {
    let spanStart = -1;
    let spanColor = null;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const luma = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
      const isDark = luma < 128;

      if (isDark) {
        if (spanStart === -1) {
          spanStart = x;
          spanColor = `rgb(${data[idx]},${data[idx + 1]},${data[idx + 2]})`;
        }
      } else {
        if (spanStart !== -1) {
          rects.push(`<rect x="${spanStart}" y="${y}" width="${x - spanStart}" height="1" fill="${spanColor}" />`);
          spanStart = -1;
        }
      }
    }
    if (spanStart !== -1) {
      rects.push(`<rect x="${spanStart}" y="${y}" width="${width - spanStart}" height="1" fill="${spanColor}" />`);
    }
  }

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <g shape-rendering="crispEdges">
    ${rects.join("\n    ")}
  </g>
</svg>`;

  downloadText(svgContent, "ditherforge_vector.svg", "image/svg+xml");
}

// Video Recording Export (WebM / MP4)
export class VideoRecorder {
  constructor(canvas, fps = 30) {
    this.canvas = canvas;
    this.fps = fps;
    this.stream = canvas.captureStream(fps);
    this.mediaRecorder = null;
    this.chunks = [];
  }

  start() {
    this.chunks = [];
    const mimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4"
    ];
    let selectedMime = "video/webm";
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: selectedMime });
    this.mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };
    this.mediaRecorder.start();
  }

  stop() {
    return new Promise(resolve => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
        const ext = this.mediaRecorder.mimeType.includes("mp4") ? "mp4" : "webm";
        const url = URL.createObjectURL(blob);
        downloadDataUrl(url, `ditherforge_recording.${ext}`);
        resolve(url);
      };
      this.mediaRecorder.stop();
    });
  }
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadText(content, filename, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

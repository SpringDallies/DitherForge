<p align="center">
  <img src="assets/logo-wordmark.webp" alt="DitherForge" height="80" style="vertical-align: middle;" />
  &nbsp;&nbsp;
  <img src="assets/logo-mark.png" alt="ForgeLogo" height="90" style="vertical-align: middle;" />
</p>

<h3 align="center">FOSS Dithering Suite</h3>

DitherForge is a standalone, cross-platform app for dithering images, video, and animation. It includes 63 original and public-domain dithering algorithms, native color-space processing, a stackable post-effects pipeline, CRT-style temporal noise, vector contour export, and Unicode character-grid export. Inspired by ditherboy.

---

## Features

### 63 Dithering Algorithms
- **Error diffusion (15)** — Floyd–Steinberg, Atkinson, Jarvis–Judice–Ninke, Stucki, Burkes, Sierra, Stevenson–Arce, and more.
- **Ordered (5)** — Bayer 2×2, 4×4, 8×8, 16×16, and Clustered Dot.
- **Pattern (8)** — Checkered, lines, crosshatch, diagonal hatch, diamond, basket, and stipple.
- **Glitch & signal synthesis (17)** — Scanline jitter, chromatic offset, pixel sorting, VHS noise, CRT bloom, and more.
- **Special & stochastic (16)** — White/blue noise, Perlin, Riemersma, Voronoi, TPDF, and more.
- **Bespoke (1)** — Ignition Glow.
- **Temporal (1)** — Temporal Kinetic Dither.

### Native Color Handling
Processes directly in Rec. 709 luminance-weighted RGB space, with up to 32 palette depth iterations and live swatch remapping.

### Reorderable Post-Effects Stack
- Ignition Glow
- Blur / Sharpen
- Chromatic Aberration
- JPEG Artifacts
- CMYK Newspaper Halftone
- CRT Scanlines
- Pixelate
- Curves & Levels
- Optical Vignette

### Video & Animation
- Timeline with scrubber, play/pause, loop, and FPS options: 12, 24, 30, 60.
- 9 CRT temporal noise profiles.
- One-click Animate Still converter.
- Real-time MP4/WebM recording.

### Export Formats
PNG, JPG, WebP, SVG, TXT character grids, MP4/WebM, GIF, frame sequence, and clipboard copy.

### Studio UI
- Smooth zoom, pan, 1:1 view, and fit-to-window.
- Before/After toggle and draggable split comparison.
- 6 themes.
- Preset manager with built-in and user presets.
- In-app algorithm reference.

---

## Getting Started

### Web App
```powershell
npm install
npm run dev
```
Open `http://localhost:5173/app.html`.

Production build:
```powershell
npm run build
npm run serve
```
Open `http://localhost:8080/app.html`.

### Desktop App
```powershell
npm install
npm run tauri dev
```

Release build:
```powershell
npm run tauri build
```

---

## Documentation
- [`SPEC_LOG.md`](./SPEC_LOG.md) — technical spec and algorithm formulations.
- [`src/docs/ALGORITHM_REFERENCE.md`](./src/docs/ALGORITHM_REFERENCE.md) — full algorithm manual.

---

## License
Dual-licensed under MIT and Apache-2.0.

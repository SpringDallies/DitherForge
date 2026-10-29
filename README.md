<p align="center">
  <img src="assets/logo-wordmark.webp" alt="DitherForge" height="80" style="vertical-align: middle;" />
  &nbsp;&nbsp;
  <img src="assets/logo-mark.png" alt="ForgeLogo" height="90" style="vertical-align: middle;" />
</p>

<h3 align="center">FOSS Dithering Suite</h3>

DitherForge is a standalone, cross-platform app for dithering images, video, and animation. It includes 84 original and public-domain dithering algorithms, native color-space processing, a stackable post-effects pipeline, CRT-style temporal noise, vector contour export, and Unicode character-grid export. Inspired by ditherboy.

🌐 **Live demo:** https://springdallies.github.io/DitherForge/

---

## Features

### 84 Dithering Algorithms
Directly generated from the engine registry, categorized and searchable:

- **Basic** (2) — Color Separation, Original
- **Error Diffusion** (22) — Floyd–Steinberg, Atkinson, Jarvis–Judice–Ninke, Stucki, Burkes, Sierra, Stevenson–Arce, Fan, Shiau–Fan, False Floyd–Steinberg, Minimized Average Error, Dynamic Serpentine, and more
- **Ordered** (10) — Bayer 2×2, 4×4, 8×8, 16×16, Clustered Dot, Bayer-Void, Bit Tone, Mosaic, Random Ordered
- **Pattern** (13) — Block Tone, Camo, Checkers, Circle Grid, Crosshatch, Diamond Grid, Gridlock/Traffic, Heart Grid, Pop Tone, Print Pattern, Square Mosaic, Stippling
- **Polygon** (4) — Hexa-Poly, Low-Poly, Penta-Poly, Tri-Poly
- **Glitch Effects** (17) — Artifact Modulation, Glitch, Wave Modulation, Smooth Diffuse, and more
- **Special** (16) — Beehive, Diagonal, Displace Contour, Dotted Lines, Noise, Orb Diffuse, Radial Burst, Sine Distort, Thresholder, Topography, Vortex, Wave, and more

### Native Color Handling
Processes directly in Rec. 709 luminance-weighted RGB space, with up to 32 palette depth iterations and live swatch remapping.

### 14 Built-in Color Palettes
Monochrome, GameBoy, Amber CRT, Cyberpunk, CGA, C64, PICO-8, Nordic, Vaporwave, Solar, EGA, Sepia, Spectrum, and Macintosh 1984. Includes Median Cut and K-Means palette extraction from images.

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
9 CRT temporal noise profiles. One-click Animate Still converter.

### Export Formats
PNG, JPG, WebP, SVG vector contours, TXT character grids (ASCII, Unicode Blocks, Unicode Braille), and clipboard copy.

### Studio UI
- Smooth zoom, pan, 1:1 view, and fit-to-window.
- Before/After toggle and draggable split comparison.
- 9 themes.
- Preset manager with built-in and user presets.
- In-app algorithm reference.

---

## Getting Started

### Web App
```powershell
npm install
npm run dev
```
Open `http://localhost:5173/`.

Production build:
```powershell
npm run build
npm run serve
```
Open `http://localhost:8080/`.

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
- [`src/docs/ALGORITHM_REFERENCE.md`](./src/docs/ALGORITHM_REFERENCE.md) — full algorithm manual (2,438 lines).
- [`FEATURE_INVENTORY.md`](./FEATURE_INVENTORY.md) — audited feature inventory mapped to source code.

---

## License
Dual-licensed under MIT and Apache-2.0.

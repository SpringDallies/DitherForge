# DitherForge — Retro Synthesis & Precision Dithering Suite

<img src="assets/logo-mark.png" alt="ForgeLogo" width="250" height="250" style="display: flex; justify-content: center;">

**DitherForge** is a standalone, cross-platform image, video, and animation dithering application It features 63 original and public-domain dithering algorithms, native color-space integration, a stackable post-effects pipeline, CRT temporal noise variation, vector contour export, and true Unicode character grids. it is inspired by ditherboy

---

## 🌟 Key Features

### 1. 63 Public-Domain & Clean-Room Dithering Algorithms
- **Error Diffusion (15)**: Floyd–Steinberg, Atkinson, Jarvis–Judice–Ninke, Stucki, Burkes, Sierra Three-Row, Sierra Two-Row, Sierra Lite, Stevenson–Arce, Fan Adaptive, Shiau–Fan Balanced, Shiau–Fan 2, False Floyd–Steinberg, Minimized Average Error (Oatley), Dynamic Serpentine Lattice.
- **Ordered Dithering (5)**: Bayer 2×2, 4×4, 8×8, 16×16, Clustered Dot (Screened Halftone).
- **Pattern Dithers (8)**: Checkered, Horizontal Lines, Vertical Lines, Interlocking Crosshatch, Diagonal 45° Hatch, Concentric Diamond, Woven Basket, Hexagonal Stochastic Stipple.
- **Glitch & Signal Synthesis (17)**: Scanline Jitter, Color Channel Chromatic Offset, Directional Pixel Sorting, Digital Compression Artifacts, Interlacing Field Tear, CRT Phosphor Bloom, Bit-Depth Crush, VHS Tracking Noise, Bad RAM Nibble Inversion, Sinusoidal Wave Warp, Quantization Step Slicing, Diagonal Matrix Rake, Analog Static Snow, Sync Pulse Hold Collapse, Edge Ringing & Feedback, YUV 4:1:1 Degradation, Moiré Interference.
- **Special & Stochastic (16)**: Fixed Bi-Level Cutoff, Uniform White Noise, Void-and-Cluster Blue Noise, Gaussian Normal Distribution, Perlin Gradient Lattice, Riemersma Hilbert Space-Curve, Ostromoukhov Variable Diffusion, Triangular PDF (TPDF), Dynamic Companding (A-Law), Hexagonal Spatial Lattice, Sobel Silhouette Preserving, Laplacian High-Pass, Directional Gradient, Voronoi Cellular Stipple, Unsharp Diffusion Quantizer, Quantum Micro-Stipple.
- **Bespoke Effect (1)**: **Ignition Glow** (Bespoke Dither Bloom) — analyzes local dither dot density and edge contrast, bleeding an authentic phosphor halo without washing out micro-structures.
- **Temporal Effect (1)**: **Temporal Kinetic Dither** — continuous phase-shifting for animated media.

### 2. Native Color-Integrated Quantization
Color is never mapped as an external pre- or post-filter. The error diffusion and ordered threshold loops evaluate distances directly in 3D Rec. 709 luminance-weighted RGB color space, supporting up to 32 depth iterations per palette with live swatch remapping.

### 3. Reorderable Post-Effects Stack
Stackable post-processing with a "+" add menu:
- Ignition Glow
- Separable Blur / Sharpen
- Chromatic Aberration
- JPEG Artifact Simulation
- CMYK Newspaper Halftone (dot angle, size & shape)
- CRT Scanlines
- Pixelate
- Curves & Levels
- Optical Vignette Falloff

### 4. Video & Animation Timeline
- Interactive scrubber with play/pause, loop, and FPS controls (12, 24, 30, 60 fps).
- **9 CRT Temporal Noise Profiles**: Grain, Static, Scanline Drift, Vertical Drift, Pulse, Flicker, Wave, Shimmer, Chaos.
- One-click **Animate Still** converter.
- Real-time MP4/WebM video stream recorder.

### 5. Multi-Format Exporters (9 Formats)
- **PNG**: Lossless raster for print.
- **JPG**: Web compressed raster.
- **WebP**: Modern lightweight compressed format.
- **SVG**: Vector contours with grouping and Marching Squares tracing for pen plotters and laser cutters.
- **TXT**: True character-grid matrices (ASCII ` .:-=+*#%@`, Unicode Blocks ` ░▒▓█`, and 2×4 dot Braille Matrix `U+2800..U+28FF`).
- **MP4 / WebM**: Recorded animated dither streams.
- **GIF**: Animated retro sequences.
- **Frame Sequence**: PNG frames sequence export.
- **Clipboard**: Direct PNG copy for pasting into Photoshop, Figma, or Discord.

### 6. Interactive Studio UI
- Canvas preview with smooth zoom, pan, 1:1 view, and fit-to-window.
- **Before/After toggle** and **Interactive Draggable Split Comparison Slider**.
- 6 Themes: Dark Pro, CRT Phosphor Green, Cyberpunk Neon, GameBoy Olive, Retro Mac 1984, Vaporwave Pink.
- Preset manager with 10 built-in presets and user JSON save/load.
- Comprehensive in-app **Algorithm Reference Documentation** (1,500+ lines).

---

## 🚀 Quick Start & Launch

### Modern Web App (Vite + React + TypeScript)
Run the development server on port 5173:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173/app.html` in your browser.

To build and serve the production bundle on port 8080:

```powershell
npm run build
npm run serve
```

Open `http://localhost:8080/app.html` in your browser.

### Native Desktop App (Tauri 2 + Rust)
To build the native desktop executable:

```powershell
# In the DitherForge directory
npm install
npm run tauri dev
```

For release packaging (`.exe` on Windows, `.dmg` on macOS, `.AppImage` on Linux):

```powershell
npm run tauri build
```

---

## 📜 Clean-Room Documentation

- See [`SPEC_AND_CLEAN_ROOM_LOG.md`](./SPEC_AND_CLEAN_ROOM_LOG.md) for full clean-room attestations, algorithm provenance, and mathematical formulations.
- See [`src/docs/ALGORITHM_REFERENCE.md`](./src/docs/ALGORITHM_REFERENCE.md) for the 1,500+ line technical manual detailing every algorithm, parameter sensitivity, and visual trade-offs.

---

## ⚖️ License
Dual-licensed under MIT and Apache-2.0. Clean-room engineered for retro synthesis and digital artists.

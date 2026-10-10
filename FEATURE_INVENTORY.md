# DitherForge — Master Feature Inventory & UI/UX Rebuild Safety Net (v2)

**Project:** DitherForge (Tauri 2 + React + TypeScript + Vite)  
**Document Version:** 2.0.0 (APPROVED WITH AMENDMENTS — Awaiting v2 Sign-Off)  
**Strict Mandate:** Rule #1 — NO FEATURE REMOVAL. Every control, parameter, option, theme, algorithm, effect, and export format is preserved and verified against the existing codebase.  
**Performance Baseline:** Intel Core i3-3240T, Intel HD 2500 graphics, 8 GB RAM, WebKitGTK. No `backdrop-filter`, no text/box-shadow glow animations, static token-based themes only.  
**Engine Architecture:** TypeScript/JS (`core/` + `WebWorker` with transferable `ArrayBuffer` objects) for bit-identical deterministic mathematical execution.

---

## 1. Feature Inventory & Location Mapping

### 1.1 Dithering Algorithms (63 Total)
*Output must remain bit-identical. Mapped to Right Panel A: Searchable categorized dropdown with interactive category filter chips, Prev/Next stepping, favorites, and progressive parameter disclosure.*

| # | Feature / Algorithm | Category | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|---|---|
| 1 | Floyd–Steinberg | Error Diffusion | `src/dither-engine/algorithms.js:33` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 2 | Atkinson | Error Diffusion | `src/dither-engine/algorithms.js:34` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 3 | Jarvis–Judice–Ninke | Error Diffusion | `src/dither-engine/algorithms.js:35` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 4 | Stucki | Error Diffusion | `src/dither-engine/algorithms.js:36` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 5 | Burkes | Error Diffusion | `src/dither-engine/algorithms.js:37` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 6 | Sierra Three-Row | Error Diffusion | `src/dither-engine/algorithms.js:38` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 7 | Sierra Two-Row | Error Diffusion | `src/dither-engine/algorithms.js:39` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 8 | Sierra Lite | Error Diffusion | `src/dither-engine/algorithms.js:40` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 9 | Stevenson–Arce | Error Diffusion | `src/dither-engine/algorithms.js:41` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 10 | Fan Adaptive | Error Diffusion | `src/dither-engine/algorithms.js:42` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 11 | Shiau–Fan Balanced | Error Diffusion | `src/dither-engine/algorithms.js:43` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 12 | Shiau–Fan 2 (Narrow) | Error Diffusion | `src/dither-engine/algorithms.js:44` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 13 | False Floyd–Steinberg | Error Diffusion | `src/dither-engine/algorithms.js:45` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 14 | Minimized Average Error | Error Diffusion | `src/dither-engine/algorithms.js:46` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 15 | Dynamic Serpentine Lattice | Error Diffusion | `src/dither-engine/algorithms.js:47` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 16 | Bayer 2×2 | Ordered | `src/dither-engine/algorithms.js:50` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 17 | Bayer 4×4 | Ordered | `src/dither-engine/algorithms.js:51` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 18 | Bayer 8×8 | Ordered | `src/dither-engine/algorithms.js:52` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 19 | Bayer 16×16 | Ordered | `src/dither-engine/algorithms.js:53` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 20 | Clustered Dot Screen | Ordered | `src/dither-engine/algorithms.js:54` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 21 | Checkered Micro-Grid | Pattern | `src/dither-engine/algorithms.js:57` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 22 | Horizontal Linear Grating | Pattern | `src/dither-engine/algorithms.js:58` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 23 | Vertical Linear Grating | Pattern | `src/dither-engine/algorithms.js:59` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 24 | Interlocking Crosshatch | Pattern | `src/dither-engine/algorithms.js:60` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 25 | Diagonal 45° Hatch | Pattern | `src/dither-engine/algorithms.js:61` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 26 | Concentric Diamond Grid | Pattern | `src/dither-engine/algorithms.js:62` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 27 | Woven Basket Tile | Pattern | `src/dither-engine/algorithms.js:63` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 28 | Hexagonal Stochastic Stipple | Pattern | `src/dither-engine/algorithms.js:64` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 29 | Scanline Jitter | Glitch | `src/dither-engine/algorithms.js:67` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 30 | Color Channel Chromatic Offset | Glitch | `src/dither-engine/algorithms.js:68` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 31 | Directional Pixel Sorting | Glitch | `src/dither-engine/algorithms.js:69` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 32 | Digital Compression Artifacts | Glitch | `src/dither-engine/algorithms.js:70` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 33 | Interlacing Field Tear | Glitch | `src/dither-engine/algorithms.js:71` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 34 | CRT Phosphor Bloom | Glitch | `src/dither-engine/algorithms.js:72` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 35 | Bit-Depth Crush Quantizer | Glitch | `src/dither-engine/algorithms.js:73` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 36 | VHS Tracking Head Noise | Glitch | `src/dither-engine/algorithms.js:74` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 37 | Bad RAM Nibble Inversion | Glitch | `src/dither-engine/algorithms.js:75` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 38 | Sinusoidal Wave Phase Warp | Glitch | `src/dither-engine/algorithms.js:76` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 39 | Quantization Step Slicing | Glitch | `src/dither-engine/algorithms.js:77` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 40 | Diagonal Matrix Cascade Rake | Glitch | `src/dither-engine/algorithms.js:78` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 41 | Analog Static Snow | Glitch | `src/dither-engine/algorithms.js:79` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 42 | Sync Pulse Hold Collapse | Glitch | `src/dither-engine/algorithms.js:80` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 43 | Edge Ringing & Video Feedback | Glitch | `src/dither-engine/algorithms.js:81` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 44 | YUV 4:1:1 Chroma Degradation | Glitch | `src/dither-engine/algorithms.js:82` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 45 | Moiré Optical Interference Glitch | Glitch | `src/dither-engine/algorithms.js:83` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 46 | Fixed Bi-Level Cutoff | Special | `src/dither-engine/algorithms.js:86` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 47 | Uniform White Noise Dither | Special | `src/dither-engine/algorithms.js:87` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 48 | Void-and-Cluster Blue Noise | Special | `src/dither-engine/algorithms.js:88` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 49 | Gaussian Normal Distribution | Special | `src/dither-engine/algorithms.js:89` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 50 | Perlin Gradient Lattice | Special | `src/dither-engine/algorithms.js:90` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 51 | Riemersma Space-Filling Curve | Special | `src/dither-engine/algorithms.js:91` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 52 | Ostromoukhov Variable Diffusion | Special | `src/dither-engine/algorithms.js:92` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 53 | Triangular PDF Noise (TPDF) | Special | `src/dither-engine/algorithms.js:93` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 54 | Dynamic Companding (A-Law) | Special | `src/dither-engine/algorithms.js:94` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 55 | Hexagonal Spatial Lattice | Special | `src/dither-engine/algorithms.js:95` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 56 | Sobel Silhouette Preserving | Special | `src/dither-engine/algorithms.js:96` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 57 | Laplacian Frequency Modulated | Special | `src/dither-engine/algorithms.js:97` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 58 | Directional Gradient Angle | Special | `src/dither-engine/algorithms.js:98` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 59 | Voronoi Cellular Relaxed Stipple | Special | `src/dither-engine/algorithms.js:99` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 60 | Unsharp Diffusion Quantizer | Special | `src/dither-engine/algorithms.js:100` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 61 | Quantum Micro-Stipple Cloud | Special | `src/dither-engine/algorithms.js:101` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 62 | Ignition Glow (Bespoke Dither Bloom) | Bespoke | `src/dither-engine/algorithms.js:104` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Bespoke | [ ] Pending |
| 63 | Temporal Kinetic Dither | Temporal | `src/dither-engine/algorithms.js:105` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Temporal | [ ] Pending |

---

### 1.2 Algorithm Parameters & Navigation Controls

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| Search Input for Algorithms | `index.html:86` (`#algoSearchInput`) | Left Panel top input | Right Panel A > Algorithm search box inside dropdown | [ ] Pending |
| Category Filter Chips (All, Diffusion, Ordered, Pattern, Glitch, Special, Bespoke) | `index.html:89-97` (`#algoCategoryPills`) | Left Panel category pill buttons | Right Panel A > Interactive category filter chips inside picker header | [ ] Pending |
| Favourites / Pinned Algorithms Row | *[NEW Ergonomic Addition]* | None | Right Panel A > Top row of Algorithm Dropdown (`★ Favorites`) | [ ] Pending |
| Algorithm Stepping (Prev/Next buttons) | `main.js:168-180` | None (Keyboard only) | Right Panel A > `<` and `>` icon buttons next to dropdown | [ ] Pending |
| Up/Down Arrow Stepping (fires only when no input focused) | `main.js:168-180` | Window keydown handler | Window keydown handler (checks `!isInputActive()`) | [ ] Pending |
| Threshold Pivot Slider & Number Input | `index.html:112-117` (`#sliderThreshold`) | Left Panel card | Right Panel A > Algorithm Parameters section | [ ] Pending |
| Diffusion Strength Slider & Number Input | `index.html:120-125` (`#sliderDiffusionStrength`) | Left Panel card | Right Panel A > Algorithm Parameters section | [ ] Pending |
| Pattern Scale Slider & Number Input | `index.html:128-133` (`#sliderScale`) | Left Panel card | Right Panel A > Algorithm Parameters section | [ ] Pending |
| Serpentine Scanning Toggle Checkbox | `index.html:136-139` (`#checkSerpentine`) | Left Panel card | Right Panel A > Algorithm Parameters section | [ ] Pending |
| Noise Amount Slider & Number Input | `main.js:52`, `algorithms.js:463` | Engine state | Right Panel A > Parameters section (visible for noise/glitch algorithms) | [ ] Pending |
| Section Reset Button (Algorithm Parameters) | `index.html:107` (`#btnResetAlgoParams`) | Left Panel `↺` button | Right Panel A > Section header `↺ Reset Parameters` button | [ ] Pending |
| Per-Slider Double-Click to Reset | *[NEW Ergonomic Addition]* | None | Double-click any slider thumb resets to default | [ ] Pending |
| One-line Parameter Tooltips | *[NEW Ergonomic Addition]* | None | Hover tooltip on each parameter & slider label | [ ] Pending |

---

### 1.3 Image Adjustments & Tweaks

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| Brightness Slider & Number Input | `index.html:279-286` (`#sliderBrightness`) | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Contrast Slider & Number Input | `index.html:289-296` (`#sliderContrast`) | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Saturation Slider & Number Input | `index.html:299-306` (`#sliderSaturation`) | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Gamma Slider & Number Input | `index.html:309-316` (`#sliderGamma`) | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Lock Brightness Checkbox / Toggle | `index.html:281` (`#lockBrightness`) | Right Panel checkbox | Right Panel A > Lock icon button next to Brightness | [ ] Pending |
| Lock Contrast Checkbox / Toggle | `index.html:291` (`#lockContrast`) | Right Panel checkbox | Right Panel A > Lock icon button next to Contrast | [ ] Pending |
| Lock Saturation Checkbox / Toggle | `index.html:301` (`#lockSaturation`) | Right Panel checkbox | Right Panel A > Lock icon button next to Saturation | [ ] Pending |
| Lock Gamma Checkbox / Toggle | `index.html:311` (`#lockGamma`) | Right Panel checkbox | Right Panel A > Lock icon button next to Gamma | [ ] Pending |
| Section Reset Button (Adjustments) | *[NEW Ergonomic Addition]* | None | Right Panel A > Adjustments header `↺ Reset Adjustments` button | [ ] Pending |
| Global Randomize / Shuffle Tweaks | `index.html:275` (`#btnShuffleTweaks`) | Right Panel `🔀` button | Right Panel A > Adjustments header `🔀 Randomize` button | [ ] Pending |

---

### 1.4 Color & Palette System

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| 14 Built-in Palettes (Monochrome, GameBoy, Amber CRT, Cyberpunk, CGA, C64, PICO, Nordic, Vaporwave, Solar, EGA, Sepia, Spectrum, Mac 1984) | `src/dither-engine/palettes.js:4-200` | Left Panel > Palettes dropdown | Right Panel B > Palette Dropdown (categorized) | [ ] Pending |
| Live Palette Preview on Hover + Mouse Wheel | *[NEW Ergonomic Addition]* | Dropdown change only | Right Panel B > Palette Dropdown hover/wheel live preview | [ ] Pending |
| Median Cut Palette Extraction ("From Image") | `palettes.js:240` (`extractPaletteMedianCut`) | Left Panel button | Right Panel B > "From Image" > Median Cut | [ ] Pending |
| K-Means Clustering Extraction ("From Image") | `palettes.js:320` (`extractPaletteKMeans`) | Left Panel button | Right Panel B > "From Image" > K-Means | [ ] Pending |
| Octree Quantization Extraction ("From Image") | `palettes.js:375` (`extractPaletteOctree`) | Code engine | Right Panel B > "From Image" > Octree | [ ] Pending |
| "Complete" Palette Option (Close Match) | *[NEW Ergonomic Addition]* | None | Right Panel B > "From Image" > Complete (preserves closest matches) | [ ] Pending |
| Swatch Strip Preview | `index.html:151` (`#palettePreviewStrip`) | Left Panel swatch strip | Right Panel B > Swatch Strip (interactive) | [ ] Pending |
| Live Swatch Click-to-Edit & Remap | `main.js:284-300` | Left Panel native color picker | Right Panel B > Click swatch opens color editor; live remap | [ ] Pending |
| Per-Swatch Lock Toggle | `main.js:302-309` (`state.lockedSwatches`) | Left Panel lock button | Right Panel B > Swatch strip lock icon per color | [ ] Pending |
| Palette Shuffle (Unlocked Swatches) | `index.html:170` (`#btnShufflePalette`) | Left Panel `🔀` button | Right Panel B > Palette Shuffle button | [ ] Pending |
| Depth Iterations Slider (1 to 32) | `index.html:178` (`#sliderPaletteDepth`) | Left Panel Depth slider | Right Panel B > Depth Slider (up to 32 iterations) | [ ] Pending |
| Add Swatch Color Button | `index.html:187` (`#btnAddColorSwatch`) | Left Panel `+ Add Color` | Right Panel B > Swatch strip `+` button | [ ] Pending |
| Delete Swatch Color Button | `main.js:312-321` (`.btn-del-swatch`) | Left Panel `✕` button | Right Panel B > Swatch popover delete button | [ ] Pending |
| Export Palette JSON | `index.html:190` (`#btnExportPaletteJson`) | Left Panel `📤` button | Right Panel B > Overflow menu `...` > Export Palette JSON | [ ] Pending |
| Import Palette JSON | `index.html:193` (`#btnImportPaletteJson`) | Left Panel `📥` button | Right Panel B > Overflow menu `...` > Import Palette JSON | [ ] Pending |

---

### 1.5 Stackable Post-Effects Pipeline

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| Effect Stack Container | `index.html:337` (`#effectStackList`) | Right Panel > Effect Stack | Right Panel C > Effects Stack | [ ] Pending |
| "+" Add Effect Dropdown / Popover | `index.html:324` (`#addEffectDropdown`) | Right Panel select element | Right Panel C > `[ + Add Effect ]` button & popover | [ ] Pending |
| Ignition Glow Effect (`radius: 3`, `intensity: 0.6`) | `effect-stack.js:5, 58` (`applyGlow`) | Right Panel effect item | Right Panel C > Effect item (params: radius, intensity) | [ ] Pending |
| Blur / Sharpen Effect (`amount: 0.8`) | `effect-stack.js:6, 88` (`applyBlurSharpen`) | Right Panel effect item | Right Panel C > Effect item (params: amount) | [ ] Pending |
| Chromatic Aberration (`offsetX: 4`, `offsetY: 0`) | `effect-stack.js:7, 110` (`applyChromaticAberration`) | Right Panel effect item | Right Panel C > Effect item (params: offsetX, offsetY) | [ ] Pending |
| JPEG Artifacts (`quality: 0.3`) | `effect-stack.js:8, 131` (`applyJpegArtifacts`) | Right Panel effect item | Right Panel C > Effect item (params: quality) | [ ] Pending |
| CMYK Halftone (`dotSize: 5`, `angle: 45`, `shape: circle`) | `effect-stack.js:9, 159` (`applyHalftone`) | Right Panel effect item | Right Panel C > Effect item (params: dotSize, angle, shape) | [ ] Pending |
| CRT Scanlines (`thickness: 2`, `intensity: 0.4`) | `effect-stack.js:10, 196` (`applyScanlines`) | Right Panel effect item | Right Panel C > Effect item (params: thickness, intensity) | [ ] Pending |
| Pixelate Effect (`blockSize: 4`) | `effect-stack.js:11, 214` (`applyPixelate`) | Right Panel effect item | Right Panel C > Effect item (params: blockSize) | [ ] Pending |
| Curves & Levels (`blackPoint: 0.05`, `whitePoint: 0.95`, `gamma: 1.1`) | `effect-stack.js:12, 232` (`applyCurvesLevels`) | Right Panel effect item | Right Panel C > Effect item (params: blackPoint, whitePoint, gamma) | [ ] Pending |
| Vignette Falloff (`radius: 0.8`, `softness: 0.4`) | `effect-stack.js:13, 247` (`applyVignette`) | Right Panel effect item | Right Panel C > Effect item (params: radius, softness) | [ ] Pending |
| Stack Item Drag Handle (Reordering) | `main.js:526-545` (Up/Down buttons) | Right Panel Up/Down buttons | Right Panel C > Drag Handle on effect header | [ ] Pending |
| Stack Item Enable/Disable Toggle | `main.js:521-524` (`.chk-eff-enable`) | Right Panel checkbox | Right Panel C > Eye icon toggle button | [ ] Pending |
| Stack Item Collapse/Expand Accordion | *[NEW Ergonomic Addition]* | Always expanded | Right Panel C > Collapsed by default, accordion expand | [ ] Pending |
| Stack Item Delete Button | `main.js:547-552` (`.btn-eff-del`) | Right Panel `✕` button | Right Panel C > Trash/delete button on item header | [ ] Pending |

---

### 1.6 Video & Animation Suite

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| Animation Mode Toggle | `main.js:46-55` (`state.isPlaying`, `state.currentFrame`) | None (Always visible) | Bottom Control Strip > Still/Animation Switch & File > Animate Still | [ ] Pending |
| Collapsible Animation Timeline | `index.html:232` (`#timelineBar`) | Bottom screen bar | Bottom Timeline Strip (visible ONLY in Animation Mode) | [ ] Pending |
| Play / Pause Animation Button | `index.html:236` (`#btnTimelinePlayPause`) | Timeline bottom bar | Timeline Strip Transport Controls | [ ] Pending |
| Rewind to Frame 0 Button | `index.html:235` (`#btnTimelineRewind`) | Timeline bottom bar | Timeline Strip Transport Controls | [ ] Pending |
| Loop Playback Toggle Button | `index.html:237` (`#btnTimelineLoop`) | Timeline bottom bar | Timeline Strip Transport Controls | [ ] Pending |
| Frame Scrubber Slider (0 to 60) | `index.html:260` (`#timelineScrubber`) | Timeline bottom bar | Timeline Strip Scrubber Bar | [ ] Pending |
| Frame / Time Display readout | `index.html:238` (`#timelineFrameDisplay`) | Timeline bottom bar | Timeline Strip Status readout | [ ] Pending |
| FPS Selector Dropdown (12, 24, 30, 60) | `index.html:250-256` (`#fpsSelector`) | Timeline bottom bar | Timeline Strip Transport Controls | [ ] Pending |
| 9 CRT Temporal Noise Profiles: | `src/dither-engine/temporal.js:4-16` | | | |
| 1. Grain (Stochastic Per-Pixel) | `temporal.js:18-27` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 2. Static (Macroblock Snow) | `temporal.js:29-45` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 3. Scanline Drift | `temporal.js:47-62` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 4. Vertical Drift | `temporal.js:64-77` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 5. Pulse (Power Line Hum) | `temporal.js:79-88` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 6. Flicker (Phosphor Decay) | `temporal.js:90-100` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 7. Wave (Harmonic Warping) | `temporal.js:102-113` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 8. Shimmer (Phase Stipple) | `temporal.js:115-126` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 9. Chaos (Analog Composite) | `temporal.js:128-141` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| Temporal Noise Intensity & Speed | `main.js:50-51` (`state.temporalIntensity`) | Engine state | Timeline Strip > Noise Settings popover | [ ] Pending |
| "Animate Still" Converter | `index.html:245` (`#btnConvertStillToAnim`) | Timeline button | Bottom Strip button + File > Animate Still | [ ] Pending |
| Video File Import (MP4, WebM) | `index.html:229` (`#fileInputVideo`) | Top menu `Open Video` | File > Open (video file picker) or drag & drop | [ ] Pending |
| MP4 / WebM Recording Export | `index.html:396` (`#btnRecordVideo`) | Export Hub button | Timeline Record button & Export Dialog > MP4/WebM | [ ] Pending |
| PNG Frame Sequence Export | `index.html:399` (`#btnExportFrameSequence`) | Export Hub button | Export Dialog > Frame Sequence | [ ] Pending |

---

### 1.7 Viewport, Canvas & Update Modes

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| Central Interactive Canvas (>=60% view) | `index.html:215` (`#mainViewportCanvas`) | Center stage | Central Viewport Area (un-obscured) | [ ] Pending |
| Zoom In (+) / Zoom Out (-) | `index.html:200, 202` (`#btnZoomIn`, `#btnZoomOut`) | Viewport toolbar | Viewport toolbar & Shortcuts (+, -) | [ ] Pending |
| Zoom Level Indicator (%) | `index.html:201` (`#zoomLevelIndicator`) | Viewport toolbar | Bottom Info Bar (Status Text) | [ ] Pending |
| Fit to Window (0) | `index.html:203` (`#btnZoomFit`) | Viewport toolbar `⛶` button | Bottom Info Bar & Shortcut (0) | [ ] Pending |
| 100% Actual Size (1) | `index.html:204` (`#btnZoomActual`) | Viewport toolbar `1:1` button | Bottom Info Bar & Shortcut (1) | [ ] Pending |
| Mouse Wheel Zoom at Cursor | `main.js:779-787` | Viewport container event | Viewport container event | [ ] Pending |
| Plain Click-and-Drag Pan (Preserved) | `main.js:791-807` (`state.isPanning`) | Viewport container event | Direct left-click drag-to-pan on canvas | [ ] Pending |
| Space + Drag Pan | *[NEW Ergonomic Addition]* | None | Viewport container event (Space + drag) | [ ] Pending |
| Middle-Click Drag Pan | *[NEW Ergonomic Addition]* | None | Viewport container event (Middle-click drag) | [ ] Pending |
| Before / After Toggle (\) | `index.html:208` (`#btnToggleBeforeAfter`) | Viewport toolbar button | Bottom Strip `👁 Before/After` & Shortcut (\) | [ ] Pending |
| Draggable Split Comparison Slider | `index.html:217` (`#splitSliderLine`) | Viewport split slider line | Viewport interactive draggable divider | [ ] Pending |
| Drag-and-Drop Image/Video Import | `index.html:221` (`#dropzoneOverlay`) | Viewport dropzone overlay | Viewport drag-and-drop with clean non-intrusive drop indicator | [ ] Pending |
| Clean Empty State | `index.html:221-226` | Dropzone overlay | Viewport empty state card with Open button & Sample button | [ ] Pending |
| Load Sample Pattern Generator | `index.html:26` (`#btnSampleImage`) | Top bar `Load Sample` button | File > Load Sample Pattern & Empty State button | [ ] Pending |
| Fullscreen Toggle (F11, keeps menu accessible) | `index.html:211` (`#btnToggleFullscreen`) | Viewport toolbar button | Top bar right icon & Shortcut (F11) | [ ] Pending |
| Copy Result to Clipboard (Ctrl+C) | `index.html:210` (`#btnCopyClipboard`) | Viewport toolbar `📋` button | File > Copy to Clipboard & Bottom Strip icon & Shortcut (Ctrl+C) | [ ] Pending |
| **Current Top-Bar "Engine" Dropdown:** | `index.html:64-70` (`#perfModeSelector`) | | | |
| - Mode 1: `Full` (Continuous full-res) | `index.html:66` (`value="full"`) | Top menu Engine dropdown | Bottom Strip Segmented Switch `[ Precise ]` | [ ] Pending |
| - Mode 2: `Live` (Real-time proxy downscaled) | `index.html:67` (`value="live"`) | Top menu Engine dropdown | Bottom Strip Segmented Switch `[ Live ]` | [ ] Pending |
| - Mode 3: `Still` (Debounced on slider release) | `index.html:68` (`value="still"`) | Top menu Engine dropdown | Bottom Strip Segmented Switch `[ Settle ]` | [ ] Pending |
| Status Text: Image dimensions, Zoom %, Render ms | `main.js:571` | None | Bottom Strip Status Text (e.g., `1920×1080 • 100% • 14ms`) | [ ] Pending |

---

### 1.8 Top Menu Bar & Utilities

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| **File Menu:** | | | | |
| - Open Image / Video (Ctrl+O) | `index.html:20, 23` | Top menu buttons | Menu: File > Open... (Ctrl+O) | [ ] Pending |
| - Export... (Ctrl+E) | `index.html:77` (`#btnQuickExport`) | Top menu `Export` button | Menu: File > Export... (Ctrl+E) | [ ] Pending |
| - Copy to Clipboard (Ctrl+C) | `index.html:210` (`#btnCopyClipboard`) | Viewport button | Menu: File > Copy Result to Clipboard (Ctrl+C) | [ ] Pending |
| - Animate Still | `index.html:245` (`#btnConvertStillToAnim`) | Timeline button | Menu: File > Animate Still | [ ] Pending |
| - Load Sample Pattern | `index.html:26` (`#btnSampleImage`) | Top menu button | Menu: File > Load Sample Pattern | [ ] Pending |
| **Edit Menu:** | | | | |
| - Undo (Ctrl+Z) | *[NEW Ergonomic Addition]* | None | Menu: Edit > Undo (Ctrl+Z) | [ ] Pending |
| - Redo (Ctrl+Y / Ctrl+Shift+Z) | *[NEW Ergonomic Addition]* | None | Menu: Edit > Redo (Ctrl+Y) | [ ] Pending |
| - Reset All Adjustments & Parameters | *[NEW Ergonomic Addition]* | None (Per-section only) | Menu: Edit > Reset All | [ ] Pending |
| **Batch Menu:** | | | | |
| - Batch Processing Dialog | `index.html:29` (`#btnBatchModal`) | Top menu `Batch` button | Menu: Batch > Batch Process Images... | [ ] Pending |
| - Multi-Image Queue & Size Warning | `index.html:423-441` (`#modalBatchBackdrop`) | Batch modal | Batch Modal with resolution disclaimer & preset recommendation | [ ] Pending |
| **Adjustments Menu:** | | | | |
| - Randomize Unlocked Adjustments | `index.html:275` (`#btnShuffleTweaks`) | Right panel `🔀` button | Menu: Adjustments > Randomize Unlocked Adjustments | [ ] Pending |
| - Lock All / Unlock All | *[NEW Ergonomic Addition]* | None | Menu: Adjustments > Lock All / Unlock All | [ ] Pending |
| **Extras Menu:** | | | | |
| - 6 Theme Skins Selector (Dark Pro, CRT Green, Cyberpunk, GameBoy, Retro Mac, Vaporwave) | `index.html:52-60` (`#themeSelector`) | Top menu Theme dropdown | Menu: Extras > Themes > (Submenu with 6 skins) | [ ] Pending |
| - Palette Packs Import/Export | `index.html:190-194` | Left panel buttons | Menu: Extras > Palette Packs | [ ] Pending |
| - Preset Import / Export | `main.js:379-383` | Right panel buttons | Menu: Extras > Presets > Import/Export Preset JSON | [ ] Pending |
| **Help Menu:** | | | | |
| - Settings Dialog (Performance defaults, export defaults, purge temp folder) | `main.js:891` | Top bar `Engine` & License modal | Menu: Help > Settings (Preferences dialog) | [ ] Pending |
| - Purge Temp Cache Files | `index.html:460` (`#btnPurgeCache`) | License modal button | Help > Settings > Purge Temp Files | [ ] Pending |
| - Keyboard Shortcuts Reference | *[NEW Ergonomic Addition]* | None | Menu: Help > Keyboard Shortcuts Cheat Sheet | [ ] Pending |
| - Algorithm Reference Manual (2,438 lines) | `index.html:73, 407` (`#modalDocsBackdrop`) | Top menu `Reference Docs` | Menu: Help > Algorithm Reference Manual (dedicated modal/window) | [ ] Pending |
| - About & Clean-Room Attestation (with License Input preserved, no gating) | `index.html:443-470` (`#licenseKeyInput`) | Top menu `License` modal | Menu: Help > About DitherForge (Clean-Room Attestation & Key Input) | [ ] Pending |

---

### 1.9 Presets System (10 Built-In + User JSON)

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| 10 Built-in Presets (Mac 1984, GameBoy, Cyberpunk, C64, Amber CRT, VHS, Newsprint, Vaporwave, Nordic, PICO) | `src/ui/presets.js:4-162` (`BUILTIN_PRESETS`) | Top menu Preset dropdown | Top Menu Presets Dropdown & Extras > Presets | [ ] Pending |
| Save User Preset with Name | `index.html:346-349` (`#btnSavePreset`) | Right Panel Preset Manager | Presets dropdown > `+ Save Current as Preset...` | [ ] Pending |
| Rename / Delete User Presets | `presets.js:164-178` (`saveUserPresets`) | Storage only | Presets Manager dialog (Extras > Presets > Manage...) | [ ] Pending |
| Export Presets JSON | `presets.js:164-178` | LocalStorage | Extras > Presets > Export Presets JSON | [ ] Pending |
| Import Presets JSON | `index.html:230` (`#fileInputPreset`) | Hidden file input | Extras > Presets > Import Presets JSON | [ ] Pending |

---

### 1.10 Itemized Per-Format Export Options

| Format | Source (File & Function / Line) | Specific Options in Code & UI | Status |
|---|---|---|---|
| PNG | `exporters.js:4-11` (`exportRaster`) | Lossless 24-bit/32-bit RGBA raster buffer | [ ] Pending |
| JPG | `exporters.js:4-11` (`exportRaster`) | `quality: float` (0.0 to 1.0, default 0.92) | [ ] Pending |
| WebP | `exporters.js:4-11` (`exportRaster`) | `quality: float` (0.0 to 1.0, default 0.92) | [ ] Pending |
| SVG Vector Contours | `exporters.js:110-157` (`exportSvgContours`) | Grouped `<rect>` span run-length contours, `<g shape-rendering="crispEdges">`, fill color option (palette fill vs solid black vector) | [ ] Pending |
| TXT ASCII Character Grid | `exporters.js:32-107` (`exportCharacterGrid`) | Character ramp: ` .:-=+*#%@`, `cellWidth: int` (default 6), `cellHeight: int` (default 12) | [ ] Pending |
| TXT Unicode Blocks Grid | `exporters.js:32-107` (`exportCharacterGrid`) | Character ramp: ` ░▒▓█`, `cellWidth: int` (default 6), `cellHeight: int` (default 12) | [ ] Pending |
| TXT Unicode Braille Matrix | `exporters.js:32-107` (`exportCharacterGrid`) | 2×4 dot sub-grid bitmask mapping to Unicode Braille codepoints `U+2800..U+28FF` | [ ] Pending |
| MP4 / WebM Video Stream | `exporters.js:160-205` (`VideoRecorder`) | Codec negotiation (`video/webm;codecs=vp9`, `vp8`, `mp4`), frame rate selection (12, 24, 30, 60 fps) | [ ] Pending |
| Animated GIF | `main.js:847` | Multi-frame capture loop with palette quantization | [ ] Pending |
| PNG Frame Sequence | `index.html:399` (`#btnExportFrameSequence`) | Sequential numbered frame image export (`frame_0001.png`, etc.) | [ ] Pending |
| System Clipboard Copy | `exporters.js:13-29` (`copyCanvasToClipboard`) | Direct binary PNG blob write to `navigator.clipboard` | [ ] Pending |
| Export Resolution Multiplier (1x, 2x, 4x) | *[NEW Ergonomic Addition]* | Scale multiplier option in Export Dialog | [ ] Pending |
| Last Export Settings Memory | *[NEW Ergonomic Addition]* | Preserves format and parameters in localStorage | [ ] Pending |

---

### 1.11 Keyboard Shortcuts Reference

| Shortcut | Action | Scope / Context | Status |
|---|---|---|---|
| `Ctrl + O` | Open image or video file | Global | [ ] Pending |
| `Ctrl + E` | Open Export dialog | Global | [ ] Pending |
| `Ctrl + C` | Copy dithered result to clipboard | Global | [ ] Pending |
| `Ctrl + Z` | Undo last parameter/effect adjustment | Global | [ ] Pending |
| `Ctrl + Y` / `Ctrl+Shift+Z` | Redo adjustment | Global | [ ] Pending |
| `\` (Backslash) | Toggle Before / After view | Viewport | [ ] Pending |
| `0` | Zoom: Fit image to viewport | Viewport | [ ] Pending |
| `1` | Zoom: 100% Actual Size | Viewport | [ ] Pending |
| `+` / `-` | Zoom In / Zoom Out | Viewport | [ ] Pending |
| `Space + Drag` | Pan viewport canvas | Viewport | [ ] Pending |
| `Left-Click Drag` | Plain pan canvas (Preserved) | Viewport background | [ ] Pending |
| `Middle-Click Drag` | Pan canvas | Viewport | [ ] Pending |
| `F11` | Toggle Fullscreen (menu bar remains accessible) | Global | [ ] Pending |
| `Up / Down` | Step through previous/next algorithm (fires only when no input focused) | Global | [ ] Pending |

---

## 2. Evidence & Automated Audit Verification

To guarantee zero feature drift and provide an auditable source of truth, `scripts/inventory-check.mjs` dynamically imports the real production engine registries.

### Automated Run Output (`npm run inventory:check` / `scripts/inventory-check.cmd`):
```text
=================================================
       DITHERFORGE INVENTORY AUDIT CHECK         
=================================================

[1] ALGORITHMS COUNT: 63 / 63
    - Category 'error_diffusion': 15 algorithms
    - Category 'ordered': 5 algorithms
    - Category 'pattern': 8 algorithms
    - Category 'glitch': 17 algorithms
    - Category 'special': 16 algorithms
    - Category 'bespoke': 2 algorithms

[2] ALGORITHM CATEGORIES: 6
    - [error_diffusion] Error Diffusion (15)
    - [ordered] Ordered Dithering (5)
    - [pattern] Pattern Dithers (8)
    - [glitch] Glitch Effects (17)
    - [special] Special & Stochastic (16)
    - [bespoke] Bespoke & Temporal (2)

[3] BUILT-IN PALETTES: 14 / 14
     1. [monochrome_1bit] Monochrome 1-Bit (2 colors)
     2. [gameboy_emerald] GameBoy Emerald (4 colors)
     3. [phosphor_amber] Phosphor Amber CRT (4 colors)
     4. [cyberpunk_2084] Cyberpunk 2084 (5 colors)
     5. [cga_mode_1] CGA Mode 1 (Cyan/Magenta) (4 colors)
     6. [c64_heritage] C64 Heritage (16 colors)
     7. [pico_fantasy] PICO Fantasy 16 (16 colors)
     8. [nordic_frost] Nordic Frost (5 colors)
     9. [vaporwave_neon] Vaporwave Neon (5 colors)
    10. [solar_flare] Solar Flare (5 colors)
    11. [ega_royal_16] EGA Royal 16 (16 colors)
    12. [sepia_daguerreotype] Sepia Daguerreotype (5 colors)
    13. [sinclair_spectrum] Sinclair Spectrum (8 colors)
    14. [mac_classic_1984] Macintosh 1984 Classic (2 colors)

[4] PALETTE EXTRACTORS: 3 / 3
    - Median Cut (Defined: true)
    - K-Means (Defined: true)
    - Octree (Defined: true)

[5] POST-EFFECTS STACK TYPES: 9 / 9
    1. [glow] Ignition Glow -> params: { radius, intensity }
    2. [blur_sharpen] Blur / Sharpen -> params: { amount }
    3. [chromatic_aberration] Chromatic Aberration -> params: { offsetX, offsetY }
    4. [jpeg_artifacts] JPEG Artifacts -> params: { quality }
    5. [halftone] CMYK Halftone -> params: { dotSize, angle, shape }
    6. [scanlines] CRT Scanlines -> params: { thickness, intensity }
    7. [pixelate] Pixelate -> params: { blockSize }
    8. [curves_levels] Curves & Levels -> params: { blackPoint, whitePoint, gamma }
    9. [vignette] Vignette Falloff -> params: { radius, softness }

[6] BUILT-IN PRESETS: 10 / 10
     1. [mac_1984] Apple Macintosh 1984 (Algorithm: atkinson)
     2. [gameboy_classic] GameBoy Pocket Emerald (Algorithm: bayer_4x4)
     3. [cyberpunk_terminal] Cyberpunk 2084 Neon Grid (Algorithm: ignition_glow)
     4. [c64_nostalgia] Commodore 64 Arcade (Algorithm: floyd_steinberg)
     5. [amber_crt_monitor] Phosphor Amber Terminal (Algorithm: bayer_8x8)
     6. [vhs_tape_decay] VHS Magnetic Glitch Tape (Algorithm: vhs_tracking)
     7. [newsprint_halftone] CMYK Newspaper Broadside (Algorithm: clustered_dot)
     8. [vaporwave_sunset] Vaporwave Neon Mall (Algorithm: blue_noise)
     9. [nordic_deep_frost] Nordic Glacial Frost (Algorithm: jarvis_judice_ninke)
    10. [pico_pixel_fantasy] PICO Fantasy RPG Sprite (Algorithm: bayer_2x2)

[7] TEMPORAL CRT NOISE PATTERNS: 9 / 9
    1. [grain] 1. Grain (Stochastic Per-Pixel)
    2. [static] 2. Static (Macroblock Snow)
    3. [scanline_drift] 3. Scanline Drift
    4. [vertical_drift] 4. Vertical Drift
    5. [pulse] 5. Pulse (Power Line Hum)
    6. [flicker] 6. Flicker (Phosphor Decay)
    7. [wave] 7. Wave (Harmonic Warping)
    8. [shimmer] 8. Shimmer (Phase Stipple)
    9. [chaos] 9. Chaos (Analog Composite)

[8] EXPORT FORMATS: 11
     1. PNG (Raster Lossless) -> None (lossless raster buffer)
     2. JPG (Raster Compressed) -> quality: float (0.0 - 1.0, default 0.92)
     3. WebP (Modern Compressed) -> quality: float (0.0 - 1.0, default 0.92)
     4. SVG (Vector Contours) -> Grouped <rect> span run-length contours, fill=palette/black
     5. TXT ASCII Grid -> ramp: ' .:-=+*#%@', cellWidth: 6, cellHeight: 12
     6. TXT Unicode Blocks Grid -> ramp: ' ░▒▓█', cellWidth: 6, cellHeight: 12
     7. TXT Braille 2x4 Matrix -> Unicode U+2800..U+28FF bitmask mapping (2x4 dots)
     8. MP4 / WebM Video Stream -> MediaRecorder vp9/vp8/mp4, fps: 12/24/30/60
     9. GIF Animated Sequence -> Frame capture loop
    10. PNG Frame Sequence -> Snapshot / sequential PNG export
    11. System Clipboard PNG -> Direct PNG Blob to navigator.clipboard

[9] THEMES: 6 / 6
    - [dark_pro] Dark Pro
    - [crt_green] CRT Phosphor Green
    - [cyberpunk_neon] Cyberpunk Neon
    - [gameboy_olive] GameBoy Olive
    - [retro_mac] Retro Mac 1984
    - [vaporwave_pink] Vaporwave Pink

[10] UPDATE MODES (CURRENT -> NEW): 3 / 3
    - Current: 'Full' -> New: 'Precise' (Always full resolution re-render)
    - Current: 'Live' -> New: 'Live' (Continuous proxy resolution while dragging)
    - Current: 'Still' -> New: 'Settle' (Debounced; render only after slider release)

=================================================
       INVENTORY AUDIT VERIFICATION PASS        
=================================================
```

---

## 3. Secondary Location Decisions (Rule #1 Gating Analysis)

1. **License Modal & Registration:**
   - *Confirmation:* The license registration input (`#licenseKeyInput`) and validation button (`#btnValidateLicense`) from `index.html:452-458` are preserved in **`Help > About DitherForge`**. There is **no gating or paywall** applied to any tool or export format.
2. **Purge Temp Buffers:**
   - Preserved in **`Help > Settings > Storage > Purge Temp Files`**.
3. **Batch Processing Queue:**
   - Preserved in **`Batch > Batch Process Images...`** dialog with resolution disclaimers and multi-file queue.
4. **Algorithm Reference Manual (2,438 lines):**
   - Preserved in **`Help > Algorithm Reference Manual`** dialog.

---

## 4. Phase 1, Step 0 Golden Image Plan (Pre-UI Mandate)

Before writing any Phase 1 UI code:
1. Construct `tests/golden/run-golden-tests.mjs`.
2. Generate golden MD5/SHA256 pixel checksums for **all 63 algorithms** using a fixed deterministic $320 \times 240$ synthetic test image and standard default parameters.
3. For stochastic/noise algorithms (`random_threshold`, `gaussian_noise`, `tpdf_noise`, `quantum_stipple`, `static_snow`, `bad_ram`, `vhs_tracking`), stub `Math.random` with a linear congruential seeded PRNG inside the test runner only (production behavior unchanged).
4. Save and commit golden checksums to `tests/golden/golden-hashes.json`.
5. Ensure golden tests pass bit-identically across every phase.

---

*End of FEATURE_INVENTORY.md v2. Ready for user approval.*

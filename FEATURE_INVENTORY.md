# DitherForge — Master Feature Inventory & UI/UX Rebuild Safety Net (v3)

**Project:** DitherForge (Tauri 2 + React + TypeScript + Vite)  
**Document Version:** 3.0.0 (AUDITED AGAINST CODE REGISTRIES & SOURCE FILES)  
**Strict Mandate:** Rule #1 — NO FEATURE REMOVAL. Every control, parameter, option, theme, algorithm, effect, and export format is preserved and verified against the existing codebase.  
**Performance Baseline:** Intel Core i3-3240T, Intel HD 2500 graphics, 8 GB RAM, WebKitGTK. No `backdrop-filter`, no text/box-shadow glow animations, static token-based themes only.  
**Engine Freeze:** `src/dither-engine/*.js` and `src/ui/presets.js` are frozen with recorded SHA-256 hashes (`npm run engine:verify`). Output must remain bit-identical across all rebuild phases (`npm run test:golden`).

---

## 1. Feature Inventory & Location Mapping

### 1.1 Dithering Algorithms (63 Total)
*Directly generated from `ALGORITHM_REGISTRY` in `src/dither-engine/algorithms.js`. All 63 algorithms remain bit-identical. Mapped to Right Panel A: Searchable categorized dropdown with interactive category filter chips, Prev/Next stepping, favorites, and progressive parameter disclosure.*

| # | ID | Algorithm Name (Canonical in Code) | Category | Source (File & Line) | Current Location | New Location | Status |
|---|---|---|---|---|---|---|---|
| 1 | `floyd_steinberg` | Floyd–Steinberg | Error Diffusion | `src/dither-engine/algorithms.js:17` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 2 | `atkinson` | Atkinson | Error Diffusion | `src/dither-engine/algorithms.js:18` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 3 | `jarvis_judice_ninke` | Jarvis–Judice–Ninke | Error Diffusion | `src/dither-engine/algorithms.js:19` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 4 | `stucki` | Stucki | Error Diffusion | `src/dither-engine/algorithms.js:20` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 5 | `burkes` | Burkes | Error Diffusion | `src/dither-engine/algorithms.js:21` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 6 | `sierra_3` | Sierra Three-Row | Error Diffusion | `src/dither-engine/algorithms.js:22` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 7 | `sierra_2` | Sierra Two-Row | Error Diffusion | `src/dither-engine/algorithms.js:23` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 8 | `sierra_lite` | Sierra Lite | Error Diffusion | `src/dither-engine/algorithms.js:24` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 9 | `stevenson_arce` | Stevenson–Arce | Error Diffusion | `src/dither-engine/algorithms.js:25` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 10 | `fan` | Fan Adaptive | Error Diffusion | `src/dither-engine/algorithms.js:26` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 11 | `shiau_fan` | Shiau–Fan Balanced | Error Diffusion | `src/dither-engine/algorithms.js:27` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 12 | `shiau_fan_2` | Shiau–Fan 2 (Narrow) | Error Diffusion | `src/dither-engine/algorithms.js:28` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 13 | `false_floyd_steinberg` | False Floyd–Steinberg | Error Diffusion | `src/dither-engine/algorithms.js:29` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 14 | `minimized_avg_error` | Minimized Average Error | Error Diffusion | `src/dither-engine/algorithms.js:30` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 15 | `dynamic_serpentine` | Dynamic Serpentine Lattice | Error Diffusion | `src/dither-engine/algorithms.js:31` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Error Diffusion | [ ] Pending |
| 16 | `bayer_2x2` | Bayer 2×2 | Ordered | `src/dither-engine/algorithms.js:34` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 17 | `bayer_4x4` | Bayer 4×4 | Ordered | `src/dither-engine/algorithms.js:35` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 18 | `bayer_8x8` | Bayer 8×8 | Ordered | `src/dither-engine/algorithms.js:36` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 19 | `bayer_16x16` | Bayer 16×16 | Ordered | `src/dither-engine/algorithms.js:37` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 20 | `clustered_dot` | Clustered Dot Screen | Ordered | `src/dither-engine/algorithms.js:38` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 21 | `checkered` | Checkered Micro-Grid | Pattern | `src/dither-engine/algorithms.js:41` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 22 | `horizontal_lines` | Horizontal Linear Grating | Pattern | `src/dither-engine/algorithms.js:42` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 23 | `vertical_lines` | Vertical Linear Grating | Pattern | `src/dither-engine/algorithms.js:43` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 24 | `crosshatch` | Interlocking Crosshatch | Pattern | `src/dither-engine/algorithms.js:44` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 25 | `diagonal_hatch` | Diagonal 45° Hatch | Pattern | `src/dither-engine/algorithms.js:45` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 26 | `concentric_diamond` | Concentric Diamond Grid | Pattern | `src/dither-engine/algorithms.js:46` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 27 | `woven_basket` | Woven Basket Tile | Pattern | `src/dither-engine/algorithms.js:47` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 28 | `hex_stipple` | Hexagonal Stochastic Stipple | Pattern | `src/dither-engine/algorithms.js:48` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 29 | `scanline_jitter` | Scanline Jitter | Glitch | `src/dither-engine/algorithms.js:51` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 30 | `chromatic_offset` | Color Channel Offset | Glitch | `src/dither-engine/algorithms.js:52` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 31 | `pixel_sorting` | Directional Pixel Sorting | Glitch | `src/dither-engine/algorithms.js:53` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 32 | `digital_artifacts` | Digital Compression Artifacts | Glitch | `src/dither-engine/algorithms.js:54` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 33 | `interlacing_tear` | Interlacing Field Tear | Glitch | `src/dither-engine/algorithms.js:55` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 34 | `crt_bloom` | CRT Phosphor Bloom | Glitch | `src/dither-engine/algorithms.js:56` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 35 | `bit_crush` | Bit-Depth Crush Quantizer | Glitch | `src/dither-engine/algorithms.js:57` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 36 | `vhs_tracking` | VHS Tracking Noise | Glitch | `src/dither-engine/algorithms.js:58` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 37 | `bad_ram` | Bad RAM Nibble Inversion | Glitch | `src/dither-engine/algorithms.js:59` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 38 | `wave_distortion` | Sinusoidal Wave Warp | Glitch | `src/dither-engine/algorithms.js:60` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 39 | `quant_slice` | Quantization Step Slicing | Glitch | `src/dither-engine/algorithms.js:61` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 40 | `matrix_rake` | Diagonal Matrix Rake | Glitch | `src/dither-engine/algorithms.js:62` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 41 | `static_snow` | Analog Static Snow | Glitch | `src/dither-engine/algorithms.js:63` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 42 | `sync_pulse_loss` | Sync Pulse Hold Collapse | Glitch | `src/dither-engine/algorithms.js:64` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 43 | `feedback_ringing` | Edge Ringing & Feedback | Glitch | `src/dither-engine/algorithms.js:65` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 44 | `chroma_subsample` | YUV 4:1:1 Degradation | Glitch | `src/dither-engine/algorithms.js:66` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 45 | `moire_glitch` | Moiré Interference Glitch | Glitch | `src/dither-engine/algorithms.js:67` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 46 | `fixed_threshold` | Fixed Bi-Level Cutoff | Special | `src/dither-engine/algorithms.js:70` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 47 | `random_threshold` | Uniform White Noise Dither | Special | `src/dither-engine/algorithms.js:71` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 48 | `blue_noise` | Void-and-Cluster Blue Noise | Special | `src/dither-engine/algorithms.js:72` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 49 | `gaussian_noise` | Gaussian Normal Distribution | Special | `src/dither-engine/algorithms.js:73` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 50 | `perlin_gradient` | Perlin Gradient Lattice | Special | `src/dither-engine/algorithms.js:74` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 51 | `riemersma` | Riemersma Hilbert Space-Curve | Special | `src/dither-engine/algorithms.js:75` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 52 | `ostromoukhov` | Ostromoukhov Variable Diffusion | Special | `src/dither-engine/algorithms.js:76` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 53 | `tpdf_noise` | Triangular PDF Noise (TPDF) | Special | `src/dither-engine/algorithms.js:77` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 54 | `companding_curve` | Dynamic Companding (A-Law) | Special | `src/dither-engine/algorithms.js:78` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 55 | `spatial_lattice` | Hexagonal Spatial Lattice | Special | `src/dither-engine/algorithms.js:79` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 56 | `sobel_feature` | Sobel Silhouette Preserving | Special | `src/dither-engine/algorithms.js:80` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 57 | `laplacian_mod` | Laplacian Frequency Modulated | Special | `src/dither-engine/algorithms.js:81` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 58 | `directional_gradient` | Directional Gradient Angle | Special | `src/dither-engine/algorithms.js:82` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 59 | `voronoi_cellular` | Voronoi Cellular Stipple | Special | `src/dither-engine/algorithms.js:83` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 60 | `diffusion_blur` | Unsharp Diffusion Quantizer | Special | `src/dither-engine/algorithms.js:84` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 61 | `quantum_stipple` | Quantum Probability Cloud | Special | `src/dither-engine/algorithms.js:85` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 62 | `ignition_glow` | Ignition Glow (Bespoke Dither Bloom) | Bespoke | `src/dither-engine/algorithms.js:88` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Bespoke | [ ] Pending |
| 63 | `temporal_kinetic` | Temporal Kinetic Dither | Bespoke | `src/dither-engine/algorithms.js:89` | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Bespoke | [ ] Pending |

---

### 1.2 Algorithm Parameters & Navigation Controls

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| Search Input for Algorithms | `index.html:86` (`#algoSearchInput`) | Left Panel top input | Right Panel A > Algorithm search box inside dropdown | [x] Implemented |
| Category Filter Chips (`All`, `Diffusion`, `Ordered`, `Pattern`, `Glitch`, `Special`, `Bespoke`) | `index.html:89-97` (`#algoCategoryPills`) | Left Panel category pill buttons | Right Panel A > Interactive category filter chips in picker header | [x] Implemented |
| Favourites / Pinned Algorithms Row | *[NEW Ergonomic Addition]* | None | Right Panel A > Top row of Algorithm Dropdown (`★ Favorites`) | [x] Implemented |
| Algorithm Stepping (Prev/Next buttons) | `main.js:168-180` | None (Keyboard only) | Right Panel A > `<` and `>` icon buttons next to dropdown | [x] Implemented |
| Up/Down Arrow Stepping (fires only when no input/slider/select focused) | `main.js:168-180` | Window keydown handler | Window keydown handler (checks `!isInputActive()`) | [x] Implemented |
| Threshold Pivot Slider & Number Input | `index.html:112-117` (`#sliderThreshold`) | Left Panel card | Right Panel A > Algorithm Parameters section | [x] Implemented |
| Diffusion Strength Slider & Number Input | `index.html:120-125` (`#sliderDiffusionStrength`) | Left Panel card | Right Panel A > Algorithm Parameters section | [x] Implemented |
| Pattern Scale Slider & Number Input | `index.html:128-133` (`#sliderScale`) | Left Panel card | Right Panel A > Algorithm Parameters section | [x] Implemented |
| Serpentine Scanning Toggle Checkbox | `index.html:136-139` (`#checkSerpentine`) | Left Panel card | Right Panel A > Algorithm Parameters section | [x] Implemented |
| Noise Amount Slider & Number Input | `main.js:52`, `algorithms.js:463` | Engine state | Right Panel A > Parameters section (visible for noise/glitch algorithms) | [x] Implemented |
| Section Reset Button (Algorithm Parameters) | `index.html:107` (`#btnResetAlgoParams`) | Left Panel `↺` button | Right Panel A > Section header `Reset` button | [x] Implemented |
| Global Edit > Reset All | `main.js:485-504` | Top bar implicit | Top Menu Bar > `Edit > Reset All` | [x] Implemented |
| Per-Slider Double-Click to Reset | *[NEW Ergonomic Addition]* | None | Double-click any slider thumb resets to default | [x] Implemented |
| One-line Parameter Tooltips | *[NEW Ergonomic Addition]* | None | Hover tooltip on each parameter & slider label | [x] Implemented |

---

### 1.3 Image Adjustments & Tweaks

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| Brightness Slider & Number Input | `index.html:343-348` (`#sliderBrightness`) | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Contrast Slider & Number Input | `index.html:350-355` (`#sliderContrast`) | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Saturation Slider & Number Input | `index.html:357-362` (`#sliderSaturation`) | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Gamma Slider & Number Input | `index.html:364-373` (`#sliderGamma`) | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Lock Brightness Checkbox / Toggle | `index.html:345` (`#lockBrightness`) | Right Panel checkbox | Right Panel A > Lock icon button next to Brightness | [ ] Pending |
| Lock Contrast Checkbox / Toggle | `index.html:351` (`#lockContrast`) | Right Panel checkbox | Right Panel A > Lock icon button next to Contrast | [ ] Pending |
| Lock Saturation Checkbox / Toggle | `index.html:357` (`#lockSaturation`) | Right Panel checkbox | Right Panel A > Lock icon button next to Saturation | [ ] Pending |
| Lock Gamma Checkbox / Toggle | `index.html:368` (`#lockGamma`) | Right Panel checkbox | Right Panel A > Lock icon button next to Gamma | [ ] Pending |
| Section Reset Button (Adjustments) | *[NEW Ergonomic Addition]* | None | Right Panel A > Adjustments header `↺ Reset Adjustments` button | [ ] Pending |
| Global Randomize / Shuffle Tweaks | `index.html:337` (`#btnShuffleTweaks`) | Right Panel `🔀` button | Right Panel A > Adjustments header `🔀 Randomize` button | [ ] Pending |
| Color Depth Slider & Number Input (Bit Crush) | index.html:178 | Right Panel > Tweaks | Right Panel A > Adjustments section | Active; only affects bit_crush; slider conditionally visible. |

---

### 1.4 Color & Palette System

| Feature | Source (File & Function / Line) | Current Location | New Location | Phase 1 State | Status |
|---|---|---|---|---|---|
| 14 Built-in Palettes (Monochrome, GameBoy, Amber CRT, Cyberpunk, CGA, C64, PICO, Nordic, Vaporwave, Solar, EGA, Sepia, Spectrum, Mac 1984) | `src/dither-engine/palettes.js:4-200` | Left Panel > Palettes dropdown | Right Panel B > Palette Dropdown (categorized) | Active in dropdown (lookup by ID) | [x] Implemented |
| Live Palette Preview on Hover + Mouse Wheel | *[NEW Ergonomic Addition]* | Dropdown change only | Right Panel B > Palette Dropdown hover/wheel live preview | Unimplemented; targets Phase 4 | [ ] Pending |
| Median Cut Palette Extraction ("From Image") | `palettes.js:239` (`extractPaletteMedianCut`) | Left Panel button | Right Panel B > "From Image" > Median Cut | Active; extracts 8 colors into workingPalette | [x] Implemented |
| K-Means Clustering Extraction ("From Image") | `palettes.js:319` (`extractPaletteKMeans`) | Left Panel button | Right Panel B > "From Image" > K-Means | Active; extracts 8 colors into workingPalette | [x] Implemented |
| Swatch Strip Preview | `index.html:151` (`#palettePreviewStrip`) | Left Panel swatch strip | Right Panel B > Swatch Strip (interactive) | Active; 32x32 interactive swatches | [x] Implemented |
| Live Swatch Click-to-Edit & Remap | `main.js:284-300` | Left Panel native color picker | Right Panel B > Click swatch opens color editor; live remap | Active; live remap on color change | [x] Implemented |
| Per-Swatch Lock Toggle | `main.js:302-309` (`state.lockedSwatches`) | Left Panel lock button | Right Panel B > Swatch strip lock icon per color | Active; lock badge & toggle in popover | [x] Implemented |
| Palette Shuffle (Unlocked Swatches) | `index.html:170` (`#btnShufflePalette`) | Left Panel button | Right Panel B > Palette Shuffle button | Active; randomizes unlocked swatch RGB | [x] Implemented |
| Depth Iterations Slider (1 to 32) | `index.html:178` (`#sliderPaletteDepth`) | Left Panel Depth slider | Right Panel B > Depth Slider (up to 32 iterations) | Active; 2 to min(32, length) with live preview | [x] Implemented |
| Add Swatch Color Button | `index.html:187` (`#btnAddColorSwatch`) | Left Panel `+ Add Color` | Right Panel B > Swatch strip `+` button | Active; appends mid-grey swatch up to 32 | [x] Implemented |
| Delete Swatch Color Button | `main.js:312-321` (`.btn-del-swatch`) | Left Panel button | Right Panel B > Swatch popover delete button | Active; deletes swatch when length > 2 | [x] Implemented |
| Export Palette JSON | `index.html:190` (`#btnExportPaletteJson`) | Left Panel button | Right Panel B > Overflow menu `...` > Export Palette JSON | Active; downloads { name, colors } JSON | [x] Implemented |
| Import Palette JSON | `index.html:193` (`#btnImportPaletteJson`) | Left Panel button | Right Panel B > Overflow menu `...` > Import Palette JSON | Active; imports validated JSON palette | [x] Implemented |
| Working Palette Separation | *[NEW Architectural Addition]* | Stored preset mutation | State: separate workingPalette from presets | Decouples editing from built-in presets | [x] Implemented |
| Depth-Aware Effective Palette | *[NEW Architectural Addition]* | Fixed array length | Derived: workingPalette.slice(0, paletteDepth) | Live slicing passed to dither engine | [x] Implemented |

#### Proposed Additions (Not in Current Engine):
- *Octree Quantization Extraction:* Proposed addition for future phase; not in audited codebase today.
- *"Complete" Palette Option:* Proposed addition to fill missing gamut colors; not in audited codebase today.

---

### 1.5 Stackable Reorderable Post-Effects Stack (9 Effects)

| Feature | Source (File & Function / Line) | Exact Parameter List in Code | Current Location | New Location | Status |
|---|---|---|---|---|---|
| Effect Stack Reordering (Up/Down / Drag) | `main.js:660-678` | Array item swap | Right Panel card | Right Panel C > Drag handle + Reorder | [x] Implemented |
| Eye / Checkbox Enable Toggle | `main.js:655-658` | `enabled: boolean` | Right Panel card | Right Panel C > Enable square toggle | [x] Implemented |
| Effects Stack Container | *[Ergonomic Redesign]* | Collapsible dropdown with inline expanded panel | Right Panel card list | Right Panel C > Collapsible Dropdown (.effects-dropdown) | [x] Implemented |
| 1. Ignition Glow | `effect-stack.js:52-84` | `radius: 1-20`, `intensity: 0-1` | Right Panel `+ Add` | Right Panel C > Stack card & Add Popover | [x] Implemented |
| 2. Blur / Sharpen | `effect-stack.js:86-131` | `amount: -1 to 1` | Right Panel `+ Add` | Right Panel C > Stack card & Add Popover | [x] Implemented |
| 3. Chromatic Aberration | `effect-stack.js:133-162` | `offsetX: 0-20`, `offsetY: 0-20` | Right Panel `+ Add` | Right Panel C > Stack card & Add Popover | [x] Implemented |
| 4. JPEG Compression Artifacts | `effect-stack.js:164-188` | `quality: 0-1` | Right Panel `+ Add` | Right Panel C > Stack card & Add Popover | [x] Implemented |
| 5. CMYK Halftone Screen | `effect-stack.js:190-221` | `dotSize: 1-20`, `angle: 0-360`, `shape: circle/diamond` | Right Panel `+ Add` | Right Panel C > Stack card & Add Popover | [x] Implemented |
| 6. CRT Scanlines | `effect-stack.js:223-239` | `thickness: 1-20`, `intensity: 0-1` | Right Panel `+ Add` | Right Panel C > Stack card & Add Popover | [x] Implemented |
| 7. Pixelate | `effect-stack.js:241-267` | `blockSize: 1-20` | Right Panel `+ Add` | Right Panel C > Stack card & Add Popover | [x] Implemented |
| 8. Curves & Levels | `effect-stack.js:269-289` | `blackPoint: 0-1`, `whitePoint: 0-1`, `gamma: 0.1-3.0` | Right Panel `+ Add` | Right Panel C > Stack card & Add Popover | [x] Implemented |
| 9. Vignette Falloff | `effect-stack.js:291-314` | `radius: 0-1`, `softness: 0-1` | Right Panel `+ Add` | Right Panel C > Stack card & Add Popover | [x] Implemented |

---

| + Add Effect Dropdown / Popover | *[NEW Architectural Addition]* | Dynamic stack manipulation | Right Panel > `+ Add Effect` popover | [Removed by user request — Phase 5 cleanup; toggling in the expanded dropdown replaces the add flow] | [x] Implemented |
| Single-Instance-Expanded Accordion | *[NEW Ergonomic Addition]* | None | Right Panel > Effect rows | Accordion disclosure; single active expanded row | [x] Implemented |
| Effects dropdown collapsed/expanded state persisted in localStorage under 'ditherforge_effects_open' | *[NEW Ergonomic Addition]* | LocalStorage state | Right Panel > Effects dropdown | Default closed; persisted state | [x] Implemented |
### 1.6 Animation & Temporal CRT Noise System

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| Play / Pause Toggle | `index.html:208` (`#btnTimelinePlayPause`) | Timeline bar | Bottom Strip > Animation Bar (conditional) | [ ] Pending |
| Rewind to Frame 0 | `index.html:205` (`#btnTimelineRewind`) | Timeline bar | Bottom Strip > Animation Bar (conditional) | [ ] Pending |
| Loop Playback Toggle | `index.html:211` (`#btnTimelineLoop`) | Timeline bar | Bottom Strip > Animation Bar (conditional) | [ ] Pending |
| Frame Scrubber Slider & Counter | `index.html:214-219` (`#timelineScrubber`) | Timeline bar | Bottom Strip > Animation Bar (conditional) | [ ] Pending |
| FPS Selector (12, 24, 30, 60 fps) | `index.html:221-228` (`#fpsSelector`) | Timeline bar | Bottom Strip > Animation Bar (conditional) | [ ] Pending |
| 1. Grain (Stochastic Per-Pixel) | `temporal.js:19-29` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 2. Static (Macroblock Snow) | `temporal.js:31-48` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 3. Scanline Drift | `temporal.js:50-62` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 4. Vertical Drift | `temporal.js:64-77` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 5. Pulse (Power Line Hum) | `temporal.js:79-88` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 6. Flicker (Phosphor Decay) | `temporal.js:90-100` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 7. Wave (Harmonic Warping) | `temporal.js:102-113` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 8. Shimmer (Phase Stipple) | `temporal.js:115-126` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| 9. Chaos (Analog Composite) | `temporal.js:128-141` | Timeline pattern select | Timeline Strip > Noise Profile selector | [ ] Pending |
| Temporal Noise Intensity & Speed | `main.js:50-51` (`state.temporalIntensity`) | Engine state | Timeline Strip > Noise Settings popover | [ ] Pending |
| "Animate Still" Converter | `index.html:245` (`#btnConvertStillToAnim`) | Timeline button | Bottom Strip button + File > Animate Still | [ ] Pending |
| Video File Import (MP4, WebM) | `index.html:229` (`#fileInputVideo`) | Top menu `Open Video` | File > Open (video file picker) or drag & drop | [ ] Pending |
| MP4 / WebM Recording Export | `index.html:472` (`#btnRecordVideo`) | Export Hub button | Timeline Record button & Export Dialog > MP4/WebM | [ ] Pending |
| PNG Frame Sequence Snapshot | `index.html:475` (`#btnExportFrameSequence`), `main.js:1139-1142` | Export Hub button | Export Dialog > Frame Sequence | [ ] Pending |

---

### 1.7 Viewport, Canvas & Navigation Controls

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| Main Canvas Surface | `index.html:268` (`#ditherCanvas`) | Center stage | Center Viewport (occupies $\ge 60\%$ width) | [ ] Pending |
| Plain Left-Click Drag-to-Pan (Direct Canvas Pan) | `main.js:979-997` | Viewport container mousedown | Viewport canvas / surface direct drag-to-pan (PRESERVED) | [ ] Pending |
| Space + Left-Click Drag Pan | *[NEW Ergonomic Addition]* | None | Viewport canvas (Standard pro desktop shortcut) | [ ] Pending |
| Middle-Click Drag Pan | *[NEW Ergonomic Addition]* | None | Viewport canvas | [ ] Pending |
| Mouse Wheel Zoom (Focal Point Centered) | `main.js:970-977` | Viewport container | Viewport canvas | [ ] Pending |
| Zoom In Button (`+`) | `index.html:314` (`#btnZoomIn`) | Viewport floating bar | Viewport floating controls bottom-right | [ ] Pending |
| Zoom Out Button (`-`) | `index.html:317` (`#btnZoomOut`) | Viewport floating bar | Viewport floating controls bottom-right | [ ] Pending |
| Zoom to Fit Button | `index.html:320` (`#btnZoomFit`) | Viewport floating bar | Viewport floating controls bottom-right | [ ] Pending |
| 100% Actual Size Button | `index.html:323` (`#btnZoomActual`) | Viewport floating bar | Viewport floating controls bottom-right | [ ] Pending |
| Zoom Percentage Label | `index.html:324` (`#zoomLevelDisplay`) | Viewport floating bar | Viewport floating controls bottom-right | [ ] Pending |
| Before / After Toggle Button & Hotkey (`\`) | `index.html:327` (`#btnToggleBeforeAfter`), `main.js:1010-1014` | Viewport floating bar | Viewport floating bar + `\` backslash key | [ ] Pending |
| Split-Screen Comparison Slider | `index.html:270` (`#splitSliderLine`), `main.js:1017-1039` | Stage overlay | Viewport interactive divider with drag handle | [ ] Pending |
| Quick Copy to Clipboard Button | `index.html:333` (`#btnCopyClipboard`), `main.js:1042-1048` | Viewport floating bar | Viewport floating bar & Edit > Copy | [ ] Pending |
| Fullscreen Toggle Button & `F11` | `index.html:336` (`#btnToggleFullscreen`), `main.js:1051-1057` | Viewport floating bar | Viewport bar + F11 (menu remains accessible) | [ ] Pending |
| Drag-and-Drop Image/Video Target | `index.html:258-265` (`#dropzoneOverlay`) | Viewport overlay | Whole viewport drop target | [ ] Pending |
| Image Dimension & Aspect Display | `index.html:272` (`#imageDimensionsDisplay`) | Viewport overlay | Viewport status strip bottom-left | [ ] Pending |
| Top-Bar Engine Dropdown: `Full` | `index.html:62` (`#perfModeSelector`) | Top bar dropdown | Bottom Strip segmented switch: `[ Precise ]` | [ ] Pending |
| Top-Bar Engine Dropdown: `Live` | `index.html:63` (`#perfModeSelector`) | Top bar dropdown | Bottom Strip segmented switch: `[ Live ]` | [ ] Pending |
| Top-Bar Engine Dropdown: `Still` | `index.html:64` (`#perfModeSelector`) | Top bar dropdown | Bottom Strip segmented switch: `[ Settle ]` (250ms debounce) | [ ] Pending |
| Left Icon Rail Placeholder | *[NEW - placeholder; logo asset TBD by user]* | None | Left edge of viewport (32px icon rail) | [ ] Pending |
| Transparent image import with alpha preservation | `CenterViewport.tsx`, `algorithms.js` | Viewport & Engine | Whole viewport drop target & engine pipeline | [x] Implemented |

---

### 1.8 Top Menu Bar & Preset Management

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| Brand Header & Logo | `index.html:14-18` | Top bar left | Top Menu Bar left brand mark | [x] Complete |
| File > Open Image... | `index.html:22` (`#btnOpenImage`) | Top bar button | File > Open Image... (`Ctrl+O`) | [x] Complete |
| File > Open Video | `index.html:25` (`#btnOpenVideo`) | Top bar button | File > Open Video... | [ ] Pending |
| File > Load Sample Pattern | `index.html:28` (`#btnSampleImage`) | Top bar button | File > Load Sample Pattern | [x] Complete |
| File > Export Image / Video... | `index.html:414-480` | Right Panel tab | File > Export... (`Ctrl+E`) & Quick Export button | [x] Complete |
| Edit > Undo / Redo | *[NEW Ergonomic Addition]* | None | Edit > Undo (`Ctrl+Z`) / Redo (`Ctrl+Y`) | [ ] [Deferred to 7.3] |
| Edit > Reset All Parameters | `main.js:485-504` | Top bar implicit | Edit > Reset All (reverts all sliders & tweaks) | [x] Complete |
| Edit > Copy to Clipboard | `exporters.js:13-29` | Viewport icon | Edit > Copy Dithered Image (`Ctrl+C`) | [x] Complete |
| Extras > Themes (6 Static Token Themes) | `index.html:48-56` (`#themeSelector`) | Top bar select | Extras > Themes (Dark Pro, CRT Phosphor, Cyberpunk, GameBoy, Retro Mac, Vaporwave) | [x] Complete |
| 10 Built-in Presets (Mac 1984, GameBoy, Cyberpunk, C64, Amber CRT, VHS, Newsprint, Vaporwave, Nordic, PICO) | `src/ui/presets.js:4-162` (`BUILTIN_PRESETS`) | Top menu Preset dropdown | Top Menu Presets Dropdown & Extras > Presets | [x] Complete |
| Save User Preset with Name | `index.html:406-410` (`#btnSavePreset`) | Right Panel Preset Manager | Presets dropdown > `+ Save Current as Preset...` | [ ] Pending |
| Rename / Delete User Presets | `presets.js:164-178` (`saveUserPresets`) | Storage only | Presets Manager dialog (Extras > Presets > Manage...) | [ ] Pending |
| Export Presets JSON | `presets.js:164-178` | LocalStorage | Extras > Presets > Export Presets JSON | [ ] Pending |
| Import Presets JSON | `index.html:230` (`#fileInputPreset`) | Hidden file input | Extras > Presets > Import Presets JSON | [ ] Pending |

---

### 1.9 Modals, Storage & Settings

| Feature | Source (File & Function / Line) | Current Location | New Location | Status |
|---|---|---|---|---|
| Algorithm Reference Manual (2,438 lines) | `index.html:485-503`, `src/docs/ALGORITHM_REFERENCE.md` | Top bar button | Help > Algorithm Reference Manual dialog | [x] Complete |
| Download Reference Manual (.md) | `index.html:499` (`#btnDownloadDocsMd`) | Docs modal footer | Inside Reference Manual dialog footer | [ ] Pending |
| Batch Processing Queue & Progress | `index.html:505-528`, `main.js:1154-1203` | Top bar `Batch` | Top Menu Bar > Batch > Batch Process Images... | [ ] Pending |
| License Registration Key Input & Validate Button | `index.html:530-555`, `main.js:1206-1212` | Bottom panel / Help | Help > About DitherForge / License Registration (**Zero Gating, Zero Paywalling**) | [x] Complete |
| Purge Temporary Cache Buffers | `index.html:543`, `main.js:1213-1215` | License modal | Help > Settings > Storage > Purge Temp Cache | [ ] Pending |
| Keyboard Shortcuts Cheat Sheet Dialog | *[NEW Ergonomic Addition]* | None | Help > Keyboard Shortcuts (`?`) | [x] Complete |

---

### 1.10 Itemized Per-Format Export Options

| Format | Source (File & Function / Line) | Verified Options in Code & UI | Status |
|---|---|---|---|
| PNG (Raster) | `exporters.js:4-11` (`exportRaster`) | Lossless 24-bit/32-bit RGBA raster buffer | [x] Shipped |
| JPG (Raster) | `exporters.js:4-11` (`exportRaster`) | `quality: float` (0.0 to 1.0, default 0.92) | [x] Shipped |
| WebP (Raster) | `exporters.js:4-11` (`exportRaster`) | `quality: float` (0.0 to 1.0, default 0.92) | [x] Shipped |
| System Clipboard Copy | `exporters.js:13-29` (`copyCanvasToClipboard`) | Direct binary PNG blob write to `navigator.clipboard` | [x] Shipped |
| SVG Vector Contours | `exporters.js:109-157` (`exportSvgContours`) | Draws pixels with `luma < 128` as 1px-high run-length `<rect>`s in their own color (`fill="${spanColor}"`) on white background. (No fill-colour toggle exists in code today. It is NOT Marching Squares). | [x] Shipped |
| TXT ASCII Character Grid | `exporters.js:32-107` (`exportCharacterGrid`) | Character ramp: ` .:-=+*#%@`. `cellWidth` (default 6) and `cellHeight` (default 12) apply to ASCII and Unicode Blocks only. | [x] Shipped |
| TXT Unicode Blocks Grid | `exporters.js:32-107` (`exportCharacterGrid`) | Character ramp: ` ░▒▓█`. `cellWidth` (default 6) and `cellHeight` (default 12) apply. | [x] Shipped |
| TXT Unicode Braille Matrix | `exporters.js:47-78` (`exportCharacterGrid`) | 2×4 dot sub-grid bitmask mapping to Unicode Braille codepoints `U+2800..U+28FF`. (`cellWidth` and `cellHeight` are ignored by Braille). | [x] Shipped |
| MP4 / WebM Video Stream | `exporters.js:159-210` (`VideoRecorder`) | `MediaRecorder` stream recording with codec negotiation (`video/webm;codecs=vp9`, `vp8`, `video/mp4`), fps selection (12, 24, 30, 60 fps). | [ ] [Deferred] |
| Animated GIF | *[NOT FOUND in exporters.js / main.js]* | Proposed Addition in future phase; no GIF encoder exists in current JS codebase. | [ ] [Deferred] |
| PNG Frame Sequence | `main.js:1139-1142` (`#btnExportFrameSequence`) | Currently a snapshot PNG download with alert stub in `main.js:1139-1142`. Proposed True Multi-Frame loop. | [ ] [Deferred] |
| Export Resolution Multiplier (1x, 2x, 4x) | *[NOT FOUND in codebase]* | Proposed Addition in Export Dialog. | [ ] Proposed |
| Last Export Settings Memory | *[NEW Ergonomic Addition]* | Preserves format and parameters in localStorage | [x] Shipped |

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
| `Left-Click Drag` | Plain pan canvas (PRESERVED from current app) | Viewport background / canvas | [ ] Pending |
| `Middle-Click Drag` | Pan canvas | Viewport | [ ] Pending |
| `F11` | Toggle Fullscreen (menu bar remains accessible) | Global | [ ] Pending |
| `Up / Down` | Step through previous/next algorithm (fires only when no input/slider/select focused) | Global | [ ] Pending |

---

### 1.12 Favourites [NEW]

| Feature | Details / Storage Key | Current Location | Status |
|---|---|---|---|
| Algorithm Favourites Store Slice | Persisted to localStorage `ditherforge_favorites` | `src/state/useAppStore.ts` | [x] Implemented |
| Favourites Chips Row | Horizontal row of starred algorithm chips above search input | Right Panel A > Top row of Algorithm Dropdown | [x] Implemented |
| Per-Algorithm Star Toggle | Star icon on each algorithm row in picker (`★` / `☆`) | Right Panel A > Algorithm Listbox items & Stepper | [x] Implemented |

---

## 2. Evidence & Automated Audit Verification

To guarantee zero feature drift and provide an auditable source of truth, `scripts/inventory-check.mjs` dynamically imports real production engine registries and parses the UI source files.

### 2.1 Engine Integrity Freeze (`npm run engine:verify`)
Engine files are frozen and cryptographically locked against accidental tampering:

| File | SHA-256 Hash | Status |
|---|---|---|
| `src/dither-engine/algorithms.js` | `c3f684abcd8f9054d6fb98afc34748d5ca75953466f837e4d21781e0be0933f9` | Frozen |
| `src/dither-engine/effect-stack.js` | `8d1bb8c163fc4d99e49ca5496314c839d514d5db9f2d1da29781c42ee6784976` | Frozen |
| `src/dither-engine/exporters.js` | `1028c7f42d34b7b0a26abceb8c205f613bce1334abc7dda2b1b450b9f55dfeba` | Frozen |
| `src/dither-engine/palettes.js` | `4802854ee5d13cb44e6be27074c27e1545310d1aec2359ce3b421b591944a867` | Frozen |
| `src/dither-engine/temporal.js` | `20140ac20911e85455a29fd772b0e64a5bc484505985dbfd3e07140d572b4584` | Frozen |
| `src/ui/presets.js` | `f92f4160cadcd2843cc7808f01a7643f211bf399f82721fce4dd9d93f4d86366` | Frozen |

Verification output:
```text
==================================================================
         DITHERFORGE ENGINE INTEGRITY VERIFICATION                
==================================================================
  PASS: src/dither-engine/algorithms.js
        SHA-256: c3f684abcd8f9054d6fb98afc34748d5ca75953466f837e4d21781e0be0933f9
  PASS: src/dither-engine/effect-stack.js
        SHA-256: 8d1bb8c163fc4d99e49ca5496314c839d514d5db9f2d1da29781c42ee6784976
  PASS: src/dither-engine/exporters.js
        SHA-256: 1028c7f42d34b7b0a26abceb8c205f613bce1334abc7dda2b1b450b9f55dfeba
  PASS: src/dither-engine/palettes.js
        SHA-256: 4802854ee5d13cb44e6be27074c27e1545310d1aec2359ce3b421b591944a867
  PASS: src/dither-engine/temporal.js
        SHA-256: 20140ac20911e85455a29fd772b0e64a5bc484505985dbfd3e07140d572b4584
  PASS: src/ui/presets.js
        SHA-256: f92f4160cadcd2843cc7808f01a7643f211bf399f82721fce4dd9d93f4d86366
==================================================================
✅ ENGINE FREEZE VERIFIED: All 6 engine files match golden SHA-256.
==================================================================
```

### 2.2 Automated Registry & Source Audit (`npm run inventory:check`)
```text
==================================================================
       DITHERFORGE FEATURE INVENTORY VERIFICATION (v3)            
==================================================================

[1] ALGORITHMS & CATEGORIES (src/dither-engine/algorithms.js)
  PASS: Algorithms registry count matches expected 63 (found: 63)
  PASS: Category count matches 6 (found: 6)

[2] PALETTES & EXTRACTORS (src/dither-engine/palettes.js)
  PASS: Built-in palettes count matches 14 (found: 14)
  PASS: Palette extractors count matches 2 [extractPaletteKMeans, extractPaletteMedianCut]

[3] POST-EFFECTS STACK (src/dither-engine/effect-stack.js)
  PASS: Post-effect types count matches 9 (found: 9)

[4] TEMPORAL CRT NOISE PATTERNS (src/dither-engine/temporal.js)
  PASS: Temporal CRT noise profiles count matches 9 (found: 9)

[5] BUILT-IN PRESETS (src/ui/presets.js)
  PASS: Built-in factory presets count matches 10 (found: 10)

[6] UI SOURCE PARSING (index.html)
  PASS: Themes parsed from index.html: 6 [dark_pro, crt_green, cyberpunk_neon, gameboy_olive, retro_mac, vaporwave_pink]
  PASS: Engine performance modes parsed from index.html: 3 [full, live, still]
  PASS: Export actions parsed from index.html: 10 [btnExportPng, btnExportJpg, btnExportWebp, btnExportClipboard, btnExportSvg, btnExportAscii, btnExportBlocks, btnExportBraille, btnRecordVideo, btnExportFrameSequence]

[7] EXPORTERS ENGINE (src/dither-engine/exporters.js)
  PASS: exportRaster present in exporters.js
  PASS: copyCanvasToClipboard present in exporters.js
  PASS: exportCharacterGrid present in exporters.js
  PASS: exportSvgContours present in exporters.js
  PASS: VideoRecorder class present in exporters.js

[8] EXPORT BINDINGS (src/main.js)
  PASS: Button #btnExportPng is bound in main.js
  PASS: Button #btnExportJpg is bound in main.js
  PASS: Button #btnExportWebp is bound in main.js
  PASS: Button #btnExportClipboard is bound in main.js
  PASS: Button #btnExportSvg is bound in main.js
  PASS: Button #btnExportAscii is bound in main.js
  PASS: Button #btnExportBlocks is bound in main.js
  PASS: Button #btnExportBraille is bound in main.js
  PASS: Button #btnRecordVideo is bound in main.js
  PASS: Button #btnExportFrameSequence is bound in main.js

==================================================================
✅ INVENTORY VERIFICATION PASSED: All counts match code registries exactly.
==================================================================
```

### 2.3 Bit-Identical Golden Tests (`npm run test:golden`)
All 97 test cases execute twice to guarantee self-determinism, and are validated against `tests/golden/golden-hashes.json`:
- **63 Algorithms:** Deterministic, seeded by `temporalSeed: 0`. No PRNG stubbing. (63/63 PASS)
- **Palette Extractors:** Median Cut (deterministic) + K-Means (stubbed with seeded PRNG 1337). (2/2 PASS)
- **9 Post-Effects:** Deterministic stack execution. (9/9 PASS)
- **9 Temporal Patterns:** CRT noise execution stubbed with seeded PRNG 4242. (9/9 PASS)
- **10 Presets:** Full end-to-end pipeline (tweaks + algorithm + effect stack). (10/10 PASS)
- **4 Exporters:** Character grids (ASCII, Blocks, Braille) + SVG Vector contours. (4/4 PASS)
- **Total:** 97 Passed, 0 Failed.

---

## 3. Worker Architecture & Thread Separation Confirmation

1. **Web Worker Thread (DOM-Free Engine):**
   - `algorithms.js` (63 algorithms + tweaks)
   - `palettes.js` (14 palettes + Median Cut + K-Means)
   - `effect-stack.js` (9 post-effects)
   - `temporal.js` (9 CRT noise patterns)
   - *Confirmation:* All four engine modules operate purely on numerical typed arrays (`Uint8ClampedArray`, `Float32Array`) and simple objects. They contain **zero references to `window`, `document`, `Image`, or `HTMLCanvasElement`**. They execute inside a dedicated WebWorker using transferable `ArrayBuffer` payloads, completely off the UI thread.
2. **Main UI Thread:**
   - `exporters.js` uses `HTMLCanvasElement`, `canvas.toDataURL`, `canvas.toBlob`, `navigator.clipboard`, `document.createElement`, and `MediaRecorder(canvas.captureStream(fps))`.
   - *Confirmation:* Exporters remain on the main thread where DOM, Canvas, and media APIs exist.

---

## 4. Secondary Location Decisions (Rule #1 Gating Analysis)

1. **License Modal & Registration:**
   - *Confirmation:* The license registration input (`#licenseKeyInput`) and validation button (`#btnValidateLicense`) from `index.html:530-555` are preserved in **`Help > About DitherForge / License Registration`**. There is **no key-entry gating, no paywall, and no feature locking**.
2. **Purge Temp Buffers:**
   - Preserved in **`Help > Settings > Storage > Purge Temp Files`**.
3. **Batch Processing Queue:**
   - Preserved in **`Batch > Batch Process Images...`** dialog with multi-file queue and progress tracking.
4. **Algorithm Reference Manual (2,438 lines):**
   - Preserved in **`Help > Algorithm Reference Manual`** dialog.

---

*End of FEATURE_INVENTORY.md v3. Audited and verified against codebase.*

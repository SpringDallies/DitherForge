# DitherForge — Master Feature Inventory & UI/UX Rebuild Safety Net

**Project:** DitherForge (Tauri 2 + Rust + React + TypeScript + Vite)  
**Status:** Phase 0 — Audit & Mapping (Awaiting Approval)  
**Strict Mandate:** Rule #1 — NO FEATURE REMOVAL. Every control, parameter, option, theme, algorithm, effect, and export format is preserved and mapped to its new location.

---

## 1. Feature Inventory & Location Mapping

### 1.1 Dithering Algorithms (63 Total)
*Output must remain bit-identical. Mapped to Right Panel A: Searchable categorized dropdown with Prev/Next stepping, favorites, and progressive parameter disclosure.*

| # | Feature / Algorithm | Category | Current Location | New Location | Status |
|---|---|---|---|---|---|
| 1 | Floyd–Steinberg | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 2 | Atkinson | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 3 | Jarvis–Judice–Ninke | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 4 | Stucki | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 5 | Burkes | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 6 | Sierra Three-Row | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 7 | Sierra Two-Row | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 8 | Sierra Lite | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 9 | Stevenson–Arce | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 10 | Fan Adaptive | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 11 | Shiau–Fan Balanced | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 12 | Shiau–Fan 2 (Narrow) | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 13 | False Floyd–Steinberg | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 14 | Minimized Average Error (Oatley) | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 15 | Dynamic Serpentine Lattice | Error Diffusion | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Diffusion | [ ] Pending |
| 16 | Bayer 2×2 | Ordered | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 17 | Bayer 4×4 | Ordered | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 18 | Bayer 8×8 | Ordered | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 19 | Bayer 16×16 | Ordered | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 20 | Clustered Dot Screen | Ordered | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Ordered | [ ] Pending |
| 21 | Checkered Micro-Grid | Pattern | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 22 | Horizontal Linear Grating | Pattern | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 23 | Vertical Linear Grating | Pattern | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 24 | Interlocking Crosshatch | Pattern | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 25 | Diagonal 45° Hatch | Pattern | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 26 | Concentric Diamond Grid | Pattern | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 27 | Woven Basket Tile | Pattern | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 28 | Hexagonal Stochastic Stipple | Pattern | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Pattern | [ ] Pending |
| 29 | Scanline Jitter | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 30 | Color Channel Chromatic Offset | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 31 | Directional Pixel Sorting | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 32 | Digital Compression Artifacts | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 33 | Interlacing Field Tear | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 34 | CRT Phosphor Bloom | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 35 | Bit-Depth Crush Quantizer | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 36 | VHS Tracking Head Noise | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 37 | Bad RAM Nibble Inversion | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 38 | Sinusoidal Wave Phase Warp | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 39 | Quantization Step Slicing | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 40 | Diagonal Matrix Cascade Rake | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 41 | Analog Static Snow | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 42 | Sync Pulse Hold Collapse | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 43 | Edge Ringing & Video Feedback | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 44 | YUV 4:1:1 Chroma Degradation | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 45 | Moiré Optical Interference Glitch | Glitch | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Glitch | [ ] Pending |
| 46 | Fixed Bi-Level Cutoff | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 47 | Uniform White Noise Dither | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 48 | Void-and-Cluster Blue Noise | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 49 | Gaussian Normal Distribution | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 50 | Perlin Gradient Lattice | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 51 | Riemersma Space-Filling Curve | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 52 | Ostromoukhov Variable Diffusion | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 53 | Triangular PDF Noise (TPDF) | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 54 | Dynamic Companding (A-Law) | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 55 | Hexagonal Spatial Lattice | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 56 | Sobel Silhouette Preserving | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 57 | Laplacian Frequency Modulated | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 58 | Directional Gradient Angle | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 59 | Voronoi Cellular Relaxed Stipple | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 60 | Unsharp Diffusion Quantizer | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 61 | Quantum Micro-Stipple Cloud | Special | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Special | [ ] Pending |
| 62 | Ignition Glow (Bespoke Dither Bloom) | Bespoke | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Bespoke | [ ] Pending |
| 63 | Temporal Kinetic Dither | Temporal | Left Panel > Algorithms | Right Panel A > Algorithm Dropdown > Temporal | [ ] Pending |

---

### 1.2 Algorithm Parameters & Navigation Controls

| Feature | Current Location | New Location | Status |
|---|---|---|---|
| Search Input for Algorithms | Left Panel top input | Right Panel A > Algorithm search box inside dropdown | [ ] Pending |
| Category Pills / Filters | Left Panel category buttons | Right Panel A > Category grouping headers in dropdown | [ ] Pending |
| Favourites / Pinned Algorithms | *(New Ergonomic Addition)* | Right Panel A > Top row of Algorithm Dropdown | [ ] Pending |
| Algorithm Stepping (Prev/Next buttons) | *(Implicit in code)* | Right Panel A > `<` and `>` buttons next to dropdown | [ ] Pending |
| Up/Down Arrow Keyboard Stepping | Window keydown handler | Window keydown handler (when dropdown or panel focused) | [ ] Pending |
| Threshold Pivot Slider & Number Input | Left Panel card | Right Panel A > Algorithm Parameters section | [ ] Pending |
| Diffusion Strength Slider & Number Input | Left Panel card | Right Panel A > Algorithm Parameters section | [ ] Pending |
| Pattern Scale Slider & Number Input | Left Panel card | Right Panel A > Algorithm Parameters section | [ ] Pending |
| Serpentine Scanning Toggle Checkbox | Left Panel card | Right Panel A > Algorithm Parameters section | [ ] Pending |
| Noise Amount Slider & Number Input | Glitch / Special state | Right Panel A > Algorithm Parameters section (progressive) | [ ] Pending |
| Reset Algorithm Parameters button | Left Panel `↺` button | Right Panel A > Double-click slider or section reset button | [ ] Pending |
| One-line Parameter Tooltips | Algorithm descriptions | Hover tooltip on each slider label | [ ] Pending |

---

### 1.3 Image Adjustments & Tweaks

| Feature | Current Location | New Location | Status |
|---|---|---|---|
| Brightness Slider & Number Input | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Contrast Slider & Number Input | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Saturation Slider & Number Input | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Gamma Slider & Number Input | Right Panel > Tweaks | Right Panel A > Adjustments section | [ ] Pending |
| Lock Brightness Checkbox | Right Panel checkbox | Right Panel A > Lock icon button next to Brightness | [ ] Pending |
| Lock Contrast Checkbox | Right Panel checkbox | Right Panel A > Lock icon button next to Contrast | [ ] Pending |
| Lock Saturation Checkbox | Right Panel checkbox | Right Panel A > Lock icon button next to Saturation | [ ] Pending |
| Lock Gamma Checkbox | Right Panel checkbox | Right Panel A > Lock icon button next to Gamma | [ ] Pending |
| Global Randomize / Shuffle Tweaks | Right Panel `🔀` button | Right Panel A > Adjustments header `🔀 Randomize` button | [ ] Pending |
| Double-click Slider to Reset | *(Ad-hoc)* | Standard on all adjustment & parameter sliders | [ ] Pending |

---

### 1.4 Color & Palette System

| Feature | Current Location | New Location | Status |
|---|---|---|---|
| 14 Built-in Palettes (Monochrome, GameBoy, Amber CRT, Cyberpunk, CGA, C64, PICO, Nordic, Vaporwave, Solar, EGA, Sepia, Spectrum, Mac 1984) | Left Panel > Palettes dropdown | Right Panel B > Palette Dropdown (categorized) | [ ] Pending |
| Live Palette Preview on Hover + Wheel | *(Dropdown select)* | Right Panel B > Palette Dropdown menu item hover/wheel | [ ] Pending |
| Median Cut Extraction ("From Image") | Left Panel button | Right Panel B > "From Image" > Median Cut | [ ] Pending |
| K-Means Clustering Extraction ("From Image") | Left Panel button | Right Panel B > "From Image" > K-Means | [ ] Pending |
| "Complete" Palette Option (Close Match) | *(Proposed in Prompt)* | Right Panel B > "From Image" > Complete | [ ] Pending |
| Swatch Strip Preview | Left Panel swatch strip | Right Panel B > Swatch Strip (interactive) | [ ] Pending |
| Live Swatch Click-to-Edit & Remap | Left Panel color picker | Right Panel B > Click swatch opens color editor; live remap | [ ] Pending |
| Per-Swatch Lock Toggle | Left Panel lock button | Right Panel B > Swatch strip lock icon per color | [ ] Pending |
| Palette Shuffle (Unlocked Swatches) | Left Panel `🔀` button | Right Panel B > Palette Shuffle button | [ ] Pending |
| Depth Iterations Slider (1 to 32) | Left Panel Depth slider | Right Panel B > Depth Slider (up to 32 iterations) | [ ] Pending |
| Add Swatch Color Button | Left Panel `+ Add Color` | Right Panel B > Swatch strip `+` button | [ ] Pending |
| Delete Swatch Color Button | Left Panel `✕` button | Right Panel B > Swatch popover delete button | [ ] Pending |
| Export Palette JSON | Left Panel `📤` button | Right Panel B > Overflow menu `...` > Export Palette JSON | [ ] Pending |
| Import Palette JSON | Left Panel `📥` button | Right Panel B > Overflow menu `...` > Import Palette JSON | [ ] Pending |

---

### 1.5 Stackable Post-Effects Pipeline

| Feature | Current Location | New Location | Status |
|---|---|---|---|
| Effect Stack Container | Right Panel > Effect Stack | Right Panel C > Effects Stack | [ ] Pending |
| "+" Add Effect Dropdown / Popover | Right Panel select element | Right Panel C > `[ + Add Effect ]` button & popover | [ ] Pending |
| Ignition Glow Effect | Right Panel effect item | Right Panel C > Effect item (params: radius, intensity) | [ ] Pending |
| Blur / Sharpen Effect | Right Panel effect item | Right Panel C > Effect item (params: amount) | [ ] Pending |
| Chromatic Aberration Effect | Right Panel effect item | Right Panel C > Effect item (params: offsetX, offsetY) | [ ] Pending |
| JPEG Artifacts Simulation Effect | Right Panel effect item | Right Panel C > Effect item (params: quality) | [ ] Pending |
| CMYK Halftone Effect | Right Panel effect item | Right Panel C > Effect item (params: dotSize, angle, shape) | [ ] Pending |
| CRT Scanlines Effect | Right Panel effect item | Right Panel C > Effect item (params: thickness, intensity) | [ ] Pending |
| Pixelate Effect | Right Panel effect item | Right Panel C > Effect item (params: blockSize) | [ ] Pending |
| Curves & Levels Effect | Right Panel effect item | Right Panel C > Effect item (params: blackPoint, whitePoint, gamma) | [ ] Pending |
| Vignette Falloff Effect | Right Panel effect item | Right Panel C > Effect item (params: radius, softness) | [ ] Pending |
| Stack Item Drag Handle (Reordering) | Right Panel Up/Down buttons | Right Panel C > Drag Handle on effect header | [ ] Pending |
| Stack Item Enable/Disable Toggle | Right Panel checkbox | Right Panel C > Eye icon toggle button | [ ] Pending |
| Stack Item Collapse/Expand Accordion | *(Always expanded)* | Right Panel C > Collapsed by default, accordion expand | [ ] Pending |
| Stack Item Delete Button | Right Panel `✕` button | Right Panel C > Trash/delete button on item header | [ ] Pending |

---

### 1.6 Video & Animation Suite

| Feature | Current Location | New Location | Status |
|---|---|---|---|
| Animation Mode Toggle | *(Always visible)* | Bottom Control Strip > Still/Animation Switch & File > Animate Still | [ ] Pending |
| Collapsible Animation Timeline | Bottom screen bar | Bottom Timeline Strip (visible ONLY in Animation Mode) | [ ] Pending |
| Play / Pause Animation Button | Timeline bottom bar | Timeline Strip Transport Controls | [ ] Pending |
| Rewind to Frame 0 Button | Timeline bottom bar | Timeline Strip Transport Controls | [ ] Pending |
| Loop Playback Toggle Button | Timeline bottom bar | Timeline Strip Transport Controls | [ ] Pending |
| Frame Scrubber Slider (0 to 60) | Timeline bottom bar | Timeline Strip Scrubber Bar | [ ] Pending |
| Frame / Time Display readout | Timeline bottom bar | Timeline Strip Status readout | [ ] Pending |
| FPS Selector Dropdown (12, 24, 30, 60) | Timeline bottom bar | Timeline Strip Transport Controls | [ ] Pending |
| 9 CRT Temporal Noise Profiles: | | | |
| 1. Grain (Stochastic Per-Pixel) | Timeline pattern dropdown | Timeline Strip > Noise Profile selector | [ ] Pending |
| 2. Static (Macroblock Snow) | Timeline pattern dropdown | Timeline Strip > Noise Profile selector | [ ] Pending |
| 3. Scanline Drift | Timeline pattern dropdown | Timeline Strip > Noise Profile selector | [ ] Pending |
| 4. Vertical Drift | Timeline pattern dropdown | Timeline Strip > Noise Profile selector | [ ] Pending |
| 5. Pulse (Power Line Hum) | Timeline pattern dropdown | Timeline Strip > Noise Profile selector | [ ] Pending |
| 6. Flicker (Phosphor Decay) | Timeline pattern dropdown | Timeline Strip > Noise Profile selector | [ ] Pending |
| 7. Wave (Harmonic Warping) | Timeline pattern dropdown | Timeline Strip > Noise Profile selector | [ ] Pending |
| 8. Shimmer (Phase Stipple) | Timeline pattern dropdown | Timeline Strip > Noise Profile selector | [ ] Pending |
| 9. Chaos (Analog Composite) | Timeline pattern dropdown | Timeline Strip > Noise Profile selector | [ ] Pending |
| Temporal Noise Intensity & Speed | Temporal state in engine | Timeline Strip > Noise Settings popover | [ ] Pending |
| "Animate Still" Converter | Timeline button | Bottom Strip button + File > Animate Still | [ ] Pending |
| Video File Import (MP4, WebM) | Top menu `Open Video` | File > Open (video file picker) or drag & drop | [ ] Pending |
| MP4 / WebM Recording Export | Export Hub button | Timeline Record button & Export Dialog > MP4/WebM | [ ] Pending |
| PNG Frame Sequence Export | Export Hub button | Export Dialog > Frame Sequence | [ ] Pending |

---

### 1.7 Viewport, Canvas & Update Modes

| Feature | Current Location | New Location | Status |
|---|---|---|---|
| Central Interactive Canvas (>=60% view) | Center stage | Central Viewport Area (un-obscured) | [ ] Pending |
| Zoom In (+) / Zoom Out (-) | Viewport toolbar | Viewport toolbar & Shortcuts (+, -) | [ ] Pending |
| Zoom Level Indicator (%) | Viewport toolbar | Bottom Info Bar (Status Text) | [ ] Pending |
| Fit to Window (0) | Viewport toolbar `⛶` button | Bottom Info Bar & Shortcut (0) | [ ] Pending |
| 100% Actual Size (1) | Viewport toolbar `1:1` button | Bottom Info Bar & Shortcut (1) | [ ] Pending |
| Mouse Wheel Zoom at Cursor | Viewport container event | Viewport container event | [ ] Pending |
| Pan Canvas (Space+drag / drag) | Viewport container event | Viewport container event (Space+drag or middle click) | [ ] Pending |
| Before / After Toggle (\) | Viewport toolbar button | Bottom Strip `👁 Before/After` & Shortcut (\) | [ ] Pending |
| Draggable Split Comparison Slider | Viewport split slider line | Viewport interactive draggable divider | [ ] Pending |
| Drag-and-Drop Image/Video Import | Viewport dropzone overlay | Viewport drag-and-drop with clean non-intrusive drop indicator | [ ] Pending |
| Clean Empty State | Dropzone overlay | Viewport empty state card with Open button & Sample button | [ ] Pending |
| Load Sample Pattern Generator | Top bar `Load Sample` button | File > Load Sample Pattern & Empty State button | [ ] Pending |
| Fullscreen Toggle (F11) | Viewport toolbar button | Top bar right icon & Shortcut (F11), keeps menu bar accessible | [ ] Pending |
| Copy Result to Clipboard (Ctrl+C) | Viewport toolbar `📋` button | File > Copy to Clipboard & Bottom Strip icon & Shortcut (Ctrl+C) | [ ] Pending |
| Update Mode Switch: [Precise \| Live \| Settle] | Top bar `Engine` dropdown | Bottom Strip Segmented Switch `[ Precise \| Live \| Settle ]` | [ ] Pending |
| Status Text: Image dimensions, Zoom %, Render ms | *(Ad-hoc)* | Bottom Strip Status Text (e.g., `1920×1080 • 100% • 14ms`) | [ ] Pending |

---

### 1.8 Top Menu Bar & Utilities

| Feature | Current Location | New Location | Status |
|---|---|---|---|
| **File Menu:** | | | |
| - Open Image / Video (Ctrl+O) | Top menu buttons | Menu: File > Open... (Ctrl+O) | [ ] Pending |
| - Export... (Ctrl+E) | Top menu `Export` button | Menu: File > Export... (Ctrl+E) | [ ] Pending |
| - Copy to Clipboard (Ctrl+C) | Viewport button | Menu: File > Copy Result to Clipboard (Ctrl+C) | [ ] Pending |
| - Animate Still | Timeline button | Menu: File > Animate Still | [ ] Pending |
| - Load Sample Pattern | Top menu button | Menu: File > Load Sample Pattern | [ ] Pending |
| **Edit Menu:** | | | |
| - Undo (Ctrl+Z) | *(Implicit/New)* | Menu: Edit > Undo (Ctrl+Z) | [ ] Pending |
| - Redo (Ctrl+Y / Ctrl+Shift+Z) | *(Implicit/New)* | Menu: Edit > Redo (Ctrl+Y) | [ ] Pending |
| - Reset All Adjustments & Parameters | Left Panel `↺` button | Menu: Edit > Reset All | [ ] Pending |
| **Batch Menu:** | | | |
| - Batch Processing Dialog | Top menu `Batch` button | Menu: Batch > Batch Process Images... | [ ] Pending |
| - Multi-Image Queue & Size Warning | Batch modal | Batch Modal with resolution disclaimer & preset recommendation | [ ] Pending |
| **Adjustments Menu:** | | | |
| - Randomize Unlocked Adjustments | Right panel `🔀` button | Menu: Adjustments > Randomize Unlocked Adjustments | [ ] Pending |
| - Lock All / Unlock All | *(New ergonomics)* | Menu: Adjustments > Lock All / Unlock All | [ ] Pending |
| **Extras Menu:** | | | |
| - 6 Theme Skins Selector (Dark Pro, CRT Green, Cyberpunk, GameBoy, Retro Mac, Vaporwave) | Top menu Theme dropdown | Menu: Extras > Themes > (Submenu with 6 skins) | [ ] Pending |
| - Palette Packs Import/Export | Left panel buttons | Menu: Extras > Palette Packs | [ ] Pending |
| - Preset Import / Export | Right panel buttons | Menu: Extras > Presets > Import/Export Preset JSON | [ ] Pending |
| **Help Menu:** | | | |
| - Settings (Update mode, export defaults, purge temp folder) | Top bar `Engine` & License modal | Menu: Help > Settings (Preferences dialog) | [ ] Pending |
| - Purge Temp Cache Files | License modal button | Help > Settings > Purge Temp Files | [ ] Pending |
| - Keyboard Shortcuts Reference | *(Implicit in code)* | Menu: Help > Keyboard Shortcuts Cheat Sheet | [ ] Pending |
| - Algorithm Reference Manual (2,438 lines) | Top menu `Reference Docs` | Menu: Help > Algorithm Reference Manual (dedicated modal/window) | [ ] Pending |
| - About & Clean-Room Attestation | Top menu `License` modal | Menu: Help > About DitherForge (Clean-Room Attestation & Info) | [ ] Pending |

---

### 1.9 Presets System (10 Built-In + User JSON)

| Feature | Current Location | New Location | Status |
|---|---|---|---|
| 10 Built-in Presets (Mac 1984, GameBoy, Cyberpunk, C64, Amber CRT, VHS, Newsprint, Vaporwave, Nordic, PICO) | Top menu Preset dropdown | Top Menu Presets Dropdown & Extras > Presets | [ ] Pending |
| Save User Preset with Name | Right Panel Preset Manager | Presets dropdown > `+ Save Current as Preset...` | [ ] Pending |
| Rename / Delete User Presets | *(Storage only)* | Presets Manager dialog (Extras > Presets > Manage...) | [ ] Pending |
| Export Presets JSON | LocalStorage | Extras > Presets > Export Presets JSON | [ ] Pending |
| Import Presets JSON | Hidden file input | Extras > Presets > Import Presets JSON | [ ] Pending |

---

### 1.10 Export Formats (9 Formats + Options)

| Feature | Current Location | New Location | Status |
|---|---|---|---|
| PNG Export (Lossless) | Export Hub button | Export Dialog > PNG (Lossless) | [ ] Pending |
| JPG Export (Compressed quality) | Export Hub button | Export Dialog > JPG (Quality slider) | [ ] Pending |
| WebP Export (Modern compressed) | Export Hub button | Export Dialog > WebP | [ ] Pending |
| SVG Vector Contours (Marching Squares) | Export Hub button | Export Dialog > SVG Vector Contours | [ ] Pending |
| TXT ASCII Character Grid | Export Hub button | Export Dialog > TXT (Character Set: ASCII) | [ ] Pending |
| TXT Unicode Blocks Character Grid | Export Hub button | Export Dialog > TXT (Character Set: Blocks) | [ ] Pending |
| TXT Unicode Braille 2×4 Dot Matrix | Export Hub button | Export Dialog > TXT (Character Set: Braille) | [ ] Pending |
| MP4 / WebM Animated Video Export | Export Hub button | Export Dialog > Video (WebM / MP4) | [ ] Pending |
| GIF Animated Export | Export Hub button | Export Dialog > Animated GIF | [ ] Pending |
| PNG Frame Sequence Zip/Download | Export Hub button | Export Dialog > Frame Sequence | [ ] Pending |
| Copy Result to System Clipboard | Export Hub button | File > Copy to Clipboard & Export Dialog > Clipboard | [ ] Pending |
| Export Resolution Multiplier (1x, 2x, 4x) | *(Engine support)* | Export Dialog > Resolution Multiplier option | [ ] Pending |
| Remember Last Export Settings | *(New ergonomics)* | Export Dialog persists choices | [ ] Pending |

---

### 1.11 Keyboard Shortcuts Reference

| Shortcut | Action | Location | Status |
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
| `F11` | Toggle Fullscreen (menu bar remains accessible) | Global | [ ] Pending |
| `Up / Down` | Step through previous/next algorithm | Global / Right Panel | [ ] Pending |

---

## 2. Secondary Location Decisions (No Feature Dropped)

In strict accordance with Rule #1:
1. **License Key / Activation Modal:**
   - *Prompt Instruction:* "DO NOT ADD: licensing/activation, account system, update-by-account flow."
   - *Action:* The clean-room provenance attestation, version information, and license details are preserved and re-homed under **`Help > About DitherForge`**. No activation gating or account requirement is added.
2. **Purge Temp Buffers:**
   - *Current:* Inside license modal.
   - *Action:* Re-homed to **`Help > Settings > Storage > Purge Temp Files`**.
3. **Batch Processing:**
   - *Current:* Top-level menu button.
   - *Action:* Re-homed to dedicated top-level **`Batch`** menu bar item, which opens the full batch processing dialog with resolution warnings and multi-image queue.
4. **Algorithm Reference Manual (2,438 lines):**
   - *Current:* Dedicated top menu button opening modal.
   - *Action:* Re-homed to **`Help > Algorithm Reference Manual`**, opening a dedicated searchable documentation viewer with table of contents and markdown export.

---

## 3. Proposed Component Tree & Folder Structure

```
c:/Users/straightheart/Documents/Code/DitherForge/
├── src/
│   ├── main.tsx                         # React entrypoint
│   ├── App.tsx                          # App shell, layout manager & shortcut listener
│   ├── index.css                        # Universal design tokens (CSS variables)
│   │
│   ├── core/                            # Pure math & image engine (Off-UI thread)
│   │   ├── algorithms.ts                # 63 bit-identical algorithm implementations
│   │   ├── palettes.ts                  # Built-in palettes, Median-Cut, K-Means, Octree
│   │   ├── effect-stack.ts              # Post-effects pipeline
│   │   ├── temporal.ts                  # 9 CRT temporal noise generators
│   │   ├── exporters.ts                 # Marching Squares SVG, ASCII/Braille, Video, Raster
│   │   └── dither-worker.ts             # WebWorker for background proxy/full renders
│   │
│   ├── state/                           # State management (Zustand with selectors)
│   │   ├── useAppStore.ts               # Dither params, active algorithm, update mode
│   │   ├── usePaletteStore.ts           # Swatches, locks, depth
│   │   ├── useEffectStackStore.ts       # Reorderable post-effect list
│   │   ├── useTimelineStore.ts          # Frames, playing, loop, temporal profile
│   │   └── useHistoryStore.ts           # Undo/Redo history stack
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MenuBar.tsx              # Top menu (File, Edit, Batch, Adjustments, Extras, Help)
│   │   │   ├── AppLayout.tsx            # Resizable 2-panel layout with persisted split
│   │   │   └── BottomControlStrip.tsx   # [Precise|Live|Settle], status text, zoom tools
│   │   │
│   │   ├── viewport/
│   │   │   ├── Viewport.tsx             # Interactive canvas container (>=60% window)
│   │   │   ├── PanZoomCanvas.tsx        # Transform-only canvas renderer with Space+drag
│   │   │   ├── SplitCompareSlider.tsx   # Draggable interactive split divider
│   │   │   └── DropzoneOverlay.tsx      # Drag & drop feedback overlay
│   │   │
│   │   ├── sidebar/
│   │   │   ├── RightSidebar.tsx         # Collapsible panel holding sections A, B, C
│   │   │   ├── PanelAlgorithm.tsx       # Searchable dropdown, favorites, algorithm parameters
│   │   │   ├── PanelAdjustments.tsx     # Brightness, contrast, saturation, gamma, locks, shuffle
│   │   │   ├── PanelPalette.tsx         # Palette dropdown, swatch strip, live editor, depth
│   │   │   └── PanelEffectStack.tsx     # Reorderable accordion stack with [+] add button
│   │   │
│   │   ├── timeline/
│   │   │   └── AnimationTimeline.tsx    # Collapsible timeline (visible in animation mode)
│   │   │
│   │   ├── dialogs/
│   │   │   ├── ExportDialog.tsx         # All 9 formats with options and last-used memory
│   │   │   ├── BatchDialog.tsx          # Multi-file queue with size warning
│   │   │   ├── SettingsDialog.tsx       # Performance defaults, purge temp files
│   │   │   ├── DocsModal.tsx            # 2,438-line Algorithm Reference manual viewer
│   │   │   ├── ShortcutsDialog.tsx      # Cheat sheet modal
│   │   │   └── AboutDialog.tsx          # Clean-Room attestation & app version
│   │   │
│   │   └── common/
│   │       ├── SliderControl.tsx        # Label, number input, double-click reset, tooltip, lock
│   │       ├── DropdownSelect.tsx       # Categorized virtualized select control
│   │       └── IconButton.tsx           # Standardized 1px border button
│   │
│   └── docs/
│       └── ALGORITHM_REFERENCE.md       # Full 2,438-line reference manual
```

---

## 4. Phase Execution Plan

1. **Phase 0:** Audit & Master Inventory (This document — awaits user approval).
2. **Phase 1:** Shell + Design Tokens (Universal CSS variable token system, 6 themes as pure token sets, resizable layout shell, persisted sizes, full-screen toggle F11 keeping menu accessible).
3. **Phase 2:** Viewport + Update Modes (Central viewport >= 60%, pan/zoom, before/after toggle, split-compare slider, drag-drop empty state, bottom strip with `[ Precise | Live | Settle ]` update modes, status text).
4. **Phase 3:** Right Panel A: Algorithm + Adjustments (Searchable categorized dropdown with 63 algorithms, favorites row, stepping arrows, progressive parameter disclosure, adjustments with per-control lock and randomize, double-click reset).
5. **Phase 4:** Right Panel B: Palette (Categorized dropdown with hover preview, "From image" with "Complete" option, swatch strip with live remapping, per-swatch lock, shuffle, depth slider up to 32, JSON import/export).
6. **Phase 5:** Right Panel C: Effects Stack ("+" searchable popover with all 9 effect types, drag handle to reorder, eye toggle, collapse accordion, delete item, parameter sliders).
7. **Phase 6:** Animation / Video (Timeline appears at bottom only when in animation mode, still/animation toggle, scrubber, play/pause/loop, FPS options, 9 CRT noise profiles, recording, frame sequence export).
8. **Phase 7:** Menus, Presets, Batch, Export, Utilities (Top menu bar: File, Edit, Batch, Adjustments, Extras, Help; 10 built-in presets + JSON import/export; Export dialog for all 9 formats; Settings with temp purge; Shortcuts).
9. **Phase 8:** Polish & Final Verification (Walk through this inventory item by item in running app, verify 100% checked off, ensure <100ms proxy renders on i3/HD 2500, zero console errors).

---

*This document is the official safety net for the DitherForge rebuild. No feature, option, or parameter will be removed.*

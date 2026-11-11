<p align="center">
  <img src="assets/logo-wordmark.webp" alt="DitherForge" height="80" style="vertical-align: middle;" />
  &nbsp;&nbsp;
</p>

<h3 align="center">Dithering Suite</h3>

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
- 9 themes with unified high-legibility menus.
- Preset manager with user-saved presets and undo/redo history.
- In-app algorithm reference.

---

## Installation & Getting Started

### Prerequisites

| Tool | Version Requirement | Notes |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` (LTS recommended) | Includes `npm` |
| **Rust & Cargo** | `>= 1.75.0` (stable) | Required for desktop native engine (`rustup default stable`) |

#### System Packages for Desktop App (Tauri v2)

<details>
<summary><b>Linux (Ubuntu / Debian / Mint)</b></summary>

```bash
sudo apt-get update && sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```
</details>

<details>
<summary><b>Linux (Fedora / RHEL)</b></summary>

```bash
sudo dnf install -y \
  webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  libappindicator-gtk3-devel \
  librsvg2-devel
```
</details>

<details>
<summary><b>Linux (Arch / Manjaro)</b></summary>

```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  base-devel \
  curl \
  wget \
  openssl \
  libappindicator-gtk3 \
  librsvg
```
</details>

<details>
<summary><b>macOS</b></summary>

```bash
# Install Xcode Command Line Tools
xcode-select --install
```
</details>

<details>
<summary><b>Windows</b></summary>

- Install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select "Desktop development with C++").
- Microsoft Edge WebView2 (included by default on Windows 10/11).
</details>

---

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/SpringDallies/DitherForge.git
cd DitherForge
npm install
```

---

### 2. Web Application

#### Development Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in any modern evergreen browser (Chrome, Edge, Firefox, Safari).

#### Production Build & Local Preview
```bash
npm run build
npm run serve
```
Serves the bundled production application at [http://localhost:8080/](http://localhost:8080/).

---

### 3. Desktop Application (Tauri v2 Native Backend)

The desktop edition pairs the React interface with an ultra-low-latency Rust backend powered by SIMD parallel image diffusion, zero-allocation FastPaletteLUT cache, and native raw binary IPC.

#### Run in Development Mode
```bash
npm run tauri dev
```

#### Build Production Standalone Executable / Installer
```bash
# On Linux, set APPIMAGE_EXTRACT_AND_RUN=1 if building without FUSE / in containers
export APPIMAGE_EXTRACT_AND_RUN=1
npm run tauri build
```

You can also build individual bundle formats:
```bash
npm run tauri build -- -b deb       # Debian / Ubuntu package (.deb)
npm run tauri build -- -b appimage  # Portable standalone AppImage (.AppImage)
npm run tauri build -- -b rpm       # Fedora / RHEL package (.rpm)
```

Build outputs will be generated in `src-tauri/target/release/bundle/`:
- **Linux:**
  - `bundle/deb/DitherForge_1.0.0_amd64.deb`
  - `bundle/rpm/DitherForge-1.0.0-1.x86_64.rpm`
  - `bundle/appimage/DitherForge_1.0.0_amd64.AppImage`
- **Windows:** `bundle/msi/DitherForge_1.0.0_x64_en-US.msi`, `bundle/nsis/DitherForge_1.0.0_x64-setup.exe`
- **macOS:** `bundle/dmg/DitherForge_1.0.0_universal.dmg` (or `aarch64` / `x64`), `bundle/macos/DitherForge.app`

> [!NOTE]
> **Cross-Platform Release Builds (Windows & macOS):**
> Because Tauri dynamically links against each operating system's native Webview (Microsoft Edge WebView2 on Windows, Apple Cocoa WebKit on macOS, and WebKitGTK on Linux), native executables must be built on their respective host OS or compiled via GitHub Actions:
> - **Building on Windows:** Clone repo on a Windows machine and run `npm run tauri build` to output the `.msi` and `.exe` installers.
> - **Building on macOS:** Clone repo on a Mac and run `npm run tauri build` to output `.dmg` and `.app`.
> - **Automated Multi-Platform Release (CI):** Run the included [`.github/workflows/release.yml`](./.github/workflows/release.yml) on GitHub Actions (`workflow_dispatch` or push tag `v*`). It compiles Windows (`windows-latest`), macOS (`macos-latest` for Apple Silicon & Intel), and Linux (`ubuntu-22.04`) in parallel and publishes all installers to GitHub Releases.

#### Installing & Running on Linux
- **AppImage (Standalone Portable):**
  ```bash
  chmod +x src-tauri/target/release/bundle/appimage/DitherForge_1.0.0_amd64.AppImage
  ./src-tauri/target/release/bundle/appimage/DitherForge_1.0.0_amd64.AppImage
  ```
- **Debian / Ubuntu / Mint (.deb):**
  ```bash
  sudo apt install ./src-tauri/target/release/bundle/deb/DitherForge_1.0.0_amd64.deb
  # or: sudo dpkg -i src-tauri/target/release/bundle/deb/DitherForge_1.0.0_amd64.deb
  ```
- **Fedora / RHEL (.rpm):**
  ```bash
  sudo dnf install ./src-tauri/target/release/bundle/rpm/DitherForge-1.0.0-1.x86_64.rpm
  # or: sudo rpm -i src-tauri/target/release/bundle/rpm/DitherForge-1.0.0-1.x86_64.rpm
  ```

---

## Testing & Verification Suites

DitherForge maintains full parity between its JavaScript reference engine and the native Rust SIMD acceleration engine.

```bash
# Run all frontend integration and effects tests
npm test

# Run bit-identical golden tests (112 test cases)
npm run test:golden

# Verify engine freeze hashes and feature inventories
npm run inventory:check
npm run engine:verify

# Run full 308-case Rust vs JS algorithm and effects parity suite
node tests/rust-parity.test.mjs

# Verify special & glitch dynamic slider parameter modulation
node tests/special-sliders-verification.test.mjs
```

---

## Documentation
- [`SPEC_LOG.md`](./SPEC_LOG.md) — technical spec and algorithm formulations.
- [`src/docs/ALGORITHM_REFERENCE.md`](./src/docs/ALGORITHM_REFERENCE.md) — full algorithm manual (2,438 lines).
- [`FEATURE_INVENTORY.md`](./FEATURE_INVENTORY.md) — audited feature inventory mapped to source code.

---

## License
Dual-licensed under MIT and Apache-2.0.

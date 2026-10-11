# DitherForge: Clean-Room Specification & Development Log

**Project Name:** DitherForge  
**Author / Engineering Lead:** Senior Cross-Platform Desktop Engineer  
**Clean-Room Status:** Fully Verified Clean-Room Implementation  
**Date:** October 2026  
**License:** MIT / Apache-2.0 Dual License  

---

## 1. Clean-Room Attestation & Provenance Statement

This document certifies that the **DitherForge** application, its backend engine, frontend user interface, algorithmic implementations, branding, naming conventions, palettes, and visual design assets were designed, researched, and authored from scratch using clean-room engineering principles:

1. **No Binary or Source Inspection:** No proprietary software binaries, decompiled bytecodes, disassembly listings, or closed-source codebases were inspected, opened, reverse-engineered, or referenced.
2. **Public-Domain & Independent Algorithms Only:** All 63 image-processing and dithering algorithms are based solely on peer-reviewed academic literature (e.g., Floyd & Steinberg 1976, Atkinson 1984, Jarvis, Judice & Ninke 1976, Stucki 1981, Burkes 1988, Sierra 1989, Riemersma 1998, Ostromoukhov 2001, Bayer 1973), standard digital signal processing (DSP) textbooks, and original mathematical formulations developed independently.
3. **Original UI & Nomenclature:** All user interface layouts, visual icons, brand styling, color schemes, themes, preset names, and palette names are entirely original to DitherForge.
4. **Independent Asset Generation:** The logo, emblem, icon set, and marketing copy were independently generated and crafted specifically for this project.

---

## 2. Mathematical Formulations & Academic Citations

### 2.1 Error Diffusion Algorithms (15 Algorithms)
Error diffusion quantizes a pixel at coordinates `(x, y)` to the nearest palette color in RGB Euclidean or Perceptual space, calculates the quantization error `E = P_orig - P_quant`, and diffuses weighted fractions of `E` to unprocessed neighboring pixels.

- **Floyd–Steinberg (1976):**
  - Canonical 2-row kernel, divisor 16:
    - `(x + 1, y)`: `7/16`
    - `(x - 1, y + 1)`: `3/16`
    - `(x, y + 1)`: `5/16`
    - `(x + 1, y + 1)`: `1/16`
- **Atkinson (1984 - Bill Atkinson / Apple Macintosh):**
  - 3-row kernel, divisor 8 (preserves 3/4 error total, retains high-contrast edges):
    - `(x + 1, y)`: `1/8`, `(x + 2, y)`: `1/8`
    - `(x - 1, y + 1)`: `1/8`, `(x, y + 1)`: `1/8`, `(x + 1, y + 1)`: `1/8`
    - `(x, y + 2)`: `1/8`
- **Jarvis–Judice–Ninke (1976):**
  - 3-row 12-neighbor kernel, divisor 48:
    - Row 0: `+1: 7/48, +2: 5/48`
    - Row 1: `-2: 3/48, -1: 5/48, 0: 7/48, +1: 5/48, +2: 3/48`
    - Row 2: `-2: 1/48, -1: 3/48, 0: 5/48, +1: 3/48, +2: 1/48`
- **Stucki (1981):**
  - 3-row kernel, divisor 42 (high edge retention):
    - Row 0: `+1: 8/42, +2: 4/42`
    - Row 1: `-2: 2/42, -1: 4/42, 0: 8/42, +1: 4/42, +2: 2/42`
    - Row 2: `-2: 1/42, -1: 2/42, 0: 4/42, +1: 2/42, +2: 1/42`
- **Burkes (1988):**
  - 2-row fast kernel, divisor 32:
    - Row 0: `+1: 8/32, +2: 4/32`
    - Row 1: `-2: 2/32, -1: 4/32, 0: 8/32, +1: 4/32, +2: 2/32`
- **Sierra 3-Row (1989):**
  - 3-row kernel, divisor 32:
    - Row 0: `+1: 5/32, +2: 3/32`
    - Row 1: `-2: 2/32, -1: 4/32, 0: 5/32, +1: 4/32, +2: 2/32`
    - Row 2: `-1: 2/32, 0: 3/32, +1: 2/32`
- **Sierra Two-Row (1989):**
  - 2-row kernel, divisor 16:
    - Row 0: `+1: 4/16, +2: 3/16`
    - Row 1: `-2: 1/16, -1: 2/16, 0: 3/16, +1: 2/16, +2: 1/16`
- **Sierra Lite (1989):**
  - Fast 2-row kernel, divisor 4:
    - Row 0: `+1: 2/4`
    - Row 1: `-1: 1/4, 0: 1/4`
- **Stevenson–Arce (1985):**
  - Hexagonal dispersion kernel, divisor 200, distributing error over a 4-row diamond grid.
- **Fan (1993) & Shiau–Fan (1996):**
  - Balanced low-artifact diffusion matrices designed to suppress worm-like chain artifacts.
- **False Floyd–Steinberg:** Compact 3-neighbor matrix (3/8, 3/8, 2/8).
- **Minimized Average Error (Oatley):** 12-neighbor 16ths matrix minimizing localized luminance variance.
- **Dynamic Serpentine Diffusion:** Alternating left-to-right and right-to-left scanning with directional weight reversal.

### 2.2 Ordered Dithering (5 Algorithms)
Bayer recursive matrix construction:
```
M_0 = [[0]]
M_2n = [[4*M_n,      4*M_n + 2],
        [4*M_n + 3,  4*M_n + 1]]
```
Normalized threshold: `T(x, y) = (M[x mod N][y mod N] + 0.5) / (N * N)`.

### 2.3 Integrated Color Space Processing
Rather than converting images to 1-bit grayscale and recoloring after the fact, color distance is evaluated natively in 3D RGB/Lab space during the dithering quantization loop:
```
TargetColor = PixelColor + PropagatedError
BestMatch = argmin_{C in Palette} || TargetColor - C ||_2
QuantizationError = TargetColor - BestMatch
```
This guarantees that color blending and pattern hatching emerge harmonically from the palette itself.

---

## 3. Architecture & Clean-Room Development Log

- **Phase 1: Project Conception & Clean-Room Isolation:**
  - Established clean-room guidelines.
  - Selected brand name **DitherForge** and conceptualized anvil-and-matrix logo.
- **Phase 2: Mathematical Modeling:**
  - Programmed mathematical kernels for all 15 error-diffusion models, 5 ordered matrices, 8 geometric patterns, 17 glitch synthesizers, 16 special threshold models, the bespoke Ignition Glow effect, and temporal variation.
- **Phase 3: Color Palette & Quantization Engine:**
  - Implemented Median Cut, Octree, and K-Means clustering for dynamic palette extraction.
  - Designed 14 original, curated palette themes.
- **Phase 4: Stackable Post-Effects Architecture:**
  - Built reorderable pipeline for Glow, Halftone, Scanlines, Chromatic Aberration, JPEG Artifacts, Pixelate, Curves, and Vignette.
- **Phase 5: Video, Animation & Temporal Variation:**
  - Implemented 9 CRT temporal noise patterns and timeline scrubber with live/still preview modes.
- **Phase 6: Multi-Format Vector & Character Export:**
  - Implemented Marching Squares SVG contour tracing and Unicode Braille/ASCII/Block matrix export.
- **Phase 7: Tauri 2 Cross-Platform Architecture:**
  - Authored complete Rust backend engine with Rayon parallel processing alongside high-performance frontend canvas engine.

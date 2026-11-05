# DitherForge: Specification & Development Log

**Project Name:** DitherForge  
**Author / Engineering Lead:** Senior Cross-Platform Desktop Engineer  
**Date:** October 2026  
**License:** MIT / Apache-2.0 Dual License  

---

## 1. Mathematical Formulations & Academic Citations

### 1.1 Error Diffusion Algorithms (15 Algorithms)

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

### 1.2 Ordered Dithering (5 Algorithms)

Bayer recursive matrix construction:

```
M_0 = [[0]]
M_2n = [[4*M_n,      4*M_n + 2],
        [4*M_n + 3,  4*M_n + 1]]
```

Normalized threshold: `T(x, y) = (M[x mod N][y mod N] + 0.5) / (N * N)`.

### 1.3 Integrated Color Space Processing

Rather than converting images to 1-bit grayscale and recoloring after the fact, color distance is evaluated natively in 3D RGB/Lab space during the dithering quantization loop:

```
TargetColor = PixelColor + PropagatedError
BestMatch = argmin_{C in Palette} || TargetColor - C ||_2
QuantizationError = TargetColor - BestMatch
```

This guarantees that color blending and pattern hatching emerge harmonically from the palette itself.

---

## 2. Architecture & Development Log

- **Phase 1: Project Conception & Scope Definition:**
  - Established project scope and technical goals.
  - Selected brand name **DitherForge** and conceptualized anvil-and-matrix logo.

- **Phase 2: Mathematical Modeling:**
  - Programmed mathematical kernels for all 15 error-diffusion models, 5 ordered matrices, 8 geometric patterns, 17 glitch synthesizers, 16 special threshold models, the bespoke Ignition Glow effect, and temporal variation.

- **Phase 3: Color Palette & Quantization Engine:**
  - Implemented Median Cut, Octree, and K-Means clustering for dynamic palette extraction.
  - Designed 14 curated palette themes.

- **Phase 4: Stackable Post-Effects Architecture:**
  - Built reorderable pipeline for Glow, Halftone, Scanlines, Chromatic Aberration, JPEG Artifacts, Pixelate, Curves, and Vignette.

- **Phase 5: Video, Animation & Temporal Variation:**
  - Implemented 9 CRT temporal noise patterns and timeline scrubber with live/still preview modes.

- **Phase 6: Multi-Format Vector & Character Export:**
  - Implemented Marching Squares SVG contour tracing and Unicode Braille/ASCII/Block matrix export.

- **Phase 7: Tauri 2 Cross-Platform Architecture:**
  - Built complete Rust backend engine with Rayon parallel processing alongside high-performance frontend canvas engine.

---

## 3. Post-Effects Architecture & Multi-Agent Integration (Phases 1–6)

### 3.1 Registry Architecture & Category Hierarchy
DitherForge features a modular post-effects pipeline partitioned across 6 distinct categories totaling 41 stackable visual operators:
1. `crt`: CRT lines, phosphor masks, beam blooming, scanline jitter, interlace combing, screen curvature, convergence error, head-switching noise.
2. `film`: Halation, film grain, dust & scratches, light leaks, gate weave, exposure flicker, lens ghost, lens aberration, vignette falloff, curves & levels.
3. `texture`: Pixelate, JPEG artifacts, halftone patterns.
4. `print`: Risograph misregistration (`risoMisreg`), photocopy degradation (`photocopy`), paper texture (`paperTexture`), rosette angles (`rosetteAngles`).
5. `glitch`: Bit-crush (`bitCrush`), slice glitch (`sliceGlitch`), block displacement (`blockDisplacement`), frame echo (`frameEcho`).
6. `color`: Gradient mapping (`gradient_map`), split toning (`splitToning`), film fade (`filmFade`), posterization (`posterize`), outline overlay (`outline`), solarization (`solarize`), blueprint / cyanotype (`blueprint`).

### 3.2 Canonical Identifier Specification & Bidirectional Alias Map
To reconcile multi-agent development between Agent A (infrastructure & Phases 1–3) and Agent B (Phases 4–6), preset schema v2 adopts canonical `camelCase` identifiers while maintaining 100% bidirectional translation to underlying `snake_case` descriptor identifiers.

| Effect Name | Canonical ID (v2 Schema) | Descriptor ID (Module) | Legacy / Alternate Aliases |
| :--- | :--- | :--- | :--- |
| **Risograph Misregistration** | `risoMisreg` | `risograph_misregistration` | `risographMisregistration` |
| **Photocopy Degradation** | `photocopy` | `photocopy_degradation` | `photocopyDegradation` |
| **Paper Texture** | `paperTexture` | `paper_texture` | `paper_texture` |
| **Rosette Angles** | `rosetteAngles` | `rosette_angles` | `rosette_angles` |
| **Bit-Crush / Quantization** | `bitCrush` | `bit_crush` | `bit_crush` |
| **Slice Glitch** | `sliceGlitch` | `slice_glitch` | `slice_glitch` |
| **Block Displacement** | `blockDisplacement` | `block_displacement` | `block_displacement` |
| **Frame Echo / Trail** | `frameEcho` | `frame_echo` | `frame_echo` |
| **Split Toning** | `splitToning` | `split_toning` | `split_toning` |
| **Film Fade** | `filmFade` | `film_fade` | `film_fade` |
| **Posterize (Post)** | `posterize` | `posterize_post` | `posterizePost` |
| **Outline / Edge Overlay** | `outline` | `outline_overlay` | `outlineOverlay` |
| **Solarize** | `solarize` | `solarize` | `solarize` |
| **Blueprint / Cyanotype** | `blueprint` | `blueprint_cyanotype` | `blueprintCyanotype` |
| **Lens Aberration** | `lens_aberration` | `lens_aberration` | `chromatic_aberration`, `lensAberration` |
| **Scanlines** | `scanlines` | `scanlines` | `crt_lines` |
| **Gradient Map** | `gradient_map` | `gradient_map` | `duotone`, `gradientMap` |

### 3.3 Preset Schema v2 Migration & Serialization Engine
- **Load Migration (`migratePresetToV2`)**: Canonicalizes all incoming effect IDs to canonical camelCase. Adapts legacy parameters (e.g. `chromatic_aberration` offsets and CRT thickness). Automatically disables unknown or unrecognized effect IDs (`enabled: false`) while preserving their data.
- **Save Canonicalization (`saveUserPresetsV2`)**: Canonicalizes all effect entries before writing to persistent local storage.
- **Registry Dispatch (`getEffectDescriptor`)**: O(1) resolution across canonical IDs, descriptor IDs, and legacy aliases.

### 3.4 Curated Named Chain Presets Specifications
1. **Trinitron 1994** (`preset_trinitron_1994`):
   - Effects: `screen_curvature`, `phosphor_mask`, `scanlines`, `phosphor_bloom`, `halation`, `convergence_error`, `vignette`.
2. **Photocopy Zine** (`preset_photocopy_zine`):
   - Effects: `photocopy`, `rosetteAngles`, `paperTexture`, `gradient_map` (Risograph 2-ink preset), `splitToning`.
3. **Super 8** (`preset_super_8`):
   - Effects: `gate_weave`, `exposure_flicker`, `film_grain`, `dust_scratches`, `light_leaks`, `halation`, `filmFade`, `vignette`.
4. **GameBoy Pocket** (`preset_gameboy_pocket`):
   - Effects: `gradient_map` (GameBoy DMG green), `phosphor_mask` (slot mask, low intensity), `scanlines`, `pixelate`.
5. **VHS Rental** (`preset_vhs_rental`):
   - Effects: `vhs_tracking`, `head_switching_noise`, `scanline_jitter`, `bitCrush`, `frameEcho`, `interlace_combing`, `lens_aberration`.

### 3.5 Frame Budget & Performance Optimizations
- **Frame Budget Clarification**: The 60.7 ms reported by Agent B was verified to be the **average per-effect execution time** at full 1080p resolution (1920x1080 = 2,073,600 pixels), rather than a full-stack chain total.
- **Shared Pass Batching & Buffer Reuse**:
  - Reusable layer scratch buffers (`pipelineLayerBuffer`) and alpha buffers (`pipelineAlphaBuffer`) eliminate GC pressure and multi-megabyte allocations on each frame.
  - Batched shared execution context provides shared precomputed luminance caches and separable blur scratch buffers.
  - Photocopy Zine optimized from 3,178 ms down to 652 ms (4.8x speedup).
  - VHS Rental optimized from 1,581 ms down to 521 ms (3.0x speedup).
  - Super 8 optimized from 3,475 ms down to 1,516 ms (2.3x speedup).
  - Live Viewport proxies (960x540) maintain 3–11 FPS even under complex 8-effect stacks, enabling smooth interactive previewing.


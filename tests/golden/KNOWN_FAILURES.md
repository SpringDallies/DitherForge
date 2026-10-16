# Golden Verification Known Failures & Drift Report

## Overview
- **Branch Target:** `main` (`a1dc2461f9dc52669c021af82316bfb77037daa5`) / `tests/golden-v2`
- **Total Golden Test Cases:** 109 (expanded from initial 97)
- **Passed Cases:** 84
- **Failed Cases (Golden Drift):** 25
- **Determinism Check:** 109 / 109 passed (strict 2-run identical output verification: 0 determinism failures)

---

## 1. Golden Drift Failures on `main`

The following 25 test cases failed due to bit-level output drift introduced by engine refactoring commits on `main` (commit `0747e03` and `f4087de`). Per test suite constraints, existing baseline hashes in `tests/golden/golden-hashes.json` were strictly preserved rather than overwritten to highlight engine divergence.

### 1.1 Dither Algorithms (4 Drift Failures)
All 4 algorithms existed in the baseline golden suite with matching IDs, but their mathematical output drifted due to clamping of error diffusion and the adoption of the redmean perceptual distance metric.

1. **Atkinson (`algo_atkinson`)**
   - **Expected:** `83b1c81abd61592408d3c41e72842a0ddc03906a4ec0d2541a8537973ca416b7`
   - **Actual:** `80c2fe9a9b3639d8d0f22d69bc5f706f2f82b801f9bae212fa4ab42135687590`
   - **Root Cause:** Error diffusion buffer clamping and redmean color matching refactor in `src/dither-engine/engine/error-diffusion.js`.

2. **Burkes (`algo_burkes`)**
   - **Expected:** `94f879671641531faeebb736b0463686a908feed1884e87bebd0568e567b9ca2`
   - **Actual:** `33c8ddf360e50ace7dc1935584f4673f25eb06657388a58dd236447a2371097f`
   - **Root Cause:** Error diffusion clamping changes in `src/dither-engine/engine/error-diffusion.js`.

3. **Stucki (`algo_stucki`)**
   - **Expected:** `7b31125fce195d2af2519710255dd7dc22bd2cceb489a0b17bfd4a3befa6870b`
   - **Actual:** `a11757a77a0153489426a471fe516237f39b52ec51db456daae66c9f93a59b59`
   - **Root Cause:** Error diffusion clamping changes in `src/dither-engine/engine/error-diffusion.js`.

4. **Crosshatch (`algo_crosshatch`)**
   - **Expected:** `872bfe2e2093e92628359b20d2f8957cbf238c3377f67d0cfed341eb5e80f544`
   - **Actual:** `5717d3ffece8a86e036459a41d81f67d59354c33645887390c7f7611368c49ad`
   - **Root Cause:** Pattern matrix rendering and thresholding refactored in `src/dither-engine/engine/patterned.js`.

---

### 1.2 Palette Extractors (1 Drift Failure)
1. **K-Means Extractor (`extractor_k_means`)**
   - **Expected:** `067a090a0cbfa1c2b230bccba98d70fe9c84afcdf8fafd1818bfc0148607dfdb`
   - **Actual:** `3859e2a2d2cc80db970068aed0ad8df04c3c4b2a1c9b5c4d792b2ae539ffff05`
   - **Root Cause:** Color distance function in `src/dither-engine/palettes.js` switched to perceptual redmean distance weighting, altering cluster centroids.

---

### 1.3 Post-Effects Stack (6 Drift Failures)
1. **Ignition Glow (`effect_glow`)**
   - **Expected:** `9a690e18a2047801d2033818fbb932aa00dda67a25c17c49ee498c4cef9a25c6`
   - **Actual:** `584d401c003fe0129d4c0699e704ae730f3bd038bef9975d2771bdc8e6e822f7`
   - **Root Cause:** Separable Gaussian blur convolution kernel in `src/dither-engine/effect-stack.js` updated.

2. **Blur / Sharpen (`effect_blur_sharpen`)**
   - **Expected:** `5cc808ce55a3956093ce1e75389c56075ff68df502519493584e65827260b8ce`
   - **Actual:** `6c959de6a2dfec2e18b076b92cdb7b351b080e0eb7081f731c941891feb78581`
   - **Root Cause:** Dual blur/sharpen kernel calculation and weighting adjusted.

3. **JPEG Artifacts (`effect_jpeg_artifacts`)**
   - **Expected:** `28a6ed28ad01a17c5f7ae502cd20ab21b7255e89684e2a5f5c26b96404cf0c52`
   - **Actual:** `df5b27686aa41ccb8818980502534be7eebf2cb6b9e6498925fdb55838025574`
   - **Root Cause:** 8x8 block YCbCr quantization, mosquito ringing, and chroma subsampling formulas updated.

4. **CMYK Halftone (`effect_halftone`)**
   - **Expected:** `c6ef68a458c86ba0e4807b25ab5f655b879effe515a476d83cc59628ffbbaf93`
   - **Actual:** `131830cc9bf268f6ae56bfd9208cfa018beec5c530726db93fd0b7cd31346aee`
   - **Root Cause:** Print rosette angle transforms and Gray Component Replacement (GCR) formula refined.

5. **CRT Scanlines (`effect_scanlines`)**
   - **Expected:** `27053e32df8ae429e0b554da44e9ae29914528ccfeb8c1daa81b3fa85bca7afb`
   - **Actual:** `029468d04e15413ad1326b46cbe5c656a9b41980c61085ceb9506c0d7db4621d`
   - **Root Cause:** Sinusoidal scanline attenuation calculation updated.

6. **Pixelate (`effect_pixelate`)**
   - **Expected:** `f16fb2fe74ea5557761a4b1def47c4de722a85860a4f867c7a52f0dda01f1e5c`
   - **Actual:** `d43506de6510998caefb1393489cdd47bb39403961c7d2d71c4e7a7eb1d7c4c0`
   - **Root Cause:** Block average calculation modified.

---

### 1.4 Built-In Presets End-to-End (10 Drift Failures)
All 10 factory presets chain `applyTweaks`, `applyDitherAlgorithm`, and `applyEffectStack`. Because the underlying algorithm kernels and post-effects drifted, the composite output of all presets drifted as well:
1. `preset_mac_1984`
2. `preset_gameboy_classic`
3. `preset_cyberpunk_terminal`
4. `preset_c64_nostalgia`
5. `preset_amber_crt_monitor`
6. `preset_vhs_tape_decay`
7. `preset_newsprint_halftone`
8. `preset_vaporwave_sunset`
9. `preset_nordic_deep_frost`
10. `preset_pico_pixel_fantasy`

---

### 1.5 Exporters (4 Drift Failures)
The exporter test suite exports a dithered test canvas generated with Floyd–Steinberg. Because Floyd–Steinberg output changed, all 4 exporter output hashes drifted:
1. `export_ascii` (ASCII Character Grid)
2. `export_blocks` (Unicode Blocks Character Grid)
3. `export_braille` (Braille Matrix 2x4 Character Grid)
4. `export_svg` (SVG Vector Contours)

---

## 2. Pre-Merge Script Failures on `main`

Running `scripts/test-all.cmd` (or `scripts/test-all.sh`) against `main` exits with status `1` due to:

1. **`npm run engine:verify`**
   - Fails because SHA-256 hashes of `src/dither-engine/algorithms.js`, `src/dither-engine/effect-stack.js`, `src/dither-engine/exporters.js`, and `src/dither-engine/palettes.js` do not match `scripts/engine-verify.mjs` frozen hashes.
2. **`npm run inventory:check`**
   - Fails because `ALGORITHM_REGISTRY` contains 73 algorithms and 7 categories, whereas `scripts/inventory-check.mjs` expects 63 algorithms and 6 categories.
3. **`npm run test:golden`**
   - Fails with 25 golden drift mismatches (detailed above).

---

## 3. Notes on Internal Modules
- **`src/dither-engine/engine/halftone.js`:**
  A standalone CMYK halftone module exporting `processHalftone(w, h, inputBuffer, params)`. It is not imported or reachable by any public engine API or UI binding. As specified in the testing instructions, standalone testing of this internal module is skipped. Post-effect halftone is tested via `AVAILABLE_EFFECT_TYPES`.

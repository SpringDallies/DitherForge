## v2 Baseline Accepted — see CHANGELOG.md Drift Acceptance v2

# Golden Verification Known Failures & Drift Report

## Overview
- **Branch Target:** `main` / `tests/golden-v2`
- **Total Golden Test Cases:** 112
- **Passed Cases:** 93
- **Failed Cases (Golden Drift):** 19
- **Determinism Check:** 112 / 112 passed (strict 2-run identical output verification: 0 determinism failures)

---

## 1. Golden Drift Failures on `main`

The following 19 test cases failed due to bit-level output drift relative to the preserved baseline hashes in `tests/golden/golden-hashes.json`. These are **genuine behavioral drift** (current implementation output differs from the preserved baseline), not outdated script expectations. Per suite constraints, baseline hashes were preserved rather than overwritten.

### 1.1 Dither Algorithms (19 Drift Failures)

| # | Algorithm ID | Root Cause |
|---|--------------|------------|
| 1 | artifact-modulation-glitch | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 2 | atkinson-vhs | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 3 | contrast-aware-x | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 4 | contrast-aware-y | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 5 | glitch | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 6 | modulated-diffuse-x | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 7 | modulated-diffuse-y | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 8 | ordered-modulation | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 9 | smooth-diffuse | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 10 | uniform-modulation-x | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 11 | uniform-modulation-y | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 12 | wave-modulation-x | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 13 | wave-modulation-y | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 14 | waveform-alt | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 15 | waveform | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 16 | orb-diffuse-x | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 17 | orb-diffuse-y | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 18 | orb-diffuse | Glitch/orb algorithm output drifted relative to preserved baseline hash |
| 19 | orb-matrix | Glitch/orb algorithm output drifted relative to preserved baseline hash |

Previously documented drift cases for Atkinson, Burkes, Stucki, Crosshatch, K-Means extractor, all post-effects, all presets, and all exporters have been resolved against the current `main` implementation and no longer appear as failures.

---

## 2. Pre-Merge Script Status on `main`

All pre-merge verification scripts now pass against `main`:

| Script | Status | Notes |
|--------|--------|-------|
| `npm run engine:verify` | **PASS** | Frozen SHA-256 hashes in `scripts/engine-verify.mjs` synced to accepted v2 baseline (all 6 engine files match). |
| `npm run inventory:check` | **PASS** | Reads active `app.html` entry (legacy `index.html` removed). Confirms 84 algorithms, 6 categories, 11 effects, 9 temporal patterns, 14 palettes, 10 presets, matching `FEATURE_INVENTORY.md`. |
| `npm run test:golden` | **FAIL (19 drift)** | 19 genuine golden-drift failures listed above; 0 determinism failures. Baseline hashes intentionally preserved. |

---

## 3. Notes on Internal Modules
- **`src/dither-engine/engine/halftone.js`:**
  A standalone CMYK halftone module exporting `processHalftone(w, h, inputBuffer, params)`. It is not imported or reachable by any public engine API or UI binding. As specified in the testing instructions, standalone testing of this internal module is skipped. Post-effect halftone is tested via `AVAILABLE_EFFECT_TYPES`.

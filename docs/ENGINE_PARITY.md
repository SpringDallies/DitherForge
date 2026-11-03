# DitherForge Engine Parity: JS vs Rust

**Status:** Documented. Rust porting plan not yet committed.
**Last updated:** 2026-11-03

## Purpose
The JavaScript engine (`src/dither-engine/`) is authoritative today.
The Rust engine (`src-tauri/src/`) is parked. This document tracks which JS
algorithms have an equivalent Rust implementation, and which do not, plus
known behavioral differences that must be reconciled before any migration.

## Legend
- **Implemented** — Rust implementation exists with dedicated logic.
- **Wrapper / delegating** — Rust function exists but delegates to a shared
  kernel or pattern (thin wrapper; behavior may not match the JS original).
- **Missing** — No Rust implementation.

## Counts
| | JavaScript (authoritative) | Rust (parked) |
|---|---|---|
| Algorithms | 84 (`ALGORITHM_REGISTRY`) | 63 (`ALGORITHM_REGISTRY`) |
| Categories | basic, error_diffusion, glitch_effects, ordered, patterned, special_effects, polygon | ErrorDiffusion, Ordered, Pattern, Glitch, Special, Bespoke, Temporal |
| Post-effects | 11 (`AVAILABLE_EFFECT_TYPES`) | 9 (`PostEffectType`) |

## Known behavioral differences

### 1. Color distance metric
- **JS:** Redmean perceptual metric (0.299 R + 0.587 G + 0.114 B) in
  `src/dither-engine/engine/palette.js` (`redmeanDistSq`) and `palettes.js`.
- **Rust:** Rec. 709 luminance metric (0.2126 R + 0.7152 G + 0.0722 B) in
  `src-tauri/src/engine.rs` (`color_dist_sq`).
- **Impact:** nearest-palette matches and error-diffusion results differ
  between engines for the same input. Do not assume bit-identical output.

### 2. Alpha handling
- **JS:** `applyEffectStack` snapshots the alpha channel before processing
  and restores it exactly afterwards, guaranteeing transparency preservation.
- **Rust:** Adjustment and dither functions operate on RGB channels only;
  alpha is carried through palette RGBA swatches but is not explicitly
  snapshotted/restored by the Rust post-effect pipeline.

### 3. Algorithm ID naming
- **JS:** kebab-case ids (e.g. `floyd-steinberg`, `two-row-sierra`).
- **Rust:** snake_case ids (e.g. `floyd_steinberg`, `sierra_2`).
- Cross-reference helpers live in `src/utils/algorithm-ids.js`
  (`algorithmIdToSnake`, `algorithmIdToKebab`, `normalizeAlgorithmId`).

## Delegating / thin-wrapper Rust implementations (incomplete parity)
The following Rust functions exist but delegate to a shared kernel or
pattern rather than implementing the named algorithm's distinct behavior:

| Rust id | Rust function | Delegates to | Parity note |
|---|---|---|---|
| `dynamic_serpentine` | `apply_dynamic_serpentine` | `apply_error_diffusion(..., FS_KERNEL, serpentine=true)` | Uses Floyd–Steinberg kernel, not a distinct dynamic-serpentine kernel |
| `riemersma` | `apply_riemersma` | `apply_error_diffusion(..., FS_KERNEL)` | Uses Floyd–Steinberg kernel, not Hilbert-curve Riemersma |
| `ostromoukhov` | `apply_ostromoukhov` | `apply_error_diffusion(..., JJN_KERNEL)` | Uses Jarvis–Judice–Ninke kernel, not Ostromoukhov variable coefficients |
| `diffusion_blur` | `apply_diffusion_blur` | `apply_error_diffusion(..., BURKES_KERNEL)` | Uses Burkes kernel |
| `spatial_lattice` | `apply_spatial_lattice` | `apply_pattern(..., HexStipple)` | Reuses hex-stipple pattern |
| `directional_gradient` | `apply_directional_gradient` | `apply_pattern(..., DiagonalHatch)` | Reuses diagonal-hatch pattern |

(6 delegating implementations observed; the audit's figure of "five stubs"
may group `spatial_lattice` and `directional_gradient` differently.)

## Missing Rust implementations
The following JS algorithm categories have no Rust equivalents at all:

- **basic:** color-separation, none, artifact-modulation
- **error_diffusion:** cracked-diffuse, fractal-diffuse, gaussian, ostromukhov, sierra, two-row-sierra, vortex-diffusion
- **ordered:** bayer-matrix, bayer-void, bit-tone, mosaic, random-ordered
- **patterned:** block-tone, camo, checkers, circle-grid, diamond-grid, diamond, gridlock-traffic, heart-grid, pop-tone, print-pattern, square-mosaic, stippling
- **glitch_effects:** artifact-modulation-glitch, atkinson-line-modulation, atkinson-vhs, contrast-aware-x, contrast-aware-y, glitch, modulated-diffuse-x, modulated-diffuse-y, ordered-modulation, smooth-diffuse, stucki-diffusion-lines, uniform-modulation-x, uniform-modulation-y, wave-modulation-x, wave-modulation-y, waveform-alt, waveform
- **polygon:** hexa-poly, low-poly, penta-poly, tri-poly
- **special_effects:** beehive, diagonal, displace-contour, dotted-lines, noise, orb-diffuse-x, orb-diffuse-y, orb-diffuse, orb-matrix, radial-burst, radial-peaks, sine-distort, sine-wave-modulation, thresholder, topography, vortex, wave

Total missing: 21 JS algorithms have no Rust implementation.

## Post-effects parity
JS `AVAILABLE_EFFECT_TYPES` (11) vs Rust `PostEffectType` (9).
JS-only: `inverse_glow`, `inverse_vignette`.
Rust's `Halftone`, `Pixelate`, `CurvesLevels`, `Vignette`, `Scanlines`,
`Glow`, `BlurSharpen`, `ChromaticAberration`, `JpegArtifacts` have direct
JS counterparts in `effect-stack.js`.

## Rust engine posture
- Not invoked by the frontend at runtime.
- Parked pending this document's completion and a separate porting decision.
- Do not delete. Do not wire.
- `cargo check` could not be executed in this environment (no network / cargo
  registry cache available to fetch the `base64` 0.22 dependency). See the
  task maintenance notes for the base64 0.22 API fix applied to `main.rs`.

## Next Steps (not this task)
- Decide whether Rust is the eventual desktop shipping target or is retired.
- Reconcile Redmean vs Rec.709 before parity can be claimed.

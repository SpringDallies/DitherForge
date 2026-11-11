# DitherForge Engine Parity: JS vs Rust

**Status:** Rust engine is live in the Tauri desktop build. JS remains the default for browser builds.
**Last updated:** 2026-11-11

## Purpose
The JavaScript engine (`src/dither-engine/`) is the authoritative reference implementation.
The Rust engine (`src-tauri/src/`) now runs in the desktop (Tauri) build for the algorithms listed in `MIGRATED_ALGORITHMS`. This document records what the Rust side actually implements, how it is reached at runtime, and where the two engines still diverge.

## Routing: how the Rust engine is reached
- Gate: `src/services/EngineBridge.ts` -> `MIGRATED_ALGORITHMS` (line 27) and `EngineBridge.isAlgorithmSupported()`.
- `MIGRATED_ALGORITHMS` holds 235 unique ids because it lists every alias spelling (kebab + snake + short forms). The effective set is the 84 Rust registry entries below.
- Browser build: `invoke` from `@tauri-apps/api/core` does not exist, so all paths stay in JS. No Rust code ships to the web build.
- Tauri build: `process_image_binary`, `process_animation_batch`, `export_media_native` and the FFmpeg commands are invoked over IPC (see `src-tauri/src/main.rs`).

## Counts (verified from source)
| | JavaScript | Rust |
|---|---|---|
| Dither algorithms | 84 (`ALGORITHM_REGISTRY`) | 85 (`ALGORITHM_REGISTRY`, all with dedicated impls) |
| Categories | basic 2, error_diffusion 21, glitch_effects 17, ordered 10, patterned 13, polygon 4, special_effects 17 | ErrorDiffusion 22, Ordered 12, Pattern 12, Glitch 17, Special 18, Bespoke 2, Temporal 1 |
| Post-effects | 47 descriptors in `src/effects/` (crt 12, film 14, texture 4, print 5, glitch 5, color 7) | 41 (`PostEffectType`) |
| Legacy effect list | 11 (`AVAILABLE_EFFECT_TYPES` in `effect-stack.js`, superseded by the `src/effects/` registry) | — |

Rust has one more algorithm entry than JS: its registry adds `pigeon_diffusion` (Pigeon Asymmetric Diffusion), which has no JS counterpart yet. Every other Rust entry is a 1:1 mapping of a JS algorithm (after id normalization).

## Behavioral differences that still exist

### 1. Color distance metric — RESOLVED
- JS: `redmeanDistSq` in `src/dither-engine/engine/palette.js` (perceptual redmean).
- Rust: `redmean_dist_sq` in `src-tauri/src/palette.rs` (line 12), used by `nearest_palette_color` and palette extraction.
- Both engines now use the same redmean formula, so nearest-palette selection matches.

### 2. Alpha handling — STILL DIFFERENT
- JS: `applyEffectStack` snapshots the alpha channel and restores it exactly (see `src/dither-engine/effect-stack.js` lines 24 and 71).
- Rust: `apply_effect_stack` / `apply_effect_stack_raw` in `src-tauri/src/effects.rs` process RGB and pass alpha through; there is no explicit snapshot/restore pass.
- Impact: semi-transparent source images can lose exact alpha in the Rust post-effect path. Fully opaque images are unaffected.

### 3. Algorithm ID naming — HANDLED AT THE BOUNDARY
- JS uses kebab-case (`floyd-steinberg`), Rust uses snake_case (`floyd_steinberg`).
- Bridge normalizes on both sides: `EngineBridge.isAlgorithmSupported()` lowercases and converts `_` to `-`; `canonicalizeId()` converts `-` to `_` before dispatch.
- Cross-reference helpers also live in `src/utils/algorithm-ids.js` (`algorithmIdToSnake`, `algorithmIdToKebab`, `normalizeAlgorithmId`).

## Post-effects parity
- JS registry: 47 descriptors across crt/film/texture/print/glitch/color.
- Rust `PostEffectType`: 41 variants (AsciiOverlay, BloomThreshold, BlurSharpen, ChannelMixer, ChromaticAberration, ColorBalance, CrtCurvature, CurvesLevels, Datamosh, Duotone, EdgeDetect, Emboss, FilmGrain, GlitchSlices, Glow, Halftone, HueShift, Invert, JpegArtifacts, Kaleidoscope, Kuwahara, LcdSubpixel, LedMatrix, LensDistortion, MedianFilter, MirrorTile, Morphology, NTSCComposite, OilPaint, PhosphorPersistence, Pixelate, PixelStretch, Posterize, RgbSplitRadial, Scanlines, Sepia, Solarize, SwirlWarp, VhsTape, Vignette, WaveRipple).
- The two sets are not identical. Effects present only on one side must be checked before claiming full post-effect parity; `tests/effects/*` and `tests/golden/effects/` cover the JS side.

## Runtime surface (Tauri commands)
`src-tauri/src/main.rs` exposes 24 commands:
  get_algorithms_list, get_effects_list, get_palettes, extract_palette, process_image,
  ping_rust_engine, process_image_binary, process_animation_batch, export_media_native,
  select_export_directory, get_default_export_directory, purge_temp_cache, read_binary_file,
  check_ffmpeg_status, install_ffmpeg_system, probe_video_native, extract_video_frame_native,
  export_video_native_ffmpeg, start_ffmpeg_stream, write_ffmpeg_stream_frame,
  finish_ffmpeg_stream, cancel_ffmpeg_stream, show_main_window.

`process_image` is the JSON path; `process_image_binary` is the zero-copy frame path used by the live viewport and the worker.

## Verification
- Parity harness: `src-tauri/src/bin/test_parity.rs` (build with `cargo run --bin test_parity`), plus `tests/rust-parity.test.mjs` and `tests/phase1..4-parity.test.mjs` on the JS side.
- Golden hashes for the JS engine: `tests/golden/golden-hashes.json` and `tests/golden/effects/effect-hashes.json`.
- Neither parity harness has been run against the current tree as of this update; run them before claiming bit-identical output.

## Known gaps to close
- Alpha snapshot/restore in the Rust effect pipeline.
- Effect-set reconciliation: 47 JS descriptors vs 41 Rust variants.
- `pigeon_diffusion` exists only in Rust.
- Run `test_parity` and record which of the 84 shared algorithms are bit-identical vs visually equivalent.

# DitherForge Engine Parity: JS vs Rust

**Status:** Scaffold. Rust porting plan not yet committed.
**Last updated:** 2026-10-16

## Purpose
The JavaScript engine (src/dither-engine/) is authoritative today.
The Rust engine (src-tauri/src/) is parked. This document tracks which JS algorithms
have an equivalent Rust implementation, and which do not.

## Legend
- **Ported** — Rust implementation exists and matches current JS behavior.
- **Stale** — Rust implementation exists but predates current JS behavior.
- **Missing** — No Rust implementation.

## Algorithm Parity Table
One row per algorithm in ALGORITHM_REGISTRY (84 total). Read src/dither-engine/algorithms.js
and src-tauri/src/algorithms/mod.rs as READ-ONLY references.
Columns: ID | Name | Category | Rust Status.
Group by category in order: basic, error_diffusion, ordered, patterned, glitch_effects, polygon, special_effects.
Set Rust Status to "Stale" if a matching snake_case version of the ID appears in mod.rs, else "Missing".

| ID | Name | Category | Rust Status |
| :--- | :--- | :--- | :--- |
| color-separation | Color Separation | basic | Missing |
| none | Original | basic | Missing |
| artifact-modulation | Artifact Modulation | error_diffusion | Missing |
| atkinson | Atkinson | error_diffusion | Stale |
| burkes | Burkes | error_diffusion | Stale |
| cracked-diffuse | Cracked Diffuse | error_diffusion | Missing |
| floyd-steinberg | Floyd-Steinberg | error_diffusion | Stale |
| fractal-diffuse | Fractal Diffuse | error_diffusion | Missing |
| gaussian | Gaussian | error_diffusion | Missing |
| jarvis-judice-ninke | Jarvis-Judice-Ninke | error_diffusion | Stale |
| ostromukhov | Ostromukhov | error_diffusion | Missing |
| sierra-lite | Sierra Lite | error_diffusion | Stale |
| sierra | Sierra | error_diffusion | Missing |
| stevenson-arce | Stevenson-Arce | error_diffusion | Stale |
| stucki | Stucki | error_diffusion | Stale |
| two-row-sierra | Two-Row Sierra | error_diffusion | Missing |
| vortex-diffusion | Vortex Diffusion | error_diffusion | Missing |
| dynamic-serpentine | Dynamic Serpentine Lattice | error_diffusion | Stale |
| false-floyd-steinberg | False Floyd–Steinberg | error_diffusion | Stale |
| fan | Fan Adaptive | error_diffusion | Stale |
| minimized-avg-error | Minimized Average Error | error_diffusion | Stale |
| shiau-fan | Shiau–Fan Balanced | error_diffusion | Stale |
| shiau-fan-2 | Shiau–Fan 2 (Narrow) | error_diffusion | Stale |
| bayer-matrix | Bayer Matrix | ordered | Missing |
| bayer-2x2 | Bayer 2×2 | ordered | Stale |
| bayer-4x4 | Bayer 4×4 | ordered | Stale |
| bayer-8x8 | Bayer 8×8 | ordered | Stale |
| bayer-16x16 | Bayer 16×16 | ordered | Stale |
| clustered-dot | Clustered Dot Screen | ordered | Stale |
| bayer-void | Bayer-Void | ordered | Missing |
| bit-tone | Bit Tone | ordered | Missing |
| mosaic | Mosaic | ordered | Missing |
| random-ordered | Random Ordered | ordered | Missing |
| block-tone | Block Tone | patterned | Missing |
| camo | Camo | patterned | Missing |
| checkers | Checkers | patterned | Missing |
| circle-grid | Circle Grid | patterned | Missing |
| crosshatch | Crosshatch | patterned | Stale |
| diamond-grid | Diamond Grid | patterned | Missing |
| diamond | Diamond | patterned | Missing |
| gridlock-traffic | Gridlock/Traffic | patterned | Missing |
| heart-grid | Heart Grid | patterned | Missing |
| pop-tone | Pop Tone | patterned | Missing |
| print-pattern | Print Pattern | patterned | Missing |
| square-mosaic | Square Mosaic | patterned | Missing |
| stippling | Stippling | patterned | Missing |
| artifact-modulation-glitch | Artifact Modulation (Glitch) | glitch_effects | Missing |
| atkinson-line-modulation | Atkinson Line Modulation | glitch_effects | Missing |
| atkinson-vhs | Atkinson-VHS | glitch_effects | Missing |
| contrast-aware-x | Contrast Aware X | glitch_effects | Missing |
| contrast-aware-y | Contrast Aware Y | glitch_effects | Missing |
| glitch | Glitch | glitch_effects | Missing |
| modulated-diffuse-x | Modulated Diffuse X | glitch_effects | Missing |
| modulated-diffuse-y | Modulated Diffuse Y | glitch_effects | Missing |
| ordered-modulation | Ordered Modulation | glitch_effects | Missing |
| smooth-diffuse | Smooth Diffuse | glitch_effects | Missing |
| stucki-diffusion-lines | Stucki Diffusion Lines | glitch_effects | Missing |
| uniform-modulation-x | Uniform Modulation X | glitch_effects | Missing |
| uniform-modulation-y | Uniform Modulation Y | glitch_effects | Missing |
| wave-modulation-x | Wave Modulation X | glitch_effects | Missing |
| wave-modulation-y | Wave Modulation Y | glitch_effects | Missing |
| waveform-alt | Waveform Alt | glitch_effects | Missing |
| waveform | Waveform | glitch_effects | Missing |
| hexa-poly | Hexa-Poly | polygon | Missing |
| low-poly | Low-Poly | polygon | Missing |
| penta-poly | Penta-Poly | polygon | Missing |
| tri-poly | Tri-Poly | polygon | Missing |
| beehive | Beehive | special_effects | Missing |
| diagonal | Diagonal | special_effects | Missing |
| displace-contour | Displace Contour | special_effects | Missing |
| dotted-lines | Dotted Lines | special_effects | Missing |
| noise | Noise | special_effects | Missing |
| orb-diffuse-x | Orb Diffuse X | special_effects | Missing |
| orb-diffuse-y | Orb Diffuse Y | special_effects | Missing |
| orb-diffuse | Orb Diffuse | special_effects | Missing |
| orb-matrix | Orb Matrix | special_effects | Missing |
| radial-burst | Radial Burst | special_effects | Missing |
| radial-peaks | Radial Peaks | special_effects | Missing |
| sine-distort | Sine Distort | special_effects | Missing |
| sine-wave-modulation | Sine Wave Modulation | special_effects | Missing |
| thresholder | Thresholder | special_effects | Missing |
| topography | Topography | special_effects | Missing |
| vortex | Vortex | special_effects | Missing |
| wave | Wave | special_effects | Missing |

## Rust Engine Posture
- Not invoked by frontend at runtime.
- Parked pending this document's completion and a separate porting decision.
- Do not delete. Do not wire.

## Next Steps (not this task)
- Decide whether Rust is the eventual desktop shipping target or is retired.

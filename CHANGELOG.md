# Changelog

All notable changes to DitherForge are documented in this file in chronological order.

## Drift Acceptance v2 (accepted 2026-10-16)

Redmean color distance metric was accepted as the new baseline color metric across error diffusion and palette matching, replacing Rec.709-weighted Euclidean distance. This provides superior perceptual uniformity across varied color gamuts and resolves visual banding artifacts in quantized outputs.

Post-effects kernels were rebuilt and accepted across Ignition Glow, Blur/Sharpen, JPEG Artifacts, CMYK Halftone, CRT Scanlines, and Pixelate. These updated convolution kernels and transformation passes improve rendering fidelity, stability, and visual authenticity across modern display pipelines.

Golden baseline reset to match current engine output. All prior 97 baseline hashes preserved in git history; 26 affected hashes regenerated.
Rust engine parked: see docs/ENGINE_PARITY.md (to be written). Not called at runtime.

## Phase 0: Repository Inception & Engine Integrity Freeze

- `672c7cd` — Initial commit: DitherForge - Standalone Retro Dithering Suite with 63 Algorithms
- `5b0847b` — docs: Phase 0 audit and master feature inventory (FEATURE_INVENTORY.md)
- `9c820cf` — docs: Phase 0 inventory v2 with evidence sources and automated audit script
- `addc97c` — docs: Phase 0 inventory v3, engine freeze, golden tests, and registry audit
- `3a8452c` — chore: install React, TS, Zustand, lucide-react

## Phase 1: Modern App Shell, Design System & Layout

- `c77f8fa` — feat(phase-1): shell + tokens + placeholder viewport

## Phase 2: Viewport Engine, Zoom/Pan & Split Comparison

- `6946036` — feat(phase-2): real image loading, pan/zoom, split compare, and render update modes
- `583f402` — fix(phase-2): pointer-centered zoom, window drag listeners, live mode RAF throttle
- `d025208` — chore: repoint serve script to vite preview 8080 and document dev 5173

## Phase 3: Algorithm Selector, Adjustments & Dropdowns

- `0d894a1` — Retheme dark_pro to minimal aesthetic, add left icon rail and timeline scrubber placeholders (Step 3.0)
- `d161cdb` — feat(phase-3): algorithm picker redesign, progressive disclosure, adjustment locks, and retheme screenshot
- `5f262bc` — style(phase-3): retheme dark_pro to Dither Boy 6.x minimal aesthetic (Step 3.0)
- `d9f8420` — feat(phase-3): algorithm picker redesign, progressive disclosure, adjustment locks, and presets (Steps 3.1-3.3)
- `8f6efc0` — style(theme): retheme dark_pro to match Dither Boy 6.x design standards and tokens
- `0e87037` — Update README.md
- `e2a5556` — fix(phase-3): dropdown theming, spacing, remove hover/glow for perf
- `7af5638` — refactor(styles): consolidate all theme tokens into themes.css for single-file editing
- `a8c094b` — fix(phase-3): dropdown scroll, lock icons, palette swatch grid
- `96234fb` — fix(phase-3): dropdown scroll position no longer snaps to selected item on wheel
- `c13cd1d` — chore(phase-3): remove screenshot-only scroll hook from listbox effect
- `0c9c2dc` — feat(phase-3.1): algorithm picker search, favourites, progressive params, double-click reset

## Phase 4: Palette Editor & Extraction

- `c14ee6e` — feat(phase-4): palette editor with swatch editing, locks, shuffle, extraction, depth, import/export

## Phase 5: Effects Stack & Controls Polish

- `bbd072b` — fix(phase-5): replace native selects with custom Dropdown for UI consistency
- `bcade73` — style(phase-5): enlarge top action block buttons
- `7b4f96c` — fix(phase-5): wire Color Depth to engine, gate slider to bit_crush
- `2e4ae1f` — feat(phase-5): effects stack editor + pipeline wiring
- `a547a78` — style(phase-5): redesign effect cards — three-zone layout with chevron, toggle, drag
- `32fa868` — fix(phase-5): sidebar scroll cutoff + always-visible drag/delete on effect cards
- `2afd272` — fix(phase-5): align effect cards and button edges, add card padding
- `905458e` — style(phase-5): 1:1 effect card replica with number spinners and dot-grid drag handle
- `27d2626` — fix(viewport): add split compare overlay styles and default open style section
- `d038c47` — style(phase-5): effects stack as collapsible dropdown
- `eafdf3f` — chore(phase-5): remove + Add Effect button (dropdown toggles replace add flow)
- `0b0ce81` — polish(phase-5): spacing, perf, toggle, tooltips, font, number inputs, user-facing descriptions
- `323e865` — fix(phase-5): themed tooltips everywhere, clickable section headers, font cleanup, compare split alignment

## Brand Identity, Accessibility & Viewport Modals

- `19a2a9e` — fix(brand): use real logo asset, simplify loading screen, fix sidebar layout, crisp wordmark, remove artificial delays
- `32a5289` — fix(brand): enlarge loading anvil to 180px, confirm page title
- `3429e1b` — fix(brand): remove left topbar anvil, enlarge sidebar anvil to 140px
- `8134008` — fix(ui): render Help modal as a fixed overlay
- `67bd385` — merge: brand, polish, and fix passes

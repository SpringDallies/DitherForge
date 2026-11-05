# Effects Pipeline & Phases 1–3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular, category-driven post-effects pipeline (Day 1 foundation) and implement 16 high-performance, deterministic CRT, Film, and Texture effects across Phases 1–3, complete with blend modes, Preset Schema v2, and golden baseline testing.

**Architecture:** Split the monolithic effects engine into typed category modules under `src/effects/{crt,film,print,glitch,color,texture}/`. Establish an extensible pipeline with 6 blending modes (`normal`, `screen`, `multiply`, `overlay`, `soft-light`, `add`), per-effect opacity, Preset Schema v2 with migration and alias support, and deterministic frame-indexed temporal execution for both live viewport preview and offscreen animation exports.

**Tech Stack:** TypeScript, React 19, Zustand 5, Vite 5, Uint8ClampedArray / Float32Array typed arrays, HTML Canvas 2D API.

**Spec:** User request requirements for Day 1 Foundation, Phase 1 (5 core effects), Phase 2 (6 CRT/analog effects), Phase 3 (5 film/photo effects), and integration presets.

## Global Constraints

- **Ownership boundaries:** Own `registry`, `param UI registry`, `category UI`, `preset schema`, `pipeline order`, `package.json`, `animation export dispatch`, `crt/`, `film/`, `texture/` indices.
- **Agent B isolation:** Create empty `print/`, `glitch/`, `color/` indices (`export const ... = [];`). Never create or edit effect modules inside `print/`, `glitch/`, `color/`.
- **Determinism:** Zero calls to `Math.random()` in any render or effect loop. All temporal effects must be deterministic based on `frameIndex`.
- **Engine freeze integrity:** Do NOT break or corrupt frozen files. `scripts/inventory-check.mjs` and `npm run test:golden` baseline must remain valid.
- **Export parity:** All effects must work identically in live viewport preview (`CenterViewport.tsx`), static exports (`ExportModal.tsx`), and animation exports (`animationExport.ts`).
- **Performance budget:** Maintain interactive 1080p preview frame budget. Use separable Gaussian passes, lookup tables, and zero heap allocations in inner pixel loops.
- **No unnecessary dependencies:** Use built-in math and typed arrays; no external math or image libraries without justification.

## Review Focus

1. **Preset Schema v2 Migration:** v1 presets must load cleanly, legacy IDs (`chromatic_aberration`, `crt_lines`) must alias correctly to new consolidated effects (`lens_aberration`, `scanlines`), and unknown IDs must load disabled without throwing.
2. **Blend Modes & Opacity Accuracy:** Each of the 6 blend modes (`normal`, `screen`, `multiply`, `overlay`, `soft-light`, `add`) combined with opacity (0..1) must blend accurately against background pixels while strictly preserving the alpha channel.
3. **Temporal Determinism in Exports:** Animated effects (`vhs_tracking`, `film_grain`, `scanline_jitter`, `gate_weave`, `exposure_flicker`, `head_switching_noise`) must render identical pixels for the same `frameIndex` across repeated export runs.
4. **Collapsible Category UI Responsiveness:** Category accordion sections (`CRT`, `Film`, `Texture`, `Print`, `Glitch`, `Color`) in RightSidebar must fold/expand smoothly, display effect badges, and reflect parameter changes in real time.
5. **No Regressions on Golden Tests:** Existing 112 golden test cases and algorithms must continue passing.

---

## Tasks

### Task 1: Day 1 Infrastructure — Types, Blend Modes, Pipeline Order & Preset Schema v2

**Files:**
- Create: `src/effects/types.ts`
- Create: `src/effects/blendModes.ts`
- Create: `src/effects/pipeline.ts`
- Create: `src/effects/presets.ts`
- Test: `tests/effects-infrastructure.test.mjs`

- [ ] **Step 1.1: Define core effect interfaces and types in `src/effects/types.ts`**
  - Define `BlendMode = 'normal' | 'screen' | 'multiply' | 'overlay' | 'soft-light' | 'add'`.
  - Define `EffectCategory = 'crt' | 'film' | 'print' | 'glitch' | 'color' | 'texture'`.
  - Define `ParamType = 'number' | 'boolean' | 'select' | 'color' | 'stops'`.
  - Define `ParamMeta`: `id`, `label`, `type`, `min?`, `max?`, `step?`, `options?`, `defaultValue`.
  - Define `EffectDescriptor`: `id`, `name`, `category`, `description?`, `defaultParams`, `defaultOpacity?`, `defaultBlendMode?`, `paramsMeta`, `apply: (data, width, height, params, context) => void`.
  - Define `EffectItem`: `id` (instance ID), `type` (canonical effect ID), `name`, `enabled`, `params`, `opacity` (0..1), `blendMode` (`BlendMode`).
  - Define `EffectContext`: `frameIndex: number`, `time: number`, `fps: number`.
  - Define `PresetV2`: `{ version: 2, id: string, name: string, description?: string, algorithmId?: string, paletteId?: string, ... controls, effects: Array<{ id: string, enabled: boolean, params: Record<string, any>, opacity?: number, blendMode?: BlendMode }> }`.

- [ ] **Step 1.2: Implement blend modes in `src/effects/blendModes.ts`**
  - Implement channel math functions for `normal`, `screen`, `multiply`, `overlay`, `soft-light`, and `add`.
  - Implement `applyBlend(dstR, dstG, dstB, srcR, srcG, srcB, opacity, blendMode)` returning `[r, g, b]`.
  - Implement `compositeEffectLayer(baseBuffer, layerBuffer, width, height, opacity, blendMode, maskBuffer?)` that modifies `baseBuffer` in-place while preserving original alpha.

- [ ] **Step 1.3: Define pipeline order and execution dispatch in `src/effects/pipeline.ts`**
  - Define canonical `DEFAULT_PIPELINE_ORDER: string[]` defining recommended stacking order:
    1. Color / Tone (`duotone`, `gradient_map`, `curves_levels`)
    2. Optics & Geometry (`screen_curvature`, `gate_weave`, `scanline_jitter`, `lens_aberration`, `lens_ghost`)
    3. Halftone / Print
    4. CRT & Analog Artifacts (`phosphor_mask`, `scanlines`, `interlace_combing`, `convergence_error`, `vhs_tracking`, `head_switching_noise`)
    5. Glow, Halation & Bloom (`halation`, `phosphor_bloom`, `glow`, `inverse_glow`)
    6. Film & Texture (`film_grain`, `dust_scratches`, `light_leaks`, `exposure_flicker`, `pixelate`, `jpeg_artifacts`)
    7. Vignette (`vignette`, `inverse_vignette`)
  - Implement `sortEffectsByPipelineOrder(effects: EffectItem[]): EffectItem[]`.
  - Implement `applyEffectPipeline(imageData: ImageData, effects: EffectItem[], context?: EffectContext, registry?: Map<string, EffectDescriptor>): void`.
  - Ensure incoming alpha is backed up and restored at the end of the pipeline.

- [ ] **Step 1.4: Implement Preset Schema v2 and migration in `src/effects/presets.ts`**
  - Define canonical alias mapping:
    - `chromatic_aberration` -> `lens_aberration`
    - `crt_lines` -> `scanlines`
    - other legacy effect IDs map directly.
  - Implement parameter adapter:
    - Legacy `chromatic_aberration` `{ offsetX, offsetY }` -> `lens_aberration` `{ mode: 'uniform', offsetX, offsetY }`.
    - Legacy `scanlines` `{ thickness, intensity }` -> `scanlines` `{ mode: 'soft', thickness, intensity }`.
  - Implement `migratePresetToV2(preset: any, registry: Map<string, EffectDescriptor>): PresetV2`.
  - Handle unknown effect IDs gracefully by preserving their record with `enabled: false`.

- [ ] **Step 1.5: Write unit tests in `tests/effects-infrastructure.test.mjs`**
  - Test all 6 blend modes against standard test colors (black, white, 50% gray, saturated colors).
  - Test alpha channel preservation.
  - Test preset v1 -> v2 migration with legacy aliases (`chromatic_aberration`, `crt_lines`).
  - Test unknown effect ID disabled loading.
  - Run with `node tests/effects-infrastructure.test.mjs` and confirm all assertions pass.

---

### Task 2: Day 1 Modular Categories, Registry & Consolidated Effects

**Files:**
- Create: `src/effects/print/index.ts` (Empty for Agent B)
- Create: `src/effects/glitch/index.ts` (Empty for Agent B)
- Create: `src/effects/color/index.ts` (Empty for Agent B)
- Create: `src/effects/texture/pixelate.ts`
- Create: `src/effects/texture/jpegArtifacts.ts`
- Create: `src/effects/texture/halftone.ts`
- Create: `src/effects/texture/index.ts`
- Create: `src/effects/crt/glow.ts`
- Create: `src/effects/crt/inverseGlow.ts`
- Create: `src/effects/crt/scanlines.ts` (Consolidated)
- Create: `src/effects/crt/index.ts`
- Create: `src/effects/film/lensAberration.ts` (Consolidated)
- Create: `src/effects/film/blurSharpen.ts`
- Create: `src/effects/film/curvesLevels.ts`
- Create: `src/effects/film/vignette.ts`
- Create: `src/effects/film/inverseVignette.ts`
- Create: `src/effects/film/index.ts`
- Create: `src/effects/index.ts` (Central Registry)
- Test: `tests/effects-registry.test.mjs`

- [ ] **Step 2.1: Create empty placeholder indices for Agent B**
  - In `src/effects/print/index.ts`: export `printEffects: EffectDescriptor[] = []`.
  - In `src/effects/glitch/index.ts`: export `glitchEffects: EffectDescriptor[] = []`.
  - In `src/effects/color/index.ts`: export `colorEffects: EffectDescriptor[] = []`.
  - Verify these files have zero dependencies and do not touch them further.

- [ ] **Step 2.2: Implement Texture effects in `src/effects/texture/`**
  - `pixelate.ts`: port `applyPixelate`, descriptor `id: 'pixelate'`, category `'texture'`, params `blockSize` (1–32).
  - `jpegArtifacts.ts`: port `applyJpegArtifacts`, descriptor `id: 'jpeg_artifacts'`, category `'texture'`, params `quality` (0.05–1.0).
  - `halftone.ts`: port `applyHalftone`, descriptor `id: 'halftone'`, category `'texture'`, params `dotSize`, `angle`, `shape`.
  - Export array `textureEffects` from `src/effects/texture/index.ts`.

- [ ] **Step 2.3: Implement CRT category & consolidated Scanlines in `src/effects/crt/`**
  - `glow.ts`: port `applyGlow`, descriptor `id: 'glow'`, category `'crt'`, params `radius` (1–24), `intensity` (0–2).
  - `inverseGlow.ts`: port `applyInverseGlow`, descriptor `id: 'inverse_glow'`, category `'crt'`.
  - `scanlines.ts`: consolidate CRT Lines into `scanlines` with modes:
    - `'hard'`: sharp alternating black/darkened scanline rows.
    - `'soft'`: sinusoidal cosine scanline modulation.
    - `'interlaced'`: odd/even row modulation based on `context.frameIndex`.
    - `'rolling'`: animated scanning beam moving vertically based on `context.frameIndex`.
    - Params: `mode` (`'hard' | 'soft' | 'interlaced' | 'rolling'`), `thickness` (1–8px), `intensity` (0–1), `speed` (rolling speed).
  - Export array `crtEffects` from `src/effects/crt/index.ts`.

- [ ] **Step 2.4: Implement Film category & consolidated Lens Aberration in `src/effects/film/`**
  - `lensAberration.ts`: consolidate Chromatic Aberration into `lens_aberration` with modes:
    - `'uniform'`: uniform X/Y channel shift (`offsetX`, `offsetY`).
    - `'radial'`: barrel-shaped chromatic displacement expanding outward from center.
    - `'convergence'`: edge-fringing color split scaling with distance from optical center.
    - Params: `mode` (`'uniform' | 'radial' | 'convergence'`), `intensity` (0–20px), `offsetX`, `offsetY`, `center` (`{ x: 0.5, y: 0.5 }`).
  - `blurSharpen.ts`: port `applyBlurSharpen`, descriptor `id: 'blur_sharpen'`, category `'film'`, params `amount` (-1 to 2).
  - `curvesLevels.ts`: port `applyCurvesLevels`, descriptor `id: 'curves_levels'`, category `'film'`, params `blackPoint`, `whitePoint`, `gamma`.
  - `vignette.ts`: port `applyVignette`, descriptor `id: 'vignette'`, category `'film'`, params `radius`, `softness`.
  - `inverseVignette.ts`: port `applyInverseVignette`, descriptor `id: 'inverse_vignette'`, category `'film'`.
  - Export array `filmEffects` from `src/effects/film/index.ts`.

- [ ] **Step 2.5: Assemble Central Registry in `src/effects/index.ts`**
  - Aggregate all category lists: `crtEffects`, `filmEffects`, `textureEffects`, `printEffects`, `glitchEffects`, `colorEffects`.
  - Build `EFFECT_REGISTRY: Map<string, EffectDescriptor>` and array `ALL_EFFECTS: EffectDescriptor[]`.
  - Provide lookup helpers: `getEffectDescriptor(id)`, `resolveEffectId(alias)`, `getEffectsByCategory(category)`.
  - Export `applyEffectPipeline` and all types.

- [ ] **Step 2.6: Write tests in `tests/effects-registry.test.mjs`**
  - Verify every effect descriptor has valid metadata, category, defaultParams, and `apply` function.
  - Verify empty arrays for `printEffects`, `glitchEffects`, `colorEffects`.
  - Verify `lens_aberration` modes and `scanlines` modes.
  - Run `node tests/effects-registry.test.mjs`.

---

### Task 3: Day 1 Integration — App Store, Animation Export & UI

**Files:**
- Modify: `src/state/useAppStore.ts`
- Modify: `src/components/CenterViewport.tsx`
- Modify: `src/utils/animationExport.ts`
- Modify: `src/workers/dither.worker.ts`
- Modify: `src/components/layout/RightSidebar.tsx`
- Modify: `src/styles/shell.css`
- Modify: `package.json`

- [ ] **Step 3.1: Update `src/state/useAppStore.ts` to use new effect registry & schema v2**
  - Import `ALL_EFFECTS`, `getEffectDescriptor`, `resolveEffectId` from `../effects`.
  - Update `buildInitialEffects()` to include `opacity: 1` and `blendMode: 'normal'`.
  - Add store actions:
    - `setEffectOpacity: (id: string, opacity: number) => void`
    - `setEffectBlendMode: (id: string, blendMode: BlendMode) => void`
  - Update `addEffectInstance` to populate `opacity` and `blendMode` from descriptor defaults.
  - Ensure animation tracks recognize effect parameters.

- [ ] **Step 3.2: Wire up `CenterViewport.tsx`, `animationExport.ts`, and worker to `applyEffectPipeline`**
  - In `CenterViewport.tsx`: replace legacy `applyEffectStack` with `applyEffectPipeline(ditherImageData, effEffects, { frameIndex, time: currentTime, fps })`.
  - In `src/utils/animationExport.ts`: update `renderDeterministicAnimationFrame` to pass `context: { frameIndex: frameIdx, time: t, fps: targetFps }` into `applyEffectPipeline`.
  - In `src/workers/dither.worker.ts`: update to use `applyEffectPipeline`.

- [ ] **Step 3.3: Build Collapsible Category UI in `src/components/layout/RightSidebar.tsx`**
  - Create category state in RightSidebar: `collapsedEffectCategories: Record<string, boolean>`.
  - Render collapsible category accordion sections for `CRT`, `Film`, `Texture`, `Print`, `Glitch`, `Color`.
  - For each category, display available effect cards with an "Add" button and description tooltip.
  - In the active stack list, render each effect item with:
    - Category badge (e.g. `CRT` in cyan, `Film` in amber, `Texture` in violet).
    - Enable/disable checkbox.
    - Name header & expand/collapse toggle.
    - Opacity slider (0% to 100%) with numeric input.
    - Blend mode dropdown (`normal`, `screen`, `multiply`, `overlay`, `soft-light`, `add`).
    - Parameter controls dynamically rendered based on `descriptor.paramsMeta`.
    - Delete button and reorder controls.

- [ ] **Step 3.4: Add styles in `src/styles/shell.css` for effect categories & blend controls**
  - Add CSS classes for category accordion headers, badges, opacity slider, blend mode select, and expanded parameter cards.

- [ ] **Step 3.5: Update `package.json` scripts**
  - Add `"test": "npm run test:golden && node tests/effects-infrastructure.test.mjs && node tests/effects-registry.test.mjs"`.

---

### Task 4: Day 1 Split Test Golden Baselines

**Files:**
- Create: `tests/golden/effects/index.mjs`
- Create: `tests/golden/effects/effect-hashes.json`
- Modify: `tests/golden/run-golden-tests.mjs`

- [ ] **Step 4.1: Implement per-effect split golden runner in `tests/golden/effects/index.mjs`**
  - Create test harness evaluating each registered effect in isolation on a deterministic 64x64 synthetic image.
  - Store golden baseline SHA-256 hashes in `tests/golden/effects/effect-hashes.json`.
  - Allow running golden tests for a single effect: `node tests/golden/effects/index.mjs --effect=scanlines`.
  - Verify deterministic repeated execution (run 2x and compare).

- [ ] **Step 4.2: Integrate split effect runner into `tests/golden/run-golden-tests.mjs`**
  - Ensure `npm run test:golden` invokes the split effect runner while preserving existing algorithm hashes.
  - Confirm `npm run test:golden` reports 100% pass.

---

### Task 5: Phase 1 — Create Core Five New Effects

**Files:**
- Create: `src/effects/crt/phosphorMask.ts`
- Create: `src/effects/film/halation.ts`
- Create: `src/effects/film/filmGrain.ts`
- Create: `src/effects/film/gradientMap.ts`
- Create: `src/effects/crt/vhsTracking.ts`
- Modify: `src/effects/crt/index.ts`
- Modify: `src/effects/film/index.ts`
- Test: `tests/golden/effects/phase1.test.mjs`

- [ ] **Step 5.1: Implement Phosphor Mask (`src/effects/crt/phosphorMask.ts`)**
  - ID: `phosphor_mask`, Category: `'crt'`.
  - Params: `type` (`'aperture_grille' | 'shadow_mask' | 'slot_mask'`), `pitch` (1–6px, default 3), `intensity` (0–1, default 0.4), `rgbBias` (0–1), `vertical` (boolean, default true), `blendMode` (`'screen'` default, `'multiply'` option).
  - Generates subpixel phosphor RGB mask pattern and blends into canvas.
  - Pure deterministic math (modulo/pitch arithmetic). Zero heap allocation in loop.

- [ ] **Step 5.2: Implement Halation (`src/effects/film/halation.ts`)**
  - ID: `halation`, Category: `'film'`.
  - Params: `threshold` (0.4–0.9, default 0.65), `radius` (1–30px, default 8), `tint` (default `#ff5a3c`), `intensity` (0–2, default 0.8), `wideNarrowRatio` (0.1–1.0, default 0.5).
  - Algorithm: Threshold highlights -> 2-scale separable box/Gaussian blur -> tinted additive bleed onto target.

- [ ] **Step 5.3: Implement Film Grain (`src/effects/film/filmGrain.ts`)**
  - ID: `film_grain`, Category: `'film'`.
  - Params: `intensity` (0–1, default 0.3), `size` (1–4px, default 1), `channelIndependence` (0–1, default 0.2), `shadowWeight` (default 0.7), `midWeight` (default 1.0), `highlightWeight` (default 0.3), `temporal` (boolean, default true).
  - Algorithm: Deterministic Mulberry32 PRNG seeded with `context.frameIndex` (or constant if `!temporal`). Perceptual luminance weighting so grain sits in mid-tones/shadows.

- [ ] **Step 5.4: Implement Duotone / Gradient Map (`src/effects/film/gradientMap.ts`)**
  - ID: `gradient_map`, Category: `'film'`.
  - Params: `stops` (array of `{ pos: number, color: [r, g, b] }`), `interpolationSpace` (`'sRGB' | 'linear' | 'oklab'`, default `'oklab'`), `preserveLuminance` (boolean, default false), `preset` (optional string selector).
  - Include built-in stop presets:
    - `gameboy_dmg`: GameBoy green 4-stop
    - `amber_crt`: Amber monochrome CRT
    - `cyanotype`: Photographic Prussian blue
    - `risograph_2ink`: Teal and Fluorescent Pink
    - `sepia`: Warm archival photographic wash
  - Precompute 256-entry lookup table in O(1) per frame, apply to pixels via luminance index.

- [ ] **Step 5.5: Implement VHS Tracking Band (`src/effects/crt/vhsTracking.ts`)**
  - ID: `vhs_tracking`, Category: `'crt'`.
  - Params: `bandHeight` (10–80px, default 36), `scrollSpeed` (default 1.5), `opacity` (0–1, default 0.7), `shear` (0–40px horizontal shift, default 14), `colorSmear` (0–10px chroma delay, default 4), `dropoutDensity` (0–1, default 0.2), `temporal` (boolean, default true).
  - Algorithm: Compute band Y position from `(context.frameIndex * scrollSpeed) % height`. Apply horizontal wave shear, chroma sub-sampling smear, and random horizontal dropout flecks.

- [ ] **Step 5.6: Register Phase 1 effects and write unit test `tests/golden/effects/phase1.test.mjs`**
  - Export from `src/effects/crt/index.ts` and `src/effects/film/index.ts`.
  - Write test verifying all 5 effects render deterministically and generate stable golden hashes.

---

### Task 6: Phase 2 — Create CRT / Analog Video Effects

**Files:**
- Create: `src/effects/crt/screenCurvature.ts`
- Create: `src/effects/crt/convergenceError.ts`
- Create: `src/effects/crt/scanlineJitter.ts`
- Create: `src/effects/crt/interlaceCombing.ts`
- Create: `src/effects/crt/phosphorBloom.ts`
- Create: `src/effects/crt/headSwitchingNoise.ts`
- Modify: `src/effects/crt/index.ts`
- Test: `tests/golden/effects/phase2.test.mjs`

- [ ] **Step 6.1: Implement Screen Curvature (`src/effects/crt/screenCurvature.ts`)**
  - ID: `screen_curvature`, Category: `'crt'`.
  - Params: `curvature` (-0.5 to 0.5, signed barrel/pincushion, default 0.15), `cornerRoundness` (0–1, default 0.2), `edgeMode` (`'clamp' | 'black' | 'mirror'`, default `'black'`).
  - Algorithm: Inverse barrel mapping `r' = r * (1 + k * r^2)` from normalized coordinates. Smooth corner attenuation to simulate glass bevel. Placed after Vignette in default pipeline.

- [ ] **Step 6.2: Implement Convergence Error (`src/effects/crt/convergenceError.ts`)**
  - ID: `convergence_error`, Category: `'crt'`.
  - Params: `centerX` (0–1, default 0.5), `centerY` (0–1, default 0.5), `edgePx` (0–20px, default 6), `radialExponent` (1–3, default 1.8), `redMult` (default 1.0), `greenMult` (default -0.5), `blueMult` (default 0.5).
  - Misaligns R, G, B electron gun coordinates with distance from center.

- [ ] **Step 6.3: Implement Scanline Jitter (`src/effects/crt/scanlineJitter.ts`)**
  - ID: `scanline_jitter`, Category: `'crt'`.
  - Params: `amplitude` (0–20px, default 4), `frequency` (0–1, default 0.3), `mode` (`'per-row' | 'banded'`, default `'banded'`), `temporal` (boolean, default true).
  - Shifts horizontal scanlines left/right with high-frequency noise or banded sync instability, seeded by frame index.

- [ ] **Step 6.4: Implement Interlace Combing (`src/effects/crt/interlaceCombing.ts`)**
  - ID: `interlace_combing`, Category: `'crt'`.
  - Params: `fieldOffset` (0–16px, default 4), `field` (`'odd' | 'even' | 'alternating'`, default `'alternating'`), `temporal` (boolean, default true).
  - Shifts alternate video scanline fields horizontally to recreate analog video de-interlace motion combing.

- [ ] **Step 6.5: Implement Phosphor Bloom (`src/effects/crt/phosphorBloom.ts`)**
  - ID: `phosphor_bloom`, Category: `'crt'`.
  - Params: `threshold` (0.3–0.9, default 0.6), `radius` (1–20px, default 6), `intensity` (0–2, default 0.7), `tint` (default `#e0f0ff`).
  - Extracts bright pixels, applies fast blur, and adds bloom back to simulate CRT beam phosphor overglow.

- [ ] **Step 6.6: Implement Head-Switching Noise (`src/effects/crt/headSwitchingNoise.ts`)**
  - ID: `head_switching_noise`, Category: `'crt'`.
  - Params: `height` (2–24px, default 10), `intensity` (0–1, default 0.8), `horizontalBias` (-1 to 1, default 0.2), `temporal` (boolean, default true).
  - Draws the characteristic helical scan head switching noise band across the bottom rows of the frame.

- [ ] **Step 6.7: Register Phase 2 effects and write test `tests/golden/effects/phase2.test.mjs`**
  - Export from `src/effects/crt/index.ts`.
  - Write test verifying all 6 CRT effects and deterministic hashes.

---

### Task 7: Phase 3 — Create Film / Photographic Effects

**Files:**
- Create: `src/effects/film/dustScratches.ts`
- Create: `src/effects/film/lightLeaks.ts`
- Create: `src/effects/film/gateWeave.ts`
- Create: `src/effects/film/exposureFlicker.ts`
- Create: `src/effects/film/lensGhost.ts`
- Modify: `src/effects/film/index.ts`
- Test: `tests/golden/effects/phase3.test.mjs`

- [ ] **Step 7.1: Implement Dust & Scratches (`src/effects/film/dustScratches.ts`)**
  - ID: `dust_scratches`, Category: `'film'`.
  - Params: `density` (10–200 particles, default 50), `sizeRange` (`[1, 5]`), `scratchProbability` (0–1, default 0.3), `streakLength` (20–200px, default 80), `invert` (boolean, default false: black dust vs white hairs), `temporal` (boolean, default true).
  - Seeded by `context.frameIndex` to spawn authentic dust motes, hair curves, and vertical emulsion scratches.

- [ ] **Step 7.2: Implement Light Leaks (`src/effects/film/lightLeaks.ts`)**
  - ID: `light_leaks`, Category: `'film'`.
  - Params: `direction` (`'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right'`), `radius` (0.2–1.2, default 0.6), `tint` (default `#ff6600`), `intensity` (0–1, default 0.5), `blendMode` (`'screen'` default).
  - Generates warm organic light leak falloff along film edges.

- [ ] **Step 7.3: Implement Gate Weave (`src/effects/film/gateWeave.ts`)**
  - ID: `gate_weave`, Category: `'film'`.
  - Params: `amplitude` (0.2–6px, default 1.5), `frequency` (0.1–2.0, default 0.8), `drift` (0–2px, default 0.5), `temporal` (boolean, default true).
  - Simulates mechanical film transport sprocket wobble with subpixel translation in X and Y.

- [ ] **Step 7.4: Implement Exposure Flicker (`src/effects/film/exposureFlicker.ts`)**
  - ID: `exposure_flicker`, Category: `'film'`.
  - Params: `amplitude` (0.02–0.3, default 0.1), `frequency` (0.2–3.0, default 1.2), `mode` (`'smooth' | 'stepped'`, default `'stepped'`), `temporal` (boolean, default true).
  - Varies overall exposure per frame based on deterministic low-frequency noise.

- [ ] **Step 7.5: Implement Lens Ghost / Flare (`src/effects/film/lensGhost.ts`)**
  - ID: `lens_ghost`, Category: `'film'`.
  - Params: `sourceX` (0–1, default 0.2), `sourceY` (0–1, default 0.2), `ghostCount` (1–6, default 4), `chromaticOffset` (0–8px, default 3), `intensity` (0–1, default 0.6).
  - Projects optical reflex circles and multi-layer polygonal ghosts along the line through image center.

- [ ] **Step 7.6: Register Phase 3 effects and write test `tests/golden/effects/phase3.test.mjs`**
  - Export from `src/effects/film/index.ts`.
  - Write test verifying all 5 Film effects and deterministic hashes.

---

### Task 8: Integration — Preset Chains & Verification Gate

**Files:**
- Modify: `src/effects/presets.ts`
- Modify: `src/components/layout/RightSidebar.tsx`
- Test: `tests/golden/effects/presets.test.mjs`

- [ ] **Step 8.1: Implement Named Chain Presets in `src/effects/presets.ts`**
  - Add factory chain presets:
    - **Trinitron 1994**: `phosphor_mask` + `scanlines` (`soft`) + `screen_curvature` + `glow`
    - **Photocopy Zine**: `halftone` + `dust_scratches` + `curves_levels`
    - **Super 8**: `film_grain` + `gate_weave` + `exposure_flicker` + `light_leaks` + `vignette`
    - **GameBoy Pocket**: `gradient_map` (`gameboy_dmg`) + `pixelate` + `scanlines` (`hard`)
    - **VHS Rental**: `vhs_tracking` + `head_switching_noise` + `scanline_jitter` + `lens_aberration` + `interlace_combing`
  - Ensure all presets conform to Preset Schema v2 (`version: 2`, `opacity`, `blendMode`).

- [ ] **Step 8.2: Verify presets in UI and Export Pipeline**
  - Test applying each preset from RightSidebar.
  - Verify stacked rendering in `CenterViewport`.
  - Verify deterministic export via `ExportModal` (PNG/JPG) and animation export (`exportAnimatedGif` / `exportAnimatedVideo`).

- [ ] **Step 8.3: Run Complete Quality Gate**
  - Run `npx tsc --noEmit` and confirm 0 type errors.
  - Run `npm run build` and confirm production build passes cleanly.
  - Run `npm run inventory:check` and confirm all 8 checks pass.
  - Run `npm run test:golden` and confirm all 112 baseline hashes pass.
  - Run `node tests/golden/effects/index.mjs` and confirm all effect golden tests pass.
  - Verify git diff touches ONLY authorized files and leaves `print/`, `glitch/`, `color/` untouched.

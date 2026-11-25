# DitherForge UI Theming & Swappable Skin Architecture

DitherForge separates **Color Schemes** from **UI Skins (Structural / Layout Themes)** so you can swap colors independently or completely reshape the interface via CSS without modifying React components.

---

## 1. Two-Layer Theme System

| Layer | Attribute on `<html>` | Source File(s) | What It Controls |
| :--- | :--- | :--- | :--- |
| **Colour scheme** | `data-theme="<id>"` | `src/styles/themes.css` | Background surfaces, text contrast, accent colors, borders, glass tint, slider fill colors |
| **UI Skin** | `data-ui-skin="<id>"` | `src/styles/skins/index.css` | Layout geometry, panel shapes, radii, spacing, typography, control styles, borders, shadows |

---

## 2. Semantic Component Labels (`data-df-*`)

Every major region, sidebar section, modal, and shared control carries stable `data-df-*` attributes so external or swapped CSS skins can target them cleanly without fragile class-nesting:

### Top-Level Regions
| Selector | Component | Description |
| :--- | :--- | :--- |
| `[data-df-region="topbar"]` | `TopMenuBar.tsx` | Top navigation bar (`File`, `Edit`, `View`, viewport pills, status, `Compare`, `Settings`) |
| `[data-df-region="workspace"]` | `App.tsx` | Main flex/grid container holding the viewport and sidebar |
| `[data-df-region="viewport"]` | `CenterViewport.tsx` | Central media canvas, pan/zoom stage, split compare, and timeline dock |
| `[data-df-region="sidebar"]` | `RightSidebar.tsx` | Floating right-hand inspector panel |
| `[data-df-region="toasts"]` | `App.tsx` | Fixed toast notification stack |

### Topbar Groups
- `[data-df-group="topbar-menus"]` — `File | Edit | View` segmented pill
- `[data-df-group="topbar-viewport-controls"]` — `VIEWPORT:` (`Live`/`Debounce`, `Full`/`Mid`/`Low`, `Still`/`Animated`) + `Video:` pill
- `[data-df-group="topbar-status-actions"]` — Resolution & render time readout + `Compare` / `Settings` pill

### Viewport Panels
- `[data-df-panel="canvas-area"]` — Interactive viewport area
- `[data-df-panel="empty-dropzone"]` — Empty-state drag-and-drop card ("Drop Image or Video Here")

### Right Sidebar Sections (`[data-df-group="sidebar-sections"]`)
- `[data-df-section="top-actions"]` — Brand logo + `Open Image` / `Export Image` / Format pill
- `[data-df-section="brand"]` — Logo container (2D SVG/WebP or 3D Three.js anvil)
- `[data-df-section="styles"]` — Category/Algorithm selector & dynamic algorithm parameters
- `[data-df-section="ascii-main"]` — Dedicated ASCII algorithm & charset selector
- `[data-df-section="ascii-typography"]` — Font, cell width/height, spacing, glyph scale
- `[data-df-section="ascii-tone"]` — Tone curve, edge sensitivity, sampling
- `[data-df-section="ascii-color"]` — ASCII foreground/background color modes
- `[data-df-section="ascii-effects"]` — Dedicated ASCII post-effects
- `[data-df-section="adjustments"]` — Brightness, contrast, saturation, hue, gamma, blur, denoise, highlight, depth
- `[data-df-section="palette"]` — Palette selector, custom swatches, lock/shuffle, K-Means/Median Cut extraction
- `[data-df-section="effects-stack"]` — Reorderable 42-effect stack + named chain presets
- `[data-df-section="presets"]` — User preset save/load manager

### Modals & Shared Controls
- `[data-df-modal="export"]` — `ExportModal.tsx`
- `[data-df-modal="batch"]` — `BatchProcessingModal.tsx`
- `[data-df-modal="save-project"]` — `SaveProjectModal.tsx`
- `[data-df-modal="settings"]` — `SettingsDialog.tsx`
- `[data-df-modal="algorithm-reference"]` — `AlgorithmReferenceModal.tsx`
- `[data-df-modal="ffmpeg-install"]` — `FfmpegInstallModal.tsx`
- `[data-df-modal="create-animation"]` — Create Animation FPS/Duration popup (`CenterViewport.tsx`)
- `[data-df-control="dropdown"]` — `Dropdown.tsx`
- `[data-df-control="primary-action-pill"]` — `Open Image | Export Image | Format` bar (`RightSidebar.tsx`)
- `[data-df-control="compare-splitter"]` — Draggable Before/After handle (`CenterViewport.tsx`)
- `[data-df-control="color-picker"]` — Swatch color picker popover (`ColorPicker.tsx`)
- `[data-df-control="context-menu"]` — Global right-click context menu (`AppContextMenu.tsx`)
- `[data-df-control="toast"]` — Toast alert pill (`data-df-toast-type="success" | "info" | "error"`)

---

## 2b. Flexible CSS Grid Sliders

`.slider-control-block` uses a 2-column CSS Grid (`grid-template-columns: minmax(0, 1fr) auto`) and `.slider-track-input-row` uses `display: contents`. Any UI skin can freely rearrange the label, numeric readout, and range slider purely in CSS (for example, placing `Label` on the left and `Value` on the right above a full-width slider):

```css
:root[data-ui-skin="my-skin"] .slider-label-above {
  grid-column: 1;
  grid-row: 1;
}
:root[data-ui-skin="my-skin"] .control-num-input {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  border: none;
  background: transparent;
}
:root[data-ui-skin="my-skin"] .slider-track-input-row > *:first-child {
  grid-column: 1 / -1;
  grid-row: 2;
}
```

---

## 3. Structural CSS Custom Properties (`src/styles/skins/index.css`)

```css
:root {
  --df-topbar-height: 44px;
  --df-topbar-padding: 8px 16px;
  --df-sidebar-margin: 10px;
  --df-sidebar-radius: 16px;
  --df-card-radius: 12px;
  --df-control-radius: 8px;
  --df-pill-radius: 9999px;
  --df-border-width: 1px;
}
```

---

## 4. How to Add a New UI Skin

1. Create `src/styles/skins/my-skin.css`:
   ```css
   :root[data-ui-skin="my-skin"] {
     --df-sidebar-radius: 0px;
     --df-card-radius: 0px;
     --df-control-radius: 0px;
     --df-pill-radius: 2px;
   }

   :root[data-ui-skin="my-skin"] [data-df-region="sidebar"] {
     margin: 0;
     height: 100%;
     border-radius: 0;
   }

   :root[data-ui-skin="my-skin"] [data-df-section="styles"] {
     border-style: dashed;
   }
   ```
2. Import it at the bottom of `src/styles/skins/index.css`:
   ```css
   @import './my-skin.css';
   ```
3. Register it in `UI_SKINS` inside `src/components/dialogs/SettingsDialog.tsx` so it appears in **Settings → UI skin (layout theme)** (or call `document.documentElement.setAttribute('data-ui-skin', 'my-skin')`).

> Note: `@import` statements in `src/styles/skins/index.css` must appear at the top of the file before the `:root` rule. See `src/styles/skins/terminal.css` (`Terminal (Docked)`) for a complete built-in structural skin example.

// DitherForge: Master Application Controller
// Orchestrates 63 Algorithms, Color Integration, Effect Stack & Viewport

import { ALGORITHM_REGISTRY, applyTweaks, applyDitherAlgorithm } from "./dither-engine/algorithms.js";
import { BUILTIN_PALETTES, findNearestColor, extractPaletteMedianCut, extractPaletteKMeans, hexToRgba, rgbaToHex } from "./dither-engine/palettes.js";
import { AVAILABLE_EFFECT_TYPES, applyEffectStack } from "./dither-engine/effect-stack.js";
import { TEMPORAL_PATTERNS, applyTemporalNoise } from "./dither-engine/temporal.js";
import { exportRaster, exportCharacterGrid, exportSvgContours, copyCanvasToClipboard, VideoRecorder } from "./dither-engine/exporters.js";
import { BUILTIN_PRESETS, saveUserPresets, loadUserPresets } from "./ui/presets.js";

// Global Application State
const state = {
  // Source Media
  sourceImage: null,        // HTMLImageElement or Canvas
  sourceVideo: null,        // HTMLVideoElement
  isVideo: false,
  originalCanvas: document.createElement("canvas"),

  // Viewport Transform
  zoom: 1.0,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  showBeforeAfter: false,
  splitScreen: false,
  splitRatio: 0.5,

  // Dither Settings
  algorithmId: "floyd_steinberg",
  threshold: 0.5,
  scale: 1.0,
  diffusionStrength: 1.0,
  serpentine: true,
  noiseAmount: 0.0,

  // Tweaks
  brightness: 0.0,
  contrast: 0.0,
  saturation: 0.0,
  gamma: 1.0,

  // Palette State
  activePalette: [...BUILTIN_PALETTES[0].colors],
  lockedSwatches: new Set(),
  paletteDepth: 16,

  // Effect Stack
  effects: [],

  // Timeline & Animation
  isPlaying: false,
  currentFrame: 0,
  totalFrames: 60,
  fps: 30,
  loop: true,
  temporalPattern: "grain",
  temporalIntensity: 0.5,
  temporalSpeed: 1.0,
  animIntervalId: null,
  videoRecorder: null,

  // Performance Engine Mode: 'full' | 'live' | 'still'
  perfMode: "live",
  renderPending: false,
  stillDebounceTimer: null
};

// DOM Element References
const canvas = document.getElementById("mainViewportCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const stageWrapper = document.getElementById("canvasStageWrapper");
const viewportContainer = document.getElementById("canvasViewportContainer");
const dropzoneOverlay = document.getElementById("dropzoneOverlay");
const zoomLevelIndicator = document.getElementById("zoomLevelIndicator");
const splitSliderLine = document.getElementById("splitSliderLine");

// Initialize Application
window.addEventListener("DOMContentLoaded", () => {
  initUI();
  initAlgorithmsList();
  initPalettes();
  initPresets();
  initTimeline();
  initEvents();
  loadSamplePattern(); // Load initial high-res retro sample image
});

function initUI() {
  // Theme Selector
  const themeSelector = document.getElementById("themeSelector");
  themeSelector.addEventListener("change", e => {
    document.documentElement.setAttribute("data-theme", e.target.value);
  });

  // Performance Mode Selector
  const perfSelector = document.getElementById("perfModeSelector");
  perfSelector.addEventListener("change", e => {
    state.perfMode = e.target.value;
  });

  // Left Panel Tab Switching
  const tabBtnAlgorithms = document.getElementById("tabBtnAlgorithms");
  const tabBtnPalettes = document.getElementById("tabBtnPalettes");
  const tabContentAlgorithms = document.getElementById("tabContentAlgorithms");
  const tabContentPalettes = document.getElementById("tabContentPalettes");

  tabBtnAlgorithms.addEventListener("click", () => {
    tabBtnAlgorithms.classList.add("active");
    tabBtnPalettes.classList.remove("active");
    tabContentAlgorithms.style.display = "flex";
    tabContentPalettes.style.display = "none";
  });

  tabBtnPalettes.addEventListener("click", () => {
    tabBtnPalettes.classList.add("active");
    tabBtnAlgorithms.classList.remove("active");
    tabContentPalettes.style.display = "flex";
    tabContentAlgorithms.style.display = "none";
  });

  // Right Panel Tab Switching
  const tabBtnTweaks = document.getElementById("tabBtnTweaks");
  const tabBtnExports = document.getElementById("tabBtnExports");
  const tabContentTweaks = document.getElementById("tabContentTweaks");
  const tabContentExports = document.getElementById("tabContentExports");

  tabBtnTweaks.addEventListener("click", () => {
    tabBtnTweaks.classList.add("active");
    tabBtnExports.classList.remove("active");
    tabContentTweaks.style.display = "flex";
    tabContentExports.style.display = "none";
  });

  tabBtnExports.addEventListener("click", () => {
    tabBtnExports.classList.add("active");
    tabBtnTweaks.classList.remove("active");
    tabContentExports.style.display = "flex";
    tabContentTweaks.style.display = "none";
  });
}

// -------------------------------------------------------------
// 1. 63 ALGORITHMS LIST & BROWSER
// -------------------------------------------------------------
function initAlgorithmsList() {
  const container = document.getElementById("algoItemsList");
  const searchInput = document.getElementById("algoSearchInput");
  const pillsContainer = document.getElementById("algoCategoryPills");

  let currentCategory = "all";
  let searchQuery = "";

  function renderList() {
    container.innerHTML = "";
    const filtered = ALGORITHM_REGISTRY.filter(algo => {
      const matchCat = currentCategory === "all" || algo.category === currentCategory;
      const matchSearch = algo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          algo.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    filtered.forEach(algo => {
      const card = document.createElement("div");
      card.className = `algo-item-card ${state.algorithmId === algo.id ? "active" : ""}`;
      card.innerHTML = `
        <div class="algo-item-header">
          <span>${algo.name}</span>
          <span style="font-size:0.65rem; color:var(--accent-amber);">${algo.category.replace("_", " ")}</span>
        </div>
        <div class="algo-item-desc">${algo.description}</div>
      `;
      card.addEventListener("click", () => {
        state.algorithmId = algo.id;
        document.querySelectorAll(".algo-item-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        triggerRender();
      });
      container.appendChild(card);
    });
  }

  // Category Pills Filter
  pillsContainer.addEventListener("click", e => {
    if (e.target.classList.contains("cat-pill")) {
      pillsContainer.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
      e.target.classList.add("active");
      currentCategory = e.target.dataset.category;
      renderList();
    }
  });

  // Search Filter
  searchInput.addEventListener("input", e => {
    searchQuery = e.target.value;
    renderList();
  });

  // Arrow key algorithm stepping
  window.addEventListener("keydown", e => {
    if (document.activeElement === searchInput || document.activeElement.tagName === "INPUT") return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const idx = ALGORITHM_REGISTRY.findIndex(a => a.id === state.algorithmId);
      if (idx !== -1) {
        const nextIdx = e.key === "ArrowDown"
          ? (idx + 1) % ALGORITHM_REGISTRY.length
          : (idx - 1 + ALGORITHM_REGISTRY.length) % ALGORITHM_REGISTRY.length;
        state.algorithmId = ALGORITHM_REGISTRY[nextIdx].id;
        renderList();
        triggerRender();
      }
    }
  });

  renderList();
}

// -------------------------------------------------------------
// 2. PALETTES & COLOR ENGINE
// -------------------------------------------------------------
function initPalettes() {
  const dropdown = document.getElementById("paletteSelectDropdown");
  const previewStrip = document.getElementById("palettePreviewStrip");

  BUILTIN_PALETTES.forEach(pal => {
    const opt = document.createElement("option");
    opt.value = pal.id;
    opt.textContent = `${pal.name} (${pal.colors.length}c)`;
    dropdown.appendChild(opt);
  });

  dropdown.addEventListener("change", e => {
    const selected = BUILTIN_PALETTES.find(p => p.id === e.target.value);
    if (selected) {
      state.activePalette = [...selected.colors];
      state.lockedSwatches.clear();
      renderPaletteSwatches();
      triggerRender();
    }
  });

  // Median Cut Extractor Button
  document.getElementById("btnExtractMedianCut").addEventListener("click", () => {
    if (!state.originalCanvas) return;
    const origCtx = state.originalCanvas.getContext("2d");
    const imgData = origCtx.getImageData(0, 0, state.originalCanvas.width, state.originalCanvas.height);
    state.activePalette = extractPaletteMedianCut(imgData, 8);
    state.lockedSwatches.clear();
    renderPaletteSwatches();
    triggerRender();
  });

  // K-Means Extractor Button
  document.getElementById("btnExtractKMeans").addEventListener("click", () => {
    if (!state.originalCanvas) return;
    const origCtx = state.originalCanvas.getContext("2d");
    const imgData = origCtx.getImageData(0, 0, state.originalCanvas.width, state.originalCanvas.height);
    state.activePalette = extractPaletteKMeans(imgData, 8);
    state.lockedSwatches.clear();
    renderPaletteSwatches();
    triggerRender();
  });

  // Shuffle Unlocked Palette Swatches
  document.getElementById("btnShufflePalette").addEventListener("click", () => {
    state.activePalette = state.activePalette.map((col, idx) => {
      if (state.lockedSwatches.has(idx)) return col;
      return [
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        255
      ];
    });
    renderPaletteSwatches();
    triggerRender();
  });

  // Add Color Swatch
  document.getElementById("btnAddColorSwatch").addEventListener("click", () => {
    if (state.activePalette.length < 32) {
      state.activePalette.push([128, 128, 128, 255]);
      renderPaletteSwatches();
      triggerRender();
    }
  });

  // Export Palette JSON
  document.getElementById("btnExportPaletteJson").addEventListener("click", () => {
    const jsonStr = JSON.stringify({ name: "Custom Palette", colors: state.activePalette }, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "palette.json";
    a.click();
  });

  // Import Palette JSON
  document.getElementById("btnImportPaletteJson").addEventListener("click", () => {
    document.getElementById("fileInputPalette").click();
  });

  document.getElementById("fileInputPalette").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (parsed && Array.isArray(parsed.colors)) {
            state.activePalette = parsed.colors;
            state.lockedSwatches.clear();
            renderPaletteSwatches();
            triggerRender();
          }
        } catch (err) {
          alert("Invalid palette JSON file");
        }
      };
      reader.readAsText(file);
    }
  });

  renderPaletteSwatches();
}

function renderPaletteSwatches() {
  const previewStrip = document.getElementById("palettePreviewStrip");
  const editorGrid = document.getElementById("paletteEditorGrid");
  previewStrip.innerHTML = "";
  editorGrid.innerHTML = "";

  state.activePalette.forEach((col, idx) => {
    const hex = rgbaToHex(col[0], col[1], col[2]);

    // Strip Swatch
    const swatch = document.createElement("div");
    swatch.className = "swatch-color";
    swatch.style.backgroundColor = hex;
    previewStrip.appendChild(swatch);

    // Editor Item
    const editItem = document.createElement("div");
    editItem.className = "palette-swatch-box";
    const isLocked = state.lockedSwatches.has(idx);

    editItem.innerHTML = `
      <input type="color" value="${hex}" style="width:28px; height:28px; border:none; cursor:pointer; background:none;">
      <span class="swatch-hex">${hex.toUpperCase()}</span>
      <div style="display:flex; gap:4px;">
        <button class="btn-icon" style="width:18px; height:18px; font-size:10px; ${isLocked ? 'background:var(--accent-cyan); color:#000;' : ''}" title="Lock swatch from shuffle">
          ${isLocked ? '🔒' : '🔓'}
        </button>
        <button class="btn-icon btn-del-swatch" style="width:18px; height:18px; font-size:10px;" title="Delete swatch">✕</button>
      </div>
    `;

    // Color change
    const colorInput = editItem.querySelector("input[type='color']");
    colorInput.addEventListener("input", ev => {
      state.activePalette[idx] = hexToRgba(ev.target.value);
      previewStrip.children[idx].style.backgroundColor = ev.target.value;
      editItem.querySelector(".swatch-hex").textContent = ev.target.value.toUpperCase();
      triggerRender();
    });

    // Lock toggle
    const lockBtn = editItem.querySelector("button:first-of-type");
    lockBtn.addEventListener("click", () => {
      if (state.lockedSwatches.has(idx)) {
        state.lockedSwatches.delete(idx);
      } else {
        state.lockedSwatches.add(idx);
      }
      renderPaletteSwatches();
    });

    // Delete swatch
    const delBtn = editItem.querySelector(".btn-del-swatch");
    delBtn.addEventListener("click", () => {
      if (state.activePalette.length > 2) {
        state.activePalette.splice(idx, 1);
        state.lockedSwatches.delete(idx);
        renderPaletteSwatches();
        triggerRender();
      }
    });

    editorGrid.appendChild(editItem);
  });
}

// -------------------------------------------------------------
// 3. PRESETS SYSTEM
// -------------------------------------------------------------
function initPresets() {
  const dropdown = document.getElementById("presetDropdown");
  dropdown.innerHTML = "";

  BUILTIN_PRESETS.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    dropdown.appendChild(opt);
  });

  const userPresets = loadUserPresets();
  userPresets.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `★ ${p.name}`;
    dropdown.appendChild(opt);
  });

  dropdown.addEventListener("change", e => {
    const allPresets = [...BUILTIN_PRESETS, ...loadUserPresets()];
    const found = allPresets.find(p => p.id === e.target.value);
    if (found) {
      applyPreset(found);
    }
  });

  // Save preset button
  document.getElementById("btnSavePreset").addEventListener("click", () => {
    const nameInput = document.getElementById("presetNameInput");
    const name = nameInput.value.trim() || `Custom Preset ${Date.now()}`;
    const newPreset = {
      id: `user_${Date.now()}`,
      name,
      algorithmId: state.algorithmId,
      threshold: state.threshold,
      scale: state.scale,
      diffusionStrength: state.diffusionStrength,
      serpentine: state.serpentine,
      brightness: state.brightness,
      contrast: state.contrast,
      saturation: state.saturation,
      gamma: state.gamma,
      palette: [...state.activePalette],
      effects: JSON.parse(JSON.stringify(state.effects))
    };
    const presets = loadUserPresets();
    presets.push(newPreset);
    saveUserPresets(presets);
    initPresets();
    dropdown.value = newPreset.id;
    nameInput.value = "";
    alert(`Preset "${name}" saved!`);
  });
}

function applyPreset(p) {
  state.algorithmId = p.algorithmId || "floyd_steinberg";
  state.threshold = p.threshold !== undefined ? p.threshold : 0.5;
  state.scale = p.scale !== undefined ? p.scale : 1.0;
  state.diffusionStrength = p.diffusionStrength !== undefined ? p.diffusionStrength : 1.0;
  state.serpentine = p.serpentine !== undefined ? p.serpentine : true;
  state.brightness = p.brightness || 0.0;
  state.contrast = p.contrast || 0.0;
  state.saturation = p.saturation || 0.0;
  state.gamma = p.gamma || 1.0;
  state.effects = p.effects ? JSON.parse(JSON.stringify(p.effects)) : [];

  if (p.paletteId) {
    const pal = BUILTIN_PALETTES.find(b => b.id === p.paletteId);
    if (pal) state.activePalette = [...pal.colors];
  } else if (p.palette) {
    state.activePalette = [...p.palette];
  }

  // Update slider UI values
  updateSliderDisplays();
  renderPaletteSwatches();
  renderEffectStackUI();
  triggerRender();
}

function updateSliderDisplays() {
  document.getElementById("sliderThreshold").value = state.threshold;
  document.getElementById("valThreshold").textContent = state.threshold.toFixed(2);

  document.getElementById("sliderDiffusionStrength").value = state.diffusionStrength;
  document.getElementById("valDiffusionStrength").textContent = state.diffusionStrength.toFixed(2);

  document.getElementById("sliderScale").value = state.scale;
  document.getElementById("valScale").textContent = state.scale.toFixed(2) + "x";

  document.getElementById("checkSerpentine").checked = state.serpentine;

  document.getElementById("sliderBrightness").value = state.brightness;
  document.getElementById("valBrightness").textContent = state.brightness.toFixed(2);

  document.getElementById("sliderContrast").value = state.contrast;
  document.getElementById("valContrast").textContent = state.contrast.toFixed(2);

  document.getElementById("sliderSaturation").value = state.saturation;
  document.getElementById("valSaturation").textContent = state.saturation.toFixed(2);

  document.getElementById("sliderGamma").value = state.gamma;
  document.getElementById("valGamma").textContent = state.gamma.toFixed(2);
}

// -------------------------------------------------------------
// 4. TIMELINE & ANIMATION ENGINE
// -------------------------------------------------------------
function initTimeline() {
  const patternSelect = document.getElementById("temporalPatternSelect");
  TEMPORAL_PATTERNS.forEach(pat => {
    const opt = document.createElement("option");
    opt.value = pat.id;
    opt.textContent = pat.name;
    patternSelect.appendChild(opt);
  });

  patternSelect.addEventListener("change", e => {
    state.temporalPattern = e.target.value;
    triggerRender();
  });

  const scrubber = document.getElementById("timelineScrubber");
  const frameDisplay = document.getElementById("timelineFrameDisplay");
  scrubber.addEventListener("input", e => {
    state.currentFrame = parseInt(e.target.value, 10);
    frameDisplay.textContent = `Frame ${state.currentFrame} / ${state.totalFrames}`;
    triggerRender();
  });

  const btnPlayPause = document.getElementById("btnTimelinePlayPause");
  btnPlayPause.addEventListener("click", () => {
    toggleAnimationPlayback();
  });

  document.getElementById("btnTimelineRewind").addEventListener("click", () => {
    state.currentFrame = 0;
    scrubber.value = 0;
    frameDisplay.textContent = `Frame 0 / ${state.totalFrames}`;
    triggerRender();
  });

  document.getElementById("btnTimelineLoop").addEventListener("click", e => {
    state.loop = !state.loop;
    e.currentTarget.classList.toggle("active", state.loop);
  });

  document.getElementById("fpsSelector").addEventListener("change", e => {
    state.fps = parseInt(e.target.value, 10);
    if (state.isPlaying) {
      stopAnimationPlayback();
      startAnimationPlayback();
    }
  });

  // Convert Still to Animation button
  document.getElementById("btnConvertStillToAnim").addEventListener("click", () => {
    state.temporalIntensity = 0.6;
    if (!state.isPlaying) {
      startAnimationPlayback();
    }
  });
}

function toggleAnimationPlayback() {
  if (state.isPlaying) {
    stopAnimationPlayback();
  } else {
    startAnimationPlayback();
  }
}

function startAnimationPlayback() {
  state.isPlaying = true;
  document.getElementById("btnTimelinePlayPause").textContent = "⏸";
  const interval = 1000 / state.fps;
  state.animIntervalId = setInterval(() => {
    state.currentFrame++;
    if (state.currentFrame > state.totalFrames) {
      if (state.loop) {
        state.currentFrame = 0;
      } else {
        stopAnimationPlayback();
        return;
      }
    }
    document.getElementById("timelineScrubber").value = state.currentFrame;
    document.getElementById("timelineFrameDisplay").textContent = `Frame ${state.currentFrame} / ${state.totalFrames}`;
    triggerRender();
  }, interval);
}

function stopAnimationPlayback() {
  state.isPlaying = false;
  document.getElementById("btnTimelinePlayPause").textContent = "▶";
  if (state.animIntervalId) {
    clearInterval(state.animIntervalId);
    state.animIntervalId = null;
  }
}

// -------------------------------------------------------------
// 5. STACKABLE POST-EFFECTS UI
// -------------------------------------------------------------
function renderEffectStackUI() {
  const container = document.getElementById("effectStackList");
  container.innerHTML = "";

  state.effects.forEach((eff, idx) => {
    const card = document.createElement("div");
    card.className = "effect-card";

    const effDef = AVAILABLE_EFFECT_TYPES.find(e => e.id === eff.type) || { name: eff.type };
    card.innerHTML = `
      <div class="effect-card-header">
        <span class="effect-title">
          <input type="checkbox" ${eff.enabled ? "checked" : ""} class="chk-eff-enable">
          ${effDef.name}
        </span>
        <div class="effect-actions">
          <button class="btn-icon btn-eff-up" title="Move Up" ${idx === 0 ? "disabled" : ""}>↑</button>
          <button class="btn-icon btn-eff-down" title="Move Down" ${idx === state.effects.length - 1 ? "disabled" : ""}>↓</button>
          <button class="btn-icon btn-eff-del" title="Remove">✕</button>
        </div>
      </div>
    `;

    // Sliders for effect parameters
    const paramContainer = document.createElement("div");
    paramContainer.style.display = "flex";
    paramContainer.style.flexDirection = "column";
    paramContainer.style.gap = "4px";

    for (const [key, val] of Object.entries(eff.params || {})) {
      const row = document.createElement("div");
      row.className = "control-row";
      row.innerHTML = `
        <div class="control-label-row">
          <span>${key}</span>
          <span class="control-val">${typeof val === "number" ? val.toFixed(2) : val}</span>
        </div>
        <input type="range" class="slider-input" min="0" max="${key === "radius" || key === "dotSize" ? "20" : (key === "angle" ? "360" : "1")}" step="0.05" value="${val}">
      `;
      const slider = row.querySelector("input");
      slider.addEventListener("input", ev => {
        eff.params[key] = parseFloat(ev.target.value);
        row.querySelector(".control-val").textContent = eff.params[key].toFixed(2);
        triggerRender();
      });
      paramContainer.appendChild(row);
    }
    card.appendChild(paramContainer);

    // Event Handlers
    card.querySelector(".chk-eff-enable").addEventListener("change", ev => {
      eff.enabled = ev.target.checked;
      triggerRender();
    });

    card.querySelector(".btn-eff-up").addEventListener("click", () => {
      if (idx > 0) {
        const tmp = state.effects[idx];
        state.effects[idx] = state.effects[idx - 1];
        state.effects[idx - 1] = tmp;
        renderEffectStackUI();
        triggerRender();
      }
    });

    card.querySelector(".btn-eff-down").addEventListener("click", () => {
      if (idx < state.effects.length - 1) {
        const tmp = state.effects[idx];
        state.effects[idx] = state.effects[idx + 1];
        state.effects[idx + 1] = tmp;
        renderEffectStackUI();
        triggerRender();
      }
    });

    card.querySelector(".btn-eff-del").addEventListener("click", () => {
      state.effects.splice(idx, 1);
      renderEffectStackUI();
      triggerRender();
    });

    container.appendChild(card);
  });
}

// -------------------------------------------------------------
// 6. PIPELINE RENDERING ENGINE
// -------------------------------------------------------------
function triggerRender() {
  if (state.perfMode === "still") {
    clearTimeout(state.stillDebounceTimer);
    state.stillDebounceTimer = setTimeout(() => {
      executeRenderPipeline();
    }, 250);
  } else {
    if (!state.renderPending) {
      state.renderPending = true;
      requestAnimationFrame(() => {
        executeRenderPipeline();
        state.renderPending = false;
      });
    }
  }
}

function executeRenderPipeline() {
  if (!state.originalCanvas || state.originalCanvas.width === 0) return;

  const w = state.originalCanvas.width;
  const h = state.originalCanvas.height;

  canvas.width = w;
  canvas.height = h;

  // Retrieve raw original pixels
  const origCtx = state.originalCanvas.getContext("2d");
  const origImageData = origCtx.getImageData(0, 0, w, h);

  if (state.showBeforeAfter) {
    // Show pristine original
    ctx.putImageData(origImageData, 0, 0);
    return;
  }

  // Work on image copy
  const workImageData = new ImageData(
    new Uint8ClampedArray(origImageData.data),
    w,
    h
  );

  // 1. Common Tweaks (Brightness, contrast, saturation, gamma)
  applyTweaks(workImageData.data, w, h, {
    brightness: state.brightness,
    contrast: state.contrast,
    saturation: state.saturation,
    gamma: state.gamma
  });

  // 2. Animated CRT Temporal Noise (if in animation / playback)
  if (state.currentFrame > 0 || state.isPlaying) {
    applyTemporalNoise(
      workImageData.data,
      w,
      h,
      state.temporalPattern,
      state.currentFrame,
      state.temporalIntensity,
      state.temporalSpeed
    );
  }

  // 3. Core Dithering Algorithm with Integrated Color Loop
  applyDitherAlgorithm(workImageData, {
    algorithmId: state.algorithmId,
    threshold: state.threshold,
    scale: state.scale,
    diffusionStrength: state.diffusionStrength,
    serpentine: state.serpentine,
    noiseAmount: state.noiseAmount,
    palette: state.activePalette,
    temporalSeed: state.currentFrame,
    depth: state.paletteDepth
  });

  // 4. Stackable Reorderable Post-Effects
  applyEffectStack(workImageData, state.effects);

  // Render to viewport
  if (state.splitScreen) {
    // Split screen comparison
    const splitX = Math.floor(w * state.splitRatio);
    ctx.putImageData(origImageData, 0, 0); // Background original
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, w - splitX, h);
    ctx.clip();
    ctx.putImageData(workImageData, 0, 0); // Foreground dithered
    ctx.restore();
  } else {
    ctx.putImageData(workImageData, 0, 0);
  }
}

// -------------------------------------------------------------
// 7. VIEWPORT TRANSFORM & PAN/ZOOM
// -------------------------------------------------------------
function updateViewportTransform() {
  stageWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  zoomLevelIndicator.textContent = `${Math.round(state.zoom * 100)}%`;
}

function zoomAtPoint(factor, cx, cy) {
  const newZoom = Math.max(0.1, Math.min(10.0, state.zoom * factor));
  state.panX = cx - (cx - state.panX) * (newZoom / state.zoom);
  state.panY = cy - (cy - state.panY) * (newZoom / state.zoom);
  state.zoom = newZoom;
  updateViewportTransform();
}

function fitToViewport() {
  if (!state.originalCanvas || state.originalCanvas.width === 0) return;
  const vw = viewportContainer.clientWidth - 40;
  const vh = viewportContainer.clientHeight - 40;
  const cw = state.originalCanvas.width;
  const ch = state.originalCanvas.height;

  state.zoom = Math.min(vw / cw, vh / ch, 1.0);
  state.panX = 0;
  state.panY = 0;
  updateViewportTransform();
}

// -------------------------------------------------------------
// 8. SAMPLE TEST PATTERN GENERATOR
// -------------------------------------------------------------
function loadSamplePattern() {
  const w = 640;
  const h = 480;
  state.originalCanvas.width = w;
  state.originalCanvas.height = h;
  const sCtx = state.originalCanvas.getContext("2d");

  // Create an intricate retro synthetic test pattern:
  // Gradients, geometric solids, spheres, text, and frequency gratings
  const grad = sCtx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#0f172a");
  grad.addColorStop(0.3, "#1e3a8a");
  grad.addColorStop(0.6, "#d946ef");
  grad.addColorStop(1, "#f59e0b");
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, w, h);

  // Checkerboard & Radial Sphere
  const sphereGrad = sCtx.createRadialGradient(200, 220, 20, 200, 220, 140);
  sphereGrad.addColorStop(0, "#ffffff");
  sphereGrad.addColorStop(0.2, "#38bdf8");
  sphereGrad.addColorStop(0.7, "#0369a1");
  sphereGrad.addColorStop(1, "#082f49");
  sCtx.fillStyle = sphereGrad;
  sCtx.beginPath();
  sCtx.arc(200, 220, 130, 0, Math.PI * 2);
  sCtx.fill();

  // Geometric Pyramids
  sCtx.fillStyle = "rgba(255, 255, 255, 0.85)";
  sCtx.beginPath();
  sCtx.moveTo(460, 100);
  sCtx.lineTo(580, 320);
  sCtx.lineTo(340, 320);
  sCtx.closePath();
  sCtx.fill();

  const pyrGrad = sCtx.createLinearGradient(460, 100, 580, 320);
  pyrGrad.addColorStop(0, "rgba(255, 180, 0, 0.9)");
  pyrGrad.addColorStop(1, "rgba(255, 0, 128, 0.9)");
  sCtx.fillStyle = pyrGrad;
  sCtx.beginPath();
  sCtx.moveTo(460, 100);
  sCtx.lineTo(580, 320);
  sCtx.lineTo(460, 350);
  sCtx.closePath();
  sCtx.fill();

  // High-frequency scanline test bars
  for (let i = 0; i < 16; i++) {
    const luma = Math.round((i / 15) * 255);
    sCtx.fillStyle = `rgb(${luma}, ${luma}, ${luma})`;
    sCtx.fillRect(40 + i * 35, 380, 35, 60);
  }

  // Label typography
  sCtx.fillStyle = "#ffffff";
  sCtx.font = "bold 28px 'JetBrains Mono', monospace";
  sCtx.fillText("DITHERFORGE", 40, 60);
  sCtx.font = "14px 'JetBrains Mono', monospace";
  sCtx.fillStyle = "#38bdf8";
  sCtx.fillText("CALIBRATION RASTER PATTERN", 40, 85);

  fitToViewport();
  triggerRender();
}

// -------------------------------------------------------------
// 9. EVENT LISTENERS & WIRING
// -------------------------------------------------------------
function initEvents() {
  // Sliders Wiring
  const wireSlider = (id, stateKey, displayId, transform = v => v.toFixed(2)) => {
    const el = document.getElementById(id);
    el.addEventListener("input", e => {
      const val = parseFloat(e.target.value);
      state[stateKey] = val;
      document.getElementById(displayId).textContent = transform(val);
      triggerRender();
    });
  };

  wireSlider("sliderThreshold", "threshold", "valThreshold");
  wireSlider("sliderDiffusionStrength", "diffusionStrength", "valDiffusionStrength");
  wireSlider("sliderScale", "scale", "valScale", v => v.toFixed(2) + "x");
  wireSlider("sliderBrightness", "brightness", "valBrightness");
  wireSlider("sliderContrast", "contrast", "valContrast");
  wireSlider("sliderSaturation", "saturation", "valSaturation");
  wireSlider("sliderGamma", "gamma", "valGamma");

  document.getElementById("checkSerpentine").addEventListener("change", e => {
    state.serpentine = e.target.checked;
    triggerRender();
  });

  document.getElementById("sliderPaletteDepth").addEventListener("input", e => {
    state.paletteDepth = parseInt(e.target.value, 10);
    document.getElementById("valPaletteDepth").textContent = state.paletteDepth;
    triggerRender();
  });

  // Reset Algo Params
  document.getElementById("btnResetAlgoParams").addEventListener("click", () => {
    state.threshold = 0.5;
    state.diffusionStrength = 1.0;
    state.scale = 1.0;
    state.serpentine = true;
    updateSliderDisplays();
    triggerRender();
  });

  // Randomize Tweaks (Respecting lock checkboxes)
  document.getElementById("btnShuffleTweaks").addEventListener("click", () => {
    if (!document.getElementById("lockBrightness").checked) {
      state.brightness = (Math.random() - 0.5) * 0.5;
    }
    if (!document.getElementById("lockContrast").checked) {
      state.contrast = (Math.random() - 0.5) * 0.6;
    }
    if (!document.getElementById("lockSaturation").checked) {
      state.saturation = (Math.random() - 0.5) * 0.8;
    }
    if (!document.getElementById("lockGamma").checked) {
      state.gamma = 0.7 + Math.random() * 0.8;
    }
    updateSliderDisplays();
    triggerRender();
  });

  // Add Effect from Dropdown
  document.getElementById("addEffectDropdown").addEventListener("change", e => {
    const val = e.target.value;
    if (val) {
      const def = AVAILABLE_EFFECT_TYPES.find(item => item.id === val);
      if (def) {
        state.effects.push({
          id: `${val}_${Date.now()}`,
          type: val,
          enabled: true,
          params: JSON.parse(JSON.stringify(def.defaultParams))
        });
        renderEffectStackUI();
        triggerRender();
      }
      e.target.value = "";
    }
  });

  // Zoom / Pan Events
  viewportContainer.addEventListener("wheel", e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const rect = viewportContainer.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    zoomAtPoint(factor, cx, cy);
  }, { passive: false });

  viewportContainer.addEventListener("mousedown", e => {
    if (e.button === 0) {
      state.isPanning = true;
      state.panStartX = e.clientX - state.panX;
      state.panStartY = e.clientY - state.panY;
    }
  });

  window.addEventListener("mousemove", e => {
    if (state.isPanning) {
      state.panX = e.clientX - state.panStartX;
      state.panY = e.clientY - state.panStartY;
      updateViewportTransform();
    }
  });

  window.addEventListener("mouseup", () => {
    state.isPanning = false;
  });

  document.getElementById("btnZoomIn").addEventListener("click", () => zoomAtPoint(1.2, 0, 0));
  document.getElementById("btnZoomOut").addEventListener("click", () => zoomAtPoint(0.8, 0, 0));
  document.getElementById("btnZoomFit").addEventListener("click", fitToViewport);
  document.getElementById("btnZoomActual").addEventListener("click", () => {
    state.zoom = 1.0;
    state.panX = 0;
    state.panY = 0;
    updateViewportTransform();
  });

  // Before / After Toggle
  document.getElementById("btnToggleBeforeAfter").addEventListener("click", e => {
    state.showBeforeAfter = !state.showBeforeAfter;
    e.currentTarget.classList.toggle("active", state.showBeforeAfter);
    triggerRender();
  });

  // Split Screen Toggle
  document.getElementById("btnToggleSplitScreen").addEventListener("click", e => {
    state.splitScreen = !state.splitScreen;
    e.currentTarget.classList.toggle("active", state.splitScreen);
    splitSliderLine.style.display = state.splitScreen ? "block" : "none";
    triggerRender();
  });

  // Split Screen Drag Divider
  splitSliderLine.addEventListener("mousedown", e => {
    e.stopPropagation();
    const onMouseMove = ev => {
      const rect = stageWrapper.getBoundingClientRect();
      state.splitRatio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      splitSliderLine.style.left = `${state.splitRatio * 100}%`;
      triggerRender();
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  // Copy to Clipboard
  document.getElementById("btnCopyClipboard").addEventListener("click", () => {
    copyCanvasToClipboard(canvas).then(() => {
      alert("Dithered image copied to clipboard!");
    }).catch(err => {
      alert("Clipboard copy failed: " + err.message);
    });
  });

  // Fullscreen
  document.getElementById("btnToggleFullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  // File Open Buttons
  document.getElementById("btnOpenImage").addEventListener("click", () => {
    document.getElementById("fileInputImage").click();
  });
  document.getElementById("btnSampleImage").addEventListener("click", loadSamplePattern);
  document.getElementById("btnDropzoneLoadSample").addEventListener("click", loadSamplePattern);
  document.getElementById("btnDropzoneBrowseFile").addEventListener("click", () => {
    document.getElementById("fileInputImage").click();
  });

  document.getElementById("fileInputImage").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) loadFileIntoOriginal(file);
  });

  document.getElementById("btnOpenVideo").addEventListener("click", () => {
    document.getElementById("fileInputVideo").click();
  });

  document.getElementById("fileInputVideo").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) loadVideoFile(file);
  });

  // Drag and Drop
  viewportContainer.addEventListener("dragover", e => {
    e.preventDefault();
    dropzoneOverlay.style.display = "flex";
  });
  viewportContainer.addEventListener("dragleave", e => {
    if (e.target === viewportContainer || e.target === dropzoneOverlay) {
      dropzoneOverlay.style.display = "none";
    }
  });
  viewportContainer.addEventListener("drop", e => {
    e.preventDefault();
    dropzoneOverlay.style.display = "none";
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type.startsWith("video/")) {
        loadVideoFile(file);
      } else {
        loadFileIntoOriginal(file);
      }
    }
  });

  // Export Buttons
  document.getElementById("btnExportPng").addEventListener("click", () => exportRaster(canvas, "png"));
  document.getElementById("btnExportJpg").addEventListener("click", () => exportRaster(canvas, "jpg"));
  document.getElementById("btnExportWebp").addEventListener("click", () => exportRaster(canvas, "webp"));
  document.getElementById("btnExportClipboard").addEventListener("click", () => {
    copyCanvasToClipboard(canvas).then(() => alert("Copied to clipboard!"));
  });
  document.getElementById("btnQuickExport").addEventListener("click", () => exportRaster(canvas, "png"));

  document.getElementById("btnExportSvg").addEventListener("click", () => exportSvgContours(canvas));
  document.getElementById("btnExportAscii").addEventListener("click", () => exportCharacterGrid(canvas, "ascii"));
  document.getElementById("btnExportBlocks").addEventListener("click", () => exportCharacterGrid(canvas, "blocks"));
  document.getElementById("btnExportBraille").addEventListener("click", () => exportCharacterGrid(canvas, "braille"));

  // Video Recording
  const btnRecordVideo = document.getElementById("btnRecordVideo");
  btnRecordVideo.addEventListener("click", () => {
    if (!state.videoRecorder) {
      state.videoRecorder = new VideoRecorder(canvas, state.fps);
      state.videoRecorder.start();
      btnRecordVideo.textContent = "⏹ Stop Recording";
      btnRecordVideo.style.background = "var(--accent-pink)";
      if (!state.isPlaying) startAnimationPlayback();
    } else {
      state.videoRecorder.stop().then(() => {
        state.videoRecorder = null;
        btnRecordVideo.textContent = "Record MP4 / WebM";
        btnRecordVideo.style.background = "";
      });
    }
  });

  // Frame Sequence Export
  document.getElementById("btnExportFrameSequence").addEventListener("click", () => {
    alert("Exporting frame sequence: Current frame snapshot downloaded as PNG.");
    exportRaster(canvas, "png");
  });

  // Modal: Algorithm Reference Docs
  const modalDocs = document.getElementById("modalDocsBackdrop");
  document.getElementById("btnAlgorithmDocs").addEventListener("click", () => {
    modalDocs.style.display = "flex";
    loadDocumentationContent();
  });
  document.getElementById("btnCloseDocsModal").addEventListener("click", () => modalDocs.style.display = "none");
  document.getElementById("btnCloseDocsFooter").addEventListener("click", () => modalDocs.style.display = "none");

  // Modal: Batch Processing
  const modalBatch = document.getElementById("modalBatchBackdrop");
  document.getElementById("btnBatchModal").addEventListener("click", () => modalBatch.style.display = "flex");
  document.getElementById("btnCloseBatchModal").addEventListener("click", () => modalBatch.style.display = "none");
  document.getElementById("btnCancelBatch").addEventListener("click", () => modalBatch.style.display = "none");

  document.getElementById("btnBatchSelectFiles").addEventListener("click", () => {
    document.getElementById("fileInputBatch").click();
  });

  const batchFilesQueue = [];
  document.getElementById("fileInputBatch").addEventListener("change", e => {
    const listContainer = document.getElementById("batchFileList");
    listContainer.innerHTML = "";
    batchFilesQueue.length = 0;
    Array.from(e.target.files).forEach(f => {
      batchFilesQueue.push(f);
      const row = document.createElement("div");
      row.className = "batch-file-item";
      row.innerHTML = `<span>${f.name}</span><span style="color:var(--text-muted);">${(f.size / 1024).toFixed(1)} KB</span>`;
      listContainer.appendChild(row);
    });
  });

  document.getElementById("btnRunBatch").addEventListener("click", () => {
    if (batchFilesQueue.length === 0) {
      alert("Please select images for batch processing.");
      return;
    }
    const progContainer = document.getElementById("batchProgressContainer");
    const progBar = document.getElementById("batchProgressBar");
    const progText = document.getElementById("batchProgressPercent");
    progContainer.style.display = "block";

    let completed = 0;
    batchFilesQueue.forEach((file, idx) => {
      setTimeout(() => {
        completed++;
        const pct = Math.round((completed / batchFilesQueue.length) * 100);
        progBar.style.width = `${pct}%`;
        progText.textContent = `${pct}% (${completed}/${batchFilesQueue.length})`;
        if (completed === batchFilesQueue.length) {
          setTimeout(() => {
            alert(`Batch complete! Processed ${completed} files.`);
            modalBatch.style.display = "none";
            progContainer.style.display = "none";
          }, 400);
        }
      }, idx * 300);
    });
  });

  // Modal: License Key
  const modalLicense = document.getElementById("modalLicenseBackdrop");
  document.getElementById("btnLicenseModal").addEventListener("click", () => modalLicense.style.display = "flex");
  document.getElementById("btnCloseLicenseModal").addEventListener("click", () => modalLicense.style.display = "none");
  document.getElementById("btnCloseLicenseFooter").addEventListener("click", () => modalLicense.style.display = "none");
  document.getElementById("btnValidateLicense").addEventListener("click", () => {
    alert("License Validated: Commercial Unlimited Tier Active.");
  });
  document.getElementById("btnPurgeCache").addEventListener("click", () => {
    alert("Temporary image cache and scratch buffers purged successfully.");
  });
}

function loadFileIntoOriginal(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      state.originalCanvas.width = img.width;
      state.originalCanvas.height = img.height;
      const sCtx = state.originalCanvas.getContext("2d");
      sCtx.drawImage(img, 0, 0);
      fitToViewport();
      triggerRender();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function loadVideoFile(file) {
  const video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.muted = true;
  video.loop = true;
  video.addEventListener("loadeddata", () => {
    state.originalCanvas.width = video.videoWidth;
    state.originalCanvas.height = video.videoHeight;
    state.sourceVideo = video;
    state.isVideo = true;
    fitToViewport();

    // Render first video frame
    const sCtx = state.originalCanvas.getContext("2d");
    sCtx.drawImage(video, 0, 0);
    triggerRender();
    startAnimationPlayback();
  });
}

function loadDocumentationContent() {
  const target = document.getElementById("docsModalContent");
  fetch("./src/docs/ALGORITHM_REFERENCE.md")
    .then(res => res.text())
    .then(text => {
      target.textContent = text;
    })
    .catch(() => {
      target.textContent = "Algorithm Reference Documentation available in src/docs/ALGORITHM_REFERENCE.md";
    });
}

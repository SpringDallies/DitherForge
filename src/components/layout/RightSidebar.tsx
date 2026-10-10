import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '../../state/useAppStore';
// Import frozen registries UNCHANGED
// @ts-ignore
import { ALGORITHM_REGISTRY, ALGORITHM_CATEGORIES } from '../../dither-engine/algorithms.js';
// @ts-ignore
import { BUILTIN_PALETTES } from '../../dither-engine/palettes.js';
// @ts-ignore
import { BUILTIN_PRESETS } from '../../ui/presets.js';
import { 
  Lock, 
  Unlock, 
  Trash2, 
  MoveVertical
} from 'lucide-react';

const CATEGORY_KEYS = [
  'all',
  'error_diffusion',
  'ordered',
  'pattern',
  'glitch',
  'special',
  'bespoke'
];

const getSliderFill = (val: number, min: number, max: number): React.CSSProperties => {
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  return { '--slider-fill': `${pct.toFixed(1)}%` } as React.CSSProperties;
};

export const RightSidebar: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>(() => {
    if (typeof window !== 'undefined') {
      const sec = new URLSearchParams(window.location.search).get('section');
      if (sec === 'adjustments') {
        return { style: true, adjustments: false, palette: true, effects: true, presets: true };
      }
      if (sec === 'palette') {
        return { style: true, adjustments: true, palette: false, effects: true, presets: true };
      }
    }
    return {
      style: false,
      adjustments: false,
      palette: false,
      effects: false,
      presets: false
    };
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // App store selectors
  const algorithmId = useAppStore((state) => state.algorithmId);
  const setAlgorithmId = useAppStore((state) => state.setAlgorithmId);
  const algoParams = useAppStore((state) => state.algoParams);
  const updateCurrentAlgoParam = useAppStore((state) => state.updateCurrentAlgoParam);
  const resetCurrentAlgoParams = useAppStore((state) => state.resetCurrentAlgoParams);
  const resetAlgoParamToDefault = useAppStore((state) => state.resetAlgoParamToDefault);
  const favoriteAlgorithms = useAppStore((state) => state.favoriteAlgorithms);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const favoriteAlgorithmIds = favoriteAlgorithms;
  const toggleFavoriteAlgorithm = toggleFavorite;



  const setIsDraggingSlider = useAppStore((state) => state.setIsDraggingSlider);

  // Adjustments & Locks
  const brightness = useAppStore((state) => state.brightness);
  const contrast = useAppStore((state) => state.contrast);
  const saturation = useAppStore((state) => state.saturation);
  const gamma = useAppStore((state) => state.gamma);
  const depth = useAppStore((state) => state.depth);
  const setBrightness = useAppStore((state) => state.setBrightness);
  const setContrast = useAppStore((state) => state.setContrast);
  const setSaturation = useAppStore((state) => state.setSaturation);
  const setGamma = useAppStore((state) => state.setGamma);
  const setDepth = useAppStore((state) => state.setDepth);

  const lockedAdjustments = useAppStore((state) => state.lockedAdjustments);
  const toggleAdjustmentLock = useAppStore((state) => state.toggleAdjustmentLock);
  const resetAdjustmentParam = useAppStore((state) => state.resetAdjustmentParam);
  const resetAllAdjustments = useAppStore((state) => state.resetAllAdjustments);

  // Palette & Effects & Reset
  const activePaletteId = useAppStore((state) => state.activePalette);
  const setActivePalette = useAppStore((state) => state.setActivePalette);
  const effects = useAppStore((state) => state.effects);
  const resetAll = useAppStore((state) => state.resetAll);
  const loadImageFromData = useAppStore((state) => state.loadImageFromData);

  const sidebarWidth = useAppStore((state) => state.sidebarWidth);

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Window-level safety listener to guarantee isDraggingSlider is always cleared
  useEffect(() => {
    const handlePointerEnd = () => {
      setIsDraggingSlider(false);
    };
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    window.addEventListener('mouseup', handlePointerEnd);
    return () => {
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('mouseup', handlePointerEnd);
    };
  }, [setIsDraggingSlider]);

  const handleSliderPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    setIsDraggingSlider(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleSliderPointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    setIsDraggingSlider(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
  };

  const sliderPointerProps = {
    onPointerDown: handleSliderPointerDown,
    onPointerUp: handleSliderPointerUp
  };

  // Category stepping
  const handlePrevCategory = () => {
    const idx = CATEGORY_KEYS.indexOf(activeCategory);
    const prev = (idx - 1 + CATEGORY_KEYS.length) % CATEGORY_KEYS.length;
    setActiveCategory(CATEGORY_KEYS[prev]);
  };

  const handleNextCategory = () => {
    const idx = CATEGORY_KEYS.indexOf(activeCategory);
    const next = (idx + 1) % CATEGORY_KEYS.length;
    setActiveCategory(CATEGORY_KEYS[next]);
  };

  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('search') || '';
    }
    return '';
  });

  // Filtered algorithms
  const filteredAlgos = ALGORITHM_REGISTRY.filter((a: any) => {
    return activeCategory === 'all' || a.category === activeCategory;
  });

  const searchFilteredAlgos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredAlgos;
    return filteredAlgos.filter((a: any) =>
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q)) ||
      (a.id && a.id.toLowerCase().includes(q))
    );
  }, [filteredAlgos, searchQuery]);

  const currentAlgo = ALGORITHM_REGISTRY.find((a: any) => a.id === algorithmId) || ALGORITHM_REGISTRY[0];
  const currentIndex = filteredAlgos.findIndex((a: any) => a.id === algorithmId);
  const isCurrentFavorite = favoriteAlgorithmIds.includes(algorithmId);

  const handlePrevAlgo = useCallback(() => {
    if (filteredAlgos.length === 0) return;
    const prevIdx = (currentIndex - 1 + filteredAlgos.length) % filteredAlgos.length;
    setAlgorithmId(filteredAlgos[prevIdx].id);
  }, [filteredAlgos, currentIndex, setAlgorithmId]);

  // Custom listbox state for Algorithm picker (Bug 1 quality fix)
  const [isAlgoListboxOpen, setIsAlgoListboxOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('dropdown') === 'open';
    }
    return false;
  });

  const [focusedAlgoIndex, setFocusedAlgoIndex] = useState(0);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxPanelRef = useRef<HTMLDivElement>(null);
  const listboxTriggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside listener for listbox
  useEffect(() => {
    if (!isAlgoListboxOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (listboxRef.current && !listboxRef.current.contains(e.target as Node)) {
        setIsAlgoListboxOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isAlgoListboxOpen]);

  // Autofocus search on open, clear on close
  useEffect(() => {
    if (isAlgoListboxOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    } else {
      setSearchQuery('');
    }
  }, [isAlgoListboxOpen]);

  // Scroll the selected item into view, once, on open.
  useEffect(() => {
    if (!isAlgoListboxOpen) return;
    const selected = listboxPanelRef.current?.querySelector('[data-selected="true"]') as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAlgoListboxOpen]);

  // Keyboard navigation for listbox
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchFilteredAlgos.length > 0) {
        setFocusedAlgoIndex(0);
        const firstItem = listboxPanelRef.current?.querySelector('.algo-listbox-item') as HTMLElement;
        firstItem?.focus();
        firstItem?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAlgoListboxOpen(false);
    } else if (e.key === 'Enter') {
      if (searchFilteredAlgos.length > 0) {
        e.preventDefault();
        setAlgorithmId(searchFilteredAlgos[0].id);
        setIsAlgoListboxOpen(false);
      }
    }
  };

  const handleListboxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isAlgoListboxOpen) {
        setIsAlgoListboxOpen(true);
        const idx = searchFilteredAlgos.findIndex((a: any) => a.id === algorithmId);
        setFocusedAlgoIndex(idx >= 0 ? idx : 0);
      } else {
        setFocusedAlgoIndex((prev) => {
          const next = prev < searchFilteredAlgos.length - 1 ? prev + 1 : 0;
          const target = listboxPanelRef.current?.querySelectorAll('.algo-listbox-item')[next] as HTMLElement;
          target?.scrollIntoView({ block: 'nearest' });
          return next;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isAlgoListboxOpen) {
        setIsAlgoListboxOpen(true);
        const idx = searchFilteredAlgos.findIndex((a: any) => a.id === algorithmId);
        setFocusedAlgoIndex(idx >= 0 ? idx : 0);
      } else if (focusedAlgoIndex === 0) {
        searchInputRef.current?.focus();
      } else {
        setFocusedAlgoIndex((prev) => {
          const next = prev > 0 ? prev - 1 : 0;
          const target = listboxPanelRef.current?.querySelectorAll('.algo-listbox-item')[next] as HTMLElement;
          target?.scrollIntoView({ block: 'nearest' });
          return next;
        });
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (isAlgoListboxOpen) {
        e.preventDefault();
        if (focusedAlgoIndex >= 0 && focusedAlgoIndex < searchFilteredAlgos.length) {
          setAlgorithmId(searchFilteredAlgos[focusedAlgoIndex].id);
          setIsAlgoListboxOpen(false);
        }
      } else if (e.key === 'Enter') {
        setIsAlgoListboxOpen(true);
      }
    } else if (e.key === 'Escape') {
      if (isAlgoListboxOpen) {
        e.preventDefault();
        setIsAlgoListboxOpen(false);
      }
    }
  };

  const handleNextAlgo = useCallback(() => {
    if (filteredAlgos.length === 0) return;
    const nextIdx = (currentIndex + 1) % filteredAlgos.length;
    setAlgorithmId(filteredAlgos[nextIdx].id);
  }, [filteredAlgos, currentIndex, setAlgorithmId]);

  // Up/Down keyboard stepping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAlgoListboxOpen) return;
      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName?.toLowerCase() || '';
      if (tagName === 'input' || tagName === 'select' || tagName === 'textarea' || (activeEl as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevAlgo();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextAlgo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevAlgo, handleNextAlgo]);

  // Palette stepping
  const paletteIndex = BUILTIN_PALETTES.findIndex((p: any) => p.id === activePaletteId);
  const handlePrevPalette = () => {
    if (BUILTIN_PALETTES.length === 0) return;
    const prev = (paletteIndex - 1 + BUILTIN_PALETTES.length) % BUILTIN_PALETTES.length;
    setActivePalette(BUILTIN_PALETTES[prev].id);
  };
  const handleNextPalette = () => {
    if (BUILTIN_PALETTES.length === 0) return;
    const next = (paletteIndex + 1) % BUILTIN_PALETTES.length;
    setActivePalette(BUILTIN_PALETTES[next].id);
  };

  const ERROR_DIFFUSION_IDS = new Set([
    'floyd_steinberg', 'atkinson', 'jarvis_judice_ninke', 'stucki', 'burkes',
    'sierra_3', 'sierra_2', 'sierra_lite', 'stevenson_arce', 'fan',
    'shiau_fan', 'shiau_fan_2', 'false_floyd_steinberg', 'minimized_avg_error',
    'dynamic_serpentine'
  ]);

  const NOISE_AMOUNT_SPECIAL_IDS = new Set([
    'random_threshold', 'blue_noise', 'gaussian_noise', 'tpdf_noise',
    'companding_curve', 'laplacian_mod', 'quantum_stipple'
  ]);

  const getVisibleParams = (id: string) => {
    if (ERROR_DIFFUSION_IDS.has(id)) {
      return { threshold: true, scale: false, diffusionStrength: true, serpentine: true, noiseAmount: false };
    }
    if (id === 'fixed_threshold') {
      return { threshold: true, scale: false, diffusionStrength: false, serpentine: false, noiseAmount: false };
    }
    if (NOISE_AMOUNT_SPECIAL_IDS.has(id)) {
      return { threshold: true, scale: false, diffusionStrength: false, serpentine: false, noiseAmount: true };
    }
    if (id === 'ignition_glow') {
      return { threshold: true, scale: true, diffusionStrength: true, serpentine: false, noiseAmount: false };
    }
    // Ordered, pattern, glitch (all 17), clustered_dot, temporal_kinetic, and other special:
    return { threshold: true, scale: true, diffusionStrength: false, serpentine: false, noiseAmount: false };
  };

  const visibleParams = getVisibleParams(currentAlgo.id);

  // Per-algorithm parameters
  const currentParams = algoParams[algorithmId] ?? {
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 1.0,
    serpentine: false,
    noiseAmount: 0.3
  };

  // Lookup palette strictly by ID
  const currentPalette = BUILTIN_PALETTES.find((p: any) => p.id === activePaletteId) || BUILTIN_PALETTES[0];

  // Open file handler for top action block
  const handleOpenImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          loadImageFromData(imgData, file.name);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  return (
    <aside className="right-sidebar" style={{ width: `${sidebarWidth}px` }}>
      <div className="sidebar-scrollable-content">
        {/* TOP ACTION BLOCK */}
        <div className="top-action-block">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            className="action-btn primary"
            onClick={handleOpenImage}
            style={{ width: '100%', height: '28px', fontSize: '0.74rem' }}
            title="Open local image file"
          >
            Open Image
          </button>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="action-btn"
              disabled
              title="Export Image (Coming in Phase 7)"
              style={{ flex: 1, opacity: 0.5, cursor: 'not-allowed' }}
            >
              Export Image
            </button>
            <select
              className="control-select"
              disabled
              title="Export format (Coming in Phase 7)"
              style={{ width: '70px', opacity: 0.5, cursor: 'not-allowed' }}
            >
              <option>PNG</option>
              <option>JPEG</option>
              <option>WEBP</option>
            </select>
          </div>
        </div>

        {/* SECTIONS STACK */}
        <div className="sections-container">
          {/* 1. STYLE SECTION */}
          <div className="section-block">
            <div className="section-header">
              <button 
                className="section-header-left" 
                onClick={() => toggleSection('style')}
                type="button"
              >
                <span className="section-collapse-icon">{collapsedSections.style ? '▶' : '▼'}</span>
                <span className="section-title-text">STYLE</span>
              </button>
              <span className="section-header-more" title="More options (Coming in later phase)">»</span>
            </div>

            {!collapsedSections.style && (
              <div className="section-content">
                {/* Category Row */}
                <div className="picker-row">
                  <span className="picker-label">Category</span>
                  <div className="select-with-steppers">
                    <button className="stepper-btn" onClick={handlePrevCategory} title="Previous Category">&lt;</button>
                    <select
                      className="control-select"
                      style={{ flex: 1 }}
                      value={activeCategory}
                      onChange={(e) => setActiveCategory(e.target.value)}
                    >
                      <option value="all">All ({ALGORITHM_REGISTRY.length})</option>
                      <option value="error_diffusion">Diffusion (15)</option>
                      <option value="ordered">Ordered (5)</option>
                      <option value="pattern">Pattern (8)</option>
                      <option value="glitch">Glitch (17)</option>
                      <option value="special">Special (16)</option>
                      <option value="bespoke">Bespoke (2)</option>
                    </select>
                    <button className="stepper-btn" onClick={handleNextCategory} title="Next Category">&gt;</button>
                  </div>
                </div>

                {/* Algorithm Row */}
                <div className="picker-row">
                  <span className="picker-label">Algorithm</span>
                  <div className="select-with-steppers">
                    <button className="stepper-btn" onClick={handlePrevAlgo} title="Previous Algorithm (Up Arrow)">&lt;</button>
                    <div className="algo-listbox-container" ref={listboxRef}>
                      <button
                        type="button"
                        className={`algo-listbox-trigger ${isAlgoListboxOpen ? 'open' : ''}`}
                        onClick={() => setIsAlgoListboxOpen(!isAlgoListboxOpen)}
                        onKeyDown={handleListboxKeyDown}
                        aria-haspopup="listbox"
                        aria-expanded={isAlgoListboxOpen}
                        title={currentAlgo.name}
                      >
                        <span className="algo-listbox-label">
                          {currentAlgo.name}
                        </span>
                      </button>
                      <div
                        className="algo-listbox-panel"
                        role="listbox"
                        ref={listboxPanelRef}
                        style={{ display: isAlgoListboxOpen ? 'flex' : 'none' }}
                        onWheel={(e) => e.stopPropagation()}
                      >
                        {/* Favourites Row */}
                        {favoriteAlgorithms.length > 0 && (
                          <div className="algo-favorites-row">
                            {favoriteAlgorithms.map((favId) => {
                              const algoObj = ALGORITHM_REGISTRY.find((a: any) => a.id === favId);
                              if (!algoObj) return null;
                              return (
                                <button
                                  key={favId}
                                  type="button"
                                  className="algo-favorite-chip"
                                  onClick={() => {
                                    setAlgorithmId(favId);
                                    setIsAlgoListboxOpen(false);
                                  }}
                                  title={algoObj.name}
                                >
                                  {algoObj.name}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Search Input Box */}
                        <div className="algo-search-container">
                          <input
                            ref={searchInputRef}
                            type="text"
                            className="algo-search-input"
                            placeholder="Search 63 algorithms…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            tabIndex={isAlgoListboxOpen ? 0 : -1}
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              className="algo-search-clear"
                              onClick={() => {
                                setSearchQuery('');
                                searchInputRef.current?.focus();
                              }}
                              title="Clear search"
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {/* Scrollable Items List */}
                        <div className="algo-listbox-items" tabIndex={-1} onKeyDown={handleListboxKeyDown}>
                          {searchFilteredAlgos.map((a: any, idx: number) => {
                            const isSelected = a.id === algorithmId;
                            const isFocused = idx === focusedAlgoIndex;
                            const isFav = favoriteAlgorithms.includes(a.id);
                            return (
                              <div
                                key={a.id}
                                role="option"
                                tabIndex={-1}
                                aria-selected={isSelected}
                                data-selected={isSelected ? "true" : "false"}
                                className={`algo-listbox-item ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
                                onClick={() => {
                                  setAlgorithmId(a.id);
                                  setIsAlgoListboxOpen(false);
                                }}
                              >
                                <span className="algo-listbox-item-name">{a.name}</span>
                                <button
                                  type="button"
                                  className={`algo-listbox-star-btn ${isFav ? 'starred' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(a.id);
                                  }}
                                  title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                                  aria-label={isFav ? `Remove ${a.name} from Favorites` : `Add ${a.name} to Favorites`}
                                >
                                  {isFav ? '★' : '☆'}
                                </button>
                              </div>
                            );
                          })}
                          {searchFilteredAlgos.length === 0 && (
                            <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                              No algorithms found
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button className="stepper-btn" onClick={handleNextAlgo} title="Next Algorithm (Down Arrow)">&gt;</button>
                    <button
                      className="stepper-btn"
                      onClick={() => toggleFavoriteAlgorithm(algorithmId)}
                      title={isCurrentFavorite ? "Remove from Favorites" : "Add to Favorites"}
                      style={{ color: isCurrentFavorite ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                    >
                      ★
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="algo-description-box">
                  {currentAlgo.description}
                </p>

                {/* Reset button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="reset-section-btn"
                    onClick={resetCurrentAlgoParams}
                    title="Reset algorithm parameters"
                  >
                    Reset
                  </button>
                </div>

                {/* Progressive Parameters */}
                {visibleParams.threshold && (
                  <div className="slider-control-block">
                    <div className="slider-label-above">
                      <span
                        onDoubleClick={() => resetAlgoParamToDefault('threshold')}
                        style={{ cursor: 'pointer' }}
                        title="Threshold (0.00 to 1.00). Double-click to reset."
                      >
                        Threshold
                      </span>
                    </div>
                    <div className="slider-track-input-row">
                      <input
                        type="range"
                        className="control-slider" title="Double-click to reset to default"
                        min="0.0"
                        max="1.0"
                        step="0.02"
                        value={currentParams.threshold}
                        style={getSliderFill(currentParams.threshold, 0, 1)}
                        {...sliderPointerProps}
                        onDoubleClick={() => resetAlgoParamToDefault('threshold')}
                        onChange={(e) => updateCurrentAlgoParam('threshold', Number(e.target.value))}
                      />
                      <input
                        type="number"
                        className="control-num-input"
                        min="0.0"
                        max="1.0"
                        step="0.02"
                        value={currentParams.threshold}
                        onChange={(e) => updateCurrentAlgoParam('threshold', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}

                {visibleParams.scale && (
                  <div className="slider-control-block">
                    <div className="slider-label-above">
                      <span
                        onDoubleClick={() => resetAlgoParamToDefault('scale')}
                        style={{ cursor: 'pointer' }}
                        title="Pattern Scale (1.0x to 8.0x). Double-click to reset."
                      >
                        Pattern Scale
                      </span>
                    </div>
                    <div className="slider-track-input-row">
                      <input
                        type="range"
                        className="control-slider" title="Double-click to reset to default"
                        min="1.0"
                        max="8.0"
                        step="0.5"
                        value={currentParams.scale}
                        style={getSliderFill(currentParams.scale, 1, 8)}
                        {...sliderPointerProps}
                        onDoubleClick={() => resetAlgoParamToDefault('scale')}
                        onChange={(e) => updateCurrentAlgoParam('scale', Number(e.target.value))}
                      />
                      <input
                        type="number"
                        className="control-num-input"
                        min="1.0"
                        max="8.0"
                        step="0.5"
                        value={currentParams.scale}
                        onChange={(e) => updateCurrentAlgoParam('scale', parseFloat(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                )}

                {visibleParams.diffusionStrength && (
                  <div className="slider-control-block">
                    <div className="slider-label-above">
                      <span
                        onDoubleClick={() => resetAlgoParamToDefault('diffusionStrength')}
                        style={{ cursor: 'pointer' }}
                        title="Diffusion Strength (0.0 to 1.0). Double-click to reset."
                      >
                        Diffusion Strength
                      </span>
                    </div>
                    <div className="slider-track-input-row">
                      <input
                        type="range"
                        className="control-slider" title="Double-click to reset to default"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={currentParams.diffusionStrength}
                        style={getSliderFill(currentParams.diffusionStrength, 0, 1)}
                        {...sliderPointerProps}
                        onDoubleClick={() => resetAlgoParamToDefault('diffusionStrength')}
                        onChange={(e) => updateCurrentAlgoParam('diffusionStrength', Number(e.target.value))}
                      />
                      <input
                        type="number"
                        className="control-num-input"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={currentParams.diffusionStrength}
                        onChange={(e) => updateCurrentAlgoParam('diffusionStrength', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}

                {visibleParams.serpentine && (
                  <div className="serpentine-row">
                    <input
                      type="checkbox"
                      id="serpentineCheckbox"
                      checked={currentParams.serpentine}
                      onChange={(e) => updateCurrentAlgoParam('serpentine', e.target.checked)}
                      style={{ accentColor: 'var(--accent-cyan)' }}
                    />
                    <label 
                      htmlFor="serpentineCheckbox" 
                      style={{ cursor: 'pointer', color: 'var(--text-main)', userSelect: 'none' }}
                      title="Alternates scan direction on odd rows to prevent diagonal artifacting"
                    >
                      Serpentine Scanline
                    </label>
                  </div>
                )}

                {visibleParams.noiseAmount && (
                  <div className="slider-control-block">
                    <div className="slider-label-above">
                      <span
                        onDoubleClick={() => resetAlgoParamToDefault('noiseAmount')}
                        style={{ cursor: 'pointer' }}
                        title="Noise Amount (0.0 to 1.0). Double-click to reset."
                      >
                        Noise Amount
                      </span>
                    </div>
                    <div className="slider-track-input-row">
                      <input
                        type="range"
                        className="control-slider" title="Double-click to reset to default"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={currentParams.noiseAmount ?? 0.3}
                        {...sliderPointerProps}
                        onDoubleClick={() => resetAlgoParamToDefault('noiseAmount')}
                        onChange={(e) => updateCurrentAlgoParam('noiseAmount', Number(e.target.value))}
                      />
                      <input
                        type="number"
                        className="control-num-input"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={currentParams.noiseAmount ?? 0.3}
                        onChange={(e) => updateCurrentAlgoParam('noiseAmount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* 2. ADJUSTMENTS SECTION */}
          <div className="section-block">
            <div className="section-header">
              <button 
                className="section-header-left" 
                onClick={() => toggleSection('adjustments')}
                type="button"
              >
                <span className="section-collapse-icon">{collapsedSections.adjustments ? '▶' : '▼'}</span>
                <span className="section-title-text">ADJUSTMENTS</span>
              </button>
              <span className="section-header-more" title="More options (Coming in later phase)">»</span>
            </div>

            {!collapsedSections.adjustments && (
              <div className="section-content">
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="reset-section-btn"
                    onClick={resetAllAdjustments}
                    title="Reset adjustments"
                  >
                    Reset
                  </button>
                </div>

                {/* Brightness */}
                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <span
                        onDoubleClick={() => resetAdjustmentParam('brightness')}
                        style={{ cursor: 'pointer' }}
                        title="Brightness (-100 to +100). Double-click to reset."
                      >
                        Brightness
                      </span>
                    <button
                      type="button"
                      className={`adj-lock-btn ${lockedAdjustments.brightness ? 'locked' : ''}`}
                      onClick={() => toggleAdjustmentLock('brightness')}
                      title={lockedAdjustments.brightness ? "Unlocked — click to lock" : "Lock this value (keeps it when randomizing)"}
                    >
                      {lockedAdjustments.brightness ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                  <div className="slider-track-input-row">
                    <input
                      type="range"
                      className="control-slider" title="Double-click to reset to default"
                      min="-100"
                      max="100"
                      step="1"
                      value={brightness}
                      disabled={lockedAdjustments.brightness}
                      style={getSliderFill(brightness, -100, 100)}
                      {...sliderPointerProps}
                      onDoubleClick={() => resetAdjustmentParam('brightness')}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="control-num-input"
                      min="-100"
                      max="100"
                      step="1"
                      value={brightness}
                      disabled={lockedAdjustments.brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* Contrast */}
                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <span
                        onDoubleClick={() => resetAdjustmentParam('contrast')}
                        style={{ cursor: 'pointer' }}
                        title="Contrast (-100 to +100). Double-click to reset."
                      >
                        Contrast
                      </span>
                    <button
                      type="button"
                      className={`adj-lock-btn ${lockedAdjustments.contrast ? 'locked' : ''}`}
                      onClick={() => toggleAdjustmentLock('contrast')}
                      title={lockedAdjustments.contrast ? "Unlocked — click to lock" : "Lock this value (keeps it when randomizing)"}
                    >
                      {lockedAdjustments.contrast ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                  <div className="slider-track-input-row">
                    <input
                      type="range"
                      className="control-slider" title="Double-click to reset to default"
                      min="-100"
                      max="100"
                      step="1"
                      value={contrast}
                      disabled={lockedAdjustments.contrast}
                      style={getSliderFill(contrast, -100, 100)}
                      {...sliderPointerProps}
                      onDoubleClick={() => resetAdjustmentParam('contrast')}
                      onChange={(e) => setContrast(Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="control-num-input"
                      min="-100"
                      max="100"
                      step="1"
                      value={contrast}
                      disabled={lockedAdjustments.contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* Saturation */}
                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <span
                        onDoubleClick={() => resetAdjustmentParam('saturation')}
                        style={{ cursor: 'pointer' }}
                        title="Saturation (-100 to +100). Double-click to reset."
                      >
                        Saturation
                      </span>
                    <button
                      type="button"
                      className={`adj-lock-btn ${lockedAdjustments.saturation ? 'locked' : ''}`}
                      onClick={() => toggleAdjustmentLock('saturation')}
                      title={lockedAdjustments.saturation ? "Unlocked — click to lock" : "Lock this value (keeps it when randomizing)"}
                    >
                      {lockedAdjustments.saturation ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                  <div className="slider-track-input-row">
                    <input
                      type="range"
                      className="control-slider" title="Double-click to reset to default"
                      min="-100"
                      max="100"
                      step="1"
                      value={saturation}
                      disabled={lockedAdjustments.saturation}
                      style={getSliderFill(saturation, -100, 100)}
                      {...sliderPointerProps}
                      onDoubleClick={() => resetAdjustmentParam('saturation')}
                      onChange={(e) => setSaturation(Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="control-num-input"
                      min="-100"
                      max="100"
                      step="1"
                      value={saturation}
                      disabled={lockedAdjustments.saturation}
                      onChange={(e) => setSaturation(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* Gamma */}
                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <span
                        onDoubleClick={() => resetAdjustmentParam('gamma')}
                        style={{ cursor: 'pointer' }}
                        title="Gamma (0.10 to 3.00). Double-click to reset."
                      >
                        Gamma
                      </span>
                    <button
                      type="button"
                      className={`adj-lock-btn ${lockedAdjustments.gamma ? 'locked' : ''}`}
                      onClick={() => toggleAdjustmentLock('gamma')}
                      title={lockedAdjustments.gamma ? "Unlocked — click to lock" : "Lock this value (keeps it when randomizing)"}
                    >
                      {lockedAdjustments.gamma ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                  <div className="slider-track-input-row">
                    <input
                      type="range"
                      className="control-slider" title="Double-click to reset to default"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      value={gamma}
                      disabled={lockedAdjustments.gamma}
                      style={getSliderFill(gamma, 0.1, 3.0)}
                      {...sliderPointerProps}
                      onDoubleClick={() => resetAdjustmentParam('gamma')}
                      onChange={(e) => setGamma(Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="control-num-input"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      value={gamma}
                      disabled={lockedAdjustments.gamma}
                      onChange={(e) => setGamma(parseFloat(e.target.value) || 1.0)}
                    />
                  </div>
                </div>

                {/* Color Depth */}
                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <span
                        onDoubleClick={() => resetAdjustmentParam('depth')}
                        style={{ cursor: 'pointer' }}
                        title="Color Depth (1 to 32 bit). Double-click to reset."
                      >
                        Color Depth
                      </span>
                    <button
                      type="button"
                      className={`adj-lock-btn ${lockedAdjustments.depth ? 'locked' : ''}`}
                      onClick={() => toggleAdjustmentLock('depth')}
                      title={lockedAdjustments.depth ? "Unlocked — click to lock" : "Lock this value (keeps it when randomizing)"}
                    >
                      {lockedAdjustments.depth ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                  <div className="slider-track-input-row">
                    <input
                      type="range"
                      className="control-slider" title="Double-click to reset to default"
                      min="1"
                      max="32"
                      step="1"
                      value={depth}
                      disabled={lockedAdjustments.depth}
                      {...sliderPointerProps}
                      onDoubleClick={() => resetAdjustmentParam('depth')}
                      onChange={(e) => setDepth(Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="control-num-input"
                      min="1"
                      max="32"
                      step="1"
                      value={depth}
                      disabled={lockedAdjustments.depth}
                      onChange={(e) => setDepth(parseInt(e.target.value, 10) || 8)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. PALETTE SECTION */}
          <div className="section-block">
            <div className="section-header">
              <button 
                className="section-header-left" 
                onClick={() => toggleSection('palette')}
                type="button"
              >
                <span className="section-collapse-icon">{collapsedSections.palette ? '▶' : '▼'}</span>
                <span className="section-title-text">PALETTE ({BUILTIN_PALETTES.length})</span>
              </button>
              <span className="section-header-more" title="More options (Coming in later phase)">»</span>
            </div>

            {!collapsedSections.palette && (
              <div className="section-content">
                <div className="picker-row">
                  <span className="picker-label">Preset</span>
                  <div className="select-with-steppers">
                    <button className="stepper-btn" onClick={handlePrevPalette} title="Previous Palette">&lt;</button>
                    <select
                      className="control-select"
                      style={{ flex: 1 }}
                      value={activePaletteId}
                      onChange={(e) => setActivePalette(e.target.value)}
                    >
                      {BUILTIN_PALETTES.map((pal: any) => (
                        <option key={pal.id} value={pal.id}>
                          {pal.name} ({pal.colors.length} colors)
                        </option>
                      ))}
                    </select>
                    <button className="stepper-btn" onClick={handleNextPalette} title="Next Palette">&gt;</button>
                  </div>
                </div>

                {/* Palette name and color count in small mono text (Fix 3) */}
                <div className="palette-info-label">
                  {currentPalette.name} · {currentPalette.colors.length} colors
                </div>

                {/* Swatch grid: 32x32px each, 4px gaps, wrapping naturally (Fix 3) */}
                <div className="palette-swatches-grid" title="Palette swatches">
                  {currentPalette.colors.map((c: number[], i: number) => {
                    const r = c[0].toString(16).padStart(2, '0');
                    const g = c[1].toString(16).padStart(2, '0');
                    const b = c[2].toString(16).padStart(2, '0');
                    const hex = `#${r}${g}${b}`.toUpperCase();
                    return (
                      <div
                        key={i}
                        className="palette-swatch-item"
                        style={{ backgroundColor: `rgb(${c[0]}, ${c[1]}, ${c[2]})` }}
                        title={hex}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. EFFECTS STACK SECTION */}
          <div className="section-block">
            <div className="section-header">
              <button 
                className="section-header-left" 
                onClick={() => toggleSection('effects')}
                type="button"
              >
                <span className="section-collapse-icon">{collapsedSections.effects ? '▶' : '▼'}</span>
                <span className="section-title-text">EFFECTS STACK ({effects.length})</span>
              </button>
              <span className="section-header-more" title="More options (Coming in later phase)">»</span>
            </div>

            {!collapsedSections.effects && (
              <div className="section-content">
                <button
                  className="action-btn"
                  disabled
                  title="Add post-effect to stack (Coming in Phase 5)"
                  style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}
                >
                  + Add Effect
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {effects.map((eff) => (
                    <div key={eff.id} className="effect-card" style={{ opacity: 0.75 }}>
                      <div className="effect-info">
                        <input
                          type="checkbox"
                          className="effect-toggle"
                          checked={eff.enabled}
                          disabled
                          title="Effect toggle (Coming in Phase 5)"
                          style={{ cursor: 'not-allowed' }}
                        />
                        <span style={{ color: eff.enabled ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          {eff.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          className="tool-icon-btn"
                          disabled
                          title="Remove effect (Coming in Phase 5)"
                          style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        >
                          <Trash2 size={12} style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <span title="Drag-reorder effects (Coming in Phase 5)" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'not-allowed' }}><MoveVertical size={12} style={{ color: 'var(--text-muted)' }} /></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. PRESETS SECTION */}
          <div className="section-block">
            <div className="section-header">
              <button 
                className="section-header-left" 
                onClick={() => toggleSection('presets')}
                type="button"
              >
                <span className="section-collapse-icon">{collapsedSections.presets ? '▶' : '▼'}</span>
                <span className="section-title-text">PRESETS</span>
              </button>
              <span className="section-header-more" title="More options (Coming in later phase)">»</span>
            </div>

            {!collapsedSections.presets && (
              <div className="section-content">
                <div style={{ display: 'flex', gap: '4px' }}>
                  <select 
                    className="control-select" 
                    disabled 
                    style={{ flex: 1, opacity: 0.5, cursor: 'not-allowed' }}
                    title="Load Preset (Coming in Phase 6)"
                  >
                    {BUILTIN_PRESETS.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button 
                    className="action-btn" 
                    disabled 
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    title="Load Preset (Coming in Phase 6)"
                  >
                    Load
                  </button>
                </div>

                <button
                  className="action-btn"
                  disabled
                  style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}
                  title="Save Preset (Coming in Phase 6)"
                >
                  Save Preset
                </button>

                <button
                  className="action-btn"
                  onClick={resetAll}
                  style={{ width: '100%' }}
                  title="Reset all settings to default"
                >
                  Reset to Default
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

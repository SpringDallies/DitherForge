import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../state/useAppStore';
// Import frozen registries UNCHANGED
// @ts-ignore
import { ALGORITHM_REGISTRY, ALGORITHM_CATEGORIES } from '../../dither-engine/algorithms.js';
// @ts-ignore
import { BUILTIN_PALETTES } from '../../dither-engine/palettes.js';
// @ts-ignore
import { AVAILABLE_EFFECT_TYPES } from '../../dither-engine/effect-stack.js';
import { 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  RotateCcw, 
  Lock, 
  Unlock, 
  Search, 
  X, 
  SidebarClose, 
  SidebarOpen,
  Plus, 
  Trash2, 
  MoveVertical
} from 'lucide-react';

export const RightSidebar: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddEffectMenu, setShowAddEffectMenu] = useState(false);

  // App store selectors
  const algorithmId = useAppStore((state) => state.algorithmId);
  const setAlgorithmId = useAppStore((state) => state.setAlgorithmId);
  const algoParams = useAppStore((state) => state.algoParams);
  const updateCurrentAlgoParam = useAppStore((state) => state.updateCurrentAlgoParam);
  const resetCurrentAlgoParams = useAppStore((state) => state.resetCurrentAlgoParams);
  const resetAlgoParamToDefault = useAppStore((state) => state.resetAlgoParamToDefault);
  const favoriteAlgorithmIds = useAppStore((state) => state.favoriteAlgorithmIds);
  const toggleFavoriteAlgorithm = useAppStore((state) => state.toggleFavoriteAlgorithm);

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

  // Palette & Effects
  const activePaletteId = useAppStore((state) => state.activePalette);
  const setActivePalette = useAppStore((state) => state.setActivePalette);

  const effects = useAppStore((state) => state.effects);
  const addEffect = useAppStore((state) => state.addEffect);

  const sidebarWidth = useAppStore((state) => state.sidebarWidth);
  const isCollapsed = useAppStore((state) => state.isSidebarCollapsed);
  const toggleCollapsed = useAppStore((state) => state.toggleSidebarCollapsed);

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

  // Filtered algorithms (combining activeCategory + searchQuery)
  const filteredAlgos = ALGORITHM_REGISTRY.filter((a: any) => {
    const matchesCategory = activeCategory === 'all' || a.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const currentAlgo = ALGORITHM_REGISTRY.find((a: any) => a.id === algorithmId) || ALGORITHM_REGISTRY[0];
  const currentIndex = filteredAlgos.findIndex((a: any) => a.id === algorithmId);
  const isCurrentFavorite = favoriteAlgorithmIds.includes(algorithmId);

  const handlePrev = useCallback(() => {
    if (filteredAlgos.length === 0) return;
    const prevIdx = (currentIndex - 1 + filteredAlgos.length) % filteredAlgos.length;
    setAlgorithmId(filteredAlgos[prevIdx].id);
  }, [filteredAlgos, currentIndex, setAlgorithmId]);

  const handleNext = useCallback(() => {
    if (filteredAlgos.length === 0) return;
    const nextIdx = (currentIndex + 1) % filteredAlgos.length;
    setAlgorithmId(filteredAlgos[nextIdx].id);
  }, [filteredAlgos, currentIndex, setAlgorithmId]);

  // Up/Down keyboard stepping (only when no input, select, or textarea is focused)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName?.toLowerCase() || '';
      if (tagName === 'input' || tagName === 'select' || tagName === 'textarea' || (activeEl as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  // Progressive parameter disclosure based on algorithm category & id
  const getVisibleParams = (id: string, cat: string) => {
    if (id === 'bayer_2x2' || id === 'bayer_4x4' || id === 'bayer_8x8' || id === 'bayer_16x16') {
      return { threshold: true, scale: true, diffusionStrength: false, serpentine: false, noiseAmount: false };
    }
    if (cat === 'error_diffusion') {
      return { threshold: true, scale: false, diffusionStrength: true, serpentine: true, noiseAmount: false };
    }
    if (cat === 'glitch') {
      return { threshold: true, scale: true, diffusionStrength: false, serpentine: false, noiseAmount: false };
    }
    if (cat === 'pattern') {
      return { threshold: true, scale: true, diffusionStrength: false, serpentine: false, noiseAmount: false };
    }
    if (id === 'fixed_threshold') {
      return { threshold: true, scale: false, diffusionStrength: false, serpentine: false, noiseAmount: false };
    }
    if (id === 'random_threshold') {
      return { threshold: true, scale: false, diffusionStrength: false, serpentine: false, noiseAmount: true };
    }
    if (id === 'ignition_glow') {
      return { threshold: true, scale: true, diffusionStrength: true, serpentine: false, noiseAmount: false };
    }
    if (id === 'temporal_kinetic') {
      return { threshold: true, scale: true, diffusionStrength: false, serpentine: false, noiseAmount: false };
    }
    return { threshold: true, scale: true, diffusionStrength: true, serpentine: true, noiseAmount: false };
  };

  const visibleParams = getVisibleParams(currentAlgo.id, currentAlgo.category);

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

  // Collapsed 44px Rail view
  if (isCollapsed) {
    return (
      <aside className="sidebar-rail" style={{ width: '44px' }}>
        <button
          className="rail-btn"
          onClick={toggleCollapsed}
          title="Expand Sidebar"
        >
          <SidebarOpen size={16} />
        </button>
        <div className="rail-divider" />
        <button className="rail-btn" onClick={toggleCollapsed} title="Algorithm Section">
          <span style={{ fontSize: '10px', fontWeight: 700 }}>ALG</span>
        </button>
        <button className="rail-btn" onClick={toggleCollapsed} title="Adjustments Section">
          <span style={{ fontSize: '10px', fontWeight: 700 }}>ADJ</span>
        </button>
        <button className="rail-btn" onClick={toggleCollapsed} title="Palette Section">
          <span style={{ fontSize: '10px', fontWeight: 700 }}>PAL</span>
        </button>
        <button className="rail-btn" onClick={toggleCollapsed} title="Effects Stack Section">
          <span style={{ fontSize: '10px', fontWeight: 700 }}>FX</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="right-sidebar" style={{ width: `${sidebarWidth}px` }}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <span className="sidebar-title">Pipeline Controls</span>
        <button
          className="tool-icon-btn"
          onClick={toggleCollapsed}
          title="Collapse Sidebar"
        >
          <SidebarClose size={14} />
        </button>
      </div>

      <div className="sidebar-scrollable-content">
        {/* 1. ALGORITHM SECTION */}
        <section className="section-card">
          <div className="section-title">
            <span>ALGORITHM ({ALGORITHM_REGISTRY.length})</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                className="reset-section-btn"
                onClick={resetCurrentAlgoParams}
                title="Reset algorithm parameters to default"
              >
                <RotateCcw size={10} /> Reset
              </button>
              <span className="section-badge">{activeCategory.toUpperCase()}</span>
            </div>
          </div>

          {/* Favourites Row (Starred Algorithms) */}
          <div className="favorites-row" title="Favorite algorithms (click to select)">
            <Star size={11} style={{ color: favoriteAlgorithmIds.length > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
            {favoriteAlgorithmIds.length === 0 ? (
              <span className="fav-empty-hint">No favorites yet — star algorithms to pin here</span>
            ) : (
              favoriteAlgorithmIds.map((favId) => {
                const favAlgo = ALGORITHM_REGISTRY.find((a: any) => a.id === favId);
                if (!favAlgo) return null;
                return (
                  <span
                    key={favId}
                    className="fav-chip"
                    onClick={() => setAlgorithmId(favId)}
                    title={`Select ${favAlgo.name}`}
                  >
                    {favAlgo.name}
                    <button
                      className="fav-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteAlgorithm(favId);
                      }}
                      title="Unpin favorite"
                    >
                      ×
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {/* Search Input Box */}
          <div className="search-input-box">
            <Search size={12} style={{ position: 'absolute', left: '6px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="search-input"
              style={{ paddingLeft: '22px' }}
              placeholder="Search 63 algorithms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Chips (Filter Row) */}
          <div className="chip-container">
            <button
              className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All (63)
            </button>
            {ALGORITHM_CATEGORIES.map((cat: any) => (
              <button
                key={cat.id}
                className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Stepper + Dropdown + Star Toggle */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button className="tool-icon-btn" onClick={handlePrev} title="Previous Algorithm (Up Arrow)">
              <ChevronLeft size={14} />
            </button>
            <select
              className="control-select"
              style={{ flex: 1, fontWeight: 600 }}
              value={algorithmId}
              onChange={(e) => setAlgorithmId(e.target.value)}
            >
              {filteredAlgos.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button className="tool-icon-btn" onClick={handleNext} title="Next Algorithm (Down Arrow)">
              <ChevronRight size={14} />
            </button>
            <button
              className="tool-icon-btn"
              onClick={() => toggleFavoriteAlgorithm(algorithmId)}
              title={isCurrentFavorite ? "Remove from Favorites" : "Add to Favorites"}
              style={{ color: isCurrentFavorite ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
            >
              <Star size={13} fill={isCurrentFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>

          <p className="algo-description-box">
            {currentAlgo.description}
          </p>

          {/* Progressive Parameter Disclosure */}
          {visibleParams.threshold && (
            <div className="adj-control-row">
              <div className="adj-header-row">
                <span 
                  className="adj-label-group"
                  onDoubleClick={() => resetAlgoParamToDefault('threshold')}
                  title="Threshold pivot bias (0.00 to 1.00). Double-click to reset."
                >
                  Threshold / Bias
                </span>
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
              <input
                type="range"
                className="control-slider"
                min="0.0"
                max="1.0"
                step="0.02"
                value={currentParams.threshold}
                {...sliderPointerProps}
                onDoubleClick={() => resetAlgoParamToDefault('threshold')}
                onChange={(e) => updateCurrentAlgoParam('threshold', Number(e.target.value))}
                title="Threshold pivot bias. Double-click to reset."
              />
            </div>
          )}

          {visibleParams.scale && (
            <div className="adj-control-row">
              <div className="adj-header-row">
                <span 
                  className="adj-label-group"
                  onDoubleClick={() => resetAlgoParamToDefault('scale')}
                  title="Pattern Scale multiplier (1.0x to 8.0x). Double-click to reset."
                >
                  Pattern Scale
                </span>
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
              <input
                type="range"
                className="control-slider"
                min="1.0"
                max="8.0"
                step="0.5"
                value={currentParams.scale}
                {...sliderPointerProps}
                onDoubleClick={() => resetAlgoParamToDefault('scale')}
                onChange={(e) => updateCurrentAlgoParam('scale', Number(e.target.value))}
                title="Pattern Scale multiplier. Double-click to reset."
              />
            </div>
          )}

          {visibleParams.diffusionStrength && (
            <div className="adj-control-row">
              <div className="adj-header-row">
                <span 
                  className="adj-label-group"
                  onDoubleClick={() => resetAlgoParamToDefault('diffusionStrength')}
                  title="Diffusion Strength percentage (0.0 to 1.0). Double-click to reset."
                >
                  Diffusion Strength
                </span>
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
              <input
                type="range"
                className="control-slider"
                min="0.0"
                max="1.0"
                step="0.05"
                value={currentParams.diffusionStrength}
                {...sliderPointerProps}
                onDoubleClick={() => resetAlgoParamToDefault('diffusionStrength')}
                onChange={(e) => updateCurrentAlgoParam('diffusionStrength', Number(e.target.value))}
                title="Diffusion Strength percentage. Double-click to reset."
              />
            </div>
          )}

          {visibleParams.serpentine && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', padding: '3px 0' }}>
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
                Serpentine Scanline (Bi-directional)
              </label>
            </div>
          )}

          {visibleParams.noiseAmount && (
            <div className="adj-control-row">
              <div className="adj-header-row">
                <span 
                  className="adj-label-group"
                  onDoubleClick={() => resetAlgoParamToDefault('noiseAmount')}
                  title="Noise Amount intensity (0.0 to 1.0). Double-click to reset."
                >
                  Noise Amount
                </span>
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
              <input
                type="range"
                className="control-slider"
                min="0.0"
                max="1.0"
                step="0.05"
                value={currentParams.noiseAmount ?? 0.3}
                {...sliderPointerProps}
                onDoubleClick={() => resetAlgoParamToDefault('noiseAmount')}
                onChange={(e) => updateCurrentAlgoParam('noiseAmount', Number(e.target.value))}
                title="Noise Amount intensity. Double-click to reset."
              />
            </div>
          )}
        </section>

        {/* 2. ADJUSTMENTS SECTION */}
        <section className="section-card">
          <div className="section-title">
            <span>ADJUSTMENTS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                className="reset-section-btn"
                onClick={resetAllAdjustments}
                title="Reset all unlocked adjustments to default"
              >
                <RotateCcw size={10} /> Reset
              </button>
              <span className="section-badge">PRE-FILTER</span>
            </div>
          </div>

          {/* Brightness */}
          <div className="adj-control-row">
            <div className="adj-header-row">
              <div className="adj-label-group">
                <button
                  className={`adj-lock-btn ${lockedAdjustments.brightness ? 'locked' : ''}`}
                  onClick={() => toggleAdjustmentLock('brightness')}
                  title={lockedAdjustments.brightness ? "Brightness locked (protected from reset)" : "Lock brightness"}
                >
                  {lockedAdjustments.brightness ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
                <span 
                  onDoubleClick={() => resetAdjustmentParam('brightness')}
                  title="Brightness (-100 to +100). Double-click to reset."
                >
                  Brightness
                </span>
              </div>
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
            <input
              type="range"
              className="control-slider"
              min="-100"
              max="100"
              value={brightness}
              disabled={lockedAdjustments.brightness}
              {...sliderPointerProps}
              onDoubleClick={() => resetAdjustmentParam('brightness')}
              onChange={(e) => setBrightness(Number(e.target.value))}
              title="Brightness. Double-click to reset."
            />
          </div>

          {/* Contrast */}
          <div className="adj-control-row">
            <div className="adj-header-row">
              <div className="adj-label-group">
                <button
                  className={`adj-lock-btn ${lockedAdjustments.contrast ? 'locked' : ''}`}
                  onClick={() => toggleAdjustmentLock('contrast')}
                  title={lockedAdjustments.contrast ? "Contrast locked (protected from reset)" : "Lock contrast"}
                >
                  {lockedAdjustments.contrast ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
                <span 
                  onDoubleClick={() => resetAdjustmentParam('contrast')}
                  title="Contrast (-100 to +100). Double-click to reset."
                >
                  Contrast
                </span>
              </div>
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
            <input
              type="range"
              className="control-slider"
              min="-100"
              max="100"
              value={contrast}
              disabled={lockedAdjustments.contrast}
              {...sliderPointerProps}
              onDoubleClick={() => resetAdjustmentParam('contrast')}
              onChange={(e) => setContrast(Number(e.target.value))}
              title="Contrast. Double-click to reset."
            />
          </div>

          {/* Saturation */}
          <div className="adj-control-row">
            <div className="adj-header-row">
              <div className="adj-label-group">
                <button
                  className={`adj-lock-btn ${lockedAdjustments.saturation ? 'locked' : ''}`}
                  onClick={() => toggleAdjustmentLock('saturation')}
                  title={lockedAdjustments.saturation ? "Saturation locked (protected from reset)" : "Lock saturation"}
                >
                  {lockedAdjustments.saturation ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
                <span 
                  onDoubleClick={() => resetAdjustmentParam('saturation')}
                  title="Saturation (-100 to +100). Double-click to reset."
                >
                  Saturation
                </span>
              </div>
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
            <input
              type="range"
              className="control-slider"
              min="-100"
              max="100"
              value={saturation}
              disabled={lockedAdjustments.saturation}
              {...sliderPointerProps}
              onDoubleClick={() => resetAdjustmentParam('saturation')}
              onChange={(e) => setSaturation(Number(e.target.value))}
              title="Saturation. Double-click to reset."
            />
          </div>

          {/* Gamma */}
          <div className="adj-control-row">
            <div className="adj-header-row">
              <div className="adj-label-group">
                <button
                  className={`adj-lock-btn ${lockedAdjustments.gamma ? 'locked' : ''}`}
                  onClick={() => toggleAdjustmentLock('gamma')}
                  title={lockedAdjustments.gamma ? "Gamma locked (protected from reset)" : "Lock gamma"}
                >
                  {lockedAdjustments.gamma ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
                <span 
                  onDoubleClick={() => resetAdjustmentParam('gamma')}
                  title="Gamma curve exponent (0.10 to 3.00). Double-click to reset."
                >
                  Gamma
                </span>
              </div>
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
            <input
              type="range"
              className="control-slider"
              min="0.1"
              max="3.0"
              step="0.05"
              value={gamma}
              disabled={lockedAdjustments.gamma}
              {...sliderPointerProps}
              onDoubleClick={() => resetAdjustmentParam('gamma')}
              onChange={(e) => setGamma(Number(e.target.value))}
              title="Gamma curve exponent. Double-click to reset."
            />
          </div>

          {/* Color Depth */}
          <div className="adj-control-row">
            <div className="adj-header-row">
              <div className="adj-label-group">
                <button
                  className={`adj-lock-btn ${lockedAdjustments.depth ? 'locked' : ''}`}
                  onClick={() => toggleAdjustmentLock('depth')}
                  title={lockedAdjustments.depth ? "Color depth locked (protected from reset)" : "Lock color depth"}
                >
                  {lockedAdjustments.depth ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
                <span 
                  onDoubleClick={() => resetAdjustmentParam('depth')}
                  title="Color quantization depth (1 to 32 bit). Double-click to reset."
                >
                  Color Depth
                </span>
              </div>
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
            <input
              type="range"
              className="control-slider"
              min="1"
              max="32"
              value={depth}
              disabled={lockedAdjustments.depth}
              {...sliderPointerProps}
              onDoubleClick={() => resetAdjustmentParam('depth')}
              onChange={(e) => setDepth(Number(e.target.value))}
              title="Color quantization depth. Double-click to reset."
            />
          </div>
        </section>

        {/* 3. PALETTE SECTION */}
        <section className="section-card">
          <div className="section-title">
            <span>PALETTE ({BUILTIN_PALETTES.length})</span>
            <span className="section-badge">{currentPalette.colors.length} COLORS</span>
          </div>

          <select
            className="control-select"
            style={{ width: '100%' }}
            value={activePaletteId}
            onChange={(e) => setActivePalette(e.target.value)}
          >
            {BUILTIN_PALETTES.map((pal: any) => (
              <option key={pal.id} value={pal.id}>
                {pal.name} ({pal.colors.length} colors)
              </option>
            ))}
          </select>

          <div className="swatch-grid" title="Palette colors (Custom swatch editing coming in Phase 4)">
            {currentPalette.colors.map((c: number[], i: number) => (
              <div
                key={i}
                className="swatch-box"
                style={{ backgroundColor: `rgb(${c[0]}, ${c[1]}, ${c[2]})`, cursor: 'default' }}
                title={`RGB(${c[0]}, ${c[1]}, ${c[2]}) (Custom swatch editing coming in Phase 4)`}
              />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              className="action-btn"
              disabled
              title="Median Cut palette extraction (Coming in Phase 4)"
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            >
              Median Cut
            </button>
            <button
              className="action-btn"
              disabled
              title="K-Means palette extraction (Coming in Phase 4)"
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            >
              K-Means
            </button>
          </div>
        </section>

        {/* 4. EFFECTS STACK SECTION */}
        <section className="section-card">
          <div className="section-title">
            <span>EFFECTS STACK ({effects.length})</span>
            <div style={{ position: 'relative' }}>
              <button
                className="action-btn primary"
                disabled
                title="Add post-effect to stack (Coming in Phase 5)"
                style={{ padding: '2px 8px', fontSize: '0.68rem', opacity: 0.5, cursor: 'not-allowed' }}
              >
                <Plus size={11} /> Add Effect
              </button>

              {showAddEffectMenu && (
                <div className="add-effect-dropdown">
                  {AVAILABLE_EFFECT_TYPES.map((eff: any) => (
                    <button
                      key={eff.id}
                      className="dropdown-item-btn"
                      onClick={() => {
                        addEffect(eff.id);
                        setShowAddEffectMenu(false);
                      }}
                    >
                      {eff.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                  <MoveVertical size={12} style={{ color: 'var(--text-muted)', cursor: 'not-allowed' }} title="Drag-reorder effects (Coming in Phase 5)" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
};

import React, { useState } from 'react';
import { useAppStore } from '../../state/useAppStore';
// Import frozen registries UNCHANGED
// @ts-ignore
import { ALGORITHM_REGISTRY, ALGORITHM_CATEGORIES } from '../../dither-engine/algorithms.js';
// @ts-ignore
import { BUILTIN_PALETTES } from '../../dither-engine/palettes.js';
// @ts-ignore
import { AVAILABLE_EFFECT_TYPES } from '../../dither-engine/effect-stack.js';
import { 
  Cpu, 
  Sliders, 
  Palette, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  MoveVertical, 
  Lock, 
  Unlock,
  ChevronDown,
  SidebarClose,
  SidebarOpen
} from 'lucide-react';

export const RightSidebar: React.FC = () => {
  const isCollapsed = useAppStore((state) => state.isSidebarCollapsed);
  const toggleCollapsed = useAppStore((state) => state.toggleSidebarCollapsed);
  const sidebarWidth = useAppStore((state) => state.sidebarWidth);

  // Store state & selectors
  const algorithmId = useAppStore((state) => state.algorithmId);
  const setAlgorithmId = useAppStore((state) => state.setAlgorithmId);
  const algoParams = useAppStore((state) => state.algoParams);
  const updateCurrentAlgoParam = useAppStore((state) => state.updateCurrentAlgoParam);

  const brightness = useAppStore((state) => state.brightness);
  const setBrightness = useAppStore((state) => state.setBrightness);
  const contrast = useAppStore((state) => state.contrast);
  const setContrast = useAppStore((state) => state.setContrast);
  const saturation = useAppStore((state) => state.saturation);
  const setSaturation = useAppStore((state) => state.setSaturation);
  const gamma = useAppStore((state) => state.gamma);
  const setGamma = useAppStore((state) => state.setGamma);
  const depth = useAppStore((state) => state.depth);
  const setDepth = useAppStore((state) => state.setDepth);

  const activePaletteName = useAppStore((state) => state.activePalette);
  const setActivePalette = useAppStore((state) => state.setActivePalette);
  const lockedSwatches = useAppStore((state) => state.lockedSwatches);
  const toggleLockSwatch = useAppStore((state) => state.toggleLockSwatch);

  const effects = useAppStore((state) => state.effects);
  const toggleEffect = useAppStore((state) => state.toggleEffect);
  const addEffect = useAppStore((state) => state.addEffect);
  const removeEffect = useAppStore((state) => state.removeEffect);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAddEffectMenu, setShowAddEffectMenu] = useState<boolean>(false);

  // Per-algorithm parameters
  const currentParams = algoParams[algorithmId] ?? {
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 1.0,
    serpentine: false,
    noiseAmount: 0.3
  };

  const filteredAlgos = activeCategory === 'all'
    ? ALGORITHM_REGISTRY
    : ALGORITHM_REGISTRY.filter((a: any) => a.category === activeCategory);

  const currentAlgo = ALGORITHM_REGISTRY.find((a: any) => a.id === algorithmId) || ALGORITHM_REGISTRY[0];
  const currentIndex = filteredAlgos.findIndex((a: any) => a.id === algorithmId);

  const handlePrev = () => {
    if (filteredAlgos.length === 0) return;
    const prevIdx = (currentIndex - 1 + filteredAlgos.length) % filteredAlgos.length;
    setAlgorithmId(filteredAlgos[prevIdx].id);
  };

  const handleNext = () => {
    if (filteredAlgos.length === 0) return;
    const nextIdx = (currentIndex + 1) % filteredAlgos.length;
    setAlgorithmId(filteredAlgos[nextIdx].id);
  };

  const currentPalette = BUILTIN_PALETTES.find((p: any) => p.name === activePaletteName) || BUILTIN_PALETTES[0];

  // Collapsed 44px Rail view
  if (isCollapsed) {
    return (
      <aside className="sidebar-rail" style={{ width: '44px' }}>
        <button
          className="rail-btn"
          onClick={toggleCollapsed}
          title="Expand Sidebar"
        >
          <SidebarOpen size={18} />
        </button>
        <div className="rail-divider" />
        <button className="rail-btn" onClick={toggleCollapsed} title="Algorithm Section">
          <Cpu size={16} />
        </button>
        <button className="rail-btn" onClick={toggleCollapsed} title="Adjustments Section">
          <Sliders size={16} />
        </button>
        <button className="rail-btn" onClick={toggleCollapsed} title="Palette Section">
          <Palette size={16} />
        </button>
        <button className="rail-btn" onClick={toggleCollapsed} title="Effects Stack Section">
          <Layers size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="right-sidebar" style={{ width: `${sidebarWidth}px` }}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={15} style={{ color: 'var(--accent-cyan)' }} />
          <span className="sidebar-title">Pipeline & Controls</span>
        </div>
        <button
          className="tool-icon-btn"
          onClick={toggleCollapsed}
          title="Collapse Sidebar to Rail"
        >
          <SidebarClose size={15} />
        </button>
      </div>

      <div className="sidebar-scrollable-content">
        {/* 1. ALGORITHM SECTION */}
        <section className="section-card">
          <div className="section-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>1. Algorithm ({ALGORITHM_REGISTRY.length})</span>
            </div>
            <span className="section-badge">{activeCategory.toUpperCase()}</span>
          </div>

          {/* Category Chips */}
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

          {/* Stepper + Dropdown */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button className="tool-icon-btn" onClick={handlePrev} title="Previous Algorithm">
              <ChevronLeft size={16} />
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
            <button className="tool-icon-btn" onClick={handleNext} title="Next Algorithm">
              <ChevronRight size={16} />
            </button>
          </div>

          <p className="algo-description-box">
            {currentAlgo.description}
          </p>

          {/* Per-Algorithm Parameters */}
          <div className="control-row">
            <div className="control-label">
              <span>Threshold / Bias</span>
              <span>{currentParams.threshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="0.0"
              max="1.0"
              step="0.02"
              value={currentParams.threshold}
              onChange={(e) => updateCurrentAlgoParam('threshold', Number(e.target.value))}
            />
          </div>

          <div className="control-row">
            <div className="control-label">
              <span>Pattern Scale</span>
              <span>{currentParams.scale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="1.0"
              max="8.0"
              step="0.5"
              value={currentParams.scale}
              onChange={(e) => updateCurrentAlgoParam('scale', Number(e.target.value))}
            />
          </div>

          <div className="control-row">
            <div className="control-label">
              <span>Diffusion Strength</span>
              <span>{(currentParams.diffusionStrength * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="0.0"
              max="1.0"
              step="0.05"
              value={currentParams.diffusionStrength}
              onChange={(e) => updateCurrentAlgoParam('diffusionStrength', Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
            <input
              type="checkbox"
              id="serpentineCheckbox"
              checked={currentParams.serpentine}
              onChange={(e) => updateCurrentAlgoParam('serpentine', e.target.checked)}
              style={{ accentColor: 'var(--accent-cyan)' }}
            />
            <label htmlFor="serpentineCheckbox" style={{ cursor: 'pointer', color: 'var(--text-main)' }}>
              Serpentine Scanline (Bi-directional)
            </label>
          </div>

          {/* Noise Amount */}
          <div className="control-row">
            <div className="control-label">
              <span>Noise Amount</span>
              <span>{((currentParams.noiseAmount ?? 0.3) * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="0.0"
              max="1.0"
              step="0.05"
              value={currentParams.noiseAmount ?? 0.3}
              onChange={(e) => updateCurrentAlgoParam('noiseAmount', Number(e.target.value))}
            />
          </div>
        </section>

        {/* 2. ADJUSTMENTS SECTION */}
        <section className="section-card">
          <div className="section-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} style={{ color: 'var(--accent-amber)' }} />
              <span>2. Adjustments</span>
            </div>
            <span className="section-badge">PRE-FILTER</span>
          </div>

          <div className="control-row">
            <div className="control-label">
              <span>Brightness</span>
              <span>{brightness > 0 ? `+${brightness}` : brightness}</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="-100"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
            />
          </div>

          <div className="control-row">
            <div className="control-label">
              <span>Contrast</span>
              <span>{contrast > 0 ? `+${contrast}` : contrast}</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="-100"
              max="100"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
            />
          </div>

          <div className="control-row">
            <div className="control-label">
              <span>Saturation</span>
              <span>{saturation > 0 ? `+${saturation}` : saturation}</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="-100"
              max="100"
              value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))}
            />
          </div>

          <div className="control-row">
            <div className="control-label">
              <span>Gamma</span>
              <span>{gamma.toFixed(2)}</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="0.1"
              max="3.0"
              step="0.05"
              value={gamma}
              onChange={(e) => setGamma(Number(e.target.value))}
            />
          </div>

          <div className="control-row">
            <div className="control-label">
              <span>Color Depth</span>
              <span>{depth}-bit</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="1"
              max="32"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
            />
          </div>
        </section>

        {/* 3. PALETTE SECTION */}
        <section className="section-card">
          <div className="section-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={14} style={{ color: 'var(--accent-pink)' }} />
              <span>3. Palette ({BUILTIN_PALETTES.length})</span>
            </div>
            <span className="section-badge">{currentPalette.colors.length} COLORS (PHASE 4 EDITABLE)</span>
          </div>

          <select
            className="control-select"
            style={{ width: '100%' }}
            value={activePaletteName}
            onChange={(e) => setActivePalette(e.target.value)}
          >
            {BUILTIN_PALETTES.map((pal: any) => (
              <option key={pal.name} value={pal.name}>
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

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="action-btn"
              disabled
              title="Median Cut palette extraction (Coming in Phase 4)"
              style={{ flex: 1, justifyContent: 'center', opacity: 0.5, cursor: 'not-allowed' }}
            >
              Median Cut
            </button>
            <button
              className="action-btn"
              disabled
              title="K-Means palette extraction (Coming in Phase 4)"
              style={{ flex: 1, justifyContent: 'center', opacity: 0.5, cursor: 'not-allowed' }}
            >
              K-Means
            </button>
          </div>
        </section>

        {/* 4. EFFECTS STACK SECTION */}
        <section className="section-card">
          <div className="section-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} style={{ color: 'var(--accent-blue)' }} />
              <span>4. Effects Stack ({effects.length})</span>
            </div>
            <div style={{ position: 'relative' }}>
              <button
                className="action-btn primary"
                disabled
                title="Add post-effect to stack (Coming in Phase 5)"
                style={{ padding: '2px 8px', fontSize: '0.72rem', opacity: 0.5, cursor: 'not-allowed' }}
              >
                <Plus size={12} /> Add Effect
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
            {effects.map((eff, index) => (
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
                    <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <MoveVertical size={13} style={{ color: 'var(--text-muted)', cursor: 'not-allowed' }} title="Drag-reorder effects (Coming in Phase 5)" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
};
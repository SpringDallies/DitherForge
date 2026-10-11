import { Dropdown } from '../common/Dropdown';
﻿import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '../../state/useAppStore';
// Import frozen registries UNCHANGED
// @ts-ignore
import { ALGORITHM_REGISTRY, ALGORITHM_CATEGORIES } from '../../dither-engine/algorithms.js';
// @ts-ignore
import { BUILTIN_PALETTES, extractPaletteMedianCut, extractPaletteKMeans, hexToRgba, rgbaToHex } from '../../dither-engine/palettes.js';
// @ts-ignore
import { BUILTIN_PRESETS } from '../../ui/presets.js';
// @ts-ignore
import { AVAILABLE_EFFECT_TYPES } from '../../dither-engine/effect-stack.js';
import { 
  Lock, 
  Unlock, 
  Trash2, 
  MoveVertical,
  Shuffle,
  GripVertical,
  ChevronRight,
  RotateCcw
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
        return { style: false, adjustments: false, palette: true, effects: true, presets: true };
      }
      if (sec === 'palette') {
        return { style: true, adjustments: true, palette: false, effects: true, presets: true };
      }
      if (sec === 'effects') {
        return { style: true, adjustments: true, palette: true, effects: false, presets: true };
      }
    }
    return {
      style: true,
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
  const activePaletteId = useAppStore((state) => state.activePaletteId);
  const setActivePaletteId = useAppStore((state) => state.setActivePaletteId);
  const workingPalette = useAppStore((state) => state.workingPalette);
  const lockedSwatches = useAppStore((state) => state.lockedSwatches);
  const paletteDepth = useAppStore((state) => state.paletteDepth);
  const updateSwatchColor = useAppStore((state) => state.updateSwatchColor);
  const toggleLockSwatch = useAppStore((state) => state.toggleLockSwatch);
  const shuffleUnlockedSwatches = useAppStore((state) => state.shuffleUnlockedSwatches);
  const addSwatch = useAppStore((state) => state.addSwatch);
  const removeSwatch = useAppStore((state) => state.removeSwatch);
  const setPaletteDepth = useAppStore((state) => state.setPaletteDepth);
  const resetToBuiltin = useAppStore((state) => state.resetToBuiltin);
  const imageFileName = useAppStore((state) => state.imageFileName);
  const sourceImageData = useAppStore((state) => state.sourceImageData);
  const hasImage = useAppStore((state) => state.hasImage);

  const effects = useAppStore((state) => state.effects);
  const addEffectInstance = useAppStore((state) => state.addEffectInstance);
  const removeEffectInstance = useAppStore((state) => state.removeEffectInstance);
  const toggleEffectEnabled = useAppStore((state) => state.toggleEffectEnabled);
  const reorderEffects = useAppStore((state) => state.reorderEffects);
  const updateEffectParam = useAppStore((state) => state.updateEffectParam);
  const resetEffects = useAppStore((state) => state.resetEffects);
  const resetAll = useAppStore((state) => state.resetAll);
  const loadImageFromData = useAppStore((state) => state.loadImageFromData);

  // Local state for Swatch editing popover
  // Local state for Effects section (Phase 5)
  const [expandedEffectId, setExpandedEffectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('effects_expanded');
      if (p === 'none') return null;
      if (p) return p;
    }
    return 'glow';
  });
  const [isAddEffectOpen, setIsAddEffectOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('effects_add') === 'open';
    }
    return false;
  });
  const [addEffectQuery, setAddEffectQuery] = useState('');
  const [draggedEffectIndex, setDraggedEffectIndex] = useState<number | null>(null);
  const [dragOverEffectIndex, setDragOverEffectIndex] = useState<number | null>(null);

  const addEffectPopoverRef = useRef<HTMLDivElement>(null);
  const addEffectInputRef = useRef<HTMLInputElement>(null);

  // Close Add Effect popover on outside click or Escape
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (addEffectPopoverRef.current && !addEffectPopoverRef.current.contains(e.target as Node)) {
        setIsAddEffectOpen(false);
        setAddEffectQuery('');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAddEffectOpen) {
        setIsAddEffectOpen(false);
        setAddEffectQuery('');
      }
    };
    if (isAddEffectOpen) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('keydown', handleKeyDown);
      requestAnimationFrame(() => addEffectInputRef.current?.focus());
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddEffectOpen]);

  // Reset Effects with confirmation if modified
  const handleResetEffects = () => {
    const isModified = effects.length !== 9 || effects.some((e, idx) => {
      const typeMeta = AVAILABLE_EFFECT_TYPES[idx];
      if (!typeMeta || e.type !== typeMeta.id) return true;
      const expectedEnabled = typeMeta.id === 'glow';
      if (e.enabled !== expectedEnabled) return true;
      for (const k of Object.keys(typeMeta.defaultParams)) {
        if (e.params[k] !== (typeMeta.defaultParams as any)[k]) return true;
      }
      return false;
    });

    if (isModified) {
      const confirmed = window.confirm('Reset effect stack to default (Glow enabled)?');
      if (!confirmed) return;
    }
    resetEffects();
    setExpandedEffectId('glow');
  };

  const [activeSwatchIndex, setActiveSwatchIndex] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const sw = new URLSearchParams(window.location.search).get('swatch');
      if (sw !== null) return parseInt(sw, 10);
    }
    return null;
  });
  const popoverRef = useRef<HTMLDivElement>(null);
  const paletteFileInputRef = useRef<HTMLInputElement>(null);

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

  // Close swatch popover on outside click or Escape
  useEffect(() => {
    if (activeSwatchIndex === null) return;
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveSwatchIndex(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSwatchIndex(null);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [activeSwatchIndex]);

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
    setActivePaletteId(BUILTIN_PALETTES[prev].id);
  };
  const handleNextPalette = () => {
    if (BUILTIN_PALETTES.length === 0) return;
    const next = (paletteIndex + 1) % BUILTIN_PALETTES.length;
    setActivePaletteId(BUILTIN_PALETTES[next].id);
  };

  const handleResetPalette = () => {
    const pal = BUILTIN_PALETTES.find((p: any) => p.id === activePaletteId) || BUILTIN_PALETTES[0];
    const isModified = JSON.stringify(workingPalette) !== JSON.stringify(pal.colors);
    if (isModified) {
      if (window.confirm('Reset palette to built-in default colors?')) {
        resetToBuiltin();
      }
    } else {
      resetToBuiltin();
    }
  };

  const handleExportPalette = () => {
    const palName = BUILTIN_PALETTES.find((p: any) => p.id === activePaletteId)?.name || 'Custom Palette';
    const jsonStr = JSON.stringify({ name: palName, colors: workingPalette }, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = (imageFileName || 'palette').replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_${Date.now()}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPalette = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (
          parsed &&
          Array.isArray(parsed.colors) &&
          parsed.colors.length >= 2 &&
          parsed.colors.every(
            (c: any) =>
              Array.isArray(c) &&
              c.length === 4 &&
              c.every((num: any) => typeof num === 'number' && num >= 0 && num <= 255)
          )
        ) {
          useAppStore.setState({
            activePaletteId: 'custom',
            activePalette: 'custom',
            workingPalette: parsed.colors.map((c: number[]) => [...c]),
            lockedSwatches: [],
            paletteDepth: Math.min(32, parsed.colors.length)
          });
        } else {
          alert('Invalid palette file');
        }
      } catch (err) {
        alert('Invalid palette file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExtractMedianCut = () => {
    if (!sourceImageData) return;
    const extracted = extractPaletteMedianCut(sourceImageData, 8);
    useAppStore.setState({
      workingPalette: extracted.map((c: number[]) => [...c]),
      lockedSwatches: [],
      paletteDepth: extracted.length
    });
  };

  const handleExtractKMeans = () => {
    if (!sourceImageData) return;
    const extracted = extractPaletteKMeans(sourceImageData, 8, 8);
    useAppStore.setState({
      workingPalette: extracted.map((c: number[]) => [...c]),
      lockedSwatches: [],
      paletteDepth: extracted.length
    });
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
  const currentPalette = BUILTIN_PALETTES.find((p: any) => p.id === activePaletteId) || { id: 'custom', name: 'Custom Palette', colors: workingPalette };

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
            className="action-btn primary open-image-btn"
            onClick={handleOpenImage}
            title="Open local image file"
          >
            Open Image
          </button>
          <div className="export-action-row">
            <button
              className="action-btn export-image-btn"
              disabled
              title="Export Image (Coming in Phase 7)"
            >
              Export Image
            </button>
            <Dropdown
              className="export-format-dropdown"
              disabled
              width={76}
              value="PNG"
              onChange={() => {}}
              title="Export format (Coming in Phase 7)"
              items={[
                { id: 'PNG', label: 'PNG' },
                { id: 'JPEG', label: 'JPEG' },
                { id: 'WEBP', label: 'WEBP' },
              ]}
            />
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
                    <Dropdown
                      className="category-dropdown"
                      width="100%"
                      value={activeCategory}
                      onChange={(catId) => setActiveCategory(catId)}
                      title="Filter algorithms by category"
                      items={[
                        { id: 'all', label: `All (${ALGORITHM_REGISTRY.length})` },
                        { id: 'error_diffusion', label: 'Diffusion (15)' },
                        { id: 'ordered', label: 'Ordered (5)' },
                        { id: 'pattern', label: 'Pattern (8)' },
                        { id: 'glitch', label: 'Glitch (17)' },
                        { id: 'special', label: 'Special (16)' },
                        { id: 'bespoke', label: 'Bespoke (2)' },
                      ]}
                    />
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

                {/* Color Depth — Only applies to Bit Crush */}
                {algorithmId === 'bit_crush' && (
                  <div className="slider-control-block">
                    <div className="slider-label-above">
                      <span
                        onDoubleClick={() => resetAdjustmentParam('depth')}
                        style={{ cursor: 'pointer' }}
                        title="Quantization steps for Bit Crush (1–32). Only applies to the Bit Crush algorithm."
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
                        className="control-slider"
                        title="Quantization steps for Bit Crush (1–32). Only applies to the Bit Crush algorithm."
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
                        title="Quantization steps for Bit Crush (1–32). Only applies to the Bit Crush algorithm."
                        onChange={(e) => setDepth(parseInt(e.target.value, 10) || 8)}
                      />
                    </div>
                  </div>
                )}
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
                <span className="section-title-text">PALETTE</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={shuffleUnlockedSwatches}
                  title="Shuffle unlocked swatches"
                  style={{ width: '22px', height: '22px' }}
                >
                  <Shuffle size={14} />
                </button>
                <button
                  type="button"
                  className="reset-section-btn"
                  onClick={handleResetPalette}
                  title="Reset to built-in palette"
                  style={{ marginBottom: 0, padding: '2px 8px' }}
                >
                  Reset
                </button>
              </div>
            </div>

            {!collapsedSections.palette && (
              <div className="section-content">
                {/* Built-in Dropdown */}
                <div className="picker-row">
                  <span className="picker-label">Built-in</span>
                  <div className="select-with-steppers">
                    <button className="stepper-btn" onClick={handlePrevPalette} title="Previous Palette">&lt;</button>
                    <Dropdown
                      className="palette-builtin-dropdown"
                      width="100%"
                      value={activePaletteId}
                      onChange={(palId) => setActivePaletteId(palId)}
                      title="Choose built-in palette"
                      items={[
                        ...(activePaletteId === 'custom'
                          ? [{ id: 'custom', label: 'Custom Palette', hint: `${workingPalette.length} colors` }]
                          : []),
                        ...BUILTIN_PALETTES.map((pal: any) => ({
                          id: pal.id,
                          label: pal.name,
                          hint: `${pal.colors.length} colors`,
                        })),
                      ]}
                    />
                    <button className="stepper-btn" onClick={handleNextPalette} title="Next Palette">&gt;</button>
                  </div>
                </div>

                {/* Swatch grid: 32x32px each, 4px gaps, wrapping naturally */}
                <div className="palette-swatches-grid" title="Palette swatches">
                  {workingPalette.map((c: number[], i: number) => {
                    const isLocked = lockedSwatches.includes(i);
                    const isBeyondDepth = i >= paletteDepth;
                    const hex = rgbaToHex(c[0], c[1], c[2]).toUpperCase();
                    return (
                      <div
                        key={i}
                        className="palette-swatch-item"
                        style={{
                          backgroundColor: `rgb(${c[0]}, ${c[1]}, ${c[2]})`,
                          opacity: isBeyondDepth ? 0.35 : 1
                        }}
                        onClick={() => setActiveSwatchIndex(activeSwatchIndex === i ? null : i)}
                        title={`Swatch ${i + 1}: ${hex}${isLocked ? ' (Locked)' : ''}`}
                      >
                        {isLocked && (
                          <div className="palette-swatch-lock-badge">
                            <Lock size={10} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add swatch button if < 32 */}
                  {workingPalette.length < 32 && (
                    <button
                      type="button"
                      className="palette-swatch-item"
                      onClick={addSwatch}
                      title="Add color swatch (up to 32)"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: '1rem',
                        borderStyle: 'dashed'
                      }}
                    >
                      +
                    </button>
                  )}

                  {/* Swatch Edit Popover */}
                  {activeSwatchIndex !== null && activeSwatchIndex < workingPalette.length && (
                    <div
                      ref={popoverRef}
                      className="palette-swatch-popover"
                      style={{
                        top: Math.floor(activeSwatchIndex / 7) * 36 + 40,
                        left: Math.min(60, (activeSwatchIndex % 7) * 36)
                      }}
                    >
                      <input
                        type="color"
                        className="palette-color-picker-input"
                        value={rgbaToHex(
                          workingPalette[activeSwatchIndex][0],
                          workingPalette[activeSwatchIndex][1],
                          workingPalette[activeSwatchIndex][2]
                        )}
                        onChange={(e) => {
                          const rgba = hexToRgba(e.target.value);
                          updateSwatchColor(activeSwatchIndex, rgba);
                        }}
                      />
                      <div className="palette-popover-row">
                        <input
                          type="text"
                          className="palette-hex-input"
                          maxLength={7}
                          value={rgbaToHex(
                            workingPalette[activeSwatchIndex][0],
                            workingPalette[activeSwatchIndex][1],
                            workingPalette[activeSwatchIndex][2]
                          ).toUpperCase()}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                              updateSwatchColor(activeSwatchIndex, hexToRgba(val));
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="palette-popover-btn"
                          onClick={() => toggleLockSwatch(activeSwatchIndex)}
                          title={lockedSwatches.includes(activeSwatchIndex) ? "Unlock Swatch" : "Lock Swatch"}
                        >
                          {lockedSwatches.includes(activeSwatchIndex) ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        <button
                          type="button"
                          className="palette-popover-btn"
                          disabled={workingPalette.length <= 2}
                          onClick={() => {
                            removeSwatch(activeSwatchIndex);
                            setActiveSwatchIndex(null);
                          }}
                          title={workingPalette.length <= 2 ? "Minimum 2 colors required" : "Delete Swatch"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* From Image Extraction Buttons */}
                <div className="palette-actions-block">
                  <span className="palette-actions-label">From Image</span>
                  <div className="palette-buttons-row">
                    <button
                      type="button"
                      className="palette-action-btn"
                      disabled={!hasImage || !sourceImageData}
                      onClick={handleExtractMedianCut}
                      title={!hasImage || !sourceImageData ? "Load an image first" : "Extract 8 colors using Median Cut"}
                    >
                      Median Cut
                    </button>
                    <button
                      type="button"
                      className="palette-action-btn"
                      disabled={!hasImage || !sourceImageData}
                      onClick={handleExtractKMeans}
                      title={!hasImage || !sourceImageData ? "Load an image first" : "Extract 8 colors using K-Means clustering"}
                    >
                      K-Means
                    </button>
                  </div>
                </div>

                {/* Depth Slider */}
                <div className="palette-depth-block">
                  <div className="slider-label-above">
                    <span title="Palette depth iteration count">Palette Depth</span>
                  </div>
                  <div className="slider-track-input-row">
                    <input
                      type="range"
                      className="control-slider"
                      min="2"
                      max={Math.min(32, workingPalette.length)}
                      step="1"
                      disabled={workingPalette.length <= 2}
                      value={paletteDepth}
                      style={getSliderFill(paletteDepth, 2, Math.min(32, workingPalette.length))}
                      {...sliderPointerProps}
                      onChange={(e) => setPaletteDepth(Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="control-num-input"
                      min="2"
                      max={Math.min(32, workingPalette.length)}
                      step="1"
                      disabled={workingPalette.length <= 2}
                      value={paletteDepth}
                      onChange={(e) => setPaletteDepth(parseInt(e.target.value, 10) || 2)}
                    />
                  </div>
                  <div className="palette-depth-info">
                    Using {paletteDepth} of {workingPalette.length} colours
                  </div>
                </div>

                {/* Import / Export JSON */}
                <div className="palette-buttons-row" style={{ marginTop: '10px' }}>
                  <input
                    type="file"
                    ref={paletteFileInputRef}
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImportPalette}
                  />
                  <button
                    type="button"
                    className="palette-action-btn"
                    onClick={() => paletteFileInputRef.current?.click()}
                    title="Import custom palette JSON"
                  >
                    ⬇ Import
                  </button>
                  <button
                    type="button"
                    className="palette-action-btn"
                    onClick={handleExportPalette}
                    title="Export current working palette to JSON"
                  >
                    ⬆ Export
                  </button>
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
                <span className="section-title-text">
                  EFFECTS STACK ({effects.filter(e => e.enabled).length} active / {effects.length} total)
                </span>
              </button>
              <button
                type="button"
                className="section-reset-btn"
                onClick={handleResetEffects}
                title="Reset effect stack to default"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>

            {!collapsedSections.effects && (
              <div className="section-content">
                {/* Add Effect Button with Popover */}
                <div className="add-effect-popover-container" ref={addEffectPopoverRef}>
                  <button
                    type="button"
                    className="action-btn add-effect-trigger-btn"
                    onClick={() => setIsAddEffectOpen(!isAddEffectOpen)}
                    title="Add post-effect to stack"
                  >
                    + Add Effect
                  </button>

                  {isAddEffectOpen && (
                    <div className="add-effect-popover" onWheel={(e) => e.stopPropagation()}>
                      <input
                        ref={addEffectInputRef}
                        type="text"
                        className="add-effect-search-input"
                        placeholder="Search effects…"
                        value={addEffectQuery}
                        onChange={(e) => setAddEffectQuery(e.target.value)}
                      />
                      <div className="add-effect-items-list">
                        {AVAILABLE_EFFECT_TYPES
                          .filter((eff: any) =>
                            eff.name.toLowerCase().includes(addEffectQuery.toLowerCase()) ||
                            eff.id.toLowerCase().includes(addEffectQuery.toLowerCase())
                          )
                          .map((eff: any) => {
                            const paramKeys = Object.keys(eff.defaultParams).join(' · ');
                            return (
                              <div
                                key={eff.id}
                                className="add-effect-item-row"
                                onClick={() => {
                                  addEffectInstance(eff.id);
                                  setIsAddEffectOpen(false);
                                  setAddEffectQuery('');
                                }}
                              >
                                <span className="add-effect-item-name">{eff.name}</span>
                                <span className="add-effect-item-hint">{paramKeys}</span>
                              </div>
                            );
                          })}
                        {AVAILABLE_EFFECT_TYPES.filter((eff: any) =>
                          eff.name.toLowerCase().includes(addEffectQuery.toLowerCase())
                        ).length === 0 && (
                          <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            No effects match search
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Effect Cards List */}
                <div className="effect-stack-list">
                  {effects.map((eff, index) => {
                    const isExpanded = expandedEffectId === eff.id;
                    const meta = AVAILABLE_EFFECT_TYPES.find((m: any) => m.id === (eff.type || eff.id));
                    const defaultParams: Record<string, any> = meta ? (meta.defaultParams as any) : {};

                    return (
                      <div
                        key={eff.id}
                        className={`effect-card ${isExpanded ? 'expanded' : ''} ${draggedEffectIndex === index ? 'dragging' : ''} ${dragOverEffectIndex === index ? 'drag-over' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedEffectIndex !== null && draggedEffectIndex !== index) {
                            setDragOverEffectIndex(index);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverEffectIndex === index) setDragOverEffectIndex(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedEffectIndex !== null && draggedEffectIndex !== index) {
                            reorderEffects(draggedEffectIndex, index);
                          }
                          setDraggedEffectIndex(null);
                          setDragOverEffectIndex(null);
                        }}
                      >
                        {/* Card Header (Collapsed 34px tall) */}
                        <div
                          className="effect-card-header"
                          onClick={() => setExpandedEffectId(isExpanded ? null : eff.id)}
                        >
                          <div className="effect-card-left">
                            <span
                              className="effect-drag-handle"
                              draggable
                              title="Drag to reorder"
                              onClick={(e) => e.stopPropagation()}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                setDraggedEffectIndex(index);
                              }}
                              onDragEnd={() => {
                                setDraggedEffectIndex(null);
                                setDragOverEffectIndex(null);
                              }}
                            >
                              <GripVertical size={12} />
                            </span>

                            <button
                              type="button"
                              className={`effect-enable-dot ${eff.enabled ? 'enabled' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEffectEnabled(eff.id);
                              }}
                              title={eff.enabled ? "Disable effect" : "Enable effect"}
                            />

                            <span className={`effect-name-text ${!eff.enabled ? 'disabled' : ''}`}>
                              {eff.name}
                            </span>
                          </div>

                          <div className="effect-card-right">
                            <span className={`effect-expand-chevron ${isExpanded ? 'expanded' : ''}`}>
                              <ChevronRight size={12} />
                            </span>

                            <button
                              type="button"
                              className="effect-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeEffectInstance(eff.id);
                                if (expandedEffectId === eff.id) setExpandedEffectId(null);
                              }}
                              title="Delete effect"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Card Expanded Parameters */}
                        {isExpanded && (
                          <div className="effect-card-params">
                            {Object.keys(defaultParams).map((key) => {
                              const val = eff.params[key] !== undefined ? eff.params[key] : defaultParams[key];

                              // Shape segmented control
                              if (key === 'shape' && typeof defaultParams[key] === 'string') {
                                return (
                                  <div key={key} className="slider-control-block">
                                    <div className="slider-label-above">
                                      <span>Shape</span>
                                    </div>
                                    <div className="effect-param-segmented">
                                      <button
                                        type="button"
                                        className={`effect-param-segment-btn ${val === 'circle' ? 'active' : ''}`}
                                        onClick={() => updateEffectParam(eff.id, 'shape', 'circle')}
                                      >
                                        Circle
                                      </button>
                                      <button
                                        type="button"
                                        className={`effect-param-segment-btn ${val === 'diamond' ? 'active' : ''}`}
                                        onClick={() => updateEffectParam(eff.id, 'shape', 'diamond')}
                                      >
                                        Diamond
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              // Numerical Slider Params
                              let min = 0;
                              let max = 1;
                              let step = 0.05;

                              if (key === 'quality' || key === 'intensity' || key === 'blackPoint' || key === 'whitePoint' || key === 'softness') {
                                min = 0; max = 1; step = 0.05;
                              } else if (key === 'radius' || key === 'dotSize' || key === 'thickness' || key === 'blockSize') {
                                min = 1; max = 20; step = 1;
                              } else if (key === 'angle') {
                                min = 0; max = 360; step = 1;
                              } else if (key === 'offsetX' || key === 'offsetY') {
                                min = 0; max = 20; step = 1;
                              } else if (key === 'gamma') {
                                min = 0.1; max = 3.0; step = 0.05;
                              } else if (key === 'amount') {
                                min = -1.0; max = 1.0; step = 0.05;
                              }

                              const numVal = typeof val === 'number' ? val : defaultParams[key];
                              const labelText = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                              return (
                                <div key={key} className="slider-control-block">
                                  <div className="slider-label-above">
                                    <span
                                      onDoubleClick={() => updateEffectParam(eff.id, key, defaultParams[key])}
                                      style={{ cursor: 'pointer' }}
                                      title={`Double-click to reset ${labelText} to default (${defaultParams[key]})`}
                                    >
                                      {labelText}
                                    </span>
                                  </div>
                                  <div className="slider-track-input-row">
                                    <input
                                      type="range"
                                      className="control-slider"
                                      min={min}
                                      max={max}
                                      step={step}
                                      value={numVal}
                                      style={getSliderFill(numVal, min, max)}
                                      {...sliderPointerProps}
                                      onDoubleClick={() => updateEffectParam(eff.id, key, defaultParams[key])}
                                      onChange={(e) => updateEffectParam(eff.id, key, Number(e.target.value))}
                                    />
                                    <input
                                      type="number"
                                      className="control-num-input"
                                      min={min}
                                      max={max}
                                      step={step}
                                      value={numVal}
                                      onChange={(e) => {
                                        const parsed = parseFloat(e.target.value);
                                        updateEffectParam(eff.id, key, isNaN(parsed) ? defaultParams[key] : parsed);
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  <Dropdown
                    disabled
                    width="100%"
                    value=""
                    placeholder="Built-in Presets..."
                    onChange={() => {}}
                    title="Load Preset (Coming in Phase 6)"
                    items={BUILTIN_PRESETS.map((p: any) => ({
                      id: p.id,
                      label: p.name,
                    }))}
                  />
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

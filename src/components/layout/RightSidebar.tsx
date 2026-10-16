import { Logo } from '../common/Logo';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LoadingScreen } from '../common/LoadingScreen';
import { Dropdown } from '../common/Dropdown';
import { Tooltip } from '../common/Tooltip';
import { USER_ALGORITHM_DESCRIPTIONS } from '../../ui/algorithm-descriptions';
import { useAppStore } from '../../state/useAppStore';
import { useLenis } from '../../hooks/useLenis';
// Import frozen registries UNCHANGED
// @ts-ignore
import { ALGORITHM_REGISTRY, ALGORITHM_CATEGORIES } from '../../dither-engine/algorithms.js';
// @ts-ignore
import { BUILTIN_PALETTES, extractPaletteMedianCut, extractPaletteKMeans, hexToRgba, rgbaToHex } from '../../dither-engine/palettes.js';
// @ts-ignore
import { BUILTIN_PRESETS } from '../../ui/presets.js';
// @ts-ignore
import { AVAILABLE_EFFECT_TYPES } from '../../dither-engine/effect-stack.js';
// @ts-ignore
import { exportRaster } from '../../dither-engine/exporters.js';
import { 
  ArrowDown,
  ArrowUp,
  Trash2,
  MoveVertical,
  Shuffle,
  GripVertical,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Square,
  Layers,
  Download,
  Upload
} from 'lucide-react';

const CATEGORY_KEYS = [
  'all',
  'basic',
  'error_diffusion',
  'glitch_effects',
  'ordered',
  'patterned',
  'polygon',
  'special_effects'
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

  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useLenis({ wrapper: scrollWrapperRef.current, content: scrollContentRef.current });

  // App store selectors
  const algorithmId = useAppStore((state) => state.algorithmId);
  const setAlgorithmId = useAppStore((state) => state.setAlgorithmId);
  const algoParams = useAppStore((state) => state.algoParams);
  const updateCurrentAlgoParam = useAppStore((state) => state.updateCurrentAlgoParam);
  const resetCurrentAlgoParams = useAppStore((state) => state.resetCurrentAlgoParams);
  const resetAlgoParamToDefault = useAppStore((state) => state.resetAlgoParamToDefault);
  const favoriteAlgorithms = useAppStore((state) => state.favoriteAlgorithms);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const toggleFavoriteAlgorithm = toggleFavorite;



  const setIsDraggingSlider = useAppStore((state) => state.setIsDraggingSlider);
  const showAlgorithmDescriptions = useAppStore((state) => state.showAlgorithmDescriptions);

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

  const resetAdjustmentParam = useAppStore((state) => state.resetAdjustmentParam);
  const resetAllAdjustments = useAppStore((state) => state.resetAllAdjustments);

  // Palette & Effects & Reset
  const activePaletteId = useAppStore((state) => state.activePaletteId);
  const setActivePaletteId = useAppStore((state) => state.setActivePaletteId);
  const workingPalette = useAppStore((state) => state.workingPalette);
  const paletteDepth = useAppStore((state) => state.paletteDepth);
  const updateSwatchColor = useAppStore((state) => state.updateSwatchColor);
  const shuffleUnlockedSwatches = useAppStore((state) => state.shuffleUnlockedSwatches);
  const addSwatch = useAppStore((state) => state.addSwatch);
  const removeSwatch = useAppStore((state) => state.removeSwatch);
  const setPaletteDepth = useAppStore((state) => state.setPaletteDepth);
  const resetToBuiltin = useAppStore((state) => state.resetToBuiltin);
  const imageFileName = useAppStore((state) => state.imageFileName);
  const sourceImageData = useAppStore((state) => state.sourceImageData);
  const hasImage = useAppStore((state) => state.hasImage);

  const effects = useAppStore((state) => state.effects);
  const removeEffectInstance = useAppStore((state) => state.removeEffectInstance);
  const toggleEffectEnabled = useAppStore((state) => state.toggleEffectEnabled);
  const reorderEffects = useAppStore((state) => state.reorderEffects);
  const updateEffectParam = useAppStore((state) => state.updateEffectParam);
  const resetEffects = useAppStore((state) => state.resetEffects);
  const resetAll = useAppStore((state) => state.resetAll);
  const loadImageFromData = useAppStore((state) => state.loadImageFromData);

  // Local state for Swatch editing popover
  // Local state for Effects section (Phase 5)
  const [isExtractingPalette, setIsExtractingPalette] = useState<boolean>(false);
  const [expandedEffectId, setExpandedEffectId] = useState<string | null>('glow');
  const [draggedEffectIndex, setDraggedEffectIndex] = useState<number | null>(null);
  const [dragOverEffectIndex, setDragOverEffectIndex] = useState<number | null>(null);

  // Dropdown open/closed state persists in localStorage under 'ditherforge_effects_open'. Default: closed on first load.
  const [isEffectsDropdownOpen, setIsEffectsDropdownOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('ditherforge_effects_open') === 'true';
      } catch {}
    }
    return false;
  });

  const toggleEffectsDropdown = useCallback(() => {
    setIsEffectsDropdownOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ditherforge_effects_open', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Escape key collapses expanded effect card
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedEffectId !== null) {
        setExpandedEffectId(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [expandedEffectId]);

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
    setCollapsedSections((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      try {
        localStorage.setItem('ditherforge_collapsed_sections', JSON.stringify(next));
      } catch {}
      return next;
    });
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

  const [exportFormat, setExportFormat] = useState<string>('PNG');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = BUILTIN_PRESETS.find((p: any) => p.id === presetId);
    if (!preset) return;
    if (preset.algorithmId) setAlgorithmId(preset.algorithmId);
    if (preset.paletteId) setActivePaletteId(preset.paletteId);
    if (preset.brightness !== undefined) setBrightness(preset.brightness * 100);
    if (preset.contrast !== undefined) setContrast(preset.contrast * 100);
    if (preset.saturation !== undefined) setSaturation(preset.saturation * 100);
    if (preset.gamma !== undefined) setGamma(preset.gamma);
    if (preset.depth !== undefined) setDepth(preset.depth);
    if (preset.threshold !== undefined) updateCurrentAlgoParam('threshold', preset.threshold);
    if (preset.scale !== undefined) updateCurrentAlgoParam('scale', preset.scale);
    if (preset.diffusionStrength !== undefined) updateCurrentAlgoParam('diffusionStrength', preset.diffusionStrength);
    if (preset.serpentine !== undefined) updateCurrentAlgoParam('serpentine', preset.serpentine);
    if (preset.effects && Array.isArray(preset.effects)) {
      useAppStore.setState({ effects: preset.effects });
    }
  };

  const categoryDropdownItems = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const algo of ALGORITHM_REGISTRY) {
      counts[algo.category] = (counts[algo.category] || 0) + 1;
    }
    const labelMap: Record<string, string> = {
      all: `All (${ALGORITHM_REGISTRY.length})`,
      basic: `Basic (${counts['basic'] || 0})`,
      error_diffusion: `Error Diffusion (${counts['error_diffusion'] || 0})`,
      ordered: `Ordered (${counts['ordered'] || 0})`,
      patterned: `Patterned (${counts['patterned'] || 0})`,
      polygon: `Polygon (${counts['polygon'] || 0})`,
      glitch_effects: `Glitch Effects (${counts['glitch_effects'] || 0})`,
      special_effects: `Special Effects (${counts['special_effects'] || 0})`
    };
    return CATEGORY_KEYS.map((cat) => ({
      id: cat,
      label: labelMap[cat] || cat
    }));
  }, []);

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
  const isCurrentFavorite = favoriteAlgorithms.includes(algorithmId);

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
      const target = e.target as HTMLElement;
      if (!target) return;
      const tag = target.tagName;
      if (
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        tag === 'BUTTON' || tag === 'A' ||
        target.isContentEditable ||
        target.closest('button, a, input, textarea, select, [contenteditable="true"]')
      ) {
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
    setIsExtractingPalette(true);
    requestAnimationFrame(() => {
      const extracted = extractPaletteMedianCut(sourceImageData, 8);
      useAppStore.setState({
        activePaletteId: 'custom',
        activePalette: 'custom',
        workingPalette: extracted.map((c: number[]) => [...c]),
        paletteDepth: extracted.length
      });
      setIsExtractingPalette(false);
    });
  };

  const handleExtractKMeans = () => {
    if (!sourceImageData) return;
    setIsExtractingPalette(true);
    requestAnimationFrame(() => {
      const extracted = extractPaletteKMeans(sourceImageData, 8, 8);
      useAppStore.setState({
        activePaletteId: 'custom',
        activePalette: 'custom',
        workingPalette: extracted.map((c: number[]) => [...c]),
        paletteDepth: extracted.length
      });
      setIsExtractingPalette(false);
    });
  };

  const getVisibleParams = (id: string) => {
    const norm = (id || '').replace(/_/g, '-');
    const algo = ALGORITHM_REGISTRY.find((a: any) => a.id === id || a.id === norm);
    if (!algo) {
      return { threshold: true, scale: true, diffusionStrength: true, serpentine: true, noiseAmount: false };
    }

    if (norm === 'none') {
      return { threshold: false, scale: false, diffusionStrength: false, serpentine: false, noiseAmount: false };
    }

    const supportsScale = algo.features?.supportsDpiScale !== false && norm !== 'color-separation';
    const isErrorDiff = algo.category === 'error_diffusion';
    const isGlitch = algo.category === 'glitch_effects';
    const hasErrorStrength = algo.controls?.some((c: any) => c.id === 'errorStrength' || c.id === 'errorReduction' || c.id === 'strength') || isErrorDiff;
    const hasSerpentine = algo.controls?.some((c: any) => c.id === 'serpentine') || isErrorDiff;
    const hasNoise = algo.controls?.some((c: any) => c.id === 'noise' || c.id === 'randomVal') || norm === 'noise';

    return {
      threshold: true,
      scale: supportsScale,
      diffusionStrength: hasErrorStrength || isGlitch,
      serpentine: hasSerpentine || isGlitch,
      noiseAmount: hasNoise
    };
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
      <div ref={scrollWrapperRef} className="sidebar-scrollable-content">
        <div ref={scrollContentRef}>
        {/* TOP ACTION BLOCK */}
        <div className="top-action-block">
          <div className="sidebar-brand">
            <Logo variant="mark" size={140} />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Tooltip text="Open local image file" style={{ width: '100%' }}>
            <button
              className="btn-primary open-image-btn"
              onClick={handleOpenImage}
            >
              Open Image
            </button>
          </Tooltip>
          <div className="export-action-row">
            <Tooltip text="Export dithered image" style={{ flex: 1, minWidth: 0, display: 'flex' }}>
              <button
                className="btn-default export-image-btn"
                style={{ width: '100%' }}
                onClick={() => {
                  const canvas = (document.getElementById('mainViewportCanvas') as HTMLCanvasElement) ||
                                 (document.querySelector('canvas.preview-canvas') as HTMLCanvasElement);
                  if (canvas) {
                    const fmt = exportFormat.toLowerCase() === 'jpeg' ? 'jpg' : exportFormat.toLowerCase();
                    const baseName = (imageFileName || 'ditherforge_export').replace(/\.[^/.]+$/, '');
                    exportRaster(canvas, fmt, 0.92, `${baseName}_dithered.${fmt}`);
                  }
                }}
              >
                Export Image
              </button>
            </Tooltip>
            <Dropdown
              className="export-format-dropdown"
              width={86}
              value={exportFormat}
              onChange={(fmt) => setExportFormat(fmt)}
              tooltip="Select export format"
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
            <div 
              className="section-header section-header-clickable"
              onClick={() => toggleSection('style')}
            >
              <div className="section-header-left">
                <span className="section-collapse-icon">{collapsedSections.style ? '▶' : '▼'}</span>
                <span className="section-title-text">STYLE</span>
              </div>
            </div>

            {!collapsedSections.style && (
              <div className="section-content">
                {/* Category Row */}
                <div className="picker-row">
                  <span className="picker-label">Category</span>
                  <div className="select-with-steppers">
                    <Tooltip text="Previous Category">
                      <button className="stepper-btn" onClick={handlePrevCategory}>&lt;</button>
                    </Tooltip>
                    <Dropdown
                      className="category-dropdown"
                      width="100%"
                      value={activeCategory}
                      onChange={(catId) => setActiveCategory(catId)}
                      tooltip="Filter algorithms by category"
                      items={categoryDropdownItems}
                    />
                    <Tooltip text="Next Category">
                      <button className="stepper-btn" onClick={handleNextCategory}>&gt;</button>
                    </Tooltip>
                  </div>
                </div>

                {/* Algorithm Row */}
                <div className="picker-row">
                  <span className="picker-label">Algorithm</span>
                  <div className="select-with-steppers">
                    <Tooltip text="Previous Algorithm (Up Arrow)">
                      <button className="stepper-btn" onClick={handlePrevAlgo}>&lt;</button>
                    </Tooltip>
                    <div className="algo-listbox-container" ref={listboxRef}>
                      <button
                        type="button"
                        className={`algo-listbox-trigger ${isAlgoListboxOpen ? 'open' : ''}`}
                        onClick={() => setIsAlgoListboxOpen(!isAlgoListboxOpen)}
                        onKeyDown={handleListboxKeyDown}
                        aria-haspopup="listbox"
                        aria-expanded={isAlgoListboxOpen}
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
                                <Tooltip key={favId} text={algoObj.name}>
                                  <button
                                    type="button"
                                    className="algo-favorite-chip"
                                    onClick={() => {
                                      setAlgorithmId(favId);
                                      setIsAlgoListboxOpen(false);
                                    }}
                                  >
                                    {algoObj.name}
                                  </button>
                                </Tooltip>
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
                            <Tooltip text="Clear search">
                              <button
                                type="button"
                                className="algo-search-clear"
                                onClick={() => {
                                  setSearchQuery('');
                                  searchInputRef.current?.focus();
                                }}
                              >
                                ×
                              </button>
                            </Tooltip>
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
                                <Tooltip text={isFav ? "Remove from Favorites" : "Add to Favorites"}>
                                  <button
                                    type="button"
                                    className={`algo-listbox-star-btn ${isFav ? 'starred' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(a.id);
                                    }}
                                    aria-label={isFav ? `Remove ${a.name} from Favorites` : `Add ${a.name} to Favorites`}
                                  >
                                    {isFav ? '★' : '☆'}
                                  </button>
                                </Tooltip>
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
                    <Tooltip text="Next Algorithm (Down Arrow)">
                      <button className="stepper-btn" onClick={handleNextAlgo}>&gt;</button>
                    </Tooltip>
                    <Tooltip text={isCurrentFavorite ? "Remove from Favorites" : "Add to Favorites"}>
                      <button
                        className="stepper-btn"
                        onClick={() => toggleFavoriteAlgorithm(algorithmId)}
                        style={{ color: isCurrentFavorite ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                      >
                        ★
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* User-facing Algorithm Description (Item 7) */}
                {(() => {
                  if (!showAlgorithmDescriptions) return null;
                  const desc = USER_ALGORITHM_DESCRIPTIONS[algorithmId] || USER_ALGORITHM_DESCRIPTIONS[currentAlgo.id] || USER_ALGORITHM_DESCRIPTIONS[(algorithmId || '').replace(/-/g, '_')];
                  return (
                    <div className="algo-description-container">
                      <div className="algo-desc-what">
                        {desc?.what ?? currentAlgo.description}
                      </div>
                      {desc?.why && (
                        <div className="algo-desc-why">
                          <span className="algo-desc-why-prefix">Best for: </span>
                          {desc.why}
                        </div>
                      )}
                      {currentAlgo.description && desc && (
                        <div className="algo-desc-footnote">
                          {currentAlgo.description}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Reset button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Tooltip text="Reset algorithm parameters">
                    <button
                      className="btn-subtle"
                      onClick={resetCurrentAlgoParams}
                    >
                      Reset
                    </button>
                  </Tooltip>
                </div>

                {/* Progressive Parameters */}
                {visibleParams.threshold && (
                  <div className="slider-control-block">
                    <div className="slider-label-above">
                      <Tooltip text="Threshold (0.00 to 1.00). Double-click to reset.">
                        <span
                          onDoubleClick={() => resetAlgoParamToDefault('threshold')}
                          style={{ cursor: 'pointer' }}
                        >
                          Threshold
                        </span>
                      </Tooltip>
                    </div>
                    <div className="slider-track-input-row">
                      <Tooltip text="Double-click to reset to default" style={{ flex: 1, display: 'flex' }}>
                        <input
                          type="range"
                          className="control-slider"
                          min="0.0"
                          max="1.0"
                          step="0.02"
                          value={currentParams.threshold}
                          style={getSliderFill(currentParams.threshold, 0, 1)}
                          {...sliderPointerProps}
                          onDoubleClick={() => resetAlgoParamToDefault('threshold')}
                          onChange={(e) => updateCurrentAlgoParam('threshold', Number(e.target.value))}
                        />
                      </Tooltip>
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
                      <Tooltip text="Pattern Scale (0.05x to 8.0x). Double-click to reset.">
                        <span
                          onDoubleClick={() => resetAlgoParamToDefault('scale')}
                          style={{ cursor: 'pointer' }}
                        >
                          Pattern Scale
                        </span>
                      </Tooltip>
                    </div>
                    <div className="slider-track-input-row">
                      <Tooltip text="Double-click to reset to default" style={{ flex: 1, display: 'flex' }}>
                        <input
                          type="range"
                          className="control-slider"
                          min="0.05"
                          max="8.0"
                          step="0.05"
                          value={currentParams.scale}
                          style={getSliderFill(currentParams.scale, 0.05, 8)}
                          {...sliderPointerProps}
                          onDoubleClick={() => resetAlgoParamToDefault('scale')}
                          onChange={(e) => updateCurrentAlgoParam('scale', Number(e.target.value))}
                        />
                      </Tooltip>
                      <input
                        type="number"
                        className="control-num-input"
                        min="0.05"
                        max="8.0"
                        step="0.05"
                        value={currentParams.scale}
                        onChange={(e) => updateCurrentAlgoParam('scale', parseFloat(e.target.value) || 0.05)}
                      />
                    </div>
                  </div>
                )}

                {visibleParams.diffusionStrength && (
                  <div className="slider-control-block">
                    <div className="slider-label-above">
                      <Tooltip text="Diffusion Strength (0.0 to 1.0). Double-click to reset.">
                        <span
                          onDoubleClick={() => resetAlgoParamToDefault('diffusionStrength')}
                          style={{ cursor: 'pointer' }}
                        >
                          Diffusion Strength
                        </span>
                      </Tooltip>
                    </div>
                    <div className="slider-track-input-row">
                      <Tooltip text="Double-click to reset to default" style={{ flex: 1, display: 'flex' }}>
                        <input
                          type="range"
                          className="control-slider"
                          min="0.0"
                          max="1.0"
                          step="0.05"
                          value={currentParams.diffusionStrength}
                          style={getSliderFill(currentParams.diffusionStrength, 0, 1)}
                          {...sliderPointerProps}
                          onDoubleClick={() => resetAlgoParamToDefault('diffusionStrength')}
                          onChange={(e) => updateCurrentAlgoParam('diffusionStrength', Number(e.target.value))}
                        />
                      </Tooltip>
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
                    <Tooltip text="Alternates scan direction on odd rows to prevent diagonal artifacting">
                      <button
                        type="button"
                        id="serpentineToggleBtn"
                        className={`toggle-square-btn ${currentParams.serpentine ? 'enabled' : ''}`}
                        onClick={() => updateCurrentAlgoParam('serpentine', !currentParams.serpentine)}
                        aria-label="Toggle Serpentine Scanline"
                      >
                        <span className={`toggle-square ${currentParams.serpentine ? 'enabled' : ''}`} />
                      </button>
                    </Tooltip>
                    <label 
                      htmlFor="serpentineToggleBtn"
                      className="serpentine-label"
                      onClick={() => updateCurrentAlgoParam('serpentine', !currentParams.serpentine)}
                    >
                      Serpentine Scanline
                    </label>
                  </div>
                )}

                {visibleParams.noiseAmount && (
                  <div className="slider-control-block">
                    <div className="slider-label-above">
                      <Tooltip text="Noise Amount (0.0 to 1.0). Double-click to reset.">
                        <span
                          onDoubleClick={() => resetAlgoParamToDefault('noiseAmount')}
                          style={{ cursor: 'pointer' }}
                        >
                          Noise Amount
                        </span>
                      </Tooltip>
                    </div>
                    <div className="slider-track-input-row">
                      <Tooltip text="Double-click to reset to default" style={{ flex: 1, display: 'flex' }}>
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
                        />
                      </Tooltip>
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

                {/* Algorithm-Specific Custom Controls */}
                {currentAlgo.controls && Array.isArray(currentAlgo.controls) && currentAlgo.controls
                  .filter((ctrl: any) => !['threshold', 'scale', 'diffusionStrength', 'serpentine', 'noiseAmount'].includes(ctrl.id))
                  .map((ctrl: any) => {
                    if (ctrl.type === 'dropdown') {
                      return (
                        <div key={ctrl.id} className="picker-row" style={{ marginTop: 8 }}>
                          <span className="picker-label">{ctrl.label}</span>
                          <Dropdown
                            width="100%"
                            value={String(currentParams[ctrl.id] ?? ctrl.defaultValue ?? (ctrl.options && ctrl.options[0]?.value))}
                            onChange={(val) => updateCurrentAlgoParam(ctrl.id, val)}
                            tooltip={ctrl.description || ctrl.tooltip || ctrl.label}
                            items={(ctrl.options || []).map((opt: any) => ({
                              id: String(opt.value),
                              label: opt.label,
                            }))}
                          />
                        </div>
                      );
                    }
                    if (ctrl.type === 'toggle') {
                      const isChecked = !!(currentParams[ctrl.id] !== undefined ? currentParams[ctrl.id] : ctrl.defaultValue);
                      return (
                        <div key={ctrl.id} className="serpentine-row" style={{ marginTop: 8 }}>
                          <Tooltip text={ctrl.description || ctrl.label}>
                            <button
                              type="button"
                              id={`toggle-${ctrl.id}`}
                              className={`toggle-square-btn ${isChecked ? 'enabled' : ''}`}
                              onClick={() => updateCurrentAlgoParam(ctrl.id, !isChecked)}
                              aria-label={`Toggle ${ctrl.label}`}
                            >
                              <span className={`toggle-square ${isChecked ? 'enabled' : ''}`} />
                            </button>
                          </Tooltip>
                          <label
                            htmlFor={`toggle-${ctrl.id}`}
                            className="serpentine-label"
                            onClick={() => updateCurrentAlgoParam(ctrl.id, !isChecked)}
                          >
                            {ctrl.label}
                          </label>
                        </div>
                      );
                    }
                    // Default to slider
                    const min = ctrl.min ?? 1;
                    const max = ctrl.max ?? 10;
                    const step = ctrl.step ?? 1;
                    const ctrlVal = currentParams[ctrl.id] !== undefined ? Number(currentParams[ctrl.id]) : Number(ctrl.defaultValue ?? min);
                    return (
                      <div key={ctrl.id} className="slider-control-block" style={{ marginTop: 8 }}>
                        <div className="slider-label-above">
                          <Tooltip text={`${ctrl.label} (${min} to ${max}). ${ctrl.description || ''}`}>
                            <span>{ctrl.label}</span>
                          </Tooltip>
                        </div>
                        <div className="slider-track-input-row">
                          <Tooltip text={ctrl.description || ctrl.label} style={{ flex: 1, display: 'flex' }}>
                            <input
                              type="range"
                              className="control-slider"
                              min={min}
                              max={max}
                              step={step}
                              value={ctrlVal}
                              style={getSliderFill(ctrlVal, min, max)}
                              {...sliderPointerProps}
                              onChange={(e) => updateCurrentAlgoParam(ctrl.id, Number(e.target.value))}
                            />
                          </Tooltip>
                          <input
                            type="number"
                            className="control-num-input"
                            min={min}
                            max={max}
                            step={step}
                            value={ctrlVal}
                            onChange={(e) => updateCurrentAlgoParam(ctrl.id, parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
          {/* 2. ADJUSTMENTS SECTION */}
          <div className="section-block">
            <div 
              className="section-header section-header-clickable"
              onClick={() => toggleSection('adjustments')}
            >
              <div className="section-header-left">
                <span className="section-collapse-icon">{collapsedSections.adjustments ? '▶' : '▼'}</span>
                <span className="section-title-text">ADJUSTMENTS</span>
              </div>
            </div>

            {!collapsedSections.adjustments && (
              <div className="section-content">
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Tooltip text="Reset adjustments">
                    <button
                      className="btn-subtle"
                      onClick={resetAllAdjustments}
                    >
                      Reset
                    </button>
                  </Tooltip>
                </div>

                {/* Brightness */}
                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <Tooltip text="Brightness (-100 to +100). Double-click to reset.">
                      <span
                        onDoubleClick={() => resetAdjustmentParam('brightness')}
                        style={{ cursor: 'pointer' }}
                      >
                        Brightness
                      </span>
                    </Tooltip>
                  </div>
                  <div className="slider-track-input-row">
                    <Tooltip text="Double-click to reset to default" style={{ flex: 1, display: 'flex' }}>
                      <input
                        type="range"
                        className="control-slider"
                        min="-100"
                        max="100"
                        step="1"
                        value={brightness}
                        style={getSliderFill(brightness, -100, 100)}
                        {...sliderPointerProps}
                        onDoubleClick={() => resetAdjustmentParam('brightness')}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                      />
                    </Tooltip>
                    <input
                      type="number"
                      className="control-num-input"
                      min="-100"
                      max="100"
                      step="1"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* Contrast */}
                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <Tooltip text="Contrast (-100 to +100). Double-click to reset.">
                      <span
                        onDoubleClick={() => resetAdjustmentParam('contrast')}
                        style={{ cursor: 'pointer' }}
                      >
                        Contrast
                      </span>
                    </Tooltip>
                  </div>
                  <div className="slider-track-input-row">
                    <Tooltip text="Double-click to reset to default" style={{ flex: 1, display: 'flex' }}>
                      <input
                        type="range"
                        className="control-slider"
                        min="-100"
                        max="100"
                        step="1"
                        value={contrast}
                        style={getSliderFill(contrast, -100, 100)}
                        {...sliderPointerProps}
                        onDoubleClick={() => resetAdjustmentParam('contrast')}
                        onChange={(e) => setContrast(Number(e.target.value))}
                      />
                    </Tooltip>
                    <input
                      type="number"
                      className="control-num-input"
                      min="-100"
                      max="100"
                      step="1"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* Saturation */}
                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <Tooltip text="Saturation (-100 to +100). Double-click to reset.">
                      <span
                        onDoubleClick={() => resetAdjustmentParam('saturation')}
                        style={{ cursor: 'pointer' }}
                      >
                        Saturation
                      </span>
                    </Tooltip>
                  </div>
                  <div className="slider-track-input-row">
                    <Tooltip text="Double-click to reset to default" style={{ flex: 1, display: 'flex' }}>
                      <input
                        type="range"
                        className="control-slider"
                        min="-100"
                        max="100"
                        step="1"
                        value={saturation}
                        style={getSliderFill(saturation, -100, 100)}
                        {...sliderPointerProps}
                        onDoubleClick={() => resetAdjustmentParam('saturation')}
                        onChange={(e) => setSaturation(Number(e.target.value))}
                      />
                    </Tooltip>
                    <input
                      type="number"
                      className="control-num-input"
                      min="-100"
                      max="100"
                      step="1"
                      value={saturation}
                      onChange={(e) => setSaturation(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* Gamma */}
                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <Tooltip text="Gamma (0.10 to 3.00). Double-click to reset.">
                      <span
                        onDoubleClick={() => resetAdjustmentParam('gamma')}
                        style={{ cursor: 'pointer' }}
                      >
                        Gamma
                      </span>
                    </Tooltip>
                  </div>
                  <div className="slider-track-input-row">
                    <Tooltip text="Double-click to reset to default" style={{ flex: 1, display: 'flex' }}>
                      <input
                        type="range"
                        className="control-slider"
                        min="0.1"
                        max="3.0"
                        step="0.05"
                        value={gamma}
                        style={getSliderFill(gamma, 0.1, 3.0)}
                        {...sliderPointerProps}
                        onDoubleClick={() => resetAdjustmentParam('gamma')}
                        onChange={(e) => setGamma(Number(e.target.value))}
                      />
                    </Tooltip>
                    <input
                      type="number"
                      className="control-num-input"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      value={gamma}
                      onChange={(e) => setGamma(parseFloat(e.target.value) || 1.0)}
                    />
                  </div>
                </div>

                {/* Color Depth — Applies to Bit Crush / Bit-Tone / Supported Algos */}
                {(algorithmId === 'bit_crush' || algorithmId === 'bit-tone' || currentAlgo?.features?.supportsColorDepth) && (
                  <div className="slider-control-block">
                    <div className="slider-label-above">
                      <Tooltip text="Quantization steps for Bit Crush (1–32). Only applies to the Bit Crush algorithm.">
                        <span
                          onDoubleClick={() => resetAdjustmentParam('depth')}
                          style={{ cursor: 'pointer' }}
                        >
                          Color Depth
                        </span>
                      </Tooltip>
                    </div>
                    <div className="slider-track-input-row">
                      <Tooltip text="Quantization steps for Bit Crush (1–32). Only applies to the Bit Crush algorithm." style={{ flex: 1, display: 'flex' }}>
                        <input
                          type="range"
                          className="control-slider"
                          min="1"
                          max="32"
                          step="1"
                          value={depth}
                          {...sliderPointerProps}
                          onDoubleClick={() => resetAdjustmentParam('depth')}
                          onChange={(e) => setDepth(Number(e.target.value))}
                        />
                      </Tooltip>
                      <input
                        type="number"
                        className="control-num-input"
                        min="1"
                        max="32"
                        step="1"
                        value={depth}
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
            <div 
              className="section-header section-header-clickable"
              onClick={() => toggleSection('palette')}
            >
              <div className="section-header-left">
                <span className="section-collapse-icon">{collapsedSections.palette ? '▶' : '▼'}</span>
                <span className="section-title-text">PALETTE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                <Tooltip text="Shuffle swatches">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={(e) => { e.stopPropagation(); shuffleUnlockedSwatches(); }}
                    style={{ width: '22px', height: '22px' }}
                  >
                    <Shuffle size={14} />
                  </button>
                </Tooltip>
                <Tooltip text="Reset to built-in palette">
                  <button
                    type="button"
                    className="btn-subtle"
                    onClick={(e) => { e.stopPropagation(); handleResetPalette(); }}
                  >
                    Reset
                  </button>
                </Tooltip>
              </div>
            </div>

            {!collapsedSections.palette && (
              <div className="section-content" style={{ position: 'relative' }}>
                {isExtractingPalette && (
                  <LoadingScreen />
                )}
                {/* Built-in Dropdown */}
                <div className="picker-row">
                  <span className="picker-label">Built-in</span>
                  <div className="select-with-steppers">
                    <Tooltip text="Previous Palette">
                      <button className="stepper-btn" onClick={handlePrevPalette}>&lt;</button>
                    </Tooltip>
                    <Dropdown
                      className="palette-builtin-dropdown"
                      width="100%"
                      value={activePaletteId}
                      onChange={(palId) => setActivePaletteId(palId)}
                      tooltip="Choose built-in palette"
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
                    <Tooltip text="Next Palette">
                      <button className="stepper-btn" onClick={handleNextPalette}>&gt;</button>
                    </Tooltip>
                  </div>
                </div>

                {/* Swatch grid: 32x32px each, 4px gaps, wrapping naturally */}
                <div className="palette-swatches-grid">
                  {workingPalette.map((c: number[], i: number) => {
                    const isBeyondDepth = i >= paletteDepth;
                    const hex = rgbaToHex(c[0], c[1], c[2]).toUpperCase();
                    return (
                      <Tooltip key={i} text={`Swatch ${i + 1}: ${hex}`}>
                      <div
                        className="palette-swatch-item"
                        style={{
                          backgroundColor: `rgb(${c[0]}, ${c[1]}, ${c[2]})`,
                          opacity: isBeyondDepth ? 0.35 : 1
                        }}
                        onClick={() => setActiveSwatchIndex(activeSwatchIndex === i ? null : i)}
                      />
                    </Tooltip>
                    );
                  })}

                  {/* Add swatch button if < 32 */}
                  {workingPalette.length < 32 && (
                    <Tooltip text="Add color swatch (up to 32)">
                    <button
                      type="button"
                      className="palette-swatch-item"
                      onClick={addSwatch}
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
                  </Tooltip>
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
                        <Tooltip text={workingPalette.length <= 2 ? "Minimum 2 colors required" : "Delete Swatch"}>
                          <button
                            type="button"
                            className="btn-subtle palette-popover-btn"
                            disabled={workingPalette.length <= 2}
                            onClick={() => {
                              removeSwatch(activeSwatchIndex);
                              setActiveSwatchIndex(null);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                </div>

                {/* From Image Extraction Buttons */}
                <div className="palette-actions-block">
                  <span className="palette-actions-label">From Image</span>
                  <div className="palette-buttons-row">
                    <Tooltip text={!hasImage || !sourceImageData ? "Load an image first" : "Extract 8 colors using Median Cut"} style={{ flex: 1 }}>
                    <button
                      type="button"
                      className="palette-action-btn"
                      disabled={!hasImage || !sourceImageData}
                      onClick={handleExtractMedianCut}
                      style={{ width: '100%' }}
                    >
                      Median Cut
                    </button>
                  </Tooltip>
                    <Tooltip text={!hasImage || !sourceImageData ? "Load an image first" : "Extract 8 colors using K-Means clustering"} style={{ flex: 1 }}>
                    <button
                      type="button"
                      className="palette-action-btn"
                      disabled={!hasImage || !sourceImageData}
                      onClick={handleExtractKMeans}
                      style={{ width: '100%' }}
                    >
                      K-Means
                    </button>
                  </Tooltip>
                  </div>
                </div>

                {/* Depth Slider */}
                <div className="palette-depth-block">
                  <div className="slider-label-above">
                    <span>Palette Depth</span>
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
                  <Tooltip text="Import custom palette JSON" style={{ flex: 1 }}>
                  <button
                    type="button"
                    className="btn-default"
                    onClick={() => paletteFileInputRef.current?.click()}
                    style={{ width: '100%' }}
                  >
                    <ArrowDown size={14} /> Import
                  </button>
                </Tooltip>
                  <Tooltip text="Export current working palette to JSON" style={{ flex: 1 }}>
                  <button
                    type="button"
                    className="btn-default"
                    onClick={handleExportPalette}
                    style={{ width: '100%' }}
                  >
                    <ArrowUp size={14} /> Export
                  </button>
                </Tooltip>
                </div>
              </div>
            )}
          </div>

          {/* 4. EFFECTS STACK SECTION */}
          <div className="section-block">
            <div 
              className="section-header section-header-clickable"
              onClick={() => toggleSection('effects')}
            >
              <div className="section-header-left">
                <span className="section-collapse-icon">{collapsedSections.effects ? '▶' : '▼'}</span>
                <span className="section-title-text">EFFECTS STACK</span>
                <span className="section-counter-text">{effects.filter(e => e.enabled).length} active / {effects.length} total</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Tooltip text="Reset effect stack to default">
                  <button
                    type="button"
                    className="btn-subtle"
                    onClick={(e) => { e.stopPropagation(); handleResetEffects(); }}
                  >
                    <RotateCcw size={12} className="btn-icon" />
                    <span>Reset</span>
                  </button>
                </Tooltip>
              </div>
            </div>

            {!collapsedSections.effects && (
              <div className="section-content">
                {/* Collapsible Effects Dropdown */}
                <div className={`effects-dropdown ${isEffectsDropdownOpen ? 'open' : ''}`}>
                  <Tooltip text={isEffectsDropdownOpen ? "Collapse effects stack" : "Expand effects stack"} style={{ width: '100%', display: 'block' }}>
                    <div
                      className="effects-dropdown-header"
                      role="button"
                      tabIndex={0}
                      onClick={toggleEffectsDropdown}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleEffectsDropdown();
                        }
                      }}
                    >
                    <span className="effects-dropdown-icon">
                      <Layers size={14} strokeWidth={1.75} />
                    </span>
                    <div className="effects-dropdown-text">
                      {effects.filter(e => e.enabled).length > 0 ? (
                        <>
                          <span className="effects-dropdown-count">
                            {effects.filter(e => e.enabled).length} {effects.filter(e => e.enabled).length === 1 ? 'effect' : 'effects'} enabled
                          </span>
                          <span className="effects-dropdown-names">
                            ({effects.filter(e => e.enabled).map(e => e.name).join(', ')})
                          </span>
                        </>
                      ) : (
                        <span className="effects-dropdown-empty">No effects enabled</span>
                      )}
                    </div>
                    <span className="effects-dropdown-chevron">
                      <ChevronDown size={14} strokeWidth={1.75} />
                    </span>
                  </div>
                  </Tooltip>

                  {isEffectsDropdownOpen && (
                    <div className="effects-dropdown-panel">
                      {effects.map((eff, index) => {
                        const isExpanded = expandedEffectId === eff.id;
                        const meta = AVAILABLE_EFFECT_TYPES.find((m: any) => m.id === (eff.type || eff.id));
                        const defaultParams: Record<string, any> = meta ? (meta.defaultParams as any) : {};

                        return (
                          <div
                            key={eff.id}
                            className={`effect-item ${draggedEffectIndex === index ? 'dragging' : ''} ${dragOverEffectIndex === index ? 'drag-over' : ''}`}
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
                            {/* 36px row per effect */}
                            <div
                              className="effect-row"
                              role="button"
                              tabIndex={0}
                              onClick={() => setExpandedEffectId(isExpanded ? null : eff.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setExpandedEffectId(isExpanded ? null : eff.id);
                                }
                              }}
                            >
                              {/* Drag handle (dot grid) at left, 16px slot */}
                              <Tooltip text="Drag to reorder">
                                <span
                                  className="effect-row-drag"
                                  draggable
                                  tabIndex={0}
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
                                <svg
                                  width="8"
                                  height="14"
                                  viewBox="0 0 8 14"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <circle cx="1.5" cy="1.5" r="1.5" />
                                  <circle cx="6.5" cy="1.5" r="1.5" />
                                  <circle cx="1.5" cy="7" r="1.5" />
                                  <circle cx="6.5" cy="7" r="1.5" />
                                  <circle cx="1.5" cy="12.5" r="1.5" />
                                  <circle cx="6.5" cy="12.5" r="1.5" />
                                </svg>
                              </span>
                              </Tooltip>

                              {/* Toggle square */}
                              <Tooltip text={eff.enabled ? `Disable ${eff.name}` : `Enable ${eff.name}`}>
                                <button
                                  type="button"
                                  className={`effect-row-toggle ${eff.enabled ? 'enabled' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleEffectEnabled(eff.id);
                                  }}
                                >
                                <span className="effect-toggle-square" />
                                </button>
                              </Tooltip>

                              {/* Effect name */}
                              <span className={`effect-row-name ${!eff.enabled ? 'disabled' : ''}`}>
                                {eff.name}
                              </span>

                              {/* Chevron › on right (expands params inline, one at a time) */}
                              <span className={`effect-row-chevron ${isExpanded ? 'expanded' : ''}`}>
                                <ChevronRight size={14} strokeWidth={1.75} />
                              </span>
                            </div>

                            {/* Indented parameter panel below row */}
                            {isExpanded && (
                              <div className="effect-row-params">
                                {Object.keys(defaultParams).map((key) => {
                                  const val = eff.params[key] !== undefined ? eff.params[key] : defaultParams[key];

                                  // Shape segmented control
                                  if (key === 'shape' && typeof defaultParams[key] === 'string') {
                                    return (
                                      <div key={key} className="effect-param-row">
                                        <div className="effect-param-label">
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
                                  const decimals = step < 0.1 ? 2 : (step < 1 ? 1 : 0);
                                  const displayVal = typeof numVal === 'number'
                                    ? (Number.isInteger(numVal) ? numVal.toString() : parseFloat(numVal.toFixed(decimals)).toString())
                                    : String(val);


                                  return (
                                    <div key={key} className="effect-param-row">
                                      <div className="effect-param-label">
                                        <Tooltip text={`Double-click to reset ${labelText} to default (${defaultParams[key]})`}>
                                          <span
                                            onDoubleClick={() => updateEffectParam(eff.id, key, defaultParams[key])}
                                          >
                                            {labelText}
                                          </span>
                                        </Tooltip>
                                      </div>
                                      <div className="effect-param-control-row">
                                        <input
                                          type="range"
                                          className="effect-param-slider"
                                          min={min}
                                          max={max}
                                          step={step}
                                          value={numVal}
                                          style={getSliderFill(numVal, min, max)}
                                          {...sliderPointerProps}
                                          onDoubleClick={() => updateEffectParam(eff.id, key, defaultParams[key])}
                                          onChange={(e) => updateEffectParam(eff.id, key, Number(e.target.value))}
                                        />
                                        <div className="slider-value-box">
                                          <Tooltip text="Double-click slider to reset">
                                            <span
                                              className="slider-value-number"
                                            >
                                              {displayVal}
                                            </span>
                                          </Tooltip>
                                        </div>
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
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 5. PRESETS SECTION */}
          <div className="section-block">
            <div 
              className="section-header section-header-clickable"
              onClick={() => toggleSection('presets')}
            >
              <div className="section-header-left">
                <span className="section-collapse-icon">{collapsedSections.presets ? '▶' : '▼'}</span>
                <span className="section-title-text">PRESETS</span>
              </div>
            </div>

            {!collapsedSections.presets && (
              <div className="section-content presets-section-content">
                <div className="preset-row preset-dropdown-row">
                  <Dropdown
                    width="100%"
                    value={selectedPresetId}
                    placeholder="Built-in Presets..."
                    onChange={(id) => handleApplyPreset(id)}
                    tooltip="Select a built-in curated preset"
                    items={BUILTIN_PRESETS.map((p: any) => ({
                      id: p.id,
                      label: p.name,
                    }))}
                  />
                  <Tooltip text="Load selected preset">
                    <button 
                      className="btn-default" 
                      onClick={() => selectedPresetId && handleApplyPreset(selectedPresetId)}
                      disabled={!selectedPresetId}
                    >
                      Load
                    </button>
                  </Tooltip>
                </div>

                <div className="preset-row preset-save-row">
                  <Tooltip text="Save Preset (Coming in Phase 6)" style={{ width: '100%' }}>
                    <button
                      className="btn-default"
                      disabled
                      style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}
                    >
                      Save Preset
                    </button>
                  </Tooltip>
                </div>

                <div className="preset-row preset-reset-row">
                  <Tooltip text="Reset all settings to default" style={{ width: '100%' }}>
                    <button
                      className="btn-default"
                      onClick={resetAll}
                      style={{ width: '100%' }}
                    >
                      Reset to Default
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </aside>
  );
};

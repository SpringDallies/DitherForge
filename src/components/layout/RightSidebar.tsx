import { Logo } from '../common/Logo';
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { LoadingScreen } from '../common/LoadingScreen';
import { Dropdown } from '../common/Dropdown';
import { Tooltip } from '../common/Tooltip';
import { useAppStore } from '../../state/useAppStore';
import { useLenis } from '../../hooks/useLenis';
import { areAnimationsEnabled } from '../dialogs/SettingsDialog';
// Import frozen registries UNCHANGED
// @ts-ignore
import { ALGORITHM_REGISTRY } from '../../dither-engine/algorithms.js';
// @ts-ignore
import { BUILTIN_PALETTES, extractPaletteMedianCut, extractPaletteKMeans, hexToRgba, rgbaToHex } from '../../dither-engine/palettes.js';
// @ts-ignore
import { AVAILABLE_EFFECT_TYPES } from '../../dither-engine/effect-stack.js';
// @ts-ignore
import { exportRaster } from '../../dither-engine/exporters.js';
import { loadUserPresets, saveUserPresets } from '../../ui/presets.js';
import { 
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Layers,
  Sun,
  Moon,
  Plus,
  Check
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

// Pure RGB <-> HSL helpers for zero-lag custom HSL color picker
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h = ((h % 360) + 360) % 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c; gPrime = x; bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x; gPrime = c; bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0; gPrime = c; bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0; gPrime = x; bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x; gPrime = 0; bPrime = c;
  } else {
    rPrime = c; gPrime = 0; bPrime = x;
  }

  return [
    Math.max(0, Math.min(255, Math.round((rPrime + m) * 255))),
    Math.max(0, Math.min(255, Math.round((gPrime + m) * 255))),
    Math.max(0, Math.min(255, Math.round((bPrime + m) * 255)))
  ];
};

interface SwatchColorPickerPopoverProps {
  activeSwatchIndex: number;
  workingPalette: number[][];
  popoverLeftOffset: number;
  arrowLeftOffset: number;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  isClosing?: boolean;
  isOpening?: boolean;
  onUpdateColor: (idx: number, rgba: number[]) => void;
  onAddLighter: () => void;
  onAddDarker: () => void;
  onDelete: () => void;
  sliderPointerProps: {
    onPointerDown: (e: React.PointerEvent<HTMLInputElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLInputElement>) => void;
  };
}

const SwatchColorPickerPopover: React.FC<SwatchColorPickerPopoverProps> = ({
  activeSwatchIndex,
  workingPalette,
  popoverLeftOffset,
  arrowLeftOffset,
  popoverRef,
  isClosing = false,
  isOpening = false,
  onUpdateColor,
  onAddLighter,
  onAddDarker,
  onDelete,
  sliderPointerProps
}) => {
  const currentSwatch = workingPalette[activeSwatchIndex] || [255, 255, 255, 255];
  const initialHsl = useMemo(() => {
    return rgbToHsl(currentSwatch[0] ?? 255, currentSwatch[1] ?? 255, currentSwatch[2] ?? 255);
  }, [activeSwatchIndex]);

  const [localHsl, setLocalHsl] = useState<[number, number, number]>(initialHsl);
  const [copiedHex, setCopiedHex] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const animRef = useRef<number | null>(null);
  const prevIndexRef = useRef<number>(activeSwatchIndex);
  const currentHslRef = useRef<[number, number, number]>(initialHsl);
  const isDraggingLocalRef = useRef<boolean>(false);
  const lastEmittedRgbRef = useRef<[number, number, number]>([
    currentSwatch[0] ?? 255,
    currentSwatch[1] ?? 255,
    currentSwatch[2] ?? 255
  ]);

  useEffect(() => {
    const sw = workingPalette[activeSwatchIndex];
    if (!sw) return;

    // Check if store update is an echo of our own emitted RGB
    const isOurOwnUpdate =
      lastEmittedRgbRef.current[0] === sw[0] &&
      lastEmittedRgbRef.current[1] === sw[1] &&
      lastEmittedRgbRef.current[2] === sw[2];

    if (prevIndexRef.current === activeSwatchIndex) {
      if (isOurOwnUpdate || isDraggingLocalRef.current) {
        return;
      }
    }

    let targetHsl = rgbToHsl(sw[0] ?? 0, sw[1] ?? 0, sw[2] ?? 0);

    // If target color is achromatic (white, black, gray with S=0, L=0, or L=100),
    // Hue has no visual effect. Preserve existing Hue so H slider doesn't jump to 0!
    const isTargetAchromatic = targetHsl[1] === 0 || targetHsl[2] === 0 || targetHsl[2] === 100;
    if (isTargetAchromatic) {
      targetHsl = [currentHslRef.current[0], targetHsl[1], targetHsl[2]];
    }

    if (prevIndexRef.current !== activeSwatchIndex) {
      prevIndexRef.current = activeSwatchIndex;

      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }

      if (!areAnimationsEnabled()) {
        currentHslRef.current = targetHsl;
        setLocalHsl(targetHsl);
        return;
      }

      // Snappy swatch switch animation (160ms matching popover slide)
      const startHsl = [...currentHslRef.current] as [number, number, number];
      const startTime = performance.now();
      const duration = 160;

      // Linear distance along the slider track (no wrapping/teleportation across 0/360)
      const dH = targetHsl[0] - startHsl[0];
      const dS = targetHsl[1] - startHsl[1];
      const dL = targetHsl[2] - startHsl[2];

      const easeOutSnappy = (t: number) => 1 - Math.pow(1 - t, 3.5);

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const factor = easeOutSnappy(progress);

        if (progress >= 1) {
          animRef.current = null;
          currentHslRef.current = targetHsl;
          setLocalHsl(targetHsl);
        } else {
          const curH = Math.max(0, Math.min(360, Math.round(startHsl[0] + dH * factor)));
          const curS = Math.max(0, Math.min(100, Math.round(startHsl[1] + dS * factor)));
          const curL = Math.max(0, Math.min(100, Math.round(startHsl[2] + dL * factor)));
          const nextHsl: [number, number, number] = [curH, curS, curL];
          currentHslRef.current = nextHsl;
          setLocalHsl(nextHsl);
          animRef.current = requestAnimationFrame(step);
        }
      };

      animRef.current = requestAnimationFrame(step);
    } else {
      if (animRef.current === null) {
        currentHslRef.current = targetHsl;
        setLocalHsl(targetHsl);
      }
    }
  }, [activeSwatchIndex, workingPalette]);

  useEffect(() => {
    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, []);

  const handleSliderChange = (type: 'h' | 's' | 'l', val: number) => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    let [h, s, l] = currentHslRef.current;
    if (type === 'h') h = Math.max(0, Math.min(360, isNaN(val) ? 0 : val));
    if (type === 's') s = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    if (type === 'l') l = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));

    const nextHsl: [number, number, number] = [h, s, l];
    currentHslRef.current = nextHsl;
    setLocalHsl(nextHsl);

    const [r, g, b] = hslToRgb(h, s, l);
    lastEmittedRgbRef.current = [r, g, b];
    onUpdateColor(activeSwatchIndex, [r, g, b, 255]);
  };

  const handlePointerDownWithFlag = (e: React.PointerEvent<HTMLInputElement>) => {
    isDraggingLocalRef.current = true;
    setIsDragging(true);
    sliderPointerProps.onPointerDown(e);
  };

  const handlePointerUpWithFlag = (e: React.PointerEvent<HTMLInputElement>) => {
    isDraggingLocalRef.current = false;
    setIsDragging(false);
    sliderPointerProps.onPointerUp(e);
  };

  const safeHsl = localHsl || [0, 0, 100];
  const [pr, pg, pb] = hslToRgb(safeHsl[0] ?? 0, safeHsl[1] ?? 0, safeHsl[2] ?? 100);
  const localHex = rgbaToHex(pr, pg, pb).toUpperCase();
  const hexLum = (0.2126 * pr + 0.7152 * pg + 0.0722 * pb) / 255;
  const hexTextColor = hexLum > 0.48 ? '#333339' : '#DEDEDE';

  const popoverClassName = [
    'replica-callout-popover',
    isOpening ? 'opening' : '',
    isClosing ? 'closing' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={popoverRef}
      className={popoverClassName}
      style={{
        left: `${popoverLeftOffset}px`
      }}
    >
      {/* Callout Arrow pointing to active swatch */}
      <svg
        className="replica-callout-arrow"
        viewBox="0 0 16 9"
        style={{ left: `${arrowLeftOffset}px` }}
      >
        <path d="M0,9 L8,1 L16,9" fill="var(--bg-secondary)" stroke="var(--border-color)" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="0.5" y="8" width="15" height="2" fill="var(--bg-secondary)" stroke="none" />
      </svg>

      {/* Top Rectangular Color Preview Block */}
      <div
        className={`replica-swatch-preview-box ${isDragging ? 'is-dragging' : ''}`}
        style={{
          backgroundColor: `hsl(${safeHsl[0]}, ${safeHsl[1]}%, ${safeHsl[2]}%)`,
          borderRadius: '12px',
          border: 'none',
          boxShadow: 'none',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation();
          try {
            navigator.clipboard.writeText(localHex);
          } catch {}
          setCopiedHex(true);
          setTimeout(() => setCopiedHex(false), 1200);
        }}
        title="Click color to copy hex"
      >
        <span className="replica-swatch-hex-text" style={{ color: hexTextColor }}>
          {copiedHex ? 'COPIED!' : (localHex || '').replace('#', '')}
        </span>
      </div>

      {/* HSL Sliders */}
      <div className="replica-hsl-container">
        {/* H */}
        <div className="replica-hsl-row">
          <span className="replica-hsl-label">H</span>
          <input
            type="range"
            className="replica-hsl-slider hue-slider"
            min={0}
            max={360}
            step={1}
            value={safeHsl[0]}
            onPointerDown={handlePointerDownWithFlag}
            onPointerUp={handlePointerUpWithFlag}
            onDoubleClick={() => handleSliderChange('h', 0)}
            onChange={(e) => handleSliderChange('h', parseInt(e.target.value, 10))}
          />
          <span className="replica-hsl-val">{safeHsl[0]}°</span>
        </div>

        {/* S */}
        <div className="replica-hsl-row">
          <span className="replica-hsl-label">S</span>
          <input
            type="range"
            className="replica-hsl-slider sat-slider"
            min={0}
            max={100}
            step={1}
            value={safeHsl[1]}
            style={{
              background: `linear-gradient(to right, hsl(${safeHsl[0]}, 0%, 50%), hsl(${safeHsl[0]}, 100%, 50%))`
            }}
            onPointerDown={handlePointerDownWithFlag}
            onPointerUp={handlePointerUpWithFlag}
            onDoubleClick={() => handleSliderChange('s', 100)}
            onChange={(e) => handleSliderChange('s', parseInt(e.target.value, 10))}
          />
          <span className="replica-hsl-val">{safeHsl[1]}%</span>
        </div>

        {/* L */}
        <div className="replica-hsl-row">
          <span className="replica-hsl-label">L</span>
          <input
            type="range"
            className="replica-hsl-slider light-slider"
            min={0}
            max={100}
            step={1}
            value={safeHsl[2]}
            style={{
              background: `linear-gradient(to right, #000000, hsl(${safeHsl[0]}, ${safeHsl[1]}%, 50%), #ffffff)`
            }}
            onPointerDown={handlePointerDownWithFlag}
            onPointerUp={handlePointerUpWithFlag}
            onDoubleClick={() => handleSliderChange('l', 50)}
            onChange={(e) => handleSliderChange('l', parseInt(e.target.value, 10))}
          />
          <span className="replica-hsl-val">{safeHsl[2]}%</span>
        </div>
      </div>

      {/* Segmented 3-Button Toolbar Pill: Sun | Moon | Clear */}
      <div className="replica-popover-toolbar">
        <Tooltip text="Add 35% lighter swatch" style={{ flex: 1, height: '100%' }}>
          <button
            type="button"
            className="replica-popover-tool-btn"
            disabled={workingPalette.length >= 32}
            onClick={onAddLighter}
            aria-label="Add lighter swatch"
          >
            <Sun size={15} strokeWidth={2.2} />
          </button>
        </Tooltip>
        <div className="replica-popover-tool-divider" />
        <Tooltip text="Add 35% darker swatch" style={{ flex: 1, height: '100%' }}>
          <button
            type="button"
            className="replica-popover-tool-btn"
            disabled={workingPalette.length >= 32}
            onClick={onAddDarker}
            aria-label="Add darker swatch"
          >
            <Moon size={15} strokeWidth={2.2} />
          </button>
        </Tooltip>
        <div className="replica-popover-tool-divider" />
        <Tooltip text="Delete swatch" style={{ flex: 1, height: '100%' }}>
          <button
            type="button"
            className="replica-popover-tool-btn"
            disabled={workingPalette.length <= 2}
            onClick={onDelete}
            aria-label="Delete swatch"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
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
      try {
        const saved = localStorage.getItem('ditherforge_collapsed_sections');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      style: false,
      adjustments: false,
      palette: false,
      effects: false,
      presets: false
    };
  });

  const [userPresets, setUserPresets] = useState<any[]>(() => loadUserPresets());
  const [newPresetName, setNewPresetName] = useState('');
  const [isCreatePresetModalOpen, setIsCreatePresetModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  useLenis({ wrapper: scrollWrapperRef.current, content: scrollContentRef.current });

  // App store selectors
  const algorithmId = useAppStore((state) => state.algorithmId);
  const setAlgorithmId = useAppStore((state) => state.setAlgorithmId);
  const algoParams = useAppStore((state) => state.algoParams);
  const updateCurrentAlgoParam = useAppStore((state) => state.updateCurrentAlgoParam);
  const resetCurrentAlgoParams = useAppStore((state) => state.resetCurrentAlgoParams);
  const resetAlgoParamToDefault = useAppStore((state) => state.resetAlgoParamToDefault);

  const setIsDraggingSlider = useAppStore((state) => state.setIsDraggingSlider);

  // Adjustments & Locks
  const brightness = useAppStore((state) => state.brightness);
  const contrast = useAppStore((state) => state.contrast);
  const saturation = useAppStore((state) => state.saturation);
  const hue = useAppStore((state) => state.hue);
  const gamma = useAppStore((state) => state.gamma);
  const depth = useAppStore((state) => state.depth);
  const setBrightness = useAppStore((state) => state.setBrightness);
  const setContrast = useAppStore((state) => state.setContrast);
  const setSaturation = useAppStore((state) => state.setSaturation);
  const setHue = useAppStore((state) => state.setHue);
  const setGamma = useAppStore((state) => state.setGamma);
  const setDepth = useAppStore((state) => state.setDepth);

  const resetAdjustmentParam = useAppStore((state) => state.resetAdjustmentParam);
  const resetAllAdjustments = useAppStore((state) => state.resetAllAdjustments);
  const resetEffects = useAppStore((state) => state.resetEffects);

  // Palette & Effects & Reset
  const activePaletteId = useAppStore((state) => state.activePaletteId);
  const setActivePaletteId = useAppStore((state) => state.setActivePaletteId);
  const workingPalette = useAppStore((state) => state.workingPalette);
  const paletteDepth = useAppStore((state) => state.paletteDepth);
  const updateSwatchColor = useAppStore((state) => state.updateSwatchColor);
  const addSwatch = useAppStore((state) => state.addSwatch);
  const removeSwatch = useAppStore((state) => state.removeSwatch);
  const setPaletteDepth = useAppStore((state) => state.setPaletteDepth);
  const resetToBuiltin = useAppStore((state) => state.resetToBuiltin);
  const savedPalettes = useAppStore((state) => state.savedPalettes);
  const saveCurrentPaletteLocally = useAppStore((state) => state.saveCurrentPaletteLocally);
  const deleteCustomPalette = useAppStore((state) => state.deleteCustomPalette);
  const addAdjustedSwatch = useAppStore((state) => state.addAdjustedSwatch);
  const invertPalette = useAppStore((state) => state.invertPalette);
  const flipPalette = useAppStore((state) => state.flipPalette);
  const imageFileName = useAppStore((state) => state.imageFileName);
  const sourceImageData = useAppStore((state) => state.sourceImageData);
  const hasImage = useAppStore((state) => state.hasImage);

  const effects = useAppStore((state) => state.effects);
  const toggleEffectEnabled = useAppStore((state) => state.toggleEffectEnabled);
  const reorderEffects = useAppStore((state) => state.reorderEffects);
  const updateEffectParam = useAppStore((state) => state.updateEffectParam);
  const loadImageFromData = useAppStore((state) => state.loadImageFromData);
  const fitToViewport = useAppStore((state) => state.fitToViewport);

  // Local state for Swatch editing popover
  // Local state for Effects section (Phase 5)
  const [isExtractingPalette, setIsExtractingPalette] = useState<boolean>(false);
  const [expandedEffectId, setExpandedEffectId] = useState<string | null>('glow');
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

  const [activeSwatchIndex, setActiveSwatchIndex] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const sw = new URLSearchParams(window.location.search).get('swatch');
      if (sw !== null) return parseInt(sw, 10);
    }
    return null;
  });
  const [isClosingPopover, setIsClosingPopover] = useState<boolean>(false);
  const [isOpeningPopover, setIsOpeningPopover] = useState<boolean>(false);
  const popoverCloseTimerRef = useRef<number | null>(null);
  const popoverOpenTimerRef = useRef<number | null>(null);
  const colorPickerTimerRef = useRef<number | null>(null);
  const [isSavePaletteModalOpen, setIsSavePaletteModalOpen] = useState<boolean>(false);
  const [newPaletteName, setNewPaletteName] = useState<string>('My Custom Palette');
  const popoverRef = useRef<HTMLDivElement>(null);
  const paletteFileInputRef = useRef<HTMLInputElement>(null);
  const swatchesPillRef = useRef<HTMLDivElement>(null);
  const [popoverLeftOffset, setPopoverLeftOffset] = useState<number>(0);
  const [arrowLeftOffset, setArrowLeftOffset] = useState<number>(110);

  const miscWrapperRef = useRef<HTMLDivElement>(null);
  const miscCloseTimerRef = useRef<number | null>(null);
  const [activeMiscOption, setActiveMiscOption] = useState<'Inverse Palette' | 'Flip Palette'>('Inverse Palette');
  // Palette transforms are owned by the store so the checkboxes, the image and
  // a reloaded page all agree on the same state.
  const isPaletteInverted = useAppStore((state) => state.paletteInverted);
  const isPaletteFlipped = useAppStore((state) => state.paletteFlipped);
  const [isMiscClosing, setIsMiscClosing] = useState<boolean>(false);

  // Sync activeSwatchIndex within bounds if workingPalette length changes
  useEffect(() => {
    if (activeSwatchIndex !== null) {
      const pal = useAppStore.getState().workingPalette;
      if (activeSwatchIndex >= pal.length) {
        setActiveSwatchIndex(pal.length > 0 ? pal.length - 1 : null);
      }
    }
  }, [activeSwatchIndex, workingPalette.length]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (colorPickerTimerRef.current !== null) {
        window.clearTimeout(colorPickerTimerRef.current);
      }
      if (popoverCloseTimerRef.current !== null) {
        window.clearTimeout(popoverCloseTimerRef.current);
      }
      if (popoverOpenTimerRef.current !== null) {
        window.clearTimeout(popoverOpenTimerRef.current);
      }
    };
  }, []);

  const commitDebouncedSwatchColor = useCallback((idx: number, rgba: number[]) => {
    if (colorPickerTimerRef.current !== null) {
      window.clearTimeout(colorPickerTimerRef.current);
    }
    colorPickerTimerRef.current = window.setTimeout(() => {
      updateSwatchColor(idx, rgba);
      colorPickerTimerRef.current = null;
    }, 16);
  }, [updateSwatchColor]);

  const allPaletteDropdownItems = useMemo(() => {
    const list: { id: string; label: string; hint?: string; onDelete?: (e: React.MouseEvent) => void }[] = [];
    if (activePaletteId === 'custom') {
      list.push({ id: 'custom', label: 'Custom Palette', hint: `${workingPalette.length} Colours` });
    }
    savedPalettes.forEach((p) => {
      list.push({
        id: p.id,
        label: p.name,
        hint: `${p.colors.length} Colours`,
        onDelete: (e) => {
          e.stopPropagation();
          deleteCustomPalette(p.id);
        }
      });
    });
    BUILTIN_PALETTES.forEach((p: any) => {
      list.push({ id: p.id, label: p.name, hint: `${p.colors.length} Colours` });
    });
    return list;
  }, [activePaletteId, savedPalettes, workingPalette.length, deleteCustomPalette]);

  // Task 11: Consolidate inverse_glow & inverse_vignette into a toggle inside glow & vignette
  const visibleEffectsList = useMemo(
    () => effects.filter((e) => e.id !== 'inverse_glow' && e.id !== 'inverse_vignette'),
    [effects]
  );

  const sidebarWidth = useAppStore((state) => state.sidebarWidth);
  const setSidebarWidth = useAppStore((state) => state.setSidebarWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== e.pointerId) return;
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.max(320, Math.min(700, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== e.pointerId) return;
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {}
      setIsResizing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

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

  const handlePrevAlgo = useCallback(() => {
    if (filteredAlgos.length === 0) return;
    const prevIdx = (currentIndex - 1 + filteredAlgos.length) % filteredAlgos.length;
    setAlgorithmId(filteredAlgos[prevIdx].id);
  }, [filteredAlgos, currentIndex, setAlgorithmId]);

  // Custom listbox state for Algorithm picker (Bug 1 quality fix)
  const activeDropdownId = useAppStore((state) => state.activeDropdownId);
  const setActiveDropdownId = useAppStore((state) => state.setActiveDropdownId);
  const isAlgoListboxOpen = activeDropdownId === 'algo-listbox';

  const [isAlgoListboxClosing, setIsAlgoListboxClosing] = useState(false);
  const algoCloseTimerRef = useRef<number | null>(null);

  const openAlgoListbox = () => {
    if (algoCloseTimerRef.current) {
      clearTimeout(algoCloseTimerRef.current);
      algoCloseTimerRef.current = null;
    }
    setIsAlgoListboxClosing(false);
    setActiveDropdownId('algo-listbox');
  };

  const closeAlgoListbox = (immediate = false) => {
    if (algoCloseTimerRef.current) {
      clearTimeout(algoCloseTimerRef.current);
      algoCloseTimerRef.current = null;
    }
    if (activeDropdownId === 'algo-listbox') {
      setActiveDropdownId(null);
    }
    if (immediate || !areAnimationsEnabled() || (!isAlgoListboxOpen && !isAlgoListboxClosing)) {
      setIsAlgoListboxClosing(false);
      return;
    }
    setIsAlgoListboxClosing(true);
    algoCloseTimerRef.current = window.setTimeout(() => {
      setIsAlgoListboxClosing(false);
      algoCloseTimerRef.current = null;
    }, 110);
  };

  // If another dropdown opens anywhere in the app, cancel closing and unmount immediately (no overlap!)
  useEffect(() => {
    if (activeDropdownId !== null && activeDropdownId !== 'algo-listbox') {
      if (algoCloseTimerRef.current) {
        clearTimeout(algoCloseTimerRef.current);
        algoCloseTimerRef.current = null;
      }
      setIsAlgoListboxClosing(false);
    }
  }, [activeDropdownId]);

  useEffect(() => {
    return () => {
      if (algoCloseTimerRef.current) clearTimeout(algoCloseTimerRef.current);
    };
  }, []);

  const [focusedAlgoIndex, setFocusedAlgoIndex] = useState(0);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside listener for listbox
  useEffect(() => {
    if (!isAlgoListboxOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (listboxRef.current && !listboxRef.current.contains(e.target as Node)) {
        const isClickingOtherDropdown = (e.target as HTMLElement)?.closest?.(
          '.custom-dropdown-container, .algo-listbox-container, .menu-dropdowns'
        );
        closeAlgoListbox(Boolean(isClickingOtherDropdown));
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isAlgoListboxOpen, activeDropdownId]);

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

  // Position the list so the picked algorithm is the first row you see.
  // Runs in a layout effect so the scroll lands before the browser paints:
  // no frame ever shows the top of the list first. Item height is fixed
  // (38px), so this is reliable even while the panel animates open.
  useLayoutEffect(() => {
    if (!isAlgoListboxOpen) return;
    const scroller = listboxPanelRef.current?.querySelector('.algo-listbox-items') as HTMLElement | null;
    if (!scroller) return;
    const items = Array.from(scroller.querySelectorAll('.algo-listbox-item')) as HTMLElement[];
    const selected = scroller.querySelector('[role="option"][aria-selected="true"]') as HTMLElement | null;
    if (!selected) return;
    const itemHeight = selected.offsetHeight || 38;
    const index = items.indexOf(selected);
    scroller.scrollTop = index > 0 ? index * itemHeight : 0;
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
      closeAlgoListbox();
    } else if (e.key === 'Enter') {
      if (searchFilteredAlgos.length > 0) {
        e.preventDefault();
        setAlgorithmId(searchFilteredAlgos[0].id);
        closeAlgoListbox();
      }
    }
  };

  const handleListboxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isAlgoListboxOpen) {
        openAlgoListbox();
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
        openAlgoListbox();
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
          closeAlgoListbox();
        }
      } else if (e.key === 'Enter') {
        openAlgoListbox();
      }
    } else if (e.key === 'Escape') {
      if (isAlgoListboxOpen) {
        e.preventDefault();
        closeAlgoListbox();
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
  }, [isAlgoListboxOpen, handlePrevAlgo, handleNextAlgo]);

  // Compute arrow and popover horizontal alignment based on clicked swatch segment
  const calculatePopoverPosition = useCallback((index: number) => {
    const pill = swatchesPillRef.current;
    if (!pill || !pill.children[index]) return;
    const pillRect = pill.getBoundingClientRect();
    const segRect = (pill.children[index] as HTMLElement).getBoundingClientRect();
    const segCenter = segRect.left + segRect.width / 2 - pillRect.left;
    const popoverWidth = 220;
    const left = Math.max(0, Math.min(pillRect.width - popoverWidth, segCenter - popoverWidth / 2));
    const arrowLeft = Math.max(16, Math.min(popoverWidth - 16, segCenter - left));
    setPopoverLeftOffset(left);
    setArrowLeftOffset(arrowLeft);
  }, []);

  const closeColorPicker = useCallback((immediate = false) => {
    if (popoverCloseTimerRef.current) {
      clearTimeout(popoverCloseTimerRef.current);
      popoverCloseTimerRef.current = null;
    }
    if (popoverOpenTimerRef.current) {
      clearTimeout(popoverOpenTimerRef.current);
      popoverOpenTimerRef.current = null;
      setIsOpeningPopover(false);
    }
    if (immediate || !areAnimationsEnabled()) {
      setIsClosingPopover(false);
      setIsOpeningPopover(false);
      setActiveSwatchIndex(null);
      return;
    }
    setIsClosingPopover(true);
    popoverCloseTimerRef.current = window.setTimeout(() => {
      setIsClosingPopover(false);
      setIsOpeningPopover(false);
      setActiveSwatchIndex(null);
      popoverCloseTimerRef.current = null;
    }, 120);
  }, []);

  const openColorPicker = useCallback((index: number) => {
    if (popoverCloseTimerRef.current) {
      clearTimeout(popoverCloseTimerRef.current);
      popoverCloseTimerRef.current = null;
      setIsClosingPopover(false);
    }
    const wasClosed = activeSwatchIndex === null || isClosingPopover;
    calculatePopoverPosition(index);
    setActiveSwatchIndex(index);
    if (wasClosed) {
      if (areAnimationsEnabled()) {
        setIsOpeningPopover(true);
        if (popoverOpenTimerRef.current) clearTimeout(popoverOpenTimerRef.current);
        popoverOpenTimerRef.current = window.setTimeout(() => {
          setIsOpeningPopover(false);
          popoverOpenTimerRef.current = null;
        }, 140);
      } else {
        setIsOpeningPopover(false);
      }
    }
  }, [activeSwatchIndex, isClosingPopover, calculatePopoverPosition]);

  const handlePrevPalette = useCallback(() => {
    if (allPaletteDropdownItems.length === 0) return;
    const idx = allPaletteDropdownItems.findIndex((p) => p.id === activePaletteId);
    const prev = idx <= 0 ? allPaletteDropdownItems.length - 1 : idx - 1;
    closeColorPicker(true);
    setActivePaletteId(allPaletteDropdownItems[prev].id);
  }, [allPaletteDropdownItems, activePaletteId, setActivePaletteId, closeColorPicker]);

  const handleNextPalette = useCallback(() => {
    if (allPaletteDropdownItems.length === 0) return;
    const idx = allPaletteDropdownItems.findIndex((p) => p.id === activePaletteId);
    const next = (idx + 1) % allPaletteDropdownItems.length;
    closeColorPicker(true);
    setActivePaletteId(allPaletteDropdownItems[next].id);
  }, [allPaletteDropdownItems, activePaletteId, setActivePaletteId, closeColorPicker]);

  // Misc Palette Options Dropdown state
  const isMiscOpen = activeDropdownId === 'palette-misc-dropdown';

  const openMiscDropdown = useCallback(() => {
    if (miscCloseTimerRef.current) {
      clearTimeout(miscCloseTimerRef.current);
      miscCloseTimerRef.current = null;
    }
    setIsMiscClosing(false);
    setActiveDropdownId('palette-misc-dropdown');
  }, [setActiveDropdownId]);

  const closeMiscDropdown = useCallback((immediate = false) => {
    if (miscCloseTimerRef.current) {
      clearTimeout(miscCloseTimerRef.current);
      miscCloseTimerRef.current = null;
    }
    if (activeDropdownId === 'palette-misc-dropdown') {
      setActiveDropdownId(null);
    }
    if (immediate || !areAnimationsEnabled() || (!isMiscOpen && !isMiscClosing)) {
      setIsMiscClosing(false);
      return;
    }
    setIsMiscClosing(true);
    miscCloseTimerRef.current = window.setTimeout(() => {
      setIsMiscClosing(false);
      miscCloseTimerRef.current = null;
    }, 110);
  }, [activeDropdownId, isMiscOpen, isMiscClosing, setActiveDropdownId]);

  useEffect(() => {
    if (activeDropdownId !== null && activeDropdownId !== 'palette-misc-dropdown') {
      if (miscCloseTimerRef.current) {
        clearTimeout(miscCloseTimerRef.current);
        miscCloseTimerRef.current = null;
      }
      setIsMiscClosing(false);
    }
  }, [activeDropdownId]);

  useEffect(() => {
    return () => {
      if (miscCloseTimerRef.current) clearTimeout(miscCloseTimerRef.current);
    };
  }, []);

  // Click outside listener for Misc dropdown
  useEffect(() => {
    if (!isMiscOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (miscWrapperRef.current && !miscWrapperRef.current.contains(e.target as Node)) {
        const isClickingOtherDropdown = (e.target as HTMLElement)?.closest?.(
          '.custom-dropdown-container, .algo-listbox-container, .menu-dropdowns, .replica-picker-box'
        );
        closeMiscDropdown(Boolean(isClickingOtherDropdown));
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isMiscOpen, closeMiscDropdown]);

  useLayoutEffect(() => {
    if (activeSwatchIndex === null) return;
    calculatePopoverPosition(activeSwatchIndex);
  }, [activeSwatchIndex, workingPalette.length, sidebarWidth, calculatePopoverPosition]);

  useEffect(() => {
    if (activeSwatchIndex === null) return;
    const handleResize = () => {
      calculatePopoverPosition(activeSwatchIndex);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeSwatchIndex, calculatePopoverPosition]);

  const handleSwatchClick = useCallback((i: number) => {
    if (activeSwatchIndex === i && !isClosingPopover) {
      closeColorPicker();
      return;
    }
    openColorPicker(i);
  }, [activeSwatchIndex, isClosingPopover, closeColorPicker, openColorPicker]);

  // Close active swatch popover when clicking outside or on Escape; navigate swatches with Left/Right arrows
  useEffect(() => {
    if (activeSwatchIndex === null && !isClosingPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (swatchesPillRef.current && swatchesPillRef.current.contains(target)) return;
      if (target.closest('.replica-swatch-segment') || target.closest('.palette-swatch-item') || target.closest('.replica-swatch-add-btn')) return;
      closeColorPicker();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeColorPicker();
      } else if (e.key === 'ArrowLeft') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setActiveSwatchIndex((prev) => {
          if (prev !== null && prev > 0) {
            const nextIdx = prev - 1;
            calculatePopoverPosition(nextIdx);
            return nextIdx;
          }
          return prev;
        });
      } else if (e.key === 'ArrowRight') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setActiveSwatchIndex((prev) => {
          if (prev !== null && prev < workingPalette.length - 1) {
            const nextIdx = prev + 1;
            calculatePopoverPosition(nextIdx);
            return nextIdx;
          }
          return prev;
        });
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [activeSwatchIndex, isClosingPopover, workingPalette.length, closeColorPicker, calculatePopoverPosition]);

  useEffect(() => {
    if (activeDropdownId !== null) {
      closeColorPicker(true);
    }
  }, [activeDropdownId, closeColorPicker]);

  const handleAddLighterSwatch = () => {
    if (activeSwatchIndex === null || workingPalette.length >= 32) return;
    if (colorPickerTimerRef.current !== null) {
      window.clearTimeout(colorPickerTimerRef.current);
      colorPickerTimerRef.current = null;
    }
    addAdjustedSwatch(activeSwatchIndex, 0.35);
    const updated = useAppStore.getState().workingPalette;
    const newIdx = updated.length - 1;
    openColorPicker(newIdx);
  };

  const handleAddDarkerSwatch = () => {
    if (activeSwatchIndex === null || workingPalette.length >= 32) return;
    if (colorPickerTimerRef.current !== null) {
      window.clearTimeout(colorPickerTimerRef.current);
      colorPickerTimerRef.current = null;
    }
    addAdjustedSwatch(activeSwatchIndex, -0.35);
    const updated = useAppStore.getState().workingPalette;
    const newIdx = updated.length - 1;
    openColorPicker(newIdx);
  };

  const handleDeleteCurrentSwatch = () => {
    if (activeSwatchIndex === null || workingPalette.length <= 2) return;
    removeSwatch(activeSwatchIndex);
    closeColorPicker(true);
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
          console.warn('Invalid palette file format');
        }
      } catch (err) {
        console.warn('Failed to parse palette file', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExtractMedianCut = () => {
    if (!sourceImageData) return;
    closeColorPicker(true);
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
    closeColorPicker(true);
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

    // Hide global Pattern Scale if the algorithm already provides its own dedicated size/spacing/frequency slider
    const DEDICATED_SCALE_CONTROLS = [
      'dotSize',
      'blockSize',
      'checkersSize',
      'lineSpacing',
      'period',
      'dotScale',
      'cellSize',
      'divisor',
      'lineDensity',
      'waveFrequency',
      'modulationFrequency',
      'frequency',
      'waveDensity'
    ];
    const hasDedicatedScaleControl = Boolean(
      algo.controls?.some((c: any) => DEDICATED_SCALE_CONTROLS.includes(c.id))
    );
    const supportsScale =
      algo.features?.supportsDpiScale !== false &&
      norm !== 'color-separation' &&
      !hasDedicatedScaleControl;

    const isErrorDiff = algo.category === 'error_diffusion';
    const isGlitch = algo.category === 'glitch_effects';
    const nonDiffGlitch = ['artifact-modulation-glitch', 'glitch', 'ordered-modulation'].includes(norm);
    const orbDiffusion = ['orb-diffuse', 'orb-diffuse-x', 'orb-diffuse-y'].includes(norm);
    const fixedScanErrorDiff = [
      'cracked-diffuse',
      'fractal-diffuse',
      'gaussian',
      'vortex-diffusion'
    ].includes(norm);

    const hasErrorStrength =
      isErrorDiff ||
      (isGlitch && !nonDiffGlitch) ||
      orbDiffusion ||
      Boolean(algo.controls?.some((c: any) => ['errorStrength', 'errorReduction', 'strength'].includes(c.id)));

    const hasSerpentine =
      (isErrorDiff && !fixedScanErrorDiff) ||
      Boolean(algo.controls?.some((c: any) => c.id === 'serpentine'));

    const hasNoise =
      Boolean(algo.controls?.some((c: any) => c.id === 'noise' || c.id === 'randomVal')) ||
      norm === 'noise';

    const hasColorDepth = Boolean(
      norm === 'bit_crush' ||
      (algo.features?.supportsColorDepth && algo.controls?.some((c: any) => c.id === 'depth' || c.id === 'colorDepth'))
    );

    return {
      threshold: algo.features?.supportsLuminanceThreshold !== false && norm !== 'color-separation',
      scale: supportsScale,
      diffusionStrength: hasErrorStrength,
      serpentine: hasSerpentine,
      noiseAmount: hasNoise,
      colorDepth: hasColorDepth
    };
  };

  const visibleParams = getVisibleParams(currentAlgo.id);
  const hasAnyVisibleStyles =
    visibleParams.threshold ||
    visibleParams.scale ||
    visibleParams.diffusionStrength ||
    visibleParams.serpentine ||
    visibleParams.noiseAmount ||
    visibleParams.colorDepth ||
    Boolean(currentAlgo.controls && currentAlgo.controls.length > 0);

  // Per-algorithm parameters
  const currentParams = algoParams[algorithmId] ?? {
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 1.0,
    serpentine: false,
    noiseAmount: 0.3
  };

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
          const canvasArea = document.querySelector('.canvas-area');
          if (canvasArea) {
            fitToViewport(canvasArea.clientWidth, canvasArea.clientHeight);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  return (
    <aside 
      className={`right-sidebar ${isResizing ? 'is-resizing' : ''}`} 
      style={{ width: `${sidebarWidth}px` }}
    >
      <div 
        className={`sidebar-resize-handle ${isResizing ? 'resizing' : ''}`}
        onPointerDown={handleResizePointerDown}
        title="Drag left/right to resize panel"
      />
      <div ref={scrollWrapperRef} className="sidebar-scrollable-content">
        <div ref={scrollContentRef}>
        {/* TOP ACTION BLOCK */}
        <div className="top-action-block">
          <div className="sidebar-brand">
            <Logo variant="mark" size={210} />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div className="unified-action-pill">
            <button
              type="button"
              className="unified-pill-btn"
              onClick={handleOpenImage}
            >
              Open Image
            </button>
            <div className="unified-pill-divider" />
            <button
              type="button"
              className="unified-pill-btn"
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
            <button
              type="button"
              id="export-format-toggle"
              className="export-format-toggle"
              title="Click to switch export format"
              aria-label={`Export format: ${exportFormat}. Click to change.`}
              onClick={() => {
                const order = ['PNG', 'JPEG', 'WEBP'] as const;
                const idx = order.findIndex((f) => f === exportFormat);
                setExportFormat(order[(idx + 1) % order.length]);
              }}
            >
              {exportFormat}
            </button>
          </div>
          {exportFormat === 'JPEG' && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
              JPG flattens transparency to black.
            </div>
          )}
        </div>

        {/* SECTIONS STACK */}
        <div className="sections-container">
          {/* 1. STYLE SECTION */}
          <div className="section-block">
            <div className="section-header">
              <span className="section-title-text">Styles</span>
              <button
                type="button"
                className="card-reset-icon-btn"
                title="Reset styles"
                aria-label="Reset styles"
                onClick={() => { resetCurrentAlgoParams(); setActiveCategory('all'); }}
              >
                <RotateCcw size={17} strokeWidth={2.2} />
              </button>
            </div>

            {!collapsedSections.style && (
              <div className="section-content section-card">
                {/* Category Row */}
                <div className="picker-row-inline">
                  <span className="picker-label-inline">Category</span>
                  <div className="picker-box-with-steppers">
                    <Dropdown
                      id="style-category-dropdown"
                      className="category-dropdown borderless-dropdown"
                      width="100%"
                      value={activeCategory}
                      onChange={(catId) => setActiveCategory(catId)}
                      items={categoryDropdownItems}
                    />
                    <div className="inline-stepper-cluster">
                      <button type="button" className="inline-stepper-btn" onClick={handlePrevCategory} aria-label="Previous Category">
                        <ChevronLeft size={14} strokeWidth={2.2} />
                      </button>
                      <div className="inline-stepper-sep" />
                      <button type="button" className="inline-stepper-btn" onClick={handleNextCategory} aria-label="Next Category">
                        <ChevronRight size={14} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Algorithm Row */}
                <div className="picker-row-inline">
                  <span className="picker-label-inline">Algorithm</span>
                  <div className="picker-box-with-steppers">
                    <div className="algo-listbox-container" ref={listboxRef}>
                      <button
                        type="button"
                        className={`algo-listbox-trigger borderless-trigger ${isAlgoListboxOpen && !isAlgoListboxClosing ? 'open' : ''}`}
                        onClick={() => {
                          if (isAlgoListboxOpen && !isAlgoListboxClosing) {
                            closeAlgoListbox();
                          } else {
                            openAlgoListbox();
                          }
                        }}
                        onKeyDown={handleListboxKeyDown}
                        aria-haspopup="listbox"
                        aria-expanded={isAlgoListboxOpen && !isAlgoListboxClosing}
                      >
                        <span className="algo-listbox-label">
                          {currentAlgo.name}
                        </span>
                      </button>
                      {(isAlgoListboxOpen || isAlgoListboxClosing) && (
                        <div
                          className={`algo-listbox-panel ${isAlgoListboxClosing ? 'closing' : ''}`}
                          role="listbox"
                          ref={listboxPanelRef}
                          onWheel={(e) => e.stopPropagation()}
                          data-lenis-prevent-wheel
                        >
                          {/* Search Input Box */}
                          <div className="algo-search-container">
                            <input
                              ref={searchInputRef}
                              type="text"
                              className="algo-search-input"
                              placeholder={`Search ${ALGORITHM_REGISTRY.length} Algorithms`}
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={handleSearchKeyDown}
                              tabIndex={isAlgoListboxOpen ? 0 : -1}
                            />
                          </div>

                          {/* Category / All Header */}
                          <div 
                            className="algo-dropdown-category-header"
                            onClick={() => handleNextCategory()}
                            role="button"
                            tabIndex={0}
                            title="Click to cycle categories"
                          >
                            <span className="algo-dropdown-category-title">
                              {activeCategory === 'all' ? 'All' : (categoryDropdownItems.find(c => c.id === activeCategory)?.label?.split(' (')[0] || 'All')}
                            </span>
                            <ChevronDown size={16} strokeWidth={2.4} className="algo-dropdown-category-chevron" />
                          </div>

                          {/* Scrollable Items List Box Card */}
                          <div className="algo-listbox-card">
                            <div className="algo-listbox-items" tabIndex={-1} onKeyDown={handleListboxKeyDown} data-lenis-prevent>
                              {searchFilteredAlgos.map((a: any) => {
                                return (
                                  <div
                                    key={a.id}
                                    role="option"
                                    tabIndex={-1}
                                    aria-selected={a.id === algorithmId}
                                    className="algo-listbox-item"
                                    onClick={() => {
                                      setAlgorithmId(a.id);
                                      closeAlgoListbox();
                                    }}
                                  >
                                    <span className="algo-listbox-item-name">{a.name}</span>
                                  </div>
                                );
                              })}
                              {searchFilteredAlgos.length === 0 && (
                                <div style={{ padding: '14px', fontSize: '0.85rem', color: 'var(--text-main)', textAlign: 'center', fontWeight: 600 }}>
                                  No algorithms found
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="inline-stepper-cluster">
                      <button type="button" className="inline-stepper-btn" onClick={handlePrevAlgo} aria-label="Previous Algorithm">
                        <ChevronLeft size={14} strokeWidth={2.2} />
                      </button>
                      <div className="inline-stepper-sep" />
                      <button type="button" className="inline-stepper-btn" onClick={handleNextAlgo} aria-label="Next Algorithm">
                        <ChevronRight size={14} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progressive Parameters */}
                {hasAnyVisibleStyles && <div className="card-inner-divider" />}

                {visibleParams.colorDepth && (
                  <div className="slider-control-block">
                    <div className="slider-label-above">
                      <Tooltip text="Color Depth (1 to 32 bits). Double-click to reset.">
                        <span
                          onDoubleClick={() => resetAdjustmentParam('depth')}
                          style={{ cursor: 'pointer' }}
                        >
                          Color Depth
                        </span>
                      </Tooltip>
                    </div>
                    <div className="slider-track-input-row">
                      <Tooltip text="Double-click to reset to default" style={{ flex: 1, display: 'flex' }}>
                        <input
                          type="range"
                          className="control-slider"
                          min="1"
                          max="32"
                          step="1"
                          value={depth}
                          style={getSliderFill(depth, 1, 32)}
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
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) setDepth(Math.max(1, Math.min(32, v)));
                        }}
                      />
                    </div>
                  </div>
                )}
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
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v)) updateCurrentAlgoParam('threshold', Math.max(0, Math.min(1, v)));
                        }}
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
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v)) updateCurrentAlgoParam('scale', Math.max(0.05, Math.min(8.0, v)));
                        }}
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
                  <div className="serpentine-footer-row">
                    <div className="serpentine-row" style={{ margin: 0 }}>
                      <button
                        type="button"
                        id="serpentineToggleBtn"
                        className={`toggle-square-btn ${currentParams.serpentine ? 'enabled' : ''}`}
                        onClick={() => updateCurrentAlgoParam('serpentine', !currentParams.serpentine)}
                        aria-label="Toggle Serpentine Scanline"
                      >
                        <span className={`toggle-square ${currentParams.serpentine ? 'enabled' : ''}`} />
                      </button>
                      <label
                        htmlFor="serpentineToggleBtn"
                        className="serpentine-label"
                      >
                        Serpentine Scanline
                      </label>
                    </div>
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
                          style={getSliderFill(currentParams.noiseAmount ?? 0.3, 0, 1)}
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

                {/* Algorithm-Specific Custom Controls (excludes duplicates of global progressive controls) */}
                {currentAlgo.controls && Array.isArray(currentAlgo.controls) && currentAlgo.controls
                  .filter((ctrl: any) => ![
                    'threshold',
                    'scale',
                    'diffusionStrength',
                    'errorStrength',
                    'errorReduction',
                    'strength',
                    'serpentine',
                    'noiseAmount',
                    'depth',
                    'colorDepth'
                  ].includes(ctrl.id))
                  // Sliders and dropdowns first, toggle switches last
                  .sort((a: any, b: any) => Number(a.type === 'toggle') - Number(b.type === 'toggle'))
                  .map((ctrl: any) => {
                    if (ctrl.type === 'dropdown') {
                      return (
                        <div key={ctrl.id} className="picker-row">
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
                        <div key={ctrl.id} className="serpentine-row param-toggle-row">
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
                      <div key={ctrl.id} className="slider-control-block">
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
            <div className="section-header">
              <span className="section-title-text">Adjustments</span>
              <button
                type="button"
                className="card-reset-icon-btn"
                title="Reset adjustments"
                aria-label="Reset adjustments"
                onClick={() => resetAllAdjustments()}
              >
                <RotateCcw size={17} strokeWidth={2.2} />
              </button>
            </div>

            {!collapsedSections.adjustments && (
              <div className="section-content section-card">

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
                    <Tooltip text="Double-click to reset to default" style={{ flex: 1, minWidth: 0, display: 'flex' }}>
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
                    <Tooltip text="Double-click to reset to default" style={{ flex: 1, minWidth: 0, display: 'flex' }}>
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
                    <Tooltip text="Double-click to reset to default" style={{ flex: 1, minWidth: 0, display: 'flex' }}>
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

                {/* Hue */}
                <div className="slider-control-block">
                  <div className="slider-label-above">
                    <Tooltip text="Hue (-180 to +180). Double-click to reset.">
                      <span
                        onDoubleClick={() => resetAdjustmentParam('hue')}
                        style={{ cursor: 'pointer' }}
                      >
                        Hue
                      </span>
                    </Tooltip>
                  </div>
                  <div className="slider-track-input-row">
                    <Tooltip text="Double-click to reset to default" style={{ flex: 1, minWidth: 0, display: 'flex' }}>
                      <input
                        type="range"
                        className="control-slider"
                        min="-180"
                        max="180"
                        step="1"
                        value={hue}
                        style={getSliderFill(hue, -180, 180)}
                        {...sliderPointerProps}
                        onDoubleClick={() => resetAdjustmentParam('hue')}
                        onChange={(e) => setHue(Number(e.target.value))}
                      />
                    </Tooltip>
                    <input
                      type="number"
                      className="control-num-input"
                      min="-180"
                      max="180"
                      step="1"
                      value={hue}
                      onChange={(e) => setHue(parseInt(e.target.value, 10) || 0)}
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
                    <Tooltip text="Double-click to reset to default" style={{ flex: 1, minWidth: 0, display: 'flex' }}>
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
                      onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v)) setGamma(Math.max(0.1, Math.min(3.0, v)));
                        }}
                    />
                  </div>
                </div>



                              </div>
            )}
          </div>

          {/* 3. PALETTE SECTION */}
          <div className="section-block">
            <div className="section-header">
              <span className="section-title-text">Colour Palette</span>
              <button
                type="button"
                className="card-reset-icon-btn"
                title="Reset colour palette"
                aria-label="Reset colour palette"
                onClick={() => setActivePaletteId(BUILTIN_PALETTES[0]?.id || 'monochrome_1bit')}
              >
                <RotateCcw size={17} strokeWidth={2.2} />
              </button>
            </div>

            {!collapsedSections.palette && (
              <div className="section-content section-card replica-palette-card" style={{ position: 'relative' }}>
                {isExtractingPalette && (
                  <LoadingScreen />
                )}

                {/* 1. Palette Row */}
                <div className="replica-row">
                  <span className="replica-label">Palette</span>
                  <Dropdown
                    id="palette-builtin-dropdown"
                    className="replica-dropdown-wrapper"
                    width="100%"
                    value={activePaletteId}
                    placeholder="Select palette..."
                    onChange={(palId) => {
                      setActivePaletteId(palId);
                    }}
                    items={allPaletteDropdownItems}
                    renderTrigger={({ isOpen, selectedItem, onClick }) => (
                      <div className={`replica-picker-box ${isOpen ? 'open' : ''}`}>
                        <button type="button" className="replica-picker-trigger" onClick={onClick}>
                          <span className="replica-picker-text">{selectedItem?.label || 'Select palette...'}</span>
                          <span className="replica-picker-extra-text">{workingPalette.length} Colours</span>
                        </button>
                        <div className="replica-segmented-stepper">
                          <button
                            type="button"
                            className="replica-stepper-btn"
                            onClick={(e) => { e.stopPropagation(); handlePrevPalette(); }}
                            aria-label="Previous Palette"
                          >
                            <ChevronLeft size={13} strokeWidth={2.4} />
                          </button>
                          <div className="replica-stepper-divider" />
                          <button
                            type="button"
                            className="replica-stepper-btn"
                            onClick={(e) => { e.stopPropagation(); handleNextPalette(); }}
                            aria-label="Next Palette"
                          >
                            <ChevronRight size={13} strokeWidth={2.4} />
                          </button>
                        </div>
                      </div>
                    )}
                  />
                </div>

                {/* Divider Line */}
                <div className="replica-divider" />

                {/* 2. Swatches Pill Bar + Circular Add Button */}
                <div className="replica-swatches-container" style={{ position: 'relative' }}>
                  <div className="replica-swatches-pill" ref={swatchesPillRef}>
                    {workingPalette.map((c: number[], i: number) => {
                      const isBeyondDepth = i >= paletteDepth;
                      const hex = rgbaToHex(c[0], c[1], c[2]).toUpperCase();
                      const isActive = activeSwatchIndex === i;
                      return (
                        <div
                          key={i}
                          className={`replica-swatch-segment ${isActive ? 'active' : ''}`}
                          title={`Swatch ${i + 1}: ${hex}`}
                          style={{
                            backgroundColor: `rgb(${c[0]}, ${c[1]}, ${c[2]})`,
                            opacity: isBeyondDepth ? 0.35 : 1
                          }}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return;
                            e.preventDefault();
                            handleSwatchClick(i);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                          }}
                        />
                      );
                    })}
                  </div>
                  <Tooltip text="Add color swatch (up to 32)">
                    <button
                      type="button"
                      className="replica-swatch-add-btn"
                      disabled={workingPalette.length >= 32}
                      onClick={() => {
                        const newIdx = workingPalette.length;
                        addSwatch();
                        openColorPicker(newIdx);
                      }}
                      aria-label="Add swatch"
                    >
                      <Plus size={18} strokeWidth={2.2} />
                    </button>
                  </Tooltip>

                  {/* Swatch Callout Popover (ditherforgeadvancedcolorpalette2.webp) */}
                  {(activeSwatchIndex !== null || isClosingPopover) && (
                    <SwatchColorPickerPopover
                      activeSwatchIndex={
                        activeSwatchIndex !== null && activeSwatchIndex < workingPalette.length
                          ? activeSwatchIndex
                          : Math.max(0, workingPalette.length - 1)
                      }
                      workingPalette={workingPalette}
                      popoverLeftOffset={popoverLeftOffset}
                      arrowLeftOffset={arrowLeftOffset}
                      popoverRef={popoverRef}
                      isClosing={isClosingPopover}
                      isOpening={isOpeningPopover}
                      onUpdateColor={commitDebouncedSwatchColor}
                      onAddLighter={handleAddLighterSwatch}
                      onAddDarker={handleAddDarkerSwatch}
                      onDelete={handleDeleteCurrentSwatch}
                      sliderPointerProps={sliderPointerProps}
                    />
                  )}
                </div>

                {/* 3. From Image Row */}
                <div className="replica-subheading-block">
                  <span className="replica-subheading-title">From Image</span>
                  <div className="replica-btn-grid-2">
                    <Tooltip text={!hasImage || !sourceImageData ? "Load an image first" : "Extract 8 colors using Median Cut"} style={{ flex: 1 }}>
                      <button
                        type="button"
                        className="replica-btn-2"
                        disabled={!hasImage || !sourceImageData}
                        onClick={handleExtractMedianCut}
                      >
                        Median Cut
                      </button>
                    </Tooltip>
                    <Tooltip text={!hasImage || !sourceImageData ? "Load an image first" : "Extract 8 colors using K-Means clustering"} style={{ flex: 1 }}>
                      <button
                        type="button"
                        className="replica-btn-2"
                        disabled={!hasImage || !sourceImageData}
                        onClick={handleExtractKMeans}
                      >
                        K-Means
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* 4. Palette Depth Row — hidden when algorithm does not use palettes or palette has <= 2 colors */}
                {currentAlgo.features?.supportsColorPalettes !== false && workingPalette.length > 2 && (
                <div className="replica-subheading-block">
                  <span className="replica-subheading-title">Palette Depth</span>
                  <div className="replica-depth-row">
                    <input
                      type="range"
                      className="replica-depth-slider"
                      min="2"
                      max={Math.min(32, workingPalette.length)}
                      step="1"
                      disabled={workingPalette.length <= 2}
                      value={paletteDepth}
                      style={{
                        background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${
                          Math.min(32, workingPalette.length) <= 2
                            ? 0
                            : ((paletteDepth - 2) / (Math.min(32, workingPalette.length) - 2)) * 100
                        }%, var(--accent-secondary) ${
                          Math.min(32, workingPalette.length) <= 2
                            ? 0
                            : ((paletteDepth - 2) / (Math.min(32, workingPalette.length) - 2)) * 100
                        }%, var(--accent-secondary) 100%)`
                      }}
                      {...sliderPointerProps}
                      onChange={(e) => setPaletteDepth(Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="replica-depth-badge"
                      min="2"
                      max={Math.min(32, workingPalette.length)}
                      step="1"
                      disabled={workingPalette.length <= 2}
                      value={paletteDepth}
                      onChange={(e) => setPaletteDepth(parseInt(e.target.value, 10) || 2)}
                    />
                  </div>
                </div>
                )}

                {/* 5. Misc. Row with Palette options Dropdown */}
                <div className="replica-row">
                  <span className="replica-label">Misc.</span>
                  <div className="replica-dropdown-wrapper" ref={miscWrapperRef}>
                    <div className={`replica-picker-box ${isMiscOpen ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="replica-picker-trigger"
                        onClick={() => {
                          if (isMiscOpen) {
                            closeMiscDropdown();
                          } else {
                            openMiscDropdown();
                          }
                        }}
                      >
                        <span className="replica-picker-text">{activeMiscOption}</span>
                      </button>
                      <div className="replica-segmented-stepper">
                        <button
                          type="button"
                          className="replica-stepper-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMiscOption((prev) => (prev === 'Inverse Palette' ? 'Flip Palette' : 'Inverse Palette'));
                          }}
                          aria-label="Previous Option"
                        >
                          <ChevronLeft size={13} strokeWidth={2.4} />
                        </button>
                        <div className="replica-stepper-divider" />
                        <button
                          type="button"
                          className="replica-stepper-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMiscOption((prev) => (prev === 'Inverse Palette' ? 'Flip Palette' : 'Inverse Palette'));
                          }}
                          aria-label="Next Option"
                        >
                          <ChevronRight size={13} strokeWidth={2.4} />
                        </button>
                      </div>
                    </div>

                    {/* Palette options Dropdown Panel (ditherforgeadvancedcolorpalette2.webp) */}
                    {(isMiscOpen || isMiscClosing) && (
                      <div className={`palette-options-card ${isMiscClosing ? 'closing' : ''}`}>
                        <div
                          className="palette-options-header"
                          onClick={() => closeMiscDropdown()}
                        >
                          <span className="palette-options-title">Palette options</span>
                          <ChevronDown size={16} strokeWidth={2.2} className="palette-options-chevron" />
                        </div>
                        <div className="palette-options-box">
                          <div
                            className="palette-option-row"
                            onClick={() => {
                              invertPalette();
                            }}
                          >
                            <span className="palette-option-label">Inverse Palette</span>
                            <div className={`palette-options-checkbox ${isPaletteInverted ? 'checked' : ''}`} />
                          </div>
                          <div className="palette-options-divider" />
                          <div
                            className="palette-option-row"
                            onClick={() => {
                              flipPalette();
                            }}
                          >
                            <span className="palette-option-label">Flip Palette</span>
                            <div className={`palette-options-checkbox ${isPaletteFlipped ? 'checked' : ''}`} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. Bottom Row: Import, Save, Export, Reset */}
                <div className="replica-btn-grid-3">
                  <input
                    type="file"
                    ref={paletteFileInputRef}
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImportPalette}
                  />
                  <button
                    type="button"
                    className="replica-btn-3 btn-import"
                    onClick={() => paletteFileInputRef.current?.click()}
                  >
                    Import
                  </button>
                  <button
                    type="button"
                    className="replica-btn-3"
                    onClick={() => {
                      setNewPaletteName(`Custom Palette ${savedPalettes.length + 1}`);
                      setIsSavePaletteModalOpen(true);
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="replica-btn-3 btn-export"
                    onClick={handleExportPalette}
                  >
                    Export
                  </button>
                </div>



                {/* Custom In-App Popup Modal for Saving Palettes */}
                {isSavePaletteModalOpen && (
                  <div className="modal-backdrop" onClick={() => setIsSavePaletteModalOpen(false)}>
                    <div
                      className="modal-dialog custom-popup-dialog"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="modal-header">
                        <span className="section-title-text" style={{ color: 'var(--text-main)' }}>SAVE CUSTOM PALETTE</span>
                      </div>
                      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Palette Name</label>
                        <input
                          type="text"
                          className="export-input"
                          value={newPaletteName}
                          autoFocus
                          onChange={(e) => setNewPaletteName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newPaletteName.trim()) {
                              saveCurrentPaletteLocally(newPaletteName.trim());
                              setIsSavePaletteModalOpen(false);
                            } else if (e.key === 'Escape') {
                              setIsSavePaletteModalOpen(false);
                            }
                          }}
                        />
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn-default"
                          onClick={() => setIsSavePaletteModalOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ width: 'auto', padding: '0 16px', height: '32px' }}
                          onClick={() => {
                            if (newPaletteName.trim()) {
                              saveCurrentPaletteLocally(newPaletteName.trim());
                              setIsSavePaletteModalOpen(false);
                            }
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. EFFECTS STACK SECTION */}
          <div className="section-block">
            <div className="section-header">
              <span className="section-title-text">Effects Stack</span>
              <button
                type="button"
                className="card-reset-icon-btn"
                title="Reset effects stack"
                aria-label="Reset effects stack"
                onClick={() => resetEffects()}
              >
                <RotateCcw size={17} strokeWidth={2.2} />
              </button>
            </div>

            {!collapsedSections.effects && (
              <div className="replica-effects-card">
                {visibleEffectsList.map((eff, index) => {
                  const isExpanded = expandedEffectId === eff.id;
                  const inversePairId = eff.id === 'glow' ? 'inverse_glow' : eff.id === 'vignette' ? 'inverse_vignette' : null;
                  const inversePairEff = inversePairId ? effects.find((e) => e.id === inversePairId) : null;
                  const isInverseActive = Boolean(inversePairEff?.enabled);
                  const activeEff = isInverseActive && inversePairEff ? inversePairEff : eff;
                  const isRowEnabled = eff.enabled || isInverseActive;

                  const meta = AVAILABLE_EFFECT_TYPES.find((m: any) => m.id === (eff.type || eff.id));
                  const defaultParams: Record<string, any> = meta ? (meta.defaultParams as any) : {};

                  const displayName = eff.id === 'scanlines' ? 'CRT Lines' : eff.name;
                  const inverseName = eff.id === 'glow' ? 'Inverse Glow' : eff.id === 'vignette' ? 'Inverse Vignette' : 'Inverse';

                  return (
                    <div key={eff.id} className="replica-effect-item">
                      <div
                        className="replica-effect-header-row"
                        onClick={() => setExpandedEffectId(isExpanded ? null : eff.id)}
                      >
                        <span className="replica-effect-title">{displayName}</span>
                        <button
                          type="button"
                          className={`replica-effect-checkbox ${isRowEnabled ? 'checked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isInverseActive && inversePairEff) {
                              toggleEffectEnabled(inversePairEff.id);
                            } else {
                              toggleEffectEnabled(eff.id);
                            }
                          }}
                          aria-label={`Toggle ${displayName}`}
                        />
                      </div>

                      {/* Expanded parameter card */}
                      {isExpanded && (
                        <div className="replica-effect-params-card">
                          {Object.keys(defaultParams).map((key) => {
                            const val = activeEff.params[key] !== undefined ? activeEff.params[key] : defaultParams[key];

                            if (key === 'shape' && typeof defaultParams[key] === 'string') {
                              return (
                                <div key={key} className="slider-control-block">
                                  <div className="slider-label-above">
                                    <span>Shape</span>
                                  </div>
                                  <div className="replica-btn-grid-2" style={{ marginTop: '2px' }}>
                                    <button
                                      type="button"
                                      className={`replica-btn-2 ${val === 'circle' ? 'active' : ''}`}
                                      onClick={() => updateEffectParam(activeEff.id, 'shape', 'circle')}
                                    >
                                      Circle
                                    </button>
                                    <button
                                      type="button"
                                      className={`replica-btn-2 ${val === 'diamond' ? 'active' : ''}`}
                                      onClick={() => updateEffectParam(activeEff.id, 'shape', 'diamond')}
                                    >
                                      Diamond
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            let min = 0;
                            let max = 1;
                            let step = 0.05;

                            if (key === 'quality' || key === 'blackPoint' || key === 'whitePoint' || key === 'softness') {
                              min = 0; max = 1; step = 0.05;
                            } else if (key === 'intensity') {
                              min = 0; max = 2; step = 0.05;
                            } else if (key === 'radius') {
                              min = 1; max = 24; step = 1;
                            } else if (key === 'dotSize' || key === 'thickness' || key === 'blockSize') {
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
                              <div key={key} className="slider-control-block">
                                <div className="slider-label-above">
                                  <span>{labelText}</span>
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
                                    onChange={(e) => {
                                      const nextVal = Number(e.target.value);
                                      updateEffectParam(eff.id, key, nextVal);
                                      if (inversePairEff) updateEffectParam(inversePairEff.id, key, nextVal);
                                    }}
                                  />
                                  <input
                                    type="number"
                                    className="control-num-input"
                                    min={min}
                                    max={max}
                                    step={step}
                                    value={displayVal}
                                    onChange={(e) => {
                                      const raw = parseFloat(e.target.value);
                                      if (!isNaN(raw)) {
                                        const clamped = Math.max(min, Math.min(max, raw));
                                        updateEffectParam(eff.id, key, clamped);
                                        if (inversePairEff) updateEffectParam(inversePairEff.id, key, clamped);
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}

                          {/* Inverse Subtoggle for glow & vignette */}
                          {inversePairEff && (
                            <div
                              className="replica-effect-subtoggle-row"
                              onClick={() => {
                                if (isInverseActive) {
                                  toggleEffectEnabled(inversePairEff.id);
                                  if (!eff.enabled) toggleEffectEnabled(eff.id);
                                } else {
                                  if (eff.enabled) toggleEffectEnabled(eff.id);
                                  toggleEffectEnabled(inversePairEff.id);
                                }
                              }}
                            >
                              <span className="replica-effect-subtoggle-label">{inverseName}</span>
                              <button
                                type="button"
                                className={`replica-effect-checkbox ${isInverseActive ? 'checked' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isInverseActive) {
                                    toggleEffectEnabled(inversePairEff.id);
                                    if (!eff.enabled) toggleEffectEnabled(eff.id);
                                  } else {
                                    if (eff.enabled) toggleEffectEnabled(eff.id);
                                    toggleEffectEnabled(inversePairEff.id);
                                  }
                                }}
                                aria-label={`Toggle ${inverseName}`}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {index < visibleEffectsList.length - 1 && (
                        <div className="replica-effect-divider" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. PRESETS SECTION */}
          <div className="section-block">
            <div 
              className="section-header section-header-clickable presets-header-row"
              onClick={() => toggleSection('presets')}
            >
              <span className="section-title-text presets-header-title">Presets</span>
              <ChevronDown
                size={18}
                strokeWidth={2.2}
                className="presets-header-chevron"
                style={{
                  transform: collapsedSections.presets ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 150ms ease'
                }}
              />
            </div>

            {!collapsedSections.presets && (
              <div className="replica-presets-card">
                {userPresets.length === 0 ? (
                  <>
                    <div className="replica-presets-empty">No Saved Presets.</div>
                    <button
                      type="button"
                      className="replica-preset-create-btn"
                      onClick={() => {
                        setNewPresetName('');
                        setIsCreatePresetModalOpen(true);
                      }}
                    >
                      Create
                    </button>
                  </>
                ) : (
                  <>
                    <div className="replica-presets-list">
                      {userPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="replica-preset-item"
                          onClick={() => {
                            if (!preset) return;
                            if (preset.algorithmId) setAlgorithmId(preset.algorithmId);
                            if (preset.paletteId) setActivePaletteId(preset.paletteId);
                            if (preset.palette && Array.isArray(preset.palette) && preset.palette.length > 0) {
                              useAppStore.setState({ workingPalette: preset.palette.map((c: any) => [...c]) });
                            }
                            if (preset.brightness !== undefined) setBrightness(preset.brightness * 100);
                            if (preset.contrast !== undefined) setContrast(preset.contrast * 100);
                            if (preset.saturation !== undefined) setSaturation(preset.saturation * 100);
                            if (preset.hue !== undefined) setHue(preset.hue);
                            if (preset.gamma !== undefined) setGamma(preset.gamma);
                            if (preset.depth !== undefined) setDepth(preset.depth);
                            
                            if (preset.threshold !== undefined) updateCurrentAlgoParam('threshold', preset.threshold);
                            if (preset.scale !== undefined) updateCurrentAlgoParam('scale', preset.scale);
                            if (preset.diffusionStrength !== undefined) updateCurrentAlgoParam('diffusionStrength', preset.diffusionStrength);
                            if (preset.serpentine !== undefined) updateCurrentAlgoParam('serpentine', preset.serpentine);
                            if (preset.effects) useAppStore.setState({ effects: preset.effects });
                          }}
                          title={`Apply preset: ${preset.name}`}
                        >
                          <span className="replica-preset-name">{preset.name}</span>
                          <button
                            type="button"
                            className="replica-preset-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = userPresets.filter((p) => p.id !== preset.id);
                              saveUserPresets(updated);
                              setUserPresets(updated);
                            }}
                            title="Delete preset"
                            aria-label={`Delete preset ${preset.name}`}
                          >
                            <X size={14} strokeWidth={2.2} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="replica-preset-create-btn"
                      onClick={() => {
                        setNewPresetName('');
                        setIsCreatePresetModalOpen(true);
                      }}
                    >
                      Create
                    </button>
                  </>
                )}
              </div>
            )}

            {/* CREATE PRESET POPUP MODAL */}
            {isCreatePresetModalOpen && (
              <div 
                className="preset-popup-backdrop"
                onClick={() => setIsCreatePresetModalOpen(false)}
              >
                <div 
                  className="preset-popup-dialog"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    autoFocus
                    className="preset-popup-input"
                    placeholder="Name"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = newPresetName.trim();
                        if (!trimmed) return;
                        const newPreset = {
                          id: `user_${Date.now()}`,
                          name: trimmed,
                          algorithmId,
                          paletteId: activePaletteId,
                          brightness: brightness / 100,
                          contrast: contrast / 100,
                          saturation: saturation / 100,
                          hue,
                          gamma,
                          depth,
                          threshold: currentParams?.threshold,
                          scale: currentParams?.scale,
                          diffusionStrength: currentParams?.diffusionStrength,
                          serpentine: currentParams?.serpentine,
                          effects: JSON.parse(JSON.stringify(effects)),
                          palette: [...workingPalette]
                        };
                        const updated = [...userPresets, newPreset];
                        saveUserPresets(updated);
                        setUserPresets(updated);
                        setNewPresetName('');
                        setIsCreatePresetModalOpen(false);
                      } else if (e.key === 'Escape') {
                        setIsCreatePresetModalOpen(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="preset-popup-btn"
                    disabled={!newPresetName.trim()}
                    onClick={() => {
                      const trimmed = newPresetName.trim();
                      if (!trimmed) return;
                      const newPreset = {
                        id: `user_${Date.now()}`,
                        name: trimmed,
                        algorithmId,
                        paletteId: activePaletteId,
                        brightness: brightness / 100,
                        contrast: contrast / 100,
                        saturation: saturation / 100,
                        hue,
                        gamma,
                        depth,
                        threshold: currentParams?.threshold,
                        scale: currentParams?.scale,
                        diffusionStrength: currentParams?.diffusionStrength,
                        serpentine: currentParams?.serpentine,
                        effects: JSON.parse(JSON.stringify(effects)),
                        palette: [...workingPalette]
                      };
                      const updated = [...userPresets, newPreset];
                      saveUserPresets(updated);
                      setUserPresets(updated);
                      setNewPresetName('');
                      setIsCreatePresetModalOpen(false);
                    }}
                  >
                    Create
                  </button>
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

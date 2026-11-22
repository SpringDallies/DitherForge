import React, { useMemo, useState, useRef } from 'react';
import { Plus, ChevronDown, ChevronLeft, ChevronRight, Copy, Edit3, Trash2, Download, Upload, X, Sliders, RotateCcw } from 'lucide-react';
import { Dropdown } from '../common/Dropdown';
import { Tooltip } from '../common/Tooltip';
import { ColorPicker } from '../common/ColorPicker';
import { useAppStore } from '../../state/useAppStore';
import * as AsciiEngine from '../../ascii';
import {
  ASCII_EFFECT_DESCRIPTORS,
  type AsciiAlgorithmDescriptor,
  type AsciiCharsetDefinition,
  type AsciiColorMode,
  type AsciiBackgroundMode,
  type AsciiBlendMode,
  type AsciiInjectMode
} from '../../ascii';

const FALLBACK_ASCII_ALGORITHMS: AsciiAlgorithmDescriptor[] = [
  { id: 'ascii-classic-ramp', name: 'Classic Ramp', category: 'ascii', family: 'tonal', description: '', complexity: 'simple', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-inverted-ramp', name: 'Inverted Ramp', category: 'ascii', family: 'tonal', description: '', complexity: 'simple', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-adaptive-density', name: 'Adaptive Density', category: 'ascii', family: 'tonal', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-local-contrast', name: 'Local Contrast', category: 'ascii', family: 'tonal', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-threshold', name: 'Threshold', category: 'ascii', family: 'tonal', description: '', complexity: 'simple', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-posterized', name: 'Posterized', category: 'ascii', family: 'tonal', description: '', complexity: 'simple', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-gamma-weighted', name: 'Gamma Weighted', category: 'ascii', family: 'tonal', description: '', complexity: 'simple', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-edge-enhanced', name: 'Edge Enhanced', category: 'ascii', family: 'tonal', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-bayer', name: 'Bayer Ordered', category: 'ascii', family: 'dithering', description: '', complexity: 'simple', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-floyd-steinberg', name: 'Floyd-Steinberg', category: 'ascii', family: 'dithering', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-atkinson', name: 'Atkinson', category: 'ascii', family: 'dithering', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-stochastic', name: 'Stochastic', category: 'ascii', family: 'dithering', description: '', complexity: 'simple', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-blue-noise', name: 'Blue Noise', category: 'ascii', family: 'dithering', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-error-diffusion-braille', name: 'Error-Diffusion Braille', category: 'ascii', family: 'dithering', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-braille-2x4', name: 'Braille 2x4 Sub-pixel', category: 'ascii', family: 'geometry', description: '', complexity: 'simple', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-half-block', name: 'Half-Block (Top/Bottom)', category: 'ascii', family: 'geometry', description: '', complexity: 'simple', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-quadrant-blocks', name: 'Quadrant Blocks 2x2', category: 'ascii', family: 'geometry', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-sextant-octant', name: 'Sextant / Octant', category: 'ascii', family: 'geometry', description: '', complexity: 'complex', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-geometric-glyphs', name: 'Geometric Glyphs', category: 'ascii', family: 'geometry', description: '', complexity: 'complex', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-directional-glyphs', name: 'Directional Glyphs', category: 'ascii', family: 'geometry', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-contour-outline', name: 'Contour Outline', category: 'ascii', family: 'artistic', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-halftone-glyphs', name: 'Halftone Glyphs', category: 'ascii', family: 'artistic', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-text-mosaic', name: 'Text Mosaic', category: 'ascii', family: 'artistic', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-silhouette', name: 'Silhouette', category: 'ascii', family: 'artistic', description: '', complexity: 'simple', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] }
];

const FALLBACK_ASCII_CHARSETS: AsciiCharsetDefinition[] = [
  { id: 'classic_standard', name: 'Classic Standard', category: 'classic_ascii', chars: ' .:-=+*#%@', ordering: 'sparse-to-dense', description: '', compatibilityNotes: '', builtin: true }
];

export const FONT_STACK_ITEMS = [
  { id: '"JetBrains Mono Variable", "JetBrains Mono", "Fira Code", monospace', label: 'JetBrains Mono', hint: 'Bundled' },
  { id: '"DejaVu Sans Mono", "Liberation Mono", monospace', label: 'DejaVu Sans Mono', hint: 'Wide Unicode' },
  { id: 'Consolas, "Courier New", monospace', label: 'Consolas / Courier', hint: 'Classic' },
  { id: 'monospace', label: 'System Monospace', hint: 'Native' }
];

function getBuiltinAsciiAlgorithms(): AsciiAlgorithmDescriptor[] {
  const mod = AsciiEngine as any;
  const list =
    mod.ASCII_ALGORITHM_REGISTRY ||
    mod.ASCII_ALGORITHMS ||
    mod.getAllAsciiAlgorithms?.();
  return Array.isArray(list) && list.length > 0 ? list : FALLBACK_ASCII_ALGORITHMS;
}

function getBuiltinAsciiCharsets(): AsciiCharsetDefinition[] {
  const mod = AsciiEngine as any;
  const list =
    mod.ASCII_CHARSETS ||
    mod.BUILTIN_ASCII_CHARSETS ||
    mod.ASCII_CHARSET_LIST ||
    mod.getAllAsciiCharsets?.();
  return Array.isArray(list) && list.length > 0 ? list : FALLBACK_ASCII_CHARSETS;
}

export const getSliderFill = (val: number, min: number, max: number): React.CSSProperties => {
  const pct = Math.max(0, Math.min(100, ((val - min) / Math.max(0.0001, max - min)) * 100));
  return { '--slider-fill': `${pct.toFixed(1)}%` } as React.CSSProperties;
};

export interface AsciiSliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  tooltip?: string;
  onDoubleClickReset?: () => void;
  sliderPointerProps?: any;
  onChange: (val: number) => void;
}

export const AsciiSliderControl: React.FC<AsciiSliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  tooltip,
  onDoubleClickReset,
  sliderPointerProps,
  onChange
}) => {
  const tooltipText = tooltip || `${label} (${min} to ${max})`;
  return (
    <div className="slider-control-block">
      <div className="slider-label-above">
        <Tooltip text={tooltipText}>
          <span
            onDoubleClick={onDoubleClickReset}
            style={onDoubleClickReset ? { cursor: 'pointer' } : undefined}
          >
            {label}
          </span>
        </Tooltip>
      </div>
      <div className="slider-track-input-row">
        <Tooltip text={tooltipText} style={{ flex: 1, display: 'flex' }}>
          <input
            type="range"
            className="control-slider"
            min={min}
            max={max}
            step={step}
            value={value}
            style={getSliderFill(value, min, max)}
            {...(sliderPointerProps || {})}
            onDoubleClick={onDoubleClickReset}
            onChange={(e) => onChange(parseFloat(e.target.value))}
          />
        </Tooltip>
        <input
          type="number"
          className="control-num-input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
    </div>
  );
};

export interface AsciiToggleControlProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const AsciiToggleControl: React.FC<AsciiToggleControlProps> = ({ id, label, checked, onChange }) => (
  <div className="serpentine-row param-toggle-row">
    <button
      type="button"
      id={`toggle-${id}`}
      className={`toggle-square-btn ${checked ? 'enabled' : ''}`}
      onClick={() => onChange(!checked)}
      aria-label={`Toggle ${label}`}
    >
      <span className={`toggle-square ${checked ? 'enabled' : ''}`} />
    </button>
    <label
      htmlFor={`toggle-${id}`}
      className="serpentine-label"
      style={{ cursor: 'pointer' }}
      onClick={() => onChange(!checked)}
    >
      {label}
    </label>
  </div>
);

// Section 1: ASCII Base Controls
export interface AsciiBaseControlsProps {
  sliderPointerProps?: any;
}

export const AsciiBaseControls: React.FC<AsciiBaseControlsProps> = ({ sliderPointerProps }) => {
  const asciiSettings = useAppStore((state) => state.asciiSettings);
  const setAsciiSetting = useAppStore((state) => state.setAsciiSetting);
  const updateAsciiAlgoParam = useAppStore((state) => state.updateAsciiAlgoParam);
  const customCharsets = useAppStore((state) => state.customCharsets);
  const addCustomCharset = useAppStore((state) => state.addCustomCharset);
  const updateCustomCharset = useAppStore((state) => state.updateCustomCharset);
  const deleteCustomCharset = useAppStore((state) => state.deleteCustomCharset);
  const duplicateCustomCharset = useAppStore((state) => state.duplicateCustomCharset);
  const exportCustomCharsetsJson = useAppStore((state) => state.exportCustomCharsetsJson);
  const importCustomCharsetsJson = useAppStore((state) => state.importCustomCharsetsJson);
  const addToast = useAppStore((state) => state.addToast);

  const [collapsedSubsections, setCollapsedSubsections] = useState<Record<string, boolean>>({
    grid: true,
    tone: true,
    color: true,
    asciiEffects: false
  });
  const [expandedEffectId, setExpandedEffectId] = useState<string | null>(null);

  const toggleSubsection = (key: string) => {
    setCollapsedSubsections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newCharsetName, setNewCharsetName] = useState('');
  const [newCharsetChars, setNewCharsetChars] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingCharsetId, setEditingCharsetId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [draggedGlyphIndex, setDraggedGlyphIndex] = useState<number | null>(null);
  const [insertionSlot, setInsertionSlot] = useState<number | null>(null);
  const rampScrollContainerRef = useRef<HTMLDivElement>(null);

  const algorithms = useMemo(() => getBuiltinAsciiAlgorithms(), []);
  const builtinCharsets = useMemo(() => getBuiltinAsciiCharsets(), []);

  const selectedAlgo = useMemo(
    () => algorithms.find((a) => a.id === asciiSettings.algorithmId) || algorithms[0],
    [algorithms, asciiSettings.algorithmId]
  );

  const activeCustomCharset = useMemo(() => {
    return customCharsets.find((cs) => cs.id === asciiSettings.charsetId) || null;
  }, [customCharsets, asciiSettings.charsetId]);

  const charsetCategories = useMemo(() => {
    return [
      { id: 'all', label: 'All Categories' },
      ...AsciiEngine.ASCII_CHARSET_CATEGORIES
    ];
  }, []);

  const charsetDropdownItems = useMemo(() => {
    const items: Array<{ id: string; label: string; hint?: string; onDelete?: (e: React.MouseEvent) => void }> = [];

    // Custom Charsets
    if (selectedCategory === 'all' || selectedCategory === 'custom') {
      for (const cs of customCharsets) {
        items.push({
          id: cs.id,
          label: cs.name,
          hint: `${Array.from(cs.chars).length} chars`,
          onDelete: (e) => {
            e.stopPropagation();
            deleteCustomCharset(cs.id);
            addToast(`Deleted custom charset "${cs.name}"`, 'info');
          }
        });
      }
    }

    // Built-in Charsets filtered by category
    for (const cs of builtinCharsets) {
      if (selectedCategory === 'all' || cs.category === selectedCategory) {
        items.push({
          id: cs.id,
          label: cs.name,
          hint: `${Array.from(cs.chars).length} chars`
        });
      }
    }
    return items;
  }, [builtinCharsets, customCharsets, deleteCustomCharset, selectedCategory, addToast]);

  const handleSaveCustomCharset = () => {
    const cleanChars = AsciiEngine.sanitizeUnicodeChars(newCharsetChars);
    if (Array.from(cleanChars).length < 2) {
      addToast('Custom charset requires at least 2 characters', 'error');
      return;
    }

    if (editingCharsetId) {
      updateCustomCharset(editingCharsetId, {
        name: newCharsetName.trim(),
        chars: cleanChars
      });
      addToast(`Updated charset "${newCharsetName.trim()}"`, 'success');
      setEditingCharsetId(null);
      setNewCharsetName('');
      setNewCharsetChars('');
      setShowCustomForm(false);
      return;
    }

    const created = addCustomCharset(newCharsetName, cleanChars);
    if (created) {
      setNewCharsetName('');
      setNewCharsetChars('');
      setShowCustomForm(false);
      addToast(`Saved charset "${created.name}"`, 'success');
    }
  };

  const handleStartEditCurrent = () => {
    if (!activeCustomCharset) return;
    setEditingCharsetId(activeCustomCharset.id);
    setNewCharsetName(activeCustomCharset.name);
    setNewCharsetChars(activeCustomCharset.chars);
    setShowCustomForm(true);
  };

  const handleDuplicateCurrent = () => {
    if (!activeCustomCharset) return;
    const dup = duplicateCustomCharset(activeCustomCharset.id);
    if (dup) {
      addToast(`Duplicated "${activeCustomCharset.name}" as "${dup.name}"`, 'success');
    }
  };

  const handleDeleteCurrent = () => {
    if (!activeCustomCharset) return;
    deleteCustomCharset(activeCustomCharset.id);
    addToast(`Deleted custom charset "${activeCustomCharset.name}"`, 'info');
  };

  const handleExportJson = (single = false) => {
    const jsonStr = exportCustomCharsetsJson(single && activeCustomCharset ? activeCustomCharset.id : undefined);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = single && activeCustomCharset
      ? `${activeCustomCharset.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_charset.json`
      : 'ditherforge_custom_charsets.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    addToast('Exported character set(s) JSON', 'success');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string') return;
      const res = importCustomCharsetsJson(content);
      if (res.success) {
        addToast(`Imported ${res.importedCount} custom charset(s)${res.skippedCount > 0 ? ` (${res.skippedCount} skipped)` : ''}`, 'success');
      } else {
        addToast(res.error || 'Failed to import character sets', 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const activeRampChars = useMemo(() => {
    return AsciiEngine.resolveActiveChars(
      {
        charsetId: asciiSettings.charsetId,
        customCharsetChars: asciiSettings.customCharsetChars,
        injectedChars: asciiSettings.injectedChars,
        injectMode: asciiSettings.injectMode,
        reverseCharset: asciiSettings.reverseCharset,
        characterDepth: asciiSettings.characterDepth,
        characterOffset: asciiSettings.characterOffset,
        autoCalibrateOrder: asciiSettings.autoCalibrateOrder,
        fontFamily: asciiSettings.fontFamily,
        fontWeight: asciiSettings.fontWeight,
        glyphScale: asciiSettings.glyphScale
      },
      customCharsets
    );
  }, [
    asciiSettings.charsetId,
    asciiSettings.customCharsetChars,
    asciiSettings.injectedChars,
    asciiSettings.injectMode,
    asciiSettings.reverseCharset,
    asciiSettings.characterDepth,
    asciiSettings.characterOffset,
    asciiSettings.autoCalibrateOrder,
    asciiSettings.fontFamily,
    asciiSettings.fontWeight,
    asciiSettings.glyphScale,
    customCharsets
  ]);

  return (
    <div className="ascii-controls-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Algorithm-specific dynamic controls */}
      {selectedAlgo?.controls && selectedAlgo.controls.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {selectedAlgo.controls.map((ctrl) => {
            const curVal =
              asciiSettings.algoParams[ctrl.id] !== undefined
                ? asciiSettings.algoParams[ctrl.id]
                : ctrl.defaultValue;
            if (ctrl.type === 'slider') {
              return (
                <AsciiSliderControl
                  key={ctrl.id}
                  label={ctrl.label}
                  value={Number(curVal)}
                  min={ctrl.min ?? 0}
                  max={ctrl.max ?? 1}
                  step={ctrl.step ?? 0.05}
                  unit={(ctrl as any).unit}
                  sliderPointerProps={sliderPointerProps}
                  onDoubleClickReset={() => updateAsciiAlgoParam(ctrl.id, ctrl.defaultValue)}
                  onChange={(v) => updateAsciiAlgoParam(ctrl.id, v)}
                />
              );
            }
            if (ctrl.type === 'toggle') {
              return (
                <AsciiToggleControl
                  key={ctrl.id}
                  id={`algo-${ctrl.id}`}
                  label={ctrl.label}
                  checked={Boolean(curVal)}
                  onChange={(v) => updateAsciiAlgoParam(ctrl.id, v)}
                />
              );
            }
            if (ctrl.type === 'dropdown' && ctrl.options) {
              return (
                <div key={ctrl.id} className="picker-row">
                  <span className="picker-label">{ctrl.label}</span>
                  <Dropdown
                    id={`ascii-algo-ctrl-${ctrl.id}`}
                    value={String(curVal)}
                    onChange={(v) => updateAsciiAlgoParam(ctrl.id, v)}
                    width="100%"
                    items={ctrl.options.map((o) => ({ id: o.value, label: o.label }))}
                  />
                </div>
              );
            }
            return (
              <div key={ctrl.id} className="picker-row">
                <span className="picker-label">{ctrl.label}</span>
                <input
                  type="text"
                  className="export-input"
                  value={String(curVal ?? '')}
                  onChange={(e) => updateAsciiAlgoParam(ctrl.id, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden File Input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Category Filter & Action Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
        <div className="picker-row" style={{ margin: 0 }}>
          <span className="picker-label">Category Filter</span>
          <Dropdown
            id="ascii-category-filter"
            value={selectedCategory}
            onChange={(val) => {
              setSelectedCategory(val);
              // Auto-choose the first character set in the selected category
              const firstMatch =
                (val === 'all' || val === 'custom') && customCharsets.length > 0
                  ? customCharsets[0]
                  : builtinCharsets.find((cs) => val === 'all' || cs.category === val);
              if (firstMatch) {
                setAsciiSetting('charsetId', firstMatch.id);
              }
            }}
            width="100%"
            items={charsetCategories}
          />
        </div>

        {/* Character Set Picker Header & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
          <span className="picker-label" style={{ margin: 0 }}>Character Set</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Tooltip text="Create custom character set">
              <button
                type="button"
                className="card-action-icon-btn"
                onClick={() => {
                  setEditingCharsetId(null);
                  setNewCharsetName('');
                  setNewCharsetChars('');
                  setShowCustomForm((v) => !v);
                }}
                aria-label="New custom character set"
                style={{ width: '22px', height: '22px' }}
              >
                <Plus size={13} strokeWidth={2.2} />
              </button>
            </Tooltip>
            {activeCustomCharset && (
              <>
                <Tooltip text="Edit current custom set">
                  <button
                    type="button"
                    className="card-action-icon-btn"
                    onClick={handleStartEditCurrent}
                    aria-label="Edit custom character set"
                    style={{ width: '22px', height: '22px' }}
                  >
                    <Edit3 size={12} strokeWidth={2.2} />
                  </button>
                </Tooltip>
                <Tooltip text="Duplicate current custom set">
                  <button
                    type="button"
                    className="card-action-icon-btn"
                    onClick={handleDuplicateCurrent}
                    aria-label="Duplicate custom character set"
                    style={{ width: '22px', height: '22px' }}
                  >
                    <Copy size={12} strokeWidth={2.2} />
                  </button>
                </Tooltip>
                <Tooltip text="Delete current custom set">
                  <button
                    type="button"
                    className="card-action-icon-btn"
                    onClick={handleDeleteCurrent}
                    aria-label="Delete custom character set"
                    style={{ width: '22px', height: '22px', color: 'var(--accent-red, #ff5555)' }}
                  >
                    <Trash2 size={12} strokeWidth={2.2} />
                  </button>
                </Tooltip>
              </>
            )}
            <Tooltip text="Import custom sets JSON">
              <button
                type="button"
                className="card-action-icon-btn"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Import custom charsets"
                style={{ width: '22px', height: '22px' }}
              >
                <Upload size={12} strokeWidth={2.2} />
              </button>
            </Tooltip>
            {customCharsets.length > 0 && (
              <Tooltip text="Export custom sets JSON">
                <button
                  type="button"
                  className="card-action-icon-btn"
                  onClick={() => handleExportJson(false)}
                  aria-label="Export custom charsets"
                  style={{ width: '22px', height: '22px' }}
                >
                  <Download size={12} strokeWidth={2.2} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <Dropdown
          id="ascii-charset-select"
          value={asciiSettings.charsetId}
          onChange={(val) => {
            // When switching character sets, clear the custom ramp override so the new charset takes effect
            setAsciiSetting('charsetId', val);
            setAsciiSetting('customCharsetChars', '');
          }}
          width="100%"
          items={charsetDropdownItems}
        />
      </div>

      {showCustomForm && (
        <div
          style={{
            padding: '10px',
            marginBottom: '6px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
              {editingCharsetId ? 'Edit Custom Charset' : 'New Custom Charset'}
            </span>
            <button
              type="button"
              className="card-action-icon-btn"
              onClick={() => {
                setShowCustomForm(false);
                setEditingCharsetId(null);
              }}
              style={{ width: '20px', height: '20px' }}
            >
              <X size={12} strokeWidth={2.2} />
            </button>
          </div>
          <input
            type="text"
            className="export-input"
            placeholder="Charset name"
            value={newCharsetName}
            onChange={(e) => setNewCharsetName(e.target.value)}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              className="export-input"
              placeholder="Characters (sparse to dense, e.g.  .:-=+*#%@)"
              value={newCharsetChars}
              onChange={(e) => setNewCharsetChars(e.target.value)}
              style={{ flex: 1, fontFamily: 'monospace' }}
            />
            <Tooltip text="Auto-order entered glyphs by ink density for active font">
              <button
                type="button"
                className="card-reset-icon-btn"
                onClick={() => {
                  const arr = Array.from(newCharsetChars);
                  if (arr.length >= 2) {
                    const sorted = AsciiEngine.calibrateCharacters(
                      arr,
                      asciiSettings.fontFamily,
                      asciiSettings.fontWeight,
                      asciiSettings.glyphScale
                    ).map((c) => c.char).join('');
                    setNewCharsetChars(sorted);
                    addToast(`Calibrated ${arr.length} glyphs by font ink coverage`, 'success');
                  }
                }}
                style={{ width: '32px', height: '32px', flexShrink: 0 }}
                aria-label="Calibrate character order"
              >
                <Sliders size={14} strokeWidth={2.2} />
              </button>
            </Tooltip>
          </div>
          <button
            type="button"
            className="replica-preset-create-btn"
            onClick={handleSaveCustomCharset}
            style={{ width: '100%', height: '32px' }}
          >
            {editingCharsetId ? 'Update Charset' : 'Save Charset'}
          </button>
        </div>
      )}

      {/* Interactive Active Character Ramp Preview */}
      <div
        className="ascii-ramp-preview-container"
        style={{
          padding: '8px 10px',
          background: 'var(--bg-raised, #18191f)',
          border: '1px solid var(--border-color, #2a2b36)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          marginBottom: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted, #8e90a0)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Active Ramp {asciiSettings.autoCalibrateOrder ? '(Calibrated)' : '(Manual)'}</span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span>{activeRampChars.length} glyphs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Tooltip text="Reset glyph sequence to calibrated font ink density order">
              <button
                type="button"
                className="card-action-icon-btn"
                onClick={() => {
                  if (activeRampChars.length >= 2) {
                    const sorted = AsciiEngine.calibrateCharacters(
                      activeRampChars,
                      asciiSettings.fontFamily,
                      asciiSettings.fontWeight,
                      asciiSettings.glyphScale
                    ).map((c) => c.char).join('');
                    if (activeCustomCharset) {
                      updateCustomCharset(activeCustomCharset.id, { chars: sorted });
                    } else {
                      setAsciiSetting('customCharsetChars', sorted);
                    }
                    addToast(`Re-ordered ${activeRampChars.length} glyphs by measured ink density`, 'success');
                  }
                }}
                style={{ width: '20px', height: '20px' }}
                aria-label="Reset ramp to calibrated order"
              >
                <RotateCcw size={11} strokeWidth={2.2} />
              </button>
            </Tooltip>
          </div>
        </div>
        <div
          ref={rampScrollContainerRef}
          data-lenis-prevent
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedGlyphIndex === null || !rampScrollContainerRef.current) return;

            const container = rampScrollContainerRef.current;
            const children = Array.from(container.children) as HTMLElement[];
            if (children.length === 0) return;

            const cursorX = e.clientX;
            let targetSlot = activeRampChars.length; // Default to append at end

            for (let i = 0; i < children.length; i++) {
              const rect = children[i].getBoundingClientRect();
              const mid = rect.left + rect.width / 2;
              if (cursorX < mid) {
                targetSlot = i;
                break;
              }
            }

            if (insertionSlot !== targetSlot) {
              setInsertionSlot(targetSlot);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setInsertionSlot(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedGlyphIndex === null || insertionSlot === null) return;

            // targetSlot is insertionSlot in [0, activeRampChars.length]
            let targetIndex = insertionSlot;
            if (draggedGlyphIndex < targetIndex) {
              targetIndex -= 1;
            }

            if (draggedGlyphIndex !== targetIndex) {
              const nextArr = [...activeRampChars];
              const [movedItem] = nextArr.splice(draggedGlyphIndex, 1);
              nextArr.splice(targetIndex, 0, movedItem);
              const reorderedStr = nextArr.join('');

              if (asciiSettings.autoCalibrateOrder) {
                setAsciiSetting('autoCalibrateOrder', false);
              }

              if (activeCustomCharset) {
                updateCustomCharset(activeCustomCharset.id, { chars: reorderedStr });
              } else {
                setAsciiSetting('customCharsetChars', reorderedStr);
              }
            }

            setDraggedGlyphIndex(null);
            setInsertionSlot(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            padding: '8px 6px',
            scrollbarWidth: 'thin'
          }}
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          {activeRampChars.map((ch, idx) => {
            const density = AsciiEngine.measureGlyphInkCoverage(
              ch,
              asciiSettings.fontFamily,
              asciiSettings.fontWeight,
              asciiSettings.glyphScale
            );
            const isDragging = draggedGlyphIndex === idx;

            // Fluid Apple-style spring parting:
            // When an item is dragged, other items move left or right to make room
            let translateX = 0;
            if (draggedGlyphIndex !== null && insertionSlot !== null && !isDragging) {
              if (draggedGlyphIndex < insertionSlot) {
                // Dragging forward: items between draggedGlyphIndex and insertionSlot shift left
                if (idx > draggedGlyphIndex && idx < insertionSlot) {
                  translateX = -32;
                }
              } else if (draggedGlyphIndex > insertionSlot) {
                // Dragging backward: items from insertionSlot up to draggedGlyphIndex shift right
                if (idx >= insertionSlot && idx < draggedGlyphIndex) {
                  translateX = 32;
                }
              }
            }

            // Show indicator line before item if insertionSlot === idx
            const showLineBefore = insertionSlot === idx && draggedGlyphIndex !== idx && draggedGlyphIndex !== idx - 1;
            // Show indicator line after the last item if insertionSlot === activeRampChars.length
            const showLineAfter = insertionSlot === activeRampChars.length && idx === activeRampChars.length - 1 && draggedGlyphIndex !== idx;

            return (
              <div
                key={idx}
                draggable
                onDragStart={(e) => {
                  setDraggedGlyphIndex(idx);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(idx));
                }}
                onDragEnd={() => {
                  setDraggedGlyphIndex(null);
                  setInsertionSlot(null);
                }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  opacity: isDragging ? 0.25 : 1,
                  transform: `translateX(${translateX}px)`,
                  transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 160ms ease',
                  flexShrink: 0
                }}
              >
                {/* Left insertion line - centered in gap and thicker (3px) */}
                {showLineBefore && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '-5px',
                      top: '0px',
                      bottom: '0px',
                      width: '3px',
                      backgroundColor: 'var(--accent-primary, #D9D9D9)',
                      borderRadius: '2px',
                      zIndex: 10,
                      pointerEvents: 'none',
                      boxShadow: '0 0 4px rgba(255, 255, 255, 0.25)'
                    }}
                  />
                )}
                {/* Right insertion line after last item */}
                {showLineAfter && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '-5px',
                      top: '0px',
                      bottom: '0px',
                      width: '3px',
                      backgroundColor: 'var(--accent-primary, #D9D9D9)',
                      borderRadius: '2px',
                      zIndex: 10,
                      pointerEvents: 'none',
                      boxShadow: '0 0 4px rgba(255, 255, 255, 0.25)'
                    }}
                  />
                )}
                <Tooltip text={`[${idx}] '${ch === ' ' ? 'space' : ch}' • Ink: ${(density * 100).toFixed(1)}% (Drag to reorder)`}>
                  <div
                    style={{
                      minWidth: '24px',
                      height: '26px',
                      padding: '0 5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--bg-tertiary, #4E4E4E)',
                      border: '1px solid var(--border-color, #5A5A5A)',
                      borderRadius: 'var(--radius-xs, 6px)',
                      fontSize: '13px',
                      fontFamily: asciiSettings.fontFamily,
                      fontWeight: asciiSettings.fontWeight,
                      color: 'var(--text-main, #DEDEDE)',
                      userSelect: 'none',
                      transition: 'background-color 140ms ease, border-color 140ms ease'
                    }}
                  >
                    {ch === ' ' ? '\u00A0' : ch}
                  </div>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>

      <div className="picker-row" style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span className="picker-label" style={{ margin: 0 }}>Custom Ramp Override</span>
          {asciiSettings.customCharsetChars ? (
            <button
              type="button"
              className="card-action-icon-btn"
              onClick={() => {
                setAsciiSetting('customCharsetChars', '');
                addToast('Cleared custom ramp override', 'info');
              }}
              style={{ width: '18px', height: '18px', fontSize: '10px' }}
              title="Clear custom override to use selected charset"
            >
              <X size={11} strokeWidth={2.2} />
            </button>
          ) : null}
        </div>
        <input
          type="text"
          className="export-input"
          placeholder="Optional inline characters..."
          value={asciiSettings.customCharsetChars}
          onChange={(e) => setAsciiSetting('customCharsetChars', e.target.value)}
          style={{ width: '100%', fontFamily: 'monospace' }}
        />
      </div>

      <AsciiSliderControl
        label="Character Depth"
        value={asciiSettings.characterDepth}
        min={2}
        max={64}
        step={1}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('characterDepth', 16)}
        onChange={(v) => setAsciiSetting('characterDepth', Math.round(v))}
      />

      <AsciiSliderControl
        label="Character Offset"
        value={asciiSettings.characterOffset}
        min={-32}
        max={32}
        step={1}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('characterOffset', 0)}
        onChange={(v) => setAsciiSetting('characterOffset', Math.round(v))}
      />

      <div className="picker-row" style={{ marginBottom: '8px' }}>
        <span className="picker-label">Inject Mode</span>
        <Dropdown
          id="ascii-inject-mode"
          value={asciiSettings.injectMode}
          onChange={(val) => setAsciiSetting('injectMode', val as AsciiInjectMode)}
          width="100%"
          items={[
            { id: 'interleave', label: 'Interleave' },
            { id: 'append', label: 'Append' },
            { id: 'prepend', label: 'Prepend' },
            { id: 'replace', label: 'Replace' }
          ]}
        />
      </div>

      <div className="picker-row" style={{ marginBottom: '8px' }}>
        <span className="picker-label">Injected Characters</span>
        <input
          type="text"
          className="export-input"
          placeholder="e.g. $#@ (characters to inject)"
          value={Array.isArray(asciiSettings.injectedChars) ? asciiSettings.injectedChars.join('') : ''}
          onChange={(e) => {
            const chars = Array.from(e.target.value).slice(0, 10);
            setAsciiSetting('injectedChars', chars);
          }}
          style={{ width: '100%', fontFamily: 'monospace' }}
        />
      </div>

      <AsciiToggleControl
        id="reverseCharset"
        label="Reverse Charset"
        checked={asciiSettings.reverseCharset}
        onChange={(v) => setAsciiSetting('reverseCharset', v)}
      />

      <AsciiToggleControl
        id="autoCalibrateOrder"
        label="Auto-Calibrate Ink Order"
        checked={asciiSettings.autoCalibrateOrder}
        onChange={(v) => setAsciiSetting('autoCalibrateOrder', v)}
      />
    </div>
  );
};

// Section 2: Typography & Grid Controls
export interface AsciiTypographyGridControlsProps {
  sliderPointerProps?: any;
}

export const AsciiTypographyGridControls: React.FC<AsciiTypographyGridControlsProps> = ({ sliderPointerProps }) => {
  const asciiSettings = useAppStore((state) => state.asciiSettings);
  const setAsciiSetting = useAppStore((state) => state.setAsciiSetting);
  const patchAsciiSettings = useAppStore((state) => state.patchAsciiSettings);

  // Compute master scale factor relative to default cell dimensions (8px x 14px)
  const masterScale = useMemo(() => {
    return Math.round(((asciiSettings.cellWidth / 8 + asciiSettings.cellHeight / 14) / 2) * 100) / 100;
  }, [asciiSettings.cellWidth, asciiSettings.cellHeight]);

  const handleMasterScaleChange = (scale: number) => {
    const s = Math.max(0.5, Math.min(3.0, scale));
    const newW = Math.max(4, Math.min(32, Math.round(8 * s)));
    const newH = Math.max(4, Math.min(48, Math.round(14 * s)));
    patchAsciiSettings({
      cellWidth: newW,
      cellHeight: newH
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <AsciiSliderControl
        label="Overall ASCII Size"
        value={masterScale}
        min={0.5}
        max={3.0}
        step={0.05}
        unit="x"
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => handleMasterScaleChange(1.0)}
        onChange={handleMasterScaleChange}
      />
      <div className="picker-row" style={{ marginTop: '4px', marginBottom: '4px' }}>
        <span className="picker-label">Font Family</span>
        <Dropdown
          id="ascii-font-family"
          value={asciiSettings.fontFamily}
          onChange={(val) => setAsciiSetting('fontFamily', val)}
          width="100%"
          items={FONT_STACK_ITEMS}
        />
      </div>
      <AsciiSliderControl
        label="Cell Width"
        value={asciiSettings.cellWidth}
        min={4}
        max={32}
        step={1}
        unit="px"
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('cellWidth', 8)}
        onChange={(v) => setAsciiSetting('cellWidth', Math.round(v))}
      />
      <AsciiSliderControl
        label="Cell Height"
        value={asciiSettings.cellHeight}
        min={4}
        max={48}
        step={1}
        unit="px"
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('cellHeight', 14)}
        onChange={(v) => setAsciiSetting('cellHeight', Math.round(v))}
      />
      <AsciiSliderControl
        label="Cell Spacing"
        value={asciiSettings.cellSpacing}
        min={0}
        max={12}
        step={1}
        unit="px"
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('cellSpacing', 0)}
        onChange={(v) => setAsciiSetting('cellSpacing', Math.round(v))}
      />
      <AsciiSliderControl
        label="Aspect Ratio"
        value={asciiSettings.aspectRatio}
        min={0.3}
        max={2.0}
        step={0.05}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('aspectRatio', 0.55)}
        onChange={(v) => setAsciiSetting('aspectRatio', v)}
      />
      <AsciiSliderControl
        label="Glyph Scale"
        value={asciiSettings.glyphScale}
        min={0.5}
        max={1.5}
        step={0.05}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('glyphScale', 1.0)}
        onChange={(v) => setAsciiSetting('glyphScale', v)}
      />
      <AsciiSliderControl
        label="Font Weight"
        value={asciiSettings.fontWeight}
        min={300}
        max={900}
        step={100}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('fontWeight', 400)}
        onChange={(v) => setAsciiSetting('fontWeight', Math.round(v))}
      />
    </div>
  );
};

// Section 3: Tone & Sampling Controls
export interface AsciiToneSamplingControlsProps {
  sliderPointerProps?: any;
}

export const AsciiToneSamplingControls: React.FC<AsciiToneSamplingControlsProps> = ({ sliderPointerProps }) => {
  const asciiSettings = useAppStore((state) => state.asciiSettings);
  const setAsciiSetting = useAppStore((state) => state.setAsciiSetting);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <AsciiSliderControl
        label="Brightness"
        value={asciiSettings.brightness}
        min={-1}
        max={1}
        step={0.05}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('brightness', 0)}
        onChange={(v) => setAsciiSetting('brightness', v)}
      />
      <AsciiSliderControl
        label="Contrast"
        value={asciiSettings.contrast}
        min={-1}
        max={1}
        step={0.05}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('contrast', 0)}
        onChange={(v) => setAsciiSetting('contrast', v)}
      />
      <AsciiSliderControl
        label="Gamma"
        value={asciiSettings.gamma}
        min={0.2}
        max={3.0}
        step={0.05}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('gamma', 1.0)}
        onChange={(v) => setAsciiSetting('gamma', v)}
      />
      <AsciiSliderControl
        label="Exposure"
        value={asciiSettings.exposure}
        min={-2}
        max={2}
        step={0.1}
        unit="EV"
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('exposure', 0)}
        onChange={(v) => setAsciiSetting('exposure', v)}
      />
      <AsciiSliderControl
        label="Edge Sensitivity"
        value={asciiSettings.edgeSensitivity}
        min={0}
        max={2}
        step={0.05}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('edgeSensitivity', 1.0)}
        onChange={(v) => setAsciiSetting('edgeSensitivity', v)}
      />
      <AsciiSliderControl
        label="Detail Preservation"
        value={asciiSettings.detailPreservation}
        min={0}
        max={1}
        step={0.05}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('detailPreservation', 0.5)}
        onChange={(v) => setAsciiSetting('detailPreservation', v)}
      />
      <div className="picker-row" style={{ marginTop: '4px', marginBottom: '4px' }}>
        <span className="picker-label">Sampling Method</span>
        <Dropdown
          id="ascii-sampling-method"
          value={asciiSettings.samplingMethod || 'average'}
          onChange={(val) => setAsciiSetting('samplingMethod', val as any)}
          width="100%"
          items={[
            { id: 'average', label: 'Average (Cell Luminance)' },
            { id: 'center_weighted', label: 'Center-Weighted' },
            { id: 'edge_aware', label: 'Edge-Aware Structure' },
            { id: 'local_contrast', label: 'Local Contrast' },
            { id: 'adaptive', label: 'Adaptive Dynamic Range' },
            { id: 'hybrid', label: 'Hybrid Multi-Signal' }
          ]}
        />
      </div>
      <AsciiSliderControl
        label="Smoothing"
        value={asciiSettings.smoothing}
        min={0}
        max={3}
        step={0.1}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('smoothing', 0)}
        onChange={(v) => setAsciiSetting('smoothing', v)}
      />
      <AsciiSliderControl
        label="Sharpening"
        value={asciiSettings.sharpening}
        min={0}
        max={2}
        step={0.1}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('sharpening', 0)}
        onChange={(v) => setAsciiSetting('sharpening', v)}
      />
      <div className="picker-row" style={{ marginTop: '4px', marginBottom: '4px' }}>
        <span className="picker-label">Sampling Quality</span>
        <Dropdown
          id="ascii-sampling-quality"
          value={asciiSettings.samplingQuality}
          onChange={(val) => setAsciiSetting('samplingQuality', val as 'fast' | 'box' | 'subcell')}
          width="100%"
          items={[
            { id: 'fast', label: 'Fast (Center)' },
            { id: 'box', label: 'Box Average' },
            { id: 'subcell', label: 'Subcell Exact' }
          ]}
        />
      </div>
      <AsciiToggleControl
        id="asciiInvertLuminance"
        label="Invert Luminance"
        checked={asciiSettings.invert}
        onChange={(v) => setAsciiSetting('invert', v)}
      />
    </div>
  );
};

// Section 4: Color & Background Controls
export interface AsciiColorBackgroundControlsProps {
  sliderPointerProps?: any;
}

export const AsciiColorBackgroundControls: React.FC<AsciiColorBackgroundControlsProps> = ({ sliderPointerProps }) => {
  const asciiSettings = useAppStore((state) => state.asciiSettings);
  const setAsciiSetting = useAppStore((state) => state.setAsciiSetting);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="picker-row" style={{ marginTop: '4px', marginBottom: '4px' }}>
        <span className="picker-label">Color Mode</span>
        <Dropdown
          id="ascii-color-mode"
          value={asciiSettings.colorMode === ('single' as any) ? 'custom' : asciiSettings.colorMode}
          onChange={(val) => setAsciiSetting('colorMode', val as AsciiColorMode)}
          width="100%"
          items={[
            { id: 'monochrome', label: 'Monochrome (Grayscale)' },
            { id: 'source', label: 'Source Color' },
            { id: 'palette', label: 'Active Palette' },
            { id: 'custom', label: 'Custom Color' }
          ]}
        />
      </div>

      {(asciiSettings.colorMode === 'custom' || (asciiSettings.colorMode as string) === 'single') && (
        <div className="slider-control-block">
          <div className="slider-label-above">
            <Tooltip text="ASCII Character Foreground Color. Double-click to reset.">
              <span
                onDoubleClick={() => setAsciiSetting('foregroundColor', '#FFFFFF')}
                style={{ cursor: 'pointer' }}
              >
                Foreground Color
              </span>
            </Tooltip>
          </div>
          <ColorPicker
            id="ascii-foreground-color"
            value={asciiSettings.foregroundColor || '#FFFFFF'}
            defaultValue="#FFFFFF"
            onChange={(newHex) => setAsciiSetting('foregroundColor', newHex)}
          />
        </div>
      )}

      <AsciiSliderControl
        label="Foreground Opacity"
        value={asciiSettings.foregroundOpacity}
        min={0}
        max={1}
        step={0.05}
        sliderPointerProps={sliderPointerProps}
        onDoubleClickReset={() => setAsciiSetting('foregroundOpacity', 1.0)}
        onChange={(v) => setAsciiSetting('foregroundOpacity', v)}
      />

      <div className="picker-row" style={{ marginTop: '4px', marginBottom: '4px' }}>
        <span className="picker-label">Blend Mode</span>
        <Dropdown
          id="ascii-blend-mode"
          value={asciiSettings.blendMode || 'normal'}
          onChange={(val) => setAsciiSetting('blendMode', val as AsciiBlendMode)}
          width="100%"
          items={[
            { id: 'normal', label: 'Normal' },
            { id: 'screen', label: 'Screen' },
            { id: 'multiply', label: 'Multiply' },
            { id: 'overlay', label: 'Overlay' },
            { id: 'soft-light', label: 'Soft Light' },
            { id: 'add', label: 'Add (Linear Dodge)' },
            { id: 'subtract', label: 'Subtract' },
            { id: 'bleed', label: 'Bleed (Color Dodge)' },
            { id: 'difference', label: 'Difference' },
            { id: 'darken', label: 'Darken' },
            { id: 'lighten', label: 'Lighten' }
          ]}
        />
      </div>

      <div className="picker-row" style={{ marginTop: '4px', marginBottom: '4px' }}>
        <span className="picker-label">Background Mode</span>
        <Dropdown
          id="ascii-bg-mode"
          value={asciiSettings.backgroundMode}
          onChange={(val) => setAsciiSetting('backgroundMode', val as AsciiBackgroundMode)}
          width="100%"
          items={[
            { id: 'solid', label: 'Solid Color' },
            { id: 'transparent', label: 'Transparent' },
            { id: 'original', label: 'Original Image' },
            { id: 'custom', label: 'Custom Color' }
          ]}
        />
      </div>

      {asciiSettings.backgroundMode === 'original' && (
        <AsciiSliderControl
          label="Background Blur"
          value={asciiSettings.backgroundBlur ?? 0}
          min={0}
          max={30}
          step={1}
          unit="px"
          sliderPointerProps={sliderPointerProps}
          onDoubleClickReset={() => setAsciiSetting('backgroundBlur', 0)}
          onChange={(v) => setAsciiSetting('backgroundBlur', v)}
        />
      )}

      {(asciiSettings.backgroundMode === 'solid' || asciiSettings.backgroundMode === 'custom') && (
        <div className="slider-control-block">
          <div className="slider-label-above">
            <Tooltip text="ASCII Background Color. Double-click to reset.">
              <span
                onDoubleClick={() => setAsciiSetting('backgroundColor', '#0D0E11')}
                style={{ cursor: 'pointer' }}
              >
                Background Color
              </span>
            </Tooltip>
          </div>
          <ColorPicker
            id="ascii-background-color"
            value={asciiSettings.backgroundColor || '#0D0E11'}
            defaultValue="#0D0E11"
            onChange={(newHex) => setAsciiSetting('backgroundColor', newHex)}
          />
        </div>
      )}

      {asciiSettings.backgroundMode !== 'transparent' && (
        <AsciiSliderControl
          label="Background Opacity"
          value={asciiSettings.backgroundOpacity}
          min={0}
          max={1}
          step={0.05}
          sliderPointerProps={sliderPointerProps}
          onDoubleClickReset={() => setAsciiSetting('backgroundOpacity', 1.0)}
          onChange={(v) => setAsciiSetting('backgroundOpacity', v)}
        />
      )}

      <AsciiToggleControl
        id="asciiPreserveAlpha"
        label="Preserve Source Alpha"
        checked={asciiSettings.preserveAlpha}
        onChange={(v) => setAsciiSetting('preserveAlpha', v)}
      />

      <AsciiToggleControl
        id="asciiClipping"
        label="Clip Glyphs to Cells"
        checked={asciiSettings.clipping}
        onChange={(v) => setAsciiSetting('clipping', v)}
      />
    </div>
  );
};

// Section 5: ASCII Effects Controls
export interface AsciiEffectsControlsProps {
  sliderPointerProps?: any;
}

export const AsciiEffectsControls: React.FC<AsciiEffectsControlsProps> = ({ sliderPointerProps }) => {
  const asciiSettings = useAppStore((state) => state.asciiSettings);
  const toggleAsciiEffect = useAppStore((state) => state.toggleAsciiEffect);
  const updateAsciiEffectParam = useAppStore((state) => state.updateAsciiEffectParam);
  const [expandedEffectId, setExpandedEffectId] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {ASCII_EFFECT_DESCRIPTORS.map((desc) => {
        const active = asciiSettings.asciiEffects.find((e) => e.id === desc.id) || {
          id: desc.id,
          enabled: false,
          params: { ...desc.defaultParams }
        };
        const isRowEnabled = Boolean(active?.enabled);
        const isExpanded = expandedEffectId === desc.id;

        return (
          <div key={desc.id} className="replica-effect-item">
            <div
              className="replica-effect-header-row"
              onClick={() => setExpandedEffectId(isExpanded ? null : desc.id)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronDown
                  size={14}
                  strokeWidth={2.2}
                  style={{
                    transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 140ms ease',
                    color: 'var(--text-secondary)'
                  }}
                />
                <span className="replica-effect-title">{desc.name}</span>
              </div>
              <button
                type="button"
                className={`toggle-square-btn ${isRowEnabled ? 'enabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAsciiEffect(desc.id);
                }}
                aria-label={`Toggle ${desc.name}`}
              >
                <span className={`toggle-square ${isRowEnabled ? 'enabled' : ''}`} />
              </button>
            </div>

            {isExpanded && (
              <div className="replica-effect-params-card" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {desc.controls.map((ctrl) => {
                  const val = active.params[ctrl.id] ?? ctrl.defaultValue;
                  if (ctrl.type === 'slider') {
                    return (
                      <AsciiSliderControl
                        key={ctrl.id}
                        label={ctrl.label}
                        value={Number(val)}
                        min={ctrl.min ?? 0}
                        max={ctrl.max ?? 1}
                        step={ctrl.step ?? 0.05}
                        unit={(ctrl as any).unit}
                        sliderPointerProps={sliderPointerProps}
                        onDoubleClickReset={() => updateAsciiEffectParam(desc.id, ctrl.id, ctrl.defaultValue)}
                        onChange={(v) => updateAsciiEffectParam(desc.id, ctrl.id, v)}
                      />
                    );
                  }
                  if (ctrl.type === 'toggle') {
                    return (
                      <AsciiToggleControl
                        key={ctrl.id}
                        id={`eff-${desc.id}-${ctrl.id}`}
                        label={ctrl.label}
                        checked={Boolean(val)}
                        onChange={(v) => updateAsciiEffectParam(desc.id, ctrl.id, v)}
                      />
                    );
                  }
                  if (ctrl.type === 'select' && ctrl.options) {
                    return (
                      <div key={ctrl.id} className="picker-row">
                        <span className="picker-label">{ctrl.label}</span>
                        <Dropdown
                          id={`ascii-eff-${desc.id}-${ctrl.id}`}
                          value={String(val)}
                          onChange={(v) => updateAsciiEffectParam(desc.id, ctrl.id, v)}
                          width="100%"
                          items={ctrl.options.map((o) => ({ id: o.value, label: o.label }))}
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Legacy compatibility wrapper if anything imports AsciiControlsPanel
export const AsciiControlsPanel: React.FC<{ sliderPointerProps?: any }> = ({ sliderPointerProps }) => {
  return <AsciiBaseControls sliderPointerProps={sliderPointerProps} />;
};

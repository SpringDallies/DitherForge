import React, { useMemo, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Dropdown } from '../common/Dropdown';
import { Tooltip } from '../common/Tooltip';
import { ColorPicker } from '../common/ColorPicker';
import { useAppStore } from '../../state/useAppStore';
import * as AsciiEngine from '../../ascii';
import {
  ASCII_EFFECT_DESCRIPTORS,
  type AsciiAlgorithmDescriptor,
  type AsciiAlgorithmId,
  type AsciiBackgroundMode,
  type AsciiCharsetDefinition,
  type AsciiColorMode,
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

const FONT_STACK_ITEMS = [
  { id: '"JetBrains Mono", "Fira Code", "DejaVu Sans Mono", Consolas, monospace', label: 'JetBrains / Fira Mono', hint: 'Default' },
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

const getSliderFill = (val: number, min: number, max: number): React.CSSProperties => {
  const pct = Math.max(0, Math.min(100, ((val - min) / Math.max(0.0001, max - min)) * 100));
  return { '--slider-fill': `${pct.toFixed(1)}%` } as React.CSSProperties;
};

interface SliderControlProps {
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

const AsciiSliderControl: React.FC<SliderControlProps> = ({
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

interface ToggleControlProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const AsciiToggleControl: React.FC<ToggleControlProps> = ({ id, label, checked, onChange }) => (
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

interface AsciiControlsPanelProps {
  sliderPointerProps?: any;
}

export const AsciiControlsPanel: React.FC<AsciiControlsPanelProps> = ({ sliderPointerProps }) => {
  const asciiSettings = useAppStore((state) => state.asciiSettings);
  const setAsciiSetting = useAppStore((state) => state.setAsciiSetting);
  const updateAsciiAlgoParam = useAppStore((state) => state.updateAsciiAlgoParam);
  const toggleAsciiEffect = useAppStore((state) => state.toggleAsciiEffect);
  const updateAsciiEffectParam = useAppStore((state) => state.updateAsciiEffectParam);
  const customCharsets = useAppStore((state) => state.customCharsets);
  const addCustomCharset = useAppStore((state) => state.addCustomCharset);
  const deleteCustomCharset = useAppStore((state) => state.deleteCustomCharset);
  const addToast = useAppStore((state) => state.addToast);

  const [expandedEffectId, setExpandedEffectId] = useState<string | null>(null);
  const [collapsedSubsections, setCollapsedSubsections] = useState<Record<string, boolean>>({
    grid: true,
    tone: true,
    color: true,
    asciiEffects: false
  });

  const [newCharsetName, setNewCharsetName] = useState('');
  const [newCharsetChars, setNewCharsetChars] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const algorithms = useMemo(() => getBuiltinAsciiAlgorithms(), []);
  const builtinCharsets = useMemo(() => getBuiltinAsciiCharsets(), []);

  const selectedAlgo = useMemo(
    () => algorithms.find((a) => a.id === asciiSettings.algorithmId) || algorithms[0],
    [algorithms, asciiSettings.algorithmId]
  );

  const charsetDropdownItems = useMemo(() => {
    const items: Array<{ id: string; label: string; hint?: string; onDelete?: (e: React.MouseEvent) => void }> = [];
    for (const cs of customCharsets) {
      items.push({
        id: cs.id,
        label: cs.name,
        hint: `${cs.chars.length} chars`,
        onDelete: (e) => {
          e.stopPropagation();
          deleteCustomCharset(cs.id);
        }
      });
    }
    for (const cs of builtinCharsets) {
      items.push({
        id: cs.id,
        label: cs.name,
        hint: `${cs.chars.length} chars`
      });
    }
    return items;
  }, [builtinCharsets, customCharsets, deleteCustomCharset]);

  const toggleSubsection = (key: string) =>
    setCollapsedSubsections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSaveCustomCharset = () => {
    if (newCharsetChars.length < 2) {
      addToast('Custom charset requires at least 2 characters', 'error');
      return;
    }
    const created = addCustomCharset(newCharsetName, newCharsetChars);
    if (created) {
      setNewCharsetName('');
      setNewCharsetChars('');
      setShowCustomForm(false);
      addToast(`Saved charset "${created.name}"`, 'success');
    }
  };

  return (
    <div className="ascii-controls-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* 1. Algorithm-specific dynamic controls */}
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

      {/* 2. Character Set & Ramp Overrides */}
      <div className="picker-row" style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span className="picker-label" style={{ margin: 0 }}>Character Set</span>
          <Tooltip text="Create custom character set">
            <button
              type="button"
              className="card-reset-icon-btn"
              onClick={() => setShowCustomForm((v) => !v)}
              aria-label="New custom character set"
              style={{ width: '22px', height: '22px' }}
            >
              <Plus size={14} strokeWidth={2.2} />
            </button>
          </Tooltip>
        </div>
        <Dropdown
          id="ascii-charset-select"
          value={asciiSettings.charsetId}
          onChange={(val) => setAsciiSetting('charsetId', val)}
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
          <input
            type="text"
            className="export-input"
            placeholder="Charset name"
            value={newCharsetName}
            onChange={(e) => setNewCharsetName(e.target.value)}
            style={{ width: '100%' }}
          />
          <input
            type="text"
            className="export-input"
            placeholder="Characters (sparse to dense, e.g.  .:-=+*#%@)"
            value={newCharsetChars}
            onChange={(e) => setNewCharsetChars(e.target.value)}
            style={{ width: '100%', fontFamily: 'monospace' }}
          />
          <button
            type="button"
            className="replica-preset-create-btn"
            onClick={handleSaveCustomCharset}
            style={{ width: '100%', height: '32px' }}
          >
            Save Charset
          </button>
        </div>
      )}

      <div className="picker-row" style={{ marginBottom: '8px' }}>
        <span className="picker-label">Custom Ramp Override</span>
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

      {/* 3. Typography & Grid Accordion */}
      <div className={`effects-category-accordion ${collapsedSubsections.grid ? 'is-collapsed' : ''}`} style={{ marginTop: '4px' }}>
        <div
          className={`effects-category-header ${collapsedSubsections.grid ? 'is-collapsed' : ''}`}
          onClick={() => toggleSubsection('grid')}
        >
          <div className="effects-category-title-group">
            <span className="effects-category-title">Typography & Grid</span>
          </div>
          <ChevronDown
            size={16}
            strokeWidth={2.2}
            style={{
              transform: collapsedSubsections.grid ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
              color: 'var(--text-secondary)'
            }}
          />
        </div>

        {!collapsedSubsections.grid && (
          <div className="effects-category-body" style={{ gap: '8px' }}>
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
        )}
      </div>

      {/* 4. Tone & Sampling Accordion */}
      <div className={`effects-category-accordion ${collapsedSubsections.tone ? 'is-collapsed' : ''}`} style={{ marginTop: '4px' }}>
        <div
          className={`effects-category-header ${collapsedSubsections.tone ? 'is-collapsed' : ''}`}
          onClick={() => toggleSubsection('tone')}
        >
          <div className="effects-category-title-group">
            <span className="effects-category-title">Tone & Sampling</span>
          </div>
          <ChevronDown
            size={16}
            strokeWidth={2.2}
            style={{
              transform: collapsedSubsections.tone ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
              color: 'var(--text-secondary)'
            }}
          />
        </div>

        {!collapsedSubsections.tone && (
          <div className="effects-category-body" style={{ gap: '8px' }}>
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
        )}
      </div>

      {/* 5. Color & Background Accordion */}
      <div className={`effects-category-accordion ${collapsedSubsections.color ? 'is-collapsed' : ''}`} style={{ marginTop: '4px' }}>
        <div
          className={`effects-category-header ${collapsedSubsections.color ? 'is-collapsed' : ''}`}
          onClick={() => toggleSubsection('color')}
        >
          <div className="effects-category-title-group">
            <span className="effects-category-title">Color & Background</span>
          </div>
          <ChevronDown
            size={16}
            strokeWidth={2.2}
            style={{
              transform: collapsedSubsections.color ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
              color: 'var(--text-secondary)'
            }}
          />
        </div>

        {!collapsedSubsections.color && (
          <div className="effects-category-body" style={{ gap: '8px' }}>
            <div className="picker-row" style={{ marginTop: '4px', marginBottom: '4px' }}>
              <span className="picker-label">Color Mode</span>
              <Dropdown
                id="ascii-color-mode"
                value={asciiSettings.colorMode}
                onChange={(val) => setAsciiSetting('colorMode', val as AsciiColorMode)}
                width="100%"
                items={[
                  { id: 'source', label: 'Source Color' },
                  { id: 'palette', label: 'Active Palette' },
                  { id: 'monochrome', label: 'Monochrome' },
                  { id: 'single', label: 'Single Color' },
                  { id: 'custom', label: 'Custom Color' }
                ]}
              />
            </div>

            {(asciiSettings.colorMode === 'single' || asciiSettings.colorMode === 'custom') && (
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
        )}
      </div>

      {/* 6. ASCII Effects Accordion */}
      <div className={`effects-category-accordion ${collapsedSubsections.asciiEffects ? 'is-collapsed' : ''}`} style={{ marginTop: '4px' }}>
        <div
          className={`effects-category-header ${collapsedSubsections.asciiEffects ? 'is-collapsed' : ''}`}
          onClick={() => toggleSubsection('asciiEffects')}
        >
          <div className="effects-category-title-group">
            <span className="effects-category-title">ASCII Effects</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {asciiSettings.asciiEffects.filter((e) => e.enabled).length > 0 && (
              <span className="effects-category-badge">
                {asciiSettings.asciiEffects.filter((e) => e.enabled).length}
              </span>
            )}
            <ChevronDown
              size={16}
              strokeWidth={2.2}
              style={{
                transform: collapsedSubsections.asciiEffects ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease',
                color: 'var(--text-secondary)'
              }}
            />
          </div>
        </div>

        {!collapsedSubsections.asciiEffects && (
          <div className="effects-category-body" style={{ gap: '8px' }}>
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
        )}
      </div>
    </div>
  );
};

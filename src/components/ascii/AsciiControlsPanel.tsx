import React, { useMemo, useState } from 'react';
import { RotateCcw, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Dropdown } from '../common/Dropdown';
import { Tooltip } from '../common/Tooltip';
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
  { id: 'ascii-error-diffusion-braille', name: 'Error Diffusion Braille', category: 'ascii', family: 'dithering', description: '', complexity: 'complex', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-braille-2x4', name: 'Braille 2x4', category: 'ascii', family: 'geometry', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-half-block', name: 'Half Block', category: 'ascii', family: 'geometry', description: '', complexity: 'simple', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
  { id: 'ascii-quadrant-blocks', name: 'Quadrant Blocks', category: 'ascii', family: 'geometry', description: '', complexity: 'moderate', features: { supportsColorPalettes: true, supportsColorDepth: true, supportsDpiScale: true, supportsLuminanceThreshold: true, isDeterministic: true, requiresMultiPass: false }, controls: [] },
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

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (val: number) => void;
  onDragChange: (dragging: boolean) => void;
}

const AsciiSliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  onDragChange
}) => {
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  const display = Number.isInteger(step) ? String(Math.round(value)) : value.toFixed(2);
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '0.76rem', color: 'var(--text-dim)' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {display}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        type="range"
        className="control-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={() => onDragChange(true)}
        onPointerUp={() => onDragChange(false)}
        onBlur={() => onDragChange(false)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', '--slider-fill': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
};

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const AsciiToggleRow: React.FC<ToggleRowProps> = ({ label, checked, onChange }) => (
  <label
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
      fontSize: '0.76rem',
      color: 'var(--text-dim)',
      cursor: 'pointer'
    }}
  >
    <span>{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  </label>
);

export const AsciiControlsPanel: React.FC = () => {
  const asciiSettings = useAppStore((state) => state.asciiSettings);
  const setAsciiSetting = useAppStore((state) => state.setAsciiSetting);
  const setAsciiAlgorithmId = useAppStore((state) => state.setAsciiAlgorithmId);
  const updateAsciiAlgoParam = useAppStore((state) => state.updateAsciiAlgoParam);
  const toggleAsciiEffect = useAppStore((state) => state.toggleAsciiEffect);
  const updateAsciiEffectParam = useAppStore((state) => state.updateAsciiEffectParam);
  const resetAsciiSettings = useAppStore((state) => state.resetAsciiSettings);
  const customCharsets = useAppStore((state) => state.customCharsets);
  const addCustomCharset = useAppStore((state) => state.addCustomCharset);
  const deleteCustomCharset = useAppStore((state) => state.deleteCustomCharset);
  const setIsDraggingSlider = useAppStore((state) => state.setIsDraggingSlider);
  const addToast = useAppStore((state) => state.addToast);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    grid: true,
    tone: false,
    color: false,
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

  const algorithmDropdownItems = useMemo(
    () =>
      algorithms.map((a) => ({
        id: a.id,
        label: a.name,
        hint: a.family
      })),
    [algorithms]
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

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

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

  const renderGroupHeader = (key: string, title: string) => (
    <button
      type="button"
      onClick={() => toggleGroup(key)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '6px 0',
        marginTop: '8px',
        marginBottom: '6px',
        background: 'transparent',
        border: 'none',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-primary)',
        fontSize: '0.76rem',
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      <span>{title}</span>
      {openGroups[key] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
    </button>
  );

  return (
    <div className="ascii-controls-panel">
      {/* Algorithm & Reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>ASCII Algorithm</span>
        <Tooltip text="Reset ASCII settings">
          <button
            type="button"
            className="tool-icon-btn"
            onClick={resetAsciiSettings}
            aria-label="Reset ASCII settings"
          >
            <RotateCcw size={13} />
          </button>
        </Tooltip>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <Dropdown
          id="ascii-algorithm-select"
          value={asciiSettings.algorithmId}
          onChange={(val) => setAsciiAlgorithmId(val as AsciiAlgorithmId)}
          width="100%"
          items={algorithmDropdownItems}
        />
      </div>

      {/* Algorithm-specific dynamic controls */}
      {selectedAlgo?.controls && selectedAlgo.controls.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          {selectedAlgo.controls.map((ctrl) => {
            const curVal =
              asciiSettings.algoParams[ctrl.id] !== undefined
                ? asciiSettings.algoParams[ctrl.id]
                : ctrl.defaultValue;
            if (ctrl.type === 'slider') {
              return (
                <AsciiSliderRow
                  key={ctrl.id}
                  label={ctrl.label}
                  value={Number(curVal)}
                  min={ctrl.min ?? 0}
                  max={ctrl.max ?? 1}
                  step={ctrl.step ?? 0.05}
                  unit={ctrl.unit}
                  onDragChange={setIsDraggingSlider}
                  onChange={(v) => updateAsciiAlgoParam(ctrl.id, v)}
                />
              );
            }
            if (ctrl.type === 'toggle') {
              return (
                <AsciiToggleRow
                  key={ctrl.id}
                  label={ctrl.label}
                  checked={Boolean(curVal)}
                  onChange={(v) => updateAsciiAlgoParam(ctrl.id, v)}
                />
              );
            }
            if (ctrl.type === 'dropdown' && ctrl.options) {
              return (
                <div key={ctrl.id} style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                    {ctrl.label}
                  </div>
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
              <div key={ctrl.id} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  {ctrl.label}
                </div>
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

      {/* Charset Selector + Custom Charset CRUD */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>Character Set</span>
        <Tooltip text="Save custom character set">
          <button
            type="button"
            className="tool-icon-btn"
            onClick={() => setShowCustomForm((v) => !v)}
            aria-label="New custom character set"
          >
            <Plus size={13} />
          </button>
        </Tooltip>
      </div>
      <div style={{ marginBottom: '8px' }}>
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
            padding: '8px',
            marginBottom: '10px',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <input
            type="text"
            className="export-input"
            placeholder="Charset name"
            value={newCharsetName}
            onChange={(e) => setNewCharsetName(e.target.value)}
            style={{ marginBottom: '6px', width: '100%' }}
          />
          <input
            type="text"
            className="export-input"
            placeholder="Characters (sparse to dense, e.g.  .:-=+*#%@)"
            value={newCharsetChars}
            onChange={(e) => setNewCharsetChars(e.target.value)}
            style={{ marginBottom: '6px', width: '100%', fontFamily: 'monospace' }}
          />
          <button
            type="button"
            className="action-btn"
            onClick={handleSaveCustomCharset}
            style={{ width: '100%' }}
          >
            Save Charset
          </button>
        </div>
      )}

      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
          Custom Ramp Override
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

      <AsciiSliderRow
        label="Character Depth"
        value={asciiSettings.characterDepth}
        min={2}
        max={64}
        step={1}
        onDragChange={setIsDraggingSlider}
        onChange={(v) => setAsciiSetting('characterDepth', Math.round(v))}
      />
      <AsciiSliderRow
        label="Character Offset"
        value={asciiSettings.characterOffset}
        min={-32}
        max={32}
        step={1}
        onDragChange={setIsDraggingSlider}
        onChange={(v) => setAsciiSetting('characterOffset', Math.round(v))}
      />
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
          Inject Mode
        </div>
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
      <AsciiToggleRow
        label="Reverse Charset"
        checked={asciiSettings.reverseCharset}
        onChange={(v) => setAsciiSetting('reverseCharset', v)}
      />
      <AsciiToggleRow
        label="Auto-Calibrate Ink Order"
        checked={asciiSettings.autoCalibrateOrder}
        onChange={(v) => setAsciiSetting('autoCalibrateOrder', v)}
      />

      {/* Typography & Grid */}
      {renderGroupHeader('grid', 'Typography & Grid')}
      {openGroups.grid && (
        <div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
              Font Family
            </div>
            <Dropdown
              id="ascii-font-family"
              value={asciiSettings.fontFamily}
              onChange={(val) => setAsciiSetting('fontFamily', val)}
              width="100%"
              items={FONT_STACK_ITEMS}
            />
          </div>
          <AsciiSliderRow
            label="Cell Width"
            value={asciiSettings.cellWidth}
            min={4}
            max={32}
            step={1}
            unit="px"
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('cellWidth', Math.round(v))}
          />
          <AsciiSliderRow
            label="Cell Height"
            value={asciiSettings.cellHeight}
            min={4}
            max={48}
            step={1}
            unit="px"
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('cellHeight', Math.round(v))}
          />
          <AsciiSliderRow
            label="Cell Spacing"
            value={asciiSettings.cellSpacing}
            min={0}
            max={12}
            step={1}
            unit="px"
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('cellSpacing', Math.round(v))}
          />
          <AsciiSliderRow
            label="Aspect Ratio"
            value={asciiSettings.aspectRatio}
            min={0.3}
            max={2.0}
            step={0.05}
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('aspectRatio', v)}
          />
          <AsciiSliderRow
            label="Glyph Scale"
            value={asciiSettings.glyphScale}
            min={0.5}
            max={1.5}
            step={0.05}
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('glyphScale', v)}
          />
          <AsciiSliderRow
            label="Font Weight"
            value={asciiSettings.fontWeight}
            min={300}
            max={900}
            step={100}
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('fontWeight', Math.round(v))}
          />
        </div>
      )}

      {/* Tone & Sampling */}
      {renderGroupHeader('tone', 'Tone & Sampling')}
      {openGroups.tone && (
        <div>
          <AsciiSliderRow
            label="Brightness"
            value={asciiSettings.brightness}
            min={-1}
            max={1}
            step={0.05}
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('brightness', v)}
          />
          <AsciiSliderRow
            label="Contrast"
            value={asciiSettings.contrast}
            min={-1}
            max={1}
            step={0.05}
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('contrast', v)}
          />
          <AsciiSliderRow
            label="Gamma"
            value={asciiSettings.gamma}
            min={0.2}
            max={3.0}
            step={0.05}
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('gamma', v)}
          />
          <AsciiSliderRow
            label="Exposure"
            value={asciiSettings.exposure}
            min={-2}
            max={2}
            step={0.1}
            unit="EV"
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('exposure', v)}
          />
          <AsciiSliderRow
            label="Edge Sensitivity"
            value={asciiSettings.edgeSensitivity}
            min={0}
            max={2}
            step={0.05}
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('edgeSensitivity', v)}
          />
          <AsciiSliderRow
            label="Smoothing"
            value={asciiSettings.smoothing}
            min={0}
            max={3}
            step={0.1}
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('smoothing', v)}
          />
          <AsciiSliderRow
            label="Sharpening"
            value={asciiSettings.sharpening}
            min={0}
            max={2}
            step={0.1}
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('sharpening', v)}
          />
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
              Sampling Quality
            </div>
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
          <AsciiToggleRow
            label="Invert Luminance"
            checked={asciiSettings.invert}
            onChange={(v) => setAsciiSetting('invert', v)}
          />
        </div>
      )}

      {/* Color & Background */}
      {renderGroupHeader('color', 'Color & Background')}
      {openGroups.color && (
        <div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
              Color Mode
            </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.76rem', color: 'var(--text-dim)' }}>
              <span>Foreground</span>
              <input
                type="color"
                value={asciiSettings.foregroundColor}
                onChange={(e) => setAsciiSetting('foregroundColor', e.target.value)}
              />
            </div>
          )}
          <AsciiSliderRow
            label="Foreground Opacity"
            value={asciiSettings.foregroundOpacity}
            min={0}
            max={1}
            step={0.05}
            onDragChange={setIsDraggingSlider}
            onChange={(v) => setAsciiSetting('foregroundOpacity', v)}
          />
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
              Background Mode
            </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.76rem', color: 'var(--text-dim)' }}>
              <span>Background</span>
              <input
                type="color"
                value={asciiSettings.backgroundColor}
                onChange={(e) => setAsciiSetting('backgroundColor', e.target.value)}
              />
            </div>
          )}
          {asciiSettings.backgroundMode !== 'transparent' && (
            <AsciiSliderRow
              label="Background Opacity"
              value={asciiSettings.backgroundOpacity}
              min={0}
              max={1}
              step={0.05}
              onDragChange={setIsDraggingSlider}
              onChange={(v) => setAsciiSetting('backgroundOpacity', v)}
            />
          )}
          <AsciiToggleRow
            label="Preserve Source Alpha"
            checked={asciiSettings.preserveAlpha}
            onChange={(v) => setAsciiSetting('preserveAlpha', v)}
          />
          <AsciiToggleRow
            label="Clip Glyphs to Cells"
            checked={asciiSettings.clipping}
            onChange={(v) => setAsciiSetting('clipping', v)}
          />
        </div>
      )}

      {/* ASCII-Specific Effects */}
      {renderGroupHeader('asciiEffects', 'ASCII Effects')}
      {openGroups.asciiEffects && (
        <div>
          {ASCII_EFFECT_DESCRIPTORS.map((desc) => {
            const active = asciiSettings.asciiEffects.find((e) => e.id === desc.id);
            const enabled = Boolean(active?.enabled);
            return (
              <div
                key={desc.id}
                style={{
                  marginBottom: '8px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <AsciiToggleRow
                  label={desc.name}
                  checked={enabled}
                  onChange={() => toggleAsciiEffect(desc.id)}
                />
                {enabled && active && (
                  <div style={{ paddingLeft: '6px' }}>
                    {desc.controls.map((ctrl) => {
                      const val = active.params[ctrl.id] ?? ctrl.defaultValue;
                      if (ctrl.type === 'slider') {
                        return (
                          <AsciiSliderRow
                            key={ctrl.id}
                            label={ctrl.label}
                            value={Number(val)}
                            min={ctrl.min ?? 0}
                            max={ctrl.max ?? 1}
                            step={ctrl.step ?? 0.05}
                            onDragChange={setIsDraggingSlider}
                            onChange={(v) => updateAsciiEffectParam(desc.id, ctrl.id, v)}
                          />
                        );
                      }
                      if (ctrl.type === 'toggle') {
                        return (
                          <AsciiToggleRow
                            key={ctrl.id}
                            label={ctrl.label}
                            checked={Boolean(val)}
                            onChange={(v) => updateAsciiEffectParam(desc.id, ctrl.id, v)}
                          />
                        );
                      }
                      if (ctrl.type === 'select' && ctrl.options) {
                        return (
                          <div key={ctrl.id} style={{ marginBottom: '6px' }}>
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)', marginBottom: '3px' }}>
                              {ctrl.label}
                            </div>
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
  );
};

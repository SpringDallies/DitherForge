import React, { useState, useEffect, useRef, useMemo, useId, useCallback } from 'react';
import { useAppStore } from '../../state/useAppStore';
import { hexToRgba, rgbaToHex } from '../../dither-engine/palettes.js';
import { areAnimationsEnabled } from '../dialogs/SettingsDialog';

// Pure RGB <-> HSL conversions
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

export interface ColorPickerProps {
  id?: string;
  value: string;
  defaultValue?: string;
  onChange: (hex: string) => void;
  className?: string;
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  id,
  value,
  defaultValue,
  onChange,
  className = '',
  disabled = false
}) => {
  const autoId = useId();
  const pickerId = id || autoId;

  const activeDropdownId = useAppStore((state) => state.activeDropdownId);
  const setActiveDropdownId = useAppStore((state) => state.setActiveDropdownId);
  const isOpen = activeDropdownId === pickerId;

  const [isClosing, setIsClosing] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const [copiedHex, setCopiedHex] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  // Parse initial RGB and HSL
  const initialHsl = useMemo(() => {
    try {
      const rgb = hexToRgba(value || '#FFFFFF');
      return rgbToHsl(rgb[0] ?? 255, rgb[1] ?? 255, rgb[2] ?? 255);
    } catch {
      return [0, 0, 100] as [number, number, number];
    }
  }, [value]);

  const [localHsl, setLocalHsl] = useState<[number, number, number]>(initialHsl);
  const currentHslRef = useRef<[number, number, number]>(initialHsl);
  const lastEmittedHexRef = useRef<string>(value || '#FFFFFF');
  const isDraggingRef = useRef<boolean>(false);

  const [inputHex, setInputHex] = useState<string>(
    value ? (value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`) : '#FFFFFF'
  );

  // Keep state synchronized with incoming `value` prop
  useEffect(() => {
    if (!value) return;
    const formatted = value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`;

    // If change is our own internal update or dragging, skip
    if (formatted.toLowerCase() === lastEmittedHexRef.current.toLowerCase() || isDraggingRef.current) {
      return;
    }

    try {
      const rgb = hexToRgba(formatted);
      let targetHsl = rgbToHsl(rgb[0] ?? 255, rgb[1] ?? 255, rgb[2] ?? 255);
      // Preserve hue for achromatic values
      const isTargetAchromatic = targetHsl[1] === 0 || targetHsl[2] === 0 || targetHsl[2] === 100;
      if (isTargetAchromatic) {
        targetHsl = [currentHslRef.current[0], targetHsl[1], targetHsl[2]];
      }
      currentHslRef.current = targetHsl;
      setLocalHsl(targetHsl);
      setInputHex(formatted);
      lastEmittedHexRef.current = formatted;
    } catch {}
  }, [value]);

  const closePicker = useCallback((immediate = false) => {
    if (immediate || !areAnimationsEnabled()) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      setIsClosing(false);
      if (activeDropdownId === pickerId) {
        setActiveDropdownId(null);
      }
    } else {
      setIsClosing(true);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = window.setTimeout(() => {
        setIsClosing(false);
        closeTimerRef.current = null;
        if (activeDropdownId === pickerId) {
          setActiveDropdownId(null);
        }
      }, 120);
    }
  }, [activeDropdownId, pickerId, setActiveDropdownId]);

  const openPicker = useCallback(() => {
    if (disabled) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      setIsClosing(false);
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 280 && rect.top > 280) {
        setDirection('up');
      } else {
        setDirection('down');
      }
    }

    setActiveDropdownId(pickerId);
  }, [disabled, pickerId, setActiveDropdownId]);

  const togglePicker = useCallback(() => {
    if (isOpen) {
      closePicker();
    } else {
      openPicker();
    }
  }, [isOpen, closePicker, openPicker]);

  // Click outside and Escape handling
  useEffect(() => {
    if (!isOpen && !isClosing) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (containerRef.current && containerRef.current.contains(target)) return;
      closePicker(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePicker(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isClosing, closePicker]);

  // Slider change handler
  const handleSliderChange = (type: 'h' | 's' | 'l', val: number) => {
    let [h, s, l] = currentHslRef.current;
    if (type === 'h') h = Math.max(0, Math.min(360, isNaN(val) ? 0 : val));
    if (type === 's') s = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    if (type === 'l') l = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));

    const nextHsl: [number, number, number] = [h, s, l];
    currentHslRef.current = nextHsl;
    setLocalHsl(nextHsl);

    const [r, g, b] = hslToRgb(h, s, l);
    const newHex = rgbaToHex(r, g, b).toUpperCase();
    lastEmittedHexRef.current = newHex;
    setInputHex(newHex);
    onChange(newHex);
  };

  // Text input change handler
  const handleHexTextChange = (text: string) => {
    setInputHex(text);
    const clean = text.trim().replace('#', '');
    if (/^[0-9a-fA-F]{3}$/.test(clean) || /^[0-9a-fA-F]{6}$/.test(clean)) {
      try {
        const rgb = hexToRgba('#' + clean);
        let targetHsl = rgbToHsl(rgb[0] ?? 255, rgb[1] ?? 255, rgb[2] ?? 255);
        const isTargetAchromatic = targetHsl[1] === 0 || targetHsl[2] === 0 || targetHsl[2] === 100;
        if (isTargetAchromatic) {
          targetHsl = [currentHslRef.current[0], targetHsl[1], targetHsl[2]];
        }
        currentHslRef.current = targetHsl;
        setLocalHsl(targetHsl);
        const canonicalHex = rgbaToHex(rgb[0], rgb[1], rgb[2]).toUpperCase();
        lastEmittedHexRef.current = canonicalHex;
        onChange(canonicalHex);
      } catch {}
    }
  };

  const handleHexTextBlur = () => {
    const clean = inputHex.trim().replace('#', '');
    if (/^[0-9a-fA-F]{3}$/.test(clean) || /^[0-9a-fA-F]{6}$/.test(clean)) {
      try {
        const rgb = hexToRgba('#' + clean);
        const canonical = rgbaToHex(rgb[0], rgb[1], rgb[2]).toUpperCase();
        setInputHex(canonical);
        return;
      } catch {}
    }
    // Revert to current valid color
    const [r, g, b] = hslToRgb(localHsl[0], localHsl[1], localHsl[2]);
    setInputHex(rgbaToHex(r, g, b).toUpperCase());
  };

  const safeHsl = localHsl || [0, 0, 100];
  const [pr, pg, pb] = hslToRgb(safeHsl[0] ?? 0, safeHsl[1] ?? 0, safeHsl[2] ?? 100);
  const currentHex = rgbaToHex(pr, pg, pb).toUpperCase();
  const hexLum = (0.2126 * pr + 0.7152 * pg + 0.0722 * pb) / 255;
  const hexTextColor = hexLum > 0.48 ? '#333339' : '#DEDEDE';

  return (
    <div
      ref={containerRef}
      className={`effect-color-input-row ${className}`}
      style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
    >
      {/* Trigger Swatch Button */}
      <button
        type="button"
        className={`effect-swatch-btn ${isOpen ? 'open' : ''}`}
        style={{ backgroundColor: currentHex }}
        onClick={togglePicker}
        title="Open color picker"
        aria-label="Pick color"
        aria-expanded={isOpen}
      />

      {/* Hex Text Input */}
      <div className="effect-hex-input-wrap">
        <input
          type="text"
          className="effect-hex-input"
          value={inputHex}
          spellCheck={false}
          maxLength={7}
          placeholder="#RRGGBB"
          onChange={(e) => handleHexTextChange(e.target.value)}
          onBlur={handleHexTextBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>

      {/* Popover */}
      {(isOpen || isClosing) && (
        <div
          ref={popoverRef}
          className={`effect-color-popover ${direction === 'up' ? 'direction-up' : ''} ${isClosing ? 'closing' : ''}`}
          role="dialog"
          aria-label="Color Picker"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Callout Arrow */}
          <svg className="replica-callout-arrow" viewBox="0 0 16 9">
            <path
              d="M0,9 L8,1 L16,9"
              fill="var(--bg-secondary)"
              stroke="var(--border-color)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <rect x="0.5" y="8" width="15" height="2" fill="var(--bg-secondary)" stroke="none" />
          </svg>

          {/* Large Color Preview Box with Hex */}
          <div
            className={`replica-swatch-preview-box ${isDragging ? 'is-dragging' : ''}`}
            style={{
              backgroundColor: currentHex,
              borderRadius: '12px',
              border: 'none',
              boxShadow: 'none',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              try {
                navigator.clipboard.writeText(currentHex);
              } catch {}
              setCopiedHex(true);
              setTimeout(() => setCopiedHex(false), 1200);
            }}
            title="Click to copy hex code"
          >
            <span className="replica-swatch-hex-text" style={{ color: hexTextColor }}>
              {copiedHex ? 'COPIED!' : currentHex.replace('#', '')}
            </span>
          </div>

          {/* HSL Sliders */}
          <div className="replica-hsl-container">
            {/* H (Hue) */}
            <div className="replica-hsl-row">
              <span className="replica-hsl-label">H</span>
              <input
                type="range"
                className="replica-hsl-slider hue-slider"
                min={0}
                max={360}
                step={1}
                value={safeHsl[0]}
                onPointerDown={(e) => {
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {}
                  isDraggingRef.current = true;
                  setIsDragging(true);
                }}
                onPointerUp={(e) => {
                  try {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                  } catch {}
                  isDraggingRef.current = false;
                  setIsDragging(false);
                }}
                onDoubleClick={() => handleSliderChange('h', 0)}
                onChange={(e) => handleSliderChange('h', parseInt(e.target.value, 10))}
              />
              <span className="replica-hsl-val">{safeHsl[0]}°</span>
            </div>

            {/* S (Saturation) */}
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
                onPointerDown={(e) => {
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {}
                  isDraggingRef.current = true;
                  setIsDragging(true);
                }}
                onPointerUp={(e) => {
                  try {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                  } catch {}
                  isDraggingRef.current = false;
                  setIsDragging(false);
                }}
                onDoubleClick={() => handleSliderChange('s', 100)}
                onChange={(e) => handleSliderChange('s', parseInt(e.target.value, 10))}
              />
              <span className="replica-hsl-val">{safeHsl[1]}%</span>
            </div>

            {/* L (Lightness) */}
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
                onPointerDown={(e) => {
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {}
                  isDraggingRef.current = true;
                  setIsDragging(true);
                }}
                onPointerUp={(e) => {
                  try {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                  } catch {}
                  isDraggingRef.current = false;
                  setIsDragging(false);
                }}
                onDoubleClick={() => handleSliderChange('l', 50)}
                onChange={(e) => handleSliderChange('l', parseInt(e.target.value, 10))}
              />
              <span className="replica-hsl-val">{safeHsl[2]}%</span>
            </div>
          </div>

          {/* Reset Action */}
          {defaultValue && (
            <div className="effect-color-popover-actions">
              <button
                type="button"
                className="effect-color-reset-btn"
                onClick={() => {
                  try {
                    const rgb = hexToRgba(defaultValue);
                    const hsl = rgbToHsl(rgb[0] ?? 255, rgb[1] ?? 255, rgb[2] ?? 255);
                    currentHslRef.current = hsl;
                    setLocalHsl(hsl);
                    const defHex = defaultValue.startsWith('#')
                      ? defaultValue.toUpperCase()
                      : `#${defaultValue.toUpperCase()}`;
                    setInputHex(defHex);
                    lastEmittedHexRef.current = defHex;
                    onChange(defHex);
                  } catch {}
                }}
              >
                Reset to default ({defaultValue.toUpperCase()})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

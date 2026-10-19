import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Tooltip } from './Tooltip';

export interface DropdownItem {
  id: string;
  label: string;
  hint?: string;
}

export interface DropdownProps {
  items: DropdownItem[];
  value: string;
  onChange: (id: string) => void;
  onHoverItem?: (id: string | null) => void;
  onClose?: () => void;
  placeholder?: string;
  className?: string;
  width?: number | string;
  tooltip?: string;
  searchable?: boolean;
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  items,
  value,
  onChange,
  onHoverItem,
  onClose,
  placeholder = 'Select...',
  className = '',
  width,
  tooltip,
  searchable = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === value),
    [items, value]
  );

  const filteredItems = useMemo(() => {
    if (!searchable || !search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.hint && i.hint.toLowerCase().includes(q))
    );
  }, [items, search, searchable]);

  const closeDropdown = () => {
    setIsOpen(false);
    setSearch('');
    onHoverItem?.(null);
    onClose?.();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const triggerButton = (
    <button
      type="button"
      className={`custom-dropdown-trigger ${isOpen ? 'open' : ''}`}
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        e.stopPropagation();
        if (isOpen) {
          closeDropdown();
        } else {
          setIsOpen(true);
          const idx = items.findIndex((i) => i.id === value);
          setFocusedIndex(idx >= 0 ? idx : 0);
        }
      }}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
    >
      <div className="custom-dropdown-content-wrap custom-dropdown-label">
        {selectedItem ? (
          <>
            <span className="custom-dropdown-main-text">{selectedItem.label}</span>
            {selectedItem.hint && (
              <span className="custom-dropdown-hint-text">{selectedItem.hint}</span>
            )}
          </>
        ) : (
          <span className="custom-dropdown-placeholder-text">{placeholder}</span>
        )}
      </div>
    </button>
  );

  return (
    <div
      ref={containerRef}
      className={`custom-dropdown-container ${className}`}
      style={{
        width: width ?? '100%',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}
    >
      {tooltip && !isOpen ? (
        <Tooltip text={tooltip} style={{ width: '100%', display: 'flex' }}>
          {triggerButton}
        </Tooltip>
      ) : (
        triggerButton
      )}

      {isOpen && (
        <div
          ref={panelRef}
          className="custom-dropdown-panel"
          role="listbox"
          data-lenis-prevent
          onWheel={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseLeave={() => onHoverItem?.(null)}
        >
          {searchable && (
            <div className="custom-dropdown-search-container">
              <input
                type="text"
                className="custom-dropdown-search-input"
                placeholder="Search..."
                value={search}
                autoFocus
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {search && (
                <button
                  type="button"
                  className="custom-dropdown-search-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch('');
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )}
          <div className="custom-dropdown-items" data-lenis-prevent>
            {filteredItems.length === 0 ? (
              <div className="custom-dropdown-empty">No options available</div>
            ) : (
              filteredItems.map((item, idx) => {
                const isSelected = item.id === value;
                const isFocused = idx === focusedIndex;
                return (
                  <div
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    className={`custom-dropdown-item ${isSelected ? 'selected' : ''} ${
                      isFocused ? 'focused' : ''
                    }`}
                    onMouseEnter={() => {
                      setFocusedIndex(idx);
                      onHoverItem?.(item.id);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(item.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <span className="custom-dropdown-item-label">{item.label}</span>
                    {item.hint && (
                      <span className="custom-dropdown-item-hint">{item.hint}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

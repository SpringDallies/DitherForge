import React, { useState, useRef, useEffect, useId } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  hint?: string; // optional secondary text (e.g. "16 colors")
}

export interface DropdownProps {
  items: DropdownItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string; // shown when nothing selected
  searchable?: boolean; // default false
  width?: number | string; // default 100% of parent
  disabled?: boolean;
  title?: string;
  defaultOpen?: boolean;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  items,
  value,
  onChange,
  placeholder = 'Select...',
  searchable = false,
  width,
  disabled = false,
  title,
  className = '',
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  const listboxId = useId();

  const selectedItem = items.find((item) => item.id === value);

  const filteredItems = searchable && searchQuery.trim()
    ? items.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.hint && item.hint.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : items;

  // Handle outside click to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle auto-focus and initial scroll when opening
  useEffect(() => {
    if (isOpen) {
      const selectedIdx = filteredItems.findIndex((it) => it.id === value);
      setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);

      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }

      // Scroll selected item into view once on open
      requestAnimationFrame(() => {
        const selectedEl = panelRef.current?.querySelector('[data-selected="true"]');
        if (selectedEl) {
          selectedEl.scrollIntoView({ block: 'nearest' });
        }
      });
    } else {
      setSearchQuery('');
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Keep focused item visible in viewport
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && itemsContainerRef.current) {
      const itemEls = itemsContainerRef.current.querySelectorAll('.custom-dropdown-item');
      if (itemEls[focusedIndex]) {
        (itemEls[focusedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
      return;
    }
  };

  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredItems.length) {
        const item = filteredItems[focusedIndex];
        onChange(item.id);
        setIsOpen(false);
        triggerRef.current?.focus();
      }
      return;
    }
  };

  const selectItem = (item: DropdownItem) => {
    onChange(item.id);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: typeof width === 'number' ? `${width}px` : (width || '100%'),
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
  };

  return (
    <div
      ref={containerRef}
      className={`custom-dropdown-container ${className}`}
      style={containerStyle}
      title={title}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="custom-dropdown-label">
          {selectedItem ? (
            <span className="custom-dropdown-content-wrap">
              <span className="custom-dropdown-main-text">{selectedItem.label}</span>
              {selectedItem.hint && (
                <span className="custom-dropdown-hint-text">{selectedItem.hint}</span>
              )}
            </span>
          ) : (
            <span className="custom-dropdown-placeholder-text">{placeholder}</span>
          )}
        </span>
      </button>

      <div
        ref={panelRef}
        id={listboxId}
        role="listbox"
        className="custom-dropdown-panel"
        style={{ display: isOpen ? 'flex' : 'none' }}
        onWheel={(e) => e.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
      >
        {searchable && (
          <div className="custom-dropdown-search-container">
            <input
              ref={searchInputRef}
              type="text"
              className="custom-dropdown-search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(0);
              }}
              onKeyDown={handlePanelKeyDown}
              tabIndex={isOpen ? 0 : -1}
            />
            {searchQuery && (
              <button
                type="button"
                className="custom-dropdown-search-clear"
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
        )}

        <div
          ref={itemsContainerRef}
          className="custom-dropdown-items"
          tabIndex={-1}
          onKeyDown={handlePanelKeyDown}
        >
          {filteredItems.map((item, idx) => {
            const isSelected = item.id === value;
            const isFocused = idx === focusedIndex;

            return (
              <div
                key={item.id}
                role="option"
                tabIndex={-1}
                aria-selected={isSelected}
                data-selected={isSelected ? 'true' : 'false'}
                className={`custom-dropdown-item ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
                onClick={() => selectItem(item)}
                onMouseEnter={() => setFocusedIndex(idx)}
              >
                <span className="custom-dropdown-item-label">{item.label}</span>
                {item.hint && (
                  <span className="custom-dropdown-item-hint">{item.hint}</span>
                )}
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="custom-dropdown-empty">
              No options available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

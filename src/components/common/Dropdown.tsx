import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useId } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { areAnimationsEnabled } from '../dialogs/SettingsDialog';

export interface DropdownItem {
  id: string;
  label: string;
  hint?: string;
  onDelete?: (e: React.MouseEvent) => void;
}

export interface DropdownProps {
  id?: string;
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
  direction?: 'up' | 'down';
  renderTrigger?: (props: {
    isOpen: boolean;
    selectedItem?: DropdownItem;
    placeholder: string;
    onClick: (e: React.MouseEvent) => void;
  }) => React.ReactNode;
}

export const Dropdown: React.FC<DropdownProps> = ({
  id,
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
  disabled = false,
  direction = 'down',
  renderTrigger
}) => {
  const autoId = useId();
  const dropdownId = id || autoId;

  const activeDropdownId = useAppStore((state) => state.activeDropdownId);
  const setActiveDropdownId = useAppStore((state) => state.setActiveDropdownId);
  const isOpen = activeDropdownId === dropdownId;

  const [isClosing, setIsClosing] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);

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

  const [effectiveDirection, setEffectiveDirection] = useState<'up' | 'down'>(direction);

  const openDropdown = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260 && rect.top > spaceBelow) {
        setEffectiveDirection('up');
      } else {
        setEffectiveDirection('down');
      }
    }
    setActiveDropdownId(dropdownId);
  };

  const closeDropdown = (immediate = false) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (activeDropdownId === dropdownId) {
      setActiveDropdownId(null);
    }
    if (immediate || !areAnimationsEnabled() || (!isOpen && !isClosing)) {
      setIsClosing(false);
      setSearch('');
      onHoverItem?.(null);
      onClose?.();
      return;
    }
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setIsClosing(false);
      setSearch('');
      onHoverItem?.(null);
      onClose?.();
      closeTimerRef.current = null;
    }, 110);
  };

  // If another dropdown opens anywhere in the app, cancel closing and unmount immediately (no overlap!)
  useEffect(() => {
    if (activeDropdownId !== null && activeDropdownId !== dropdownId) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setIsClosing(false);
      setSearch('');
      onHoverItem?.(null);
    }
  }, [activeDropdownId, dropdownId, onHoverItem]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Programmatically focus search input when searchable dropdown opens (preventing scroll jump)
  useEffect(() => {
    if (isOpen && searchable) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchable]);

  // Scroll selected option into view within the dropdown list without scrolling ancestor containers
  useLayoutEffect(() => {
    if (!isOpen) return;
    const scroller = panelRef.current?.querySelector('.custom-dropdown-items') as HTMLElement | null;
    const selected = scroller?.querySelector('[role="option"][aria-selected="true"]') as HTMLElement | null;
    if (scroller && selected) {
      const sTop = selected.offsetTop;
      const sHeight = selected.offsetHeight;
      const cScroll = scroller.scrollTop;
      const cHeight = scroller.clientHeight;
      if (sTop < cScroll) {
        scroller.scrollTop = sTop;
      } else if (sTop + sHeight > cScroll + cHeight) {
        scroller.scrollTop = sTop + sHeight - cHeight;
      }
    }
  }, [isOpen]);

  // Stop native wheel propagation from scrolling the sidebar container underneath
  useEffect(() => {
    const el = panelRef.current;
    if (!el || !isOpen) return;
    const handleNativeWheel = (e: WheelEvent) => {
      e.stopPropagation();
    };
    el.addEventListener('wheel', handleNativeWheel, { passive: true });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        const isClickingOtherDropdown = (e.target as HTMLElement)?.closest?.(
          '.custom-dropdown-container, .algo-listbox-container, .menu-dropdowns'
        );
        closeDropdown(Boolean(isClickingOtherDropdown));
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDropdown(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, activeDropdownId]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    if (isOpen && !isClosing) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  const defaultTriggerButton = (
    <button
      type="button"
      className={`custom-dropdown-trigger ${isOpen && !isClosing ? 'open' : ''}`}
      disabled={disabled}
      onClick={handleTriggerClick}
      aria-haspopup="listbox"
      aria-expanded={isOpen && !isClosing}
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

  const triggerButton = renderTrigger
    ? renderTrigger({
        isOpen: isOpen && !isClosing,
        selectedItem,
        placeholder,
        onClick: handleTriggerClick
      })
    : defaultTriggerButton;

  return (
    <div
      ref={containerRef}
      className={`custom-dropdown-container ${className} ${isOpen && !isClosing ? 'open' : ''}`}
      style={{
        width: width ?? '100%',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        zIndex: (isOpen || isClosing) ? 1000 : undefined
      }}
    >
      {triggerButton}

      {(isOpen || isClosing) && (
        <div
          ref={panelRef}
          className={`custom-dropdown-panel ${effectiveDirection === 'up' ? 'direction-up' : ''} ${searchable ? 'has-search' : 'single-list'} ${isClosing ? 'closing' : ''}`}
          role="listbox"
          data-lenis-prevent
          onWheel={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseLeave={() => onHoverItem?.(null)}
        >
          {searchable ? (
            <>
              <div className="custom-dropdown-search-container">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="custom-dropdown-search-input"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="custom-dropdown-items-card">
                <div className="custom-dropdown-items" data-lenis-prevent>
                  {filteredItems.length === 0 ? (
                    <div className="custom-dropdown-empty">No options available</div>
                  ) : (
                    filteredItems.map((item) => {
                      const isSelected = item.id === value;
                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isSelected}
                          className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                          onMouseEnter={() => {
                            onHoverItem?.(item.id);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onChange(item.id);
                            closeDropdown();
                          }}
                        >
                          <span className="custom-dropdown-item-label">{item.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                            {item.hint && (
                              <span className="custom-dropdown-item-hint">{item.hint}</span>
                            )}
                            {item.onDelete && (
                              <button
                                type="button"
                                className="dropdown-item-delete-btn"
                                title="Delete custom palette"
                                aria-label={`Delete ${item.label}`}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  item.onDelete?.(e);
                                }}
                              >
                                <X size={14} strokeWidth={2.2} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="custom-dropdown-items" data-lenis-prevent>
              {filteredItems.length === 0 ? (
                <div className="custom-dropdown-empty">No options available</div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = item.id === value;
                  return (
                    <div
                      key={item.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                      onMouseEnter={() => {
                        onHoverItem?.(item.id);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(item.id);
                        closeDropdown();
                      }}
                    >
                      <span className="custom-dropdown-item-label">{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                        {item.hint && (
                          <span className="custom-dropdown-item-hint">{item.hint}</span>
                        )}
                        {item.onDelete && (
                          <button
                            type="button"
                            className="dropdown-item-delete-btn"
                            title="Delete custom palette"
                            aria-label={`Delete ${item.label}`}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              item.onDelete?.(e);
                            }}
                          >
                            <X size={14} strokeWidth={2.2} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

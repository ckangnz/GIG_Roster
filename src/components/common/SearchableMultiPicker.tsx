import React, { useState, useRef, useMemo, useEffect } from 'react';

import { Check, X } from 'lucide-react';

import Pill from './Pill';

import styles from './searchable-multi-picker.module.css';

export interface PickerItem {
  id: string;
  label: string;
  emoji?: string;
  color?: string;
}

interface SearchableMultiPickerProps {
  items: PickerItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  placeholder?: string;
  limit?: number;
  emptyMessage?: string;
}

const SearchableMultiPicker: React.FC<SearchableMultiPickerProps> = ({
  items,
  selectedIds,
  onToggle,
  placeholder = "Search...",
  limit = 5,
  emptyMessage = "No items found"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Default color fallback
  const fallbackColor = "var(--color-primary)";

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      return items.slice(0, limit);
    }
    return items
      .filter(item => item.label.toLowerCase().includes(term))
      .slice(0, 20);
  }, [items, searchTerm, limit]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset focused index when filtered items change
  // Note: useEffect with setState is discouraged by React team for performance.
  // We now handle focusedIndex reset manually in onChange and handleToggleWrapper.

  const handleToggleWrapper = (id: string) => {
    onToggle(id);
    setSearchTerm("");
    setFocusedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(0);
      } else {
        setFocusedIndex(prev => (prev + 1) % Math.max(filteredItems.length, 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(Math.max(filteredItems.length - 1, 0));
      } else {
        setFocusedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
      }
    } else if (e.key === "Enter") {
      if (isOpen && filteredItems.length > 0) {
        e.preventDefault();
        handleToggleWrapper(filteredItems[focusedIndex].id);
      }
    } else if (e.key === "Backspace") {
      if (searchTerm === "" && selectedIds.length > 0) {
        handleToggleWrapper(selectedIds[selectedIds.length - 1]);
      }
    } else if (e.key === "Escape" || e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const handleItemClick = (id: string) => {
    handleToggleWrapper(id);
    inputRef.current?.focus();
  };

  const selectedItems = useMemo(() => {
    return selectedIds
      .map(id => items.find(item => item.id === id))
      .filter((item): item is PickerItem => !!item);
  }, [selectedIds, items]);

  return (
    <div className={styles.pickerContainer} ref={containerRef}>
      <div 
        className={`${styles.inputWrapper} ${isOpen ? styles.inputWrapperFocused : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        <div className={styles.selectedPills}>
          {selectedItems.map(item => (
            <Pill
              key={item.id}
              colour={item.color || fallbackColor}
              isActive={true}
              onClick={(e) => e.stopPropagation()}
            >
              {item.emoji && <span className={styles.itemEmoji}>{item.emoji}</span>}
              <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
              <span 
                className={styles.pillDeleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleWrapper(item.id);
                }}
              >
                <X size={12} />
              </span>
            </Pill>
          ))}
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder={selectedItems.length === 0 ? placeholder : ""}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
              setFocusedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
          />
        </div>
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const isSelected = selectedIds.includes(item.id);
              const isFocused = index === focusedIndex;
              const pillColour = item.color || fallbackColor;
              
              return (
                <div
                  key={item.id}
                  className={`
                    ${styles.dropdownItem} 
                    ${isFocused ? styles.dropdownItemFocused : ""}
                    ${isSelected ? styles.dropdownItemSelected : ""}
                  `}
                  onClick={() => handleItemClick(item.id)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <div 
                    className={styles.pillPreview}
                    style={{ 
                      '--pill-bg': `${pillColour}20`, 
                      '--pill-color': pillColour 
                    } as React.CSSProperties}
                  >
                    {item.emoji && <span className={styles.itemEmoji}>{item.emoji}</span>}
                    <span className={styles.itemLabel}>{item.label}</span>
                    {isSelected && (
                      <span className={styles.itemCheck}>
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={styles.emptyState}>{emptyMessage}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableMultiPicker;

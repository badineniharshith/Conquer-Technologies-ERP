"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Loader2 } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface SearchableDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  disabled = false,
  loading = false,
  className = "",
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  // Reset active index whenever filtered list changes or when dropdown opens
  useEffect(() => {
    setActiveIndex(-1);
  }, [search, isOpen]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || loading) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleSelect(filteredOptions[activeIndex].value);
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-left text-xs ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full flex items-center justify-between px-3 py-2 bg-stone-50 border rounded-lg text-left transition-all ${
          isOpen
            ? "border-orange-500 ring-1 ring-orange-500/10 bg-white"
            : "border-stone-250 hover:border-orange-500/50 hover:bg-stone-100/50"
        } ${disabled || loading ? "opacity-55 cursor-not-allowed" : "cursor-pointer"} text-stone-850 font-medium`}
      >
        <span className={selectedOption ? "text-stone-850" : "text-stone-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-full origin-top-right rounded-xl bg-white border border-stone-200 shadow-lg ring-1 ring-black/5 animate-in fade-in-20 duration-100">
          <div className="p-2 border-b border-stone-100 flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-stone-850 placeholder-stone-400 outline-none"
            />
          </div>

          <div
            ref={listRef}
            className="max-h-48 overflow-y-auto p-1 space-y-0.5"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-center text-stone-450 italic text-[11px]">
                No options found
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-orange-500 text-white font-bold"
                        : isActive
                        ? "bg-orange-50 text-orange-700 font-semibold"
                        : "hover:bg-stone-50 text-stone-700 hover:text-stone-900"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

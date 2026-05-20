"use client";

import * as React from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export function Combobox({ options, value, onChange, placeholder = "Select...", onClear }: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="ig-input w-full cursor-pointer"
        style={{ justifyContent: "space-between" }}
      >
        <span className={`truncate ${value ? "text-[var(--ig-fg1)]" : "text-[var(--ig-fg3)]"}`}>
          {value || placeholder}
        </span>
        {onClear && value ? (
          <span onClick={(e) => { e.stopPropagation(); onClear(); }} className="shrink-0 rounded-md p-0.5 hover:bg-[var(--ig-surface-hover)] transition-colors"><X className="w-3.5 h-3.5 text-[var(--ig-fg3)]" /></span>
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--ig-fg3)] shrink-0" />
        )}
      </button>
      {open && (
        <div className="ig-popover absolute left-0 right-0 top-full mt-1 max-h-60 overflow-hidden" style={{ padding: 0 }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--ig-border-light)]">
            <Search className="w-4 h-4 text-[var(--ig-fg3)]" />
            <input
              autoFocus
              className="flex-1 text-[13px] border-none outline-none bg-transparent"
              placeholder="Search or type new..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => { onChange(option); setOpen(false); setSearch(""); }}
                className="w-full text-left px-3 py-1.5 rounded-lg text-[13px] flex items-center justify-between hover:bg-[var(--ig-surface)] transition-colors"
              >
                {option}
                <Check className={`w-3.5 h-3.5 shrink-0 ${value === option ? "opacity-100 text-[var(--ig-primary)]" : "opacity-0"}`} />
              </button>
            ))}
            {filtered.length === 0 && search && (
              <button
                type="button"
                onClick={() => { onChange(search); setOpen(false); setSearch(""); }}
                className="w-full text-left px-3 py-2 text-[13px] text-[var(--ig-primary)] hover:bg-[var(--ig-surface)] rounded-lg transition-colors"
              >
                Add &quot;{search}&quot;
              </button>
            )}
            {filtered.length === 0 && !search && (
              <p className="text-center py-4 text-[12px] text-[var(--ig-fg3)]">No options</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { X, ChevronDown } from "lucide-react";

interface FilterButtonProps {
  icon: React.ReactNode;
  label: string;
  activeLabel?: string;
  active: boolean;
  onClear: () => void;
  children: React.ReactNode;
}

export function FilterButton({ icon, label, activeLabel, active, onClear, children }: FilterButtonProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {active ? (
        <button onClick={() => setOpen(!open)} className="ig-btn ig-btn-md ig-btn-primary flex items-center gap-2">
          {icon}
          <span>{activeLabel || label}</span>
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
            className="ml-1 rounded-md p-0.5 hover:bg-white/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        </button>
      ) : (
        <button onClick={() => setOpen(!open)} className="ig-btn ig-btn-md ig-btn-secondary flex items-center gap-2">
          {icon}
          {label}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}
      {open && (
        <div className="ig-popover absolute right-0 top-full mt-1" style={{ padding: 4, minWidth: 160 }}>
          <FilterCloseContext.Provider value={() => setOpen(false)}>
            {children}
          </FilterCloseContext.Provider>
        </div>
      )}
    </div>
  );
}

// Context to let FilterOption close the dropdown
const FilterCloseContext = React.createContext<() => void>(() => {});

interface FilterOptionProps {
  label: string;
  onClick: () => void;
}

export function FilterOption({ label, onClick }: FilterOptionProps) {
  const close = React.useContext(FilterCloseContext);
  return (
    <button
      onClick={() => { onClick(); close(); }}
      className="w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors"
      style={{ color: "var(--ig-fg1)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ig-surface-raised)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );
}

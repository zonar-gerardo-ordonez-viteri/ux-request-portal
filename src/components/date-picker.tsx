"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DatePicker({ value, onChange, placeholder = "Select date" }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const today = new Date();
  const selected = value ? new Date(value + "T00:00:00") : null;
  const [viewYear, setViewYear] = React.useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(selected?.getMonth() ?? today.getMonth());
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function selectDay(day: number) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  }

  function isSelected(day: number) {
    return selected && selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === day;
  }
  function isToday(day: number) {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  }

  const displayValue = selected
    ? `${MONTHS[selected.getMonth()]} ${selected.getDate()}, ${selected.getFullYear()}`
    : "";

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(!open)} className="ig-input w-full cursor-pointer" style={{ justifyContent: "space-between" }}>
        <span style={{ color: displayValue ? "var(--ig-fg1)" : "var(--ig-fg3)" }}>{displayValue || placeholder}</span>
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--ig-fg3)", transform: "rotate(90deg)" }} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={popoverRef} className="ig-popover fixed w-[280px]" style={{ padding: 12, zIndex: 100, top: pos.top, left: pos.left }}>
          <div className="flex items-center justify-between mb-2">
            <button className="ig-iconbtn" style={{ width: 28, height: 28 }} onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-[13px] font-semibold" style={{ color: "var(--ig-fg1)" }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button className="ig-iconbtn" style={{ width: 28, height: 28 }} onClick={nextMonth}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-medium py-1" style={{ color: "var(--ig-fg3)" }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    className="w-8 h-8 rounded-lg text-[12px] transition-colors flex items-center justify-center"
                    style={{
                      background: isSelected(day) ? "var(--ig-primary)" : "transparent",
                      color: isSelected(day) ? "#fff" : isToday(day) ? "var(--ig-primary)" : "var(--ig-fg1)",
                      fontWeight: isToday(day) || isSelected(day) ? 600 : 400,
                    }}
                    onMouseEnter={(e) => { if (!isSelected(day)) e.currentTarget.style.background = "var(--ig-surface-raised)"; }}
                    onMouseLeave={(e) => { if (!isSelected(day)) e.currentTarget.style.background = "transparent"; }}
                  >
                    {day}
                  </button>
                ) : <div className="w-8 h-8" />}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

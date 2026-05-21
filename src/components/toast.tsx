"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, X, Info } from "lucide-react";

type ToastType = "error" | "success" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = React.createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

const ICONS = { error: AlertCircle, success: CheckCircle2, info: Info };
const COLORS: Record<ToastType, { bg: string; icon: string }> = {
  error: { bg: "var(--ig-error-light)", icon: "var(--ig-error)" },
  success: { bg: "rgba(46,125,50,0.22)", icon: "#66BB6A" },
  info: { bg: "rgba(0,91,248,0.22)", icon: "var(--ig-primary)" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  function addToast(type: ToastType, message: string) {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2" style={{ maxWidth: 400 }}>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          const color = COLORS[t.type];
          return (
            <div key={t.id} className="flex items-start gap-3 rounded-lg px-4 py-3" style={{ background: "var(--ig-surface)", border: "1px solid var(--ig-border-strong)", boxShadow: "var(--ig-shadow-lg)", animation: "ig-fade-in 0.15s ease" }}>
              <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: color.icon }} />
              <p className="text-[13px] flex-1" style={{ color: "var(--ig-fg1)" }}>{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="shrink-0 mt-0.5" style={{ color: "var(--ig-fg3)" }}><X className="w-3.5 h-3.5" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

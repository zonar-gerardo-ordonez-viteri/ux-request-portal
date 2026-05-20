"use client";

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4" style={{ paddingTop: 64, paddingBottom: 64 }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--ig-surface-raised)" }}>
        <Icon className="w-6 h-6" style={{ color: "var(--ig-fg3)" }} />
      </div>
      <h4 className="text-[14px] font-semibold mb-1" style={{ color: "var(--ig-fg1)" }}>{title}</h4>
      <p className="text-[13px] text-center max-w-xs" style={{ color: "var(--ig-fg3)" }}>{description}</p>
      {action && (
        <button className="ig-btn ig-btn-sm ig-btn-primary mt-4" onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  );
}

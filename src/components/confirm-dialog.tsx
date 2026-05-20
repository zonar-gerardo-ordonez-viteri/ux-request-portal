"use client";

import * as React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <>
      <div className="ig-overlay" style={{ zIndex: 60 }} onClick={onCancel} />
      <div className="ig-dialog" style={{ zIndex: 60, maxWidth: 400 }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: danger ? "var(--ig-error-light)" : "var(--ig-warning-light)" }}>
            <AlertTriangle className="w-[18px] h-[18px]" style={{ color: danger ? "var(--ig-error)" : "var(--ig-warning)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold" style={{ color: "var(--ig-fg1)" }}>{title}</h3>
            <p className="text-[13px] mt-1" style={{ color: "var(--ig-fg2)" }}>{message}</p>
          </div>
          <button className="ig-iconbtn" style={{ width: 28, height: 28 }} onClick={onCancel}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button className="ig-btn ig-btn-md ig-btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={`ig-btn ig-btn-md ${danger ? "ig-btn-danger" : "ig-btn-primary"}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </>
  );
}

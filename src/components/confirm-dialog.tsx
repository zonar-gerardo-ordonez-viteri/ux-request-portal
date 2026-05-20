"use client";

import * as React from "react";
import { Modal, ModalActions } from "@/components/modal";
import { AlertTriangle } from "lucide-react";

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
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: danger ? "var(--ig-error)" : "var(--ig-warning)" }} />
        <p className="text-[13px]" style={{ color: "var(--ig-fg2)" }}>{message}</p>
      </div>
      <ModalActions>
        <button className="ig-btn ig-btn-md ig-btn-secondary flex-1" onClick={onCancel}>Cancel</button>
        <button className={`ig-btn ig-btn-md flex-1 ${danger ? "ig-btn-danger" : "ig-btn-primary"}`} onClick={onConfirm}>{confirmLabel}</button>
      </ModalActions>
    </Modal>
  );
}

"use client";

import * as React from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleExtra?: React.ReactNode;
  headerActions?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, titleExtra, headerActions, size = "md", children }: ModalProps) {
  if (!open) return null;

  const maxWidth = size === "sm" ? 380 : size === "lg" ? 640 : 480;

  return (
    <>
      <div className="ig-overlay" onClick={onClose} />
      <div className="ig-dialog" style={{ maxWidth }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-[15px] font-semibold truncate" style={{ color: "var(--ig-fg1)" }}>{title}</h3>
            {titleExtra}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {headerActions}
            <button className="ig-iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </>
  );
}

interface ModalActionsProps {
  children: React.ReactNode;
}

export function ModalActions({ children }: ModalActionsProps) {
  return <div className="flex gap-2 mt-5">{children}</div>;
}

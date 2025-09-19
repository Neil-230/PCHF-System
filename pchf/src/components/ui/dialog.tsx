"use client";

import * as React from "react";
import { XIcon } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

interface DialogFooterProps {
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
}

// Root Dialog Component
export function Dialog({ open, onClose, children }: DialogProps) {
  if (!open) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50"
      style={{ zIndex: 1050 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded shadow p-4 position-relative"
        style={{ maxWidth: "600px", width: "90%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <button
          type="button"
          className="btn-close position-absolute top-2 end-2"
          onClick={onClose}
        >
          <XIcon />
        </button>
      </div>
    </div>
  );
}

// Header
export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="mb-3">{children}</div>;
}

// Footer
export function DialogFooter({ children }: DialogFooterProps) {
  return <div className="d-flex justify-content-end gap-2 mt-3">{children}</div>;
}

// Title
export function DialogTitle({ children }: DialogTitleProps) {
  return <h5 className="fw-bold">{children}</h5>;
}

// Description
export function DialogDescription({ children }: DialogDescriptionProps) {
  return <p className="text-muted">{children}</p>;
}

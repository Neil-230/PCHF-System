"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

type SelectProps = {
  label?: string;
  size?: "sm" | "lg" | "default";
  options?: Option[]; // optional (Bootstrap style)
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children?: React.ReactNode; // optional (Radix style)
};

export function BootstrapSelect({
  label,
  size = "default",
  options,
  value,
  onChange,
  disabled = false,
  children,
}: SelectProps) {
  const sizeClass =
    size === "sm" ? "form-select-sm" : size === "lg" ? "form-select-lg" : "";

  return (
    <div className="">
      {label && <label className="form-label fw-semibold ">{label}</label>}
        <select
          className={`form-select border-muted ${sizeClass}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {/*  If options are passed, use them */}
          {options &&
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}

          {/* If children are passed, render them */}
          {children}
        </select>

        <span className="position-absolute top-50 end-0 translate-middle-y pe-3">
          <ChevronDown size={16} className="opacity-50" />
        </span>
    </div>
  );
}

export { BootstrapSelect as Select };

type SelectItemProps = {
  value: string;
  children: React.ReactNode;
};

export function SelectItem({ value, children }: SelectItemProps) {
  return <option value={value}>{children}</option>;
}

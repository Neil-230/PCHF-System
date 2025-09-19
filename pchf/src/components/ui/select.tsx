"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
  placeholder?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export function Select({ value, onChange, children, placeholder }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(value || "");

  const handleSelect = (val: string) => {
    setSelected(val);
    onChange?.(val);
    setOpen(false);
  };

  return (
    <div
      className="dropdown"
      tabIndex={0}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen(!open)}
    >
      <button
        className="btn btn-outline-secondary d-flex justify-content-between align-items-center w-100"
        type="button"
      >
        {selected || placeholder || "Select..."}
        <ChevronDownIcon size={16} />
      </button>

      {open && (
        <ul className="dropdown-menu show w-100 mt-0">
          {React.Children.map(children, (child) => {
            if (
              React.isValidElement<
                SelectItemProps & { onSelect?: (val: string) => void; selected?: string }
              >(child) &&
              child.type === SelectItem
            ) {
              return React.cloneElement(child, {
                onSelect: handleSelect,
                selected,
              });
            }
            return child;
          })}
        </ul>
      )}
    </div>
  );
}

export function SelectItem({
  value,
  children,
  onSelect,
  selected,
}: SelectItemProps & { onSelect?: (val: string) => void; selected?: string }) {
  const isSelected = selected === value;

  return (
    <li
      className={`dropdown-item d-flex justify-content-between align-items-center ${
        isSelected ? "active" : ""
      }`}
      onClick={() => onSelect?.(value)}
      style={{ cursor: "pointer" }}
    >
      {children}
      {isSelected && <CheckIcon size={16} />}
    </li>
  );
}

export function SelectLabel({ children }: { children: React.ReactNode }) {
  return <h6 className="dropdown-header">{children}</h6>;
}

export function SelectSeparator() {
  return <div className="dropdown-divider" />;
}

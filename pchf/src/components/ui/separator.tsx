"use client";

import * as React from "react";

interface SeparatorProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

export function Separator({
  className = "",
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps & React.HTMLAttributes<HTMLDivElement>) {
  if (!decorative) return null;

  const baseClass =
    orientation === "horizontal"
      ? `border-top my-2 w-100 ${className}`
      : `border-start mx-2 h-100 ${className}`;

  return <div data-slot="separator-root" className={baseClass} {...props} />;
}

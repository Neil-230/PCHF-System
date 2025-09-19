import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "outline" | "link";
type ButtonSize = "sm" | "lg" | "default";

interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

function Button({
  className = "",
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp: any = asChild ? "span" : "button"; // simplified Slot replacement

  // Base Bootstrap class
  let classes = "btn";

  // Variants
  if (variant === "primary") classes += " btn-primary";
  if (variant === "secondary") classes += " btn-secondary";
  if (variant === "danger") classes += " btn-danger";
  if (variant === "outline") classes += " btn-outline-primary";
  if (variant === "link") classes += " btn-link";

  // Sizes
  if (size === "sm") classes += " btn-sm";
  if (size === "lg") classes += " btn-lg";

  // Merge with user-provided className
  if (className) classes += " " + className;

  return <Comp className={classes} {...props} />;
}

export { Button };

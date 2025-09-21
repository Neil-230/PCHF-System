import * as React from "react";
import {Slot} from "@radix-ui/react-slot"

const badgeVariants = {
  default:"badge bg-dark text-light",
  secondary: "badge bg-secondary text-light",
  destructive: "badge bg-danger text-light",
  outline: "badge border border-dark text-dark bg-transparent",
};

type BadgeProps = React.ComponentProps<"span"> & {
  variant?: keyof typeof badgeVariants;
  asChild?: boolean;
}

function Badge({
  className ="",
  variant ="default",
  asChild = false,
  ...props
}: BadgeProps){
  const Comp = asChild? Slot : "span";

  return(
      <Comp
      data-slot="badge"
      className={`${badgeVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export {Badge, badgeVariants };
import type React from "react";

function Skeleton({className, ...props }: React.ComponentProps<"div">) {
  return(
    <div
      data-slot="skeleton"
      className={`bg-secondary rounded skeleton-loader ${className}`}
      {...props}
    />
  )
}

export {Skeleton};
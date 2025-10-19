import type React from "react";


//pwedi namanjud unta wala ni, wamani pulos
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
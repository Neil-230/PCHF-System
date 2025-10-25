"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

function Avatar ({
  className = "",
  ...props
}:React.ComponentProps<typeof AvatarPrimitive.Root>){
    return (
      <AvatarPrimitive.Root
      data-slot="avatar"
      className={`d-flex rounded-circle overflow-hidden ${className}`}
      style={{width:"40px", height:"40px"}}
      {...props}
    />
  )
};

function AvatarImage({
  className = "",
  ...props
}: React.ComponentProps <typeof AvatarPrimitive.Image>) {
  return (
      <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={`w-100 h-100 object-fit-cover ${className}`}
      {...props}
    />
  );
}

function AvatarFallback({
  className = "",
  ...props
}:React.ComponentProps <typeof AvatarPrimitive.Fallback>){
  return(
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={`d-flex w-100 h-100 align-items-center justify-content-center rounded-circle bg-light text-secondary fw-medium ${className}`}
      {...props}
    />
  );
}


export { Avatar, AvatarImage, AvatarFallback};
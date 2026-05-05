import * as React from "react";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={`form-control ${className || ""}`}
      style={{
        resize: "none",
        minHeight: "4rem", // min-h-16
        width: "100%", // w-full
        borderRadius: "0.375rem", // rounded-md
        padding: "0.5rem 0.75rem", // py-2 px-3
        fontSize: "1rem", // text-base
        transition: "color 0.2s, box-shadow 0.2s", // transition
        outline: "none",
      }}
      {...props}
    />
  );
}

export { Textarea };
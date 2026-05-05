"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";

function InputOTP({
  className = "",
  containerClassName = "",
  ...props
}: React.ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={`d-flex gap-2 ${containerClassName}`}
      className={`form-control ${className}`}
      {...props}
    />
  );
}

function InputOTPGroup({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-group" className={`d-flex gap-1 ${className}`} {...props} />
  );
}

function InputOTPSlot({
  index,
  className = "",
  ...props
}: React.ComponentProps<"div"> & { index: number }) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={`border rounded d-flex align-items-center justify-content-center position-relative ${className}`}
      style={{ width: "2.25rem", height: "2.25rem" }}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="position-absolute top-0 start-50 translate-middle-x d-flex align-items-center justify-content-center">
          <div
            className="bg-dark"
            style={{ width: "1px", height: "1rem", animation: "blink 1s infinite" }}
          />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props} className="d-flex align-items-center">
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };

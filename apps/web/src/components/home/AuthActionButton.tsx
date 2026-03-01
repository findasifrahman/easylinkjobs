"use client";

import Button, { type ButtonProps } from "@mui/material/Button";

import { trackEvent } from "@/components/tracking/TrackingProvider";

type Props = ButtonProps & {
  eventName: "signup" | "login" | "apply" | "forgot_password" | "reset_password";
};

export function AuthActionButton({ eventName, onClick, ...props }: Props) {
  return (
    <Button
      {...props}
      type={props.type ?? "button"}
      onClick={(event) => {
        try {
          void trackEvent(eventName, { source: "ui_cta" });
        } catch {
          // Never block the primary auth action on analytics failures.
        }
        onClick?.(event);
      }}
    />
  );
}

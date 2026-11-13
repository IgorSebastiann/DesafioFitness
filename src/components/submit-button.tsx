"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { buttonStyles } from "@/components/ui";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={buttonStyles(variant, "lg", `w-full ${className ?? ""}`)}
    >
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          {pendingLabel ?? "Aguarde..."}
        </>
      ) : (
        children
      )}
    </button>
  );
}

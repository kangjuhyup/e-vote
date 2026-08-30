import * as React from "react";

import { cn } from "@/shared/lib/utils";

interface TextFieldProps
  extends Omit<React.ComponentProps<"input">, "aria-invalid" | "id"> {
  error?: string;
  hint?: string;
  id: string;
  label: string;
}

export function TextField({
  className,
  error,
  hint,
  id,
  label,
  ...props
}: TextFieldProps) {
  const descriptionId = hint || error ? `${id}-description` : undefined;

  return (
    <div className="grid gap-2 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        className={cn(
          "h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className,
        )}
        {...props}
      />
      {hint || error ? (
        <span
          id={descriptionId}
          className={cn(
            "text-xs font-normal text-muted-foreground",
            error && "text-destructive",
          )}
        >
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}

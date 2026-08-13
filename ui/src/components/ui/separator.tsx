import * as React from "react";

import { cn } from "@/shared/lib/utils";

interface SeparatorProps extends React.ComponentProps<"div"> {
  decorative?: boolean;
  orientation?: "horizontal" | "vertical";
}

function Separator({
  className,
  decorative = true,
  orientation = "horizontal",
  ...props
}: SeparatorProps) {
  return (
    <div
      data-slot="separator"
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "bg-border shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };

import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  label: string;
  variant?: ComponentProps<typeof Badge>["variant"];
}

export function StatusBadge({ label, variant = "secondary" }: StatusBadgeProps) {
  return <Badge variant={variant}>{label}</Badge>;
}

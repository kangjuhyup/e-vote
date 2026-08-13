import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface VoteSummaryCardProps {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
}

export function VoteSummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: VoteSummaryCardProps) {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

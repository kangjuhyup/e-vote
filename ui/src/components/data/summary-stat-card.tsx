import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface SummaryStatCardProps {
  description: string;
  icon: LucideIcon;
  label: string;
  value: number | string;
}

export function SummaryStatCard({
  description,
  icon: Icon,
  label,
  value,
}: SummaryStatCardProps) {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-md bg-secondary p-2 text-secondary-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}

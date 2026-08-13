import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateCardProps {
  action?: ReactNode;
  description?: string;
  title: string;
}

export function EmptyStateCard({
  action,
  description,
  title,
}: EmptyStateCardProps) {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium">{title}</p>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

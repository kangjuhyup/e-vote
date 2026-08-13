import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RetryErrorCardProps {
  description: string;
  onRetry: () => void;
  retryLabel?: string;
  title: string;
}

export function RetryErrorCard({
  description,
  onRetry,
  retryLabel = "다시 시도",
  title,
}: RetryErrorCardProps) {
  return (
    <Card className="rounded-lg border-destructive/30">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          {retryLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

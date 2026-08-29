import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";

interface SkeletonCardGridProps {
  className?: string;
  count: number;
}

export function SkeletonCardGrid({ className, count }: SkeletonCardGridProps) {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="rounded-lg">
          <CardContent className="space-y-4">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-16 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

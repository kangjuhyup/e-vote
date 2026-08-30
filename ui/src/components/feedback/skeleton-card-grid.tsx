import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";

interface SkeletonCardGridProps {
  className?: string;
  count: number;
  label?: string;
}

export function SkeletonCardGrid({
  className,
  count,
  label = "콘텐츠를 불러오는 중…",
}: SkeletonCardGridProps) {
  return (
    <div
      className={cn("grid gap-4", className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="rounded-lg">
          <CardContent className="space-y-4">
            <div className="h-4 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-8 w-16 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

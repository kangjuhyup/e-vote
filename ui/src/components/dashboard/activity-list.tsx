import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DashboardActivity,
  DashboardDensity,
} from "@/features/dashboard/model/dashboard.types";
import { cn } from "@/shared/lib/utils";

interface ActivityListProps {
  activities: DashboardActivity[];
  density: DashboardDensity;
}

const statusLabels = {
  stable: "정상",
  attention: "확인 필요",
  pending: "대기",
} satisfies Record<DashboardActivity["status"], string>;

const statusVariants = {
  stable: "default",
  attention: "destructive",
  pending: "secondary",
} as const satisfies Record<
  DashboardActivity["status"],
  React.ComponentProps<typeof Badge>["variant"]
>;

export function ActivityList({ activities, density }: ActivityListProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>운영 이벤트</CardTitle>
        <CardDescription>최근 투표 운영 상태와 확인 항목</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={cn(
                "grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center",
                density === "compact" && "py-3",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {activity.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activity.detail}
                </p>
              </div>
              <Badge variant={statusVariants[activity.status]}>
                {statusLabels[activity.status]}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

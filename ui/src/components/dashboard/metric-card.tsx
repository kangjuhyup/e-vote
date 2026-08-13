import { Activity, CheckCircle2, Clock3 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardMetric } from "@/features/dashboard/model/dashboard.types";
import { cn } from "@/shared/lib/utils";

interface MetricCardProps {
  metric: DashboardMetric;
}

const toneStyles = {
  default: {
    icon: Activity,
    className: "bg-secondary text-secondary-foreground",
  },
  success: {
    icon: CheckCircle2,
    className: "bg-accent text-accent-foreground",
  },
  warning: {
    icon: Clock3,
    className: "bg-amber-100 text-amber-900",
  },
} satisfies Record<
  DashboardMetric["tone"],
  { icon: typeof Activity; className: string }
>;

export function MetricCard({ metric }: MetricCardProps) {
  const tone = toneStyles[metric.tone];
  const Icon = tone.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm text-muted-foreground">
          {metric.label}
        </CardTitle>
        <span className={cn("rounded-md p-2", tone.className)}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-normal">
          {metric.value}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{metric.delta}</p>
      </CardContent>
    </Card>
  );
}

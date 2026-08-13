import { LayoutDashboard, ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  DashboardDensity,
  VoteStatusFilter,
} from "@/features/dashboard/model/dashboard.types";

interface OperationsPanelProps {
  density: DashboardDensity;
  onDensityChange: (density: DashboardDensity) => void;
  onStatusFilterChange: (statusFilter: VoteStatusFilter) => void;
  statusFilter: VoteStatusFilter;
}

const statusFilters = [
  { label: "전체", value: "all" },
  { label: "초안", value: "draft" },
  { label: "진행", value: "open" },
  { label: "종료", value: "closed" },
  { label: "취소", value: "canceled" },
] satisfies Array<{ label: string; value: VoteStatusFilter }>;

const densityFilters = [
  { label: "기본", value: "comfortable" },
  { label: "압축", value: "compact" },
] satisfies Array<{ label: string; value: DashboardDensity }>;

export function OperationsPanel({
  density,
  onDensityChange,
  onStatusFilterChange,
  statusFilter,
}: OperationsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>운영 보기</CardTitle>
        <CardDescription>투표 상태와 화면 밀도를 조정합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <section aria-label="투표 상태 필터" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ListFilter className="size-4" aria-hidden="true" />
            상태
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                variant={statusFilter === filter.value ? "default" : "outline"}
                size="sm"
                aria-pressed={statusFilter === filter.value}
                onClick={() => onStatusFilterChange(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </section>

        <Separator />

        <section aria-label="화면 밀도" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <LayoutDashboard className="size-4" aria-hidden="true" />
            밀도
          </div>
          <div className="flex flex-wrap gap-2">
            {densityFilters.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                variant={density === filter.value ? "default" : "outline"}
                size="sm"
                aria-pressed={density === filter.value}
                onClick={() => onDensityChange(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

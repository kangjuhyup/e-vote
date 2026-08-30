import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Vote,
} from "lucide-react";

import { SummaryStatCard } from "@/components/data/summary-stat-card";
import type { VoteDashboardMetrics } from "@/features/votes/model/vote.types";

interface VoteDashboardMetricsGridProps {
  metrics: VoteDashboardMetrics;
}

export function VoteDashboardMetricsGrid({
  metrics,
}: VoteDashboardMetricsGridProps) {
  return (
    <section
      aria-labelledby="dashboard-metrics-title"
      className="grid gap-4 md:grid-cols-4"
    >
      <h2 id="dashboard-metrics-title" className="sr-only">
        투표 운영 지표
      </h2>
      <SummaryStatCard
        label="진행 중"
        value={metrics.activeVotes}
        description="현재 참여 가능한 투표"
        icon={Vote}
      />
      <SummaryStatCard
        label="진행 예정"
        value={metrics.scheduledVotes}
        description="시작 대기 중인 투표"
        icon={CalendarClock}
      />
      <SummaryStatCard
        label="종료"
        value={metrics.completedVotes}
        description="집계 완료 대상"
        icon={CheckCircle2}
      />
      <SummaryStatCard
        label="평균 참여율"
        value={metrics.averageParticipationRate}
        description="투표별 참여율 평균"
        icon={BarChart3}
      />
    </section>
  );
}

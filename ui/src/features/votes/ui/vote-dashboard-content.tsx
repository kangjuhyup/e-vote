import type { VoteDashboard } from "@/features/votes/model/vote.types";

import { VoteActivityCard } from "./vote-activity-card";
import { VoteDashboardMetricsGrid } from "./vote-dashboard-metrics";
import { VoteSummarySection } from "./vote-summary-section";

interface VoteDashboardContentProps {
  dashboard: VoteDashboard;
}

export function VoteDashboardContent({
  dashboard,
}: VoteDashboardContentProps) {
  return (
    <>
      <VoteDashboardMetricsGrid metrics={dashboard.metrics} />

      <section className="grid gap-4 lg:grid-cols-2">
        <VoteSummarySection
          title="현재 진행 중인 투표"
          emptyLabel="진행 중인 투표가 없습니다."
          votes={dashboard.activeVotes}
        />
        <VoteSummarySection
          title="진행 예정 중인 투표"
          emptyLabel="예정된 투표가 없습니다."
          votes={dashboard.upcomingVotes}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <VoteSummarySection
          title="참여율 확인 필요"
          emptyLabel="참여율 확인이 필요한 투표가 없습니다."
          votes={dashboard.attentionVotes}
        />
        <VoteActivityCard activities={dashboard.recentActivities} />
      </section>
    </>
  );
}

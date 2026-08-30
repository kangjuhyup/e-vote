import type { VoteDashboard } from "@/features/votes/model/vote.types";
import { formatKoreanDateTime } from "@/shared/lib/date-format";

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
      {dashboard.generatedAt ? (
        <p className="text-right text-xs tabular-nums text-muted-foreground">
          데이터 기준: {" "}
          <time dateTime={dashboard.generatedAt}>
            {formatKoreanDateTime(dashboard.generatedAt)}
          </time>
        </p>
      ) : null}
      <VoteDashboardMetricsGrid metrics={dashboard.metrics} />

      <section aria-label="주요 투표" className="grid gap-4 lg:grid-cols-2">
        <VoteSummarySection
          title="현재 진행 중인 투표"
          emptyLabel="진행 중인 투표가 없습니다."
          votes={dashboard.activeVotes}
        />
        <VoteSummarySection
          title="진행 예정 투표"
          emptyLabel="예정된 투표가 없습니다."
          votes={dashboard.upcomingVotes}
        />
      </section>

      <section
        aria-label="운영 주의 사항"
        className="grid gap-4 lg:grid-cols-[1fr_360px]"
      >
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

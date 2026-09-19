import type { VoteDashboard } from "@/features/votes/model/vote.types";
import { formatKoreanDateTime } from "@/shared/lib/date-format";

import { VoteDashboardCharts } from "./vote-dashboard-charts";
import { VotePaymentAttention } from "./vote-payment-attention";
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
      {dashboard.paymentAttentionVotes.length > 0 ? (
        <VotePaymentAttention votes={dashboard.paymentAttentionVotes} />
      ) : null}
      <VoteDashboardCharts
        activeVotes={dashboard.activeVotes}
        metrics={dashboard.metrics}
      />

      {dashboard.upcomingVotes.length > 0 ? (
        <section aria-label="예정 투표">
          <VoteSummarySection
            title="진행 예정 투표"
            emptyLabel="예정된 투표가 없습니다."
            votes={dashboard.upcomingVotes}
          />
        </section>
      ) : null}
    </>
  );
}

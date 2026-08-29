"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { voteDashboardQueryOptions } from "@/features/votes/api/votes-query-options";

import { VoteDashboardContent } from "../ui/vote-dashboard-content";

export function VoteDashboardContainer() {
  const dashboardQuery = useQuery(voteDashboardQueryOptions());
  const dashboard = dashboardQuery.data;

  return (
    <PageShell
      eyebrow="Vote Operations"
      title="투표 대시보드"
      description="진행 중인 투표, 예정 투표, 참여율이 낮은 투표를 한 화면에서 확인합니다."
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => dashboardQuery.refetch()}
          disabled={dashboardQuery.isFetching}
        >
          <RefreshCw
            className={dashboardQuery.isFetching ? "animate-spin" : ""}
            aria-hidden="true"
          />
          새로고침
        </Button>
      }
    >
      {dashboardQuery.isLoading ? (
        <SkeletonCardGrid count={4} className="md:grid-cols-4" />
      ) : dashboardQuery.isError ? (
        <RetryErrorCard
          title="대시보드 데이터를 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => dashboardQuery.refetch()}
        />
      ) : dashboard ? (
        <VoteDashboardContent dashboard={dashboard} />
      ) : null}
    </PageShell>
  );
}

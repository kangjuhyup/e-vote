"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { voteDashboardQueryOptions } from "@/features/votes/api/votes-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";

import { VoteDashboardContent } from "../ui/vote-dashboard-content";
import { VoteNavigation } from "../ui/vote-navigation";

interface VoteDashboardContainerProps {
  account?: ReactNode;
}

export function VoteDashboardContainer({ account }: VoteDashboardContainerProps) {
  const dashboardQuery = useQuery(voteDashboardQueryOptions());
  const dashboard = dashboardQuery.data;

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation current="dashboard" isMockMode={isVoteApiMockMode()} />
      }
      eyebrow="운영 현황"
      title="투표 대시보드"
      description="진행 중인 투표와 시작 전 결제·확정 확인이 필요한 투표를 한 화면에서 확인합니다."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/votes/new">
              <Plus aria-hidden="true" />
              투표 생성
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => dashboardQuery.refetch()}
            disabled={dashboardQuery.isFetching}
          >
            <RefreshCw
              className={
                dashboardQuery.isFetching ? "motion-safe:animate-spin" : ""
              }
              aria-hidden="true"
            />
            <span aria-live="polite">
              {dashboardQuery.isFetching ? "새로고침 중…" : "새로고침"}
            </span>
          </Button>
        </div>
      }
    >
      {dashboardQuery.isLoading ? (
        <SkeletonCardGrid
          count={2}
          className="lg:grid-cols-2"
          label="대시보드를 불러오는 중…"
        />
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

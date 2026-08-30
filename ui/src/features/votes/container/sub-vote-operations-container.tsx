"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyStateCard } from "@/components/feedback/empty-state-card";
import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { subVoteOperationsQueryOptions } from "@/features/votes/api/vote-operations-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";

import { SubVoteOperationsView } from "../ui/sub-vote-operations-view";
import { VoteNavigation } from "../ui/vote-navigation";

interface SubVoteOperationsContainerProps {
  account?: ReactNode;
  voteDetailId: string;
  voteId: string;
}

export function SubVoteOperationsContainer({ account, voteDetailId, voteId }: SubVoteOperationsContainerProps) {
  const operationsQuery = useQuery(
    subVoteOperationsQueryOptions(voteId, voteDetailId),
  );

  return (
    <PageShell
      account={account}
      navigation={<VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />}
      eyebrow="자식 투표 운영"
      title="투표율과 결과"
      description="자식 투표의 정책, 후보자, 투표율과 종료 결과를 확인합니다."
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href={`/votes/${voteId}`}><ArrowLeft aria-hidden="true" />투표 상세</Link>
        </Button>
      }
    >
      {operationsQuery.isLoading ? (
        <SkeletonCardGrid count={4} label="자식 투표 통계를 불러오는 중…" />
      ) : operationsQuery.isError ? (
        <RetryErrorCard title="자식 투표 통계를 불러오지 못했습니다." description="잠시 후 다시 시도하세요." onRetry={() => operationsQuery.refetch()} />
      ) : !operationsQuery.data ? (
        <EmptyStateCard title="자식 투표를 찾을 수 없습니다." description="삭제되었거나 접근할 수 없는 자식 투표입니다." />
      ) : (
        <SubVoteOperationsView operations={operationsQuery.data} />
      )}
    </PageShell>
  );
}

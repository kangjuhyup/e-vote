"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { EmptyStateCard } from "@/components/feedback/empty-state-card";
import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { voteDetailQueryOptions } from "@/features/votes/api/votes-query-options";
import { filterElectors } from "@/features/votes/model/vote-selectors";
import { useVotesUiStore } from "@/features/votes/store/votes-ui.store";

import { toCandidateItems, toRosterItems } from "../lib/vote-view-models";
import { VoteDetailRosterSection } from "../ui/vote-detail-roster-section";
import { VoteDetailSummary } from "../ui/vote-detail-summary";

interface VoteDetailContainerProps {
  voteId: string;
}

export function VoteDetailContainer({ voteId }: VoteDetailContainerProps) {
  const electorParticipationFilter = useVotesUiStore(
    (state) => state.electorParticipationFilter,
  );
  const setElectorParticipationFilter = useVotesUiStore(
    (state) => state.setElectorParticipationFilter,
  );

  const voteQuery = useQuery(voteDetailQueryOptions(voteId));
  const vote = voteQuery.data;
  const filteredElectors = vote
    ? filterElectors(vote.electors, electorParticipationFilter)
    : [];

  return (
    <PageShell
      eyebrow="Vote Detail"
      title="투표 상세"
      description="투표 내용, 후보자, 선거인명부와 참여 상태를 확인합니다."
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href="/votes">
            <ArrowLeft aria-hidden="true" />
            목록
          </Link>
        </Button>
      }
    >
      {voteQuery.isLoading ? (
        <SkeletonCardGrid count={3} />
      ) : voteQuery.isError ? (
        <RetryErrorCard
          title="투표 상세를 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => voteQuery.refetch()}
        />
      ) : !vote ? (
        <EmptyStateCard
          title="투표를 찾을 수 없습니다."
          description="삭제되었거나 접근할 수 없는 투표입니다."
          action={
            <Button type="button" variant="outline" asChild>
              <Link href="/votes">
                <ArrowLeft aria-hidden="true" />
                목록으로
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <VoteDetailSummary vote={vote} />
          <VoteDetailRosterSection
            candidateItems={toCandidateItems(vote.candidates)}
            electorParticipationFilter={electorParticipationFilter}
            rosterItems={toRosterItems(filteredElectors)}
            onElectorParticipationFilterChange={setElectorParticipationFilter}
          />
        </>
      )}
    </PageShell>
  );
}

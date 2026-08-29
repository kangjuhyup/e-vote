"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { voteListQueryOptions } from "@/features/votes/api/votes-query-options";
import { filterVotes } from "@/features/votes/model/vote-selectors";
import { useVotesUiStore } from "@/features/votes/store/votes-ui.store";

import { VoteListControls } from "../ui/vote-list-controls";
import { VoteListResults } from "../ui/vote-list-results";

export function VoteListContainer() {
  const statusFilter = useVotesUiStore((state) => state.statusFilter);
  const searchText = useVotesUiStore((state) => state.searchText);
  const setStatusFilter = useVotesUiStore((state) => state.setStatusFilter);
  const setSearchText = useVotesUiStore((state) => state.setSearchText);

  const votesQuery = useQuery(voteListQueryOptions());
  const votes = votesQuery.data ?? [];
  const filteredVotes = filterVotes(votes, { statusFilter, searchText });

  return (
    <PageShell
      eyebrow="Vote List"
      title="투표 목록"
      description="투표 제목, 기간, 참여율을 기준으로 전체 투표를 확인합니다."
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => votesQuery.refetch()}
          disabled={votesQuery.isFetching}
        >
          <RefreshCw
            className={votesQuery.isFetching ? "animate-spin" : ""}
            aria-hidden="true"
          />
          새로고침
        </Button>
      }
    >
      <VoteListControls
        statusFilter={statusFilter}
        searchText={searchText}
        onStatusFilterChange={setStatusFilter}
        onSearchTextChange={setSearchText}
      />

      {votesQuery.isLoading ? (
        <SkeletonCardGrid count={4} />
      ) : votesQuery.isError ? (
        <RetryErrorCard
          title="투표 목록을 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => votesQuery.refetch()}
        />
      ) : (
        <VoteListResults
          filteredVotes={filteredVotes}
          totalVotes={votes.length}
        />
      )}
    </PageShell>
  );
}

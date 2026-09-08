"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { voteListQueryOptions } from "@/features/votes/api/votes-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import {
  readVoteListSearchParams,
  writeVoteListSearchParams,
} from "@/features/votes/lib/vote-search-params";
import type { VoteStatusFilter } from "@/features/votes/model/vote.types";
import { filterVotes } from "@/features/votes/model/vote-selectors";
import { useVotesUiStore } from "@/features/votes/store/votes-ui.store";

import { VoteListControls } from "../ui/vote-list-controls";
import { VoteListResults } from "../ui/vote-list-results";
import { VoteNavigation } from "../ui/vote-navigation";

interface VoteListContainerProps {
  account?: ReactNode;
}

export function VoteListContainer({ account }: VoteListContainerProps) {
  const queryClient = useQueryClient();
  const refreshInFlight = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const statusFilter = useVotesUiStore((state) => state.statusFilter);
  const searchText = useVotesUiStore((state) => state.searchText);
  const setStatusFilter = useVotesUiStore((state) => state.setStatusFilter);
  const setSearchText = useVotesUiStore((state) => state.setSearchText);
  const resetVoteListFilters = useVotesUiStore(
    (state) => state.resetVoteListFilters,
  );

  useEffect(() => {
    const state = readVoteListSearchParams(new URLSearchParams(searchParamsKey));
    setStatusFilter(state.statusFilter);
    setSearchText(state.searchText);
  }, [searchParamsKey, setSearchText, setStatusFilter]);

  const votesQuery = useQuery(voteListQueryOptions());
  const votes = votesQuery.data ?? [];
  const filteredVotes = filterVotes(votes, { statusFilter, searchText });

  function replaceSearchParams(nextSearch: string) {
    router.replace(
      nextSearch.length > 0 ? `${pathname}?${nextSearch}` : pathname,
      { scroll: false },
    );
  }

  function handleStatusFilterChange(nextStatusFilter: VoteStatusFilter) {
    setStatusFilter(nextStatusFilter);
    replaceSearchParams(
      writeVoteListSearchParams(new URLSearchParams(searchParamsKey), {
        statusFilter: nextStatusFilter,
        searchText,
      }),
    );
  }

  function handleSearchTextChange(nextSearchText: string) {
    setSearchText(nextSearchText);
    replaceSearchParams(
      writeVoteListSearchParams(new URLSearchParams(searchParamsKey), {
        statusFilter,
        searchText: nextSearchText,
      }),
    );
  }

  function handleResetFilters() {
    resetVoteListFilters();
    replaceSearchParams(
      writeVoteListSearchParams(new URLSearchParams(searchParamsKey), {
        statusFilter: "all",
        searchText: "",
      }),
    );
  }

  async function handleRefresh() {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setIsRefreshing(true);
    try {
      await queryClient.resetQueries({ queryKey: ["votes"] });
    } finally {
      refreshInFlight.current = false;
      setIsRefreshing(false);
    }
  }

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />
      }
      eyebrow="전체 투표"
      title="투표 목록"
      description="투표 제목, 기간, 참여율을 기준으로 전체 투표를 확인합니다."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/votes/new">
              <Plus aria-hidden="true" />
              새 투표 만들기
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing || votesQuery.isFetching}
          >
            <RefreshCw
              className={
                isRefreshing || votesQuery.isFetching
                  ? "motion-safe:animate-spin"
                  : ""
              }
              aria-hidden="true"
            />
            <span aria-live="polite">
              {isRefreshing || votesQuery.isFetching
                ? "새로고침 중…"
                : "새로고침"}
            </span>
          </Button>
        </div>
      }
    >
      <VoteListControls
        statusFilter={statusFilter}
        searchText={searchText}
        onStatusFilterChange={handleStatusFilterChange}
        onSearchTextChange={handleSearchTextChange}
      />

      {votesQuery.isLoading ? (
        <SkeletonCardGrid count={4} label="투표 목록을 불러오는 중…" />
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
          hasActiveFilters={
            statusFilter !== "all" || searchText.trim().length > 0
          }
          onResetFilters={handleResetFilters}
        />
      )}
    </PageShell>
  );
}

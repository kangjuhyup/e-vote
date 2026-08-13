"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/votes/page-shell";
import { VoteParticipationBar } from "@/components/votes/vote-participation-bar";
import { VotePeriod } from "@/components/votes/vote-period";
import { VoteStatusBadge } from "@/components/votes/vote-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { voteListQueryOptions } from "@/features/votes/api/votes-query-options";
import { filterVotes } from "@/features/votes/model/vote-selectors";
import type {
  VoteStatus,
  VoteStatusFilter,
  VoteSummary,
} from "@/features/votes/model/vote.types";
import { useVotesUiStore } from "@/features/votes/store/votes-ui.store";

const statusFilters: Array<{ value: VoteStatusFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "active", label: "진행 중" },
  { value: "scheduled", label: "예정" },
  { value: "completed", label: "종료" },
  { value: "draft", label: "초안" },
  { value: "canceled", label: "취소" },
];

function VoteListLoadingState() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="rounded-lg">
          <CardContent className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="space-y-3">
              <div className="h-5 w-52 rounded bg-muted" />
              <div className="h-4 w-72 max-w-full rounded bg-muted" />
            </div>
            <div className="h-10 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function VoteListErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="rounded-lg border-destructive/30">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">투표 목록을 불러오지 못했습니다.</p>
            <p className="text-sm text-muted-foreground">
              잠시 후 다시 시도하세요.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          다시 시도
        </Button>
      </CardContent>
    </Card>
  );
}

function VoteListRow({ vote }: { vote: VoteSummary }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_220px_150px] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{vote.title}</h2>
            <VoteStatusBadge status={vote.status as VoteStatus} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            <VotePeriod startsAt={vote.startsAt} endsAt={vote.endsAt} />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            선거인 {vote.electorCount.toLocaleString()}명 / 참여{" "}
            {vote.participatedCount.toLocaleString()}명
          </p>
        </div>
        <VoteParticipationBar
          participatedCount={vote.participatedCount}
          electorCount={vote.electorCount}
        />
        <Button type="button" variant="outline" asChild>
          <Link href={`/votes/${vote.id}`}>상세 보기</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function VoteListPage() {
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
      <section className="grid gap-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            placeholder="투표 제목 검색"
          />
        </label>
      </section>

      {votesQuery.isLoading ? (
        <VoteListLoadingState />
      ) : votesQuery.isError ? (
        <VoteListErrorState onRetry={() => votesQuery.refetch()} />
      ) : votes.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent>
            <p className="text-sm text-muted-foreground">
              등록된 투표가 없습니다.
            </p>
          </CardContent>
        </Card>
      ) : filteredVotes.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent>
            <p className="text-sm text-muted-foreground">
              조건에 맞는 투표가 없습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-3">
          {filteredVotes.map((vote) => (
            <VoteListRow key={vote.id} vote={vote} />
          ))}
        </section>
      )}
    </PageShell>
  );
}

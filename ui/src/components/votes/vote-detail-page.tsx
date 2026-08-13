"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

import { CandidateList } from "@/components/votes/candidate-list";
import { ElectorRoster } from "@/components/votes/elector-roster";
import { PageShell } from "@/components/votes/page-shell";
import { VoteParticipationBar } from "@/components/votes/vote-participation-bar";
import { VotePeriod } from "@/components/votes/vote-period";
import { VoteStatusBadge } from "@/components/votes/vote-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { voteDetailQueryOptions } from "@/features/votes/api/votes-query-options";
import { filterElectors } from "@/features/votes/model/vote-selectors";
import type { ElectorParticipationFilter } from "@/features/votes/model/vote.types";
import { useVotesUiStore } from "@/features/votes/store/votes-ui.store";

interface VoteDetailPageProps {
  voteId: string;
}

const electorFilters: Array<{
  value: ElectorParticipationFilter;
  label: string;
}> = [
  { value: "all", label: "전체" },
  { value: "participated", label: "참여" },
  { value: "not-participated", label: "미참여" },
];

function VoteDetailLoadingState() {
  return (
    <div className="grid gap-4">
      <Card className="rounded-lg">
        <CardContent className="space-y-4">
          <div className="h-5 w-64 rounded bg-muted" />
          <div className="h-4 w-full max-w-2xl rounded bg-muted" />
          <div className="h-10 w-72 max-w-full rounded bg-muted" />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-lg">
          <CardContent className="h-40" />
        </Card>
        <Card className="rounded-lg">
          <CardContent className="h-40" />
        </Card>
      </div>
    </div>
  );
}

function VoteDetailErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="rounded-lg border-destructive/30">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">투표 상세를 불러오지 못했습니다.</p>
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

function VoteDetailNotFoundState() {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium">투표를 찾을 수 없습니다.</p>
          <p className="text-sm text-muted-foreground">
            삭제되었거나 접근할 수 없는 투표입니다.
          </p>
        </div>
        <Button type="button" variant="outline" asChild>
          <Link href="/votes">
            <ArrowLeft aria-hidden="true" />
            목록으로
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function VoteDetailPage({ voteId }: VoteDetailPageProps) {
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
        <VoteDetailLoadingState />
      ) : voteQuery.isError ? (
        <VoteDetailErrorState onRetry={() => voteQuery.refetch()} />
      ) : !vote ? (
        <VoteDetailNotFoundState />
      ) : (
        <>
          <Card className="rounded-lg">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{vote.title}</CardTitle>
                <VoteStatusBadge status={vote.status} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[1fr_260px]">
              <div className="space-y-3">
                <p className="text-sm leading-6 text-muted-foreground">
                  {vote.description}
                </p>
                <div className="text-sm">
                  <span className="font-medium">투표 기간: </span>
                  <VotePeriod startsAt={vote.startsAt} endsAt={vote.endsAt} />
                </div>
              </div>
              <VoteParticipationBar
                participatedCount={vote.participatedCount}
                electorCount={vote.electorCount}
              />
            </CardContent>
          </Card>

          <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <CandidateList candidates={vote.candidates} />
            <div className="space-y-4">
              <Card className="rounded-lg">
                <CardContent className="flex flex-wrap gap-2">
                  {electorFilters.map((filter) => (
                    <Button
                      key={filter.value}
                      type="button"
                      variant={
                        electorParticipationFilter === filter.value
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      aria-pressed={
                        electorParticipationFilter === filter.value
                      }
                      onClick={() => setElectorParticipationFilter(filter.value)}
                    >
                      {filter.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
              <ElectorRoster electors={filteredElectors} />
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}

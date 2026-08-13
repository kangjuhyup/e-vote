"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  Vote,
} from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/votes/page-shell";
import { VoteParticipationBar } from "@/components/votes/vote-participation-bar";
import { VotePeriod } from "@/components/votes/vote-period";
import { VoteStatusBadge } from "@/components/votes/vote-status-badge";
import { VoteSummaryCard } from "@/components/votes/vote-summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { voteDashboardQueryOptions } from "@/features/votes/api/votes-query-options";
import type { VoteDetail } from "@/features/votes/model/vote.types";

function DashboardLoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="rounded-lg">
          <CardContent className="space-y-4">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-14 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DashboardErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="rounded-lg border-destructive/30">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">대시보드 데이터를 불러오지 못했습니다.</p>
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

function VoteRow({ vote }: { vote: VoteDetail }) {
  return (
    <Link
      href={`/votes/${vote.id}`}
      className="grid gap-3 rounded-md border p-4 transition-colors hover:bg-accent sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{vote.title}</h3>
          <VoteStatusBadge status={vote.status} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          <VotePeriod startsAt={vote.startsAt} endsAt={vote.endsAt} />
        </p>
      </div>
      <VoteParticipationBar
        participatedCount={vote.participatedCount}
        electorCount={vote.electorCount}
      />
    </Link>
  );
}

function VoteSection({
  title,
  emptyLabel,
  votes,
}: {
  title: string;
  emptyLabel: string;
  votes: VoteDetail[];
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {votes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="grid gap-3">
            {votes.map((vote) => (
              <VoteRow key={vote.id} vote={vote} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function VoteDashboardPage() {
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
        <DashboardLoadingState />
      ) : dashboardQuery.isError ? (
        <DashboardErrorState onRetry={() => dashboardQuery.refetch()} />
      ) : dashboard ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <VoteSummaryCard
              label="진행 중"
              value={dashboard.metrics.activeVotes}
              description="현재 참여 가능한 투표"
              icon={Vote}
            />
            <VoteSummaryCard
              label="진행 예정"
              value={dashboard.metrics.scheduledVotes}
              description="시작 대기 중인 투표"
              icon={CalendarClock}
            />
            <VoteSummaryCard
              label="종료"
              value={dashboard.metrics.completedVotes}
              description="집계 완료 대상"
              icon={CheckCircle2}
            />
            <VoteSummaryCard
              label="평균 참여율"
              value={dashboard.metrics.averageParticipationRate}
              description="투표별 참여율 평균"
              icon={BarChart3}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <VoteSection
              title="현재 진행 중인 투표"
              emptyLabel="진행 중인 투표가 없습니다."
              votes={dashboard.activeVotes}
            />
            <VoteSection
              title="진행 예정 중인 투표"
              emptyLabel="예정된 투표가 없습니다."
              votes={dashboard.upcomingVotes}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <VoteSection
              title="참여율 확인 필요"
              emptyLabel="참여율 확인이 필요한 투표가 없습니다."
              votes={dashboard.attentionVotes}
            />
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>최근 투표 활동</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboard.recentActivities.map((activity) => (
                  <div key={activity.id} className="space-y-1">
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.detail}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}

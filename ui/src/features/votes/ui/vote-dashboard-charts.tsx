import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getDashboardParticipationRows } from '@/features/votes/lib/vote-dashboard-chart-data';
import type {
  VoteDashboardMetrics,
  VoteSummary,
} from '@/features/votes/model/vote.types';

interface VoteDashboardChartsProps {
  activeVotes: VoteSummary[];
  metrics: VoteDashboardMetrics;
}

export function VoteDashboardCharts({
  activeVotes,
  metrics,
}: VoteDashboardChartsProps) {
  const stages = [
    { label: '진행 중', count: metrics.activeVotes, color: 'bg-primary' },
    { label: '진행 예정', count: metrics.scheduledVotes, color: 'bg-teal-500' },
    {
      label: '종료',
      count: metrics.completedVotes,
      color: 'bg-muted-foreground/50',
    },
  ];
  const stageTotal = stages.reduce((sum, stage) => sum + stage.count, 0);
  const participationRows = getDashboardParticipationRows(activeVotes);

  return (
    <section
      aria-label="투표 현황 차트"
      className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
    >
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>운영 단계 분포</CardTitle>
          <CardDescription>진행 중·진행 예정·종료 투표 기준</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-end gap-2">
            <p className="text-4xl font-semibold tabular-nums leading-none">
              {stageTotal}
            </p>
            <span className="pb-0.5 text-sm text-muted-foreground">개 투표</span>
          </div>
          {stageTotal > 0 ? (
            <div
              className="flex h-4 overflow-hidden rounded-full bg-muted"
              aria-hidden="true"
            >
              {stages.map((stage) =>
                stage.count > 0 ? (
                  <div
                    key={stage.label}
                    className={stage.color}
                    style={{ width: `${(stage.count / stageTotal) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              표시할 운영 단계 데이터가 없습니다.
            </p>
          )}
          <ul className="grid gap-3 sm:grid-cols-3">
            {stages.map((stage) => (
              <li
                key={stage.label}
                className="flex items-center justify-between gap-2 text-sm sm:block"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${stage.color}`}
                    aria-hidden="true"
                  />
                  {stage.label}
                </span>
                <span className="font-semibold tabular-nums sm:mt-1 sm:block">
                  {stage.count}개
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>진행 중 투표 참여율</CardTitle>
          <CardDescription>낮은 순으로 최대 5개 · 40% 미만은 확인 필요</CardDescription>
        </CardHeader>
        <CardContent>
          {participationRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              진행 중인 투표가 없어 참여율을 표시할 수 없습니다.
            </p>
          ) : (
            <ul className="space-y-4">
              {participationRows.map((row) => (
                <li key={row.id} className="space-y-2">
                  <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                    <Link
                      href={`/votes/${row.id}`}
                      className="min-w-0 truncate font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {row.title}
                    </Link>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {row.percent === null ? '집계 전' : `${row.percent}%`}
                    </span>
                  </div>
                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-muted"
                    aria-hidden="true"
                  >
                    {row.percent !== null ? (
                      <div
                        className={`h-full rounded-full ${row.percent < 40 ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${row.percent}%` }}
                      />
                    ) : null}
                  </div>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {row.percent === null
                      ? `참여 집계 전 · ${row.electorCount.toLocaleString()}명 대상`
                      : `${row.participatedCount.toLocaleString()} / ${row.electorCount.toLocaleString()}명 참여${row.percent < 40 ? ' · 확인 필요' : ''}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4 text-sm">
            <span className="text-muted-foreground">집계된 투표 평균 참여율</span>
            <span className="font-semibold tabular-nums">
              {metrics.averageParticipationRate}
            </span>
          </div>
          <Link
            href="/votes"
            className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            전체 투표 보기
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}

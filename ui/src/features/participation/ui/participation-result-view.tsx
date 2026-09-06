'use client';

import { BarChart3, LockKeyhole, Vote } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type {
  ParticipationAccessSession,
  ParticipationResult,
} from '../model/participation-access.types';

interface ParticipationResultViewProps {
  access: ParticipationAccessSession;
  errorMessage?: string;
  loadingVoteDetailId?: string;
  onLoadResult: (voteDetailId: string) => void;
  results: Record<string, ParticipationResult>;
}
export function ParticipationResultView({
  access,
  errorMessage,
  loadingVoteDetailId,
  onLoadResult,
  results,
}: ParticipationResultViewProps) {
  return (
    <main className="min-h-[100dvh] bg-muted/25 pb-12">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Vote className="size-4" aria-hidden="true" />
            </span>
            <p className="font-semibold">전자투표 결과</p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <LockKeyhole aria-hidden="true" />
            결과 열람 전용
          </Badge>
        </div>
      </header>
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm font-medium text-primary">투표 종료</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            {access.vote?.title ?? '투표 결과'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            이 링크에서는 종료된 투표의 집계 결과만 확인할 수 있습니다.
          </p>
        </div>
        {errorMessage ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        {(access.voteDetails ?? []).map((detail) => {
          const result = results[detail.id];
          return (
            <Card key={detail.id} className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg">{detail.title}</CardTitle>
                {detail.description ? (
                  <p className="text-sm text-muted-foreground">{detail.description}</p>
                ) : null}
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      참여 {result.participantCount.toLocaleString()}명 · 유효표 {result.totalVoteCount.toLocaleString()}표
                    </p>
                    <ol className="space-y-3">
                      {result.candidates.map((candidate) => (
                        <li key={candidate.candidateId} className="rounded-lg border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">기호 {candidate.candidateNo} {candidate.name}</span>
                            <span className="tabular-nums font-semibold">{candidate.voteRate.toLocaleString()}%</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {candidate.voteCount.toLocaleString()}표
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!access.permittedActions?.readResults || loadingVoteDetailId === detail.id}
                    onClick={() => onLoadResult(detail.id)}
                  >
                    <BarChart3 aria-hidden="true" />
                    {loadingVoteDetailId === detail.id ? '결과 불러오는 중…' : '결과 보기'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}

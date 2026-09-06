'use client';

import {
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  FlaskConical,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  Vote,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatKoreanDateTime } from '@/shared/lib/date-format';

import type {
  ParticipationAccess,
  ParticipationBallot,
} from '../model/participation.types';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; access: ParticipationAccess };

interface ParticipationViewProps {
  electorIdentityState: 'unverified' | 'verifying' | 'verified';
  errorMessage?: string;
  message?: string;
  onAuthenticate: () => Promise<void>;
  onCast: (voteDetailId: string, selectedCandidateId: string) => Promise<void>;
  onRetryLoad?: () => void;
  state: LoadState;
  submittingBallotId?: string;
}

export function ParticipationView({
  electorIdentityState,
  errorMessage,
  message,
  onAuthenticate,
  onCast,
  onRetryLoad,
  state,
  submittingBallotId,
}: ParticipationViewProps) {
  if (state.kind === 'loading') {
    return <CenteredStatus>참여할 투표를 확인하는 중입니다.</CenteredStatus>;
  }
  if (state.kind === 'missing') {
    return (
      <CenteredStatus title="참여 링크가 없습니다">
        문자로 받은 참여 링크를 다시 열어 주세요.
      </CenteredStatus>
    );
  }
  if (state.kind === 'error') {
    return (
      <CenteredStatus title="링크를 사용할 수 없습니다">
        <span>{state.message}</span>
        {onRetryLoad ? (
          <Button type="button" variant="outline" onClick={onRetryLoad}>
            다시 시도
          </Button>
        ) : null}
      </CenteredStatus>
    );
  }

  const { access } = state;
  const completed = access.ballots.filter(
    (ballot) => ballot.participated,
  ).length;
  const isComplete =
    access.ballots.length > 0 && completed === access.ballots.length;
  const isOnlineAvailable = access.vote.votingChannels.includes('ONLINE');
  const blocked =
    access.vote.status !== 'OPEN' ||
    !isOnlineAvailable ||
    !access.elector.identityVerified;

  return (
    <main className="min-h-[100dvh] bg-muted/25 pb-16">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Vote className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold leading-tight">전자투표</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                선거인 참여 화면
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5 bg-background">
            <LockKeyhole aria-hidden="true" />
            안전한 참여
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
        <section aria-labelledby="participation-title">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <UserRound className="size-4" aria-hidden="true" />
            {access.elector.label}님이 참여할 투표
          </p>
          <h1
            id="participation-title"
            className="mt-3 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {access.vote.title}
          </h1>
          {access.vote.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {access.vote.description}
            </p>
          ) : null}

          <div className="mt-6 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
            <Info
              icon={<Clock3 />}
              label="투표 마감"
              value={formatKoreanDateTime(access.vote.endedAt)}
            />
            <Info
              icon={<CheckCircle2 />}
              label="현재 참여"
              value={`${completed} / ${access.ballots.length} 항목 완료`}
            />
            <Info
              icon={<ShieldCheck />}
              label="본인 확인"
              value={
                access.elector.identityVerified
                  ? 'Mock 확인 완료'
                  : 'Mock 확인 필요'
              }
            />
          </div>
        </section>

        <section
          aria-labelledby="mock-verification-title"
          className="mt-5 rounded-xl border border-amber-300/70 bg-amber-50 p-4 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <div className="flex items-start gap-3">
            <FlaskConical className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 id="mock-verification-title" className="font-semibold">
                개발용 Mock 본인확인
              </h2>
              <p className="mt-1 text-sm leading-6">
                현재 기능은 실제 PASS 또는 SMS 본인인증이 아닙니다. 로그인한
                계정과 이 선거인을 개발 환경에서 연결합니다.
              </p>
              {!access.elector.identityVerified ? (
                <Button
                  type="button"
                  className="mt-3"
                  disabled={
                    electorIdentityState === 'verifying' ||
                    access.vote.status !== 'OPEN' ||
                    !isOnlineAvailable
                  }
                  onClick={() => void onAuthenticate()}
                >
                  <ShieldCheck aria-hidden="true" />
                  {electorIdentityState === 'verifying'
                    ? 'Mock 확인 중…'
                    : 'Mock 본인확인'}
                </Button>
              ) : (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  이 브라우저 세션에서 Mock 확인을 마쳤습니다.
                </p>
              )}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        ) : null}
        {message ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm"
          >
            {message}
          </p>
        ) : null}
        {isComplete ? (
          <section
            aria-labelledby="participation-complete-title"
            className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
          >
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 id="participation-complete-title" className="font-semibold">
                모든 투표를 제출했습니다
              </h2>
              <p className="mt-1 text-sm leading-6">
                제출한 선택은 안전하게 기록되었습니다. 이 화면을 닫아도 됩니다.
              </p>
            </div>
          </section>
        ) : null}
        {!access.elector.identityVerified ? (
          <p
            role="status"
            className="mt-5 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground"
          >
            투표 정책과 관계없이 로그인 계정과 선거인 연결을 확인한 뒤 제출할
            수 있습니다.
          </p>
        ) : null}
        {access.vote.status !== 'OPEN' ? (
          <p
            role="status"
            className="mt-5 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground"
          >
            현재 진행 중인 투표가 아닙니다.
          </p>
        ) : null}
        {!isOnlineAvailable ? (
          <p
            role="status"
            className="mt-5 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground"
          >
            이 투표는 온라인 참여 채널을 허용하지 않습니다.
          </p>
        ) : null}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
          <aside className="space-y-4 lg:sticky lg:top-5">
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">참여 현황</h2>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {completed}
                    <span className="ml-1 text-base font-medium text-muted-foreground">
                      / {access.ballots.length}
                    </span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">항목 완료</span>
              </div>
              <ol className="mt-5 space-y-3">
                {access.ballots.map((ballot) => (
                  <li key={ballot.id} className="flex items-start gap-2.5 text-sm">
                    {ballot.participated ? (
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      <span className="block font-medium">{ballot.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {ballot.participated ? '제출 완료' : '선택 전'}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl bg-muted p-4 text-xs leading-5 text-muted-foreground">
              <p className="flex items-start gap-2">
                <LockKeyhole
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                이 참여 화면은 본인만 사용해야 합니다. 다른 사람에게 링크나
                화면을 공유하지 마세요.
              </p>
              <p className="mt-3 border-t pt-3">
                투표 종료 {formatKoreanDateTime(access.vote.endedAt)}
              </p>
            </div>
          </aside>

          <section aria-labelledby="ballot-list-title" className="space-y-4">
            <div>
              <h2 id="ballot-list-title" className="text-xl font-semibold">
                투표 항목
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                각 항목의 내용을 확인하고 하나를 선택해 주세요. 제출 후에는
                변경할 수 없습니다.
              </p>
            </div>
            {access.ballots.map((ballot, index) => (
              <BallotCard
                key={ballot.id}
                ballot={ballot}
                disabled={blocked || ballot.status !== 'OPEN'}
                index={index + 1}
                isSubmitting={submittingBallotId === ballot.id}
                onCast={onCast}
              />
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}

function BallotCard({
  ballot,
  disabled,
  index,
  isSubmitting,
  onCast,
}: {
  ballot: ParticipationBallot;
  disabled: boolean;
  index: number;
  isSubmitting: boolean;
  onCast: ParticipationViewProps['onCast'];
}) {
  const [selectedId, setSelectedId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const selected = ballot.candidates.find(
    (candidate) => candidate.id === selectedId,
  );

  return (
    <Card className="overflow-hidden rounded-xl py-0 shadow-xs">
      <CardHeader className="border-b bg-muted/25 px-4 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {ballotLabel(index)}
            </p>
            <CardTitle className="text-lg">{ballot.title}</CardTitle>
            {ballot.description ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {ballot.description}
              </p>
            ) : null}
          </div>
          {ballot.participated ? (
            <Badge className="shrink-0 gap-1">
              <Check aria-hidden="true" />
              제출 완료
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 py-5 sm:px-6">
        {ballot.participated ? (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            이 항목의 투표가 안전하게 기록되었습니다.
          </div>
        ) : (
          <>
            <fieldset disabled={disabled || isSubmitting} className="space-y-3">
              <legend className="sr-only">{ballot.title} 선택</legend>
              {ballot.candidates.map((candidate) => {
                const isSelected = selectedId === candidate.id;
                return (
                  <label
                    key={candidate.id}
                    className="flex min-h-20 cursor-pointer items-start gap-4 rounded-lg border bg-background p-4 transition-[border-color,background-color,transform] active:translate-y-px has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                  >
                    <input
                      className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                      type="radio"
                      name={`ballot-${ballot.id}`}
                      value={candidate.id}
                      checked={isSelected}
                      disabled={disabled || isSubmitting}
                      onChange={() => {
                        setSelectedId(candidate.id);
                        setConfirming(false);
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3 font-medium">
                        <span>
                          <span className="mr-2 text-sm text-muted-foreground">
                            기호 {candidate.candidateNo}
                          </span>
                          {candidate.name}
                        </span>
                        {isSelected ? (
                          <Check
                            className="size-4 shrink-0 text-primary"
                            aria-label="선택됨"
                          />
                        ) : null}
                      </span>
                      {candidate.description ? (
                        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                          {candidate.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {confirming && selected ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="font-medium">
                  ‘{selected.name}’ 선택을 제출할까요?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  제출 후에는 선택을 변경할 수 없습니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void onCast(ballot.id, selected.id)}
                  >
                    {isSubmitting ? '제출 중…' : '선택 확정'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => setConfirming(false)}
                  >
                    다시 선택
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                className="w-full"
                disabled={disabled || !selectedId || isSubmitting}
                onClick={() => setConfirming(true)}
              >
                선택 확인
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 bg-background p-4">
      <span className="mt-0.5 text-muted-foreground [&>svg]:size-4">
        {icon}
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function CenteredStatus({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-muted/25 px-5">
      <Card className="w-full max-w-md rounded-xl text-center shadow-xs">
        <CardContent className="space-y-3 py-8">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted">
            <LockKeyhole
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          </span>
          {title ? <h1 className="text-xl font-semibold">{title}</h1> : null}
          <div role="status" className="grid gap-4 text-sm leading-6 text-muted-foreground">
            {children}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function ballotLabel(index: number) {
  if (index === 1) return '첫 번째 투표 항목';
  if (index === 2) return '두 번째 투표 항목';
  return `${index}번째 투표 항목`;
}

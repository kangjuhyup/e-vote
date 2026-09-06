'use client';

import { Check, CheckCircle2, Clock3, LockKeyhole, ShieldCheck, Vote } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatKoreanDateTime } from '@/shared/lib/date-format';
import type { ParticipationAccess, ParticipationBallot } from '../model/participation.types';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; access: ParticipationAccess; token: string };

interface ParticipationViewProps {
  message?: string;
  onCast: (voteDetailId: string, selectedCandidateId: string) => Promise<void>;
  state: LoadState;
  submittingBallotId?: string;
}

export function ParticipationView({ message, onCast, state, submittingBallotId }: ParticipationViewProps) {
  if (state.kind === 'loading') return <CenteredStatus>참여할 투표를 확인하는 중…</CenteredStatus>;
  if (state.kind === 'missing') {
    return <CenteredStatus title="참여 링크가 없습니다">문자로 받은 참여 링크를 다시 열어 주세요.</CenteredStatus>;
  }
  if (state.kind === 'error') {
    return <CenteredStatus title="링크를 사용할 수 없습니다">{state.message}</CenteredStatus>;
  }

  const { access } = state;
  const completed = access.ballots.filter((ballot) => ballot.participated).length;
  const blocked = access.elector.status !== 'ELIGIBLE' ||
    access.vote.status !== 'OPEN' ||
    (access.vote.identityVerificationRequired && !access.elector.identityVerified);

  return (
    <main className="min-h-screen bg-muted/30 pb-20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Vote className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">E-VOTE</p>
              <p className="font-semibold">온라인 투표 참여</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5"><LockKeyhole aria-hidden="true" />보안 링크</Badge>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
        <section aria-labelledby="participation-title" className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">{access.elector.label}님의 투표</p>
            <h1 id="participation-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{access.vote.title}</h1>
            {access.vote.description ? <p className="leading-7 text-muted-foreground">{access.vote.description}</p> : null}
          </div>
          <div className="grid gap-3 rounded-xl border bg-background p-4 text-sm sm:grid-cols-3">
            <Info icon={<Clock3 />} label="투표 종료" value={formatKoreanDateTime(access.vote.endedAt)} />
            <Info icon={<CheckCircle2 />} label="참여 현황" value={`${completed} / ${access.ballots.length} 완료`} />
            <Info icon={<ShieldCheck />} label="링크 만료" value={formatKoreanDateTime(access.expiresAt)} />
          </div>
        </section>

        {message ? <p role="status" aria-live="polite" className="rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground">{message}</p> : null}
        {access.vote.identityVerificationRequired && !access.elector.identityVerified ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            본인인증이 완료되어야 투표할 수 있습니다. 선거 관리자에게 본인인증 안내를 요청해 주세요.
          </p>
        ) : null}
        {access.vote.status !== 'OPEN' ? (
          <p role="status" className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">현재 진행 중인 투표가 아닙니다.</p>
        ) : null}

        <section aria-labelledby="ballot-list-title" className="space-y-4">
          <div>
            <h2 id="ballot-list-title" className="text-lg font-semibold">투표 항목</h2>
            <p className="mt-1 text-sm text-muted-foreground">제출한 선택은 변경할 수 없으니 내용을 확인한 뒤 제출해 주세요.</p>
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

        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          이 링크는 본인에게만 발급된 링크입니다. 다른 사람에게 전달하거나 공개하지 마세요.
        </p>
      </div>
    </main>
  );
}

function BallotCard({ ballot, disabled, index, isSubmitting, onCast }: {
  ballot: ParticipationBallot;
  disabled: boolean;
  index: number;
  isSubmitting: boolean;
  onCast: ParticipationViewProps['onCast'];
}) {
  const [selectedId, setSelectedId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const selected = ballot.candidates.find((candidate) => candidate.id === selectedId);

  return (
    <Card className="overflow-hidden rounded-xl py-0">
      <CardHeader className="border-b bg-muted/30 px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold text-primary">항목 {index}</p>
            <CardTitle className="text-lg">{ballot.title}</CardTitle>
            {ballot.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{ballot.description}</p> : null}
          </div>
          {ballot.participated ? <Badge className="gap-1"><Check aria-hidden="true" />제출 완료</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 py-5 sm:px-6">
        {ballot.participated ? (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />이 항목의 투표가 안전하게 기록되었습니다.
          </div>
        ) : (
          <>
            <fieldset disabled={disabled || isSubmitting} className="space-y-3">
              <legend className="sr-only">{ballot.title} 후보 선택</legend>
              {ballot.candidates.map((candidate) => (
                <label key={candidate.id} className="flex cursor-pointer gap-4 rounded-lg border p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                  <input className="mt-1 size-4 accent-[var(--primary)]" type="radio" name={`ballot-${ballot.id}`} value={candidate.id} checked={selectedId === candidate.id} disabled={disabled || isSubmitting} onChange={() => { setSelectedId(candidate.id); setConfirming(false); }} />
                  <span className="min-w-0">
                    <span className="block font-medium"><span className="mr-2 text-sm text-muted-foreground">기호 {candidate.candidateNo}</span>{candidate.name}</span>
                    {candidate.description ? <span className="mt-1 block text-sm leading-6 text-muted-foreground">{candidate.description}</span> : null}
                  </span>
                </label>
              ))}
            </fieldset>
            {confirming && selected ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="font-medium">‘{selected.name}’ 후보로 제출할까요?</p>
                <p className="mt-1 text-sm text-muted-foreground">제출 후에는 선택을 변경할 수 없습니다.</p>
                <div className="mt-4 flex gap-2">
                  <Button type="button" disabled={isSubmitting} onClick={() => void onCast(ballot.id, selected.id)}>{isSubmitting ? '제출 중…' : '선택 확정'}</Button>
                  <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setConfirming(false)}>다시 선택</Button>
                </div>
              </div>
            ) : (
              <Button type="button" className="w-full" disabled={disabled || !selectedId || isSubmitting} onClick={() => setConfirming(true)}>선택 확인</Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex gap-2.5"><span className="mt-0.5 [&>svg]:size-4 text-muted-foreground">{icon}</span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 font-medium">{value}</p></div></div>;
}

function CenteredStatus({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-5">
      <Card className="w-full max-w-md rounded-xl text-center">
        <CardContent className="space-y-3 py-8">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted"><LockKeyhole className="size-5 text-muted-foreground" aria-hidden="true" /></span>
          {title ? <h1 className="text-xl font-semibold">{title}</h1> : null}
          <p role="status" className="text-sm leading-6 text-muted-foreground">{children}</p>
        </CardContent>
      </Card>
    </main>
  );
}

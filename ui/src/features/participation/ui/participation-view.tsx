'use client';

import {
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Eye,
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
import { cn } from '@/shared/lib/utils';

import type {
  ParticipationAccess,
  ParticipationBallot,
  VotingChannel,
} from '../model/participation.types';
import { BallotSelectionDialog } from './ballot-selection-dialog';
import { ParticipationCompletion } from './participation-completion';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; access: ParticipationAccess };

interface ParticipationViewProps {
  accessMode?: 'identity' | 'permanent-link';
  electorIdentityState: 'unverified' | 'verifying' | 'verified';
  errorMessage?: string;
  isPreview?: boolean;
  message?: string;
  onAuthenticate: () => Promise<void>;
  onSubmitResults: (selections: Record<string, string>) => Promise<void>;
  isSubmitting?: boolean;
  onRetryLoad?: () => void;
  onResetSignature?: () => void;
  state: LoadState;
  submittingBallotId?: string;
  hasSignature?: boolean;
  signatureContent?: ReactNode;
  votingChannel?: VotingChannel;
}

export function ParticipationView({
  accessMode = 'identity',
  electorIdentityState,
  errorMessage,
  isPreview = false,
  message,
  onAuthenticate,
  onResetSignature,
  onSubmitResults,
  isSubmitting = false,
  onRetryLoad,
  state,
  submittingBallotId,
  hasSignature = false,
  signatureContent,
  votingChannel = 'ONLINE',
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

  return (
    <ReadyParticipationView
      access={state.access}
      accessMode={accessMode}
      electorIdentityState={electorIdentityState}
      errorMessage={errorMessage}
      isPreview={isPreview}
      message={message}
      onResetSignature={onResetSignature}
      onAuthenticate={onAuthenticate}
      onSubmitResults={onSubmitResults}
      isSubmitting={isSubmitting}
      submittingBallotId={submittingBallotId}
      hasSignature={hasSignature}
      signatureContent={signatureContent}
      votingChannel={votingChannel}
    />
  );
}

function ReadyParticipationView({
  access,
  accessMode = 'identity',
  electorIdentityState,
  errorMessage,
  isPreview = false,
  message,
  onAuthenticate,
  onResetSignature,
  onSubmitResults,
  isSubmitting = false,
  submittingBallotId,
  hasSignature = false,
  signatureContent,
  votingChannel = 'ONLINE',
}: Omit<ParticipationViewProps, 'onRetryLoad' | 'state'> & {
  access: ParticipationAccess;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const submittingAll = isSubmitting;
  const [mobileIntroComplete, setMobileIntroComplete] = useState(false);
  const completed = access.ballots.filter(
    (ballot) => ballot.participated,
  ).length;
  const isComplete =
    access.ballots.length > 0 && completed === access.ballots.length;
  const isChannelAvailable = access.vote.votingChannels.includes(votingChannel);
  const blocked =
    access.vote.status !== 'OPEN' ||
    !isChannelAvailable ||
    !access.elector.identityVerified ||
    submittingAll;
  const activeBallotIndex = access.ballots.findIndex(
    (ballot) => !ballot.participated && !drafts[ballot.id],
  );
  const mobileStage = !mobileIntroComplete
    ? 'overview'
    : accessMode === 'identity' && !access.elector.identityVerified
      ? 'identity'
      : activeBallotIndex >= 0
        ? 'ballot'
        : isComplete
          ? 'complete'
          : 'signature';

  return (
    <main className="min-h-[100dvh] bg-muted/25 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-16">
      <header className="sticky top-0 z-40 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:min-h-16 sm:px-6">
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
          <Badge
            variant="outline"
            className="min-h-8 shrink-0 gap-1.5 bg-background px-2"
          >
            {isPreview ? (
              <Eye aria-hidden="true" />
            ) : (
              <LockKeyhole aria-hidden="true" />
            )}
            <span>{isPreview ? '화면 미리보기' : '안전한 참여'}</span>
          </Badge>
        </div>
        {isPreview ? (
          <p className="flex h-10 items-center justify-center border-t bg-amber-50 px-4 text-center text-xs leading-4 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
            미리보기 환경입니다. 실제 투표에 반영되지 않습니다
          </p>
        ) : null}
      </header>

      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-10">
        <MobileStepHeader
          isPreview={isPreview}
          ballotCount={access.ballots.length}
          currentBallotIndex={activeBallotIndex}
          stage={mobileStage}
          voteTitle={access.vote.title}
        />

        <section
          aria-labelledby="participation-title"
          className={cn(
            mobileStage === 'overview' ? 'block' : 'hidden',
            'lg:block',
          )}
        >
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <UserRound className="size-4" aria-hidden="true" />
            {access.elector.label}님이 참여할 투표
          </p>
          <h1
            id="participation-title"
            className="mt-2 max-w-3xl break-words text-[clamp(1.5rem,7vw,2.25rem)] font-bold tracking-tight"
          >
            {access.vote.title}
          </h1>
          {access.vote.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {access.vote.description}
            </p>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:mt-6 sm:grid-cols-3">
            <Info
              className="col-span-2 sm:col-span-1"
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
              label={accessMode === 'permanent-link' ? '참여 권한' : '본인 확인'}
              value={
                accessMode === 'permanent-link'
                  ? '문자 링크 확인 완료'
                  : access.elector.identityVerified
                  ? 'Mock 확인 완료'
                  : 'Mock 확인 필요'
              }
            />
          </div>
          <Button
            type="button"
            className="mt-5 min-h-12 w-full touch-manipulation lg:hidden"
            disabled={access.vote.status !== 'OPEN' || !isChannelAvailable}
            onClick={() => setMobileIntroComplete(true)}
          >
            {accessMode === 'permanent-link' ? '투표 시작' : '본인확인으로 계속'}
          </Button>
        </section>

        {accessMode === 'identity' ? <section
          aria-labelledby="mock-verification-title"
          className={cn(
            'mt-4 rounded-xl border border-amber-300/70 bg-amber-50 p-4 text-amber-950 sm:mt-5 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100',
            mobileStage === 'identity' ? 'block' : 'hidden',
            'lg:block',
          )}
        >
          <div className="flex items-start gap-3">
            <FlaskConical
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
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
                  className="mt-3 min-h-11 w-full touch-manipulation sm:w-auto"
                  disabled={
                    electorIdentityState === 'verifying' ||
                    access.vote.status !== 'OPEN' ||
                    !isChannelAvailable
                  }
                  onClick={() => void onAuthenticate()}
                >
                  <ShieldCheck aria-hidden="true" />
                  {electorIdentityState === 'verifying'
                    ? 'Mock 확인 중…'
                    : 'Mock 본인확인'}
                </Button>
              ) : (
                <div className="mt-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="size-4" aria-hidden="true" />이
                    브라우저 세션에서 Mock 확인을 마쳤습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section> : null}

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
          <ParticipationCompletion
            className={cn(
              'mt-5',
              mobileStage === 'complete' ? 'flex' : 'hidden',
              'lg:flex',
            )}
          />
        ) : null}
        {accessMode === 'identity' && !access.elector.identityVerified ? (
          <p
            role="status"
            className={cn(
              'mt-5 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground',
              mobileStage === 'identity' ? 'block' : 'hidden',
              'lg:block',
            )}
          >
            투표 정책과 관계없이 로그인 계정과 선거인 연결을 확인한 뒤 제출할 수
            있습니다.
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
        {!isChannelAvailable ? (
          <p
            role="status"
            className="mt-5 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground"
          >
            이 투표는 선택한 참여 채널을 허용하지 않습니다.
          </p>
        ) : null}

        <div
          className={cn(
            'mt-5 items-start gap-5 sm:mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8',
            mobileStage === 'ballot' ? 'grid' : 'hidden',
          )}
        >
          <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:block">
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
                  <li
                    key={ballot.id}
                    className="flex items-start gap-2.5 text-sm"
                  >
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
                        {ballot.participated
                          ? '제출 완료'
                          : drafts[ballot.id]
                            ? '선택 완료'
                            : '선택 전'}
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

          <section
            aria-labelledby="ballot-list-title"
            className="min-w-0 space-y-4"
          >
            <div>
              <h2
                id="ballot-list-title"
                className="text-lg font-semibold sm:text-xl"
              >
                투표 항목
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                각 항목의 내용을 확인하고 하나를 선택해 주세요. 제출 후에는
                변경할 수 없습니다.
              </p>
            </div>
            {access.ballots.map((ballot, index) => (
              <div
                key={ballot.id}
                data-mobile-ballot={
                  index === activeBallotIndex ? 'active' : 'inactive'
                }
                className={cn(
                  index === activeBallotIndex ? 'block' : 'hidden',
                  'lg:block',
                )}
              >
                <BallotCard
                  ballot={ballot}
                  disabled={blocked || ballot.status !== 'OPEN'}
                  index={index + 1}
                  isSubmitting={submittingBallotId === ballot.id}
                  onSelect={async (ballotId, candidateId) => {
                    setDrafts((current) => ({
                      ...current,
                      [ballotId]: candidateId,
                    }));
                  }}
                />
              </div>
            ))}
          </section>
        </div>
        {activeBallotIndex < 0 && !isComplete ? (
          <div
            className={cn(
              mobileStage === 'signature' ? 'block' : 'hidden',
              'lg:block',
            )}
          >
            <section
              aria-labelledby="selection-review-title"
              className="mt-5 rounded-xl border bg-background p-4 sm:p-6"
            >
              <h2 id="selection-review-title" className="font-semibold">
                최종 선택 확인
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {access.ballots.map((ballot) => (
                  <li key={ballot.id}>
                    {ballot.title}:{' '}
                    {ballot.participated
                      ? '제출 완료'
                      : ballot.candidates.find(
                          (candidate) => candidate.id === drafts[ballot.id],
                        )?.name}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                disabled={submittingAll}
                onClick={() => {
                  setDrafts({});
                  onResetSignature?.();
                }}
              >
                선택 다시 확인
              </Button>
            </section>
            {signatureContent}
            <p className="mt-4 text-sm text-muted-foreground">
              최종 제출 후에는 선택을 변경할 수 없습니다.
            </p>
            <Button
              type="button"
              className="mt-3 min-h-12 w-full"
              disabled={blocked || !hasSignature}
              onClick={() => void onSubmitResults(drafts)}
            >
              {submittingAll ? '제출 중…' : '결과 제출'}
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function BallotCard({
  ballot,
  disabled,
  index,
  isSubmitting,
  onSelect,
}: {
  ballot: ParticipationBallot;
  disabled: boolean;
  index: number;
  isSubmitting: boolean;
  onSelect: (ballotId: string, candidateId: string) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const selected = ballot.candidates.find(
    (candidate) => candidate.id === selectedId,
  );

  return (
    <Card className="scroll-mt-28 overflow-hidden rounded-xl py-0 shadow-xs">
      <CardHeader className="border-b bg-muted/25 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
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
      <CardContent className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        {ballot.participated ? (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />이
            항목의 투표가 안전하게 기록되었습니다.
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
                    className="flex min-h-16 cursor-pointer touch-manipulation items-start gap-3 rounded-lg border bg-background p-3.5 transition-[border-color,background-color,transform] active:translate-y-px sm:min-h-20 sm:gap-4 sm:p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                  >
                    <input
                      className="mt-0.5 size-5 shrink-0 accent-[var(--primary)] sm:mt-1"
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
                      <span className="flex items-start justify-between gap-3 font-medium">
                        <span className="flex min-w-0 flex-col gap-0.5 sm:block">
                          <span className="text-xs text-muted-foreground sm:mr-2 sm:text-sm">
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

            <Button
              type="button"
              className="min-h-11 w-full touch-manipulation"
              disabled={disabled || !selectedId || isSubmitting}
              onClick={() => setConfirming(true)}
            >
              선택 확인
            </Button>
            {confirming && selected ? (
              <BallotSelectionDialog
                candidateName={selected.name}
                disabled={disabled || isSubmitting}
                onCancel={() => setConfirming(false)}
                onConfirm={() => {
                  setConfirming(false);
                  void onSelect(ballot.id, selected.id);
                }}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MobileStepHeader({
  isPreview,
  ballotCount,
  currentBallotIndex,
  stage,
  voteTitle,
}: {
  isPreview: boolean;
  ballotCount: number;
  currentBallotIndex: number;
  stage: 'overview' | 'identity' | 'ballot' | 'signature' | 'complete';
  voteTitle: string;
}) {
  const totalSteps = ballotCount + 3;
  const currentStep =
    stage === 'overview'
      ? 1
      : stage === 'identity'
        ? 2
        : stage === 'ballot'
          ? currentBallotIndex + 3
          : totalSteps;
  const percentage = Math.round((currentStep / Math.max(totalSteps, 1)) * 100);

  return (
    <div
      aria-label="모바일 투표 단계"
      className={cn(
        'sticky z-30 -mx-4 mb-5 border-y bg-background/95 px-4 py-3 shadow-xs backdrop-blur lg:hidden',
        isPreview
          ? 'top-[calc(6rem+env(safe-area-inset-top))] sm:top-[calc(6.5rem+env(safe-area-inset-top))]'
          : 'top-[calc(3.5rem+env(safe-area-inset-top))] sm:top-[calc(4rem+env(safe-area-inset-top))]',
      )}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium">{voteTitle}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {currentStep} / {totalSteps} 단계
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="모바일 투표 단계 진행률"
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function Info({
  className,
  icon,
  label,
  value,
}: {
  className?: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn('flex min-w-0 gap-3 bg-background p-3.5 sm:p-4', className)}
    >
      <span className="mt-0.5 text-muted-foreground [&>svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-medium">{value}</p>
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
          <div
            role="status"
            className="grid gap-4 text-sm leading-6 text-muted-foreground"
          >
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

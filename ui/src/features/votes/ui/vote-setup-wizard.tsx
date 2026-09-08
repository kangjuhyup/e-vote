import {
  Check,
  ChevronRight,
  Circle,
  GripVertical,
  ListChecks,
  Plus,
  Trash2,
  UsersRound,
  Vote,
} from 'lucide-react';
import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { ElectoralRollPageItemRecord } from '@/features/votes/model/electoral-roll.types';
import type { ManagedOrganization } from '@/features/organizations/model/organization.types';
import type {
  CommissionRecord,
  CreateVoteResult,
} from '@/features/votes/model/vote-operations.types';

import { VoteAccessFields } from './vote-access-fields';
import { VoteCommissionSetup } from './vote-commission-setup';
import { VotePolicyFields } from './vote-policy-fields';
import { VoteScheduleFields } from './vote-schedule-fields';

export type VoteSetupStep =
  | 'attachments'
  | 'ballot'
  | 'basics'
  | 'commission'
  | 'electors'
  | 'review';

export interface VoteSetupBallotDraft {
  candidateNames: string[];
  title: string;
  type: 'CANDIDATE' | 'YES_NO';
}

interface VoteSetupWizardProps {
  attachmentsPanel?: ReactNode;
  candidateAttachmentsPanel?: ReactNode;
  ballots: VoteSetupBallotDraft[];
  ballotType: VoteSetupBallotDraft['type'];
  billingPanel?: ReactNode;
  commissions: CommissionRecord[];
  organizations: ManagedOrganization[];
  createdSubVoteIds: string[];
  createdVote?: CreateVoteResult;
  electoralRolls: ElectoralRollPageItemRecord[];
  errorMessage?: string;
  isSubmitting: boolean;
  isCommissionsLoading?: boolean;
  isElectoralRollsLoading?: boolean;
  onCommissionChange: (commissionId: string) => void;
  onBallotTypeChange: (type: VoteSetupBallotDraft['type']) => void;
  onCompleteSetup: () => void;
  onCreateBallot: (formData: FormData) => void;
  onCreateVote: (formData: FormData) => void;
  onElectoralRollChange: (electoralRollId: string) => void;
  onRemoveBallot: (ballotIndex: number) => void;
  onReorderBallot: (fromIndex: number, toIndex: number) => void;
  onStepChange: (step: VoteSetupStep) => void;
  selectedCommissionId?: string;
  selectedElectoralRoll?: ElectoralRollPageItemRecord;
  selectedElectoralRollId?: string;
  step: VoteSetupStep;
  successMessage?: string;
}

const steps: Array<{ key: VoteSetupStep; label: string }> = [
  { key: 'basics', label: '기본 정책' },
  { key: 'ballot', label: '안건과 후보' },
  { key: 'electors', label: '선거인명부' },
  { key: 'commission', label: '운영 위원회' },
  { key: 'attachments', label: '첨부파일' },
  { key: 'review', label: '검토' },
];

export function VoteSetupWizard(props: VoteSetupWizardProps) {
  const currentIndex = steps.findIndex((item) => item.key === props.step);

  return (
    <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-start">
      <nav
        aria-label="투표 설정 진행 상태"
        className="rounded-lg border bg-card p-2.5 sm:p-3 xl:sticky xl:top-5"
      >
        <div className="flex items-center justify-between gap-3 px-1 pb-2 sm:hidden">
          <span className="text-sm font-semibold">
            {steps[currentIndex]?.label}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {currentIndex + 1} / {steps.length}
          </span>
        </div>
        <ol className="grid grid-cols-6 gap-1 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-1">
          {steps.map((item, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = item.key === props.step;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={index > currentIndex}
                  onClick={() => props.onStepChange(item.key)}
                  className="flex min-h-10 w-full items-center justify-center gap-3 rounded-md px-1 text-left text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-11 sm:justify-start sm:px-3"
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span
                    className={
                      isCurrent || isComplete
                        ? 'flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground'
                        : 'flex size-6 items-center justify-center rounded-md border text-muted-foreground'
                    }
                  >
                    {isComplete ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Circle className="size-3" aria-hidden="true" />
                    )}
                  </span>
                  <span className="sr-only sm:not-sr-only">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="space-y-4">
        {props.errorMessage ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {props.errorMessage}
          </p>
        ) : null}
        {props.successMessage ? (
          <p className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
            {props.successMessage}
          </p>
        ) : null}
        {props.step === 'commission' ? (
          <div className="space-y-4">
            <VoteCommissionSetup
              allowCreate={false}
              commissions={props.commissions}
              isLoading={props.isCommissionsLoading}
              isSubmitting={props.isSubmitting}
              selectedCommissionId={props.selectedCommissionId}
              selectionRequired
              onCommissionChange={props.onCommissionChange}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={props.isSubmitting || !props.selectedCommissionId}
                onClick={props.onCompleteSetup}
              >
                {props.isSubmitting ? '생성 중…' : '투표 생성 후 첨부파일'}
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}
        {props.step === 'basics' ? (
          <BasicsForm
            isSubmitting={props.isSubmitting}
            organizations={props.organizations}
            onSubmit={props.onCreateVote}
          />
        ) : null}
        {props.step === 'ballot' ? (
          <BallotForm
            ballots={props.ballots}
            ballotType={props.ballotType}
            isSubmitting={props.isSubmitting}
            onNext={() => props.onStepChange('electors')}
            onTypeChange={props.onBallotTypeChange}
            onRemove={props.onRemoveBallot}
            onReorder={props.onReorderBallot}
            onSubmit={props.onCreateBallot}
          />
        ) : null}
        {props.step === 'electors' ? (
          <ElectoralRollStep
            electoralRolls={props.electoralRolls}
            isLoading={props.isElectoralRollsLoading}
            isSubmitting={props.isSubmitting}
            onChange={props.onElectoralRollChange}
            onNext={() => props.onStepChange('commission')}
            selectedElectoralRoll={props.selectedElectoralRoll}
            selectedElectoralRollId={props.selectedElectoralRollId}
          />
        ) : null}
        {props.step === 'attachments' && props.createdVote ? (
          <AttachmentsStep
            attachmentsPanel={props.attachmentsPanel}
            candidateAttachmentsPanel={props.candidateAttachmentsPanel}
            onNext={() => props.onStepChange('review')}
          />
        ) : null}
        {props.step === 'review' && props.createdVote ? (
          <Review
            billingPanel={props.billingPanel}
            createdSubVoteIds={props.createdSubVoteIds}
            createdVote={props.createdVote}
            selectedCommission={props.commissions.find(
              (commission) =>
                commission.id ===
                (props.selectedCommissionId ?? props.createdVote?.commissionId),
            )}
            selectedElectoralRoll={props.selectedElectoralRoll}
          />
        ) : null}
      </div>
    </div>
  );
}

function BasicsForm({
  isSubmitting,
  organizations,
  onSubmit,
}: {
  isSubmitting: boolean;
  organizations: ManagedOrganization[];
  onSubmit: (data: FormData) => void;
}) {
  return (
    <WizardCard
      title="기본 정책"
      description="투표의 기본 정책과 허용 채널을 설정합니다."
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={toFormHandler(onSubmit)}
      >
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          관리 조직
          <Select
            key={organizations.map((organization) => organization.id).join(',')}
            name="organizationSelection"
            required={organizations.length > 0}
            defaultValue={
              organizations[0]
                ? `${organizations[0].id}\t${organizations[0].code}`
                : ''
            }
          >
            <option value="" disabled>투표를 관리할 조직을 선택하세요</option>
            {organizations.map((organization) => (
              <option
                key={organization.id}
                value={`${organization.id}\t${organization.code}`}
              >
                {organization.code}
              </option>
            ))}
          </Select>
        </label>
        <Field
          label="투표 제목"
          name="title"
          required
          className="sm:col-span-2"
        />
        <VoteScheduleFields descriptionId="vote-schedule-description" />
        <VotePolicyFields className="sm:col-span-2" />
        <VoteAccessFields className="sm:col-span-2" />
        <Button type="submit" className="sm:col-span-2" disabled={isSubmitting}>
          <Vote aria-hidden="true" />
          안건과 후보로 이동
          <ChevronRight aria-hidden="true" />
        </Button>
      </form>
    </WizardCard>
  );
}

function ElectoralRollStep({
  electoralRolls,
  isLoading,
  isSubmitting,
  onChange,
  onNext,
  selectedElectoralRoll,
  selectedElectoralRollId,
}: {
  electoralRolls: ElectoralRollPageItemRecord[];
  isLoading?: boolean;
  isSubmitting: boolean;
  onChange: (electoralRollId: string) => void;
  onNext: () => void;
  selectedElectoralRoll?: ElectoralRollPageItemRecord;
  selectedElectoralRollId?: string;
}) {
  return (
    <WizardCard
      title="선거인명부"
      description="이미 만들어진 선거인명부를 선택해 투표에 연결합니다. 새 명부나 스냅샷은 이 단계에서 만들지 않습니다."
    >
      <div className="space-y-5">
        <label className="grid gap-2 text-sm font-medium">
          연결할 선거인명부
          <Select
            value={selectedElectoralRollId ?? ''}
            disabled={isLoading || isSubmitting || electoralRolls.length === 0}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="" disabled>
              {isLoading
                ? '선거인명부 불러오는 중…'
                : electoralRolls.length === 0
                  ? '등록된 선거인명부가 없습니다'
                  : '선거인명부를 선택하세요'}
            </option>
            {electoralRolls.map((roll) => (
              <option key={roll.id} value={roll.id}>
                {roll.name} · revision {roll.revision} · {roll.memberCount}명
              </option>
            ))}
          </Select>
        </label>

        {selectedElectoralRoll ? (
          <div className="rounded-md border bg-muted/35 p-4">
            <div className="flex items-start gap-3">
              <UsersRound
                className="mt-0.5 size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="font-medium">{selectedElectoralRoll.name}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {selectedElectoralRoll.memberCount.toLocaleString()}명
                  </Badge>
                  <Badge variant="outline">
                    revision {selectedElectoralRoll.revision.toLocaleString()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          투표를 생성하면 선택한 명부의 최신 인원이 연결됩니다.
        </p>

        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/electoral-rolls">선거인명부 관리</Link>
          </Button>
          <Button
            type="button"
            disabled={!selectedElectoralRollId || isSubmitting}
            onClick={onNext}
          >
            운영 위원회로 이동
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </WizardCard>
  );
}

function BallotForm({
  ballots,
  ballotType,
  isSubmitting,
  onNext,
  onRemove,
  onReorder,
  onSubmit,
  onTypeChange,
}: {
  ballots: VoteSetupBallotDraft[];
  ballotType: VoteSetupBallotDraft['type'];
  isSubmitting: boolean;
  onNext: () => void;
  onRemove: (ballotIndex: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSubmit: (data: FormData) => void;
  onTypeChange: (type: VoteSetupBallotDraft['type']) => void;
}) {
  return (
    <WizardCard
      title="안건과 후보"
      description={`안건과 후보를 반복해서 추가합니다. 현재 ${ballots.length}개 안건을 입력했습니다.`}
    >
      {ballots.length > 0 ? (
        <div className="mb-6 space-y-3" aria-label="추가된 안건 목록">
          <p className="text-sm text-muted-foreground">
            드래그 핸들을 끌어 안건 순서를 변경하세요. 핸들에 초점을 둔 뒤
            위·아래 방향키로도 이동할 수 있습니다.
          </p>
          {ballots.map((ballot, index) => (
            <article
              key={`${ballot.title}-${index}`}
              aria-label={`${ballot.title} 안건`}
              className="rounded-md border bg-muted/35 p-4 transition-[border-color,background-color,opacity]"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                const fromIndex = Number(
                  event.dataTransfer.getData('application/x-vote-ballot-index'),
                );
                if (
                  Number.isInteger(fromIndex) &&
                  fromIndex >= 0 &&
                  fromIndex < ballots.length &&
                  fromIndex !== index
                ) {
                  onReorder(fromIndex, index);
                }
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <button
                    type="button"
                    draggable={!isSubmitting}
                    disabled={isSubmitting}
                    aria-label={`${ballot.title} 안건 끌어서 이동`}
                    className="mt-0.5 inline-flex size-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData(
                        'application/x-vote-ballot-index',
                        String(index),
                      );
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowUp' && index > 0) {
                        event.preventDefault();
                        onReorder(index, index - 1);
                      }
                      if (
                        event.key === 'ArrowDown' &&
                        index < ballots.length - 1
                      ) {
                        event.preventDefault();
                        onReorder(index, index + 1);
                      }
                    }}
                  >
                    <GripVertical aria-hidden="true" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">안건 {index + 1}</Badge>
                      <Badge variant="outline">
                        {ballot.type === 'CANDIDATE' ? '후보자형' : '찬반형'}
                      </Badge>
                    </div>
                    <h3 className="mt-3 font-medium">{ballot.title}</h3>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`${ballot.title} 안건 제거`}
                  onClick={() => onRemove(index)}
                >
                  <Trash2 aria-hidden="true" />
                  제거
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {ballot.type === 'YES_NO' ? (
                  <Badge variant="outline">찬성 / 반대</Badge>
                ) : (
                  ballot.candidateNames.map((candidate, candidateIndex) => (
                    <Badge
                      key={`${candidate}-${candidateIndex}`}
                      variant="outline"
                    >
                      후보 {candidateIndex + 1} · {candidate}
                    </Badge>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <div className={ballots.length > 0 ? 'border-t pt-6' : undefined}>
        <div className="mb-5">
          <h3 className="font-medium">새 안건 추가</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            먼저 투표 방식을 선택하면 필요한 입력 항목만 보여드립니다.
          </p>
        </div>
        <form className="space-y-5" onSubmit={toFormHandler(onSubmit, true)}>
          <fieldset>
            <legend className="text-sm font-medium">어떤 투표인가요?</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-[border-color,background-color,box-shadow] hover:bg-muted/40 ${
                  ballotType === 'CANDIDATE'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/15'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value="CANDIDATE"
                  checked={ballotType === 'CANDIDATE'}
                  onChange={() => onTypeChange('CANDIDATE')}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span>
                  <span className="flex items-center gap-2 font-medium">
                    <UsersRound className="size-4" aria-hidden="true" />
                    후보자 선택
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    등록한 후보 중 한 명을 선택합니다.
                  </span>
                </span>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-[border-color,background-color,box-shadow] hover:bg-muted/40 ${
                  ballotType === 'YES_NO'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/15'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value="YES_NO"
                  checked={ballotType === 'YES_NO'}
                  onChange={() => onTypeChange('YES_NO')}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span>
                  <span className="flex items-center gap-2 font-medium">
                    <ListChecks className="size-4" aria-hidden="true" />
                    찬성·반대
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    하나의 제안에 찬성 또는 반대를 선택합니다.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="grid gap-2 text-sm font-medium">
            <label htmlFor="vote-ballot-title">
              {ballotType === 'YES_NO'
                ? '표결할 내용'
                : '선출할 직책 또는 안건'}
            </label>
            <Input
              id="vote-ballot-title"
              name="title"
              required
              autoComplete="off"
              aria-describedby="vote-ballot-title-description"
              placeholder={
                ballotType === 'YES_NO'
                  ? '예: 2027년도 사업 예산 승인'
                  : '예: 회장 선출'
              }
            />
            <span
              id="vote-ballot-title-description"
              className="text-xs font-normal text-muted-foreground"
            >
              투표 참여자가 목록에서 바로 이해할 수 있도록 짧고 분명하게
              작성하세요.
            </span>
          </div>

          {ballotType === 'CANDIDATE' ? (
            <fieldset className="rounded-lg border bg-muted/25 p-4">
              <legend className="px-1 text-sm font-medium">후보자</legend>
              <p className="mb-4 text-sm text-muted-foreground">
                투표용지에 표시할 이름을 순서대로 입력하세요.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  후보 1
                  <Input
                    name="candidate1"
                    required
                    autoComplete="off"
                    placeholder="첫 번째 후보 이름"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  후보 2
                  <Input
                    name="candidate2"
                    required
                    autoComplete="off"
                    placeholder="두 번째 후보 이름"
                  />
                </label>
              </div>
            </fieldset>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border bg-muted/25 p-4">
              <ListChecks
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium">
                  선택지는 자동으로 만듭니다.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  투표 화면에는 ‘찬성’과 ‘반대’ 두 선택지가 표시됩니다.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-3 border-t pt-5 sm:grid-cols-2">
            <Button type="submit" variant="outline" disabled={isSubmitting}>
              <Plus aria-hidden="true" />
              {ballotType === 'YES_NO' ? '찬반 안건 추가' : '후보자 안건 추가'}
            </Button>
            <Button
              type="button"
              disabled={ballots.length === 0}
              onClick={onNext}
            >
              선거인명부로 이동
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </form>
      </div>
    </WizardCard>
  );
}

function Review({
  billingPanel,
  createdSubVoteIds,
  createdVote,
  selectedCommission,
  selectedElectoralRoll,
}: {
  billingPanel?: ReactNode;
  createdSubVoteIds: string[];
  createdVote: CreateVoteResult;
  selectedCommission?: CommissionRecord;
  selectedElectoralRoll?: ElectoralRollPageItemRecord;
}) {
  return (
    <WizardCard
      title="설정 검토"
      description="생성된 투표의 설정을 확인하고 상세 화면에서 추가 설정을 이어가세요."
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <Summary label="상태" value="초안" />
        <Summary
          label="운영 위원회"
          value={
            selectedCommission?.name ??
            (createdVote.commissionId ? '지정됨' : '미지정')
          }
        />
        <Summary
          label="선거인명부"
          value={
            selectedElectoralRoll?.name ??
            (createdVote.electoralRollId ? '연결됨' : '미연결')
          }
        />
        <Summary
          label="안건"
          value={`${createdSubVoteIds.length.toLocaleString()}개`}
        />
      </dl>
      {createdSubVoteIds.length > 0 ? (
        <div className="mt-5 rounded-md border p-4">
          <p className="text-sm font-medium">후보자 첨부파일</p>
          <p className="mt-1 text-sm text-muted-foreground">
            결제를 시작하기 전에 각 안건 화면에서 후보자 자료를 등록하세요.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {createdSubVoteIds.map((voteDetailId, index) => (
              <Button
                key={voteDetailId}
                type="button"
                variant="outline"
                asChild
              >
                <Link
                  href={`/votes/${createdVote.id}/sub-votes/${voteDetailId}`}
                >
                  {index + 1}번 안건 후보 첨부
                </Link>
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {billingPanel}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/votes/${createdVote.id}`}>투표 상세</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/votes/${createdVote.id}/electors`}>선거인 관리</Link>
        </Button>
      </div>
    </WizardCard>
  );
}

function AttachmentsStep({
  attachmentsPanel,
  candidateAttachmentsPanel,
  onNext,
}: {
  attachmentsPanel?: ReactNode;
  candidateAttachmentsPanel?: ReactNode;
  onNext: () => void;
}) {
  return (
    <WizardCard
      title="첨부파일 등록"
      description="생성된 투표 초안과 후보자에 필요한 파일을 등록합니다. 파일이 없다면 이 단계를 건너뛸 수 있습니다."
    >
      <div className="space-y-5">
        {attachmentsPanel}
        {candidateAttachmentsPanel ? (
          <section aria-labelledby="setup-candidate-attachments-title">
            <h3
              id="setup-candidate-attachments-title"
              className="mb-3 font-semibold"
            >
              후보자 첨부파일
            </h3>
            {candidateAttachmentsPanel}
          </section>
        ) : (
          <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            첨부파일을 등록할 후보자가 없습니다.
          </p>
        )}
        <div className="flex justify-end border-t pt-5">
          <Button type="button" onClick={onNext}>
            설정 검토로 이동
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </WizardCard>
  );
}

function WizardCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant="secondary">설정 중</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  className,
  label,
  name,
  ...props
}: {
  className?: string;
  label: string;
  name: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <label className={`grid gap-2 text-sm font-medium ${className ?? ''}`}>
      {label}
      <Input name={name} {...props} />
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-2 break-all font-medium">{value}</dd>
    </div>
  );
}

function toFormHandler(handler: (data: FormData) => void, reset = false) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handler(new FormData(event.currentTarget));
    if (reset) event.currentTarget.reset();
  };
}

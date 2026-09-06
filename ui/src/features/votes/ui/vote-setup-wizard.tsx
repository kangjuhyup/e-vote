import {
  Check,
  ChevronRight,
  Circle,
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
import type {
  CommissionRecord,
  CreateVoteResult,
} from '@/features/votes/model/vote-operations.types';

import { VoteCommissionSetup } from './vote-commission-setup';
import { VoteScheduleFields } from './vote-schedule-fields';

export type VoteSetupStep =
  'ballot' | 'basics' | 'commission' | 'electors' | 'review';

export interface VoteSetupBallotDraft {
  candidateNames: string[];
  sortOrder: number;
  title: string;
  type: 'CANDIDATE' | 'YES_NO';
}

interface VoteSetupWizardProps {
  ballots: VoteSetupBallotDraft[];
  ballotType: VoteSetupBallotDraft['type'];
  billingPanel?: ReactNode;
  commissions: CommissionRecord[];
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
  { key: 'review', label: '검토' },
];

export function VoteSetupWizard(props: VoteSetupWizardProps) {
  const currentIndex = steps.findIndex((item) => item.key === props.step);

  return (
    <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-start">
      <nav
        aria-label="투표 설정 진행 상태"
        className="rounded-lg border bg-card p-3 xl:sticky xl:top-5"
      >
        <ol className="grid gap-1 sm:grid-cols-5 xl:grid-cols-1">
          {steps.map((item, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = item.key === props.step;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={index > currentIndex}
                  onClick={() => props.onStepChange(item.key)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
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
                  {item.label}
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
                {props.isSubmitting ? '생성 중…' : '투표 생성 후 검토'}
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}
        {props.step === 'basics' ? (
          <BasicsForm
            isSubmitting={props.isSubmitting}
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
  onSubmit,
}: {
  isSubmitting: boolean;
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
        <Field
          label="투표 제목"
          name="title"
          required
          className="sm:col-span-2"
        />
        <VoteScheduleFields descriptionId="vote-schedule-description" />
        <label className="grid gap-2 text-sm font-medium">
          공개 범위
          <Select name="privacyMode" defaultValue="SECRET">
            <option value="SECRET">비밀 투표</option>
            <option value="PUBLIC">공개 투표</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          참여 단위
          <Select name="participationUnit" defaultValue="INDIVIDUAL">
            <option value="INDIVIDUAL">개인</option>
            <option value="GROUP">그룹</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          가중치 방식
          <Select name="voteWeightMode" defaultValue="EQUAL">
            <option value="EQUAL">동일 가중치</option>
            <option value="SHARE">지분 가중치</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          결과 저장
          <Select name="resultStorageMode" defaultValue="DATABASE">
            <option value="DATABASE">데이터베이스</option>
            <option value="BLOCKCHAIN">블록체인</option>
          </Select>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">허용 채널</legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <CheckOption
              name="channel"
              value="ONLINE"
              label="온라인"
              defaultChecked
            />
            <CheckOption name="channel" value="ONSITE" label="현장" />
            <CheckOption name="channel" value="VISIT" label="방문" />
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="identityRequired"
            className="size-4 rounded border"
          />
          본인인증 필수
        </label>
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
          선택한 명부의 최신 기존 스냅샷은 투표 생성 시 서버에서 연결됩니다.
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
  onSubmit,
  onTypeChange,
}: {
  ballots: VoteSetupBallotDraft[];
  ballotType: VoteSetupBallotDraft['type'];
  isSubmitting: boolean;
  onNext: () => void;
  onRemove: (ballotIndex: number) => void;
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
          {ballots.map((ballot, index) => (
            <article
              key={`${ballot.title}-${index}`}
              className="rounded-md border bg-muted/35 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">안건 {index + 1}</Badge>
                    <Badge variant="outline">
                      {ballot.type === 'CANDIDATE' ? '후보자형' : '찬반형'}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-medium">{ballot.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    정렬 순서 {ballot.sortOrder}
                  </p>
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
        <h3 className="mb-4 text-sm font-medium">새 안건 추가</h3>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={toFormHandler(onSubmit, true)}
        >
          <Field
            label={ballotType === 'YES_NO' ? '찬반 안건' : '안건 제목'}
            name="title"
            required
            className="sm:col-span-2"
          />
          <label className="grid gap-2 text-sm font-medium">
            유형
            <Select
              name="type"
              value={ballotType}
              onChange={(event) =>
                onTypeChange(event.target.value as VoteSetupBallotDraft['type'])
              }
            >
              <option value="CANDIDATE">후보자형</option>
              <option value="YES_NO">찬반형</option>
            </Select>
          </label>
          <Field
            label="정렬 순서"
            name="sortOrder"
            type="number"
            min="0"
            defaultValue="0"
            required
          />
          {ballotType === 'CANDIDATE' ? (
            <>
              <Field label="후보 1" name="candidate1" required />
              <Field label="후보 2" name="candidate2" required />
            </>
          ) : null}
          <Button type="submit" variant="outline" disabled={isSubmitting}>
            <Plus aria-hidden="true" />
            안건 추가
          </Button>
          <Button
            type="button"
            disabled={ballots.length === 0}
            onClick={onNext}
          >
            선거인명부로 이동
            <ChevronRight aria-hidden="true" />
          </Button>
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

function CheckOption({
  label,
  ...props
}: { label: string } & React.ComponentProps<'input'>) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" className="size-4 rounded border" {...props} />
      {label}
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

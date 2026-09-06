'use client';

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileSpreadsheet,
  Plus,
  Trash2,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type {
  CreateElectoralRollResult,
  ElectoralRollImportMemberInput,
  StageElectoralRollMembersResult,
} from '@/features/votes/model/electoral-roll.types';

import { ElectoralRollImportCard } from './electoral-roll-import-card';

export type ElectoralRollSetupStep =
  | 'complete'
  | 'details'
  | 'members'
  | 'review';
export type ElectoralRollRegistrationMode = 'excel' | 'manual';

interface ElectoralRollSetupWizardProps {
  createdRoll?: CreateElectoralRollResult;
  errorMessage?: string;
  isSubmitting: boolean;
  members: ElectoralRollImportMemberInput[];
  mode: ElectoralRollRegistrationMode;
  name: string;
  onAddMember: (data: FormData) => boolean;
  onCreate: () => void;
  onImportMembers: (
    members: ElectoralRollImportMemberInput[],
  ) => Promise<StageElectoralRollMembersResult>;
  onModeChange: (mode: ElectoralRollRegistrationMode) => void;
  onNameSubmit: (name: string) => void;
  onRemoveMember: (identifier: string) => void;
  onStepChange: (step: ElectoralRollSetupStep) => void;
  step: ElectoralRollSetupStep;
}

const steps: Array<{
  description: string;
  key: Exclude<ElectoralRollSetupStep, 'complete'>;
  label: string;
}> = [
  {
    key: 'details',
    label: '기본 정보',
    description: '명부 이름 설정',
  },
  {
    key: 'members',
    label: '구성원 등록',
    description: '엑셀 또는 직접 입력',
  },
  {
    key: 'review',
    label: '검토 및 생성',
    description: '등록 내용 최종 확인',
  },
];

export function ElectoralRollSetupWizard(
  props: ElectoralRollSetupWizardProps,
) {
  const currentIndex = steps.findIndex((item) => item.key === props.step);

  if (props.step === 'complete' && props.createdRoll) {
    return (
      <Completion
        createdRoll={props.createdRoll}
        memberCount={props.members.length}
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
      <nav
        aria-label="선거인명부 생성 진행 상태"
        className="rounded-lg border bg-card p-3 xl:sticky xl:top-5"
      >
        <ol className="grid gap-1 md:grid-cols-3 xl:grid-cols-1">
          {steps.map((item, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = item.key === props.step;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={index > currentIndex || props.isSubmitting}
                  onClick={() => props.onStepChange(item.key)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className="flex min-h-14 w-full touch-manipulation items-center gap-3 rounded-md px-3 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={
                      isCurrent || isComplete
                        ? 'flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground'
                        : 'flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground'
                    }
                  >
                    {isComplete ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Circle className="size-3" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
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

        {props.step === 'details' ? (
          <DetailsStep
            defaultName={props.name}
            onSubmit={props.onNameSubmit}
          />
        ) : null}
        {props.step === 'members' ? (
          <MembersStep
            isSubmitting={props.isSubmitting}
            members={props.members}
            mode={props.mode}
            onAddMember={props.onAddMember}
            onBack={() => props.onStepChange('details')}
            onImportMembers={props.onImportMembers}
            onModeChange={props.onModeChange}
            onNext={() => props.onStepChange('review')}
            onRemoveMember={props.onRemoveMember}
          />
        ) : null}
        {props.step === 'review' ? (
          <ReviewStep
            isSubmitting={props.isSubmitting}
            members={props.members}
            name={props.name}
            onBack={() => props.onStepChange('members')}
            onCreate={props.onCreate}
          />
        ) : null}
      </div>
    </div>
  );
}

function DetailsStep({
  defaultName,
  onSubmit,
}: {
  defaultName: string;
  onSubmit: (name: string) => void;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>명부 기본 정보</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          여러 투표에서 구분하기 쉬운 이름을 입력하세요. 구성원은 다음
          단계에서 등록합니다.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(String(new FormData(event.currentTarget).get('name') ?? ''));
          }}
        >
          <div className="grid gap-2">
            <label
              htmlFor="electoral-roll-name"
              className="text-sm font-medium"
            >
              선거인명부 이름
            </label>
            <Input
              id="electoral-roll-name"
              name="name"
              defaultValue={defaultName}
              autoComplete="off"
              placeholder="예: 2026년 정기총회 선거인명부…"
              maxLength={100}
              aria-describedby="electoral-roll-name-help"
              required
            />
            <p
              id="electoral-roll-name-help"
              className="text-xs text-muted-foreground"
            >
              투표 제목과 조직 또는 기간을 함께 적으면 찾기 쉽습니다.
            </p>
          </div>
          <div className="flex justify-end border-t pt-5">
            <Button type="submit">
              구성원 등록으로 이동
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MembersStep({
  isSubmitting,
  members,
  mode,
  onAddMember,
  onBack,
  onImportMembers,
  onModeChange,
  onNext,
  onRemoveMember,
}: {
  isSubmitting: boolean;
  members: ElectoralRollImportMemberInput[];
  mode: ElectoralRollRegistrationMode;
  onAddMember: (data: FormData) => boolean;
  onBack: () => void;
  onImportMembers: (
    members: ElectoralRollImportMemberInput[],
  ) => Promise<StageElectoralRollMembersResult>;
  onModeChange: (mode: ElectoralRollRegistrationMode) => void;
  onNext: () => void;
  onRemoveMember: (identifier: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>구성원 등록 방식</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            인원이 많다면 엑셀 등록을 사용하세요. 두 방식을 번갈아 사용해도
            입력한 구성원은 유지됩니다.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeButton
              active={mode === 'excel'}
              description="템플릿으로 최대 5,000명을 검증해 등록합니다."
              icon={<FileSpreadsheet aria-hidden="true" />}
              label="엑셀로 일괄 등록"
              recommended
              onClick={() => onModeChange('excel')}
            />
            <ModeButton
              active={mode === 'manual'}
              description="소규모 명부의 구성원을 한 명씩 입력합니다."
              icon={<UserPlus aria-hidden="true" />}
              label="직접 입력"
              onClick={() => onModeChange('manual')}
            />
          </div>
        </CardContent>
      </Card>

      {mode === 'excel' ? (
        <ElectoralRollImportCard
          isSubmitting={isSubmitting}
          mode="create"
          onImportMembers={onImportMembers}
        />
      ) : (
        <ManualMemberCard
          isSubmitting={isSubmitting}
          onAddMember={onAddMember}
        />
      )}

      <DraftMembersCard
        members={members}
        onRemoveMember={onRemoveMember}
      />

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          기본 정보
        </Button>
        <Button type="button" onClick={onNext}>
          {members.length > 0 ? '구성원 검토로 이동' : '구성원 없이 검토'}
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  description,
  icon,
  label,
  onClick,
  recommended = false,
}: {
  active: boolean;
  description: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  recommended?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="touch-manipulation rounded-lg border bg-background p-4 text-left transition-[border-color,background-color,box-shadow] hover:border-foreground/25 aria-pressed:border-primary aria-pressed:bg-primary/5 aria-pressed:ring-2 aria-pressed:ring-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-medium">
          {icon}
          {label}
        </span>
        {recommended ? <Badge variant="secondary">추천</Badge> : null}
      </span>
      <span className="mt-2 block text-sm leading-6 text-muted-foreground">
        {description}
      </span>
    </button>
  );
}

function ManualMemberCard({
  isSubmitting,
  onAddMember,
}: {
  isSubmitting: boolean;
  onAddMember: (data: FormData) => boolean;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="text-base">구성원 직접 입력</CardTitle>
        <p
          id="setup-member-identity-guidance"
          className="text-sm leading-6 text-muted-foreground"
        >
          본인인증 투표에 사용할 구성원은 이름과 휴대폰번호를 함께 입력해야
          합니다.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (onAddMember(new FormData(event.currentTarget))) {
              event.currentTarget.reset();
            }
          }}
        >
          <div className="grid gap-3 md:grid-cols-3 md:items-end">
            <Field
              label="식별자"
              name="identifier"
              autoComplete="off"
              placeholder="예: member-001…"
              required
            />
            <Field
              label="이름"
              name="name"
              autoComplete="off"
              aria-describedby="setup-member-identity-guidance"
            />
            <Field
              label="휴대폰번호"
              name="phoneNumber"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="예: 010-1234-5678…"
              aria-describedby="setup-member-identity-guidance"
            />
          </div>
          <details className="rounded-lg border bg-muted/20 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              추가 정보 입력
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Field
                label="생년월일"
                name="birthDate"
                inputMode="numeric"
                autoComplete="off"
                placeholder="예: 1990-01-01…"
              />
              <Field
                label="그룹 키"
                name="groupKey"
                autoComplete="off"
              />
              <Field
                label="투표 가중치"
                name="voteWeight"
                type="number"
                min="0.000001"
                step="any"
                defaultValue="1"
                required
              />
            </div>
          </details>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              <Plus aria-hidden="true" />
              구성원 추가
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DraftMembersCard({
  members,
  onRemoveMember,
}: {
  members: ElectoralRollImportMemberInput[];
  onRemoveMember?: (identifier: string) => void;
}) {
  return (
    <Card className="gap-0 overflow-hidden rounded-lg py-0">
      <CardHeader className="border-b py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">등록할 구성원</CardTitle>
            <p
              className="mt-1 text-sm tabular-nums text-muted-foreground"
              aria-live="polite"
            >
              전체 {members.length.toLocaleString()}명
            </p>
          </div>
          <UsersRound className="size-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {members.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            아직 등록할 구성원이 없습니다.
          </p>
        ) : (
          <>
            <ul className="divide-y md:hidden">
              {members.slice(0, 10).map((member) => (
                <li key={member.identifier} className="space-y-2 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{member.identifier}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {identityLabel(member)}
                      </p>
                    </div>
                    {onRemoveMember ? (
                      <RemoveMemberButton
                        identifier={member.identifier}
                        onRemove={onRemoveMember}
                      />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {member.groupKey ? `그룹 ${member.groupKey} · ` : ''}
                    가중치 {member.voteWeight.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">생성할 명부 구성원 미리보기</caption>
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-3 pl-6 pr-3 font-medium">
                      식별자
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      본인인증 정보
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      그룹
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">
                      가중치
                    </th>
                    {onRemoveMember ? (
                      <th scope="col" className="py-3 pl-3 pr-6 text-right font-medium">
                        관리
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.slice(0, 10).map((member) => (
                    <tr key={member.identifier}>
                      <td className="py-3 pl-6 pr-3 font-medium">
                        {member.identifier}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {identityLabel(member)}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {member.groupKey ?? '미지정'}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {member.voteWeight.toLocaleString()}
                      </td>
                      {onRemoveMember ? (
                        <td className="py-3 pl-3 pr-6 text-right">
                          <RemoveMemberButton
                            identifier={member.identifier}
                            onRemove={onRemoveMember}
                          />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {members.length > 10 ? (
              <p className="border-t px-6 py-3 text-sm text-muted-foreground">
                외 {(members.length - 10).toLocaleString()}명은 생성 시 함께
                등록됩니다.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewStep({
  isSubmitting,
  members,
  name,
  onBack,
  onCreate,
}: {
  isSubmitting: boolean;
  members: ElectoralRollImportMemberInput[];
  name: string;
  onBack: () => void;
  onCreate: () => void;
}) {
  const identityReadyCount = members.filter(
    (member) => member.name && member.phoneNumber,
  ).length;
  const groupCount = new Set(
    members.flatMap((member) => (member.groupKey ? [member.groupKey] : [])),
  ).size;

  return (
    <div className="space-y-4">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>생성 내용 검토</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            생성 후에도 구성원을 추가하거나 수정할 수 있습니다.
          </p>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReviewSummary label="명부 이름" value={name} />
            <ReviewSummary
              label="구성원"
              value={`${members.length.toLocaleString()}명`}
            />
            <ReviewSummary
              label="본인인증 정보 완성"
              value={`${identityReadyCount.toLocaleString()}명`}
            />
            <ReviewSummary
              label="그룹"
              value={`${groupCount.toLocaleString()}개`}
            />
          </dl>
        </CardContent>
      </Card>

      <DraftMembersCard members={members} />

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" />
          구성원 수정
        </Button>
        <Button type="button" disabled={isSubmitting} onClick={onCreate}>
          {isSubmitting ? '선거인명부 생성 중…' : '선거인명부 생성'}
          {isSubmitting ? null : <Check aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}

function Completion({
  createdRoll,
  memberCount,
}: {
  createdRoll: CreateElectoralRollResult;
  memberCount: number;
}) {
  return (
    <Card className="mx-auto max-w-2xl rounded-lg">
      <CardContent className="py-10 text-center">
        <CheckCircle2
          className="mx-auto size-12 text-emerald-600"
          aria-hidden="true"
        />
        <h2 className="mt-4 text-2xl font-semibold">선거인명부 생성 완료</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {createdRoll.name}에 구성원 {memberCount.toLocaleString()}명을
          등록했습니다.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button type="button" variant="outline" asChild>
            <Link href="/electoral-rolls">선거인명부 목록</Link>
          </Button>
          <Button type="button" asChild>
            <Link href="/votes/new">
              새 투표 만들기
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function RemoveMemberButton({
  identifier,
  onRemove,
}: {
  identifier: string;
  onRemove: (identifier: string) => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      aria-label={`${identifier} 구성원 제거`}
      onClick={() => onRemove(identifier)}
    >
      <Trash2 aria-hidden="true" />
      제거
    </Button>
  );
}

function identityLabel(member: ElectoralRollImportMemberInput) {
  if (!member.name || !member.phoneNumber) return '미입력';
  return member.birthDate
    ? `${member.name} · ${member.phoneNumber} · 생년월일 입력`
    : `${member.name} · ${member.phoneNumber}`;
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input name={name} {...props} />
    </label>
  );
}

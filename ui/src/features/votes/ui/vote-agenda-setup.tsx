'use client';

import { ListChecks, Plus, UsersRound } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { VoteDetailType } from '@/features/votes/model/vote-operations.types';
import type { VoteSubVote } from '@/features/votes/model/vote.types';

export interface VoteAgendaInput {
  candidateNames: string[];
  title: string;
  type: VoteDetailType;
}

interface VoteAgendaSetupProps {
  agendas: VoteSubVote[];
  disabled?: boolean;
  isSubmitting: boolean;
  onSubmit: (input: VoteAgendaInput) => Promise<void>;
}

export function VoteAgendaSetup({
  agendas,
  disabled = false,
  isSubmitting,
  onSubmit,
}: VoteAgendaSetupProps) {
  const [agendaType, setAgendaType] = useState<VoteDetailType>('CANDIDATE');
  const [validationMessage, setValidationMessage] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    const candidateNames =
      agendaType === 'CANDIDATE'
        ? ['candidate1', 'candidate2'].map((name) =>
            String(data.get(name) ?? '').trim(),
          )
        : [];

    if (!title) {
      setValidationMessage('안건 제목을 입력하세요.');
      return;
    }
    if (candidateNames.some((name) => !name)) {
      setValidationMessage('후보자 이름을 모두 입력하세요.');
      return;
    }

    setValidationMessage(undefined);
    try {
      await onSubmit({ candidateNames, title, type: agendaType });
      form.reset();
      setAgendaType('CANDIDATE');
    } catch {
      // The container renders the API error and keeps the current input for retry.
    }
  }

  const sortedAgendas = [...agendas].sort(
    (left, right) => left.order - right.order,
  );

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>안건과 후보</CardTitle>
        <p className="text-sm text-muted-foreground">
          투표에 포함할 안건을 추가합니다. 새 안건은 현재 목록의 마지막에
          배치됩니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedAgendas.length > 0 ? (
          <div className="space-y-3" aria-label="등록된 안건">
            <p className="text-sm font-medium">
              등록된 안건 {sortedAgendas.length}개
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {sortedAgendas.map((agenda, index) => (
                <div
                  key={agenda.id}
                  className="flex min-w-0 items-center gap-3 rounded-lg border bg-muted/25 px-4 py-3"
                >
                  <Badge variant="secondary">{index + 1}</Badge>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {agenda.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {agenda.type === 'candidate'
                        ? `후보자형 · 후보 ${agenda.candidates.length}명`
                        : '찬반형'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
            아직 등록된 안건이 없습니다. 첫 안건을 추가하세요.
          </p>
        )}

        <form className="space-y-5 border-t pt-6" onSubmit={handleSubmit}>
          <div>
            <h3 className="font-medium">새 안건 추가</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              투표 방식을 선택하면 필요한 입력 항목만 표시됩니다.
            </p>
          </div>

          <fieldset disabled={disabled || isSubmitting}>
            <legend className="text-sm font-medium">투표 방식</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <AgendaTypeOption
                checked={agendaType === 'CANDIDATE'}
                description="등록한 후보 중 한 명을 선택합니다."
                icon={<UsersRound className="size-4" aria-hidden="true" />}
                label="후보자 선택"
                value="CANDIDATE"
                onChange={setAgendaType}
              />
              <AgendaTypeOption
                checked={agendaType === 'YES_NO'}
                description="하나의 제안에 찬성 또는 반대를 선택합니다."
                icon={<ListChecks className="size-4" aria-hidden="true" />}
                label="찬성·반대"
                value="YES_NO"
                onChange={setAgendaType}
              />
            </div>
          </fieldset>

          <label className="grid gap-2 text-sm font-medium">
            {agendaType === 'YES_NO' ? '표결할 내용' : '선출할 직책 또는 안건'}
            <Input
              name="title"
              required
              disabled={disabled || isSubmitting}
              autoComplete="off"
              aria-describedby="vote-edit-agenda-title-description"
              placeholder={
                agendaType === 'YES_NO'
                  ? '예: 2027년도 사업 예산 승인'
                  : '예: 회장 선출'
              }
            />
            <span
              id="vote-edit-agenda-title-description"
              className="text-xs font-normal text-muted-foreground"
            >
              참여자가 투표 항목을 바로 이해할 수 있도록 짧고 분명하게
              작성하세요.
            </span>
          </label>

          {agendaType === 'CANDIDATE' ? (
            <fieldset
              disabled={disabled || isSubmitting}
              className="rounded-lg border bg-muted/25 p-4"
            >
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
                  투표 화면에는 ‘찬성’과 ‘반대’가 표시됩니다.
                </p>
              </div>
            </div>
          )}

          {validationMessage ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {validationMessage}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={disabled || isSubmitting}
          >
            <Plus aria-hidden="true" />
            {isSubmitting
              ? '안건 추가 중…'
              : agendaType === 'YES_NO'
                ? '찬반 안건 추가'
                : '후보자 안건 추가'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AgendaTypeOption({
  checked,
  description,
  icon,
  label,
  onChange,
  value,
}: {
  checked: boolean;
  description: string;
  icon: ReactNode;
  label: string;
  onChange: (value: VoteDetailType) => void;
  value: VoteDetailType;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-[border-color,background-color,box-shadow] hover:bg-muted/40 has-disabled:cursor-not-allowed has-disabled:opacity-50 ${
        checked ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : ''
      }`}
    >
      <input
        type="radio"
        name="type"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-1 size-4 shrink-0 accent-primary"
      />
      <span>
        <span className="flex items-center gap-2 font-medium">
          {icon}
          {label}
        </span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { electoralRollApi } from '@/features/votes/api/electoral-roll-api';
import { validateElectoralRollMemberIdentity } from '@/features/votes/lib/electoral-roll-member-validation';
import type {
  CreateElectoralRollResult,
  ElectoralRollImportMemberInput,
} from '@/features/votes/model/electoral-roll.types';

import { VoteNavigation } from '../ui/vote-navigation';
import {
  ElectoralRollSetupWizard,
  type ElectoralRollRegistrationMode,
  type ElectoralRollSetupStep,
} from '../ui/electoral-roll-setup-wizard';

interface ElectoralRollSetupContainerProps {
  account?: ReactNode;
}

export function ElectoralRollSetupContainer({
  account,
}: ElectoralRollSetupContainerProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ElectoralRollSetupStep>('details');
  const [name, setName] = useState('');
  const [members, setMembers] = useState<ElectoralRollImportMemberInput[]>([]);
  const [mode, setMode] =
    useState<ElectoralRollRegistrationMode>('excel');
  const [createdRoll, setCreatedRoll] =
    useState<CreateElectoralRollResult>();
  const [membersPersisted, setMembersPersisted] = useState(false);
  const [draftErrorMessage, setDraftErrorMessage] = useState<string>();

  const createMutation = useMutation({
    mutationFn: async () => {
      let roll = createdRoll;
      if (!roll) {
        roll = await electoralRollApi.createElectoralRoll({ name });
        setCreatedRoll(roll);
      }
      if (members.length > 0 && !membersPersisted) {
        await electoralRollApi.addMembers({
          electoralRollId: roll.id,
          members,
        });
        setMembersPersisted(true);
      }
      return roll;
    },
    onSuccess: async (roll) => {
      setCreatedRoll(roll);
      setStep('complete');
      await queryClient.invalidateQueries({
        queryKey: ['electoral-rolls'],
      });
    },
  });

  const hasUnsavedWork =
    step !== 'complete' && (name.trim().length > 0 || members.length > 0);
  useEffect(() => {
    if (!hasUnsavedWork) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedWork]);

  function clearError() {
    setDraftErrorMessage(undefined);
    createMutation.reset();
  }

  function stageMembers(nextMembers: ElectoralRollImportMemberInput[]) {
    clearError();
    const normalized = nextMembers.map((member, index) => ({
      birthDate: member.birthDate?.trim() || undefined,
      groupKey: member.groupKey?.trim() || undefined,
      identifier: member.identifier.trim(),
      name: member.name?.trim() || undefined,
      phoneNumber: member.phoneNumber?.trim() || undefined,
      rowNumber: member.rowNumber || members.length + index + 1,
      voteWeight: member.voteWeight,
    }));
    const validationError = validateMembers([...members, ...normalized]);
    if (validationError) throw new Error(validationError);
    setMembers((current) => [...current, ...normalized]);
    return { stagedMemberCount: normalized.length };
  }

  const mutationError = createMutation.error;
  const errorMessage =
    draftErrorMessage ??
    (mutationError instanceof Error
      ? createdRoll
        ? `명부는 생성됐지만 구성원을 저장하지 못했습니다. 다시 시도하세요. ${mutationError.message}`
        : mutationError.message
      : undefined);

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation
          current="electoral-rolls"
          isMockMode={electoralRollApi.mode === 'mock'}
        />
      }
      eyebrow="선거인 관리"
      title="새 선거인명부 만들기"
      description="명부 이름과 구성원을 준비하고 생성 전 등록 내용을 검토합니다."
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href="/electoral-rolls">
            <ArrowLeft aria-hidden="true" />
            선거인명부 목록
          </Link>
        </Button>
      }
    >
      <ElectoralRollSetupWizard
        createdRoll={createdRoll}
        errorMessage={errorMessage}
        isSubmitting={createMutation.isPending}
        members={members}
        mode={mode}
        name={name}
        step={step}
        onAddMember={(data) => {
          try {
            stageMembers([
              {
                birthDate:
                  String(data.get('birthDate') ?? '').trim() || undefined,
                groupKey: String(data.get('groupKey') ?? '').trim() || undefined,
                identifier: String(data.get('identifier') ?? ''),
                name: String(data.get('name') ?? '').trim() || undefined,
                phoneNumber:
                  String(data.get('phoneNumber') ?? '').trim() || undefined,
                rowNumber: members.length + 1,
                voteWeight: Number(data.get('voteWeight') ?? 1),
              },
            ]);
            return true;
          } catch (error) {
            setDraftErrorMessage(
              error instanceof Error ? error.message : '구성원을 확인하세요.',
            );
            return false;
          }
        }}
        onCreate={() => {
          clearError();
          createMutation.mutate();
        }}
        onImportMembers={(importedMembers) => {
          try {
            return Promise.resolve(stageMembers(importedMembers));
          } catch (error) {
            return Promise.reject(error);
          }
        }}
        onModeChange={(nextMode) => {
          clearError();
          setMode(nextMode);
        }}
        onNameSubmit={(nextName) => {
          clearError();
          const normalizedName = nextName.trim();
          if (!normalizedName) {
            setDraftErrorMessage('선거인명부 이름을 입력하세요.');
            return;
          }
          setName(normalizedName);
          setStep('members');
        }}
        onRemoveMember={(identifier) => {
          clearError();
          setMembers((current) =>
            current.filter((member) => member.identifier !== identifier),
          );
        }}
        onStepChange={(nextStep) => {
          if (createdRoll) return;
          clearError();
          setStep(nextStep);
        }}
      />
    </PageShell>
  );
}

function validateMembers(members: ElectoralRollImportMemberInput[]) {
  const identifiers = new Set<string>();
  for (const member of members) {
    if (!member.identifier) return '모든 구성원의 식별자를 입력하세요.';
    if (identifiers.has(member.identifier)) {
      return `${member.identifier} 식별자가 중복되었습니다.`;
    }
    if (!Number.isFinite(member.voteWeight) || member.voteWeight <= 0) {
      return `${member.identifier} 구성원의 투표 가중치를 확인하세요.`;
    }
    const identityError = validateElectoralRollMemberIdentity(member);
    if (identityError) {
      return `${member.identifier} 구성원: ${identityError}`;
    }
    identifiers.add(member.identifier);
  }
  return undefined;
}

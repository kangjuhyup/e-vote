'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { billingApi } from '@/features/billing/api/billing-api';
import { billingOrderQueryOptions } from '@/features/billing/api/billing-query-options';
import { BillingOrderConfirmation } from '@/features/billing/ui/billing-order-confirmation';
import { electoralRollPageQueryOptions } from '@/features/votes/api/electoral-roll-query-options';
import { voteOperationsApi } from '@/features/votes/api/vote-operations-api';
import { commissionManagementQueryOptions } from '@/features/votes/api/vote-operations-query-options';
import { isVoteApiMockMode } from '@/features/votes/api/votes-api';
import { resolveVoteSchedule } from '@/features/votes/lib/vote-schedule';
import type {
  CreateVoteInput,
  CreateVoteResult,
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
  VotingChannel,
} from '@/features/votes/model/vote-operations.types';

import { VoteNavigation } from '../ui/vote-navigation';
import {
  VoteSetupWizard,
  type VoteSetupBallotDraft,
  type VoteSetupStep,
} from '../ui/vote-setup-wizard';

interface VoteSetupContainerProps {
  account?: ReactNode;
}

type VoteDraft = Omit<CreateVoteInput, 'commissionId' | 'electoralRollId'>;

export function VoteSetupContainer({ account }: VoteSetupContainerProps) {
  const queryClient = useQueryClient();
  const isMockMode = isVoteApiMockMode();
  const [step, setStep] = useState<VoteSetupStep>('basics');
  const [voteDraft, setVoteDraft] = useState<VoteDraft>();
  const [ballotDrafts, setBallotDrafts] = useState<VoteSetupBallotDraft[]>([]);
  const [draftBallotType, setDraftBallotType] = useState<
    'CANDIDATE' | 'YES_NO'
  >('CANDIDATE');
  const [selectedElectoralRollId, setSelectedElectoralRollId] =
    useState<string>();
  const [createdVote, setCreatedVote] = useState<CreateVoteResult>();
  const [createdSubVoteIds, setCreatedSubVoteIds] = useState<string[]>([]);
  const [selectedCommissionId, setSelectedCommissionId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [billingOrderId, setBillingOrderId] = useState<string>();
  const [billingConfirmed, setBillingConfirmed] = useState(false);

  const commissionsQuery = useQuery(commissionManagementQueryOptions(1, 100));
  const electoralRollsQuery = useQuery(
    electoralRollPageQueryOptions({ page: 1, pageSize: 100 }),
  );
  const billingOrderQuery = useQuery({
    ...billingOrderQueryOptions(billingOrderId ?? ''),
    enabled: Boolean(billingOrderId),
  });
  const billingOrder = billingOrderQuery.data;
  const selectedElectoralRoll = electoralRollsQuery.data?.items.find(
    (roll) => roll.id === selectedElectoralRollId,
  );

  const createSetupMutation = useMutation({
    mutationFn: async () => {
      if (
        !voteDraft ||
        ballotDrafts.length === 0 ||
        !selectedElectoralRollId ||
        !selectedCommissionId
      ) {
        throw new Error(
          '기본 정책, 안건, 선거인명부, 운영 위원회를 먼저 설정하세요.',
        );
      }
      const vote = await voteOperationsApi.createVote({
        ...voteDraft,
        commissionId: selectedCommissionId,
        electoralRollId: selectedElectoralRollId,
      });
      const subVotes = await Promise.all(
        ballotDrafts.map(async (ballot) => {
          const subVote = await voteOperationsApi.createSubVote({
            voteId: vote.id,
            title: ballot.title,
            type: ballot.type,
            sortOrder: ballot.sortOrder,
          });
          await Promise.all(
            ballot.candidateNames.map((name, index) =>
              voteOperationsApi.createCandidate({
                voteId: vote.id,
                voteDetailId: subVote.id,
                candidateNo: index + 1,
                name,
              }),
            ),
          );
          return subVote;
        }),
      );
      return { subVotes, vote };
    },
    onSuccess: async ({ subVotes, vote }) => {
      setCreatedVote(vote);
      setCreatedSubVoteIds(subVotes.map((subVote) => subVote.id));
      setMessage('투표 설정을 생성했습니다.');
      setStep('review');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['votes'] }),
        queryClient.invalidateQueries({ queryKey: ['vote-operations'] }),
      ]);
    },
  });
  const createBillingMutation = useMutation({
    mutationFn: billingApi.createVoteUsageOrder,
    onSuccess: (order) => {
      queryClient.setQueryData(
        billingOrderQueryOptions(order.id).queryKey,
        order,
      );
      setBillingOrderId(order.id);
      setBillingConfirmed(false);
      setMessage(
        order.status === 'PAID'
          ? '결제가 완료되어 투표가 확정됐습니다.'
          : '결제 주문을 생성했습니다. 결제가 완료될 때까지 투표 설정이 잠깁니다.',
      );
    },
  });

  useEffect(() => {
    if (
      !billingOrder ||
      (billingOrder.status !== 'PAID' &&
        billingOrder.status !== 'CANCELED' &&
        billingOrder.status !== 'REFUND_PENDING' &&
        billingOrder.status !== 'REFUNDED')
    ) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['votes'] });
  }, [billingOrder, queryClient]);

  const isSubmitting =
    createSetupMutation.isPending || createBillingMutation.isPending;
  const mutationError = createSetupMutation.error;

  function clearStatus() {
    setMessage(undefined);
    setErrorMessage(undefined);
  }

  function handleCreateVote(data: FormData) {
    clearStatus();
    const channels = data.getAll('channel').map(String) as VotingChannel[];
    const schedule = resolveVoteSchedule(
      String(data.get('startedAt') ?? ''),
      String(data.get('endedAt') ?? ''),
    );
    if (channels.length === 0) {
      setErrorMessage('허용할 투표 채널을 하나 이상 선택하세요.');
      return;
    }
    if (!schedule.ok) {
      setErrorMessage(schedule.errorMessage);
      return;
    }

    setVoteDraft({
      ...schedule.schedule,
      title: String(data.get('title') ?? ''),
      votingChannels: channels,
      defaultPolicy: {
        privacyMode: String(data.get('privacyMode')) as PrivacyMode,
        participationUnit: String(
          data.get('participationUnit'),
        ) as ParticipationUnit,
        resultStorageMode: String(
          data.get('resultStorageMode'),
        ) as ResultStorageMode,
        voteWeightMode: String(data.get('voteWeightMode')) as VoteWeightMode,
      },
      identityVerificationPolicy: {
        required: data.get('identityRequired') === 'on',
      },
    });
    setMessage('기본 정책을 저장했습니다.');
    setStep('ballot');
  }

  function handleCreateBallot(data: FormData) {
    clearStatus();
    const type = String(data.get('type')) as 'CANDIDATE' | 'YES_NO';
    const ballot = {
      title: String(data.get('title') ?? ''),
      type,
      sortOrder: Number(data.get('sortOrder') ?? 0),
      candidateNames:
        type === 'CANDIDATE'
          ? [
              String(data.get('candidate1') ?? ''),
              String(data.get('candidate2') ?? ''),
            ]
          : [],
    } satisfies VoteSetupBallotDraft;
    setBallotDrafts((current) => [...current, ballot]);
    setDraftBallotType('CANDIDATE');
    setMessage(`${ballot.title} 안건을 추가했습니다.`);
  }

  return (
    <PageShell
      account={account}
      navigation={<VoteNavigation current="votes" isMockMode={isMockMode} />}
      eyebrow="투표 설정"
      title="새 투표 만들기"
      description="기본 정책과 안건을 설정하고 기존 선거인명부를 연결한 뒤 운영 위원회를 선택합니다."
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href="/votes">
            <ArrowLeft aria-hidden="true" />
            투표 목록
          </Link>
        </Button>
      }
    >
      <VoteSetupWizard
        billingPanel={
          createdVote ? (
            <BillingOrderConfirmation
              errorMessage={
                createBillingMutation.error instanceof Error
                  ? createBillingMutation.error.message
                  : undefined
              }
              hasCommission={Boolean(
                createdVote.commissionId ?? selectedCommissionId,
              )}
              isConfirmed={billingConfirmed}
              isSubmitting={createBillingMutation.isPending}
              onConfirmChange={setBillingConfirmed}
              onCreateOrder={() => {
                clearStatus();
                createBillingMutation.mutate(createdVote.id);
              }}
              order={billingOrder}
            />
          ) : undefined
        }
        commissions={commissionsQuery.data?.items ?? []}
        electoralRolls={electoralRollsQuery.data?.items ?? []}
        ballots={ballotDrafts}
        ballotType={draftBallotType}
        step={step}
        createdVote={createdVote}
        createdSubVoteIds={createdSubVoteIds}
        isSubmitting={isSubmitting}
        isCommissionsLoading={commissionsQuery.isLoading}
        isElectoralRollsLoading={electoralRollsQuery.isLoading}
        successMessage={message}
        errorMessage={
          errorMessage ??
          (mutationError instanceof Error
            ? mutationError.message
            : electoralRollsQuery.error instanceof Error
              ? electoralRollsQuery.error.message
              : undefined)
        }
        onStepChange={setStep}
        onCommissionChange={setSelectedCommissionId}
        onCreateVote={handleCreateVote}
        onCreateBallot={handleCreateBallot}
        onBallotTypeChange={setDraftBallotType}
        onRemoveBallot={(ballotIndex) => {
          clearStatus();
          setBallotDrafts((current) =>
            current.filter((_, index) => index !== ballotIndex),
          );
        }}
        onElectoralRollChange={(electoralRollId) => {
          clearStatus();
          setSelectedElectoralRollId(electoralRollId);
        }}
        onCompleteSetup={() => {
          clearStatus();
          createSetupMutation.mutate();
        }}
        selectedElectoralRoll={selectedElectoralRoll}
        selectedElectoralRollId={selectedElectoralRollId}
        selectedCommissionId={selectedCommissionId}
      />
    </PageShell>
  );
}

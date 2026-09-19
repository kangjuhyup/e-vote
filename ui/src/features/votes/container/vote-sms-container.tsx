'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { voteSmsApi } from '@/features/votes/api/vote-sms-api';
import {
  voteSmsTemplateQueryOptions,
  voteSmsDispatchPageQueryOptions,
} from '@/features/votes/api/vote-sms-query-options';
import {
  getVoteSmsPurpose,
  type VoteSmsPurpose,
} from '@/features/votes/model/vote-sms.types';
import type { VoteStatus } from '@/features/votes/model/vote.types';
import type { VoteBillingLifecycleStatus } from '@/features/votes/lib/vote-finalization';

import { VoteSmsManagement } from '../ui/vote-sms-management';

const PAGE_SIZE = 20;

interface VoteSmsContainerProps {
  billingOrderId?: string;
  billingOrderStatus?: VoteBillingLifecycleStatus;
  voteId: string;
  voteStatus: VoteStatus;
}

export function VoteSmsContainer({
  billingOrderId,
  billingOrderStatus,
  voteId,
  voteStatus,
}: VoteSmsContainerProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string>();
  const purpose = getVoteSmsPurpose(voteStatus);
  const upcomingNoticeBlocked =
    purpose === 'UPCOMING_VOTE_NOTICE' &&
    (voteStatus !== 'finalized' || billingOrderStatus !== 'PAID');
  const templateQuery = useQuery({
    ...voteSmsTemplateQueryOptions(voteId, purpose ?? 'UPCOMING_VOTE_NOTICE'),
    enabled: Boolean(purpose),
  });
  const pageQuery = useQuery(
    voteSmsDispatchPageQueryOptions(voteId, page, PAGE_SIZE),
  );
  const sendMutation = useMutation({
    mutationFn: voteSmsApi.sendVoteSms,
    onSuccess: async (result) => {
      setMessage(
        `총 ${result.recipientCount}명에게 문자를 발송했습니다. 성공 ${result.successCount}건, 실패 ${result.failureCount}건`,
      );
      await invalidateVoteSmsDispatches(queryClient, voteId);
    },
  });
  const mutationError = sendMutation.error;

  function handleSend(selectedPurpose: VoteSmsPurpose) {
    if (selectedPurpose === 'UPCOMING_VOTE_NOTICE' && upcomingNoticeBlocked) return;
    setMessage(undefined);
    sendMutation.mutate({ purpose: selectedPurpose, voteId });
  }

  return (
    <VoteSmsManagement
      dispatches={pageQuery.data?.items ?? []}
      historyError={
        pageQuery.error instanceof Error ? pageQuery.error.message : undefined
      }
      isHistoryLoading={pageQuery.isLoading}
      isSending={sendMutation.isPending}
      message={mutationError instanceof Error ? mutationError.message : message}
      template={templateQuery.data}
      templateError={
        templateQuery.error instanceof Error
          ? templateQuery.error.message
          : undefined
      }
      isTemplateLoading={templateQuery.isLoading && Boolean(purpose)}
      onRetryTemplate={() => void templateQuery.refetch()}
      onPageChange={setPage}
      onRetryHistory={() => pageQuery.refetch()}
      onSend={handleSend}
      page={pageQuery.data?.page ?? page}
      purpose={purpose}
      sendBlockedReason={
        upcomingNoticeBlocked
          ? '이용료 결제가 완료되어 투표가 확정된 후 안내 문자를 발송할 수 있습니다.'
          : undefined
      }
      paymentHref={
        upcomingNoticeBlocked
          ? billingOrderId && billingOrderStatus === 'PENDING_PAYMENT'
            ? `/billing/vote-usage-orders/${billingOrderId}`
            : `/votes/${voteId}/edit?step=review#vote-edit-step-review`
          : undefined
      }
      totalPages={pageQuery.data?.totalPages ?? 0}
      voteId={voteId}
    />
  );
}

export function invalidateVoteSmsDispatches(
  queryClient: ReturnType<typeof useQueryClient>,
  voteId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: ['vote-sms', voteSmsApi.mode, voteId, 'dispatches'],
  });
}

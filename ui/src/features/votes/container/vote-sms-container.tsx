"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { voteSmsApi } from "@/features/votes/api/vote-sms-api";
import {
  participationReminderTemplateQueryOptions,
  voteSmsDispatchPageQueryOptions,
} from "@/features/votes/api/vote-sms-query-options";
import {
  getVoteSmsPurpose,
  type VoteSmsPurpose,
} from "@/features/votes/model/vote-sms.types";
import type { VoteStatus } from "@/features/votes/model/vote.types";

import { VoteSmsManagement } from "../ui/vote-sms-management";

const PAGE_SIZE = 20;

interface VoteSmsContainerProps {
  voteId: string;
  voteStatus: VoteStatus;
}

export function VoteSmsContainer({ voteId, voteStatus }: VoteSmsContainerProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string>();
  const purpose = getVoteSmsPurpose(voteStatus);
  const templateQuery = useQuery({
    ...participationReminderTemplateQueryOptions(voteId),
    enabled: purpose === "VOTE_PARTICIPATION_REMINDER",
  });
  const pageQuery = useQuery(
    voteSmsDispatchPageQueryOptions(voteId, page, PAGE_SIZE),
  );
  const sendMutation = useMutation({
    mutationFn: voteSmsApi.sendVoteSms,
    onSuccess: async (result) => {
      setDraft("");
      setMessage(
        `총 ${result.recipientCount}명에게 문자를 발송했습니다. 성공 ${result.successCount}건, 실패 ${result.failureCount}건`,
      );
      await invalidateVoteSmsDispatches(queryClient, voteId);
    },
  });
  const mutationError = sendMutation.error;

  function handleSend(selectedPurpose: VoteSmsPurpose) {
    const trimmedMessage = draft.trim();
    setMessage(undefined);
    if (
      selectedPurpose !== "VOTE_PARTICIPATION_REMINDER" &&
      trimmedMessage.length === 0
    ) {
      setMessage("문자 내용을 입력해 주세요.");
      return;
    }
    sendMutation.mutate(
      selectedPurpose === "VOTE_PARTICIPATION_REMINDER"
        ? { purpose: selectedPurpose, voteId }
        : { message: trimmedMessage, purpose: selectedPurpose, voteId },
    );
  }

  return (
    <VoteSmsManagement
      dispatches={pageQuery.data?.items ?? []}
      draft={draft}
      historyError={pageQuery.error instanceof Error ? pageQuery.error.message : undefined}
      isHistoryLoading={pageQuery.isLoading}
      isSending={sendMutation.isPending}
      message={mutationError instanceof Error ? mutationError.message : message}
      participationReminderTemplate={templateQuery.data}
      templateError={templateQuery.error instanceof Error ? templateQuery.error.message : undefined}
      isTemplateLoading={templateQuery.isLoading && purpose === "VOTE_PARTICIPATION_REMINDER"}
      onRetryTemplate={() => void templateQuery.refetch()}
      onDraftChange={setDraft}
      onPageChange={setPage}
      onRetryHistory={() => pageQuery.refetch()}
      onSend={handleSend}
      page={pageQuery.data?.page ?? page}
      purpose={purpose}
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
    queryKey: ["vote-sms", voteSmsApi.mode, voteId, "dispatches"],
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { voteSmsApi } from "@/features/votes/api/vote-sms-api";
import {
  voteSmsDispatchPageQueryOptions,
  voteSmsDispatchQueryOptions,
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
  const [selectedDispatchId, setSelectedDispatchId] = useState<string>();
  const purpose = getVoteSmsPurpose(voteStatus);
  const pageQuery = useQuery(
    voteSmsDispatchPageQueryOptions(voteId, page, PAGE_SIZE),
  );
  const detailQuery = useQuery({
    ...voteSmsDispatchQueryOptions(voteId, selectedDispatchId ?? ""),
    enabled: Boolean(selectedDispatchId),
  });
  const sendMutation = useMutation({
    mutationFn: voteSmsApi.sendVoteSms,
    onSuccess: async (result) => {
      setDraft("");
      setSelectedDispatchId(result.id);
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
    if (trimmedMessage.length === 0) {
      setMessage("문자 내용을 입력해 주세요.");
      return;
    }
    sendMutation.mutate({
      message: trimmedMessage,
      purpose: selectedPurpose,
      voteId,
    });
  }

  return (
    <VoteSmsManagement
      detailError={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
      dispatches={pageQuery.data?.items ?? []}
      draft={draft}
      historyError={pageQuery.error instanceof Error ? pageQuery.error.message : undefined}
      isDetailLoading={detailQuery.isLoading && Boolean(selectedDispatchId)}
      isHistoryLoading={pageQuery.isLoading}
      isSending={sendMutation.isPending}
      message={mutationError instanceof Error ? mutationError.message : message}
      onDraftChange={setDraft}
      onPageChange={setPage}
      onRetryDetail={() => detailQuery.refetch()}
      onRetryHistory={() => pageQuery.refetch()}
      onSelectDispatch={setSelectedDispatchId}
      onSend={handleSend}
      page={pageQuery.data?.page ?? page}
      purpose={purpose}
      selectedDispatch={detailQuery.data}
      selectedDispatchId={selectedDispatchId}
      totalPages={pageQuery.data?.totalPages ?? 0}
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

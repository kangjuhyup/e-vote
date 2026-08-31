"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { voteOperationsApi } from "@/features/votes/api/vote-operations-api";
import { fieldSessionManagementQueryOptions } from "@/features/votes/api/vote-operations-query-options";
import { voteSmsApi } from "@/features/votes/api/vote-sms-api";

import { FieldSessionManagement } from "../ui/field-session-management";
import { invalidateVoteSmsDispatches } from "./vote-sms-container";

const PAGE_SIZE = 20;

interface FieldSessionContainerProps {
  allowedChannels: readonly ("ONSITE" | "VISIT")[];
  commissionId?: string;
  smsEnabled: boolean;
  voteId: string;
}

export function FieldSessionContainer({
  allowedChannels,
  commissionId,
  smsEnabled,
  voteId,
}: FieldSessionContainerProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string>();
  const [smsDrafts, setSmsDrafts] = useState<Record<string, string>>({});
  const [pendingSmsSessionId, setPendingSmsSessionId] = useState<string>();
  const sessionsQuery = useQuery(
    fieldSessionManagementQueryOptions(voteId, page, PAGE_SIZE),
  );
  const createMutation = useMutation({
    mutationFn: voteOperationsApi.createFieldSession,
    onSuccess: async (item) => {
      setPage(1);
      setMessage(`${item.title} 세션을 생성했습니다.`);
      await invalidateFieldSessions(queryClient);
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({
      action,
      id,
    }: {
      action: "cancel" | "close" | "open";
      id: string;
    }) => voteOperationsApi.changeFieldSessionStatus(id, action),
    onSuccess: async (result) => {
      setMessage(`세션 상태를 ${result.status} 상태로 변경했습니다.`);
      await invalidateFieldSessions(queryClient);
    },
  });
  const smsMutation = useMutation({
    mutationFn: voteSmsApi.sendFieldSessionSms,
    onMutate: (input) => {
      setPendingSmsSessionId(input.fieldVotingSessionId);
    },
    onSuccess: async (result, input) => {
      setSmsDrafts((current) => ({
        ...current,
        [input.fieldVotingSessionId]: "",
      }));
      setMessage(
        `총 ${result.recipientCount}명에게 세션 안내 문자를 발송했습니다. 성공 ${result.successCount}건, 실패 ${result.failureCount}건`,
      );
      await invalidateVoteSmsDispatches(queryClient, voteId);
    },
    onSettled: () => {
      setPendingSmsSessionId(undefined);
    },
  });
  const error = createMutation.error ?? statusMutation.error ?? smsMutation.error;
  const data = sessionsQuery.data;

  return (
    <section aria-labelledby="field-session-operations-title" className="space-y-4">
      <div>
        <h2 id="field-session-operations-title" className="text-lg font-semibold">
          현장 투표 운영
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          이 투표의 현장과 방문 투표 세션을 예약하고 운영합니다.
        </p>
      </div>
      {sessionsQuery.isLoading ? (
        <SkeletonCardGrid count={2} label="현장 세션을 불러오는 중…" />
      ) : sessionsQuery.isError ? (
        <RetryErrorCard
          title="현장 세션을 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => sessionsQuery.refetch()}
        />
      ) : (
        <FieldSessionManagement
          allowedChannels={allowedChannels}
          commissionId={commissionId}
          voteId={voteId}
          sessions={data?.items ?? []}
          page={data?.page ?? page}
          totalPages={data?.totalPages ?? 0}
          isSubmitting={createMutation.isPending || statusMutation.isPending}
          message={error instanceof Error ? error.message : message}
          pendingSmsSessionId={pendingSmsSessionId}
          smsDrafts={smsDrafts}
          smsEnabled={smsEnabled}
          onPageChange={setPage}
          onCreate={(formData) => {
            setMessage(undefined);
            if (!commissionId) {
              setMessage("투표의 선거관리위원회 정보를 확인할 수 없습니다.");
              return;
            }
            const channel = String(formData.get("channel")) as
              | "ONSITE"
              | "VISIT";
            if (!allowedChannels.includes(channel)) {
              setMessage("투표에 설정된 현장·방문 채널만 선택할 수 있습니다.");
              return;
            }
            createMutation.mutate({
              voteId,
              commissionId,
              channel,
              title: String(formData.get("title") ?? ""),
              locationName: String(formData.get("locationName") ?? ""),
              address: String(formData.get("address") ?? ""),
              managerIds: String(formData.get("managerIds") ?? "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
              startsAt: new Date(
                String(formData.get("startsAt")),
              ).toISOString(),
              endsAt: new Date(String(formData.get("endsAt"))).toISOString(),
            });
          }}
          onChangeStatus={(id, action) => {
            setMessage(undefined);
            statusMutation.mutate({ id, action });
          }}
          onSmsDraftChange={(id, value) => {
            setSmsDrafts((current) => ({ ...current, [id]: value }));
          }}
          onSendSms={(fieldVotingSessionId) => {
            setMessage(undefined);
            const smsMessage = smsDrafts[fieldVotingSessionId]?.trim() ?? "";
            if (!smsEnabled) {
              setMessage("진행 중인 투표에서만 세션 안내 문자를 발송할 수 있습니다.");
              return;
            }
            if (smsMessage.length === 0) {
              setMessage("세션 안내 문자 내용을 입력해 주세요.");
              return;
            }
            smsMutation.mutate({
              fieldVotingSessionId,
              message: smsMessage,
              voteId,
            });
          }}
        />
      )}
    </section>
  );
}

function invalidateFieldSessions(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({
    queryKey: ["vote-operations", voteOperationsApi.mode, "field-sessions"],
  });
}

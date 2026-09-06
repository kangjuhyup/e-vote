"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { voteOperationsApi } from "@/features/votes/api/vote-operations-api";
import {
  commissionManagementQueryOptions,
  commissionQueryOptions,
} from "@/features/votes/api/vote-operations-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import type {
  CommissionMemberRecord,
  DeleteCommissionInput,
  DeleteCommissionMemberInput,
  UpdateCommissionMemberInput,
} from "@/features/votes/model/vote-operations.types";
import { VoteApiError } from "@/shared/api/vote-api-error";

import { CommissionManagement } from "../ui/commission-management";
import { VoteNavigation } from "../ui/vote-navigation";

const PAGE_SIZE = 20;

type CommissionDeletionTarget =
  | { kind: "commission"; name: string }
  | { kind: "member"; memberId: string; name: string };

export function CommissionManagementContainer({
  account,
}: {
  account?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedCommissionId, setSelectedCommissionId] = useState("");
  const [message, setMessage] = useState<string>();
  const [deletionTarget, setDeletionTarget] =
    useState<CommissionDeletionTarget>();
  const commissionsQuery = useQuery(
    commissionManagementQueryOptions(page, PAGE_SIZE),
  );
  const commissionQuery = useQuery({
    ...commissionQueryOptions(selectedCommissionId),
    enabled: selectedCommissionId.length > 0,
  });
  const createMutation = useMutation({
    mutationFn: voteOperationsApi.createCommission,
    onSuccess: async (commission) => {
      setPage(1);
      setSelectedCommissionId(commission.id);
      setMessage(`${commission.name} 위원회를 생성했습니다.`);
      await queryClient.invalidateQueries({
        queryKey: ["vote-operations", voteOperationsApi.mode, "commissions"],
      });
    },
  });
  const memberMutation = useMutation({
    mutationFn: voteOperationsApi.registerCommissionMember,
    onSuccess: async (member) => {
      setMessage(`${member.name} 위원을 등록했습니다.`);
      await queryClient.invalidateQueries({
        queryKey: ["vote-operations", voteOperationsApi.mode, "commissions"],
      });
    },
  });
  const updateMemberMutation = useMutation({
    mutationFn: (input: UpdateCommissionMemberInput) =>
      voteOperationsApi.updateCommissionMember(input),
    onSuccess: async (_, input) => {
      setMessage(`${input.name} 위원 정보를 수정했습니다.`);
      await invalidateCommissions(queryClient);
    },
  });
  const deleteMemberMutation = useMutation({
    mutationFn: (input: DeleteCommissionMemberInput) =>
      voteOperationsApi.deleteCommissionMember(input),
    onSuccess: async () => {
      setDeletionTarget(undefined);
      setMessage("위원을 삭제했습니다. 기존 투표 기록은 유지됩니다.");
      await invalidateCommissions(queryClient);
    },
  });
  const deleteCommissionMutation = useMutation({
    mutationFn: (input: DeleteCommissionInput) =>
      voteOperationsApi.deleteCommission(input),
    onSuccess: async () => {
      setDeletionTarget(undefined);
      setSelectedCommissionId("");
      setPage(1);
      setMessage("위원회를 삭제했습니다. 기존 투표 기록은 유지됩니다.");
      await invalidateCommissions(queryClient);
    },
  });
  const error =
    createMutation.error ??
    memberMutation.error ??
    updateMemberMutation.error ??
    commissionQuery.error;
  const deletionError =
    deleteMemberMutation.error ?? deleteCommissionMutation.error;
  const isSubmitting =
    createMutation.isPending ||
    memberMutation.isPending ||
    updateMemberMutation.isPending ||
    deleteMemberMutation.isPending ||
    deleteCommissionMutation.isPending;

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation
          current="commissions"
          isMockMode={isVoteApiMockMode()}
        />
      }
      eyebrow="조직 관리"
      title="선거관리위원회"
      description="투표 생성 전에 위원회와 관리자, 현장 관리자를 등록합니다."
    >
      {commissionsQuery.isLoading ||
      (selectedCommissionId.length > 0 && commissionQuery.isLoading) ? (
        <SkeletonCardGrid count={3} label="위원회 정보를 불러오는 중…" />
      ) : commissionsQuery.isError || commissionQuery.isError ? (
        <RetryErrorCard
          title="위원회 정보를 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => {
            void commissionsQuery.refetch();
            if (selectedCommissionId) void commissionQuery.refetch();
          }}
        />
      ) : commissionsQuery.data ? (
        <CommissionManagement
          commission={commissionQuery.data ?? null}
          commissions={commissionsQuery.data.items}
          page={commissionsQuery.data.page}
          totalPages={commissionsQuery.data.totalPages}
          deletionTarget={deletionTarget}
          deleteErrorMessage={toCommissionManagementError(deletionError)}
          errorMessage={toCommissionManagementError(error)}
          isDeleting={
            deleteMemberMutation.isPending ||
            deleteCommissionMutation.isPending
          }
          isSubmitting={isSubmitting}
          message={message}
          selectedCommissionId={selectedCommissionId}
          onPageChange={setPage}
          onSelectCommission={(commissionId) => {
            setMessage(undefined);
            setDeletionTarget(undefined);
            setSelectedCommissionId(commissionId);
          }}
          onShowList={() => {
            setMessage(undefined);
            setDeletionTarget(undefined);
            setSelectedCommissionId("");
          }}
          onCreateCommission={(formData) => {
            setMessage(undefined);
            createMutation.mutate(String(formData.get("name") ?? ""));
          }}
          onRegisterMember={(formData) => {
            setMessage(undefined);
            memberMutation.mutate({
              commissionId: selectedCommissionId,
              name: String(formData.get("name") ?? ""),
              role: String(formData.get("role")) as
                | "ADMIN"
                | "FIELD_MANAGER",
            });
          }}
          onUpdateMember={(formData) => {
            setMessage(undefined);
            updateMemberMutation.reset();
            updateMemberMutation.mutate({
              commissionId: selectedCommissionId,
              memberId: String(formData.get("memberId") ?? ""),
              name: String(formData.get("name") ?? ""),
              role: String(formData.get("role")) as
                | "ADMIN"
                | "FIELD_MANAGER",
            });
          }}
          onRequestDeleteCommission={() => {
            setMessage(undefined);
            deleteCommissionMutation.reset();
            setDeletionTarget({
              kind: "commission",
              name: commissionQuery.data?.name ?? "선거관리위원회",
            });
          }}
          onRequestDeleteMember={(member: CommissionMemberRecord) => {
            setMessage(undefined);
            deleteMemberMutation.reset();
            setDeletionTarget({
              kind: "member",
              memberId: member.id,
              name: member.name,
            });
          }}
          onCancelDelete={() => {
            if (deleteMemberMutation.isPending || deleteCommissionMutation.isPending) {
              return;
            }
            setDeletionTarget(undefined);
            deleteMemberMutation.reset();
            deleteCommissionMutation.reset();
          }}
          onConfirmDelete={() => {
            if (!deletionTarget) return;
            if (deletionTarget.kind === "commission") {
              deleteCommissionMutation.mutate({
                commissionId: selectedCommissionId,
              });
              return;
            }
            deleteMemberMutation.mutate({
              commissionId: selectedCommissionId,
              memberId: deletionTarget.memberId,
            });
          }}
        />
      ) : null}
    </PageShell>
  );
}

async function invalidateCommissions(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({
    queryKey: ["vote-operations", voteOperationsApi.mode, "commissions"],
  });
}

function toCommissionManagementError(error: unknown) {
  if (!(error instanceof Error)) return undefined;
  if (error instanceof VoteApiError && error.status === 403) {
    return "위원회 수정과 삭제는 활성 관리자만 할 수 있습니다.";
  }
  if (
    error instanceof VoteApiError &&
    error.status === 409 &&
    error.message.includes("last active administrator")
  ) {
    return "마지막 활성 관리자는 삭제하거나 현장 관리자로 변경할 수 없습니다.";
  }
  return error.message;
}

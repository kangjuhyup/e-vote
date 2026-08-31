"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { voteOperationsApi } from "@/features/votes/api/vote-operations-api";
import { commissionManagementQueryOptions } from "@/features/votes/api/vote-operations-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";

import { CommissionManagement } from "../ui/commission-management";
import { VoteNavigation } from "../ui/vote-navigation";

const PAGE_SIZE = 20;

export function CommissionManagementContainer({
  account,
}: {
  account?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string>();
  const commissionsQuery = useQuery(
    commissionManagementQueryOptions(page, PAGE_SIZE),
  );
  const createMutation = useMutation({
    mutationFn: voteOperationsApi.createCommission,
    onSuccess: async (commission) => {
      setPage(1);
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
  const error = createMutation.error ?? memberMutation.error;

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
      {commissionsQuery.isLoading ? (
        <SkeletonCardGrid count={3} label="위원회 정보를 불러오는 중…" />
      ) : commissionsQuery.isError ? (
        <RetryErrorCard
          title="위원회 정보를 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => commissionsQuery.refetch()}
        />
      ) : commissionsQuery.data ? (
        <CommissionManagement
          commissions={commissionsQuery.data.items}
          page={commissionsQuery.data.page}
          totalPages={commissionsQuery.data.totalPages}
          isSubmitting={createMutation.isPending || memberMutation.isPending}
          message={error instanceof Error ? error.message : message}
          onPageChange={setPage}
          onCreateCommission={(formData) => {
            setMessage(undefined);
            createMutation.mutate(String(formData.get("name") ?? ""));
          }}
          onRegisterMember={(formData) => {
            setMessage(undefined);
            memberMutation.mutate({
              commissionId: String(formData.get("commissionId") ?? ""),
              name: String(formData.get("name") ?? ""),
              role: String(formData.get("role")) as
                | "ADMIN"
                | "FIELD_MANAGER",
            });
          }}
        />
      ) : null}
    </PageShell>
  );
}

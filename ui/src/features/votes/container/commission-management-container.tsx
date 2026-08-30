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
import type { CommissionRecord } from "@/features/votes/model/vote-operations.types";

import { CommissionManagement } from "../ui/commission-management";
import { VoteNavigation } from "../ui/vote-navigation";

export function CommissionManagementContainer({ account }: { account?: ReactNode }) {
  const queryClient = useQueryClient();
  const commissionsQuery = useQuery(commissionManagementQueryOptions());
  const [sessionItems, setSessionItems] = useState<CommissionRecord[]>([]);
  const [message, setMessage] = useState<string>();
  const createMutation = useMutation({ mutationFn: voteOperationsApi.createCommission, onSuccess: async (item) => { setSessionItems((items) => [...items, item]); setMessage(`${item.name} 위원회를 생성했습니다.`); await queryClient.invalidateQueries({ queryKey: ["vote-operations", voteOperationsApi.mode, "commissions"] }); } });
  const memberMutation = useMutation({ mutationFn: voteOperationsApi.registerCommissionMember, onSuccess: async (member, input) => { setSessionItems((items) => items.map((commission) => commission.id === input.commissionId ? { ...commission, members: [...commission.members, member] } : commission)); setMessage(`${member.name} 위원을 등록했습니다.`); await queryClient.invalidateQueries({ queryKey: ["vote-operations", voteOperationsApi.mode, "commissions"] }); } });
  const data = commissionsQuery.data;
  const items = data?.readAvailable ? data.items : sessionItems;
  const error = createMutation.error ?? memberMutation.error;

  return <PageShell account={account} navigation={<VoteNavigation current="commissions" isMockMode={isVoteApiMockMode()} />} eyebrow="조직 관리" title="선거관리위원회" description="투표를 주관할 위원회와 관리자, 현장 관리자를 등록합니다.">{commissionsQuery.isLoading ? <SkeletonCardGrid count={3} label="위원회 정보를 불러오는 중…" /> : commissionsQuery.isError ? <RetryErrorCard title="위원회 정보를 불러오지 못했습니다." description="잠시 후 다시 시도하세요." onRetry={() => commissionsQuery.refetch()} /> : data ? <CommissionManagement commissions={items} readAvailable={data.readAvailable} isSubmitting={createMutation.isPending || memberMutation.isPending} message={error instanceof Error ? error.message : message} onCreateCommission={(formData) => { setMessage(undefined); createMutation.mutate(String(formData.get("name") ?? "")); }} onRegisterMember={(formData) => { setMessage(undefined); memberMutation.mutate({ commissionId: String(formData.get("commissionId") ?? ""), name: String(formData.get("name") ?? ""), role: String(formData.get("role")) as "ADMIN" | "FIELD_MANAGER" }); }} /> : null}</PageShell>;
}

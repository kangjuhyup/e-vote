"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { voteOperationsApi } from "@/features/votes/api/vote-operations-api";
import { fieldSessionManagementQueryOptions } from "@/features/votes/api/vote-operations-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import type { FieldSessionRecord } from "@/features/votes/model/vote-operations.types";

import { FieldSessionManagement } from "../ui/field-session-management";
import { VoteNavigation } from "../ui/vote-navigation";

export function FieldSessionContainer({ account }: { account?: ReactNode }) {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery(fieldSessionManagementQueryOptions());
  const [sessionItems, setSessionItems] = useState<FieldSessionRecord[]>([]);
  const [message, setMessage] = useState<string>();
  const createMutation = useMutation({ mutationFn: voteOperationsApi.createFieldSession, onSuccess: async (item) => { setSessionItems((items) => [...items, item]); setMessage(`${item.title} 세션을 생성했습니다.`); await queryClient.invalidateQueries({ queryKey: ["vote-operations", voteOperationsApi.mode, "field-sessions"] }); } });
  const statusMutation = useMutation({ mutationFn: ({ action, id }: { action: "cancel" | "close" | "open"; id: string }) => voteOperationsApi.changeFieldSessionStatus(id, action), onSuccess: async (result) => { setSessionItems((items) => items.map((item) => item.id === result.id ? { ...item, status: result.status } : item)); setMessage(`세션 상태를 ${result.status} 상태로 변경했습니다.`); await queryClient.invalidateQueries({ queryKey: ["vote-operations", voteOperationsApi.mode, "field-sessions"] }); } });
  const data = sessionsQuery.data;
  const items = data?.readAvailable ? data.items : sessionItems;
  const error = createMutation.error ?? statusMutation.error;

  return <PageShell account={account} navigation={<VoteNavigation current="field-sessions" isMockMode={isVoteApiMockMode()} />} eyebrow="현장 투표" title="현장 투표 운영" description="현장과 방문 투표 세션을 예약하고 개시, 종료 또는 취소합니다.">{sessionsQuery.isLoading ? <SkeletonCardGrid count={4} label="현장 세션을 불러오는 중…" /> : sessionsQuery.isError ? <RetryErrorCard title="현장 세션을 불러오지 못했습니다." description="잠시 후 다시 시도하세요." onRetry={() => sessionsQuery.refetch()} /> : data ? <FieldSessionManagement sessions={items} readAvailable={data.readAvailable} isSubmitting={createMutation.isPending || statusMutation.isPending} message={error instanceof Error ? error.message : message} onCreate={(formData) => { setMessage(undefined); createMutation.mutate({ voteId: String(formData.get("voteId") ?? ""), commissionId: String(formData.get("commissionId") ?? ""), channel: String(formData.get("channel")) as "ONSITE" | "VISIT", title: String(formData.get("title") ?? ""), locationName: String(formData.get("locationName") ?? ""), address: String(formData.get("address") ?? ""), managerIds: String(formData.get("managerIds") ?? "").split(",").map((value) => value.trim()).filter(Boolean), startsAt: new Date(String(formData.get("startsAt"))).toISOString(), endsAt: new Date(String(formData.get("endsAt"))).toISOString() }); }} onChangeStatus={(id, action) => { setMessage(undefined); statusMutation.mutate({ id, action }); }} /> : null}</PageShell>;
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { voteOperationsApi } from "@/features/votes/api/vote-operations-api";
import { electorManagementQueryOptions } from "@/features/votes/api/vote-operations-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";

import { ElectorManagementView } from "../ui/elector-management-view";
import { VoteNavigation } from "../ui/vote-navigation";

interface ElectorManagementContainerProps { account?: ReactNode; voteId: string }

export function ElectorManagementContainer({ account, voteId }: ElectorManagementContainerProps) {
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string>();
  const queryClient = useQueryClient();
  const electorsQuery = useQuery(electorManagementQueryOptions(voteId, page));
  const createMutation = useMutation({
    mutationFn: voteOperationsApi.createElector,
    onSuccess: async (elector) => {
      setMessage(`${elector.name} 선거인을 등록했습니다.`);
      await queryClient.invalidateQueries({ queryKey: ["vote-operations"] });
    },
  });

  function handleCreate(formData: FormData) {
    setMessage(undefined);
    createMutation.mutate({
      voteId,
      name: String(formData.get("name") ?? ""),
      identifier: String(formData.get("identifier") ?? ""),
      phoneNumber: String(formData.get("phoneNumber") ?? "") || undefined,
      birthDate: String(formData.get("birthDate") ?? "") || undefined,
      groupKey: String(formData.get("groupKey") ?? "") || undefined,
      voteWeight: Number(formData.get("voteWeight") ?? 1),
    });
  }

  return (
    <PageShell account={account} navigation={<VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />} eyebrow="선거인 관리" title="선거인명부" description="투표 자격, 본인인증 상태, 그룹과 투표 가중치를 관리합니다." actions={<Button type="button" variant="outline" asChild><Link href={`/votes/${voteId}`}><ArrowLeft aria-hidden="true" />투표 상세</Link></Button>}>
      {electorsQuery.isLoading ? <SkeletonCardGrid count={5} label="선거인명부를 불러오는 중…" /> : electorsQuery.isError ? <RetryErrorCard title="선거인명부를 불러오지 못했습니다." description="잠시 후 다시 시도하세요." onRetry={() => electorsQuery.refetch()} /> : electorsQuery.data ? <ElectorManagementView page={electorsQuery.data} isSubmitting={createMutation.isPending} message={createMutation.isError ? "선거인을 등록하지 못했습니다." : message} onCreate={handleCreate} onPageChange={setPage} /> : null}
    </PageShell>
  );
}

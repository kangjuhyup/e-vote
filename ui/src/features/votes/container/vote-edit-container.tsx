"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { EmptyStateCard } from "@/components/feedback/empty-state-card";
import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { voteOperationsApi } from "@/features/votes/api/vote-operations-api";
import { commissionManagementQueryOptions } from "@/features/votes/api/vote-operations-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import { voteDetailQueryOptions } from "@/features/votes/api/votes-query-options";
import type {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
  VotingChannel,
} from "@/features/votes/model/vote-operations.types";

import { VoteCommissionSetup } from "../ui/vote-commission-setup";
import { VoteNavigation } from "../ui/vote-navigation";
import { VoteSettingsForm } from "../ui/vote-settings-form";

interface VoteEditContainerProps {
  account?: ReactNode;
  voteId: string;
}

export function VoteEditContainer({ account, voteId }: VoteEditContainerProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const voteQuery = useQuery(voteDetailQueryOptions(voteId));
  const commissionsQuery = useQuery(commissionManagementQueryOptions(1, 100));
  const vote = voteQuery.data;

  const updateMutation = useMutation({
    mutationFn: voteOperationsApi.updateVote,
    onSuccess: async () => {
      setMessage("투표 설정을 저장했습니다.");
      await queryClient.invalidateQueries({ queryKey: ["votes"] });
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

  const error = updateMutation.error ?? memberMutation.error;
  const isEditable = vote?.status === "draft" || vote?.status === "scheduled";

  function handleUpdate(data: FormData) {
    const votingChannels = data.getAll("channel").map(String) as VotingChannel[];
    setMessage(undefined);
    setErrorMessage(undefined);
    if (votingChannels.length === 0) {
      setErrorMessage("허용할 투표 채널을 하나 이상 선택하세요.");
      return;
    }

    updateMutation.mutate({
      voteId,
      title: String(data.get("title") ?? ""),
      votingChannels,
      defaultPolicy: {
        privacyMode: String(data.get("privacyMode")) as PrivacyMode,
        participationUnit: String(
          data.get("participationUnit"),
        ) as ParticipationUnit,
        resultStorageMode: String(
          data.get("resultStorageMode"),
        ) as ResultStorageMode,
        voteWeightMode: String(data.get("voteWeightMode")) as VoteWeightMode,
      },
      identityVerificationPolicy: {
        required: data.get("identityRequired") === "on",
        provider: vote?.identityVerificationPolicy?.provider,
        method: vote?.identityVerificationPolicy?.method,
      },
    });
  }

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />
      }
      eyebrow="투표 설정"
      title="투표 수정"
      description="투표 정책과 이 투표를 운영하는 선거관리위원회를 관리합니다."
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href={`/votes/${voteId}`}>
            <ArrowLeft aria-hidden="true" />
            투표 상세
          </Link>
        </Button>
      }
    >
      {voteQuery.isLoading || commissionsQuery.isLoading ? (
        <SkeletonCardGrid count={2} label="투표 설정을 불러오는 중…" />
      ) : voteQuery.isError || commissionsQuery.isError ? (
        <RetryErrorCard
          title="투표 설정을 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => {
            void Promise.all([voteQuery.refetch(), commissionsQuery.refetch()]);
          }}
        />
      ) : !vote ? (
        <EmptyStateCard
          title="투표를 찾을 수 없습니다."
          description="삭제되었거나 접근할 수 없는 투표입니다."
        />
      ) : (
        <div className="space-y-4">
          {errorMessage || error instanceof Error ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {errorMessage ?? (error instanceof Error ? error.message : "")}
            </p>
          ) : message ? (
            <p className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
              {message}
            </p>
          ) : null}
          {!isEditable ? (
            <p className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
              초안 상태의 투표만 기본 설정을 수정할 수 있습니다. 위원 등록은
              계속할 수 있습니다.
            </p>
          ) : null}
          <VoteCommissionSetup
            allowCreate={false}
            commissions={commissionsQuery.data?.items ?? []}
            isSubmitting={memberMutation.isPending}
            selectedCommissionId={vote.commissionId}
            onRegisterMember={(data) => {
              setMessage(undefined);
              memberMutation.mutate({
                commissionId: String(data.get("commissionId") ?? ""),
                name: String(data.get("name") ?? ""),
                role: String(data.get("role")) as "ADMIN" | "FIELD_MANAGER",
              });
            }}
          />
          <VoteSettingsForm
            vote={vote}
            disabled={!isEditable}
            isSubmitting={updateMutation.isPending}
            onSubmit={handleUpdate}
          />
        </div>
      )}
    </PageShell>
  );
}

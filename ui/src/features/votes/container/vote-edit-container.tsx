"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { EmptyStateCard } from "@/components/feedback/empty-state-card";
import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { billingApi } from "@/features/billing/api/billing-api";
import { billingOrderQueryOptions } from "@/features/billing/api/billing-query-options";
import { BillingOrderConfirmation } from "@/features/billing/ui/billing-order-confirmation";
import { electoralRollPageQueryOptions } from "@/features/votes/api/electoral-roll-query-options";
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
import {
  getVoteDisplayStatus,
  getVoteFinalizationIssues,
  isVoteSetupEditable,
} from "@/features/votes/lib/vote-finalization";
import { resolveVoteSchedule } from "@/features/votes/lib/vote-schedule";

import { VoteCommissionSetup } from "../ui/vote-commission-setup";
import { VoteDeletionSection } from "../ui/vote-deletion-section";
import { VoteElectoralRollSetup } from "../ui/vote-electoral-roll-setup";
import { VoteNavigation } from "../ui/vote-navigation";
import { VoteSettingsForm } from "../ui/vote-settings-form";

interface VoteEditContainerProps {
  account?: ReactNode;
  voteId: string;
}

export function VoteEditContainer({ account, voteId }: VoteEditContainerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [billingOrderId, setBillingOrderId] = useState<string>();
  const [billingConfirmed, setBillingConfirmed] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [selectedElectoralRollId, setSelectedElectoralRollId] = useState("");
  const voteQuery = useQuery(voteDetailQueryOptions(voteId));
  const vote = voteQuery.data;
  const commissionsQuery = useQuery(commissionManagementQueryOptions(1, 100));
  const electoralRollsQuery = useQuery(
    electoralRollPageQueryOptions({ page: 1, pageSize: 100 }),
  );
  const effectiveBillingOrderId =
    billingOrderId ?? vote?.activeBillingOrderId;
  const billingOrderQuery = useQuery({
    ...billingOrderQueryOptions(effectiveBillingOrderId ?? ""),
    enabled: Boolean(effectiveBillingOrderId),
  });
  const billingOrder = billingOrderQuery.data;
  const effectiveBillingOrderStatus =
    billingOrder?.status ?? vote?.billingOrderStatus;

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
  const electoralRollMutation = useMutation({
    mutationFn: voteOperationsApi.attachElectoralRoll,
    onSuccess: async (result) => {
      setBillingConfirmed(false);
      setMessage(
        `선거인명부를 연결했습니다. ${result.memberCount.toLocaleString()}명의 선거인이 적용되었습니다.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["votes"] }),
        queryClient.invalidateQueries({
          queryKey: [
            "vote-operations",
            voteOperationsApi.mode,
            voteId,
            "electors",
          ],
        }),
      ]);
    },
  });
  const createBillingMutation = useMutation({
    mutationFn: billingApi.createVoteUsageOrder,
    onSuccess: async (order) => {
      queryClient.setQueryData(
        billingOrderQueryOptions(order.id).queryKey,
        order,
      );
      setBillingOrderId(order.id);
      setBillingConfirmed(false);
      setMessage(
        order.status === "PAID"
          ? "결제가 완료되어 투표가 확정됐습니다."
          : "결제 주문을 생성했습니다. 결제가 완료될 때까지 투표 설정이 잠깁니다.",
      );
    },
  });
  const deleteMutation = useMutation({
    mutationFn: voteOperationsApi.deleteVote,
    onSuccess: async () => {
      setDeleteConfirmed(false);
      await queryClient.invalidateQueries({
        queryKey: ["votes"],
        refetchType: "none",
      });
      queryClient.removeQueries({
        queryKey: voteDetailQueryOptions(voteId).queryKey,
        exact: true,
      });
      router.replace("/votes");
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? `투표를 삭제하지 못했습니다. ${error.message}`
          : "투표를 삭제하지 못했습니다. 잠시 후 다시 시도하세요.",
      );
    },
  });
  const error =
    electoralRollMutation.error ?? updateMutation.error ?? memberMutation.error;
  const isDraftStatus =
    vote?.status === "draft" || vote?.status === "scheduled";
  const displayStatus = vote
    ? getVoteDisplayStatus(vote.status, effectiveBillingOrderStatus)
    : undefined;
  const isEditable = vote
    ? isVoteSetupEditable(vote.status, effectiveBillingOrderStatus)
    : false;
  const finalizationIssues = vote ? getVoteFinalizationIssues(vote) : [];

  useEffect(() => {
    const observedStatus = billingOrder?.status;
    if (!observedStatus || observedStatus === vote?.billingOrderStatus) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["votes"] });
  }, [billingOrder?.status, queryClient, vote?.billingOrderStatus]);

  function handleUpdate(data: FormData) {
    const votingChannels = data.getAll("channel").map(String) as VotingChannel[];
    const schedule = resolveVoteSchedule(
      String(data.get("startedAt") ?? ""),
      String(data.get("endedAt") ?? ""),
    );
    setMessage(undefined);
    setErrorMessage(undefined);
    setBillingConfirmed(false);
    if (votingChannels.length === 0) {
      setErrorMessage("허용할 투표 채널을 하나 이상 선택하세요.");
      return;
    }
    if (!schedule.ok) {
      setErrorMessage(schedule.errorMessage);
      return;
    }

    updateMutation.mutate({
      ...schedule.schedule,
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
      description="투표 정책, 선거인명부, 이 투표를 운영하는 선거관리위원회를 관리합니다."
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href={`/votes/${voteId}`}>
            <ArrowLeft aria-hidden="true" />
            투표 상세
          </Link>
        </Button>
      }
    >
      {voteQuery.isLoading ||
      commissionsQuery.isLoading ||
      electoralRollsQuery.isLoading ? (
        <SkeletonCardGrid count={2} label="투표 설정을 불러오는 중…" />
      ) : voteQuery.isError ||
        commissionsQuery.isError ||
        electoralRollsQuery.isError ? (
        <RetryErrorCard
          title="투표 설정을 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => {
            void Promise.all([
              voteQuery.refetch(),
              commissionsQuery.refetch(),
              electoralRollsQuery.refetch(),
            ]);
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
              {displayStatus === "payment-processing"
                ? "결제 처리 중입니다. 결제 결과가 확인될 때까지 투표 설정을 수정할 수 없습니다."
                : displayStatus === "finalized"
                  ? effectiveBillingOrderStatus === "REFUND_PENDING"
                    ? "환불 처리 중입니다. 환불 완료 전까지 확정 상태와 설정 잠금이 유지됩니다."
                    : "확정됨(개시 전) 상태의 투표 설정은 수정할 수 없습니다."
                  : "초안 상태의 투표만 기본 설정을 수정할 수 있습니다. 위원 등록은 계속할 수 있습니다."}
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
          <VoteElectoralRollSetup
            currentSnapshotId={vote.electoralRollSnapshotId}
            disabled={!isEditable}
            electoralRolls={electoralRollsQuery.data?.items ?? []}
            isSubmitting={electoralRollMutation.isPending}
            selectedElectoralRollId={selectedElectoralRollId}
            onElectoralRollChange={setSelectedElectoralRollId}
            onSubmit={(electoralRollId) => {
              setMessage(undefined);
              setErrorMessage(undefined);
              setBillingConfirmed(false);
              electoralRollMutation.mutate({
                electoralRollId,
                identityVerificationRequired:
                  vote.identityVerificationPolicy?.required === true,
                voteId,
              });
            }}
          />
          {isDraftStatus || effectiveBillingOrderId || billingOrder ? (
            effectiveBillingOrderId && !billingOrder ? (
              billingOrderQuery.isError ? (
                <RetryErrorCard
                  title="결제 주문을 불러오지 못했습니다."
                  description="투표 설정은 계속 잠겨 있습니다. 잠시 후 다시 시도하세요."
                  onRetry={() => billingOrderQuery.refetch()}
                />
              ) : (
                <SkeletonCardGrid count={1} label="결제 주문을 불러오는 중…" />
              )
            ) : (
              <BillingOrderConfirmation
                blockingReasons={finalizationIssues}
                errorMessage={
                  createBillingMutation.error instanceof Error
                    ? createBillingMutation.error.message
                    : undefined
                }
                hasCommission={Boolean(vote.commissionId)}
                isConfirmed={billingConfirmed}
                isSubmitting={createBillingMutation.isPending}
                onConfirmChange={setBillingConfirmed}
                onCreateOrder={() => {
                  setMessage(undefined);
                  setErrorMessage(undefined);
                  createBillingMutation.mutate(vote.id);
                }}
                order={billingOrder}
              />
            )
          ) : null}
          <VoteDeletionSection
            confirmed={deleteConfirmed}
            disabled={!isEditable}
            isDeleting={deleteMutation.isPending}
            onConfirmChange={setDeleteConfirmed}
            onDelete={() => {
              setMessage(undefined);
              setErrorMessage(undefined);
              deleteMutation.mutate(voteId);
            }}
          />
        </div>
      )}
    </PageShell>
  );
}

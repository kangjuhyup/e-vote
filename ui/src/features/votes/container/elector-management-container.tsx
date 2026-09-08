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
import { VoteApiError } from "@/shared/api/vote-api-error";
import { voteOperationsApi } from "@/features/votes/api/vote-operations-api";
import { participationInvitationApi } from "@/features/votes/api/participation-invitation-api";
import { formatInvitationDispatchResult } from "@/features/votes/lib/participation-invitation";
import { electorManagementQueryOptions } from "@/features/votes/api/vote-operations-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import { voteDetailQueryOptions } from "@/features/votes/api/votes-query-options";
import { isVoteSetupEditable } from "@/features/votes/lib/vote-finalization";

import type {
  ParticipationInvitationDevelopmentLink,
  ParticipationInvitationDispatchResult,
} from "../model/participation-invitation.types";
import type { ElectorRecord } from "../model/vote-operations.types";
import { ElectorManagementView } from "../ui/elector-management-view";
import { VoteNavigation } from "../ui/vote-navigation";

interface ElectorManagementContainerProps {
  account?: ReactNode;
  voteId: string;
}

const canShowDevelopmentParticipationLink =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

export function ElectorManagementContainer({
  account,
  voteId,
}: ElectorManagementContainerProps) {
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string>();
  const [deletingElector, setDeletingElector] = useState<ElectorRecord>();
  const [invitationElector, setInvitationElector] = useState<ElectorRecord>();
  const [invitation, setInvitation] = useState<ParticipationInvitationDispatchResult>();
  const [developmentLink, setDevelopmentLink] =
    useState<ParticipationInvitationDevelopmentLink>();
  const queryClient = useQueryClient();
  const electorsQuery = useQuery(electorManagementQueryOptions(voteId, page));
  const voteQuery = useQuery(voteDetailQueryOptions(voteId));
  const electoralRollSnapshotId =
    voteQuery.data?.electoralRollSnapshotId ?? undefined;
  const canDeleteElectors = Boolean(
    voteQuery.data &&
      !electoralRollSnapshotId &&
      isVoteSetupEditable(
        voteQuery.data.status,
        voteQuery.data.billingOrderStatus,
      ),
  );
  const createMutation = useMutation({
    mutationFn: voteOperationsApi.createElector,
    onSuccess: async (elector) => {
      setMessage(`${elector.name} 선거인을 등록했습니다.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vote-operations"] }),
        queryClient.invalidateQueries({ queryKey: ["votes"] }),
      ]);
    },
  });
  const developmentLinkMutation = useMutation({
    mutationFn: participationInvitationApi.getDevelopmentLink,
    onSuccess: setDevelopmentLink,
  });
  const invitationMutation = useMutation({
    mutationFn: participationInvitationApi.reissue,
    onSuccess: (result, input) => {
      setInvitation(result);
      if (canShowDevelopmentParticipationLink) {
        developmentLinkMutation.reset();
        developmentLinkMutation.mutate(input);
      }
    },
  });
  const dispatchMutation = useMutation({
    mutationFn: participationInvitationApi.dispatch,
    onSuccess: (result) =>
      setMessage(
        `${formatInvitationDispatchResult(result)}${
          canShowDevelopmentParticipationLink
            ? " 발송된 최신 링크는 아래 선거인별 ‘현재 링크 보기’에서 확인할 수 있습니다."
            : ""
        }`,
      ),
  });
  const deleteMutation = useMutation({
    mutationFn: voteOperationsApi.deleteElector,
    onSuccess: async () => {
      const deletedName = deletingElector?.name ?? "선택한 선거인";
      setDeletingElector(undefined);
      setMessage(`${deletedName} 선거인을 삭제했습니다.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vote-operations"] }),
        queryClient.invalidateQueries({ queryKey: ["votes"] }),
      ]);
    },
  });

  function handleOpenInvitation(elector: ElectorRecord) {
    invitationMutation.reset();
    developmentLinkMutation.reset();
    setInvitation(undefined);
    setDevelopmentLink(undefined);
    setInvitationElector(elector);
    if (canShowDevelopmentParticipationLink) {
      developmentLinkMutation.mutate({ electorId: elector.id, voteId });
    }
  }

  function handleCloseInvitation() {
    if (invitationMutation.isPending || developmentLinkMutation.isPending) return;
    invitationMutation.reset();
    developmentLinkMutation.reset();
    setInvitation(undefined);
    setDevelopmentLink(undefined);
    setInvitationElector(undefined);
  }

  function handleIssueInvitation() {
    if (!invitationElector) return;
    developmentLinkMutation.reset();
    setDevelopmentLink(undefined);
    invitationMutation.mutate({
      electorId: invitationElector.id,
      voteId,
    });
  }

  const canDispatchInvitations = Boolean(
    voteQuery.data &&
      !voteQuery.data.identityVerificationPolicy?.required &&
      ['finalized', 'active', 'completed'].includes(voteQuery.data.status),
  );

  function handleRequestDelete(elector: ElectorRecord) {
    deleteMutation.reset();
    setMessage(undefined);
    setDeletingElector(elector);
  }

  function handleCancelDelete() {
    if (deleteMutation.isPending) return;
    deleteMutation.reset();
    setDeletingElector(undefined);
  }

  function handleConfirmDelete() {
    if (!deletingElector || !canDeleteElectors) return;
    deleteMutation.mutate({ electorId: deletingElector.id, voteId });
  }

  function handleCreate(formData: FormData) {
    setMessage(undefined);
    if (electoralRollSnapshotId) {
      return;
    }
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

  const isLoading = electorsQuery.isLoading || voteQuery.isLoading;
  const isError = electorsQuery.isError || voteQuery.isError;

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />
      }
      eyebrow="선거인 관리"
      title="선거인명부"
      description="투표 자격, 본인인증 상태, 그룹과 투표 가중치를 관리합니다."
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href={`/votes/${voteId}`}>
            <ArrowLeft aria-hidden="true" />
            투표 상세
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <SkeletonCardGrid count={5} label="선거인명부를 불러오는 중…" />
      ) : isError ? (
        <RetryErrorCard
          title="선거인명부를 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => {
            void Promise.all([
              electorsQuery.refetch(),
              voteQuery.refetch(),
            ]);
          }}
        />
      ) : electorsQuery.data ? (
        <ElectorManagementView
          canDeleteElectors={canDeleteElectors}
          deletingElector={deletingElector}
          deletionError={
            deleteMutation.error instanceof Error
              ? deleteMutation.error.message
              : undefined
          }
          page={electorsQuery.data}
          electoralRollSnapshotId={electoralRollSnapshotId}
          invitation={invitation}
          invitationElector={invitationElector}
          invitationError={
            invitationMutation.error instanceof Error
              ? invitationMutation.error.message
              : undefined
          }
          developmentLink={developmentLink}
          developmentLinkError={
            developmentLinkMutation.error instanceof VoteApiError &&
            developmentLinkMutation.error.status === 404
              ? "아직 발급된 참여 링크가 없습니다. 새 링크를 발급해 주세요."
              : developmentLinkMutation.error instanceof Error
                ? developmentLinkMutation.error.message
                : undefined
          }
          isLoadingDevelopmentLink={developmentLinkMutation.isPending}
          showDevelopmentLink={canShowDevelopmentParticipationLink}
          isIssuingInvitation={invitationMutation.isPending}
          isDispatchingInvitations={dispatchMutation.isPending}
          isDeleting={deleteMutation.isPending}
          isSubmitting={createMutation.isPending}
          message={
            createMutation.error instanceof Error
              ? createMutation.error.message
              : message
          }
          onCreate={handleCreate}
          onCancelDelete={handleCancelDelete}
          onCloseInvitation={handleCloseInvitation}
          onConfirmDelete={handleConfirmDelete}
          onIssueInvitation={handleIssueInvitation}
          onDispatchInvitations={() => {
            setMessage(undefined);
            dispatchMutation.mutate({ voteId });
          }}
          onOpenInvitation={handleOpenInvitation}
          onPageChange={setPage}
          onRequestDelete={handleRequestDelete}
          canDispatchInvitations={canDispatchInvitations}
          dispatchError={
            dispatchMutation.error instanceof Error
              ? dispatchMutation.error.message
              : undefined
          }
        />
      ) : null}
    </PageShell>
  );
}

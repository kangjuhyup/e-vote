"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyStateCard } from "@/components/feedback/empty-state-card";
import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { voteAttachmentApi } from "@/features/votes/api/vote-attachment-api";
import { subVoteOperationsQueryOptions } from "@/features/votes/api/vote-operations-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import { voteDetailQueryOptions } from "@/features/votes/api/votes-query-options";
import { isVoteSetupEditable } from "@/features/votes/lib/vote-finalization";

import { AttachmentUploadSection } from "../ui/attachment-upload-section";
import { SubVoteOperationsView } from "../ui/sub-vote-operations-view";
import { VoteNavigation } from "../ui/vote-navigation";

interface SubVoteOperationsContainerProps {
  account?: ReactNode;
  voteDetailId: string;
  voteId: string;
}

export function SubVoteOperationsContainer({ account, voteDetailId, voteId }: SubVoteOperationsContainerProps) {
  const queryClient = useQueryClient();
  const operationsQuery = useQuery(
    subVoteOperationsQueryOptions(voteId, voteDetailId),
  );
  const voteQuery = useQuery(voteDetailQueryOptions(voteId));
  const attachmentsDisabled =
    !voteQuery.data ||
    !isVoteSetupEditable(
      voteQuery.data.status,
      voteQuery.data.billingOrderStatus,
    ) ||
    operationsQuery.data?.status !== "DRAFT";

  async function refreshAttachmentProjections() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: subVoteOperationsQueryOptions(voteId, voteDetailId).queryKey,
      }),
      queryClient.invalidateQueries({ queryKey: ["votes"] }),
    ]);
  }

  return (
    <PageShell
      account={account}
      navigation={<VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />}
      eyebrow="안건 정보"
      title="안건 상세"
      description="안건 투표율과 결과, 등록된 첨부파일을 확인합니다."
      actions={
        <>
          {attachmentsDisabled ? (
            <Button
              type="button"
              variant="outline"
              disabled
              title="진행 중이거나 잠긴 투표의 첨부파일은 수정할 수 없습니다."
            >
              <Pencil aria-hidden="true" />
              첨부파일 수정
            </Button>
          ) : (
            <Button type="button" variant="outline" asChild>
              <Link href={`/votes/${voteId}/edit`}>
                <Pencil aria-hidden="true" />
                첨부파일 수정
              </Link>
            </Button>
          )}
          <Button type="button" variant="outline" asChild>
            <Link href={`/votes/${voteId}`}>
              <ArrowLeft aria-hidden="true" />
              투표 상세
            </Link>
          </Button>
        </>
      }
    >
      {operationsQuery.isLoading || voteQuery.isLoading ? (
        <SkeletonCardGrid count={4} label="자식 투표 통계를 불러오는 중…" />
      ) : operationsQuery.isError || voteQuery.isError ? (
        <RetryErrorCard
          title="자식 투표 통계를 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => {
            void Promise.all([operationsQuery.refetch(), voteQuery.refetch()]);
          }}
        />
      ) : !operationsQuery.data ? (
        <EmptyStateCard title="자식 투표를 찾을 수 없습니다." description="삭제되었거나 접근할 수 없는 자식 투표입니다." />
      ) : (
        <SubVoteOperationsView
          operations={operationsQuery.data}
          attachmentsPanel={
            <AttachmentUploadSection
              attachments={operationsQuery.data.attachments ?? []}
              title={`${operationsQuery.data.title} 첨부파일`}
              description="등록된 안건 첨부파일을 확인하고 내려받을 수 있습니다."
              disabled={attachmentsDisabled}
              readOnly
              typeOptions={[
                { label: "공고문", value: "NOTICE" },
                { label: "안내 자료", value: "GUIDE" },
                { label: "기타", value: "ETC" },
              ]}
              onRequestUpload={(metadata) =>
                voteAttachmentApi.requestVoteDetailUpload(
                  { voteDetailId, voteId },
                  metadata,
                )
              }
              onUploadObject={voteAttachmentApi.uploadObject}
              onConfirmUpload={async (input) => {
                const result = await voteAttachmentApi.confirmVoteDetailUpload(
                  { voteDetailId, voteId },
                  input,
                );
                await refreshAttachmentProjections();
                return result;
              }}
              onDeleteAttachment={async (attachmentId) => {
                await voteAttachmentApi.deleteVoteDetailAttachment(
                  { voteDetailId, voteId },
                  attachmentId,
                );
                await refreshAttachmentProjections();
              }}
              onDownloadAttachment={(attachmentId) =>
                voteAttachmentApi.fetchVoteDetailDownloadUrl(
                  { voteDetailId, voteId },
                  attachmentId,
                )
              }
            />
          }
          candidateAttachments={Object.fromEntries(
            operationsQuery.data.candidates.map((candidate) => [
              candidate.id,
              <AttachmentUploadSection
                key={candidate.id}
                attachments={candidate.attachments ?? []}
                title={`${candidate.name} 첨부파일`}
                description="등록된 프로필 이미지, 공약집과 포스터를 확인하고 내려받을 수 있습니다."
                disabled={attachmentsDisabled}
                readOnly
                typeOptions={[
                  { label: "프로필 이미지", value: "PROFILE_IMAGE" },
                  { label: "공약집", value: "PLEDGE" },
                  { label: "포스터", value: "POSTER" },
                  { label: "기타", value: "ETC" },
                ]}
                onRequestUpload={(metadata) =>
                  voteAttachmentApi.requestCandidateUpload(
                    { candidateId: candidate.id, voteDetailId, voteId },
                    metadata,
                  )
                }
                onUploadObject={voteAttachmentApi.uploadObject}
                onConfirmUpload={async (input) => {
                  const result = await voteAttachmentApi.confirmCandidateUpload(
                    { candidateId: candidate.id, voteDetailId, voteId },
                    input,
                  );
                  await refreshAttachmentProjections();
                  return result;
                }}
                onDeleteAttachment={async (attachmentId) => {
                  await voteAttachmentApi.deleteCandidateAttachment(
                    { candidateId: candidate.id, voteDetailId, voteId },
                    attachmentId,
                  );
                  await refreshAttachmentProjections();
                }}
                onDownloadAttachment={(attachmentId) =>
                  voteAttachmentApi.fetchCandidateDownloadUrl(
                    { candidateId: candidate.id, voteDetailId, voteId },
                    attachmentId,
                  )
                }
              />,
            ]),
          )}
        />
      )}
    </PageShell>
  );
}

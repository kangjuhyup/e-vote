"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
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

  return (
    <PageShell
      account={account}
      navigation={<VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />}
      eyebrow="자식 투표 운영"
      title="투표율과 결과"
      description="자식 투표의 정책, 후보자, 투표율과 종료 결과를 확인합니다."
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href={`/votes/${voteId}`}><ArrowLeft aria-hidden="true" />투표 상세</Link>
        </Button>
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
          candidateAttachments={Object.fromEntries(
            operationsQuery.data.candidates.map((candidate) => [
              candidate.id,
              <AttachmentUploadSection
                key={candidate.id}
                title={`${candidate.name} 첨부파일`}
                description="프로필 이미지, 공약집, 포스터와 기타 후보 자료를 등록합니다."
                disabled={attachmentsDisabled}
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
                onConfirmUpload={(input) =>
                  voteAttachmentApi.confirmCandidateUpload(
                    { candidateId: candidate.id, voteDetailId, voteId },
                    input,
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

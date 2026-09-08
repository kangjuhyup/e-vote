"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { voteSmsDispatchQueryOptions } from "@/features/votes/api/vote-sms-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import { participationInvitationApi } from "@/features/votes/api/participation-invitation-api";
import type { SmsDelivery } from "@/features/votes/model/vote-sms.types";
import { VoteNavigation } from "@/features/votes/ui/vote-navigation";
import { VoteSmsDispatchDetail } from "@/features/votes/ui/vote-sms-dispatch-detail";
import { VoteApiError } from "@/shared/api/vote-api-error";

const PAGE_SIZE = 50;

function getParticipationLinkError(error: unknown) {
  if (error instanceof VoteApiError && error.status === 409) {
    return "이 발송의 참여 링크는 이후 발송으로 폐기되었습니다.";
  }
  if (error instanceof VoteApiError && error.status === 404) {
    return error.message.includes("Cannot GET")
      ? "개발용 참여 링크 조회 API가 현재 서버에 등록되지 않았습니다."
      : "이 발송에서 생성된 참여 링크가 없습니다.";
  }
  return error instanceof Error
    ? error.message
    : "참여 링크를 불러오지 못했습니다.";
}

export function VoteSmsDispatchDetailContainer({ account, dispatchId, voteId }: { account?: ReactNode; dispatchId: string; voteId: string }) {
  const [page, setPage] = useState(1);
  const [openingElectorId, setOpeningElectorId] = useState<string>();
  const [participationLinkError, setParticipationLinkError] = useState<string>();
  const detailQuery = useQuery(voteSmsDispatchQueryOptions(voteId, dispatchId, page, PAGE_SIZE));

  async function handleOpenParticipationLink(delivery: SmsDelivery) {
    setOpeningElectorId(delivery.electorId);
    setParticipationLinkError(undefined);
    try {
      const link = await participationInvitationApi.getDevelopmentLink({
        dispatchId,
        electorId: delivery.electorId,
        voteId,
      });
      window.open(link.participationUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setParticipationLinkError(getParticipationLinkError(error));
    } finally {
      setOpeningElectorId(undefined);
    }
  }

  return (
    <PageShell
      account={account}
      navigation={<VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />}
      eyebrow="문자 발송 이력"
      title="발송 상세"
      description="발송 요약과 수신자별 처리 결과를 확인합니다. 결과는 한 페이지에 50명씩 표시됩니다."
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href={`/votes/${voteId}`}>
            <ArrowLeft aria-hidden="true" />
            투표 상세
          </Link>
        </Button>
      }
    >
      {detailQuery.isLoading ? (
        <SkeletonCardGrid count={2} label="발송 상세를 불러오는 중…" />
      ) : detailQuery.error instanceof Error ? (
        <RetryErrorCard title="발송 상세를 불러오지 못했습니다." description={detailQuery.error.message} onRetry={() => void detailQuery.refetch()} />
      ) : detailQuery.data ? (
        <VoteSmsDispatchDetail
          dispatch={detailQuery.data}
          onPageChange={setPage}
          onOpenParticipationLink={
            process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
              ? (delivery) => void handleOpenParticipationLink(delivery)
              : undefined
          }
          openingParticipationLinkElectorId={openingElectorId}
          participationLinkError={participationLinkError}
        />
      ) : null}
    </PageShell>
  );
}

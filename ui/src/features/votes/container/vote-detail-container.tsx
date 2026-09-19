"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Pencil } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { EmptyStateCard } from "@/components/feedback/empty-state-card";
import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { billingOrderQueryOptions } from "@/features/billing/api/billing-query-options";
import { voteAttachmentApi } from "@/features/votes/api/vote-attachment-api";
import { voteContentChangeApi } from "@/features/votes/api/vote-content-change-api";
import { voteDetailQueryOptions } from "@/features/votes/api/votes-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import {
  readVoteDetailSearchParams,
  writeVoteDetailSearchParams,
} from "@/features/votes/lib/vote-search-params";
import type { ElectorParticipationFilter } from "@/features/votes/model/vote.types";
import { filterElectors } from "@/features/votes/model/vote-selectors";
import { useVotesUiStore } from "@/features/votes/store/votes-ui.store";

import { isVoteSetupEditable } from "../lib/vote-finalization";
import { toRosterItems } from "../lib/vote-view-models";
import { FieldSessionContainer } from "./field-session-container";
import { VoteSmsContainer } from "./vote-sms-container";
import { VoteDetailRosterSection } from "../ui/vote-detail-roster-section";
import { VoteDetailSummary } from "../ui/vote-detail-summary";
import { AttachmentUploadContainer } from "./attachment-upload-container";
import { VoteNavigation } from "../ui/vote-navigation";
import { VoteSubVoteSection } from "../ui/vote-sub-vote-section";

interface VoteDetailContainerProps {
  account?: ReactNode;
  voteId: string;
}

const electorPageSize = 25;
type FieldVotingChannel = "ONSITE" | "VISIT";

function isFieldVotingChannel(
  channel: "ONLINE" | "ONSITE" | "VISIT",
): channel is FieldVotingChannel {
  return channel === "ONSITE" || channel === "VISIT";
}

export function VoteDetailContainer({
  account,
  voteId,
}: VoteDetailContainerProps) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const electorParticipationFilter = useVotesUiStore(
    (state) => state.electorParticipationFilter,
  );
  const setElectorParticipationFilter = useVotesUiStore(
    (state) => state.setElectorParticipationFilter,
  );
  const electorPage = useVotesUiStore((state) => state.electorPage);
  const setElectorPage = useVotesUiStore((state) => state.setElectorPage);

  useEffect(() => {
    const state = readVoteDetailSearchParams(
      new URLSearchParams(searchParamsKey),
    );
    setElectorParticipationFilter(state.electorParticipationFilter);
    setElectorPage(state.electorPage);
  }, [searchParamsKey, setElectorPage, setElectorParticipationFilter]);

  const voteQuery = useQuery(voteDetailQueryOptions(voteId));
  const vote = voteQuery.data;
  const contentChangeQuery = useQuery({
    queryKey: ['vote-content-changes', voteId],
    queryFn: () => voteContentChangeApi.listMine(voteId),
    enabled: vote?.status === 'active',
    retry: false,
  });
  const latestContentChange = contentChangeQuery.data?.[0];
  const activeBillingOrderId = vote?.activeBillingOrderId;
  const billingOrderQuery = useQuery({
    ...billingOrderQueryOptions(activeBillingOrderId ?? ""),
    enabled: Boolean(activeBillingOrderId),
  });
  const billingOrderStatus =
    billingOrderQuery.data?.status ?? vote?.billingOrderStatus;
  const filteredElectors = vote
    ? filterElectors(vote.electors, electorParticipationFilter)
    : [];
  const fieldVotingChannels =
    vote?.votingChannels?.filter(isFieldVotingChannel) ?? [];
  const electorPageCount = Math.max(
    1,
    Math.ceil(filteredElectors.length / electorPageSize),
  );

  function replaceSearchParams(nextSearch: string) {
    router.replace(nextSearch.length > 0 ? `${pathname}?${nextSearch}` : pathname, {
      scroll: false,
    });
  }

  function handleParticipationFilterChange(
    nextFilter: ElectorParticipationFilter,
  ) {
    setElectorParticipationFilter(nextFilter);
    setElectorPage(1);
    replaceSearchParams(
      writeVoteDetailSearchParams(new URLSearchParams(searchParamsKey), {
        electorParticipationFilter: nextFilter,
        electorPage: 1,
      }),
    );
  }

  function handleElectorPageChange(nextPage: number) {
    const normalizedPage = Math.min(electorPageCount, Math.max(1, nextPage));
    setElectorPage(normalizedPage);
    replaceSearchParams(
      writeVoteDetailSearchParams(new URLSearchParams(searchParamsKey), {
        electorParticipationFilter,
        electorPage: normalizedPage,
      }),
    );
  }

  useEffect(() => {
    if (!vote || electorPage <= electorPageCount) {
      return;
    }

    setElectorPage(electorPageCount);
    const nextSearch = writeVoteDetailSearchParams(
      new URLSearchParams(searchParamsKey),
      {
        electorParticipationFilter,
        electorPage: electorPageCount,
      },
    );
    router.replace(
      nextSearch.length > 0 ? `${pathname}?${nextSearch}` : pathname,
      { scroll: false },
    );
  }, [
    electorPage,
    electorPageCount,
    electorParticipationFilter,
    pathname,
    router,
    searchParamsKey,
    setElectorPage,
    vote,
  ]);

  useEffect(() => {
    const observedStatus = billingOrderQuery.data?.status;
    if (!observedStatus || observedStatus === vote?.billingOrderStatus) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["votes"] });
  }, [
    billingOrderQuery.data?.status,
    queryClient,
    vote?.billingOrderStatus,
  ]);

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />
      }
      eyebrow="투표 정보"
      title="투표 상세"
      description="투표 내용, 자식 투표, 선거인명부와 참여 상태를 확인합니다."
      actions={
        <>
          {billingOrderStatus === "PENDING_PAYMENT" && activeBillingOrderId ? (
            <Button type="button" asChild>
              <Link href={`/billing/vote-usage-orders/${activeBillingOrderId}`}>
                <CreditCard aria-hidden="true" />
                결제 이어하기
              </Link>
            </Button>
          ) : vote &&
            (vote.status === "draft" || vote.status === "scheduled") &&
            !billingOrderStatus ? (
            <Button type="button" asChild>
              <Link href={`/votes/${voteId}/edit?step=review#vote-edit-step-review`}>
                <CreditCard aria-hidden="true" />
                결제하기
              </Link>
            </Button>
          ) : null}
          {vote && isVoteSetupEditable(vote.status, billingOrderStatus) ? (
            <Button type="button" variant="outline" asChild>
              <Link href={`/votes/${voteId}/edit`}>
                <Pencil aria-hidden="true" />
                투표 수정
              </Link>
            </Button>
          ) : vote?.status === "active" ? (
            <Button type="button" variant="outline" asChild>
              <Link href={`/votes/${voteId}/content-change`}>
                <Pencil aria-hidden="true" />
                {latestContentChange?.status === "PENDING"
                  ? "내용 변경 요청 · 심사 대기"
                  : latestContentChange?.status === "APPROVED"
                    ? "내용 변경 요청 · 최근 승인"
                    : latestContentChange?.status === "REJECTED"
                      ? "내용 변경 요청 · 최근 거절"
                      : latestContentChange?.status === "INVALIDATED"
                        ? "내용 변경 요청 · 적용 불가"
                        : "내용 변경 요청"}
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled
              title={
                billingOrderStatus === "PENDING_PAYMENT"
                  ? "결제 처리 중에는 투표를 수정할 수 없습니다."
                  : "초안 상태의 투표만 수정할 수 있습니다."
              }
            >
              <Pencil aria-hidden="true" />
              투표 수정
            </Button>
          )}
          {vote?.status === "finalized" &&
          activeBillingOrderId &&
          billingOrderStatus === "PAID" ? (
            <Button type="button" variant="outline" asChild>
              <Link href={`/billing/vote-usage-orders/${activeBillingOrderId}`}>
                결제·환불 관리
              </Link>
            </Button>
          ) : null}
          <Button type="button" variant="outline" asChild>
            <Link href="/votes">
              <ArrowLeft aria-hidden="true" />
              목록
            </Link>
          </Button>
        </>
      }
    >
      {voteQuery.isLoading ? (
        <SkeletonCardGrid count={3} label="투표 상세를 불러오는 중…" />
      ) : voteQuery.isError ? (
        <RetryErrorCard
          title="투표 상세를 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => voteQuery.refetch()}
        />
      ) : !vote ? (
        <EmptyStateCard
          title="투표를 찾을 수 없습니다."
          description="삭제되었거나 접근할 수 없는 투표입니다."
          action={
            <Button type="button" variant="outline" asChild>
              <Link href="/votes">
                <ArrowLeft aria-hidden="true" />
                목록으로
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <VoteDetailSummary
            billingOrderStatus={billingOrderStatus}
            vote={vote}
          />
          <AttachmentUploadContainer
            attachments={vote.attachments ?? []}
            title="투표 첨부파일"
            description="등록된 공고문과 안내 자료를 확인하고 내려받을 수 있습니다. 추가와 삭제는 투표 수정에서 할 수 있습니다."
            readOnly
            typeOptions={[
              { label: "공고문", value: "NOTICE" },
              { label: "안내 자료", value: "GUIDE" },
              { label: "기타", value: "ETC" },
            ]}
            onRequestUpload={(metadata) =>
              voteAttachmentApi.requestVoteUpload({ voteId: vote.id }, metadata)
            }
            onUploadObject={voteAttachmentApi.uploadObject}
            onConfirmUpload={async (input) => {
              const result = await voteAttachmentApi.confirmVoteUpload(
                { voteId: vote.id },
                input,
              );
              await queryClient.invalidateQueries({ queryKey: ["votes"] });
              return result;
            }}
            onDeleteAttachment={async (attachmentId) => {
              await voteAttachmentApi.deleteVoteAttachment(
                { voteId: vote.id },
                attachmentId,
              );
              await queryClient.invalidateQueries({ queryKey: ["votes"] });
            }}
            onDownloadAttachment={(attachmentId) =>
              voteAttachmentApi.fetchVoteDownloadUrl(
                { voteId: vote.id },
                attachmentId,
              )
            }
          />
          <VoteSmsContainer
            billingOrderId={activeBillingOrderId}
            billingOrderStatus={billingOrderStatus}
            voteId={vote.id}
            voteStatus={vote.status}
          />
          <VoteSubVoteSection voteId={vote.id} subVotes={vote.subVotes} />
          <VoteDetailRosterSection
            electorPage={electorPage}
            electorParticipationFilter={electorParticipationFilter}
            rosterItems={toRosterItems(filteredElectors)}
            onElectorPageChange={handleElectorPageChange}
            onElectorParticipationFilterChange={handleParticipationFilterChange}
          />
          {fieldVotingChannels.length > 0 ? (
            <FieldSessionContainer
              voteId={vote.id}
              smsEnabled={vote.status === "active"}
              commissionId={vote.commissionId}
              allowedChannels={fieldVotingChannels}
            />
          ) : null}
        </>
      )}
    </PageShell>
  );
}

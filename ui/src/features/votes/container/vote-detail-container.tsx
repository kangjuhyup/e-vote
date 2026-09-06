"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
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
import { toCandidateItems, toRosterItems } from "../lib/vote-view-models";
import { FieldSessionContainer } from "./field-session-container";
import { VoteSmsContainer } from "./vote-sms-container";
import { VoteDetailRosterSection } from "../ui/vote-detail-roster-section";
import { VoteDetailSummary } from "../ui/vote-detail-summary";
import { AttachmentUploadSection } from "../ui/attachment-upload-section";
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
      description="투표 내용, 후보자, 선거인명부와 참여 상태를 확인합니다."
      actions={
        <>
          {vote && isVoteSetupEditable(vote.status, billingOrderStatus) ? (
            <Button type="button" variant="outline" asChild>
              <Link href={`/votes/${voteId}/edit`}>
                <Pencil aria-hidden="true" />
                투표 수정
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
          <AttachmentUploadSection
            title="투표 첨부파일 업로드"
            description="공고문, 안내 자료와 기타 문서를 이 화면에서 바로 등록합니다. 파일은 20MB까지 등록할 수 있습니다."
            disabled={!isVoteSetupEditable(vote.status, billingOrderStatus)}
            disabledMessage="초안 상태이며 결제가 시작되기 전인 투표만 첨부파일을 등록할 수 있습니다."
            typeOptions={[
              { label: "공고문", value: "NOTICE" },
              { label: "안내 자료", value: "GUIDE" },
              { label: "기타", value: "ETC" },
            ]}
            onRequestUpload={(metadata) =>
              voteAttachmentApi.requestVoteUpload({ voteId: vote.id }, metadata)
            }
            onUploadObject={voteAttachmentApi.uploadObject}
            onConfirmUpload={(input) =>
              voteAttachmentApi.confirmVoteUpload({ voteId: vote.id }, input)
            }
          />
          <VoteSmsContainer voteId={vote.id} voteStatus={vote.status} />
          <VoteSubVoteSection voteId={vote.id} subVotes={vote.subVotes} />
          <VoteDetailRosterSection
            candidateItems={toCandidateItems(vote.candidates)}
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

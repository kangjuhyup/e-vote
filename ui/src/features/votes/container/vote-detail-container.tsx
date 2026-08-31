"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { EmptyStateCard } from "@/components/feedback/empty-state-card";
import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { voteDetailQueryOptions } from "@/features/votes/api/votes-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import {
  readVoteDetailSearchParams,
  writeVoteDetailSearchParams,
} from "@/features/votes/lib/vote-search-params";
import type { ElectorParticipationFilter } from "@/features/votes/model/vote.types";
import { filterElectors } from "@/features/votes/model/vote-selectors";
import { useVotesUiStore } from "@/features/votes/store/votes-ui.store";

import { toCandidateItems, toRosterItems } from "../lib/vote-view-models";
import { FieldSessionContainer } from "./field-session-container";
import { VoteSmsContainer } from "./vote-sms-container";
import { VoteDetailRosterSection } from "../ui/vote-detail-roster-section";
import { VoteDetailSummary } from "../ui/vote-detail-summary";
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
          <Button type="button" variant="outline" asChild>
            <Link href={`/votes/${voteId}/edit`}>
              <Pencil aria-hidden="true" />
              투표 수정
            </Link>
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/votes/${voteId}/electors`}>
              <UsersRound aria-hidden="true" />
              선거인 관리
            </Link>
          </Button>
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
          <VoteDetailSummary vote={vote} />
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

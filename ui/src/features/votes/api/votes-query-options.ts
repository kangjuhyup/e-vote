import { queryOptions } from "@tanstack/react-query";

import { createVotesApiClient, resolveVoteApiMode } from "./votes-api";
import type { VoteSummary } from "../model/vote.types";

const voteApiMode = resolveVoteApiMode();
const votesApiClient = createVotesApiClient();
export const VOTE_LIFECYCLE_REFETCH_INTERVAL_MS = 500;
const VOTE_TRANSITION_MAX_REFETCH_INTERVAL_MS = 60_000;

export function getVoteListRefetchInterval(
  votes?: VoteSummary[],
  now = Date.now(),
) {
  const intervals = (votes ?? [])
    .map((vote) => getVoteDetailRefetchInterval(vote, now))
    .filter((interval): interval is number => typeof interval === "number");
  return intervals.length > 0 ? Math.min(...intervals) : false;
}

export function getVoteDetailRefetchInterval(
  vote?: VoteSummary | null,
  now = Date.now(),
) {
  if (
    vote?.billingOrderStatus === "PENDING_PAYMENT" ||
    vote?.billingOrderStatus === "REFUND_PENDING"
  ) {
    return VOTE_LIFECYCLE_REFETCH_INTERVAL_MS;
  }
  const transitionAt =
    vote?.status === "finalized"
      ? vote.startsAt
      : vote?.status === "active"
        ? vote.endsAt
        : undefined;
  if (!transitionAt) return false;

  const transitionTime = Date.parse(transitionAt);
  if (!Number.isFinite(transitionTime) || transitionTime <= now) {
    return VOTE_LIFECYCLE_REFETCH_INTERVAL_MS;
  }
  return Math.min(
    transitionTime - now + VOTE_LIFECYCLE_REFETCH_INTERVAL_MS,
    VOTE_TRANSITION_MAX_REFETCH_INTERVAL_MS,
  );
}

export function voteDashboardQueryOptions() {
  return queryOptions({
    queryKey: ["votes", voteApiMode, "dashboard"],
    queryFn: votesApiClient.fetchVoteDashboard,
  });
}

export function voteListQueryOptions() {
  return queryOptions({
    queryKey: ["votes", voteApiMode, "list"],
    queryFn: votesApiClient.fetchVoteList,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      getVoteListRefetchInterval(query.state.data),
  });
}

export function voteDetailQueryOptions(voteId: string) {
  return queryOptions({
    queryKey: ["votes", voteApiMode, "detail", voteId],
    queryFn: () => votesApiClient.fetchVoteDetail(voteId),
    refetchInterval: (query) =>
      getVoteDetailRefetchInterval(query.state.data),
  });
}

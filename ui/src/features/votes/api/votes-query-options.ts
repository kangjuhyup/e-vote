import { queryOptions } from "@tanstack/react-query";

import { createVotesApiClient, resolveVoteApiMode } from "./votes-api";
import type { VoteSummary } from "../model/vote.types";

const voteApiMode = resolveVoteApiMode();
const votesApiClient = createVotesApiClient();
export const VOTE_LIFECYCLE_REFETCH_INTERVAL_MS = 500;

export function getVoteListRefetchInterval(votes?: VoteSummary[]) {
  return votes?.some(
    (vote) =>
      vote.billingOrderStatus === "PENDING_PAYMENT" ||
      vote.billingOrderStatus === "REFUND_PENDING",
  )
    ? VOTE_LIFECYCLE_REFETCH_INTERVAL_MS
    : false;
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
    refetchInterval: (query) =>
      getVoteListRefetchInterval(query.state.data),
  });
}

export function voteDetailQueryOptions(voteId: string) {
  return queryOptions({
    queryKey: ["votes", voteApiMode, "detail", voteId],
    queryFn: () => votesApiClient.fetchVoteDetail(voteId),
  });
}

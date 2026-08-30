import { queryOptions } from "@tanstack/react-query";

import { createVotesApiClient, resolveVoteApiMode } from "./votes-api";

const voteApiMode = resolveVoteApiMode();
const votesApiClient = createVotesApiClient();

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
  });
}

export function voteDetailQueryOptions(voteId: string) {
  return queryOptions({
    queryKey: ["votes", voteApiMode, "detail", voteId],
    queryFn: () => votesApiClient.fetchVoteDetail(voteId),
  });
}

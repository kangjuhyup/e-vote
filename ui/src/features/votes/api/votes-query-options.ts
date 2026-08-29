import { queryOptions } from "@tanstack/react-query";

import { createVotesApiClient } from "./votes-api";

const votesApiClient = createVotesApiClient();

export function voteDashboardQueryOptions() {
  return queryOptions({
    queryKey: ["votes", "dashboard"],
    queryFn: votesApiClient.fetchVoteDashboard,
  });
}

export function voteListQueryOptions() {
  return queryOptions({
    queryKey: ["votes", "list"],
    queryFn: votesApiClient.fetchVoteList,
  });
}

export function voteDetailQueryOptions(voteId: string) {
  return queryOptions({
    queryKey: ["votes", "detail", voteId],
    queryFn: () => votesApiClient.fetchVoteDetail(voteId),
  });
}

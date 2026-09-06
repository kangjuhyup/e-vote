import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { resolveApiMode } from "@/shared/config/api-mode";

import { voteOperationsApi } from "./vote-operations-api";

const apiMode = resolveApiMode();

export function subVoteOperationsQueryOptions(
  voteId: string,
  voteDetailId: string,
) {
  return queryOptions({
    queryKey: ["vote-operations", apiMode, voteId, "sub-votes", voteDetailId],
    queryFn: () =>
      voteOperationsApi.fetchSubVoteOperations(voteId, voteDetailId),
  });
}

export function electorManagementQueryOptions(
  voteId: string,
  page: number,
  pageSize = 20,
) {
  return queryOptions({
    queryKey: ["vote-operations", apiMode, voteId, "electors", page, pageSize],
    queryFn: () => voteOperationsApi.fetchElectors(voteId, page, pageSize),
  });
}

export function commissionManagementQueryOptions(page: number, pageSize = 20) {
  return queryOptions({
    queryKey: ["vote-operations", apiMode, "commissions", page, pageSize],
    queryFn: () => voteOperationsApi.fetchCommissions(page, pageSize),
    placeholderData: keepPreviousData,
  });
}

export function commissionQueryOptions(commissionId: string) {
  return queryOptions({
    queryKey: ["vote-operations", apiMode, "commissions", commissionId],
    queryFn: () => voteOperationsApi.fetchCommission(commissionId),
  });
}

export function fieldSessionManagementQueryOptions(
  voteId: string,
  page: number,
  pageSize = 20,
) {
  return queryOptions({
    queryKey: [
      "vote-operations",
      apiMode,
      "field-sessions",
      voteId,
      page,
      pageSize,
    ],
    queryFn: () => voteOperationsApi.fetchFieldSessions(voteId, page, pageSize),
  });
}

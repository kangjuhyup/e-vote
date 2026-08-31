import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { resolveApiMode } from "@/shared/config/api-mode";

import { voteSmsApi } from "./vote-sms-api";

const apiMode = resolveApiMode();

export function voteSmsDispatchPageQueryOptions(
  voteId: string,
  page: number,
  pageSize = 20,
) {
  return queryOptions({
    queryKey: ["vote-sms", apiMode, voteId, "dispatches", page, pageSize],
    queryFn: () => voteSmsApi.fetchDispatchPage(voteId, page, pageSize),
    placeholderData: keepPreviousData,
  });
}

export function voteSmsDispatchQueryOptions(
  voteId: string,
  dispatchId: string,
) {
  return queryOptions({
    queryKey: ["vote-sms", apiMode, voteId, "dispatches", dispatchId],
    queryFn: () => voteSmsApi.fetchDispatch(voteId, dispatchId),
  });
}

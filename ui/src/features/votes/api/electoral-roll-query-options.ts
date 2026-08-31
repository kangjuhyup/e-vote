import { queryOptions } from "@tanstack/react-query";

import { resolveApiMode } from "@/shared/config/api-mode";

import type { ElectoralRollPageInput } from "../model/electoral-roll.types";

import { electoralRollApi } from "./electoral-roll-api";

const apiMode = resolveApiMode();

export function electoralRollQueryOptions(electoralRollId: string) {
  return queryOptions({
    queryKey: ["electoral-rolls", apiMode, electoralRollId],
    queryFn: () => electoralRollApi.fetchElectoralRoll(electoralRollId),
  });
}

export function electoralRollPageQueryOptions(input: ElectoralRollPageInput) {
  return queryOptions({
    queryKey: ["electoral-rolls", apiMode, "page", input],
    queryFn: () => electoralRollApi.fetchElectoralRollPage(input),
  });
}

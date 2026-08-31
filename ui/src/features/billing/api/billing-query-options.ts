import { queryOptions } from "@tanstack/react-query";

import { resolveApiMode } from "@/shared/config/api-mode";

import { billingApi } from "./billing-api";

const apiMode = resolveApiMode();

export function billingOrderQueryOptions(billingOrderId: string) {
  return queryOptions({
    queryKey: ["billing", apiMode, "vote-usage-orders", billingOrderId],
    queryFn: () => billingApi.fetchVoteUsageOrder(billingOrderId),
  });
}

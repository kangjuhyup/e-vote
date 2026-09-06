import { queryOptions } from "@tanstack/react-query";

import type { BillingOrder } from "@/features/billing/model/billing.types";
import { resolveApiMode } from "@/shared/config/api-mode";

import { billingApi } from "./billing-api";

const apiMode = resolveApiMode();
export const BILLING_ORDER_REFETCH_INTERVAL_MS = 500;

export function getBillingOrderRefetchInterval(order?: BillingOrder) {
  return order?.status === "PENDING_PAYMENT" ||
    order?.status === "REFUND_PENDING"
    ? BILLING_ORDER_REFETCH_INTERVAL_MS
    : false;
}

export function billingOrderQueryOptions(billingOrderId: string) {
  return queryOptions({
    queryKey: ["billing", apiMode, "vote-usage-orders", billingOrderId],
    queryFn: () => billingApi.fetchVoteUsageOrder(billingOrderId),
    refetchInterval: (query) =>
      getBillingOrderRefetchInterval(query.state.data),
  });
}

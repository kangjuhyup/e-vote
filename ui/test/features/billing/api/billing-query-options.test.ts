import { describe, expect, it } from "vitest";

import {
  BILLING_ORDER_REFETCH_INTERVAL_MS,
  getBillingOrderRefetchInterval,
} from "@/features/billing/api/billing-query-options";
import type {
  BillingOrder,
  BillingOrderStatus,
} from "@/features/billing/model/billing.types";

function billingOrder(status: BillingOrderStatus): BillingOrder {
  return {
    amount: 3_000,
    baseAmount: 3_000,
    blockchainStorageAmount: 0,
    blockchainStorageCount: 0,
    blockchainStorageUnitPrice: 3_000,
    cancelableUntil: "2026-09-12T00:00:00.000Z",
    cancellationWindowDays: 7,
    currency: "KRW",
    electorCount: 3,
    id: "billing-order-1",
    identityVerificationAmount: 0,
    identityVerificationRequired: false,
    identityVerificationUnitPrice: 3_000,
    issuedAt: "2026-09-05T00:00:00.000Z",
    orderedByUserPrincipalId: "user-principal-1",
    pricingUnitCount: 1,
    pricingUnitSize: 100,
    productCode: "VOTE_USAGE",
    productName: "투표 개설 이용료",
    status,
    unitPrice: 3_000,
    voteId: "vote-1",
  };
}

describe("billing order query options", () => {
  it.each(["PENDING_PAYMENT", "REFUND_PENDING"] as const)(
    "polls while the order can advance from %s",
    (status) => {
      expect(getBillingOrderRefetchInterval(billingOrder(status))).toBe(
        BILLING_ORDER_REFETCH_INTERVAL_MS,
      );
    },
  );

  it.each(["PAID", "CANCELED", "REFUNDED"] as const)(
    "stops polling after the order reaches %s",
    (status) => {
      expect(getBillingOrderRefetchInterval(billingOrder(status))).toBe(false);
    },
  );

  it("does not poll before an order has loaded", () => {
    expect(getBillingOrderRefetchInterval()).toBe(false);
  });
});

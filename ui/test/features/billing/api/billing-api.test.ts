import { describe, expect, it, vi } from "vitest";

import { createBillingApiClient } from "@/features/billing/api/billing-api";

function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: "2026-08-31T00:00:00.000Z",
    }),
    { status },
  );
}

function billingOrder(overrides: Record<string, unknown> = {}) {
  return {
    amount: 6_000,
    cancelableUntil: "2026-09-07T00:00:00.000Z",
    cancellationWindowDays: 7,
    currency: "KRW",
    electorCount: 120,
    id: "billing-order-1",
    issuedAt: "2026-08-31T00:00:00.000Z",
    orderedByUserPrincipalId: "user-principal-1",
    pricingUnitCount: 2,
    pricingUnitSize: 100,
    productCode: "VOTE_USAGE",
    productName: "투표 개설 이용료",
    status: "PENDING_PAYMENT",
    unitPrice: 3_000,
    voteId: "vote/1",
    ...overrides,
  };
}

describe("billing api", () => {
  it("creates an order with only the vote id", async () => {
    const fetcher = vi.fn(async () => jsonResponse(billingOrder(), 201));
    const client = createBillingApiClient({
      baseUrl: "https://api.example.com/",
      fetcher,
      mode: "live",
    });

    await expect(client.createVoteUsageOrder("vote/1")).resolves.toMatchObject({
      amount: 6_000,
      id: "billing-order-1",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/billing/vote-usage-orders",
      expect.objectContaining({
        body: JSON.stringify({ voteId: "vote/1" }),
        method: "POST",
      }),
    );
  });

  it("gets an encoded order id", async () => {
    const fetcher = vi.fn(async () => jsonResponse(billingOrder()));
    const client = createBillingApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });

    await client.fetchVoteUsageOrder("billing/order-1");

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/billing/vote-usage-orders/billing%2Forder-1",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("cancels with only the user-entered reason", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse(billingOrder({ status: "CANCELED" })),
    );
    const client = createBillingApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });

    await client.cancelVoteUsageOrder({
      billingOrderId: "billing-order-1",
      reason: "투표 일정 변경",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/billing/vote-usage-orders/billing-order-1/cancellation",
      expect.objectContaining({
        body: JSON.stringify({ reason: "투표 일정 변경" }),
        method: "POST",
      }),
    );
  });

  it("keeps mock creation idempotent and uses server-shaped pricing", async () => {
    const client = createBillingApiClient({
      mode: "mock",
      now: () => "2026-08-31T00:00:00.000Z",
    });

    const first = await client.createVoteUsageOrder("vote-1");
    const second = await client.createVoteUsageOrder("vote-1");

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      amount: 3_000,
      orderedByUserPrincipalId: "mock-user-principal",
      pricingUnitCount: 1,
      pricingUnitSize: 100,
      unitPrice: 3_000,
    });
  });

  it("moves mock payments and refunds through the same transient states as the server", async () => {
    let nowSequence = 0;
    const client = createBillingApiClient({
      mode: "mock",
      now: () => `2026-09-05T00:00:0${nowSequence++}.000Z`,
    });

    const pending = await client.createVoteUsageOrder("mock-lifecycle-vote");
    expect(pending.status).toBe("PENDING_PAYMENT");
    await expect(client.fetchVoteUsageOrder(pending.id)).resolves.toMatchObject({
      status: "PENDING_PAYMENT",
    });
    const paid = await client.fetchVoteUsageOrder(pending.id);
    expect(paid.status).toBe("PAID");

    const refundPending = await client.cancelVoteUsageOrder({
      billingOrderId: paid.id,
      reason: "일정 변경",
    });
    expect(refundPending.status).toBe("REFUND_PENDING");
    await client.fetchVoteUsageOrder(paid.id);
    await expect(client.fetchVoteUsageOrder(paid.id)).resolves.toMatchObject({
      status: "REFUNDED",
    });

    const replacement = await client.createVoteUsageOrder(
      "mock-lifecycle-vote",
    );
    expect(replacement.status).toBe("PENDING_PAYMENT");
    expect(replacement.id).not.toBe(paid.id);
  });

  it("explains creator ownership when order creation is forbidden", async () => {
    const fetcher = vi.fn(async () => jsonResponse({}, 403));
    const client = createBillingApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });

    await expect(client.createVoteUsageOrder("vote-1")).rejects.toThrow(
      /투표 생성자만.*생성자 정보가 없는 기존 투표/,
    );
  });

  it("explains order ownership when lookup or cancellation is forbidden", async () => {
    const fetcher = vi.fn(async () => jsonResponse({}, 403));
    const client = createBillingApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });

    await expect(client.fetchVoteUsageOrder("order-1")).rejects.toThrow(
      "결제 주문을 생성한 사용자만 이 주문을 조회할 수 있습니다.",
    );
    await expect(
      client.cancelVoteUsageOrder({
        billingOrderId: "order-1",
        reason: "일정 변경",
      }),
    ).rejects.toThrow(
      "결제 주문을 생성한 사용자만 이 주문을 취소할 수 있습니다.",
    );
  });
});

import { describe, expect, it } from "vitest";

import { getBillingCancellationAvailability } from "@/features/billing/lib/billing-cancellation";

const now = Date.parse("2026-09-19T00:00:00.000Z");

describe("billing cancellation availability", () => {
  it("allows cancellation before the vote starts when no notice was sent", () => {
    expect(
      getBillingCancellationAvailability({
        status: "PAID",
        startsAt: "2026-09-19T00:00:01.000Z",
        hasUpcomingNoticeDispatch: false,
        now,
      }),
    ).toEqual({ canCancel: true, cancelUnavailableReason: undefined });
  });

  it("blocks cancellation from the exact vote start time", () => {
    expect(
      getBillingCancellationAvailability({
        status: "PENDING_PAYMENT",
        startsAt: "2026-09-19T00:00:00.000Z",
        hasUpcomingNoticeDispatch: false,
        now,
      }),
    ).toEqual({
      canCancel: false,
      cancelUnavailableReason:
        "투표 시작 시각이 지나 주문을 취소하거나 환불할 수 없습니다.",
    });
  });

  it("blocks refunds after an upcoming vote notice was sent", () => {
    expect(
      getBillingCancellationAvailability({
        status: "PAID",
        startsAt: "2026-09-20T00:00:00.000Z",
        hasUpcomingNoticeDispatch: true,
        now,
      }),
    ).toEqual({
      canCancel: false,
      cancelUnavailableReason:
        "투표 안내 문자 발송이 시작되어 환불할 수 없습니다.",
    });
  });
});

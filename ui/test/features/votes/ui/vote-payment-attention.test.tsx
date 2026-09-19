/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { VoteSummary } from "@/features/votes/model/vote.types";
import { VotePaymentAttention } from "@/features/votes/ui/vote-payment-attention";

afterEach(cleanup);

describe("payment attention", () => {
  it("shows pending payment separately from an unavailable payment status", () => {
    const base: VoteSummary = {
      id: "pending",
      title: "결제 대기 투표",
      status: "draft",
      billingOrderStatus: "PENDING_PAYMENT",
      startsAt: "2026-09-19T03:00:00.000Z",
      endsAt: "2026-09-20T03:00:00.000Z",
      electorCount: 10,
      participatedCount: 0,
      participationKnown: false,
    };

    render(
      <VotePaymentAttention
        votes={[base, { ...base, id: "unknown", title: "상태 확인 투표", billingOrderStatus: undefined }]}
      />,
    );

    expect(screen.getByRole("heading", { name: "시작 임박 · 결제 확인 필요 2건" })).toBeTruthy();
    expect(screen.getByText("결제 미완료")).toBeTruthy();
    expect(screen.getByText("결제·확정 확인 필요")).toBeTruthy();
    expect(screen.getByRole("link", { name: /결제 대기 투표/ }).getAttribute("href")).toBe("/votes/pending");
  });
});

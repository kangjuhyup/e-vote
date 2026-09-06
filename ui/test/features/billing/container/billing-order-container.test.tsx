/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { billingApi } from "@/features/billing/api/billing-api";
import { BillingOrderContainer } from "@/features/billing/container/billing-order-container";
import type { BillingOrder } from "@/features/billing/model/billing.types";
import { BillingOrderConfirmation } from "@/features/billing/ui/billing-order-confirmation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderWithQueryClient(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

function billingOrder(overrides: Partial<BillingOrder> = {}): BillingOrder {
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
    orderedByUserPrincipalId: "user-1",
    pricingUnitCount: 1,
    pricingUnitSize: 100,
    productCode: "VOTE_USAGE",
    productName: "투표 개설 이용료",
    status: "PENDING_PAYMENT",
    unitPrice: 3_000,
    voteId: "vote-1",
    ...overrides,
  };
}

describe("billing order UI", () => {
  it("requires explicit confirmation before creating a locking order", () => {
    const onCreateOrder = vi.fn();
    render(
      <BillingOrderConfirmation
        hasCommission
        isConfirmed={false}
        isSubmitting={false}
        onConfirmChange={vi.fn()}
        onCreateOrder={onCreateOrder}
      />,
    );

    expect(screen.getByText(/주문 생성과 동시에 결제 처리가 시작/)).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "이용료 결제 요청",
      }),
    ).toHaveProperty("disabled", true);
    expect(onCreateOrder).not.toHaveBeenCalled();
  });

  it("allows a new payment after a previous order is refunded", () => {
    const onCreateOrder = vi.fn();
    render(
      <BillingOrderConfirmation
        hasCommission
        isConfirmed
        isSubmitting={false}
        onConfirmChange={vi.fn()}
        onCreateOrder={onCreateOrder}
        order={billingOrder({
          id: "refunded-order",
          refundedAt: "2026-09-05T00:10:00.000Z",
          status: "REFUNDED",
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "이용료 다시 결제" }));
    expect(onCreateOrder).toHaveBeenCalledOnce();
  });

  it("shows a zero blockchain surcharge in the payment confirmation", () => {
    render(
      <BillingOrderConfirmation
        hasCommission
        isConfirmed
        isSubmitting={false}
        onConfirmChange={vi.fn()}
        onCreateOrder={vi.fn()}
        order={billingOrder()}
      />,
    );

    expect(screen.getByText("기본 이용료")).toBeTruthy();
    expect(screen.getByText("블록체인 결과 저장 추가금")).toBeTruthy();
    expect(screen.getByText("0건 × ₩3,000")).toBeTruthy();
    expect(screen.getByText("최종 결제 금액")).toBeTruthy();
    expect(screen.getAllByText("₩3,000")).toHaveLength(2);
    expect(screen.getByText("₩0")).toBeTruthy();
  });

  it("shows the server-provided blockchain surcharge and total in order details", async () => {
    const order = billingOrder({
      amount: 18_000,
      baseAmount: 6_000,
      blockchainStorageAmount: 6_000,
      blockchainStorageCount: 2,
      electorCount: 120,
      id: "blockchain-billing-order",
      identityVerificationAmount: 6_000,
      identityVerificationRequired: true,
      pricingUnitCount: 2,
    });
    vi.spyOn(billingApi, "fetchVoteUsageOrder").mockResolvedValue(order);

    renderWithQueryClient(
      <BillingOrderContainer billingOrderId={order.id} />,
    );

    expect(await screen.findByText("120명 · 100명 단위 2구간 · 구간당 ₩3,000")).toBeTruthy();
    expect(screen.getByText("2건 × ₩3,000")).toBeTruthy();
    expect(screen.getByText("본인인증 필수")).toBeTruthy();
    expect(screen.getByText("2구간 × ₩3,000")).toBeTruthy();
    expect(screen.getAllByText("₩6,000")).toHaveLength(3);
    expect(screen.getByText("₩18,000")).toBeTruthy();
  });

  it.each([
    {
      blockchainStorageAmount: 0,
      blockchainStorageCount: 0,
      identityVerificationAmount: 0,
      identityVerificationRequired: false,
      totalAmount: 6_000,
      totalLabel: "₩6,000",
    },
    {
      blockchainStorageAmount: 6_000,
      blockchainStorageCount: 2,
      identityVerificationAmount: 0,
      identityVerificationRequired: false,
      totalAmount: 12_000,
      totalLabel: "₩12,000",
    },
    {
      blockchainStorageAmount: 0,
      blockchainStorageCount: 0,
      identityVerificationAmount: 6_000,
      identityVerificationRequired: true,
      totalAmount: 12_000,
      totalLabel: "₩12,000",
    },
    {
      blockchainStorageAmount: 6_000,
      blockchainStorageCount: 2,
      identityVerificationAmount: 6_000,
      identityVerificationRequired: true,
      totalAmount: 18_000,
      totalLabel: "₩18,000",
    },
  ])(
    "shows the server total for identity=$identityVerificationRequired and blockchain=$blockchainStorageCount",
    ({
      blockchainStorageAmount,
      blockchainStorageCount,
      identityVerificationAmount,
      identityVerificationRequired,
      totalAmount,
      totalLabel,
    }) => {
      render(
        <BillingOrderConfirmation
          hasCommission
          isConfirmed
          isSubmitting={false}
          onConfirmChange={vi.fn()}
          onCreateOrder={vi.fn()}
          order={billingOrder({
            amount: totalAmount,
            baseAmount: 6_000,
            blockchainStorageAmount,
            blockchainStorageCount,
            electorCount: 120,
            identityVerificationAmount,
            identityVerificationRequired,
            pricingUnitCount: 2,
          })}
        />,
      );

      expect(
        screen.getByText(
          `${blockchainStorageCount.toLocaleString()}건 × ₩3,000`,
        ),
      ).toBeTruthy();
      expect(screen.getByText("최종 결제 금액").nextElementSibling?.textContent).toBe(
        totalLabel,
      );
      if (identityVerificationRequired) {
        expect(screen.getByText("본인인증 필수")).toBeTruthy();
        expect(screen.getByText("2구간 × ₩3,000")).toBeTruthy();
      } else {
        expect(screen.queryByText("본인인증 필수")).toBeNull();
      }
    },
  );

  it("shows the server price snapshot and cancels after confirmation", async () => {
    const order = await billingApi.createVoteUsageOrder("billing-ui-vote");
    renderWithQueryClient(
      <BillingOrderContainer billingOrderId={order.id} />,
    );

    expect(await screen.findAllByText("₩3,000")).toHaveLength(2);
    expect(screen.getByText("결제 대기")).toBeTruthy();
    expect(
      screen.getByText("3명 · 100명 단위 1구간 · 구간당 ₩3,000"),
    ).toBeTruthy();
    expect(screen.queryByText(order.id)).toBeNull();
    expect(screen.queryByText(order.voteId)).toBeNull();
    expect(screen.queryByText("투표 ID")).toBeNull();

    fireEvent.change(screen.getByLabelText("취소 사유"), {
      target: { value: "투표 일정 변경" },
    });
    fireEvent.click(
      screen.getByText(
        "결제된 주문은 환불 완료 전까지 투표의 확정 상태와 설정 잠금이 유지됨을 확인했습니다.",
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "주문 및 투표 취소" }),
    );

    expect(await screen.findByText("취소 완료")).toBeTruthy();
    expect(screen.getByText("투표 일정 변경")).toBeTruthy();
    expect(
      screen.getByText("결제 주문을 취소하고 투표 상태 갱신을 요청했습니다."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "주문 및 투표 취소" }),
    ).toBeNull();
  });

  it("polls a pending order until the server reports payment complete", async () => {
    const pendingOrder = await billingApi.createVoteUsageOrder(
      "billing-polling-vote",
    );
    const fetchOrder = vi
      .spyOn(billingApi, "fetchVoteUsageOrder")
      .mockResolvedValueOnce(pendingOrder)
      .mockResolvedValue({
        ...pendingOrder,
        paidAt: "2026-09-05T00:00:01.000Z",
        paymentId: "mock-payment-1",
        status: "PAID",
      });

    renderWithQueryClient(
      <BillingOrderContainer billingOrderId={pendingOrder.id} />,
    );

    expect(await screen.findByText("결제 대기")).toBeTruthy();
    expect(
      await screen.findByText("결제 완료", {}, { timeout: 2_000 }),
    ).toBeTruthy();
    expect(fetchOrder.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("polls a refund request until the server reports refund complete", async () => {
    const pendingOrder = await billingApi.createVoteUsageOrder(
      "billing-refund-polling-vote",
    );
    const paidOrder = {
      ...pendingOrder,
      paidAt: "2026-09-05T00:00:01.000Z",
      paymentId: "mock-payment-2",
      status: "PAID" as const,
    };
    const refundPendingOrder = {
      ...paidOrder,
      canceledAt: "2026-09-05T00:00:02.000Z",
      cancellationReason: "투표 일정 변경",
      refundRequestedAt: "2026-09-05T00:00:02.000Z",
      status: "REFUND_PENDING" as const,
    };
    vi.spyOn(billingApi, "fetchVoteUsageOrder")
      .mockResolvedValueOnce(paidOrder)
      .mockResolvedValue({
        ...refundPendingOrder,
        refundedAt: "2026-09-05T00:00:03.000Z",
        status: "REFUNDED",
      });
    vi.spyOn(billingApi, "cancelVoteUsageOrder").mockResolvedValue(
      refundPendingOrder,
    );

    renderWithQueryClient(
      <BillingOrderContainer billingOrderId={paidOrder.id} />,
    );
    expect(await screen.findByText("결제 완료")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("취소 사유"), {
      target: { value: "투표 일정 변경" },
    });
    fireEvent.click(
      screen.getByText(
        "결제된 주문은 환불 완료 전까지 투표의 확정 상태와 설정 잠금이 유지됨을 확인했습니다.",
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "주문 및 투표 취소" }),
    );

    expect(await screen.findByText("환불 처리 중")).toBeTruthy();
    expect(
      await screen.findByText("환불 완료", {}, { timeout: 2_000 }),
    ).toBeTruthy();
  });
});

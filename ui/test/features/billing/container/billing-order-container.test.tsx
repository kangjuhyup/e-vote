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
import { BillingOrderConfirmation } from "@/features/billing/ui/billing-order-confirmation";

afterEach(cleanup);

function renderWithQueryClient(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
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

    expect(screen.getByText(/주문 생성과 동시에 투표 설정이 확정/)).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "이용료 주문 생성 및 투표 확정",
      }),
    ).toHaveProperty("disabled", true);
    expect(onCreateOrder).not.toHaveBeenCalled();
  });

  it("shows the server price snapshot and cancels after confirmation", async () => {
    const order = await billingApi.createVoteUsageOrder("billing-ui-vote");
    renderWithQueryClient(
      <BillingOrderContainer billingOrderId={order.id} />,
    );

    expect(await screen.findAllByText("₩3,000")).toHaveLength(2);
    expect(screen.getByText("결제 대기")).toBeTruthy();
    expect(screen.getByText("3명")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("취소 사유"), {
      target: { value: "투표 일정 변경" },
    });
    fireEvent.click(
      screen.getByText(
        "취소 후 이 투표를 다시 사용하거나 수정할 수 없음을 확인했습니다.",
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "주문 및 투표 취소" }),
    );

    expect(await screen.findByText("취소 완료")).toBeTruthy();
    expect(screen.getByText("투표 일정 변경")).toBeTruthy();
    expect(
      screen.getByText("주문과 확정된 투표를 취소했습니다."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "주문 및 투표 취소" }),
    ).toBeNull();
  });
});

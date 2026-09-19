/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { billingApi } from '@/features/billing/api/billing-api';
import { TossTestResultContainer } from '@/features/billing/container/toss-test-result-container';
import type { BillingOrder } from '@/features/billing/model/billing.types';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const queryClients: QueryClient[] = [];

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClients.push(queryClient);
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  queryClients.splice(0).forEach((queryClient) => queryClient.clear());
  vi.restoreAllMocks();
  replace.mockReset();
});

describe('Toss test result', () => {
  it('does not send a mismatched order or invalid amount to the server', async () => {
    const confirm = vi.spyOn(billingApi, 'confirmTossTestPayment');
    renderWithQueryClient(
      <TossTestResultContainer
        billingOrderId="order-1"
        paymentKey="key"
        orderId="order-2"
        amount="3000"
      />,
    );
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('일치하지 않습니다'),
    );
    expect(confirm).not.toHaveBeenCalled();
  });

  it('approves a matching order and removes the payment key from the address', async () => {
    const confirm = vi
      .spyOn(billingApi, 'confirmTossTestPayment')
      .mockResolvedValue({ status: 'PAID' } as never);
    renderWithQueryClient(
      <TossTestResultContainer
        billingOrderId="order-1"
        paymentKey="key"
        orderId="order-1"
        amount="3000"
      />,
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        '/billing/vote-usage-orders/order-1',
      ),
    );
    expect(confirm).toHaveBeenCalledWith({
      billingOrderId: 'order-1',
      paymentKey: 'key',
      orderId: 'order-1',
      amount: 3000,
    });
  });

  it('lets a buyer return to checkout when payment failed and the order is still pending', async () => {
    const confirm = vi.spyOn(billingApi, 'confirmTossTestPayment');
    vi.spyOn(billingApi, 'fetchVoteUsageOrder').mockResolvedValue({
      status: 'PENDING_PAYMENT',
    } as BillingOrder);
    renderWithQueryClient(
      <TossTestResultContainer
        billingOrderId="order-1"
        failureCode="PAY_PROCESS_CANCELED"
      />,
    );
    expect(screen.getByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('PAY_PROCESS_CANCELED'),
    );
    expect(
      await screen.findByRole('link', { name: '다시 결제하러 가기' }),
    ).toHaveProperty(
      'href',
      `${window.location.origin}/billing/vote-usage-orders/order-1`,
    );
    expect(confirm).not.toHaveBeenCalled();
  });

  it.each(['PAID', 'CANCELED', 'REFUND_PENDING', 'REFUNDED'] as const)(
    'does not offer another payment for a %s order',
    async (status) => {
      vi.spyOn(billingApi, 'fetchVoteUsageOrder').mockResolvedValue({
        status,
        voteId: 'vote-1',
      } as BillingOrder);
      renderWithQueryClient(
        <TossTestResultContainer
          billingOrderId="order-1"
          failureCode="PAYMENT_FAILED"
        />,
      );

      expect(
        await screen.findByText(
          status === 'PAID'
            ? /이미 결제 완료됐습니다/
            : status === 'REFUND_PENDING'
              ? /환불 처리 중입니다/
              : /이 주문은 다시 결제할 수 없습니다/,
        ),
      ).toBeTruthy();
      const destination = screen.getByRole('link', {
        name:
          status === 'PAID'
            ? '결제 내역 보기'
            : status === 'REFUND_PENDING'
              ? '주문 상태 확인'
              : '투표 설정 확인',
      });
      expect(destination.getAttribute('href')).toBe(
        status === 'CANCELED' || status === 'REFUNDED'
          ? '/votes/vote-1/edit'
          : '/billing/vote-usage-orders/order-1',
      );
      expect(screen.queryByRole('link', { name: '다시 결제하러 가기' })).toBeNull();
    },
  );

  it('does not offer another payment when the order status cannot be checked', async () => {
    vi.spyOn(billingApi, 'fetchVoteUsageOrder').mockRejectedValue(
      new Error('order unavailable'),
    );
    renderWithQueryClient(
      <TossTestResultContainer
        billingOrderId="order-1"
        failureCode="PAYMENT_FAILED"
      />,
    );

    expect(
      await screen.findByText(/재결제 전에 주문 상태를 확인해 주세요/),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: '주문 상태 확인' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: '다시 결제하러 가기' })).toBeNull();
  });

  it('asks the buyer to check the order when approval could not be confirmed', async () => {
    vi.spyOn(billingApi, 'confirmTossTestPayment').mockRejectedValue(
      new Error('approval result unavailable'),
    );
    renderWithQueryClient(
      <TossTestResultContainer
        billingOrderId="order-1"
        paymentKey="key"
        orderId="order-1"
        amount="3000"
      />,
    );

    expect(
      await screen.findByText(/결제 승인 결과를 확인하지 못했습니다/),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: '주문 상태 확인' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: '다시 결제하러 가기' })).toBeNull();
  });
});

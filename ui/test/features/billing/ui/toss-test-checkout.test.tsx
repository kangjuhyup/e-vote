/* @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TossTestCheckoutContainer } from '@/features/billing/container/toss-test-checkout-container';
import type { BillingOrder } from '@/features/billing/model/billing.types';

const { requestPayment, selectedMethod } = vi.hoisted(() => ({
  requestPayment: vi.fn(),
  selectedMethod: vi.fn(),
}));

vi.mock('@tosspayments/tosspayments-sdk', () => ({
  loadTossPayments: vi.fn(async () => ({
    widgets: () => ({
      setAmount: async () => undefined,
      renderPaymentMethods: async () => ({
        getSelectedPaymentMethod: selectedMethod,
        destroy: async () => undefined,
      }),
      renderAgreement: async () => ({ destroy: async () => undefined }),
      requestPayment,
    }),
  })),
}));

const order = {
  id: '00000000-0000-4000-8000-000000000001',
  amount: 3000,
  currency: 'KRW',
  productName: '투표 개설 이용료',
} as BillingOrder;

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  requestPayment.mockReset();
  selectedMethod.mockReset();
});

describe('Toss checkout', () => {
  it('does not start unsupported asynchronous payment methods', async () => {
    vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'test_gck_example');
    selectedMethod.mockResolvedValue({ code: 'VIRTUAL_ACCOUNT' });
    render(<TossTestCheckoutContainer order={order} />);
    fireEvent.click(
      await screen.findByRole('button', { name: '카드 테스트 결제하기' }),
    );
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('카드 결제수단만'),
    );
    expect(requestPayment).not.toHaveBeenCalled();
  });

  it('sends the stored order ID to the checkout SDK for card payments', async () => {
    vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'test_gck_example');
    selectedMethod.mockResolvedValue({ code: 'CARD' });
    render(<TossTestCheckoutContainer order={order} />);
    fireEvent.click(
      await screen.findByRole('button', { name: '카드 테스트 결제하기' }),
    );
    await waitFor(() =>
      expect(requestPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: order.id,
          orderName: order.productName,
        }),
      ),
    );
  });

  it('rejects API-individual client keys for the payment widget', () => {
    vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'test_ck_example');
    render(<TossTestCheckoutContainer order={order} />);
    expect(screen.getByRole('alert')).toHaveProperty(
      'textContent',
      '테스트 결제 설정이 필요합니다.',
    );
    expect(
      screen.queryByRole('button', { name: '카드 테스트 결제하기' }),
    ).toBeNull();
  });
});

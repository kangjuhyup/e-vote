import { describe, expect, it, vi } from 'vitest';
import { createBillingApiClient } from '@/features/billing/api/billing-api';

describe('billing payment failure reporting', () => {
  it('records the returned failure code without treating an empty response as JSON', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createBillingApiClient({
      baseUrl: 'https://api.example.com', fetcher, mode: 'live',
    });

    await expect(client.reportPaymentFailure({
      billingOrderId: 'billing/order-1', failureCode: 'PAY_PROCESS_CANCELED', failureMessage: '결제가 취소되었습니다.',
    })).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.com/billing/vote-usage-orders/billing%2Forder-1/payment-failure',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ failureCode: 'PAY_PROCESS_CANCELED', failureMessage: '결제가 취소되었습니다.' }),
      }),
    );
  });
});

import { TossTestPaymentGatewayAdapter } from '../../../src/modules/billing/infrastructure/payment/toss-test-payment-gateway.adapter';

describe('Toss test payment gateway', () => {
  const payment = {
    paymentKey: 'payment-key',
    orderId: '00000000-0000-4000-8000-000000000001',
    totalAmount: 3000,
    currency: 'KRW',
    status: 'DONE',
  };

  it('sends Basic test credentials and stable confirm/cancel idempotency keys', async () => {
    const fetcher = jest.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        void input;
        void init;
        return Promise.resolve(new Response(JSON.stringify(payment)));
      },
    );
    const gateway = new TossTestPaymentGatewayAdapter(
      'test_gsk_example',
      fetcher,
    );
    await gateway.confirm({
      paymentKey: payment.paymentKey,
      orderId: payment.orderId,
      amount: 3000,
    });
    await gateway.cancel({
      paymentKey: payment.paymentKey,
      reason: '취소',
      idempotencyKey: 'event-id',
    });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'https://api.tosspayments.com/v1/payments/confirm',
      expect.any(Object),
    );
    const confirmOptions = fetcher.mock.calls[0][1];
    expect(confirmOptions?.body).toBe(
      JSON.stringify({
        paymentKey: payment.paymentKey,
        orderId: payment.orderId,
        amount: 3000,
      }),
    );
    const confirmHeaders = new Headers(confirmOptions?.headers);
    expect(confirmHeaders.get('Authorization')).toBe(
      `Basic ${Buffer.from('test_gsk_example:').toString('base64')}`,
    );
    expect(confirmHeaders.get('Idempotency-Key')).toBe(payment.orderId);
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'https://api.tosspayments.com/v1/payments/payment-key/cancel',
      expect.any(Object),
    );
    expect(
      new Headers(fetcher.mock.calls[1][1]?.headers).get('Idempotency-Key'),
    ).toBe('event-id');
  });

  it('rejects live and API-individual keys and hides provider failure bodies', async () => {
    expect(() => new TossTestPaymentGatewayAdapter('live_sk_example')).toThrow(
      'test payment-widget secret key',
    );
    expect(() => new TossTestPaymentGatewayAdapter('test_sk_example')).toThrow(
      'test payment-widget secret key',
    );
    const fetcher = jest.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        void input;
        void init;
        return Promise.resolve(
          new Response(JSON.stringify({ secret: 'do-not-expose' }), {
            status: 401,
          }),
        );
      },
    );
    const gateway = new TossTestPaymentGatewayAdapter(
      'test_gsk_example',
      fetcher,
    );
    await expect(gateway.get('payment-key')).rejects.toThrow(
      'Toss Payments request failed (401)',
    );
  });
});

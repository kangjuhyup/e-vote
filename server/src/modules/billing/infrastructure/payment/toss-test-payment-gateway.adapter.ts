import { Injectable } from '@nestjs/common';
import type {
  PaymentGatewayPort,
  ProviderPayment,
} from '../../application/port/gateway/payment-gateway.port';

const TOSS_API_ORIGIN = 'https://api.tosspayments.com';

@Injectable()
export class TossTestPaymentGatewayAdapter implements PaymentGatewayPort {
  constructor(
    private readonly secretKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!secretKey.startsWith('test_gsk_')) {
      throw new Error(
        'TOSS_SECRET_KEY must be a test payment-widget secret key',
      );
    }
  }

  confirm(input: {
    paymentKey: string;
    orderId: string;
    amount: number;
  }): Promise<ProviderPayment> {
    return this.request('/v1/payments/confirm', {
      method: 'POST',
      headers: { 'Idempotency-Key': input.orderId },
      body: JSON.stringify(input),
    });
  }

  get(paymentKey: string): Promise<ProviderPayment> {
    return this.request(`/v1/payments/${encodeURIComponent(paymentKey)}`);
  }

  cancel(input: {
    paymentKey: string;
    reason: string;
    idempotencyKey: string;
  }): Promise<ProviderPayment> {
    return this.request(
      `/v1/payments/${encodeURIComponent(input.paymentKey)}/cancel`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': input.idempotencyKey },
        body: JSON.stringify({ cancelReason: input.reason.slice(0, 200) }),
      },
    );
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<ProviderPayment> {
    const response = await this.fetcher(`${TOSS_API_ORIGIN}${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      // Provider responses may contain sensitive payment data. Never propagate them.
      throw new Error(`Toss Payments request failed (${response.status})`);
    }
    const payment: unknown = await response.json();
    if (!this.isPayment(payment)) {
      throw new Error('Toss Payments returned an invalid payment');
    }
    return payment;
  }

  private isPayment(value: unknown): value is ProviderPayment {
    if (typeof value !== 'object' || value === null) return false;
    const payment = value as Record<string, unknown>;
    return (
      typeof payment.paymentKey === 'string' &&
      typeof payment.orderId === 'string' &&
      Number.isSafeInteger(payment.totalAmount) &&
      typeof payment.currency === 'string' &&
      typeof payment.status === 'string' &&
      (payment.approvedAt === undefined ||
        typeof payment.approvedAt === 'string')
    );
  }
}

export function createTossTestPaymentGateway(
  mode: string | undefined,
  secretKey: string | undefined,
  nodeEnv: string | undefined,
): PaymentGatewayPort {
  if (mode === 'toss-test') {
    if (nodeEnv === 'production') {
      throw new Error('test billing payments are forbidden in production');
    }
    return new TossTestPaymentGatewayAdapter(secretKey ?? '');
  }
  const unavailable = (): Promise<ProviderPayment> =>
    Promise.reject(new Error('Toss Payments test integration is disabled'));
  return { confirm: unavailable, get: unavailable, cancel: unavailable };
}

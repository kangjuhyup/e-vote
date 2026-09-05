import type { MarkBillingOrderPaidHandler } from '../../../src/modules/billing/application/command/handler/mark-billing-order-paid.handler';
import type { MarkBillingOrderRefundedHandler } from '../../../src/modules/billing/application/command/handler/mark-billing-order-refunded.handler';
import { MockPaymentIntegrationEventPublisherAdapter } from '../../../src/modules/billing/infrastructure/payment/mock-payment-integration-event-publisher.adapter';
import { IntegrationEventEnvelope } from '../../../src/shared/application/messaging/integration-event-envelope';

describe('mock payment integration event publisher adapter', () => {
  const createdAt = new Date('2026-09-05T03:00:00.000Z');

  it('approves an issued order with a deterministic mock payment id', async () => {
    const paidHandler = { execute: jest.fn().mockResolvedValue(undefined) };
    const refundedHandler = { execute: jest.fn().mockResolvedValue(undefined) };
    const adapter = new MockPaymentIntegrationEventPublisherAdapter(
      paidHandler as unknown as MarkBillingOrderPaidHandler,
      refundedHandler as unknown as MarkBillingOrderRefundedHandler,
      () => 0.899_999,
    );

    await adapter.publish(
      envelope('billing.order-issued.v1', {
        billingOrderId: 'billing-order-1',
        amount: 6_000,
        currency: 'KRW',
      }),
    );

    expect(paidHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        billingOrderId: 'billing-order-1',
        paymentId: 'mock-payment-billing-order-1',
        amount: 6_000,
        currency: 'KRW',
        paidAt: createdAt,
      }),
    );
    expect(refundedHandler.execute).not.toHaveBeenCalled();
  });

  it('fails a payment attempt when the success roll is outside 90 percent', async () => {
    const paidHandler = { execute: jest.fn().mockResolvedValue(undefined) };
    const refundedHandler = { execute: jest.fn().mockResolvedValue(undefined) };
    const adapter = new MockPaymentIntegrationEventPublisherAdapter(
      paidHandler as unknown as MarkBillingOrderPaidHandler,
      refundedHandler as unknown as MarkBillingOrderRefundedHandler,
      () => 0.9,
    );

    await expect(
      adapter.publish(
        envelope('billing.order-issued.v1', {
          billingOrderId: 'billing-order-1',
          amount: 6_000,
          currency: 'KRW',
        }),
      ),
    ).rejects.toThrow('mock payment attempt failed');
    expect(paidHandler.execute).not.toHaveBeenCalled();
    expect(refundedHandler.execute).not.toHaveBeenCalled();
  });

  it('completes a requested refund and acknowledges notification events', async () => {
    const paidHandler = { execute: jest.fn().mockResolvedValue(undefined) };
    const refundedHandler = { execute: jest.fn().mockResolvedValue(undefined) };
    const adapter = new MockPaymentIntegrationEventPublisherAdapter(
      paidHandler as unknown as MarkBillingOrderPaidHandler,
      refundedHandler as unknown as MarkBillingOrderRefundedHandler,
      () => 0.999,
    );

    await adapter.publish(
      envelope('billing.refund-requested.v1', {
        billingOrderId: 'billing-order-1',
      }),
    );
    await adapter.publish(
      envelope('billing.order-paid.v1', {
        billingOrderId: 'billing-order-1',
      }),
    );

    expect(refundedHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        billingOrderId: 'billing-order-1',
        refundedAt: createdAt,
      }),
    );
    expect(paidHandler.execute).not.toHaveBeenCalled();
  });

  it('rejects malformed or unsupported integration events', async () => {
    const adapter = new MockPaymentIntegrationEventPublisherAdapter(
      { execute: jest.fn() } as unknown as MarkBillingOrderPaidHandler,
      { execute: jest.fn() } as unknown as MarkBillingOrderRefundedHandler,
    );

    await expect(
      adapter.publish(
        envelope('billing.order-issued.v1', {
          billingOrderId: 'billing-order-1',
          amount: '6000',
          currency: 'KRW',
        }),
      ),
    ).rejects.toThrow('mock payment event amount must be a positive integer');
    await expect(
      adapter.publish(envelope('billing.unknown.v1', {})),
    ).rejects.toThrow('unsupported mock payment event');
  });

  function envelope(
    eventType: string,
    payload: Readonly<Record<string, unknown>>,
  ): IntegrationEventEnvelope {
    return IntegrationEventEnvelope.of({
      id: '00000000-0000-4000-8000-000000000010',
      deduplicationKey: `vote-service:BillingOrder:billing-order-1:1:${eventType}:0`,
      source: 'vote-service',
      eventType,
      schemaVersion: 1,
      aggregateType: 'BillingOrder',
      aggregateId: 'billing-order-1',
      aggregateVersion: 1,
      eventPosition: 0,
      payload,
      occurredAt: createdAt,
      createdAt,
    });
  }
});

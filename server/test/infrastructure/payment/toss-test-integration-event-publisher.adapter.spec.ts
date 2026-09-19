import { TossTestIntegrationEventPublisherAdapter } from '../../../src/modules/billing/infrastructure/payment/toss-test-integration-event-publisher.adapter';
import type { PaymentGatewayPort } from '../../../src/modules/billing/application/port/gateway/payment-gateway.port';
import type { MarkBillingOrderRefundedHandler } from '../../../src/modules/billing/application/command/handler/mark-billing-order-refunded.handler';
import { IntegrationEventEnvelope } from '../../../src/shared/application/messaging/integration-event-envelope';

describe('Toss test refund outbox publisher', () => {
  const id = '00000000-0000-4000-8000-000000000010';
  const message = IntegrationEventEnvelope.of({
    id,
    deduplicationKey: 'refund:order-id',
    source: 'vote-service',
    eventType: 'billing.refund-requested.v1',
    schemaVersion: 1,
    aggregateType: 'BillingOrder',
    aggregateId: 'order-id',
    aggregateVersion: 3,
    eventPosition: 0,
    payload: { billingOrderId: 'order-id', paymentId: 'payment-key' },
    occurredAt: new Date(),
  });

  it('refunds with the persisted message ID and marks refunded only after provider confirmation', async () => {
    const gateway = {
      cancel: jest.fn().mockResolvedValue({
        paymentKey: 'payment-key',
        orderId: 'order-id',
        status: 'CANCELED',
      }),
    };
    const refunded = { execute: jest.fn().mockResolvedValue(undefined) };
    const publisher = new TossTestIntegrationEventPublisherAdapter(
      gateway as unknown as PaymentGatewayPort,
      refunded as unknown as MarkBillingOrderRefundedHandler,
    );
    await publisher.publish(message);
    expect(gateway.cancel).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentKey: 'payment-key',
        idempotencyKey: id,
      }),
    );
    expect(refunded.execute).toHaveBeenCalledWith(
      expect.objectContaining({ billingOrderId: 'order-id' }),
    );
  });

  it('retries a failed or mismatched provider refund without changing the order', async () => {
    const gateway = {
      cancel: jest.fn().mockResolvedValue({
        paymentKey: 'payment-key',
        orderId: 'other-order',
        status: 'CANCELED',
      }),
    };
    const refunded = { execute: jest.fn() };
    const publisher = new TossTestIntegrationEventPublisherAdapter(
      gateway as unknown as PaymentGatewayPort,
      refunded as unknown as MarkBillingOrderRefundedHandler,
    );
    await expect(publisher.publish(message)).rejects.toThrow('does not match');
    expect(refunded.execute).not.toHaveBeenCalled();
  });
});

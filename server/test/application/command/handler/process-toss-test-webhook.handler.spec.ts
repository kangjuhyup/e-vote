import { ProcessTossTestWebhookHandler } from '../../../../src/modules/billing/application/command/handler/process-toss-test-webhook.handler';
import type { PaymentGatewayPort } from '../../../../src/modules/billing/application/port/gateway/payment-gateway.port';
import type { BillingOrderRepositoryPort } from '../../../../src/modules/billing/application/port/persistence/command/billing-order-repository.port';
import type { MarkBillingOrderPaidHandler } from '../../../../src/modules/billing/application/command/handler/mark-billing-order-paid.handler';
import type { MarkBillingOrderRefundedHandler } from '../../../../src/modules/billing/application/command/handler/mark-billing-order-refunded.handler';

describe('Toss payment status webhook', () => {
  const payment = {
    paymentKey: 'payment-key',
    orderId: 'order-id',
    totalAmount: 3000,
    currency: 'KRW',
    status: 'DONE',
    approvedAt: '2026-09-19T01:00:00Z',
  };
  const order = {
    id: 'order-id',
    price: { amount: 3000, currency: 'KRW' },
    status: 'PENDING_PAYMENT',
  };
  const setup = () => {
    const gateway = { get: jest.fn().mockResolvedValue(payment) };
    const repository = { findById: jest.fn().mockResolvedValue(order) };
    const paid = { execute: jest.fn() };
    const refunded = { execute: jest.fn() };
    const handler = new ProcessTossTestWebhookHandler(
      gateway as unknown as PaymentGatewayPort,
      repository as unknown as BillingOrderRepositoryPort,
      paid as unknown as MarkBillingOrderPaidHandler,
      refunded as unknown as MarkBillingOrderRefundedHandler,
      true,
    );
    return { gateway, repository, paid, refunded, handler };
  };

  it('re-queries the provider and validates the stored amount before marking payment complete', async () => {
    const { gateway, paid, handler } = setup();
    await handler.execute({
      eventType: 'PAYMENT_STATUS_CHANGED',
      paymentKey: 'payment-key',
    });
    expect(gateway.get).toHaveBeenCalledWith('payment-key');
    expect(paid.execute).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: 'payment-key', amount: 3000 }),
    );
  });

  it('rejects forged or mismatched payment data without changing billing state', async () => {
    const { gateway, paid, handler } = setup();
    gateway.get.mockResolvedValue({ ...payment, totalAmount: 1 });
    await expect(
      handler.execute({
        eventType: 'PAYMENT_STATUS_CHANGED',
        paymentKey: 'payment-key',
      }),
    ).rejects.toThrow('does not match');
    expect(paid.execute).not.toHaveBeenCalled();
  });

  it('marks a requested refund complete only after a verified cancellation', async () => {
    const { gateway, repository, refunded, handler } = setup();
    gateway.get.mockResolvedValue({ ...payment, status: 'CANCELED' });
    repository.findById.mockResolvedValue({
      ...order,
      status: 'REFUND_PENDING',
      paymentId: 'payment-key',
    });
    await handler.execute({
      eventType: 'PAYMENT_STATUS_CHANGED',
      paymentKey: 'payment-key',
    });
    expect(refunded.execute).toHaveBeenCalledWith(
      expect.objectContaining({ billingOrderId: 'order-id' }),
    );
  });

  it('does not query the provider when test payment is disabled', async () => {
    const { gateway, repository, paid, refunded } = setup();
    const handler = new ProcessTossTestWebhookHandler(
      gateway as unknown as PaymentGatewayPort,
      repository as unknown as BillingOrderRepositoryPort,
      paid as unknown as MarkBillingOrderPaidHandler,
      refunded as unknown as MarkBillingOrderRefundedHandler,
      false,
    );
    await expect(
      handler.execute({
        eventType: 'PAYMENT_STATUS_CHANGED',
        paymentKey: 'payment-key',
      }),
    ).rejects.toThrow('test payment is not enabled');
    expect(gateway.get).not.toHaveBeenCalled();
  });
});

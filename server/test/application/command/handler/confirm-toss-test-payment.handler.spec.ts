import { ConfirmTossTestPaymentHandler } from '../../../../src/modules/billing/application/command/handler/confirm-toss-test-payment.handler';
import type { MarkBillingOrderPaidHandler } from '../../../../src/modules/billing/application/command/handler/mark-billing-order-paid.handler';
import type { PaymentGatewayPort } from '../../../../src/modules/billing/application/port/gateway/payment-gateway.port';
import type { GetBillingOrderHandler } from '../../../../src/modules/billing/application/query/handler/get-billing-order.handler';

describe('Toss test payment confirmation', () => {
  const input = {
    billingOrderId: 'order-id',
    userPrincipalId: 'user-id',
    paymentKey: 'payment-key',
    orderId: 'order-id',
    amount: 3000,
  };
  const order = {
    id: 'order-id',
    amount: 3000,
    currency: 'KRW',
    status: 'PENDING_PAYMENT',
  };

  it('checks ownership and stored amount before any external call', async () => {
    const getOrder = {
      execute: jest.fn().mockRejectedValue(new Error('access denied')),
    };
    const gateway = { confirm: jest.fn() };
    const handler = new ConfirmTossTestPaymentHandler(
      getOrder as unknown as GetBillingOrderHandler,
      { execute: jest.fn() } as unknown as MarkBillingOrderPaidHandler,
      gateway as unknown as PaymentGatewayPort,
      true,
    );
    await expect(handler.execute(input)).rejects.toThrow('access denied');
    expect(gateway.confirm).not.toHaveBeenCalled();

    getOrder.execute.mockResolvedValue(order);
    await expect(handler.execute({ ...input, amount: 1 })).rejects.toThrow(
      'amount does not match',
    );
    expect(gateway.confirm).not.toHaveBeenCalled();
  });

  it('verifies the provider result before marking the order paid', async () => {
    const getOrder = { execute: jest.fn().mockResolvedValue(order) };
    const gateway = {
      confirm: jest.fn().mockResolvedValue({
        paymentKey: 'payment-key',
        orderId: 'order-id',
        totalAmount: 3000,
        currency: 'KRW',
        status: 'DONE',
        approvedAt: '2026-09-19T01:00:00Z',
      }),
    };
    const markPaid = {
      execute: jest.fn().mockResolvedValue({ status: 'PAID' }),
    };
    const handler = new ConfirmTossTestPaymentHandler(
      getOrder as unknown as GetBillingOrderHandler,
      markPaid as unknown as MarkBillingOrderPaidHandler,
      gateway as unknown as PaymentGatewayPort,
      true,
    );
    await expect(handler.execute(input)).resolves.toEqual({ status: 'PAID' });
    expect(markPaid.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        billingOrderId: 'order-id',
        paymentId: 'payment-key',
        amount: 3000,
        currency: 'KRW',
        paidAt: new Date('2026-09-19T01:00:00Z'),
      }),
    );

    gateway.confirm.mockResolvedValue({
      paymentKey: 'payment-key',
      orderId: 'order-id',
      totalAmount: 1,
      currency: 'KRW',
      status: 'DONE',
    });
    await expect(handler.execute(input)).rejects.toThrow('does not match');
    expect(markPaid.execute).toHaveBeenCalledTimes(1);
  });
});

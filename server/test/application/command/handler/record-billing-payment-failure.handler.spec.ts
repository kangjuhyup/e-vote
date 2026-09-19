import { RecordBillingPaymentFailureHandler } from '../../../../src/modules/billing/application/command/handler/record-billing-payment-failure.handler';

describe('record billing payment failure', () => {
  const record = jest.fn().mockResolvedValue(undefined);
  const getOrder = jest.fn();
  const handler = new RecordBillingPaymentFailureHandler(
    { execute: getOrder } as never,
    { record },
  );

  beforeEach(() => {
    record.mockClear();
    getOrder.mockReset();
  });

  it('records a return code only for an order the caller can access and that is pending', async () => {
    getOrder.mockResolvedValue({ id: 'order-a', status: 'PENDING_PAYMENT' });
    await handler.execute({
      billingOrderId: 'order-a',
      userPrincipalId: 'user-a',
      failureCode: 'PAY_PROCESS_CANCELED',
      failureMessage: ' 결제가 취소되었습니다. ',
    });
    expect(getOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        billingOrderId: 'order-a',
        userPrincipalId: 'user-a',
      }),
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        billingOrderId: 'order-a',
        failureCode: 'PAY_PROCESS_CANCELED',
        failureMessage: '결제가 취소되었습니다.',
      }),
    );
  });

  it('does not record failures against settled orders or invalid codes', async () => {
    getOrder.mockResolvedValueOnce({ id: 'order-a', status: 'PAID' });
    await expect(
      handler.execute({
        billingOrderId: 'order-a',
        userPrincipalId: 'user-a',
        failureCode: 'PAY_PROCESS_CANCELED',
      }),
    ).rejects.toThrow();
    getOrder.mockResolvedValueOnce({
      id: 'order-a',
      status: 'PENDING_PAYMENT',
    });
    await expect(
      handler.execute({
        billingOrderId: 'order-a',
        userPrincipalId: 'user-a',
        failureCode: 'raw customer message',
      }),
    ).rejects.toThrow();
    expect(record).not.toHaveBeenCalled();
  });

  it('preserves the order ownership check', async () => {
    getOrder.mockRejectedValue(new Error('access denied'));
    await expect(
      handler.execute({
        billingOrderId: 'order-a',
        userPrincipalId: 'other',
        failureCode: 'PAY_PROCESS_CANCELED',
      }),
    ).rejects.toThrow('access denied');
    expect(record).not.toHaveBeenCalled();
  });
});

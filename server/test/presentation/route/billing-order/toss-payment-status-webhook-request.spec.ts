import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { TossPaymentStatusWebhookBody } from '../../../../src/modules/billing/presentation/billing-order/dto/toss-payment-status-webhook-request.dto';

describe('Toss payment-status webhook contract', () => {
  const event = {
    eventType: 'PAYMENT_STATUS_CHANGED',
    createdAt: '2026-09-19T01:00:00.000Z',
    data: { paymentKey: 'payment-key', orderId: 'order-id', status: 'DONE' },
  };

  it('accepts a provider Payment event without trusting its state fields', () => {
    expect(
      validateSync(plainToInstance(TossPaymentStatusWebhookBody, event)),
    ).toHaveLength(0);
  });

  it('rejects another event type or an absent payment key', () => {
    expect(
      validateSync(
        plainToInstance(TossPaymentStatusWebhookBody, {
          ...event,
          eventType: 'CANCEL_STATUS_CHANGED',
        }),
      ),
    ).not.toHaveLength(0);
    expect(
      validateSync(
        plainToInstance(TossPaymentStatusWebhookBody, {
          ...event,
          data: { orderId: 'order-id' },
        }),
      ),
    ).not.toHaveLength(0);
  });
});

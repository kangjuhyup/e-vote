import { Injectable } from '@nestjs/common';
import type { IntegrationEventEnvelope } from '../../../../shared/application/messaging/integration-event-envelope';
import type { IntegrationEventPublisherPort } from '../../../../shared/application/port/messaging/integration-event-publisher.port';
import type { PaymentGatewayPort } from '../../application/port/gateway/payment-gateway.port';
import { MarkBillingOrderRefundedHandler } from '../../application/command/handler/mark-billing-order-refunded.handler';
import { MarkBillingOrderRefundedCommand } from '../../application/command/dto/request/mark-billing-order-refunded.command';

const ACKNOWLEDGED_EVENTS = new Set([
  'billing.order-issued.v1',
  'billing.order-paid.v1',
  'billing.order-canceled.v1',
  'billing.order-refunded.v1',
]);

@Injectable()
export class TossTestIntegrationEventPublisherAdapter implements IntegrationEventPublisherPort {
  constructor(
    private readonly gateway: PaymentGatewayPort,
    private readonly markRefunded: MarkBillingOrderRefundedHandler,
  ) {}

  async publish(message: IntegrationEventEnvelope): Promise<void> {
    if (
      message.source !== 'vote-service' ||
      message.aggregateType !== 'BillingOrder' ||
      message.schemaVersion !== 1 ||
      message.payload.billingOrderId !== message.aggregateId
    ) {
      throw new Error('invalid billing integration event');
    }
    if (ACKNOWLEDGED_EVENTS.has(message.eventType)) return;
    if (message.eventType !== 'billing.refund-requested.v1') {
      throw new Error('unsupported billing integration event');
    }
    const paymentKey = message.payload.paymentId;
    if (typeof paymentKey !== 'string' || paymentKey.length === 0) {
      throw new Error('refund event has no payment key');
    }
    const payment = await this.gateway.cancel({
      paymentKey,
      reason: '투표 이용료 결제 취소',
      idempotencyKey: message.id,
    });
    if (
      payment.paymentKey !== paymentKey ||
      payment.orderId !== message.aggregateId ||
      payment.status !== 'CANCELED'
    ) {
      throw new Error('provider refund does not match billing order');
    }
    await this.markRefunded.execute(
      MarkBillingOrderRefundedCommand.of({
        billingOrderId: message.aggregateId,
        refundedAt: new Date(),
      }),
    );
  }
}

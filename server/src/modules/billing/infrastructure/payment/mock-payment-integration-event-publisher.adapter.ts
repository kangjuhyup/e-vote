import { Injectable } from '@nestjs/common';
import { MarkBillingOrderPaidCommand } from '../../application/command/dto/request/mark-billing-order-paid.command';
import { MarkBillingOrderRefundedCommand } from '../../application/command/dto/request/mark-billing-order-refunded.command';
import { MarkBillingOrderPaidHandler } from '../../application/command/handler/mark-billing-order-paid.handler';
import { MarkBillingOrderRefundedHandler } from '../../application/command/handler/mark-billing-order-refunded.handler';
import type { IntegrationEventEnvelope } from '../../../../shared/application/messaging/integration-event-envelope';
import type { IntegrationEventPublisherPort } from '../../../../shared/application/port/messaging/integration-event-publisher.port';
import type { MockPaymentRandomSource } from './payment-integration.config';

const PAYMENT_SUCCESS_RATE = 0.9;

const ACKNOWLEDGED_NOTIFICATION_EVENTS = new Set([
  'billing.order-paid.v1',
  'billing.order-canceled.v1',
  'billing.order-refunded.v1',
]);

@Injectable()
export class MockPaymentIntegrationEventPublisherAdapter implements IntegrationEventPublisherPort {
  constructor(
    private readonly markPaidHandler: MarkBillingOrderPaidHandler,
    private readonly markRefundedHandler: MarkBillingOrderRefundedHandler,
    private readonly random: MockPaymentRandomSource = Math.random,
  ) {}

  async publish(message: IntegrationEventEnvelope): Promise<void> {
    this.assertEnvelope(message);

    if (message.eventType === 'billing.order-issued.v1') {
      const billingOrderId = this.billingOrderId(message);
      const amount = this.positiveInteger(message.payload.amount, 'amount');
      const currency = this.nonEmptyString(
        message.payload.currency,
        'currency',
      );
      if (this.random() >= PAYMENT_SUCCESS_RATE) {
        throw new Error('mock payment attempt failed');
      }
      await this.markPaidHandler.execute(
        MarkBillingOrderPaidCommand.of({
          billingOrderId,
          paymentId: `mock-payment-${billingOrderId}`,
          amount,
          currency,
          paidAt: message.createdAt,
        }),
      );
      return;
    }

    if (message.eventType === 'billing.refund-requested.v1') {
      await this.markRefundedHandler.execute(
        MarkBillingOrderRefundedCommand.of({
          billingOrderId: this.billingOrderId(message),
          refundedAt: message.createdAt,
        }),
      );
      return;
    }

    if (ACKNOWLEDGED_NOTIFICATION_EVENTS.has(message.eventType)) {
      this.billingOrderId(message);
      return;
    }
    throw new Error(`unsupported mock payment event: ${message.eventType}`);
  }

  private assertEnvelope(message: IntegrationEventEnvelope): void {
    if (
      message.source !== 'vote-service' ||
      message.aggregateType !== 'BillingOrder' ||
      message.schemaVersion !== 1
    ) {
      throw new Error('unsupported mock payment event envelope');
    }
  }

  private billingOrderId(message: IntegrationEventEnvelope): string {
    const billingOrderId = this.nonEmptyString(
      message.payload.billingOrderId,
      'billingOrderId',
    );
    if (billingOrderId !== message.aggregateId) {
      throw new Error(
        'mock payment event billingOrderId does not match aggregate',
      );
    }
    return billingOrderId;
  }

  private positiveInteger(value: unknown, field: string): number {
    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new Error(`mock payment event ${field} must be a positive integer`);
    }
    return Number(value);
  }

  private nonEmptyString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`mock payment event ${field} must be a non-empty string`);
    }
    return value.trim();
  }
}

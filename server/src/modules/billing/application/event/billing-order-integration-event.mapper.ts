import { randomUUID } from 'node:crypto';
import { IntegrationEventEnvelope } from '../../../../shared/application/messaging/integration-event-envelope';
import type { BillingOrderAggregate } from '../../domain/billing-order.aggregate';
import type { BillingOrderDomainEvent } from '../../domain/billing-order.events';

const SOURCE = 'vote-service';
const AGGREGATE_TYPE = 'BillingOrder';
const SCHEMA_VERSION = 1;

export class BillingOrderIntegrationEventMapper {
  static toEnvelope(
    order: BillingOrderAggregate,
    event: BillingOrderDomainEvent,
    eventPosition: number,
  ): IntegrationEventEnvelope {
    return IntegrationEventEnvelope.of({
      id: randomUUID(),
      deduplicationKey: [
        SOURCE,
        AGGREGATE_TYPE,
        event.aggregateId,
        event.aggregateVersion,
        event.type,
        eventPosition,
      ].join(':'),
      source: SOURCE,
      eventType: this.toIntegrationEventType(event),
      schemaVersion: SCHEMA_VERSION,
      aggregateType: AGGREGATE_TYPE,
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
      eventPosition,
      payload: this.toPayload(order, event),
      occurredAt: event.occurredAt,
    });
  }

  private static toIntegrationEventType(
    event: BillingOrderDomainEvent,
  ): string {
    switch (event.type) {
      case 'BillingOrderIssued':
        return 'billing.order-issued.v1';
      case 'BillingOrderPaid':
        return 'billing.order-paid.v1';
      case 'BillingOrderCanceled':
        return 'billing.order-canceled.v1';
      case 'BillingOrderRefundRequested':
        return 'billing.refund-requested.v1';
      case 'BillingOrderRefunded':
        return 'billing.order-refunded.v1';
    }
  }

  private static toPayload(
    order: BillingOrderAggregate,
    event: BillingOrderDomainEvent,
  ): Readonly<Record<string, unknown>> {
    const common = {
      billingOrderId: order.id,
      voteId: order.voteId,
    } as const;

    switch (event.type) {
      case 'BillingOrderIssued':
        return {
          ...common,
          commissionId: order.commissionId,
          productCode: order.productCode,
          amount: order.price.amount,
          currency: order.price.currency,
          issuedAt: event.occurredAt.toISOString(),
        };
      case 'BillingOrderPaid':
        return {
          ...common,
          paymentId: order.paymentId,
          amount: order.price.amount,
          currency: order.price.currency,
          paidAt: event.occurredAt.toISOString(),
        };
      case 'BillingOrderCanceled':
        return {
          ...common,
          canceledAt: event.occurredAt.toISOString(),
        };
      case 'BillingOrderRefundRequested':
        return {
          ...common,
          paymentId: order.paymentId,
          amount: order.price.amount,
          currency: order.price.currency,
          requestedAt: event.occurredAt.toISOString(),
        };
      case 'BillingOrderRefunded':
        return {
          ...common,
          paymentId: order.paymentId,
          refundedAt: event.occurredAt.toISOString(),
        };
    }
  }
}

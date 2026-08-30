import {
  DomainEvent,
  type DomainEventProps,
} from '../../../shared/domain/domain-event';

export class BillingOrderIssued extends DomainEvent {
  readonly type = 'BillingOrderIssued' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): BillingOrderIssued {
    return new BillingOrderIssued(params.aggregateId, params.occurredAt);
  }
}

export class BillingOrderPaid extends DomainEvent {
  readonly type = 'BillingOrderPaid' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): BillingOrderPaid {
    return new BillingOrderPaid(params.aggregateId, params.occurredAt);
  }
}

export class BillingOrderRefunded extends DomainEvent {
  readonly type = 'BillingOrderRefunded' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): BillingOrderRefunded {
    return new BillingOrderRefunded(params.aggregateId, params.occurredAt);
  }
}

export type BillingOrderDomainEvent =
  BillingOrderIssued | BillingOrderPaid | BillingOrderRefunded;

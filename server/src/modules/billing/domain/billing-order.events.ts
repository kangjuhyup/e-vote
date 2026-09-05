import {
  DomainEvent,
  type DomainEventProps,
} from '../../../shared/domain/domain-event';

export type BillingOrderEventProps = DomainEventProps & {
  readonly aggregateVersion: number;
};

abstract class BillingOrderEvent extends DomainEvent {
  protected constructor(
    aggregateId: string,
    occurredAt: Date,
    readonly aggregateVersion: number,
  ) {
    super(aggregateId, occurredAt);
  }
}

export class BillingOrderIssued extends BillingOrderEvent {
  readonly type = 'BillingOrderIssued' as const;

  private constructor(params: BillingOrderEventProps) {
    super(params.aggregateId, params.occurredAt, params.aggregateVersion);
  }

  static of(params: BillingOrderEventProps): BillingOrderIssued {
    return new BillingOrderIssued(params);
  }
}

export class BillingOrderPaid extends BillingOrderEvent {
  readonly type = 'BillingOrderPaid' as const;

  private constructor(params: BillingOrderEventProps) {
    super(params.aggregateId, params.occurredAt, params.aggregateVersion);
  }

  static of(params: BillingOrderEventProps): BillingOrderPaid {
    return new BillingOrderPaid(params);
  }
}

export class BillingOrderCanceled extends BillingOrderEvent {
  readonly type = 'BillingOrderCanceled' as const;

  private constructor(params: BillingOrderEventProps) {
    super(params.aggregateId, params.occurredAt, params.aggregateVersion);
  }

  static of(params: BillingOrderEventProps): BillingOrderCanceled {
    return new BillingOrderCanceled(params);
  }
}

export class BillingOrderRefundRequested extends BillingOrderEvent {
  readonly type = 'BillingOrderRefundRequested' as const;

  private constructor(params: BillingOrderEventProps) {
    super(params.aggregateId, params.occurredAt, params.aggregateVersion);
  }

  static of(params: BillingOrderEventProps): BillingOrderRefundRequested {
    return new BillingOrderRefundRequested(params);
  }
}

export class BillingOrderRefunded extends BillingOrderEvent {
  readonly type = 'BillingOrderRefunded' as const;

  private constructor(params: BillingOrderEventProps) {
    super(params.aggregateId, params.occurredAt, params.aggregateVersion);
  }

  static of(params: BillingOrderEventProps): BillingOrderRefunded {
    return new BillingOrderRefunded(params);
  }
}

export type BillingOrderDomainEvent =
  | BillingOrderIssued
  | BillingOrderPaid
  | BillingOrderCanceled
  | BillingOrderRefundRequested
  | BillingOrderRefunded;

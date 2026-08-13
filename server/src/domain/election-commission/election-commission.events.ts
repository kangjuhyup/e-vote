import { DomainEvent, DomainEventProps } from '../shared/domain-event';

export class ElectionCommissionCreated extends DomainEvent {
  readonly type = 'ElectionCommissionCreated' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): ElectionCommissionCreated {
    return new ElectionCommissionCreated(params.aggregateId, params.occurredAt);
  }
}

export class ElectionCommissionSuspended extends DomainEvent {
  readonly type = 'ElectionCommissionSuspended' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): ElectionCommissionSuspended {
    return new ElectionCommissionSuspended(
      params.aggregateId,
      params.occurredAt,
    );
  }
}

export class ElectionCommissionReactivated extends DomainEvent {
  readonly type = 'ElectionCommissionReactivated' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): ElectionCommissionReactivated {
    return new ElectionCommissionReactivated(
      params.aggregateId,
      params.occurredAt,
    );
  }
}

export class ElectionCommissionMemberRegistered extends DomainEvent {
  readonly type = 'ElectionCommissionMemberRegistered' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): ElectionCommissionMemberRegistered {
    return new ElectionCommissionMemberRegistered(
      params.aggregateId,
      params.occurredAt,
    );
  }
}

export class ElectionCommissionMemberDeactivated extends DomainEvent {
  readonly type = 'ElectionCommissionMemberDeactivated' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): ElectionCommissionMemberDeactivated {
    return new ElectionCommissionMemberDeactivated(
      params.aggregateId,
      params.occurredAt,
    );
  }
}

export type ElectionCommissionDomainEvent =
  | ElectionCommissionCreated
  | ElectionCommissionSuspended
  | ElectionCommissionReactivated
  | ElectionCommissionMemberRegistered
  | ElectionCommissionMemberDeactivated;

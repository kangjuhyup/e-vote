import {
  DomainEvent,
  DomainEventProps,
} from '../../../../shared/domain/domain-event';

export class VoteOpened extends DomainEvent {
  readonly type = 'VoteOpened' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): VoteOpened {
    return new VoteOpened(params.aggregateId, params.occurredAt);
  }
}

export class VoteClosed extends DomainEvent {
  readonly type = 'VoteClosed' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): VoteClosed {
    return new VoteClosed(params.aggregateId, params.occurredAt);
  }
}

export class VoteCanceled extends DomainEvent {
  readonly type = 'VoteCanceled' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): VoteCanceled {
    return new VoteCanceled(params.aggregateId, params.occurredAt);
  }
}

export class VoteDetailOpened extends DomainEvent {
  readonly type = 'VoteDetailOpened' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): VoteDetailOpened {
    return new VoteDetailOpened(params.aggregateId, params.occurredAt);
  }
}

export class VoteDetailClosed extends DomainEvent {
  readonly type = 'VoteDetailClosed' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): VoteDetailClosed {
    return new VoteDetailClosed(params.aggregateId, params.occurredAt);
  }
}

export type VoteDomainEvent =
  VoteOpened | VoteClosed | VoteCanceled | VoteDetailOpened | VoteDetailClosed;

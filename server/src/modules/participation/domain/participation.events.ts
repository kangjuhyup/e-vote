import {
  DomainEvent,
  DomainEventProps,
} from '../../../shared/domain/domain-event';

export class ParticipationCast extends DomainEvent {
  readonly type = 'ParticipationCast' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): ParticipationCast {
    return new ParticipationCast(params.aggregateId, params.occurredAt);
  }
}

export class ParticipationCanceled extends DomainEvent {
  readonly type = 'ParticipationCanceled' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): ParticipationCanceled {
    return new ParticipationCanceled(params.aggregateId, params.occurredAt);
  }
}

export type ParticipationDomainEvent =
  ParticipationCast | ParticipationCanceled;

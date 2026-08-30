import {
  DomainEvent,
  DomainEventProps,
} from '../../../shared/domain/domain-event';

export class FieldVotingSessionScheduled extends DomainEvent {
  readonly type = 'FieldVotingSessionScheduled' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): FieldVotingSessionScheduled {
    return new FieldVotingSessionScheduled(
      params.aggregateId,
      params.occurredAt,
    );
  }
}

export class FieldVotingSessionOpened extends DomainEvent {
  readonly type = 'FieldVotingSessionOpened' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): FieldVotingSessionOpened {
    return new FieldVotingSessionOpened(params.aggregateId, params.occurredAt);
  }
}

export class FieldVotingSessionClosed extends DomainEvent {
  readonly type = 'FieldVotingSessionClosed' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): FieldVotingSessionClosed {
    return new FieldVotingSessionClosed(params.aggregateId, params.occurredAt);
  }
}

export class FieldVotingSessionCanceled extends DomainEvent {
  readonly type = 'FieldVotingSessionCanceled' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): FieldVotingSessionCanceled {
    return new FieldVotingSessionCanceled(
      params.aggregateId,
      params.occurredAt,
    );
  }
}

export class FieldParticipationEvidenceRecorded extends DomainEvent {
  readonly type = 'FieldParticipationEvidenceRecorded' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): FieldParticipationEvidenceRecorded {
    return new FieldParticipationEvidenceRecorded(
      params.aggregateId,
      params.occurredAt,
    );
  }
}

export type FieldVotingDomainEvent =
  | FieldVotingSessionScheduled
  | FieldVotingSessionOpened
  | FieldVotingSessionClosed
  | FieldVotingSessionCanceled
  | FieldParticipationEvidenceRecorded;

import { IntegrationEventEnvelope } from './integration-event-envelope';

export class ClaimedOutboxMessage {
  private constructor(
    readonly envelope: IntegrationEventEnvelope,
    readonly lockToken: string,
    readonly publishAttemptCount: number,
  ) {}

  static of(params: {
    readonly envelope: IntegrationEventEnvelope;
    readonly lockToken: string;
    readonly publishAttemptCount: number;
  }): ClaimedOutboxMessage {
    return new ClaimedOutboxMessage(
      params.envelope,
      params.lockToken,
      params.publishAttemptCount,
    );
  }
}

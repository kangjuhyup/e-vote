export type IntegrationEventPayload = Readonly<Record<string, unknown>>;

export class IntegrationEventEnvelope {
  private constructor(
    readonly id: string,
    readonly deduplicationKey: string,
    readonly source: string,
    readonly eventType: string,
    readonly schemaVersion: number,
    readonly aggregateType: string,
    readonly aggregateId: string,
    readonly aggregateVersion: number,
    readonly eventPosition: number,
    readonly payload: IntegrationEventPayload,
    readonly occurredAt: Date,
    readonly createdAt: Date,
    readonly correlationId: string | undefined,
    readonly causationId: string | undefined,
  ) {}

  static of(params: {
    readonly id: string;
    readonly deduplicationKey: string;
    readonly source: string;
    readonly eventType: string;
    readonly schemaVersion: number;
    readonly aggregateType: string;
    readonly aggregateId: string;
    readonly aggregateVersion: number;
    readonly eventPosition: number;
    readonly payload: IntegrationEventPayload;
    readonly occurredAt: Date;
    readonly createdAt?: Date;
    readonly correlationId?: string;
    readonly causationId?: string;
  }): IntegrationEventEnvelope {
    return new IntegrationEventEnvelope(
      params.id,
      params.deduplicationKey,
      params.source,
      params.eventType,
      params.schemaVersion,
      params.aggregateType,
      params.aggregateId,
      params.aggregateVersion,
      params.eventPosition,
      Object.freeze({ ...params.payload }),
      new Date(params.occurredAt),
      new Date(params.createdAt ?? Date.now()),
      params.correlationId,
      params.causationId,
    );
  }
}

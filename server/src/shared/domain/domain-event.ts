export type DomainEventProps = {
  readonly aggregateId: string;
  readonly occurredAt: Date;
};

export abstract class DomainEvent {
  abstract readonly type: string;

  protected constructor(
    readonly aggregateId: string,
    readonly occurredAt: Date,
  ) {}
}

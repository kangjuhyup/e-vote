import { DomainError } from '../shared/domain-error';
import { createId } from '../shared/id';
import {
  ElectionCommissionCreated,
  ElectionCommissionDomainEvent,
  ElectionCommissionReactivated,
  ElectionCommissionSuspended,
} from './election-commission.events';
import { ElectionCommissionStatus } from './type/election-commission-status.type';

interface CreateElectionCommissionParams {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly status?: ElectionCommissionStatus;
}

type ReconstituteElectionCommissionParams =
  Required<CreateElectionCommissionParams>;

export class ElectionCommissionAggregate {
  private readonly events: ElectionCommissionDomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly name: string,
    public status: ElectionCommissionStatus,
    readonly createdAt: Date,
  ) {}

  static create(
    params: CreateElectionCommissionParams,
  ): ElectionCommissionAggregate {
    const commission = ElectionCommissionAggregate.build(params);

    commission.events.push(
      ElectionCommissionCreated.of({
        aggregateId: commission.id,
        occurredAt: params.createdAt,
      }),
    );

    return commission;
  }

  static reconstitute(
    params: ReconstituteElectionCommissionParams,
  ): ElectionCommissionAggregate {
    return ElectionCommissionAggregate.build(params);
  }

  canRunVote(): boolean {
    return this.status === ElectionCommissionStatus.Active;
  }

  suspend(suspendedAt: Date): void {
    if (this.status === ElectionCommissionStatus.Suspended) {
      throw new DomainError('election commission is already suspended');
    }

    this.status = ElectionCommissionStatus.Suspended;
    this.events.push(
      ElectionCommissionSuspended.of({
        aggregateId: this.id,
        occurredAt: suspendedAt,
      }),
    );
  }

  reactivate(reactivatedAt: Date): void {
    if (this.status === ElectionCommissionStatus.Active) {
      throw new DomainError('election commission is already active');
    }

    this.status = ElectionCommissionStatus.Active;
    this.events.push(
      ElectionCommissionReactivated.of({
        aggregateId: this.id,
        occurredAt: reactivatedAt,
      }),
    );
  }

  pullEvents(): ElectionCommissionDomainEvent[] {
    const pulledEvents = [...this.events];
    this.events.length = 0;
    return pulledEvents;
  }

  private static build(
    params: CreateElectionCommissionParams,
  ): ElectionCommissionAggregate {
    const id = createId(params.id);
    const name = params.name.trim();

    if (name.length === 0) {
      throw new DomainError('election commission name must not be empty');
    }

    return new ElectionCommissionAggregate(
      id,
      name,
      params.status ?? ElectionCommissionStatus.Active,
      params.createdAt,
    );
  }
}

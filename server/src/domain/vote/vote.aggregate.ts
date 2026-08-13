import { DomainError } from '../shared/domain-error';
import { createId } from '../shared/id';
import {
  VoteCanceled,
  VoteClosed,
  VoteDomainEvent,
  VoteOpened,
} from './vote.events';
import { IdentityVerificationPolicy } from './vo/identity-verification-policy.vo';
import { VotePolicy } from './vo/vote-policy.vo';
import { VoteStatus } from './type/vote-status.type';

interface CreateVoteParams {
  readonly id: string;
  readonly title: string;
  readonly defaultPolicy: VotePolicy;
  readonly identityVerificationPolicy: IdentityVerificationPolicy;
  readonly status?: VoteStatus;
}

type ReconstituteVoteParams = Required<CreateVoteParams>;

export class VoteAggregate {
  private readonly events: VoteDomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly title: string,
    readonly defaultPolicy: VotePolicy,
    readonly identityVerificationPolicy: IdentityVerificationPolicy,
    public status: VoteStatus,
  ) {}

  static create(params: CreateVoteParams): VoteAggregate {
    const id = createId(params.id);
    const title = params.title.trim();

    if (title.length === 0) {
      throw new DomainError('vote title must not be empty');
    }

    VoteAggregate.assertIdentityVerificationPolicy(
      params.identityVerificationPolicy,
    );

    return new VoteAggregate(
      id,
      title,
      params.defaultPolicy,
      params.identityVerificationPolicy,
      params.status ?? VoteStatus.Draft,
    );
  }

  static reconstitute(params: ReconstituteVoteParams): VoteAggregate {
    return VoteAggregate.create(params);
  }

  open(openedAt: Date): void {
    if (this.status !== VoteStatus.Draft) {
      throw new DomainError('only draft votes can be opened');
    }

    this.status = VoteStatus.Open;
    this.events.push(
      VoteOpened.of({ aggregateId: this.id, occurredAt: openedAt }),
    );
  }

  close(closedAt: Date): void {
    if (this.status !== VoteStatus.Open) {
      throw new DomainError('only open votes can be closed');
    }

    this.status = VoteStatus.Closed;
    this.events.push(
      VoteClosed.of({ aggregateId: this.id, occurredAt: closedAt }),
    );
  }

  cancel(canceledAt: Date): void {
    if (this.status !== VoteStatus.Draft && this.status !== VoteStatus.Open) {
      throw new DomainError('only draft or open votes can be canceled');
    }

    this.status = VoteStatus.Canceled;
    this.events.push(
      VoteCanceled.of({ aggregateId: this.id, occurredAt: canceledAt }),
    );
  }

  pullEvents(): VoteDomainEvent[] {
    const pulledEvents = [...this.events];
    this.events.length = 0;
    return pulledEvents;
  }

  private static assertIdentityVerificationPolicy(
    policy: IdentityVerificationPolicy,
  ): void {
    if (policy.required && (!policy.provider || !policy.method)) {
      throw new DomainError(
        'identity verification provider and method are required',
      );
    }

    if (!policy.required && (policy.provider || policy.method)) {
      throw new DomainError(
        'identity verification provider and method must be absent',
      );
    }
  }
}

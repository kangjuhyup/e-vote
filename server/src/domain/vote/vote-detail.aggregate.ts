import { DomainError } from '../shared/domain-error';
import { createId } from '../shared/id';
import {
  VoteDetailClosed,
  VoteDetailOpened,
  VoteDomainEvent,
} from './vote.events';
import { VotePolicy, VotePolicyOverrides } from './vo/vote-policy.vo';
import { VoteDetailType } from './type/vote-detail.type';
import { VoteDetailStatus } from './type/vote-status.type';

interface CreateVoteDetailParams {
  readonly id: string;
  readonly voteId: string;
  readonly title: string;
  readonly type: VoteDetailType;
  readonly overrides?: VotePolicyOverrides;
  readonly sortOrder: number;
  readonly status?: VoteDetailStatus;
}

type ReconstituteVoteDetailParams = Required<CreateVoteDetailParams>;

export class VoteDetailAggregate {
  private readonly events: VoteDomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly voteId: string,
    public title: string,
    public type: VoteDetailType,
    public overrides: VotePolicyOverrides,
    public sortOrder: number,
    public status: VoteDetailStatus,
  ) {}

  static create(params: CreateVoteDetailParams): VoteDetailAggregate {
    const id = createId(params.id);
    const voteId = createId(params.voteId);
    const title = params.title.trim();

    if (title.length === 0) {
      throw new DomainError('vote detail title must not be empty');
    }

    if (!Number.isInteger(params.sortOrder) || params.sortOrder < 0) {
      throw new DomainError('sortOrder must be a non-negative integer');
    }

    return new VoteDetailAggregate(
      id,
      voteId,
      title,
      params.type,
      params.overrides ?? {},
      params.sortOrder,
      params.status ?? VoteDetailStatus.Draft,
    );
  }

  static reconstitute(
    params: ReconstituteVoteDetailParams,
  ): VoteDetailAggregate {
    return VoteDetailAggregate.create(params);
  }

  getEffectivePolicy(parentPolicy: VotePolicy): VotePolicy {
    return parentPolicy.overrideWith(this.overrides);
  }

  updateSettings(params: {
    readonly title: string;
    readonly type: VoteDetailType;
    readonly overrides?: VotePolicyOverrides;
    readonly sortOrder: number;
  }): void {
    if (this.status !== VoteDetailStatus.Draft) {
      throw new DomainError('only draft vote details can be updated');
    }

    const title = params.title.trim();
    if (title.length === 0) {
      throw new DomainError('vote detail title must not be empty');
    }
    if (!Number.isInteger(params.sortOrder) || params.sortOrder < 0) {
      throw new DomainError('sortOrder must be a non-negative integer');
    }

    this.title = title;
    this.type = params.type;
    this.overrides = params.overrides ?? {};
    this.sortOrder = params.sortOrder;
  }

  open(openedAt: Date): void {
    if (this.status !== VoteDetailStatus.Draft) {
      throw new DomainError('only draft vote details can be opened');
    }

    this.status = VoteDetailStatus.Open;
    this.events.push(
      VoteDetailOpened.of({ aggregateId: this.id, occurredAt: openedAt }),
    );
  }

  close(closedAt: Date): void {
    if (this.status !== VoteDetailStatus.Open) {
      throw new DomainError('only open vote details can be closed');
    }

    this.status = VoteDetailStatus.Closed;
    this.events.push(
      VoteDetailClosed.of({ aggregateId: this.id, occurredAt: closedAt }),
    );
  }

  cancel(): void {
    if (this.status !== VoteDetailStatus.Draft) {
      throw new DomainError('only draft vote details can be canceled');
    }

    this.status = VoteDetailStatus.Canceled;
  }

  pullEvents(): VoteDomainEvent[] {
    const pulledEvents = [...this.events];
    this.events.length = 0;
    return pulledEvents;
  }
}

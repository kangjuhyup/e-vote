import { DomainError } from '../../../../shared/domain/domain-error';
import { createId } from '../../../../shared/domain/id';
import {
  VoteCanceled,
  VoteClosed,
  VoteDomainEvent,
  VoteOpened,
} from './vote.events';
import { IdentityVerificationPolicy } from '../../../../shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../shared/domain/voting/vo/vote-policy.vo';
import { VoteStatus } from '../../../../shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../shared/domain/voting/type/voting-channel.type';

interface CreateVoteParams {
  readonly id: string;
  readonly commissionId: string;
  readonly title: string;
  readonly votingChannels: readonly VotingChannel[];
  readonly defaultPolicy: VotePolicy;
  readonly identityVerificationPolicy: IdentityVerificationPolicy;
  readonly electoralRollSnapshotId?: string;
  readonly billingOrderId?: string;
  readonly finalizedAt?: Date;
  readonly status?: VoteStatus;
}

type ReconstituteVoteParams = Omit<CreateVoteParams, 'status'> & {
  readonly status: VoteStatus;
};

export class VoteAggregate {
  private readonly events: VoteDomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly commissionId: string,
    public title: string,
    public votingChannels: readonly VotingChannel[],
    public defaultPolicy: VotePolicy,
    public identityVerificationPolicy: IdentityVerificationPolicy,
    public electoralRollSnapshotId: string | undefined,
    public billingOrderId: string | undefined,
    public finalizedAt: Date | undefined,
    public status: VoteStatus,
  ) {}

  static create(params: CreateVoteParams): VoteAggregate {
    const id = createId(params.id);
    const commissionId = createId(params.commissionId);
    const title = params.title.trim();

    if (title.length === 0) {
      throw new DomainError('vote title must not be empty');
    }

    VoteAggregate.assertVotingChannels(params.votingChannels);
    VoteAggregate.assertIdentityVerificationPolicy(
      params.identityVerificationPolicy,
    );
    if (!!params.billingOrderId !== !!params.finalizedAt) {
      throw new DomainError(
        'vote billing order and finalization timestamp must be set together',
      );
    }

    return new VoteAggregate(
      id,
      commissionId,
      title,
      [...params.votingChannels],
      params.defaultPolicy,
      params.identityVerificationPolicy,
      params.electoralRollSnapshotId
        ? createId(params.electoralRollSnapshotId)
        : undefined,
      params.billingOrderId ? createId(params.billingOrderId) : undefined,
      params.finalizedAt,
      params.status ?? VoteStatus.Draft,
    );
  }

  static reconstitute(params: ReconstituteVoteParams): VoteAggregate {
    return VoteAggregate.create(params);
  }

  allowsVotingChannel(channel: VotingChannel): boolean {
    return this.votingChannels.includes(channel);
  }

  updateSettings(params: {
    readonly title: string;
    readonly votingChannels: readonly VotingChannel[];
    readonly defaultPolicy: VotePolicy;
    readonly identityVerificationPolicy: IdentityVerificationPolicy;
  }): void {
    this.assertSetupMutable('updated');

    const title = params.title.trim();
    if (title.length === 0) {
      throw new DomainError('vote title must not be empty');
    }
    VoteAggregate.assertVotingChannels(params.votingChannels);
    VoteAggregate.assertIdentityVerificationPolicy(
      params.identityVerificationPolicy,
    );

    this.title = title;
    this.votingChannels = [...params.votingChannels];
    this.defaultPolicy = params.defaultPolicy;
    this.identityVerificationPolicy = params.identityVerificationPolicy;
  }

  attachElectoralRollSnapshot(snapshotId: string): void {
    this.assertSetupMutable('attach an electoral roll snapshot');

    this.electoralRollSnapshotId = createId(snapshotId);
  }

  open(openedAt: Date): void {
    if (this.status !== VoteStatus.Draft) {
      throw new DomainError('only draft votes can be opened');
    }
    if (!this.finalizedAt || !this.billingOrderId) {
      throw new DomainError('only finalized votes can be opened');
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
    if (this.finalizedAt || this.billingOrderId) {
      throw new DomainError(
        'finalized votes must be canceled through the billing order',
      );
    }
    if (this.status !== VoteStatus.Draft) {
      throw new DomainError('only draft votes can be canceled');
    }

    this.status = VoteStatus.Canceled;
    this.events.push(
      VoteCanceled.of({ aggregateId: this.id, occurredAt: canceledAt }),
    );
  }

  finalizeForBilling(params: {
    billingOrderId: string;
    finalizedAt: Date;
  }): void {
    const billingOrderId = createId(params.billingOrderId);
    if (this.billingOrderId || this.finalizedAt) {
      if (
        this.billingOrderId !== billingOrderId ||
        this.finalizedAt?.getTime() !== params.finalizedAt.getTime()
      ) {
        throw new DomainError(
          'vote is already finalized with different billing data',
        );
      }
      return;
    }
    if (this.status !== VoteStatus.Draft) {
      throw new DomainError('only draft votes can be finalized');
    }

    this.billingOrderId = billingOrderId;
    this.finalizedAt = params.finalizedAt;
  }

  cancelFinalized(canceledAt: Date): void {
    if (this.status === VoteStatus.Canceled) return;
    if (!this.finalizedAt || !this.billingOrderId) {
      throw new DomainError('vote is not finalized');
    }
    if (this.status !== VoteStatus.Draft) {
      throw new DomainError('only unopened finalized votes can be canceled');
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

  private assertSetupMutable(action: string): void {
    if (this.status !== VoteStatus.Draft) {
      throw new DomainError(`only draft votes can be ${action}`);
    }
    if (this.finalizedAt || this.billingOrderId) {
      throw new DomainError('finalized vote setup cannot be changed');
    }
  }

  private static assertVotingChannels(
    votingChannels: readonly VotingChannel[],
  ): void {
    if (votingChannels.length === 0) {
      throw new DomainError('vote must allow at least one voting channel');
    }
  }
}

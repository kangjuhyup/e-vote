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
import { VoteFinalizationWindowClosedError } from '../../../../shared/domain/voting/vote-finalization.error';

interface VoteStateParams {
  readonly id: string;
  readonly tenantId?: string;
  readonly organizationGroupId?: string;
  readonly organizationGroupCode?: string;
  readonly createdByUserPrincipalId?: string;
  readonly commissionId: string;
  readonly title: string;
  readonly votingChannels: readonly VotingChannel[];
  readonly defaultPolicy: VotePolicy;
  readonly identityVerificationPolicy: IdentityVerificationPolicy;
  readonly electoralRollSnapshotId?: string;
  readonly billingOrderId?: string;
  readonly finalizedAt?: Date;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly status?: VoteStatus;
}

type CreateVoteParams = Omit<
  VoteStateParams,
  | 'createdByUserPrincipalId'
  | 'tenantId'
  | 'organizationGroupId'
  | 'organizationGroupCode'
  | 'startedAt'
  | 'endedAt'
> & {
  readonly createdByUserPrincipalId: string;
  readonly tenantId: string;
  readonly organizationGroupId: string;
  readonly organizationGroupCode: string;
  readonly startedAt?: Date;
  readonly endedAt?: Date;
};

type ReconstituteVoteParams = Omit<VoteStateParams, 'status'> & {
  readonly status: VoteStatus;
};

export class VoteAggregate {
  private readonly events: VoteDomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly tenantId: string | undefined,
    readonly organizationGroupId: string | undefined,
    readonly organizationGroupCode: string | undefined,
    readonly createdByUserPrincipalId: string | undefined,
    readonly commissionId: string,
    public title: string,
    public votingChannels: readonly VotingChannel[],
    public defaultPolicy: VotePolicy,
    public identityVerificationPolicy: IdentityVerificationPolicy,
    public electoralRollSnapshotId: string | undefined,
    public billingOrderId: string | undefined,
    public finalizedAt: Date | undefined,
    public startedAt: Date,
    public endedAt: Date,
    public status: VoteStatus,
  ) {}

  static create(params: CreateVoteParams): VoteAggregate {
    const createdAt = new Date();
    return VoteAggregate.build({
      ...params,
      startedAt: params.startedAt ?? createdAt,
      endedAt: params.endedAt ?? params.startedAt ?? createdAt,
    });
  }

  static reconstitute(params: ReconstituteVoteParams): VoteAggregate {
    return VoteAggregate.build(params);
  }

  private static build(params: VoteStateParams): VoteAggregate {
    const id = createId(params.id);
    const tenantId = params.tenantId?.trim();
    const organizationGroupId = params.organizationGroupId?.trim();
    const organizationGroupCode = params.organizationGroupCode?.trim();
    const commissionId = createId(params.commissionId);
    const createdByUserPrincipalId = params.createdByUserPrincipalId?.trim();
    const title = params.title.trim();

    if (
      params.createdByUserPrincipalId !== undefined &&
      !createdByUserPrincipalId
    ) {
      throw new DomainError('vote creator user principal id must not be empty');
    }
    if (
      [
        params.tenantId,
        params.organizationGroupId,
        params.organizationGroupCode,
      ].filter((value) => value !== undefined).length !== 0 &&
      (!tenantId || !organizationGroupId || !organizationGroupCode)
    ) {
      throw new DomainError('vote organization ownership must be complete');
    }
    if (title.length === 0) {
      throw new DomainError('vote title must not be empty');
    }

    VoteAggregate.assertVotingChannels(params.votingChannels);
    VoteAggregate.assertIdentityVerificationPolicy(
      params.identityVerificationPolicy,
    );
    VoteAggregate.assertVotingWindow(params.startedAt, params.endedAt);
    if (params.finalizedAt && !params.billingOrderId) {
      throw new DomainError(
        'vote finalization timestamp requires a billing order',
      );
    }
    if (
      params.status === VoteStatus.Finalized &&
      (!params.billingOrderId || !params.finalizedAt)
    ) {
      throw new DomainError(
        'finalized vote requires billing order and finalization timestamp',
      );
    }
    if (params.status === VoteStatus.Draft && params.finalizedAt) {
      throw new DomainError('draft vote cannot have a finalization timestamp');
    }
    return new VoteAggregate(
      id,
      tenantId,
      organizationGroupId,
      organizationGroupCode,
      createdByUserPrincipalId,
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
      params.startedAt,
      params.endedAt,
      params.status ?? VoteStatus.Draft,
    );
  }

  allowsVotingChannel(channel: VotingChannel): boolean {
    return this.votingChannels.includes(channel);
  }

  isCreatedBy(userPrincipalId: string): boolean {
    return this.createdByUserPrincipalId === userPrincipalId;
  }

  assertElectorsMutable(action: 'created' | 'updated' | 'deleted'): void {
    if (this.billingOrderId !== undefined) {
      throw new DomainError('billing-locked vote electors cannot be changed');
    }
    if (this.status !== VoteStatus.Draft) {
      throw new DomainError(`only draft vote resources can be ${action}`);
    }
    if (this.electoralRollSnapshotId !== undefined) {
      throw new DomainError(
        'electors are managed by the attached electoral roll snapshot',
      );
    }
  }

  assertParticipationAllowed(channel: VotingChannel): void {
    if (this.status !== VoteStatus.Open) {
      throw new DomainError('vote must be open for participation');
    }
    if (!this.allowsVotingChannel(channel)) {
      throw new DomainError('vote does not allow requested voting channel');
    }
  }

  assertChildResourcesMutable(
    action: 'created' | 'updated' | 'deleted' | 'canceled',
  ): void {
    if (this.billingOrderId !== undefined) {
      throw new DomainError(
        `billing-locked vote resources cannot be ${action}`,
      );
    }
    if (this.status !== VoteStatus.Draft) {
      throw new DomainError(`only draft vote resources can be ${action}`);
    }
  }

  assertVoteDetailOpeningAllowed(): void {
    if (this.status !== VoteStatus.Open) {
      throw new DomainError('parent vote must be open');
    }
  }

  hasElectoralRollSnapshot(): boolean {
    return this.electoralRollSnapshotId !== undefined;
  }

  usesElectoralRollSnapshot(snapshotId: string): boolean {
    return this.electoralRollSnapshotId === snapshotId;
  }

  updateSettings(params: {
    readonly title: string;
    readonly votingChannels: readonly VotingChannel[];
    readonly defaultPolicy: VotePolicy;
    readonly identityVerificationPolicy: IdentityVerificationPolicy;
    readonly startedAt?: Date;
    readonly endedAt?: Date;
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
    const startedAt = params.startedAt ?? this.startedAt;
    const endedAt = params.endedAt ?? this.endedAt;
    VoteAggregate.assertVotingWindow(startedAt, endedAt);

    this.title = title;
    this.votingChannels = [...params.votingChannels];
    this.defaultPolicy = params.defaultPolicy;
    this.identityVerificationPolicy = params.identityVerificationPolicy;
    this.startedAt = startedAt;
    this.endedAt = endedAt;
  }

  attachElectoralRollSnapshot(snapshotId: string): void {
    this.assertSetupMutable('attach an electoral roll snapshot');

    this.electoralRollSnapshotId = createId(snapshotId);
  }

  open(openedAt: Date): void {
    if (this.status !== VoteStatus.Finalized) {
      throw new DomainError('only finalized votes can be opened');
    }
    if (openedAt.getTime() < this.startedAt.getTime()) {
      throw new DomainError('vote cannot be opened before its start time');
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
    if (closedAt.getTime() < this.endedAt.getTime()) {
      throw new DomainError('vote cannot be closed before its end time');
    }

    this.status = VoteStatus.Closed;
    this.events.push(
      VoteClosed.of({ aggregateId: this.id, occurredAt: closedAt }),
    );
  }

  openWhenDue(now: Date): boolean {
    if (
      this.status !== VoteStatus.Finalized ||
      now.getTime() < this.startedAt.getTime()
    ) {
      return false;
    }

    this.open(now);
    return true;
  }

  closeWhenDue(now: Date): boolean {
    if (
      this.status !== VoteStatus.Open ||
      now.getTime() < this.endedAt.getTime()
    ) {
      return false;
    }

    this.close(now);
    return true;
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

  cancelWhenPaymentOverdue(canceledAt: Date): boolean {
    if (this.status === VoteStatus.Canceled) return false;
    if (
      this.status !== VoteStatus.Draft ||
      !this.billingOrderId ||
      this.finalizedAt
    ) {
      throw new DomainError(
        'only billing-locked draft votes can be canceled for overdue payment',
      );
    }
    if (canceledAt.getTime() < this.startedAt.getTime()) {
      throw new DomainError(
        'vote cannot be canceled for overdue payment before its start time',
      );
    }

    this.status = VoteStatus.Canceled;
    this.events.push(
      VoteCanceled.of({ aggregateId: this.id, occurredAt: canceledAt }),
    );
    return true;
  }

  lockForBilling(billingOrderId: string): void {
    const normalizedBillingOrderId = createId(billingOrderId);
    if (this.billingOrderId === normalizedBillingOrderId) return;
    if (this.billingOrderId || this.finalizedAt) {
      throw new DomainError('vote is already linked to another billing order');
    }
    if (this.status !== VoteStatus.Draft) {
      throw new DomainError('only draft votes can be locked for billing');
    }

    this.billingOrderId = normalizedBillingOrderId;
  }

  assertCanFinalizeAt(finalizedAt: Date): void {
    if (finalizedAt.getTime() >= this.startedAt.getTime()) {
      throw new VoteFinalizationWindowClosedError();
    }
  }

  finalizePaidBilling(params: {
    billingOrderId: string;
    finalizedAt: Date;
  }): void {
    const billingOrderId = createId(params.billingOrderId);
    if (this.billingOrderId !== billingOrderId) {
      throw new DomainError('vote is linked to a different billing order');
    }
    if (
      this.finalizedAt &&
      (this.status === VoteStatus.Finalized ||
        this.status === VoteStatus.Open ||
        this.status === VoteStatus.Closed)
    ) {
      return;
    }
    if (this.status !== VoteStatus.Draft || this.finalizedAt) {
      throw new DomainError(
        'only a billing-locked draft vote can be finalized',
      );
    }
    this.assertCanFinalizeAt(params.finalizedAt);

    this.status = VoteStatus.Finalized;
    this.finalizedAt = params.finalizedAt;
  }

  assertBillingCancellationAllowed(billingOrderId: string): void {
    if (this.billingOrderId !== createId(billingOrderId)) {
      throw new DomainError('vote is linked to a different billing order');
    }
    if (
      this.status !== VoteStatus.Draft &&
      this.status !== VoteStatus.Finalized
    ) {
      throw new DomainError('only unopened votes can cancel billing');
    }
  }

  assertBillingCancellationAllowedAt(
    billingOrderId: string,
    canceledAt: Date,
    hasUpcomingNoticeDispatch: boolean,
  ): void {
    this.assertBillingCancellationAllowed(billingOrderId);
    if (canceledAt.getTime() >= this.startedAt.getTime()) {
      throw new DomainError(
        'vote billing cannot be canceled at or after start time',
      );
    }
    if (hasUpcomingNoticeDispatch) {
      throw new DomainError(
        'vote billing cannot be canceled after an upcoming vote notice dispatch started',
      );
    }
  }

  releaseBilling(billingOrderId: string): void {
    const normalizedBillingOrderId = createId(billingOrderId);
    if (
      this.status === VoteStatus.Draft &&
      !this.billingOrderId &&
      !this.finalizedAt
    ) {
      return;
    }
    this.assertBillingCancellationAllowed(normalizedBillingOrderId);

    this.status = VoteStatus.Draft;
    this.billingOrderId = undefined;
    this.finalizedAt = undefined;
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
      throw new DomainError('billing-locked vote setup cannot be changed');
    }
  }

  private static assertVotingChannels(
    votingChannels: readonly VotingChannel[],
  ): void {
    if (votingChannels.length === 0) {
      throw new DomainError('vote must allow at least one voting channel');
    }
  }

  private static assertVotingWindow(startedAt: Date, endedAt: Date): void {
    if (
      !Number.isFinite(startedAt.getTime()) ||
      !Number.isFinite(endedAt.getTime())
    ) {
      throw new DomainError('vote start and end times must be valid dates');
    }
    if (endedAt.getTime() < startedAt.getTime()) {
      throw new DomainError('vote end time must not be before start time');
    }
  }
}

import type {
  ElectionCommissionMemberReference,
  ElectionCommissionReference,
  VoteReference,
} from '../../../shared/domain/voting/capability-reference';
import { DomainError } from '../../../shared/domain/domain-error';
import { createId } from '../../../shared/domain/id';
import { VotingChannel } from '../../../shared/domain/voting/type/voting-channel.type';
import {
  FieldVotingDomainEvent,
  FieldVotingSessionCanceled,
  FieldVotingSessionClosed,
  FieldVotingSessionOpened,
  FieldVotingSessionScheduled,
} from './field-voting.events';
import { FieldVotingSessionStatus } from '../../../shared/domain/voting/type/field-voting-session-status.type';

interface ScheduleFieldVotingSessionParams {
  readonly id: string;
  readonly commission: ElectionCommissionReference;
  readonly vote: VoteReference;
  readonly channel: VotingChannel;
  readonly title: string;
  readonly locationName: string;
  readonly address: string;
  readonly managers: readonly ElectionCommissionMemberReference[];
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly scheduledAt: Date;
}

interface ReconstituteFieldVotingSessionParams {
  readonly id: string;
  readonly commissionId: string;
  readonly voteId: string;
  readonly channel: VotingChannel;
  readonly title: string;
  readonly locationName: string;
  readonly address: string;
  readonly managerIds: readonly string[];
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: FieldVotingSessionStatus;
}

export class FieldVotingSessionAggregate {
  private readonly events: FieldVotingDomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly commissionId: string,
    readonly voteId: string,
    readonly channel: VotingChannel,
    readonly title: string,
    readonly locationName: string,
    readonly address: string,
    readonly managerIds: readonly string[],
    readonly startsAt: Date,
    readonly endsAt: Date,
    public status: FieldVotingSessionStatus,
  ) {}

  static schedule(
    params: ScheduleFieldVotingSessionParams,
  ): FieldVotingSessionAggregate {
    FieldVotingSessionAggregate.assertSchedulable(params);

    const session = new FieldVotingSessionAggregate(
      createId(params.id),
      params.commission.id,
      params.vote.id,
      params.channel,
      FieldVotingSessionAggregate.trimRequired(params.title, 'title'),
      FieldVotingSessionAggregate.trimRequired(
        params.locationName,
        'locationName',
      ),
      FieldVotingSessionAggregate.trimRequired(params.address, 'address'),
      params.managers.map((manager) => manager.id),
      params.startsAt,
      params.endsAt,
      FieldVotingSessionStatus.Scheduled,
    );
    session.events.push(
      FieldVotingSessionScheduled.of({
        aggregateId: session.id,
        occurredAt: params.scheduledAt,
      }),
    );

    return session;
  }

  static reconstitute(
    params: ReconstituteFieldVotingSessionParams,
  ): FieldVotingSessionAggregate {
    FieldVotingSessionAggregate.assertFieldChannel(params.channel);
    FieldVotingSessionAggregate.assertTimeRange(params.startsAt, params.endsAt);
    FieldVotingSessionAggregate.assertManagerIds(params.managerIds);

    return new FieldVotingSessionAggregate(
      createId(params.id),
      createId(params.commissionId),
      createId(params.voteId),
      params.channel,
      FieldVotingSessionAggregate.trimRequired(params.title, 'title'),
      FieldVotingSessionAggregate.trimRequired(
        params.locationName,
        'locationName',
      ),
      FieldVotingSessionAggregate.trimRequired(params.address, 'address'),
      params.managerIds.map((managerId) => createId(managerId)),
      params.startsAt,
      params.endsAt,
      params.status,
    );
  }

  hasAssignedManager(memberId: string): boolean {
    return this.managerIds.includes(memberId);
  }

  belongsToVote(voteId: string): boolean {
    return this.voteId === voteId;
  }

  open(openedAt: Date): void {
    if (this.status !== FieldVotingSessionStatus.Scheduled) {
      throw new DomainError(
        'only scheduled field voting sessions can be opened',
      );
    }

    this.status = FieldVotingSessionStatus.Open;
    this.events.push(
      FieldVotingSessionOpened.of({
        aggregateId: this.id,
        occurredAt: openedAt,
      }),
    );
  }

  close(closedAt: Date): void {
    if (this.status !== FieldVotingSessionStatus.Open) {
      throw new DomainError('only open field voting sessions can be closed');
    }

    this.status = FieldVotingSessionStatus.Closed;
    this.events.push(
      FieldVotingSessionClosed.of({
        aggregateId: this.id,
        occurredAt: closedAt,
      }),
    );
  }

  cancel(canceledAt: Date): void {
    if (
      this.status !== FieldVotingSessionStatus.Scheduled &&
      this.status !== FieldVotingSessionStatus.Open
    ) {
      throw new DomainError(
        'only scheduled or open field voting sessions can be canceled',
      );
    }

    this.status = FieldVotingSessionStatus.Canceled;
    this.events.push(
      FieldVotingSessionCanceled.of({
        aggregateId: this.id,
        occurredAt: canceledAt,
      }),
    );
  }

  pullEvents(): FieldVotingDomainEvent[] {
    const pulledEvents = [...this.events];
    this.events.length = 0;
    return pulledEvents;
  }

  private static assertSchedulable(
    params: ScheduleFieldVotingSessionParams,
  ): void {
    FieldVotingSessionAggregate.assertFieldChannel(params.channel);

    if (!params.vote.allowsVotingChannel(params.channel)) {
      throw new DomainError(
        'vote does not allow requested field voting channel',
      );
    }

    if (params.vote.commissionId !== params.commission.id) {
      throw new DomainError('field voting session commission mismatch');
    }

    if (!params.commission.canRunVote()) {
      throw new DomainError('commission is not active');
    }

    if (
      params.managers.length === 0 ||
      params.managers.some(
        (manager) => !manager.canManageFieldVoting(params.commission.id),
      )
    ) {
      throw new DomainError('field voting session requires an active manager');
    }

    FieldVotingSessionAggregate.assertTimeRange(params.startsAt, params.endsAt);
  }

  private static assertFieldChannel(channel: VotingChannel): void {
    if (channel !== VotingChannel.Onsite && channel !== VotingChannel.Visit) {
      throw new DomainError(
        'field voting session channel must be onsite or visit',
      );
    }
  }

  private static assertManagerIds(managerIds: readonly string[]): void {
    if (managerIds.length === 0) {
      throw new DomainError('field voting session requires an active manager');
    }
  }

  private static assertTimeRange(startsAt: Date, endsAt: Date): void {
    if (startsAt.getTime() >= endsAt.getTime()) {
      throw new DomainError('field voting session start must be before end');
    }
  }

  private static trimRequired(value: string, fieldName: string): string {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new DomainError(
        `field voting session ${fieldName} must not be empty`,
      );
    }

    return trimmed;
  }
}

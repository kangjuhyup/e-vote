import { ElectionCommissionAggregate } from '../../../src/domain/election-commission/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../src/domain/election-commission/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../src/domain/election-commission/type/election-commission-member-role.type';
import {
  FieldVotingSessionClosed,
  FieldVotingSessionOpened,
  FieldVotingSessionScheduled,
} from '../../../src/domain/field-voting/field-voting.events';
import { FieldVotingSessionAggregate } from '../../../src/domain/field-voting/field-voting-session.aggregate';
import { FieldVotingSessionStatus } from '../../../src/domain/field-voting/type/field-voting-session-status.type';
import { DomainError } from '../../../src/domain/shared/domain-error';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../src/domain/vote/type/vote-status.type';
import { VotingChannel } from '../../../src/domain/vote/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../src/domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../src/domain/vote/vo/vote-policy.vo';
import { VoteAggregate } from '../../../src/domain/vote/vote.aggregate';

function createCommission(): ElectionCommissionAggregate {
  return ElectionCommissionAggregate.create({
    id: 'commission-1',
    name: 'Main Commission',
    createdAt: new Date('2026-08-13T00:00:00.000Z'),
  });
}

function createManager(): ElectionCommissionMemberAggregate {
  return ElectionCommissionMemberAggregate.create({
    id: 'member-1',
    commissionId: 'commission-1',
    name: 'Kim Manager',
    role: ElectionCommissionMemberRole.FieldManager,
    registeredAt: new Date('2026-08-13T00:00:00.000Z'),
  });
}

function createVote(
  votingChannels = [VotingChannel.Online, VotingChannel.Onsite],
): VoteAggregate {
  return VoteAggregate.create({
    id: 'vote-1',
    commissionId: 'commission-1',
    title: 'Hybrid vote',
    votingChannels,
    defaultPolicy: VotePolicy.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Individual,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Equal,
    }),
    identityVerificationPolicy: IdentityVerificationPolicy.of({
      required: false,
    }),
    status: VoteStatus.Draft,
  });
}

describe('field voting session domain', () => {
  it('schedules an onsite field voting session for an active commission and manager', () => {
    const session = FieldVotingSessionAggregate.schedule({
      id: 'session-1',
      commission: createCommission(),
      vote: createVote(),
      channel: VotingChannel.Onsite,
      title: 'Lobby voting desk',
      locationName: 'Main Lobby',
      address: 'Seoul Office',
      managers: [createManager()],
      startsAt: new Date('2026-08-20T00:00:00.000Z'),
      endsAt: new Date('2026-08-20T09:00:00.000Z'),
      scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    expect(session).toMatchObject({
      id: 'session-1',
      commissionId: 'commission-1',
      voteId: 'vote-1',
      channel: VotingChannel.Onsite,
      status: FieldVotingSessionStatus.Scheduled,
    });
    expect(session.hasAssignedManager('member-1')).toBe(true);
    expect(session.pullEvents()[0]).toBeInstanceOf(
      FieldVotingSessionScheduled,
    );
  });

  it('rejects online field voting sessions', () => {
    expect(() =>
      FieldVotingSessionAggregate.schedule({
        id: 'session-online',
        commission: createCommission(),
        vote: createVote([VotingChannel.Online]),
        channel: VotingChannel.Online,
        title: 'Invalid',
        locationName: 'Main Lobby',
        address: 'Seoul Office',
        managers: [createManager()],
        startsAt: new Date('2026-08-20T00:00:00.000Z'),
        endsAt: new Date('2026-08-20T09:00:00.000Z'),
        scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('rejects a field session when the parent vote does not allow the channel', () => {
    expect(() =>
      FieldVotingSessionAggregate.schedule({
        id: 'session-visit',
        commission: createCommission(),
        vote: createVote([VotingChannel.Online]),
        channel: VotingChannel.Visit,
        title: 'Visit voting',
        locationName: 'Visit route A',
        address: 'Private address',
        managers: [createManager()],
        startsAt: new Date('2026-08-20T00:00:00.000Z'),
        endsAt: new Date('2026-08-20T09:00:00.000Z'),
        scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('opens and closes through valid transitions', () => {
    const session = FieldVotingSessionAggregate.schedule({
      id: 'session-2',
      commission: createCommission(),
      vote: createVote(),
      channel: VotingChannel.Onsite,
      title: 'Lobby voting desk',
      locationName: 'Main Lobby',
      address: 'Seoul Office',
      managers: [createManager()],
      startsAt: new Date('2026-08-20T00:00:00.000Z'),
      endsAt: new Date('2026-08-20T09:00:00.000Z'),
      scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    session.pullEvents();
    session.open(new Date('2026-08-20T00:00:00.000Z'));
    session.close(new Date('2026-08-20T09:00:00.000Z'));

    expect(session.status).toBe(FieldVotingSessionStatus.Closed);
    expect(session.pullEvents().map((event) => event.constructor)).toEqual([
      FieldVotingSessionOpened,
      FieldVotingSessionClosed,
    ]);
  });
});

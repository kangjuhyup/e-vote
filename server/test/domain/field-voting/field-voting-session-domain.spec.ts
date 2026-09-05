import { ElectionCommissionAggregate } from '../../../src/modules/election-commission/domain/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../src/modules/election-commission/domain/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../src/modules/election-commission/domain/type/election-commission-member-role.type';
import {
  FieldVotingSessionClosed,
  FieldVotingSessionOpened,
  FieldVotingSessionScheduled,
} from '../../../src/modules/field-voting/domain/field-voting.events';
import { FieldVotingSessionAggregate } from '../../../src/modules/field-voting/domain/field-voting-session.aggregate';
import { FieldVotingSessionStatus } from '../../../src/shared/domain/voting/type/field-voting-session-status.type';
import { DomainError } from '../../../src/shared/domain/domain-error';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/shared/domain/voting/type/vote-policy.type';
import { VoteStatus } from '../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../src/shared/domain/voting/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../src/shared/domain/voting/vo/vote-policy.vo';
import { VoteAggregate } from '../../../src/modules/vote/domain/vote/vote.aggregate';

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
    userPrincipalId: 'user-1',
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
    createdByUserPrincipalId: 'user-1',
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
    expect(session.belongsToVote('vote-1')).toBe(true);
    expect(session.belongsToVote('vote-2')).toBe(false);
    expect(session.pullEvents()[0]).toBeInstanceOf(FieldVotingSessionScheduled);
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

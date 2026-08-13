import { CreateFieldVotingSessionCommand } from '../../../src/application/command/create-field-voting-session.command';
import { CreateFieldVotingSessionHandler } from '../../../src/application/command/create-field-voting-session.handler';
import { ElectionCommissionMemberRepositoryPort } from '../../../src/application/port/election-commission-member-repository.port';
import { ElectionCommissionRepositoryPort } from '../../../src/application/port/election-commission-repository.port';
import { FieldVotingSessionRepositoryPort } from '../../../src/application/port/field-voting-session-repository.port';
import { VoteRepositoryPort } from '../../../src/application/port/vote-repository.port';
import { ElectionCommissionAggregate } from '../../../src/domain/election-commission/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../src/domain/election-commission/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../src/domain/election-commission/type/election-commission-member-role.type';
import { FieldVotingSessionAggregate } from '../../../src/domain/field-voting/field-voting-session.aggregate';
import { FieldVotingSessionStatus } from '../../../src/domain/field-voting/type/field-voting-session-status.type';
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

function createCommissionFixture(): ElectionCommissionAggregate {
  return ElectionCommissionAggregate.create({
    id: 'commission-1',
    name: 'Main Commission',
    createdAt: new Date('2026-08-13T00:00:00.000Z'),
  });
}

function createManagerFixture(): ElectionCommissionMemberAggregate {
  return ElectionCommissionMemberAggregate.create({
    id: 'member-1',
    commissionId: 'commission-1',
    name: 'Kim Manager',
    role: ElectionCommissionMemberRole.FieldManager,
    registeredAt: new Date('2026-08-13T00:00:00.000Z'),
  });
}

function createVoteFixture(
  votingChannels: readonly VotingChannel[],
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

describe('CreateFieldVotingSessionHandler', () => {
  it('schedules a field voting session from authoritative repositories', async () => {
    const commission = createCommissionFixture();
    const vote = createVoteFixture([VotingChannel.Onsite]);
    const manager = createManagerFixture();
    const save = jest
      .fn<Promise<void>, [FieldVotingSessionAggregate]>()
      .mockResolvedValue(undefined);
    const commissionRepository: ElectionCommissionRepositoryPort = {
      nextId: jest.fn().mockReturnValue('commission-unused'),
      findById: jest.fn().mockResolvedValue(commission),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const voteRepository: VoteRepositoryPort = {
      nextId: jest.fn().mockReturnValue('vote-unused'),
      findById: jest.fn().mockResolvedValue(vote),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const memberRepository: ElectionCommissionMemberRepositoryPort = {
      findByIds: jest.fn().mockResolvedValue([manager]),
      nextId: jest.fn().mockReturnValue('member-unused'),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const fieldVotingSessionRepository: FieldVotingSessionRepositoryPort = {
      nextId: jest.fn().mockReturnValue('session-1'),
      findById: jest.fn().mockResolvedValue(undefined),
      save,
    };
    const handler = new CreateFieldVotingSessionHandler(
      commissionRepository,
      voteRepository,
      memberRepository,
      fieldVotingSessionRepository,
    );

    const result = await handler.execute(
      CreateFieldVotingSessionCommand.of({
        commissionId: 'commission-1',
        voteId: 'vote-1',
        channel: VotingChannel.Onsite,
        title: 'Lobby voting desk',
        locationName: 'Main Lobby',
        address: 'Seoul Office',
        managerIds: ['member-1'],
        startsAt: new Date('2026-08-20T00:00:00.000Z'),
        endsAt: new Date('2026-08-20T09:00:00.000Z'),
        scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'session-1',
      voteId: 'vote-1',
      status: FieldVotingSessionStatus.Scheduled,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBeInstanceOf(FieldVotingSessionAggregate);
  });
});

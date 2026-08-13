import { CastParticipationCommand } from '../../../src/application/command/cast-participation.command';
import { CastParticipationHandler } from '../../../src/application/command/cast-participation.handler';
import { ElectorRepositoryPort } from '../../../src/application/port/elector-repository.port';
import { FieldVotingSessionRepositoryPort } from '../../../src/application/port/field-voting-session-repository.port';
import { ParticipationRepositoryPort } from '../../../src/application/port/participation-repository.port';
import { VoteDetailRepositoryPort } from '../../../src/application/port/vote-detail-repository.port';
import { VoteRepositoryPort } from '../../../src/application/port/vote-repository.port';
import { ElectionCommissionAggregate } from '../../../src/domain/election-commission/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../src/domain/election-commission/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../src/domain/election-commission/type/election-commission-member-role.type';
import { ElectorAggregate } from '../../../src/domain/elector/elector.aggregate';
import { ElectorStatus } from '../../../src/domain/elector/type/elector-status.type';
import { FieldVotingSessionAggregate } from '../../../src/domain/field-voting/field-voting-session.aggregate';
import { ParticipationAggregate } from '../../../src/domain/participation/participation.aggregate';
import { ParticipationStatus } from '../../../src/domain/participation/type/participation-status.type';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/domain/vote/type/vote-policy.type';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../src/domain/vote/type/vote-status.type';
import { VotingChannel } from '../../../src/domain/vote/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../src/domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../src/domain/vote/vo/vote-policy.vo';
import { VoteAggregate } from '../../../src/domain/vote/vote.aggregate';
import { VoteDetailAggregate } from '../../../src/domain/vote/vote-detail.aggregate';

function createVoteFixture(): VoteAggregate {
  return VoteAggregate.create({
    id: 'vote-1',
    commissionId: 'commission-1',
    title: 'Hybrid vote',
    votingChannels: [VotingChannel.Onsite],
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

function createVoteDetailFixture(): VoteDetailAggregate {
  return VoteDetailAggregate.create({
    id: 'detail-1',
    voteId: 'vote-1',
    title: 'President',
    type: 'CANDIDATE',
    sortOrder: 0,
    status: VoteDetailStatus.Draft,
  });
}

function createElectorFixture(): ElectorAggregate {
  return ElectorAggregate.create({
    id: 'elector-1',
    voteId: 'vote-1',
    identifier: 'member-1',
    voteWeight: 1,
    status: ElectorStatus.Eligible,
  });
}

function createOpenFieldVotingSessionFixture(): FieldVotingSessionAggregate {
  const session = FieldVotingSessionAggregate.schedule({
    id: 'session-1',
    commission: ElectionCommissionAggregate.create({
      id: 'commission-1',
      name: 'Main Commission',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    }),
    vote: createVoteFixture(),
    channel: VotingChannel.Onsite,
    title: 'Lobby voting desk',
    locationName: 'Main Lobby',
    address: 'Seoul Office',
    managers: [
      ElectionCommissionMemberAggregate.create({
        id: 'member-1',
        commissionId: 'commission-1',
        name: 'Kim Manager',
        role: ElectionCommissionMemberRole.FieldManager,
        registeredAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    ],
    startsAt: new Date('2026-08-20T00:00:00.000Z'),
    endsAt: new Date('2026-08-20T09:00:00.000Z'),
    scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
  });
  session.open(new Date('2026-08-20T00:00:00.000Z'));

  return session;
}

describe('CastParticipationHandler', () => {
  it('casts onsite participation through an open field voting session', async () => {
    const save = jest
      .fn<Promise<void>, [ParticipationAggregate]>()
      .mockResolvedValue(undefined);
    const voteRepository: VoteRepositoryPort = {
      nextId: jest.fn().mockReturnValue('vote-unused'),
      findById: jest.fn().mockResolvedValue(createVoteFixture()),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const voteDetailRepository: VoteDetailRepositoryPort = {
      nextId: jest.fn().mockReturnValue('detail-unused'),
      findById: jest.fn().mockResolvedValue(createVoteDetailFixture()),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const electorRepository: ElectorRepositoryPort = {
      nextId: jest.fn().mockReturnValue('elector-unused'),
      findById: jest.fn().mockResolvedValue(createElectorFixture()),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const participationRepository: ParticipationRepositoryPort = {
      nextId: jest.fn().mockReturnValue('participation-1'),
      findById: jest.fn().mockResolvedValue(undefined),
      findCastByVoteDetailId: jest.fn().mockResolvedValue([]),
      save,
    };
    const fieldVotingSessionRepository: FieldVotingSessionRepositoryPort = {
      nextId: jest.fn().mockReturnValue('session-unused'),
      findById: jest
        .fn()
        .mockResolvedValue(createOpenFieldVotingSessionFixture()),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const handler = new CastParticipationHandler(
      voteRepository,
      voteDetailRepository,
      electorRepository,
      participationRepository,
      fieldVotingSessionRepository,
    );

    const result = await handler.execute(
      CastParticipationCommand.of({
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
        electorId: 'elector-1',
        votingChannel: VotingChannel.Onsite,
        fieldVotingSessionId: 'session-1',
        participatedAt: new Date('2026-08-20T01:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      status: ParticipationStatus.Cast,
    });
    expect(save.mock.calls[0][0]).toMatchObject({
      votingChannel: VotingChannel.Onsite,
      fieldVotingSessionId: 'session-1',
    });
  });
});

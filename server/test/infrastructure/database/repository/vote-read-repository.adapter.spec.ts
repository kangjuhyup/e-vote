import { LoadStrategy } from '@mikro-orm/core';
import { VoteReadRepositoryAdapter } from '../../../../src/modules/vote/infrastructure/database/repository/query/vote-read-repository.adapter';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../src/shared/domain/voting/type/vote-status.type';

type MockEntityManager = {
  readonly findAndCount: jest.Mock<
    Promise<[unknown[], number]>,
    [unknown, unknown, unknown?]
  >;
  readonly findOne: jest.Mock<Promise<unknown>, [unknown, unknown, unknown?]>;
};

describe('VoteReadRepositoryAdapter', () => {
  it('maps a complete vote detail read model without elector participation data', async () => {
    const em = createMockEntityManager();
    em.findOne.mockResolvedValue(createVoteEntity());
    const adapter = new VoteReadRepositoryAdapter(em as any);

    const result = await adapter.findDetailById('vote-1');

    expect(em.findOne.mock.calls[0][1]).toEqual({ id: 'vote-1' });
    expect(em.findOne.mock.calls[0][2]).toMatchObject({
      populate: [
        'commission',
        'electoralRollSnapshot',
        'votingChannels',
        'voteDetails.candidates',
      ],
      strategy: LoadStrategy.SELECT_IN,
    });
    expect(result).toMatchObject({
      id: 'vote-1',
      commissionId: 'commission-1',
      electoralRollSnapshotId: 'snapshot-1',
      title: 'Board election',
      description: 'Annual board election',
      votingChannels: [VotingChannel.Onsite, VotingChannel.Online],
      defaultPolicy: {
        privacyMode: PrivacyMode.Secret,
        participationUnit: ParticipationUnit.Individual,
        resultStorageMode: ResultStorageMode.Database,
        voteWeightMode: VoteWeightMode.Equal,
      },
      identityVerificationPolicy: {
        required: true,
        provider: 'PASS',
        method: 'MOBILE',
      },
      status: VoteStatus.Draft,
      voteDetails: [
        {
          id: 'vote-detail-1',
          voteId: 'vote-1',
          title: 'President',
          type: 'CANDIDATE',
          overrides: {
            privacyMode: PrivacyMode.Public,
          },
          sortOrder: 1,
          status: VoteDetailStatus.Draft,
          candidates: [
            {
              id: 'candidate-1',
              voteDetailId: 'vote-detail-1',
              candidateNo: 1,
              name: 'Kim',
              status: 'ACTIVE',
            },
            {
              id: 'candidate-2',
              voteDetailId: 'vote-detail-1',
              candidateNo: 2,
              name: 'Lee',
              status: 'ACTIVE',
            },
          ],
        },
        {
          id: 'vote-detail-2',
          voteId: 'vote-1',
          title: 'Auditor',
          sortOrder: 2,
          candidates: [],
        },
      ],
    });
    expect(result).not.toHaveProperty('electors');
    expect(result).not.toHaveProperty('participations');
  });

  it('maps a vote page using limit, offset, and stable ordering', async () => {
    const em = createMockEntityManager();
    em.findAndCount.mockResolvedValue([[createVoteEntity()], 21]);
    const adapter = new VoteReadRepositoryAdapter(em as any);

    const result = await adapter.findPage({ page: 2, pageSize: 20 });

    expect(em.findAndCount.mock.calls[0][2]).toMatchObject({
      populate: ['commission', 'electoralRollSnapshot', 'votingChannels'],
      limit: 20,
      offset: 20,
      orderBy: {
        createdAt: 'desc',
        id: 'desc',
      },
      strategy: LoadStrategy.SELECT_IN,
    });
    expect(result).toMatchObject({
      page: 2,
      pageSize: 20,
      totalItems: 21,
      totalPages: 2,
      items: [
        {
          id: 'vote-1',
          commissionId: 'commission-1',
          title: 'Board election',
          status: VoteStatus.Draft,
        },
      ],
    });
  });
});

function createMockEntityManager(): MockEntityManager {
  return {
    findAndCount: jest
      .fn<Promise<[unknown[], number]>, [unknown, unknown, unknown?]>()
      .mockResolvedValue([[], 0]),
    findOne: jest
      .fn<Promise<unknown>, [unknown, unknown, unknown?]>()
      .mockResolvedValue(null),
  };
}

function createVoteEntity(): Record<string, unknown> {
  const now = new Date('2026-08-13T00:00:00.000Z');

  return {
    id: 'vote-1',
    commission: { id: 'commission-1' },
    electoralRollSnapshot: { id: 'snapshot-1' },
    title: 'Board election',
    description: 'Annual board election',
    votingChannels: [
      { channel: VotingChannel.Onsite },
      { channel: VotingChannel.Online },
    ],
    defaultPrivacyMode: PrivacyMode.Secret,
    defaultParticipationUnit: ParticipationUnit.Individual,
    defaultResultStorageMode: ResultStorageMode.Database,
    defaultVoteWeightMode: VoteWeightMode.Equal,
    identityVerificationRequired: true,
    identityVerificationProvider: 'PASS',
    identityVerificationMethod: 'MOBILE',
    status: VoteStatus.Draft,
    startedAt: now,
    endedAt: new Date('2026-08-14T00:00:00.000Z'),
    createdAt: now,
    updatedAt: now,
    voteDetails: [
      {
        id: 'vote-detail-2',
        title: 'Auditor',
        description: '',
        type: 'CANDIDATE',
        privacyModeOverride: null,
        participationUnitOverride: null,
        resultStorageModeOverride: null,
        voteWeightModeOverride: null,
        sortOrder: 2,
        status: VoteDetailStatus.Draft,
        createdAt: now,
        updatedAt: now,
        candidates: [],
      },
      {
        id: 'vote-detail-1',
        title: 'President',
        description: '',
        type: 'CANDIDATE',
        privacyModeOverride: PrivacyMode.Public,
        participationUnitOverride: null,
        resultStorageModeOverride: null,
        voteWeightModeOverride: null,
        sortOrder: 1,
        status: VoteDetailStatus.Draft,
        createdAt: now,
        updatedAt: now,
        candidates: [
          {
            id: 'candidate-2',
            candidateNo: 2,
            name: 'Lee',
            description: '',
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'candidate-1',
            candidateNo: 1,
            name: 'Kim',
            description: '',
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
    ],
  };
}

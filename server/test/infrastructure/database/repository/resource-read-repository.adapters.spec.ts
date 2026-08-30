import { LoadStrategy } from '@mikro-orm/core';
import { CandidateReadRepositoryAdapter } from '../../../../src/modules/vote/infrastructure/database/repository/query/candidate-read-repository.adapter';
import { ElectorReadRepositoryAdapter } from '../../../../src/modules/elector/infrastructure/database/repository/query/elector-read-repository.adapter';
import { VoteDetailReadRepositoryAdapter } from '../../../../src/modules/vote/infrastructure/database/repository/query/vote-detail-read-repository.adapter';
import { CandidateStatus } from '../../../../src/shared/domain/voting/type/candidate-status.type';
import { ElectorStatus } from '../../../../src/shared/domain/voting/type/elector-status.type';
import { PrivacyMode } from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VoteDetailStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';

type MockEntityManager = {
  readonly findAndCount: jest.Mock<
    Promise<[unknown[], number]>,
    [unknown, unknown, unknown?]
  >;
  readonly findOne: jest.Mock<Promise<unknown>, [unknown, unknown, unknown?]>;
};

describe('resource read repository adapters', () => {
  it('maps vote detail detail and page read models', async () => {
    const em = createMockEntityManager();
    em.findOne.mockResolvedValue(createVoteDetailEntity());
    em.findAndCount.mockResolvedValue([[createVoteDetailEntity()], 1]);
    const adapter = new VoteDetailReadRepositoryAdapter(em as any);

    const detail = await adapter.findDetailById('vote-1', 'vote-detail-1');
    const page = await adapter.findPage({
      voteId: 'vote-1',
      page: 1,
      pageSize: 20,
    });

    expect(em.findOne.mock.calls[0][1]).toEqual({
      id: 'vote-detail-1',
      vote: { id: 'vote-1' },
    });
    expect(em.findOne.mock.calls[0][2]).toMatchObject({
      populate: ['vote'],
      strategy: LoadStrategy.JOINED,
    });
    expect(em.findAndCount.mock.calls[0][1]).toEqual({
      vote: { id: 'vote-1' },
    });
    expect(em.findAndCount.mock.calls[0][2]).toMatchObject({
      limit: 20,
      offset: 0,
      orderBy: {
        sortOrder: 'asc',
        createdAt: 'desc',
        id: 'desc',
      },
    });
    expect(detail).toMatchObject({
      id: 'vote-detail-1',
      voteId: 'vote-1',
      title: 'President',
      overrides: {
        privacyMode: PrivacyMode.Public,
      },
    });
    expect(page).toMatchObject({
      items: [
        {
          id: 'vote-detail-1',
          voteId: 'vote-1',
        },
      ],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it('maps elector read models without exposing ciphertext personal data', async () => {
    const em = createMockEntityManager();
    em.findOne.mockResolvedValue(createElectorEntity());
    em.findAndCount.mockResolvedValue([[createElectorEntity()], 2]);
    const adapter = new ElectorReadRepositoryAdapter(em as any);

    const detail = await adapter.findDetailById('vote-1', 'elector-1');
    const page = await adapter.findPage({
      voteId: 'vote-1',
      page: 2,
      pageSize: 10,
    });

    expect(em.findOne.mock.calls[0][1]).toEqual({
      id: 'elector-1',
      vote: { id: 'vote-1' },
    });
    expect(em.findOne.mock.calls[0][2]).toMatchObject({
      populate: ['vote', 'identityVerifications', 'participations'],
      strategy: LoadStrategy.JOINED,
    });
    expect(detail).toMatchObject({
      id: 'elector-1',
      voteId: 'vote-1',
      name: 'member-1',
      identifier: 'member-1',
      groupKey: 'group-1',
      voteWeight: 2,
      status: ElectorStatus.Eligible,
      identityVerified: true,
      participated: true,
      participatedAt: new Date('2026-08-13T02:00:00.000Z'),
    });
    expect(detail.phoneNumber).toBeUndefined();
    expect(detail.birthDate).toBeUndefined();
    expect(page).toMatchObject({
      page: 2,
      pageSize: 10,
      totalItems: 2,
      totalPages: 1,
    });
  });

  it('does not count canceled elector participations', async () => {
    const em = createMockEntityManager();
    em.findOne.mockResolvedValue({
      ...createElectorEntity(),
      participations: [
        {
          status: 'CANCELED',
          participatedAt: new Date('2026-08-13T03:00:00.000Z'),
        },
      ],
    });
    const adapter = new ElectorReadRepositoryAdapter(em as any);

    const detail = await adapter.findDetailById('vote-1', 'elector-1');

    expect(detail).toMatchObject({
      participated: false,
    });
    expect(detail.participatedAt).toBeUndefined();
  });

  it('maps candidate detail and page read models inside parent vote detail scope', async () => {
    const em = createMockEntityManager();
    em.findOne.mockResolvedValue(createCandidateEntity());
    em.findAndCount.mockResolvedValue([[createCandidateEntity()], 1]);
    const adapter = new CandidateReadRepositoryAdapter(em as any);

    const detail = await adapter.findDetailById(
      'vote-1',
      'vote-detail-1',
      'candidate-1',
    );
    const page = await adapter.findPage({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
      page: 1,
      pageSize: 20,
    });

    expect(em.findOne.mock.calls[0][1]).toEqual({
      id: 'candidate-1',
      voteDetail: {
        id: 'vote-detail-1',
        vote: { id: 'vote-1' },
      },
    });
    expect(em.findAndCount.mock.calls[0][1]).toEqual({
      voteDetail: {
        id: 'vote-detail-1',
        vote: { id: 'vote-1' },
      },
    });
    expect(em.findAndCount.mock.calls[0][2]).toMatchObject({
      populate: ['voteDetail.vote'],
      orderBy: {
        candidateNo: 'asc',
        createdAt: 'desc',
        id: 'desc',
      },
    });
    expect(detail).toMatchObject({
      id: 'candidate-1',
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
      candidateNo: 1,
      name: 'Kim',
      status: CandidateStatus.Active,
    });
    expect(page).toMatchObject({
      items: [
        {
          id: 'candidate-1',
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
        },
      ],
      totalItems: 1,
      totalPages: 1,
    });
  });
});

const now = new Date('2026-08-13T00:00:00.000Z');

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

function createVoteDetailEntity(): Record<string, unknown> {
  return {
    id: 'vote-detail-1',
    vote: { id: 'vote-1' },
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
  };
}

function createElectorEntity(): Record<string, unknown> {
  return {
    id: 'elector-1',
    vote: { id: 'vote-1' },
    name: 'v1:encrypted-name',
    identifier: 'member-1',
    phoneNumber: 'v1:encrypted-phone',
    birthDate: 'v1:encrypted-birth',
    groupKey: 'group-1',
    voteWeight: '2',
    status: ElectorStatus.Eligible,
    createdAt: now,
    updatedAt: now,
    identityVerifications: [
      {
        status: 'FAILED',
      },
      {
        status: 'SUCCESS',
      },
    ],
    participations: [
      {
        status: 'CAST',
        participatedAt: new Date('2026-08-13T01:00:00.000Z'),
      },
      {
        status: 'CANCELED',
        participatedAt: new Date('2026-08-13T03:00:00.000Z'),
      },
      {
        status: 'CAST',
        participatedAt: new Date('2026-08-13T02:00:00.000Z'),
      },
    ],
  };
}

function createCandidateEntity(): Record<string, unknown> {
  return {
    id: 'candidate-1',
    voteDetail: {
      id: 'vote-detail-1',
      vote: { id: 'vote-1' },
    },
    candidateNo: 1,
    name: 'Kim',
    description: '',
    status: CandidateStatus.Active,
    createdAt: now,
    updatedAt: now,
  };
}

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
  readonly find: jest.Mock<Promise<unknown[]>, [unknown, unknown, unknown?]>;
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

    em.find.mockResolvedValue([
      createBillingOrderEntity('PENDING_PAYMENT', 'user-principal-1'),
    ]);

    const result = await adapter.findDetailById({
      voteId: 'vote-1',
      userPrincipalId: 'user-principal-1',
    });

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
      activeBillingOrderId: 'billing-order-1',
      billingOrderStatus: 'PENDING_PAYMENT',
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
    expect(em.find).toHaveBeenCalledTimes(1);
    expect(em.find.mock.calls[0][1]).toEqual({
      id: { $in: ['billing-order-1'] },
      orderedByUserPrincipalId: 'user-principal-1',
      status: { $in: ['PENDING_PAYMENT', 'PAID', 'REFUND_PENDING'] },
    });
  });

  it('maps a vote page using limit, offset, and stable ordering', async () => {
    const em = createMockEntityManager();
    em.findAndCount.mockResolvedValue([[createVoteEntity()], 21]);
    em.find.mockResolvedValue([
      createBillingOrderEntity('REFUND_PENDING', 'user-principal-1'),
    ]);
    const adapter = new VoteReadRepositoryAdapter(em as any);

    const result = await adapter.findPage({
      page: 2,
      pageSize: 20,
      userPrincipalId: 'user-principal-1',
    });

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
          activeBillingOrderId: 'billing-order-1',
          billingOrderStatus: 'REFUND_PENDING',
        },
      ],
    });
    expect(em.find).toHaveBeenCalledTimes(1);
  });

  it('omits active billing details when the order is not owned by the current principal', async () => {
    const em = createMockEntityManager();
    em.findAndCount.mockResolvedValue([[createVoteEntity()], 1]);
    em.find.mockResolvedValue([]);
    const adapter = new VoteReadRepositoryAdapter(em as any);

    const result = await adapter.findPage({
      page: 1,
      pageSize: 20,
      userPrincipalId: 'another-user',
    });

    expect(result.items[0]).not.toHaveProperty('activeBillingOrderId');
    expect(result.items[0]).not.toHaveProperty('billingOrderStatus');
    expect(em.find.mock.calls[0][1]).toEqual(
      expect.objectContaining({ orderedByUserPrincipalId: 'another-user' }),
    );
  });
});

function createMockEntityManager(): MockEntityManager {
  return {
    find: jest
      .fn<Promise<unknown[]>, [unknown, unknown, unknown?]>()
      .mockResolvedValue([]),
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
    billingOrderId: 'billing-order-1',
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

function createBillingOrderEntity(
  status: 'PENDING_PAYMENT' | 'PAID' | 'REFUND_PENDING',
  orderedByUserPrincipalId: string,
): Record<string, unknown> {
  return {
    id: 'billing-order-1',
    orderedByUserPrincipalId,
    status,
  };
}

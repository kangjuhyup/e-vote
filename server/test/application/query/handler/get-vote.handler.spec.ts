import {
  GetVoteHandler,
  VoteNotFoundError,
} from '../../../../src/modules/vote/application/query/handler/get-vote.handler';
import { GetVoteQuery } from '../../../../src/modules/vote/application/query/dto/request/get-vote.query';
import {
  IdentityVerificationPolicyView,
  VotePageView,
  VotePolicyView,
  VoteSummaryView,
  VoteView,
} from '../../../../src/modules/vote/application/query/dto/response/vote.view';
import type { VoteReadRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/query/vote-read-repository.port';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VoteStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { GetVotePageHandler } from '../../../../src/modules/vote/application/query/handler/get-vote-page.handler';
import { GetVotePageQuery } from '../../../../src/modules/vote/application/query/dto/request/get-vote-page.query';
import type {
  DatabaseTransactionManager,
  DatabaseTransactionOptions,
} from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';

describe('vote query handlers', () => {
  it('loads a vote detail through the read repository', async () => {
    const vote = createVoteView();
    const findDetailById = jest.fn().mockResolvedValue(vote);
    const repository: VoteReadRepositoryPort = {
      findDetailById,
      findPage: jest.fn().mockResolvedValue(createVotePageView()),
    };
    const transactionManager = new RecordingTransactionManager();
    const handler = new GetVoteHandler(repository, transactionManager);

    await expect(
      handler.execute(
        GetVoteQuery.of({
          voteId: 'vote-1',
          userPrincipalId: 'user-principal-1',
        }),
      ),
    ).resolves.toBe(vote);
    expect(findDetailById).toHaveBeenCalledWith({
      voteId: 'vote-1',
      userPrincipalId: 'user-principal-1',
    });
    expect(transactionManager.options).toEqual([
      { isolationLevel: 'repeatable-read' },
    ]);
  });

  it('throws when a vote detail is missing', async () => {
    const findDetailById = jest.fn().mockResolvedValue(undefined);
    const repository: VoteReadRepositoryPort = {
      findDetailById,
      findPage: jest.fn().mockResolvedValue(createVotePageView()),
    };
    const handler = new GetVoteHandler(
      repository,
      new RecordingTransactionManager(),
    );

    await expect(
      handler.execute(
        GetVoteQuery.of({
          voteId: 'missing-vote',
          userPrincipalId: 'user-principal-1',
        }),
      ),
    ).rejects.toBeInstanceOf(VoteNotFoundError);
  });

  it('loads a normalized vote page through the read repository', async () => {
    const page = createVotePageView();
    const findPage = jest.fn().mockResolvedValue(page);
    const repository: VoteReadRepositoryPort = {
      findDetailById: jest.fn().mockResolvedValue(createVoteView()),
      findPage,
    };
    const transactionManager = new RecordingTransactionManager();
    const handler = new GetVotePageHandler(repository, transactionManager);

    await expect(
      handler.execute(
        GetVotePageQuery.of({
          page: 0,
          pageSize: 101,
          userPrincipalId: 'user-principal-1',
        }),
      ),
    ).resolves.toBe(page);
    expect(findPage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
      userPrincipalId: 'user-principal-1',
    });
    expect(transactionManager.options).toEqual([
      { isolationLevel: 'repeatable-read' },
    ]);
  });
});

class RecordingTransactionManager implements DatabaseTransactionManager {
  readonly options: DatabaseTransactionOptions[] = [];

  async runInTransaction<T>(
    work: () => Promise<T>,
    options: DatabaseTransactionOptions = {},
  ): Promise<T> {
    this.options.push(options);
    return work();
  }
}

function createVoteView(): VoteView {
  return VoteView.of({
    electorCount: 1,
    participatedCount: 0,
    id: 'vote-1',
    commissionId: 'commission-1',
    title: 'Board election',
    description: 'Annual board election',
    votingChannels: [VotingChannel.Online],
    defaultPolicy: createPolicyView(),
    identityVerificationPolicy: IdentityVerificationPolicyView.of({
      required: false,
    }),
    status: VoteStatus.Draft,
    voteDetails: [],
    startedAt: new Date('2026-08-13T00:00:00.000Z'),
    endedAt: new Date('2026-08-14T00:00:00.000Z'),
    createdAt: new Date('2026-08-12T00:00:00.000Z'),
    updatedAt: new Date('2026-08-12T01:00:00.000Z'),
  });
}

function createVotePageView(): VotePageView {
  return VotePageView.of({
    items: [
      VoteSummaryView.of({
        electorCount: 1,
        participatedCount: 0,
        id: 'vote-1',
        commissionId: 'commission-1',
        title: 'Board election',
        votingChannels: [VotingChannel.Online],
        defaultPolicy: createPolicyView(),
        identityVerificationPolicy: IdentityVerificationPolicyView.of({
          required: false,
        }),
        activeBillingOrderId: 'billing-order-1',
        billingOrderStatus: 'PENDING_PAYMENT',
        status: VoteStatus.Draft,
        startedAt: new Date('2026-08-13T00:00:00.000Z'),
        endedAt: new Date('2026-08-14T00:00:00.000Z'),
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
        updatedAt: new Date('2026-08-12T01:00:00.000Z'),
      }),
    ],
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  });
}

function createPolicyView(): VotePolicyView {
  return VotePolicyView.of({
    privacyMode: PrivacyMode.Secret,
    participationUnit: ParticipationUnit.Individual,
    resultStorageMode: ResultStorageMode.Database,
    voteWeightMode: VoteWeightMode.Equal,
  });
}

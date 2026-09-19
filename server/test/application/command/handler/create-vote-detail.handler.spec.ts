import { CreateVoteDetailCommand } from '../../../../src/modules/vote/application/command/dto/request/create-vote-detail.command';
import { CreateVoteDetailHandler } from '../../../../src/modules/vote/application/command/handler/create-vote-detail.handler';
import { VoteDetailRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-detail-repository.port';
import { VoteDetailAggregate } from '../../../../src/modules/vote/domain/vote/vote-detail.aggregate';
import { VoteDetailStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';
import type { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import type { CandidateRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/candidate-repository.port';
import { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { VotePolicy } from '../../../../src/shared/domain/voting/vo/vote-policy.vo';
import { IdentityVerificationPolicy } from '../../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import type { VoteSetupLifecyclePort } from '../../../../src/shared/application/port/capability/vote-billing.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';

describe('CreateVoteDetailHandler', () => {
  it('creates a draft vote detail and saves it through the repository', async () => {
    const save = jest
      .fn<Promise<void>, [VoteDetailAggregate]>()
      .mockResolvedValue(undefined);
    const repository: VoteDetailRepositoryPort = {
      nextId: jest.fn().mockReturnValue('vote-detail-1'),
      findById: jest.fn().mockResolvedValue(undefined),
      findByVoteIds: jest.fn().mockResolvedValue([]),
      save,
    };
    const handler = new CreateVoteDetailHandler(
      voteRepository(createVote()),
      repository,
      candidateRepository(),
      voteLifecycleStub(),
      transactionManagerStub(),
    );

    const result = await handler.execute(
      CreateVoteDetailCommand.of({
        voteId: 'vote-1',
        title: 'President',
        type: 'CANDIDATE',
        sortOrder: 0,
      }),
    );

    expect(result).toEqual({
      id: 'vote-detail-1',
      voteId: 'vote-1',
      status: VoteDetailStatus.Draft,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBeInstanceOf(VoteDetailAggregate);
    expect(save.mock.calls[0][0]).toMatchObject({
      id: 'vote-detail-1',
      voteId: 'vote-1',
      title: 'President',
      status: VoteDetailStatus.Draft,
    });
  });

  it('rejects creation after billing has locked the parent vote', async () => {
    const vote = createVote();
    vote.lockForBilling('billing-order-1');
    const save = jest.fn();
    const details: VoteDetailRepositoryPort = {
      nextId: jest.fn().mockReturnValue('vote-detail-1'),
      findById: jest.fn(),
      findByVoteIds: jest.fn().mockResolvedValue([]),
      save,
    };
    const handler = new CreateVoteDetailHandler(
      voteRepository(vote),
      details,
      candidateRepository(),
      voteLifecycleStub(),
      transactionManagerStub(),
    );

    await expect(
      handler.execute(
        CreateVoteDetailCommand.of({
          voteId: 'vote-1',
          title: 'President',
          type: 'CANDIDATE',
          sortOrder: 0,
        }),
      ),
    ).rejects.toThrow('billing-locked vote resources cannot be created');
    expect(save).not.toHaveBeenCalled();
  });

  it('creates selectable 찬성 and 반대 choices with a new yes-no ballot', async () => {
    const savedCandidates: Array<
      Parameters<CandidateRepositoryPort['save']>[0]
    > = [];
    const candidates = candidateRepository(savedCandidates);
    const handler = new CreateVoteDetailHandler(
      voteRepository(createVote()),
      {
        nextId: () => 'vote-detail-1',
        findById: jest.fn(),
        findByVoteIds: jest.fn().mockResolvedValue([]),
        save: jest.fn().mockResolvedValue(undefined),
      },
      candidates,
      voteLifecycleStub(),
      transactionManagerStub(),
    );

    await handler.execute(
      CreateVoteDetailCommand.of({
        voteId: 'vote-1',
        title: '예산안 승인',
        type: 'YES_NO',
        sortOrder: 0,
      }),
    );

    expect(savedCandidates).toHaveLength(2);
    expect(
      savedCandidates.map((candidate) => ({
        candidateNo: candidate.candidateNo,
        name: candidate.name,
        status: candidate.status,
        voteDetailId: candidate.voteDetailId,
      })),
    ).toEqual([
      {
        candidateNo: 1,
        name: '찬성',
        status: 'ACTIVE',
        voteDetailId: 'vote-detail-1',
      },
      {
        candidateNo: 2,
        name: '반대',
        status: 'ACTIVE',
        voteDetailId: 'vote-detail-1',
      },
    ]);
  });
});

function candidateRepository(
  savedCandidates?: Array<Parameters<CandidateRepositoryPort['save']>[0]>,
): CandidateRepositoryPort {
  let sequence = 0;
  return {
    nextId: jest.fn(() => `candidate-${++sequence}`),
    findById: jest.fn(),
    save: jest.fn((candidate) => {
      savedCandidates?.push(candidate);
      return Promise.resolve();
    }),
  };
}

function createVote(): VoteAggregate {
  return VoteAggregate.create({
    id: 'vote-1',
    createdByUserPrincipalId: 'user-1',
    commissionId: 'commission-1',
    title: 'Vote',
    votingChannels: [VotingChannel.Online],
    defaultPolicy: VotePolicy.of({
      privacyMode: 'SECRET',
      participationUnit: 'INDIVIDUAL',
      resultStorageMode: 'DATABASE',
      voteWeightMode: 'EQUAL',
    }),
    identityVerificationPolicy: IdentityVerificationPolicy.of({
      required: false,
    }),
  });
}

function voteRepository(vote: VoteAggregate): VoteRepositoryPort {
  return {
    nextId: jest.fn(),
    findById: jest.fn().mockResolvedValue(vote),
    save: jest.fn(),
  };
}

function voteLifecycleStub(): VoteSetupLifecyclePort {
  return {
    lockVote: jest.fn().mockResolvedValue(undefined),
    lockForBilling: jest.fn(),
    finalizePaidBilling: jest.fn(),
    assertBillingCancellationAllowed: jest.fn(),
    releaseBilling: jest.fn(),
  };
}

function transactionManagerStub(): DatabaseTransactionManager {
  return { runInTransaction: jest.fn(async (work) => work()) };
}

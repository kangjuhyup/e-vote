import { CreateVoteDetailCommand } from '../../../../src/modules/vote/application/command/dto/request/create-vote-detail.command';
import { CreateVoteDetailHandler } from '../../../../src/modules/vote/application/command/handler/create-vote-detail.handler';
import { VoteDetailRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-detail-repository.port';
import { VoteDetailAggregate } from '../../../../src/modules/vote/domain/vote/vote-detail.aggregate';
import { VoteDetailStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';
import type { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
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
      save,
    };
    const handler = new CreateVoteDetailHandler(
      voteRepository(createVote()),
      repository,
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
      save,
    };
    const handler = new CreateVoteDetailHandler(
      voteRepository(vote),
      details,
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
});

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

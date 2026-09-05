import { CreateCandidateCommand } from '../../../../src/modules/vote/application/command/dto/request/create-candidate.command';
import { CreateCandidateHandler } from '../../../../src/modules/vote/application/command/handler/create-candidate.handler';
import { CandidateRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/candidate-repository.port';
import { CandidateAggregate } from '../../../../src/modules/vote/domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../../../src/shared/domain/voting/type/candidate-status.type';
import type { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import type { VoteDetailRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-detail-repository.port';
import { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';
import { VoteDetailAggregate } from '../../../../src/modules/vote/domain/vote/vote-detail.aggregate';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { VotePolicy } from '../../../../src/shared/domain/voting/vo/vote-policy.vo';
import { IdentityVerificationPolicy } from '../../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import type { VoteSetupLifecyclePort } from '../../../../src/shared/application/port/capability/vote-billing.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';

describe('CreateCandidateHandler', () => {
  it('creates an active candidate and saves it through the repository', async () => {
    const save = jest
      .fn<Promise<void>, [CandidateAggregate]>()
      .mockResolvedValue(undefined);
    const repository: CandidateRepositoryPort = {
      nextId: jest.fn().mockReturnValue('candidate-1'),
      findById: jest.fn(),
      save,
    };
    const handler = new CreateCandidateHandler(
      voteRepository(createVote()),
      voteDetailRepository(createVoteDetail()),
      repository,
      voteLifecycleStub(),
      transactionManagerStub(),
    );

    const result = await handler.execute(
      CreateCandidateCommand.of({
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
        candidateNo: 1,
        name: 'Kim',
      }),
    );

    expect(result).toEqual({
      id: 'candidate-1',
      voteDetailId: 'vote-detail-1',
      status: CandidateStatus.Active,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBeInstanceOf(CandidateAggregate);
    expect(save.mock.calls[0][0]).toMatchObject({
      id: 'candidate-1',
      voteDetailId: 'vote-detail-1',
      candidateNo: 1,
      name: 'Kim',
      status: CandidateStatus.Active,
    });
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

function createVoteDetail(): VoteDetailAggregate {
  return VoteDetailAggregate.create({
    id: 'vote-detail-1',
    voteId: 'vote-1',
    title: 'President',
    type: 'CANDIDATE',
    sortOrder: 0,
  });
}

function voteRepository(vote: VoteAggregate): VoteRepositoryPort {
  return {
    nextId: jest.fn(),
    findById: jest.fn().mockResolvedValue(vote),
    save: jest.fn(),
  };
}

function voteDetailRepository(
  detail: VoteDetailAggregate,
): VoteDetailRepositoryPort {
  return {
    nextId: jest.fn(),
    findById: jest.fn().mockResolvedValue(detail),
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

import { BlockElectorCommand } from '../../../../src/modules/elector/application/command/dto/request/block-elector.command';
import { UpdateElectorCommand } from '../../../../src/modules/elector/application/command/dto/request/update-elector.command';
import { BlockElectorHandler } from '../../../../src/modules/elector/application/command/handler/block-elector.handler';
import { UpdateElectorHandler } from '../../../../src/modules/elector/application/command/handler/update-elector.handler';
import type { ElectorRepositoryPort } from '../../../../src/modules/elector/application/port/persistence/command/elector-repository.port';
import type { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import { ElectorAggregate } from '../../../../src/modules/elector/domain/elector.aggregate';
import { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../src/shared/domain/voting/vo/vote-policy.vo';
import type { VoteSetupLifecyclePort } from '../../../../src/shared/application/port/capability/vote-billing.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';

describe('snapshot-managed elector commands', () => {
  it('rejects direct updates and blocks for snapshot-derived electors', async () => {
    const voteRepository = createVoteRepository();
    const electorRepository = createElectorRepository();

    await expect(
      new UpdateElectorHandler(
        voteRepository,
        electorRepository,
        voteLifecycleStub(),
        transactionManagerStub(),
      ).execute(
        UpdateElectorCommand.of({
          voteId: 'vote-1',
          electorId: 'elector-1',
          identifier: 'changed',
          voteWeight: 1,
        }),
      ),
    ).rejects.toThrow('managed by the attached electoral roll snapshot');
    await expect(
      new BlockElectorHandler(
        voteRepository,
        electorRepository,
        voteLifecycleStub(),
        transactionManagerStub(),
      ).execute(
        BlockElectorCommand.of({
          voteId: 'vote-1',
          electorId: 'elector-1',
        }),
      ),
    ).rejects.toThrow('managed by the attached electoral roll snapshot');
    expect(electorRepository.save.mock.calls).toHaveLength(0);
  });
});

function createVoteRepository(): VoteRepositoryPort {
  const vote = VoteAggregate.create({
    id: 'vote-1',
    createdByUserPrincipalId: 'user-1',
    commissionId: 'commission-1',
    title: 'Vote',
    votingChannels: [VotingChannel.Online],
    defaultPolicy: VotePolicy.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Individual,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Equal,
    }),
    identityVerificationPolicy: IdentityVerificationPolicy.of({
      required: false,
    }),
    electoralRollSnapshotId: 'snapshot-1',
  });
  return {
    nextId: jest.fn(),
    findById: jest.fn().mockResolvedValue(vote),
    save: jest.fn(),
  };
}

function voteLifecycleStub(): VoteSetupLifecyclePort {
  return {
    lockVote: jest.fn().mockResolvedValue(undefined),
    lockForBilling: jest.fn().mockResolvedValue(undefined),
    finalizePaidBilling: jest.fn().mockResolvedValue(undefined),
    assertBillingCancellationAllowed: jest.fn().mockResolvedValue(undefined),
    releaseBilling: jest.fn().mockResolvedValue(undefined),
  };
}

function transactionManagerStub(): DatabaseTransactionManager {
  return { runInTransaction: jest.fn(async (work) => work()) };
}

function createElectorRepository(): jest.Mocked<ElectorRepositoryPort> {
  const elector = ElectorAggregate.create({
    id: 'elector-1',
    voteId: 'vote-1',
    identifier: 'member-1',
  });
  return {
    nextId: jest.fn(),
    findById: jest.fn().mockResolvedValue(elector),
    save: jest.fn(),
  };
}

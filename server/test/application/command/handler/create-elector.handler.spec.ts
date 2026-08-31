import { CreateElectorCommand } from '../../../../src/modules/elector/application/command/dto/request/create-elector.command';
import { CreateElectorHandler } from '../../../../src/modules/elector/application/command/handler/create-elector.handler';
import { ElectorRepositoryPort } from '../../../../src/modules/elector/application/port/persistence/command/elector-repository.port';
import { ElectorAggregate } from '../../../../src/modules/elector/domain/elector.aggregate';
import { ElectorStatus } from '../../../../src/shared/domain/voting/type/elector-status.type';
import { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
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

describe('CreateElectorHandler', () => {
  it('creates an eligible elector and saves it through the repository', async () => {
    const save = jest
      .fn<Promise<void>, [ElectorAggregate]>()
      .mockResolvedValue(undefined);
    const repository: ElectorRepositoryPort = {
      nextId: jest.fn().mockReturnValue('elector-1'),
      findById: jest.fn().mockResolvedValue(undefined),
      save,
    };
    const handler = new CreateElectorHandler(
      voteRepository(),
      repository,
      voteLifecycleStub(),
      transactionManagerStub(),
    );

    const result = await handler.execute(
      CreateElectorCommand.of({
        voteId: 'vote-1',
        name: 'Kim Min Su',
        identifier: 'member-1',
        phoneNumber: '010-1234-5678',
        birthDate: '1990-01-31',
        groupKey: 'group-1',
        voteWeight: 2,
      }),
    );

    expect(result).toEqual({
      id: 'elector-1',
      voteId: 'vote-1',
      name: 'Kim Min Su',
      phoneNumber: '010-1234-5678',
      birthDate: '1990-01-31',
      status: ElectorStatus.Eligible,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBeInstanceOf(ElectorAggregate);
    expect(save.mock.calls[0][0]).toMatchObject({
      id: 'elector-1',
      voteId: 'vote-1',
      name: 'Kim Min Su',
      identifier: 'member-1',
      phoneNumber: '010-1234-5678',
      birthDate: '1990-01-31',
      groupKey: 'group-1',
      voteWeight: 2,
      status: ElectorStatus.Eligible,
    });
  });

  it('rejects manual elector creation after a snapshot is attached', async () => {
    const electors: ElectorRepositoryPort = {
      nextId: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };

    await expect(
      new CreateElectorHandler(
        voteRepository('snapshot-1'),
        electors,
        voteLifecycleStub(),
        transactionManagerStub(),
      ).execute(
        CreateElectorCommand.of({
          voteId: 'vote-1',
          name: 'Member',
          identifier: 'member-1',
        }),
      ),
    ).rejects.toThrow('managed by the attached electoral roll snapshot');
    expect((electors.save as jest.Mock).mock.calls).toHaveLength(0);
  });

  it('locks the parent vote and rejects creation after finalization', async () => {
    const electors: ElectorRepositoryPort = {
      nextId: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };
    const lifecycle = voteLifecycleStub();

    await expect(
      new CreateElectorHandler(
        voteRepository(undefined, true),
        electors,
        lifecycle,
        transactionManagerStub(),
      ).execute(
        CreateElectorCommand.of({
          voteId: 'vote-1',
          name: 'Member',
          identifier: 'member-1',
        }),
      ),
    ).rejects.toThrow('finalized vote electors cannot be changed');
    expect(lifecycle.lockVote.mock.calls).toContainEqual(['vote-1']);
    expect((electors.save as jest.Mock).mock.calls).toHaveLength(0);
  });
});

function voteRepository(
  electoralRollSnapshotId?: string,
  finalized = false,
): VoteRepositoryPort {
  const vote = VoteAggregate.create({
    id: 'vote-1',
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
    electoralRollSnapshotId,
  });
  if (finalized) {
    vote.finalizeForBilling({
      billingOrderId: 'billing-order-1',
      finalizedAt: new Date('2026-08-31T00:00:00.000Z'),
    });
  }

  return {
    nextId: jest.fn(),
    findById: jest.fn().mockResolvedValue(vote),
    save: jest.fn(),
  };
}

function voteLifecycleStub(): jest.Mocked<VoteSetupLifecyclePort> {
  return {
    lockVote: jest.fn().mockResolvedValue(undefined),
    finalizeForBilling: jest.fn().mockResolvedValue(undefined),
    cancelFinalizedVote: jest.fn().mockResolvedValue(undefined),
  };
}

function transactionManagerStub(): DatabaseTransactionManager {
  return { runInTransaction: jest.fn(async (work) => work()) };
}

import { BlockElectorCommand } from '../../../../src/application/command/dto/request/block-elector.command';
import { UpdateElectorCommand } from '../../../../src/application/command/dto/request/update-elector.command';
import { BlockElectorHandler } from '../../../../src/application/command/handler/block-elector.handler';
import { UpdateElectorHandler } from '../../../../src/application/command/handler/update-elector.handler';
import type { ElectorRepositoryPort } from '../../../../src/application/port/persistence/command/elector-repository.port';
import type { VoteRepositoryPort } from '../../../../src/application/port/persistence/command/vote-repository.port';
import { ElectorAggregate } from '../../../../src/domain/elector/elector.aggregate';
import { VoteAggregate } from '../../../../src/domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/domain/vote/type/vote-policy.type';
import { VotingChannel } from '../../../../src/domain/vote/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../../src/domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../src/domain/vote/vo/vote-policy.vo';

describe('snapshot-managed elector commands', () => {
  it('rejects direct updates and blocks for snapshot-derived electors', async () => {
    const voteRepository = createVoteRepository();
    const electorRepository = createElectorRepository();

    await expect(
      new UpdateElectorHandler(voteRepository, electorRepository).execute(
        UpdateElectorCommand.of({
          voteId: 'vote-1',
          electorId: 'elector-1',
          identifier: 'changed',
          voteWeight: 1,
        }),
      ),
    ).rejects.toThrow('managed by the attached electoral roll snapshot');
    await expect(
      new BlockElectorHandler(voteRepository, electorRepository).execute(
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

import { CreateElectorCommand } from '../../../../src/application/command/create-elector.command';
import { CreateElectorHandler } from '../../../../src/application/command/handler/create-elector.handler';
import { ElectorRepositoryPort } from '../../../../src/application/port/persistence/command/elector-repository.port';
import { ElectorAggregate } from '../../../../src/domain/elector/elector.aggregate';
import { ElectorStatus } from '../../../../src/domain/elector/type/elector-status.type';
import { VoteRepositoryPort } from '../../../../src/application/port/persistence/command/vote-repository.port';
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
    const handler = new CreateElectorHandler(voteRepository(), repository);

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
      new CreateElectorHandler(voteRepository('snapshot-1'), electors).execute(
        CreateElectorCommand.of({
          voteId: 'vote-1',
          name: 'Member',
          identifier: 'member-1',
        }),
      ),
    ).rejects.toThrow('managed by the attached electoral roll snapshot');
    expect((electors.save as jest.Mock).mock.calls).toHaveLength(0);
  });
});

function voteRepository(electoralRollSnapshotId?: string): VoteRepositoryPort {
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

  return {
    nextId: jest.fn(),
    findById: jest.fn().mockResolvedValue(vote),
    save: jest.fn(),
  };
}

import { CreateVoteCommand } from '../../../../src/application/command/create-vote.command';
import { CreateVoteHandler } from '../../../../src/application/command/handler/create-vote.handler';
import { ElectionCommissionRepositoryPort } from '../../../../src/application/port/persistence/command/election-commission-repository.port';
import { VoteRepositoryPort } from '../../../../src/application/port/persistence/command/vote-repository.port';
import { ElectionCommissionAggregate } from '../../../../src/domain/election-commission/election-commission.aggregate';
import { VoteAggregate } from '../../../../src/domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../../src/domain/vote/type/vote-status.type';
import { VotingChannel } from '../../../../src/domain/vote/type/voting-channel.type';

describe('CreateVoteHandler', () => {
  it('creates a draft vote and saves it through the repository', async () => {
    const save = jest
      .fn<Promise<void>, [VoteAggregate]>()
      .mockResolvedValue(undefined);
    const repository: VoteRepositoryPort = {
      nextId: jest.fn().mockReturnValue('vote-1'),
      findById: jest.fn().mockResolvedValue(undefined),
      save,
    };
    const commissionRepository: ElectionCommissionRepositoryPort = {
      nextId: jest.fn().mockReturnValue('commission-unused'),
      findById: jest.fn().mockResolvedValue(
        ElectionCommissionAggregate.create({
          id: 'commission-1',
          name: 'Main Commission',
          createdAt: new Date('2026-08-13T00:00:00.000Z'),
        }),
      ),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const handler = new CreateVoteHandler(repository, commissionRepository);

    const result = await handler.execute(
      CreateVoteCommand.of({
        commissionId: 'commission-1',
        title: 'Board election',
        votingChannels: [VotingChannel.Online, VotingChannel.Onsite],
        defaultPolicy: {
          privacyMode: PrivacyMode.Secret,
          participationUnit: ParticipationUnit.Individual,
          resultStorageMode: ResultStorageMode.Database,
          voteWeightMode: VoteWeightMode.Equal,
        },
        identityVerificationPolicy: {
          required: false,
        },
      }),
    );

    expect(result).toEqual({
      id: 'vote-1',
      commissionId: 'commission-1',
      status: VoteStatus.Draft,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBeInstanceOf(VoteAggregate);
    expect(save.mock.calls[0][0]).toMatchObject({
      id: 'vote-1',
      commissionId: 'commission-1',
      title: 'Board election',
      votingChannels: [VotingChannel.Online, VotingChannel.Onsite],
      status: VoteStatus.Draft,
    });
  });
});

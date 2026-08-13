import { CreateVoteCommand } from '../../../src/application/command/create-vote.command';
import { CreateVoteHandler } from '../../../src/application/command/create-vote.handler';
import { VoteRepositoryPort } from '../../../src/application/port/vote-repository.port';
import { VoteAggregate } from '../../../src/domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../src/domain/vote/type/vote-status.type';

describe('CreateVoteHandler', () => {
  it('creates a draft vote and saves it through the repository', async () => {
    const save = jest
      .fn<Promise<void>, [VoteAggregate]>()
      .mockResolvedValue(undefined);
    const repository: VoteRepositoryPort = {
      nextId: jest.fn().mockReturnValue('vote-1'),
      save,
    };
    const handler = new CreateVoteHandler(repository);

    const result = await handler.execute(
      CreateVoteCommand.of({
        title: 'Board election',
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
      status: VoteStatus.Draft,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBeInstanceOf(VoteAggregate);
    expect(save.mock.calls[0][0]).toMatchObject({
      id: 'vote-1',
      title: 'Board election',
      status: VoteStatus.Draft,
    });
  });
});

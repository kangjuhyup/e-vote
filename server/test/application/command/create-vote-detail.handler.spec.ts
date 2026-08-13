import { CreateVoteDetailCommand } from '../../../src/application/command/create-vote-detail.command';
import { CreateVoteDetailHandler } from '../../../src/application/command/create-vote-detail.handler';
import { VoteDetailRepositoryPort } from '../../../src/application/port/vote-detail-repository.port';
import { VoteDetailAggregate } from '../../../src/domain/vote/vote-detail.aggregate';
import { VoteDetailStatus } from '../../../src/domain/vote/type/vote-status.type';

describe('CreateVoteDetailHandler', () => {
  it('creates a draft vote detail and saves it through the repository', async () => {
    const save = jest
      .fn<Promise<void>, [VoteDetailAggregate]>()
      .mockResolvedValue(undefined);
    const repository: VoteDetailRepositoryPort = {
      nextId: jest.fn().mockReturnValue('vote-detail-1'),
      save,
    };
    const handler = new CreateVoteDetailHandler(repository);

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
});

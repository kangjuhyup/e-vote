import { CreateVoteDetailCommand } from '../../../../src/application/command/create-vote-detail.command';
import { CreateVoteDetailHandler } from '../../../../src/application/command/create-vote-detail.handler';
import { VoteDetailStatus } from '../../../../src/domain/vote/type/vote-status.type';
import { VoteDetailController } from '../../../../src/presentation/route/vote-detail/vote-detail.controller';

describe('VoteDetailController', () => {
  const createVoteDetailExecute = jest.fn<
    ReturnType<CreateVoteDetailHandler['execute']>,
    [CreateVoteDetailCommand]
  >();
  const createVoteDetailHandler = {
    execute: createVoteDetailExecute,
  } as unknown as jest.Mocked<CreateVoteDetailHandler>;

  let controller: VoteDetailController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VoteDetailController(createVoteDetailHandler);
  });

  it('maps PUT /votes/:voteId/sub-votes to create vote detail handler', async () => {
    createVoteDetailExecute.mockResolvedValue({
      id: 'vote-detail-1',
      voteId: 'vote-1',
      status: VoteDetailStatus.Draft,
    });

    const response = await controller.createVoteDetail(
      { voteId: 'vote-1' },
      {
        title: 'President',
        type: 'CANDIDATE',
        sortOrder: 0,
      },
    );

    expect(response).toEqual({
      id: 'vote-detail-1',
      voteId: 'vote-1',
      status: VoteDetailStatus.Draft,
    });
    expect(createVoteDetailExecute).toHaveBeenCalledTimes(1);
    expect(createVoteDetailExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      title: 'President',
      type: 'CANDIDATE',
    });
  });
});

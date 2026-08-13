import { CreateVoteHandler } from '../../../../src/application/command/create-vote.handler';
import { CreateVoteCommand } from '../../../../src/application/command/create-vote.command';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../../src/domain/vote/type/vote-status.type';
import { VoteController } from '../../../../src/presentation/route/vote/vote.controller';

describe('VoteController', () => {
  const createVoteExecute = jest.fn<
    ReturnType<CreateVoteHandler['execute']>,
    [CreateVoteCommand]
  >();
  const createVoteHandler = {
    execute: createVoteExecute,
  } as unknown as jest.Mocked<CreateVoteHandler>;

  let controller: VoteController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VoteController(createVoteHandler);
  });

  it('maps POST /votes to create vote command handler', async () => {
    createVoteExecute.mockResolvedValue({
      id: 'vote-1',
      status: VoteStatus.Draft,
    });

    const response = await controller.createVote({
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
    });

    expect(response).toEqual({
      id: 'vote-1',
      status: VoteStatus.Draft,
    });
    expect(createVoteExecute).toHaveBeenCalledTimes(1);
    expect(createVoteExecute.mock.calls[0][0]).toMatchObject({
      title: 'Board election',
    });
  });
});

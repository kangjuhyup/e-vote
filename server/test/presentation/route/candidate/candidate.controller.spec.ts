import { CreateCandidateCommand } from '../../../../src/application/command/create-candidate.command';
import { CreateCandidateHandler } from '../../../../src/application/command/create-candidate.handler';
import { CandidateStatus } from '../../../../src/domain/candidate/type/candidate-status.type';
import { CandidateController } from '../../../../src/presentation/route/candidate/candidate.controller';

describe('CandidateController', () => {
  const createCandidateExecute = jest.fn<
    ReturnType<CreateCandidateHandler['execute']>,
    [CreateCandidateCommand]
  >();
  const createCandidateHandler = {
    execute: createCandidateExecute,
  } as unknown as jest.Mocked<CreateCandidateHandler>;

  let controller: CandidateController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CandidateController(createCandidateHandler);
  });

  it('maps PUT /votes/:voteId/sub-votes/:voteDetailId/candidates to create candidate handler', async () => {
    createCandidateExecute.mockResolvedValue({
      id: 'candidate-1',
      voteDetailId: 'vote-detail-1',
      status: CandidateStatus.Active,
    });

    const response = await controller.createCandidate(
      {
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
      },
      {
        candidateNo: 1,
        name: 'Kim',
      },
    );

    expect(response).toEqual({
      id: 'candidate-1',
      voteDetailId: 'vote-detail-1',
      status: CandidateStatus.Active,
    });
    expect(createCandidateExecute).toHaveBeenCalledTimes(1);
    expect(createCandidateExecute.mock.calls[0][0]).toMatchObject({
      voteDetailId: 'vote-detail-1',
      candidateNo: 1,
      name: 'Kim',
    });
  });
});

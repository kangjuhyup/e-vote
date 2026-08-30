import { CreateCandidateCommand } from '../../../../src/application/command/dto/request/create-candidate.command';
import { CreateCandidateHandler } from '../../../../src/application/command/handler/create-candidate.handler';
import { CandidateRepositoryPort } from '../../../../src/application/port/persistence/command/candidate-repository.port';
import { CandidateAggregate } from '../../../../src/domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../../../src/domain/candidate/type/candidate-status.type';

describe('CreateCandidateHandler', () => {
  it('creates an active candidate and saves it through the repository', async () => {
    const save = jest
      .fn<Promise<void>, [CandidateAggregate]>()
      .mockResolvedValue(undefined);
    const repository: CandidateRepositoryPort = {
      nextId: jest.fn().mockReturnValue('candidate-1'),
      save,
    };
    const handler = new CreateCandidateHandler(repository);

    const result = await handler.execute(
      CreateCandidateCommand.of({
        voteDetailId: 'vote-detail-1',
        candidateNo: 1,
        name: 'Kim',
      }),
    );

    expect(result).toEqual({
      id: 'candidate-1',
      voteDetailId: 'vote-detail-1',
      status: CandidateStatus.Active,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBeInstanceOf(CandidateAggregate);
    expect(save.mock.calls[0][0]).toMatchObject({
      id: 'candidate-1',
      voteDetailId: 'vote-detail-1',
      candidateNo: 1,
      name: 'Kim',
      status: CandidateStatus.Active,
    });
  });
});

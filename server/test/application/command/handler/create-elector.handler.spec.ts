import { CreateElectorCommand } from '../../../../src/application/command/create-elector.command';
import { CreateElectorHandler } from '../../../../src/application/command/handler/create-elector.handler';
import { ElectorRepositoryPort } from '../../../../src/application/port/persistence/command/elector-repository.port';
import { ElectorAggregate } from '../../../../src/domain/elector/elector.aggregate';
import { ElectorStatus } from '../../../../src/domain/elector/type/elector-status.type';

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
    const handler = new CreateElectorHandler(repository);

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
});

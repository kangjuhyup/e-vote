import type { ElectoralRollReadRepositoryPort } from '../../../../src/application/port/persistence/query/electoral-roll-read-repository.port';
import { GetElectoralRollQuery } from '../../../../src/application/query/get-electoral-roll.query';
import { GetElectoralRollHandler } from '../../../../src/application/query/handler/get-electoral-roll.handler';
import { ElectoralRollView } from '../../../../src/application/query/view/electoral-roll.view';

describe('GetElectoralRollHandler', () => {
  it('returns the dedicated electoral roll read model', async () => {
    const view = ElectoralRollView.of({
      id: 'roll-1',
      commissionId: 'commission-1',
      name: 'Members',
      revision: 2,
      members: [],
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
      updatedAt: new Date('2026-08-30T01:00:00.000Z'),
    });
    const repository: ElectoralRollReadRepositoryPort = {
      findDetailById: jest.fn().mockResolvedValue(view),
    };

    await expect(
      new GetElectoralRollHandler(repository).execute(
        GetElectoralRollQuery.of({ electoralRollId: 'roll-1' }),
      ),
    ).resolves.toBe(view);
  });

  it('throws for a missing electoral roll', async () => {
    const repository: ElectoralRollReadRepositoryPort = {
      findDetailById: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      new GetElectoralRollHandler(repository).execute(
        GetElectoralRollQuery.of({ electoralRollId: 'missing' }),
      ),
    ).rejects.toThrow('electoral roll not found');
  });
});

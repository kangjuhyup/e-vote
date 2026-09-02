import type { ElectoralRollReadRepositoryPort } from '../../../../src/modules/electoral-roll/application/port/persistence/query/electoral-roll-read-repository.port';
import { GetElectoralRollQuery } from '../../../../src/modules/electoral-roll/application/query/dto/request/get-electoral-roll.query';
import { GetElectoralRollPageQuery } from '../../../../src/modules/electoral-roll/application/query/dto/request/get-electoral-roll-page.query';
import { GetElectoralRollHandler } from '../../../../src/modules/electoral-roll/application/query/handler/get-electoral-roll.handler';
import { GetElectoralRollPageHandler } from '../../../../src/modules/electoral-roll/application/query/handler/get-electoral-roll-page.handler';
import {
  ElectoralRollPageView,
  ElectoralRollView,
} from '../../../../src/modules/electoral-roll/application/query/dto/response/electoral-roll.view';

describe('GetElectoralRollHandler', () => {
  it('returns the dedicated electoral roll read model', async () => {
    const view = ElectoralRollView.of({
      id: 'roll-1',
      name: 'Members',
      revision: 2,
      members: [],
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
      updatedAt: new Date('2026-08-30T01:00:00.000Z'),
    });
    const findDetailById = jest.fn().mockResolvedValue(view);
    const repository: ElectoralRollReadRepositoryPort = {
      findDetailById,
      findPage: jest.fn(),
    };

    await expect(
      new GetElectoralRollHandler(repository).execute(
        GetElectoralRollQuery.of({
          userPrincipalId: 'user-1',
          electoralRollId: 'roll-1',
        }),
      ),
    ).resolves.toBe(view);
    expect(findDetailById).toHaveBeenCalledWith('roll-1', 'user-1');
  });

  it('throws for a missing electoral roll', async () => {
    const repository: ElectoralRollReadRepositoryPort = {
      findDetailById: jest.fn().mockResolvedValue(undefined),
      findPage: jest.fn(),
    };

    await expect(
      new GetElectoralRollHandler(repository).execute(
        GetElectoralRollQuery.of({
          userPrincipalId: 'user-1',
          electoralRollId: 'missing',
        }),
      ),
    ).rejects.toThrow('electoral roll not found');
  });
});

describe('GetElectoralRollPageHandler', () => {
  it('normalizes filters and delegates an authorized page request', async () => {
    const page = ElectoralRollPageView.of({
      items: [],
      page: 1,
      pageSize: 100,
      totalItems: 0,
      totalPages: 0,
    });
    const findPage = jest.fn().mockResolvedValue(page);
    const repository: ElectoralRollReadRepositoryPort = {
      findDetailById: jest.fn(),
      findPage,
    };
    const query = GetElectoralRollPageQuery.of({
      userPrincipalId: 'user-1',
      query: '  상반기  ',
      page: 0,
      pageSize: 101,
    });

    await expect(
      new GetElectoralRollPageHandler(repository).execute(query),
    ).resolves.toBe(page);
    expect(findPage).toHaveBeenCalledWith({
      userPrincipalId: 'user-1',
      query: '상반기',
      page: 1,
      pageSize: 100,
    });
  });
});

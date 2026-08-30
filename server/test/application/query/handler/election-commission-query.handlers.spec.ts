import type { ElectionCommissionReadRepositoryPort } from '../../../../src/application/port/persistence/query/election-commission-read-repository.port';
import {
  ElectionCommissionNotFoundError,
  GetElectionCommissionHandler,
} from '../../../../src/application/query/handler/get-election-commission.handler';
import { GetElectionCommissionPageHandler } from '../../../../src/application/query/handler/get-election-commission-page.handler';
import { GetElectionCommissionPageQuery } from '../../../../src/application/query/get-election-commission-page.query';
import { GetElectionCommissionQuery } from '../../../../src/application/query/get-election-commission.query';
import {
  ElectionCommissionPageView,
  ElectionCommissionView,
} from '../../../../src/application/query/view/election-commission.view';
import { ElectionCommissionStatus } from '../../../../src/domain/election-commission/type/election-commission-status.type';

describe('election commission query handlers', () => {
  it('loads an election commission detail through the read repository', async () => {
    const commission = createElectionCommissionView();
    const findDetailById = jest.fn().mockResolvedValue(commission);
    const repository: ElectionCommissionReadRepositoryPort = {
      findDetailById,
      findPage: jest.fn().mockResolvedValue(createElectionCommissionPageView()),
    };

    await expect(
      new GetElectionCommissionHandler(repository).execute(
        GetElectionCommissionQuery.of({ commissionId: 'commission-1' }),
      ),
    ).resolves.toBe(commission);
    expect(findDetailById).toHaveBeenCalledWith('commission-1');
  });

  it('throws when an election commission detail is missing', async () => {
    const repository: ElectionCommissionReadRepositoryPort = {
      findDetailById: jest.fn().mockResolvedValue(undefined),
      findPage: jest.fn().mockResolvedValue(createElectionCommissionPageView()),
    };

    await expect(
      new GetElectionCommissionHandler(repository).execute(
        GetElectionCommissionQuery.of({ commissionId: 'missing-commission' }),
      ),
    ).rejects.toBeInstanceOf(ElectionCommissionNotFoundError);
  });

  it('loads a normalized election commission page', async () => {
    const page = createElectionCommissionPageView();
    const findPage = jest.fn().mockResolvedValue(page);
    const repository: ElectionCommissionReadRepositoryPort = {
      findDetailById: jest
        .fn()
        .mockResolvedValue(createElectionCommissionView()),
      findPage,
    };

    await expect(
      new GetElectionCommissionPageHandler(repository).execute(
        GetElectionCommissionPageQuery.of({ page: 0, pageSize: 101 }),
      ),
    ).resolves.toBe(page);
    expect(findPage).toHaveBeenCalledWith({ page: 1, pageSize: 100 });
  });
});

const now = new Date('2026-08-30T00:00:00.000Z');

function createElectionCommissionView(): ElectionCommissionView {
  return ElectionCommissionView.of({
    id: 'commission-1',
    name: 'Main Commission',
    status: ElectionCommissionStatus.Active,
    members: [],
    createdAt: now,
    updatedAt: now,
  });
}

function createElectionCommissionPageView(): ElectionCommissionPageView {
  return ElectionCommissionPageView.of({
    items: [createElectionCommissionView()],
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  });
}

import { NotFoundException } from '@nestjs/common';
import {
  ElectorPageView,
  ElectorView,
} from '../../../../src/modules/elector/application/query/dto/response/elector.view';
import {
  ElectorNotFoundError,
  GetElectorHandler,
} from '../../../../src/modules/elector/application/query/handler/get-elector.handler';
import { GetElectorQuery } from '../../../../src/modules/elector/application/query/dto/request/get-elector.query';
import { GetElectorPageHandler } from '../../../../src/modules/elector/application/query/handler/get-elector-page.handler';
import { GetElectorPageQuery } from '../../../../src/modules/elector/application/query/dto/request/get-elector-page.query';
import { ElectorStatus } from '../../../../src/shared/domain/voting/type/elector-status.type';
import { ElectorReadController } from '../../../../src/modules/elector/presentation/elector/elector-read.controller';

describe('ElectorReadController', () => {
  const getElectorExecute = jest.fn<
    ReturnType<GetElectorHandler['execute']>,
    [GetElectorQuery]
  >();
  const getElectorHandler = {
    execute: getElectorExecute,
  } as unknown as jest.Mocked<GetElectorHandler>;
  const getElectorPageExecute = jest.fn<
    ReturnType<GetElectorPageHandler['execute']>,
    [GetElectorPageQuery]
  >();
  const getElectorPageHandler = {
    execute: getElectorPageExecute,
  } as unknown as jest.Mocked<GetElectorPageHandler>;

  let controller: ElectorReadController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ElectorReadController(
      getElectorHandler,
      getElectorPageHandler,
    );
  });

  it('maps GET /votes/:voteId/electors to get elector page handler', async () => {
    getElectorPageExecute.mockResolvedValue(
      ElectorPageView.of({
        items: [createElectorView()],
        page: 2,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
      }),
    );

    const response = await controller.getElectorPage(
      { voteId: 'vote-1' },
      {
        page: '2',
        pageSize: '10',
      },
    );

    expect(response).toMatchObject({
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
      items: [
        {
          id: 'elector-1',
          voteId: 'vote-1',
          name: 'Kim Min Su',
          identifier: 'member-1',
          identityVerified: true,
          participated: true,
          participatedAt: '2026-08-13T00:30:00.000Z',
          createdAt: '2026-08-13T00:00:00.000Z',
        },
      ],
    });
    expect(getElectorPageExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      page: 2,
      pageSize: 10,
    });
  });

  it('maps GET /votes/:voteId/electors/:electorId to get elector handler', async () => {
    getElectorExecute.mockResolvedValue(createElectorView());

    const response = await controller.getElector({
      voteId: 'vote-1',
      electorId: 'elector-1',
    });

    expect(response).toMatchObject({
      id: 'elector-1',
      voteId: 'vote-1',
      name: 'Kim Min Su',
      identifier: 'member-1',
      phoneNumber: '010-1234-5678',
      birthDate: '1990-01-31',
      groupKey: 'group-1',
      voteWeight: 2,
      status: ElectorStatus.Eligible,
      identityVerified: true,
      participated: true,
      participatedAt: '2026-08-13T00:30:00.000Z',
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T01:00:00.000Z',
    });
    expect(response).not.toHaveProperty('selectedCandidateId');
    expect(getElectorExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      electorId: 'elector-1',
    });
  });

  it('maps missing elector to 404', async () => {
    getElectorExecute.mockRejectedValue(new ElectorNotFoundError());

    await expect(
      controller.getElector({
        voteId: 'vote-1',
        electorId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createElectorView(): ElectorView {
  return ElectorView.of({
    id: 'elector-1',
    voteId: 'vote-1',
    name: 'Kim Min Su',
    identifier: 'member-1',
    phoneNumber: '010-1234-5678',
    birthDate: '1990-01-31',
    groupKey: 'group-1',
    voteWeight: 2,
    status: ElectorStatus.Eligible,
    identityVerified: true,
    participated: true,
    participatedAt: new Date('2026-08-13T00:30:00.000Z'),
    createdAt: new Date('2026-08-13T00:00:00.000Z'),
    updatedAt: new Date('2026-08-13T01:00:00.000Z'),
  });
}

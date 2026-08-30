import { NotFoundException } from '@nestjs/common';
import {
  ElectionCommissionNotFoundError,
  GetElectionCommissionHandler,
} from '../../../../src/application/query/handler/get-election-commission.handler';
import { GetElectionCommissionPageHandler } from '../../../../src/application/query/handler/get-election-commission-page.handler';
import { GetElectionCommissionPageQuery } from '../../../../src/application/query/get-election-commission-page.query';
import { GetElectionCommissionQuery } from '../../../../src/application/query/get-election-commission.query';
import {
  ElectionCommissionMemberView,
  ElectionCommissionPageView,
  ElectionCommissionView,
} from '../../../../src/application/query/view/election-commission.view';
import { ElectionCommissionMemberRole } from '../../../../src/domain/election-commission/type/election-commission-member-role.type';
import { ElectionCommissionMemberStatus } from '../../../../src/domain/election-commission/type/election-commission-member-status.type';
import { ElectionCommissionStatus } from '../../../../src/domain/election-commission/type/election-commission-status.type';
import { maskDecoratedPersonalData } from '../../../../src/presentation/common/serializer/mask-personal-data';
import { ElectionCommissionReadController } from '../../../../src/presentation/route/election-commission/election-commission-read.controller';

describe('ElectionCommissionReadController', () => {
  const getElectionCommissionExecute = jest.fn<
    ReturnType<GetElectionCommissionHandler['execute']>,
    [GetElectionCommissionQuery]
  >();
  const getElectionCommissionHandler = {
    execute: getElectionCommissionExecute,
  } as unknown as jest.Mocked<GetElectionCommissionHandler>;
  const getElectionCommissionPageExecute = jest.fn<
    ReturnType<GetElectionCommissionPageHandler['execute']>,
    [GetElectionCommissionPageQuery]
  >();
  const getElectionCommissionPageHandler = {
    execute: getElectionCommissionPageExecute,
  } as unknown as jest.Mocked<GetElectionCommissionPageHandler>;

  let controller: ElectionCommissionReadController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ElectionCommissionReadController(
      getElectionCommissionHandler,
      getElectionCommissionPageHandler,
    );
  });

  it('maps GET /election-commissions to the page query handler', async () => {
    getElectionCommissionPageExecute.mockResolvedValue(
      ElectionCommissionPageView.of({
        items: [createElectionCommissionView()],
        page: 2,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
      }),
    );

    const response = await controller.getElectionCommissionPage({
      page: '2',
      pageSize: '10',
    });

    expect(response).toMatchObject({
      items: [
        {
          id: 'commission-1',
          name: 'Main Commission',
          status: ElectionCommissionStatus.Active,
          createdAt: '2026-08-30T00:00:00.000Z',
          updatedAt: '2026-08-30T01:00:00.000Z',
        },
      ],
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    });
    expect(response.items[0]).not.toHaveProperty('members');
    expect(getElectionCommissionPageExecute.mock.calls[0][0]).toMatchObject({
      page: 2,
      pageSize: 10,
    });
  });

  it('maps GET /election-commissions/:commissionId to detail handler', async () => {
    getElectionCommissionExecute.mockResolvedValue(
      createElectionCommissionView(),
    );

    const response = await controller.getElectionCommission({
      commissionId: 'commission-1',
    });

    expect(response).toMatchObject({
      id: 'commission-1',
      name: 'Main Commission',
      status: ElectionCommissionStatus.Active,
      members: [
        {
          id: 'member-1',
          commissionId: 'commission-1',
          name: 'Kim Admin',
          role: ElectionCommissionMemberRole.Admin,
          status: ElectionCommissionMemberStatus.Active,
          registeredAt: '2026-08-30T00:01:00.000Z',
          updatedAt: '2026-08-30T01:01:00.000Z',
        },
      ],
    });
    expect(getElectionCommissionExecute.mock.calls[0][0]).toMatchObject({
      commissionId: 'commission-1',
    });
    expect(maskDecoratedPersonalData(response)).toMatchObject({
      members: [{ name: 'K*******n' }],
    });
  });

  it('maps a missing election commission to 404', async () => {
    getElectionCommissionExecute.mockRejectedValue(
      new ElectionCommissionNotFoundError(),
    );

    await expect(
      controller.getElectionCommission({ commissionId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createElectionCommissionView(): ElectionCommissionView {
  return ElectionCommissionView.of({
    id: 'commission-1',
    name: 'Main Commission',
    status: ElectionCommissionStatus.Active,
    members: [
      ElectionCommissionMemberView.of({
        id: 'member-1',
        commissionId: 'commission-1',
        name: 'Kim Admin',
        role: ElectionCommissionMemberRole.Admin,
        status: ElectionCommissionMemberStatus.Active,
        registeredAt: new Date('2026-08-30T00:01:00.000Z'),
        updatedAt: new Date('2026-08-30T01:01:00.000Z'),
      }),
    ],
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
    updatedAt: new Date('2026-08-30T01:00:00.000Z'),
  });
}

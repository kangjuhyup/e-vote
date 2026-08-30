import { TEST_USER_PRINCIPAL } from '../../user-principal.fixture';
import { CreateElectionCommissionCommand } from '../../../../src/modules/election-commission/application/command/dto/request/create-election-commission.command';
import { CreateElectionCommissionHandler } from '../../../../src/modules/election-commission/application/command/handler/create-election-commission.handler';
import { RegisterElectionCommissionMemberCommand } from '../../../../src/modules/election-commission/application/command/dto/request/register-election-commission-member.command';
import { RegisterElectionCommissionMemberHandler } from '../../../../src/modules/election-commission/application/command/handler/register-election-commission-member.handler';
import { ElectionCommissionStatus } from '../../../../src/modules/election-commission/domain/type/election-commission-status.type';
import { ElectionCommissionMemberStatus } from '../../../../src/modules/election-commission/domain/type/election-commission-member-status.type';
import { ElectionCommissionController } from '../../../../src/modules/election-commission/presentation/election-commission/election-commission.controller';

describe('ElectionCommissionController', () => {
  const createElectionCommissionExecute = jest.fn<
    ReturnType<CreateElectionCommissionHandler['execute']>,
    [CreateElectionCommissionCommand]
  >();
  const registerMemberExecute = jest.fn<
    ReturnType<RegisterElectionCommissionMemberHandler['execute']>,
    [RegisterElectionCommissionMemberCommand]
  >();
  const createElectionCommissionHandler = {
    execute: createElectionCommissionExecute,
  } as unknown as jest.Mocked<CreateElectionCommissionHandler>;
  const registerMemberHandler = {
    execute: registerMemberExecute,
  } as unknown as jest.Mocked<RegisterElectionCommissionMemberHandler>;

  let controller: ElectionCommissionController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ElectionCommissionController(
      createElectionCommissionHandler,
      registerMemberHandler,
    );
  });

  it('maps POST /election-commissions to create election commission handler', async () => {
    createElectionCommissionExecute.mockResolvedValue({
      id: 'commission-1',
      status: ElectionCommissionStatus.Active,
    });

    const response = await controller.createElectionCommission(
      TEST_USER_PRINCIPAL,
      {
        name: 'Main Commission',
      },
    );

    expect(response).toEqual({
      id: 'commission-1',
      status: ElectionCommissionStatus.Active,
    });
    expect(createElectionCommissionExecute).toHaveBeenCalledTimes(1);
    expect(createElectionCommissionExecute.mock.calls[0][0]).toMatchObject({
      name: 'Main Commission',
    });
    expect(
      createElectionCommissionExecute.mock.calls[0][0].createdAt,
    ).toBeInstanceOf(Date);
  });

  it('maps POST /election-commissions/:commissionId/members to register member handler', async () => {
    registerMemberExecute.mockResolvedValue({
      id: 'member-1',
      commissionId: 'commission-1',
      status: ElectionCommissionMemberStatus.Active,
    });

    const response = await controller.registerElectionCommissionMember(
      TEST_USER_PRINCIPAL,
      { commissionId: 'commission-1' },
      {
        name: 'Kim Manager',
        role: 'FIELD_MANAGER',
      },
    );

    expect(response).toEqual({
      id: 'member-1',
      commissionId: 'commission-1',
      status: ElectionCommissionMemberStatus.Active,
    });
    expect(registerMemberExecute).toHaveBeenCalledTimes(1);
    expect(registerMemberExecute.mock.calls[0][0]).toMatchObject({
      commissionId: 'commission-1',
      name: 'Kim Manager',
      role: 'FIELD_MANAGER',
    });
    expect(registerMemberExecute.mock.calls[0][0].registeredAt).toBeInstanceOf(
      Date,
    );
  });
});

import { AuthenticateElectorCommand } from '../../../../src/application/command/authenticate-elector.command';
import { AuthenticateElectorHandler } from '../../../../src/application/command/handler/authenticate-elector.handler';
import { CreateElectorCommand } from '../../../../src/application/command/create-elector.command';
import { CreateElectorHandler } from '../../../../src/application/command/handler/create-elector.handler';
import { ElectorStatus } from '../../../../src/domain/elector/type/elector-status.type';
import { DomainError } from '../../../../src/domain/shared/domain-error';
import { ElectorController } from '../../../../src/presentation/route/elector/elector.controller';

describe('ElectorController', () => {
  const createElectorExecute = jest.fn<
    ReturnType<CreateElectorHandler['execute']>,
    [CreateElectorCommand]
  >();
  const authenticateElectorExecute = jest.fn<
    ReturnType<AuthenticateElectorHandler['execute']>,
    [AuthenticateElectorCommand]
  >();
  const createElectorHandler = {
    execute: createElectorExecute,
  } as unknown as jest.Mocked<CreateElectorHandler>;
  const authenticateElectorHandler = {
    execute: authenticateElectorExecute,
  } as unknown as jest.Mocked<AuthenticateElectorHandler>;

  let controller: ElectorController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ElectorController(
      createElectorHandler,
      authenticateElectorHandler,
    );
  });

  it('maps PUT /votes/:voteId/electors to create elector handler', async () => {
    createElectorExecute.mockResolvedValue({
      id: 'elector-1',
      voteId: 'vote-1',
      name: 'Kim Min Su',
      phoneNumber: '010-1234-5678',
      birthDate: '1990-01-31',
      status: ElectorStatus.Eligible,
    });

    const response = await controller.createElector(
      { voteId: 'vote-1' },
      {
        name: 'Kim Min Su',
        identifier: 'member-1',
        phoneNumber: '010-1234-5678',
        birthDate: '1990-01-31',
        groupKey: 'group-1',
        voteWeight: 2,
      },
    );

    expect(response).toEqual({
      id: 'elector-1',
      voteId: 'vote-1',
      name: 'Kim Min Su',
      phoneNumber: '010-1234-5678',
      birthDate: '1990-01-31',
      status: ElectorStatus.Eligible,
    });
    expect(createElectorExecute).toHaveBeenCalledTimes(1);
    expect(createElectorExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      name: 'Kim Min Su',
      identifier: 'member-1',
      phoneNumber: '010-1234-5678',
      birthDate: '1990-01-31',
      groupKey: 'group-1',
      voteWeight: 2,
    });
  });

  it('maps an inconsistent group vote weight to HTTP 409', async () => {
    createElectorExecute.mockRejectedValue(
      new DomainError(
        'electors in the same group must have the same vote weight',
      ),
    );

    await expect(
      controller.createElector(
        { voteId: 'vote-1' },
        {
          name: 'Kim Min Su',
          identifier: 'member-1',
          groupKey: 'group-1',
          voteWeight: 2,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps PUT /votes/:voteId/electors/:electorId/authentication to authenticate elector handler', async () => {
    authenticateElectorExecute.mockResolvedValue({
      id: 'elector-1',
      voteId: 'vote-1',
      identityVerified: true,
    });

    const response = await controller.authenticateElector(
      {
        voteId: 'vote-1',
        electorId: 'elector-1',
      },
      {
        provider: 'PASS',
        transactionId: 'tx-1',
        verifiedAt: '2026-08-13T00:00:00.000Z',
      },
    );

    expect(response).toEqual({
      id: 'elector-1',
      voteId: 'vote-1',
      identityVerified: true,
    });
    expect(authenticateElectorExecute).toHaveBeenCalledTimes(1);
    expect(authenticateElectorExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      electorId: 'elector-1',
      provider: 'PASS',
      transactionId: 'tx-1',
      verifiedAt: new Date('2026-08-13T00:00:00.000Z'),
    });
  });
});
import { ConflictException } from '@nestjs/common';

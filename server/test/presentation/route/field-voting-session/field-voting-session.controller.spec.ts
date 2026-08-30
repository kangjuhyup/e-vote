import { CancelFieldVotingSessionCommand } from '../../../../src/modules/field-voting/application/command/dto/request/cancel-field-voting-session.command';
import { CancelFieldVotingSessionHandler } from '../../../../src/modules/field-voting/application/command/handler/cancel-field-voting-session.handler';
import { CloseFieldVotingSessionCommand } from '../../../../src/modules/field-voting/application/command/dto/request/close-field-voting-session.command';
import { CloseFieldVotingSessionHandler } from '../../../../src/modules/field-voting/application/command/handler/close-field-voting-session.handler';
import { CreateFieldVotingSessionCommand } from '../../../../src/modules/field-voting/application/command/dto/request/create-field-voting-session.command';
import { CreateFieldVotingSessionHandler } from '../../../../src/modules/field-voting/application/command/handler/create-field-voting-session.handler';
import { OpenFieldVotingSessionCommand } from '../../../../src/modules/field-voting/application/command/dto/request/open-field-voting-session.command';
import { OpenFieldVotingSessionHandler } from '../../../../src/modules/field-voting/application/command/handler/open-field-voting-session.handler';
import { FieldVotingSessionStatus } from '../../../../src/shared/domain/voting/type/field-voting-session-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { FieldVotingSessionController } from '../../../../src/modules/field-voting/presentation/field-voting-session/field-voting-session.controller';

describe('FieldVotingSessionController', () => {
  const createExecute = jest.fn<
    ReturnType<CreateFieldVotingSessionHandler['execute']>,
    [CreateFieldVotingSessionCommand]
  >();
  const openExecute = jest.fn<
    ReturnType<OpenFieldVotingSessionHandler['execute']>,
    [OpenFieldVotingSessionCommand]
  >();
  const closeExecute = jest.fn<
    ReturnType<CloseFieldVotingSessionHandler['execute']>,
    [CloseFieldVotingSessionCommand]
  >();
  const cancelExecute = jest.fn<
    ReturnType<CancelFieldVotingSessionHandler['execute']>,
    [CancelFieldVotingSessionCommand]
  >();
  const createHandler = {
    execute: createExecute,
  } as unknown as jest.Mocked<CreateFieldVotingSessionHandler>;
  const openHandler = {
    execute: openExecute,
  } as unknown as jest.Mocked<OpenFieldVotingSessionHandler>;
  const closeHandler = {
    execute: closeExecute,
  } as unknown as jest.Mocked<CloseFieldVotingSessionHandler>;
  const cancelHandler = {
    execute: cancelExecute,
  } as unknown as jest.Mocked<CancelFieldVotingSessionHandler>;

  let controller: FieldVotingSessionController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FieldVotingSessionController(
      createHandler,
      openHandler,
      closeHandler,
      cancelHandler,
    );
  });

  it('maps POST /votes/:voteId/field-voting-sessions to create handler', async () => {
    createExecute.mockResolvedValue({
      id: 'session-1',
      voteId: 'vote-1',
      status: FieldVotingSessionStatus.Scheduled,
    });

    const response = await controller.createFieldVotingSession(
      { voteId: 'vote-1' },
      {
        commissionId: 'commission-1',
        channel: VotingChannel.Onsite,
        title: 'Lobby voting desk',
        locationName: 'Main Lobby',
        address: 'Seoul Office',
        managerIds: ['member-1'],
        startsAt: '2026-08-20T00:00:00.000Z',
        endsAt: '2026-08-20T09:00:00.000Z',
      },
    );

    expect(response).toEqual({
      id: 'session-1',
      voteId: 'vote-1',
      status: FieldVotingSessionStatus.Scheduled,
    });
    expect(createExecute).toHaveBeenCalledTimes(1);
    expect(createExecute.mock.calls[0][0]).toMatchObject({
      commissionId: 'commission-1',
      voteId: 'vote-1',
      channel: VotingChannel.Onsite,
      title: 'Lobby voting desk',
      managerIds: ['member-1'],
      startsAt: new Date('2026-08-20T00:00:00.000Z'),
      endsAt: new Date('2026-08-20T09:00:00.000Z'),
    });
    expect(createExecute.mock.calls[0][0].scheduledAt).toBeInstanceOf(Date);
  });

  it('maps status change routes to their handlers', async () => {
    openExecute.mockResolvedValue({
      id: 'session-1',
      status: FieldVotingSessionStatus.Open,
    });
    closeExecute.mockResolvedValue({
      id: 'session-1',
      status: FieldVotingSessionStatus.Closed,
    });
    cancelExecute.mockResolvedValue({
      id: 'session-1',
      status: FieldVotingSessionStatus.Canceled,
    });

    await expect(
      controller.openFieldVotingSession(
        { fieldVotingSessionId: 'session-1' },
        { changedAt: '2026-08-20T00:00:00.000Z' },
      ),
    ).resolves.toEqual({
      id: 'session-1',
      status: FieldVotingSessionStatus.Open,
    });
    await expect(
      controller.closeFieldVotingSession(
        { fieldVotingSessionId: 'session-1' },
        { changedAt: '2026-08-20T09:00:00.000Z' },
      ),
    ).resolves.toEqual({
      id: 'session-1',
      status: FieldVotingSessionStatus.Closed,
    });
    await expect(
      controller.cancelFieldVotingSession(
        { fieldVotingSessionId: 'session-1' },
        { changedAt: '2026-08-20T03:00:00.000Z' },
      ),
    ).resolves.toEqual({
      id: 'session-1',
      status: FieldVotingSessionStatus.Canceled,
    });

    expect(openExecute.mock.calls[0][0]).toMatchObject({
      fieldVotingSessionId: 'session-1',
      openedAt: new Date('2026-08-20T00:00:00.000Z'),
    });
    expect(closeExecute.mock.calls[0][0]).toMatchObject({
      fieldVotingSessionId: 'session-1',
      closedAt: new Date('2026-08-20T09:00:00.000Z'),
    });
    expect(cancelExecute.mock.calls[0][0]).toMatchObject({
      fieldVotingSessionId: 'session-1',
      canceledAt: new Date('2026-08-20T03:00:00.000Z'),
    });
  });
});

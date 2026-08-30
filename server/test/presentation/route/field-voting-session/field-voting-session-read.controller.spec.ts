import { NotFoundException } from '@nestjs/common';
import { GetFieldVotingSessionPageHandler } from '../../../../src/modules/field-voting/application/query/handler/get-field-voting-session-page.handler';
import {
  FieldVotingSessionReadNotFoundError,
  GetFieldVotingSessionHandler,
} from '../../../../src/modules/field-voting/application/query/handler/get-field-voting-session.handler';
import {
  FieldVotingSessionPageView,
  FieldVotingSessionView,
} from '../../../../src/modules/field-voting/application/query/dto/response/field-voting-session.view';
import { FieldVotingSessionStatus } from '../../../../src/shared/domain/voting/type/field-voting-session-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { FieldVotingSessionReadController } from '../../../../src/modules/field-voting/presentation/field-voting-session/field-voting-session-read.controller';

describe('FieldVotingSessionReadController', () => {
  const get = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<GetFieldVotingSessionHandler>;
  const getPage = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<GetFieldVotingSessionPageHandler>;
  const controller = new FieldVotingSessionReadController(get, getPage);

  beforeEach(() => jest.clearAllMocks());

  it('maps list and detail responses with ISO timestamps', async () => {
    const session = createSession();
    get.execute.mockResolvedValue(session);
    getPage.execute.mockResolvedValue(
      FieldVotingSessionPageView.of({
        items: [session],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      }),
    );

    const detail = await controller.getFieldVotingSession({
      fieldVotingSessionId: 'session-1',
    });
    const page = await controller.getFieldVotingSessionPage(
      { voteId: 'vote-1' },
      {},
    );
    expect(detail).toMatchObject({
      id: 'session-1',
      startsAt: '2026-08-30T00:00:00.000Z',
    });
    expect(page.items[0]).toMatchObject({ managerIds: ['member-1'] });
  });

  it('maps missing detail to 404', async () => {
    get.execute.mockRejectedValue(new FieldVotingSessionReadNotFoundError());
    await expect(
      controller.getFieldVotingSession({ fieldVotingSessionId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createSession(): FieldVotingSessionView {
  return FieldVotingSessionView.of({
    id: 'session-1',
    commissionId: 'commission-1',
    voteId: 'vote-1',
    channel: VotingChannel.Onsite,
    title: 'Lobby',
    locationName: 'Main Lobby',
    address: 'Seoul',
    managerIds: ['member-1'],
    startsAt: new Date('2026-08-30T00:00:00.000Z'),
    endsAt: new Date('2026-08-30T09:00:00.000Z'),
    status: FieldVotingSessionStatus.Scheduled,
    createdAt: new Date('2026-08-29T00:00:00.000Z'),
    updatedAt: new Date('2026-08-29T00:00:00.000Z'),
  });
}

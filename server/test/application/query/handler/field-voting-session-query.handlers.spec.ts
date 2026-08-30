import type { FieldVotingSessionReadRepositoryPort } from '../../../../src/modules/field-voting/application/port/persistence/query/field-voting-session-read-repository.port';
import { GetFieldVotingSessionPageHandler } from '../../../../src/modules/field-voting/application/query/handler/get-field-voting-session-page.handler';
import {
  FieldVotingSessionReadNotFoundError,
  GetFieldVotingSessionHandler,
} from '../../../../src/modules/field-voting/application/query/handler/get-field-voting-session.handler';
import { GetFieldVotingSessionPageQuery } from '../../../../src/modules/field-voting/application/query/dto/request/get-field-voting-session-page.query';
import { GetFieldVotingSessionQuery } from '../../../../src/modules/field-voting/application/query/dto/request/get-field-voting-session.query';
import {
  FieldVotingSessionPageView,
  FieldVotingSessionView,
} from '../../../../src/modules/field-voting/application/query/dto/response/field-voting-session.view';
import { FieldVotingSessionStatus } from '../../../../src/shared/domain/voting/type/field-voting-session-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';

describe('field voting session query handlers', () => {
  it('loads detail and a normalized vote-scoped page', async () => {
    const session = createSession();
    const page = FieldVotingSessionPageView.of({
      items: [session],
      page: 1,
      pageSize: 100,
      totalItems: 1,
      totalPages: 1,
    });
    const findPage = jest.fn().mockResolvedValue(page);
    const repository: FieldVotingSessionReadRepositoryPort = {
      findDetailById: jest.fn().mockResolvedValue(session),
      findPage,
    };

    await expect(
      new GetFieldVotingSessionHandler(repository).execute(
        GetFieldVotingSessionQuery.of({ fieldVotingSessionId: 'session-1' }),
      ),
    ).resolves.toBe(session);
    await expect(
      new GetFieldVotingSessionPageHandler(repository).execute(
        GetFieldVotingSessionPageQuery.of({
          voteId: 'vote-1',
          page: 0,
          pageSize: 101,
        }),
      ),
    ).resolves.toBe(page);
    expect(findPage).toHaveBeenCalledWith({
      voteId: 'vote-1',
      page: 1,
      pageSize: 100,
    });
  });

  it('throws when detail is missing', async () => {
    const repository: FieldVotingSessionReadRepositoryPort = {
      findDetailById: jest.fn().mockResolvedValue(undefined),
      findPage: jest.fn(),
    };
    await expect(
      new GetFieldVotingSessionHandler(repository).execute(
        GetFieldVotingSessionQuery.of({ fieldVotingSessionId: 'missing' }),
      ),
    ).rejects.toBeInstanceOf(FieldVotingSessionReadNotFoundError);
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

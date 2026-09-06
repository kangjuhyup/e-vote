import { CastParticipationWithAccessCommand } from '../../../../src/modules/participation/application/command/dto/request/cast-participation-with-access.command';
import { CastParticipationWithAccessHandler } from '../../../../src/modules/participation/application/command/handler/cast-participation-with-access.handler';
import type { AuthorizedParticipationCastPort } from '../../../../src/shared/application/port/capability/participant-operations.port';
import type { ResolveParticipationAccessSessionHandler } from '../../../../src/modules/participation/application/query/handler/resolve-participation-access-session.handler';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';

/* eslint-disable @typescript-eslint/unbound-method -- Jest verifies injected method mocks without invoking an unbound implementation. */

describe('CastParticipationWithAccessHandler', () => {
  it('derives vote and elector from the session and fixes the channel to ONLINE', async () => {
    const sessions = {
      execute: jest.fn().mockResolvedValue({
        sessionId: 'session-1',
        invitationId: 'invitation-1',
        voteId: 'vote-1',
        electorId: 'elector-1',
        scope: 'PARTICIPATE',
      }),
    } as unknown as jest.Mocked<ResolveParticipationAccessSessionHandler>;
    const casting = {
      cast: jest.fn().mockResolvedValue({
        id: 'participation-1',
        voteDetailId: 'detail-1',
        status: 'CAST',
      }),
    } satisfies jest.Mocked<AuthorizedParticipationCastPort>;
    const transactions = {
      runInTransaction: jest.fn(async (work: () => Promise<unknown>) => work()),
    } satisfies jest.Mocked<DatabaseTransactionManager>;
    const handler = new CastParticipationWithAccessHandler(
      sessions,
      casting,
      transactions,
    );

    const result = await handler.execute(
      CastParticipationWithAccessCommand.of({
        sessionToken: 'session-token',
        csrfToken: 'csrf-token',
        voteDetailId: 'detail-1',
        selectedCandidateId: 'candidate-1',
      }),
      new Date('2026-09-06T12:00:00.000Z'),
    );

    expect(sessions.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionToken: 'session-token',
        csrfToken: 'csrf-token',
        expectedScope: 'PARTICIPATE',
        requireCsrf: true,
      }),
    );
    expect(casting.cast).toHaveBeenCalledWith({
      voteId: 'vote-1',
      electorId: 'elector-1',
      voteDetailId: 'detail-1',
      selectedCandidateId: 'candidate-1',
      votingChannel: 'ONLINE',
      fieldVotingSessionId: undefined,
      participatedAt: new Date('2026-09-06T12:00:00.000Z'),
    });
    expect(result).toEqual({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      status: 'CAST',
    });
  });
});

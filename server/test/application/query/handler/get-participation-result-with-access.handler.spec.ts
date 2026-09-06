import { GetParticipationResultWithAccessHandler } from '../../../../src/modules/participation/application/query/handler/get-participation-result-with-access.handler';
import type { ResolveParticipationAccessSessionHandler } from '../../../../src/modules/participation/application/query/handler/resolve-participation-access-session.handler';
import type { GetVoteResultHandler } from '../../../../src/modules/participation/application/query/handler/get-vote-result.handler';

/* eslint-disable @typescript-eslint/unbound-method -- Jest verifies injected method mocks without invoking an unbound implementation. */

describe('GetParticipationResultWithAccessHandler', () => {
  it('derives the parent vote from a result-read session', async () => {
    const sessions = {
      execute: jest.fn().mockResolvedValue({
        sessionId: 'session-1',
        invitationId: 'invitation-1',
        voteId: 'vote-1',
        electorId: 'elector-1',
        scope: 'RESULT_READ',
      }),
    } as unknown as jest.Mocked<ResolveParticipationAccessSessionHandler>;
    const results = {
      execute: jest.fn().mockResolvedValue({
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
        candidates: [],
        votingChannels: [],
      }),
    } as unknown as jest.Mocked<GetVoteResultHandler>;
    const handler = new GetParticipationResultWithAccessHandler(
      sessions,
      results,
    );

    await handler.execute({
      sessionToken: 'session-token',
      voteDetailId: 'detail-1',
    });

    expect(sessions.execute).toHaveBeenCalledWith({
      sessionToken: 'session-token',
      expectedScope: 'RESULT_READ',
      requireCsrf: false,
    });
    expect(results.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
      }),
    );
  });
});

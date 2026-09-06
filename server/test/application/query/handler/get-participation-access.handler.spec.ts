import { GetParticipationAccessHandler } from '../../../../src/modules/participation/application/query/handler/get-participation-access.handler';

describe('GetParticipationAccessHandler', () => {
  it('returns ballot actions and a refresh-safe CSRF token from the live session', async () => {
    const resolve = {
      execute: jest.fn().mockResolvedValue({
        voteId: 'vote-1',
        electorId: 'elector-1',
        scope: 'PARTICIPATE',
      }),
    };
    const reads = {
      findBallot: jest.fn().mockResolvedValue({
        vote: {
          id: 'vote-1',
          title: 'Vote',
          description: '',
          status: 'OPEN',
          startedAt: new Date('2026-09-06T00:00:00Z'),
          endedAt: new Date('2026-09-07T00:00:00Z'),
        },
        hasConfirmedSignature: true,
        voteDetails: [],
      }),
    };
    const tokens = { deriveCsrfToken: jest.fn().mockReturnValue('csrf-token') };
    const handler = new GetParticipationAccessHandler(
      resolve as never,
      reads,
      tokens as never,
    );

    await expect(handler.execute('session-token')).resolves.toMatchObject({
      scope: 'PARTICIPATE',
      csrfToken: 'csrf-token',
      permittedActions: {
        uploadSignature: true,
        participate: true,
        readResults: false,
      },
    });
    expect(reads.findBallot).toHaveBeenCalledWith('vote-1', 'elector-1');
    expect(tokens.deriveCsrfToken).toHaveBeenCalledWith('session-token');
  });
});

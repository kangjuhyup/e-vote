import { describe, expect, it, vi } from 'vitest';

import { createParticipationInvitationApiClient } from '@/features/votes/api/participation-invitation-api';

function response(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
    status: 201,
  });
}

describe('participation invitation API', () => {
  it('dispatches all invitations and returns counts without links or phone numbers', async () => {
    const result = { queuedCount: 8, skippedCount: 2, totalCount: 10 };
    const fetcher = vi.fn().mockResolvedValue(response(result));
    const client = createParticipationInvitationApiClient({ baseUrl: '/api', fetcher, mode: 'live' });
    await expect(client.dispatch({ voteId: 'vote/id' })).resolves.toEqual(result);
    expect(fetcher).toHaveBeenCalledWith(
      '/api/votes/vote%2Fid/participation-invitation-dispatches',
      expect.objectContaining({ body: '{}', method: 'POST' }),
    );
  });

  it('reissues one elector link without a request body', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ queuedCount: 1, skippedCount: 0, totalCount: 1 }));
    const client = createParticipationInvitationApiClient({ baseUrl: '/api', fetcher, mode: 'live' });
    await client.reissue({ voteId: 'vote/id', electorId: 'elector/id' });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/votes/vote%2Fid/electors/elector%2Fid/participation-invitation/reissue',
      expect.objectContaining({ body: undefined, method: 'POST' }),
    );
  });

  it('loads the development-only participation link without caching it', async () => {
    const result = {
      electorId: 'elector/id',
      participationUrl: 'http://localhost:3001/participate#access_token=secret-reference',
    };
    const fetcher = vi.fn().mockResolvedValue(response(result));
    const client = createParticipationInvitationApiClient({ baseUrl: '/api', fetcher, mode: 'live' });

    await expect(
      client.getDevelopmentLink({ voteId: 'vote/id', electorId: 'elector/id' }),
    ).resolves.toEqual(result);
    expect(fetcher).toHaveBeenCalledWith(
      '/api/votes/vote%2Fid/electors/elector%2Fid/development-participation-link',
      expect.objectContaining({ cache: 'no-store', method: 'GET' }),
    );
  });
});

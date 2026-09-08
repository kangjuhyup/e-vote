import { describe, expect, it, vi } from 'vitest';

import { createParticipationInvitationApiClient } from '@/features/votes/api/participation-invitation-api';

function response(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
    status: 201,
  });
}

describe('participation invitation API', () => {
  it('loads the development-only participation link without caching it', async () => {
    const result = {
      electorId: 'elector/id',
      participationUrl: 'http://localhost:3001/participate#access_token=secret-reference',
    };
    const fetcher = vi.fn().mockResolvedValue(response(result));
    const client = createParticipationInvitationApiClient({ baseUrl: '/api', fetcher, mode: 'live' });

    await expect(
      client.getDevelopmentLink({
        dispatchId: 'dispatch/id',
        voteId: 'vote/id',
        electorId: 'elector/id',
      }),
    ).resolves.toEqual(result);
    expect(fetcher).toHaveBeenCalledWith(
      '/api/votes/vote%2Fid/sms/dispatches/dispatch%2Fid/electors/elector%2Fid/development-participation-link',
      expect.objectContaining({ cache: 'no-store', method: 'GET' }),
    );
  });
});

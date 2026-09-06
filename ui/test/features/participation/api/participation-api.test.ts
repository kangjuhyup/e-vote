import { afterEach, describe, expect, it, vi } from 'vitest';
import { participationApi } from '@/features/participation/api/participation-api';

describe('participationApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sends the capability only in the dedicated header and derives elector context server-side', async () => {
    vi.stubEnv('NEXT_PUBLIC_VOTE_API_MODE', 'live');
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: 'participation-1' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetcher);

    await participationApi.cast({
      token: 'sensitive-capability',
      voteDetailId: '22222222-2222-4222-8222-222222222222',
      selectedCandidateId: '33333333-3333-4333-8333-333333333333',
    });

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain('sensitive-capability');
    expect(init.headers).toMatchObject({ 'X-Participation-Token': 'sensitive-capability' });
    expect(JSON.parse(String(init.body))).toEqual({
      voteDetailId: '22222222-2222-4222-8222-222222222222',
      selectedCandidateId: '33333333-3333-4333-8333-333333333333',
    });
  });
});

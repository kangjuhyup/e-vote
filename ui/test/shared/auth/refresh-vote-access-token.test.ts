import { afterEach, describe, expect, it, vi } from 'vitest';

import { refreshVoteAccessToken } from '@/shared/auth/refresh-vote-access-token';

describe('refreshVoteAccessToken', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exchanges a refresh token without exposing it in the URL', async () => {
    vi.stubEnv('AUTH_OIDC_ISSUER', 'https://auth.example.test/');
    vi.stubEnv('AUTH_OIDC_TENANT_CODE', 'tenant one');
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        access_token: 'new-access-token',
        expires_in: 3600,
        refresh_token: 'rotated-refresh-token',
      }),
    );

    const result = await refreshVoteAccessToken(
      {
        sub: 'user-1',
        voteAccessToken: 'expired-token',
        voteAccessTokenExpiresAt: 1_600_000_000,
        voteRefreshToken: 'refresh-token',
      },
      { fetcher, now: () => 1_700_000_000_000 },
    );

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://auth.example.test/t/tenant%20one/oidc/token');
    expect(url).not.toContain('refresh-token');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('content-type')).toBe(
      'application/x-www-form-urlencoded',
    );
    expect(String(init.body)).toBe(
      'grant_type=refresh_token&refresh_token=refresh-token&resource=https%3A%2F%2Fvote-api.example.com&client_id=e-vote',
    );
    expect(result).toMatchObject({
      voteAccessToken: 'new-access-token',
      voteAccessTokenExpiresAt: 1_700_003_600,
      voteRefreshToken: 'rotated-refresh-token',
    });
  });

  it('fails closed when the token endpoint rejects the refresh token', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ error: 'invalid_grant' }, { status: 400 }),
    );

    await expect(
      refreshVoteAccessToken(
        { sub: 'user-1', voteRefreshToken: 'revoked-refresh-token' },
        { fetcher },
      ),
    ).rejects.toThrow('OIDC_REFRESH_FAILED_400');
  });
});

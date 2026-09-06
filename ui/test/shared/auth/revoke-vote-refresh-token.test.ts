import { afterEach, describe, expect, it, vi } from 'vitest';

import { revokeVoteRefreshToken } from '@/shared/auth/revoke-vote-refresh-token';

describe('revokeVoteRefreshToken', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('revokes the refresh token as the public e-vote client', async () => {
    vi.stubEnv('AUTH_OIDC_ISSUER', 'https://auth.example.test/');
    vi.stubEnv('AUTH_OIDC_TENANT_CODE', 'tenant one');
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    await revokeVoteRefreshToken(
      { voteRefreshToken: 'refresh-token' },
      { fetcher },
    );

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://auth.example.test/t/tenant%20one/oidc/token/revocation',
    );
    expect(new Headers(init.headers).has('authorization')).toBe(false);
    expect(String(init.body)).toBe(
      'token=refresh-token&token_type_hint=refresh_token&client_id=e-vote',
    );
  });

  it('does not contact the provider without a refresh token', async () => {
    const fetcher = vi.fn();

    await revokeVoteRefreshToken({}, { fetcher });

    expect(fetcher).not.toHaveBeenCalled();
  });
});

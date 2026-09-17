import { afterEach, describe, expect, it, vi } from 'vitest';

const nextAuthMock = vi.hoisted(() =>
  vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
);

vi.mock('next-auth', () => ({ default: nextAuthMock }));

import { authConfig } from '@/shared/auth/auth';
import { createEVoteOidcProvider } from '@/shared/auth/oidc';

describe('Auth.js OIDC configuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses ID-token claims and requests offline access for the Vote API resource', () => {
    const provider = createEVoteOidcProvider({});

    expect(provider.idToken).toBe(true);
    expect(provider.authorization?.params).toMatchObject({
      prompt: 'consent',
      resource: 'https://vote-api.example.com',
      scope: 'openid profile email offline_access groups tenant_roles',
    });
    expect(provider.client?.token_endpoint_auth_method).toBe('none');
  });

  it('keeps Vote tokens out of the browser-visible session', async () => {
    const session = await authConfig.callbacks?.session?.({
      session: { user: { name: 'Voter' }, expires: '2099-01-01' },
      token: {
        voteAccessToken: 'private-access-token',
        voteRefreshToken: 'private-refresh-token',
        voteAccessTokenExpiresAt: 4_000_000_000,
      },
    } as never);

    expect(session).toMatchObject({ voteApiAuthStatus: 'ready' });
    expect(JSON.stringify(session)).not.toContain('private-access-token');
    expect(JSON.stringify(session)).not.toContain('private-refresh-token');
  });

  it('revokes the server-side refresh token during Auth.js sign-out', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetcher);

    await authConfig.events?.signOut?.({
      token: { voteRefreshToken: 'refresh-token' },
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('/token/revocation');
  });
});

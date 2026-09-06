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
      scope: 'openid profile email offline_access',
    });
    expect(provider.client?.token_endpoint_auth_method).toBe('none');
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

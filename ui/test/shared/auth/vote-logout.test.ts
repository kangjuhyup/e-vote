import { describe, expect, it } from 'vitest';

import { buildVoteEndSessionUrl } from '@/shared/auth/vote-logout';

describe('buildVoteEndSessionUrl', () => {
  it('uses the exact configured production web origin', () => {
    const environment = {
      NODE_ENV: 'production',
      AUTH_OIDC_ISSUER: 'https://auth.rvkang.app',
      AUTH_OIDC_TENANT_CODE: 'e-vote',
      AUTH_URL: 'https://vote.rvkang.app',
    };
    const url = new URL(buildVoteEndSessionUrl(environment));

    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(
      'https://vote.rvkang.app',
    );
    const adminUrl = new URL(
      buildVoteEndSessionUrl({
        ...environment,
        AUTH_URL: 'https://vote-admin.rvkang.app',
      }),
    );
    expect(adminUrl.searchParams.get('post_logout_redirect_uri')).toBe(
      'https://vote-admin.rvkang.app',
    );
    expect(() =>
      buildVoteEndSessionUrl({
        ...environment,
        AUTH_CLIENT_POST_LOGOUT_URI: 'https://vote-admin.rvkang.app',
      }),
    ).toThrow('AUTH_CLIENT_POST_LOGOUT_URI');
  });
  it('targets the tenant logout endpoint for the public e-vote client', () => {
    const url = new URL(
      buildVoteEndSessionUrl({
        AUTH_OIDC_ISSUER: 'https://auth.example.test/',
        AUTH_OIDC_TENANT_CODE: 'tenant one',
        AUTH_URL: 'https://vote.example.test/path',
      }),
    );

    expect(`${url.origin}${url.pathname}`).toBe(
      'https://auth.example.test/t/tenant%20one/oidc/session/end',
    );
    expect(url.searchParams.get('client_id')).toBe('e-vote');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(
      'https://vote.example.test',
    );
  });
});

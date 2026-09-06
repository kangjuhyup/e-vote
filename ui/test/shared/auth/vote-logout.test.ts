import { describe, expect, it } from 'vitest';

import { buildVoteEndSessionUrl } from '@/shared/auth/vote-logout';

describe('buildVoteEndSessionUrl', () => {
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

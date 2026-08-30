import { describe, expect, it } from 'vitest';

import {
  getVoteAccessToken,
  persistVoteAccessToken,
} from '@/shared/auth/vote-session-token';

describe('vote session token', () => {
  it('stores an OIDC access token only in the encrypted Auth.js JWT', () => {
    expect(
      persistVoteAccessToken(
        { sub: 'user-1', name: 'Kim' },
        { access_token: 'access-token', expires_at: 1_800_000_000 },
      ),
    ).toEqual({
      sub: 'user-1',
      name: 'Kim',
      voteAccessToken: 'access-token',
      voteAccessTokenExpiresAt: 1_800_000_000,
    });
  });

  it('preserves the token when no new OIDC account is supplied', () => {
    const token = {
      sub: 'user-1',
      voteAccessToken: 'access-token',
      voteAccessTokenExpiresAt: 1_800_000_000,
    };

    expect(persistVoteAccessToken(token)).toBe(token);
  });

  it('returns only a non-expired access token', () => {
    expect(
      getVoteAccessToken(
        {
          voteAccessToken: 'access-token',
          voteAccessTokenExpiresAt: 1_800_000_000,
        },
        1_700_000_000_000,
      ),
    ).toBe('access-token');

    expect(
      getVoteAccessToken(
        {
          voteAccessToken: 'expired-token',
          voteAccessTokenExpiresAt: 1_600_000_000,
        },
        1_700_000_000_000,
      ),
    ).toBeUndefined();
  });
});

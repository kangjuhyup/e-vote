import { describe, expect, it } from 'vitest';

import {
  getVoteApiAuthStatus,
  getVoteAccessToken,
  invalidateVoteSessionToken,
  mergeRefreshedVoteTokens,
  persistVoteAccessToken,
} from '@/shared/auth/vote-session-token';

describe('vote session token', () => {
  it('stores an OIDC access token only in the encrypted Auth.js JWT', () => {
    expect(
      persistVoteAccessToken(
        { sub: 'user-1', name: 'Kim' },
        {
          access_token: 'access-token',
          expires_at: 1_800_000_000,
          refresh_token: 'refresh-token',
        },
      ),
    ).toEqual({
      sub: 'user-1',
      name: 'Kim',
      voteAccessToken: 'access-token',
      voteAccessTokenExpiresAt: 1_800_000_000,
      voteRefreshToken: 'refresh-token',
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

  it('keeps a rotated refresh token when the provider omits a replacement', () => {
    expect(
      mergeRefreshedVoteTokens(
        {
          sub: 'user-1',
          voteAccessToken: 'expired-token',
          voteAccessTokenExpiresAt: 1_600_000_000,
          voteRefreshToken: 'current-refresh-token',
        },
        {
          access_token: 'new-access-token',
          expires_at: 1_800_000_000,
        },
      ),
    ).toMatchObject({
      voteAccessToken: 'new-access-token',
      voteAccessTokenExpiresAt: 1_800_000_000,
      voteRefreshToken: 'current-refresh-token',
    });
  });

  it('distinguishes ready, refreshable, and unrecoverable sessions', () => {
    const now = 1_700_000_000_000;

    expect(
      getVoteApiAuthStatus(
        {
          voteAccessToken: 'access-token',
          voteAccessTokenExpiresAt: 1_800_000_000,
        },
        now,
      ),
    ).toBe('ready');
    expect(
      getVoteApiAuthStatus(
        {
          voteAccessToken: 'expired-token',
          voteAccessTokenExpiresAt: 1_600_000_000,
          voteRefreshToken: 'refresh-token',
        },
        now,
      ),
    ).toBe('refresh-required');
    expect(
      getVoteApiAuthStatus(
        {
          voteAccessToken: 'expired-token',
          voteAccessTokenExpiresAt: 1_600_000_000,
        },
        now,
      ),
    ).toBe('reauth-required');
  });

  it('removes credentials after refresh failure', () => {
    expect(
      invalidateVoteSessionToken({
        sub: 'user-1',
        voteAccessToken: 'access-token',
        voteAccessTokenExpiresAt: 1_800_000_000,
        voteRefreshToken: 'refresh-token',
      }),
    ).toEqual({
      sub: 'user-1',
      voteAuthError: 'RefreshAccessTokenError',
    });
  });
});

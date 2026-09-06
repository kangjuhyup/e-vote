type AuthSessionToken = Record<string, unknown>;

type OidcAccountToken = {
  readonly access_token?: string;
  readonly expires_at?: number;
  readonly refresh_token?: string;
} | null;

export type VoteApiAuthStatus =
  | 'ready'
  | 'refresh-required'
  | 'reauth-required';

export type VoteSessionToken = AuthSessionToken & {
  readonly voteAccessToken?: string;
  readonly voteAccessTokenExpiresAt?: number;
  readonly voteRefreshToken?: string;
  readonly voteAuthError?: 'RefreshAccessTokenError';
};

export function persistVoteAccessToken<T extends AuthSessionToken>(
  token: T,
  account?: OidcAccountToken,
): T | (T & VoteSessionToken) {
  if (account === undefined || account === null) {
    return token;
  }

  const nextToken = { ...token } as T & {
    voteAccessToken?: string;
    voteAccessTokenExpiresAt?: number;
    voteRefreshToken?: string;
    voteAuthError?: 'RefreshAccessTokenError';
  };

  delete nextToken.voteAccessToken;
  delete nextToken.voteAccessTokenExpiresAt;
  delete nextToken.voteRefreshToken;
  delete nextToken.voteAuthError;

  if (typeof account.access_token === 'string' && account.access_token) {
    nextToken.voteAccessToken = account.access_token;
  }
  if (typeof account.expires_at === 'number') {
    nextToken.voteAccessTokenExpiresAt = account.expires_at;
  }
  if (typeof account.refresh_token === 'string' && account.refresh_token) {
    nextToken.voteRefreshToken = account.refresh_token;
  }

  return nextToken;
}

export function mergeRefreshedVoteTokens<T extends AuthSessionToken>(
  token: T,
  response: NonNullable<OidcAccountToken>,
): T & VoteSessionToken {
  const nextToken = { ...token } as T & {
    voteAccessToken?: string;
    voteAccessTokenExpiresAt?: number;
    voteRefreshToken?: string;
    voteAuthError?: 'RefreshAccessTokenError';
  };

  delete nextToken.voteAuthError;
  nextToken.voteAccessToken = response.access_token;
  nextToken.voteAccessTokenExpiresAt = response.expires_at;
  if (typeof response.refresh_token === 'string' && response.refresh_token) {
    nextToken.voteRefreshToken = response.refresh_token;
  }

  return nextToken;
}

export function invalidateVoteSessionToken<T extends AuthSessionToken>(
  token: T,
): T & VoteSessionToken {
  const nextToken = { ...token } as T & {
    voteAccessToken?: string;
    voteAccessTokenExpiresAt?: number;
    voteRefreshToken?: string;
    voteAuthError?: 'RefreshAccessTokenError';
  };

  delete nextToken.voteAccessToken;
  delete nextToken.voteAccessTokenExpiresAt;
  delete nextToken.voteRefreshToken;
  nextToken.voteAuthError = 'RefreshAccessTokenError';

  return nextToken;
}

export function getVoteRefreshToken(
  token: AuthSessionToken | null,
): string | undefined {
  return token && typeof token.voteRefreshToken === 'string'
    ? token.voteRefreshToken
    : undefined;
}

export function getVoteApiAuthStatus(
  token: AuthSessionToken | null,
  nowMilliseconds = Date.now(),
): VoteApiAuthStatus {
  if (!token || token.voteAuthError === 'RefreshAccessTokenError') {
    return 'reauth-required';
  }

  const expiresAt = token.voteAccessTokenExpiresAt;
  const hasAccessToken = typeof token.voteAccessToken === 'string';
  const isExpired =
    typeof expiresAt !== 'number' ||
    expiresAt <= Math.floor(nowMilliseconds / 1000);

  if (hasAccessToken && !isExpired) {
    return 'ready';
  }

  return getVoteRefreshToken(token)
    ? 'refresh-required'
    : 'reauth-required';
}

export function getVoteAccessToken(
  token: AuthSessionToken | null,
  nowMilliseconds = Date.now(),
): string | undefined {
  if (!token || typeof token.voteAccessToken !== 'string') {
    return undefined;
  }

  if (
    typeof token.voteAccessTokenExpiresAt === 'number' &&
    token.voteAccessTokenExpiresAt <= Math.floor(nowMilliseconds / 1000)
  ) {
    return undefined;
  }

  return token.voteAccessToken;
}

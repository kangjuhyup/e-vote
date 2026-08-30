type AuthSessionToken = Record<string, unknown>;

type OidcAccountToken = {
  readonly access_token?: string;
  readonly expires_at?: number;
} | null;

export type VoteSessionToken = AuthSessionToken & {
  readonly voteAccessToken?: string;
  readonly voteAccessTokenExpiresAt?: number;
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
  };

  delete nextToken.voteAccessToken;
  delete nextToken.voteAccessTokenExpiresAt;

  if (typeof account.access_token === 'string' && account.access_token) {
    nextToken.voteAccessToken = account.access_token;
  }
  if (typeof account.expires_at === 'number') {
    nextToken.voteAccessTokenExpiresAt = account.expires_at;
  }

  return nextToken;
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

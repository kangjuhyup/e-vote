import {
  E_VOTE_CLIENT_ID,
  getTenantOidcIssuer,
  getVoteApiResource,
} from '@/shared/auth/oidc';
import {
  getVoteRefreshToken,
  mergeRefreshedVoteTokens,
  type VoteSessionToken,
} from '@/shared/auth/vote-session-token';

type AuthSessionToken = Record<string, unknown>;
type TokenFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface RefreshVoteAccessTokenOptions {
  fetcher?: TokenFetcher;
  now?: () => number;
}

interface TokenEndpointResponse {
  access_token?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
}

function createTokenRequest(refreshToken: string): RequestInit {
  const clientSecret =
    process.env.AUTH_E_VOTE_SECRET ?? process.env.AUTH_E_VOTE_CLIENT_SECRET;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    resource: getVoteApiResource(),
  });
  const headers = new Headers({
    'content-type': 'application/x-www-form-urlencoded',
  });

  if (clientSecret) {
    headers.set(
      'authorization',
      `Basic ${Buffer.from(`${E_VOTE_CLIENT_ID}:${clientSecret}`).toString('base64')}`,
    );
  } else {
    body.set('client_id', E_VOTE_CLIENT_ID);
  }

  return {
    method: 'POST',
    headers,
    body,
  };
}

export async function refreshVoteAccessToken<T extends AuthSessionToken>(
  token: T,
  options: RefreshVoteAccessTokenOptions = {},
): Promise<T & VoteSessionToken> {
  const refreshToken = getVoteRefreshToken(token);
  if (!refreshToken) {
    throw new Error('OIDC_REFRESH_TOKEN_MISSING');
  }

  const response = await (options.fetcher ?? fetch)(
    `${getTenantOidcIssuer()}/token`,
    createTokenRequest(refreshToken),
  );
  if (!response.ok) {
    throw new Error(`OIDC_REFRESH_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as TokenEndpointResponse;
  if (
    typeof payload.access_token !== 'string' ||
    !payload.access_token ||
    typeof payload.expires_in !== 'number' ||
    !Number.isFinite(payload.expires_in) ||
    payload.expires_in <= 0
  ) {
    throw new Error('OIDC_REFRESH_RESPONSE_INVALID');
  }

  const nowSeconds = Math.floor((options.now ?? Date.now)() / 1000);
  return mergeRefreshedVoteTokens(token, {
    access_token: payload.access_token,
    expires_at: nowSeconds + Math.floor(payload.expires_in),
    refresh_token:
      typeof payload.refresh_token === 'string' && payload.refresh_token
        ? payload.refresh_token
        : undefined,
  });
}

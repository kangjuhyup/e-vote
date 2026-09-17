import {
  E_VOTE_CLIENT_ID,
  getEVoteClientSecret,
  getTenantOidcIssuer,
} from '@/shared/auth/oidc';
import { getVoteRefreshToken } from '@/shared/auth/vote-session-token';

type AuthSessionToken = Record<string, unknown>;
type TokenFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface RevokeVoteRefreshTokenOptions {
  fetcher?: TokenFetcher;
}

function createRevocationRequest(refreshToken: string): RequestInit {
  const clientSecret = getEVoteClientSecret();
  const body = new URLSearchParams({
    token: refreshToken,
    token_type_hint: 'refresh_token',
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

  return { method: 'POST', headers, body };
}

export async function revokeVoteRefreshToken(
  token: AuthSessionToken | null,
  options: RevokeVoteRefreshTokenOptions = {},
): Promise<void> {
  const refreshToken = getVoteRefreshToken(token);
  if (!refreshToken) return;

  const response = await (options.fetcher ?? fetch)(
    `${getTenantOidcIssuer()}/token/revocation`,
    createRevocationRequest(refreshToken),
  );
  if (!response.ok) {
    throw new Error(`OIDC_REVOCATION_FAILED_${response.status}`);
  }
}

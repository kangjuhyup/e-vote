import {
  E_VOTE_CLIENT_ID,
  getTenantOidcIssuer,
  getVoteWebOrigin,
} from '@/shared/auth/oidc';

type AuthEnvironment = Readonly<Record<string, string | undefined>>;

function getPostLogoutRedirectUri(environment: AuthEnvironment): string {
  const configured = environment.AUTH_CLIENT_POST_LOGOUT_URI ?? getVoteWebOrigin(environment);
  const url = new URL(configured);

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new TypeError('Post-logout redirect URI must be an HTTP(S) URL');
  }

  if (
    environment.NODE_ENV === 'production' &&
    (url.origin !== getVoteWebOrigin(environment) ||
      url.pathname !== '/' ||
      url.search ||
      url.hash)
  ) {
    throw new TypeError('AUTH_CLIENT_POST_LOGOUT_URI must match AUTH_URL origin');
  }
  return url.origin;
}

export function buildVoteEndSessionUrl(
  environment: AuthEnvironment = process.env,
): string {
  const url = new URL(`${getTenantOidcIssuer(environment)}/session/end`);
  url.searchParams.set('client_id', E_VOTE_CLIENT_ID);
  url.searchParams.set(
    'post_logout_redirect_uri',
    getPostLogoutRedirectUri(environment),
  );
  return url.toString();
}

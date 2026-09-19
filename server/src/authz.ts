import { createAuthzHttpServer } from './platform/authentication/authz-http-server';
import { requireAuthzAssertionKey } from './platform/authentication/authz-assertion';
import { OidcAccessTokenVerifierAdapter } from './platform/authentication/oidc-access-token-verifier.adapter';
import { OidcAuthenticationConfig } from './platform/authentication/oidc-authentication.config';
import { createOidcTokenIntrospector } from './platform/authentication/oidc-token-introspector';

const config = OidcAuthenticationConfig.fromEnvironment();
const verifier = new OidcAccessTokenVerifierAdapter(
  config,
  createOidcTokenIntrospector(config),
);
const server = createAuthzHttpServer(verifier, requireAuthzAssertionKey());
const port = Number(process.env.VOTE_AUTHZ_PORT ?? 3005);
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new TypeError('VOTE_AUTHZ_PORT must be a valid port');
}
server.listen(port, process.env.VOTE_AUTHZ_HOST ?? '0.0.0.0');

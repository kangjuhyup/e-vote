import {
  AccessTokenVerificationUnavailableError,
  InvalidAccessTokenError,
} from '../../shared/application/port/security/access-token-verifier.port';
import type { OidcAuthenticationConfig } from './oidc-authentication.config';
import { OidcIntrospectTokenResult } from './oidc-introspect-token.result';

export const OIDC_TOKEN_INTROSPECTOR = Symbol('OIDC_TOKEN_INTROSPECTOR');

export type OidcTokenIntrospector = (
  accessToken: string,
) => Promise<OidcIntrospectTokenResult>;

type Fetcher = (
  input: string | URL | globalThis.Request,
  init?: RequestInit,
) => Promise<Response>;

type CurrentTime = () => number;

function encodeFormComponent(value: string): string {
  return new URLSearchParams({ value }).toString().slice('value='.length);
}

function createBasicAuthorization(config: OidcAuthenticationConfig): string {
  const clientId = encodeFormComponent(config.introspectionClientId);
  const clientSecret = encodeFormComponent(config.introspectionClientSecret);
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

function assertValidForVoteApi(
  result: OidcIntrospectTokenResult,
  config: OidcAuthenticationConfig,
  currentTime: CurrentTime,
): void {
  const now = Math.floor(currentTime() / 1_000);
  if (
    !result.active ||
    !result.subject ||
    !result.tenantId ||
    result.issuer !== config.issuer ||
    !result.audience.includes(config.audience) ||
    result.expiresAt === undefined ||
    result.expiresAt <= now ||
    (result.notBefore !== undefined && result.notBefore > now)
  ) {
    throw new InvalidAccessTokenError();
  }
}

export function createOidcTokenIntrospector(
  config: OidcAuthenticationConfig,
  fetcher: Fetcher = fetch,
  currentTime: CurrentTime = Date.now,
): OidcTokenIntrospector {
  return async (accessToken: string): Promise<OidcIntrospectTokenResult> => {
    if (accessToken.trim().length === 0) {
      throw new InvalidAccessTokenError();
    }

    let response: Response;
    try {
      response = await fetcher(config.introspectionUri, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: createBasicAuthorization(config),
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: accessToken,
          token_type_hint: 'access_token',
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch {
      throw new AccessTokenVerificationUnavailableError();
    }

    if (!response.ok) {
      throw new AccessTokenVerificationUnavailableError();
    }

    let result: OidcIntrospectTokenResult;
    try {
      const payload: unknown = await response.json();
      result = OidcIntrospectTokenResult.of(payload);
    } catch {
      throw new AccessTokenVerificationUnavailableError();
    }

    assertValidForVoteApi(result, config, currentTime);
    return result;
  };
}

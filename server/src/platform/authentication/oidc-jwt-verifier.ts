import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { OidcAuthenticationConfig } from './oidc-authentication.config';

export const OIDC_JWT_VERIFIER = Symbol('OIDC_JWT_VERIFIER');

export type OidcJwtVerifier = (accessToken: string) => Promise<JWTPayload>;

export function createOidcJwtVerifier(
  config: OidcAuthenticationConfig,
): OidcJwtVerifier {
  const remoteJwks = createRemoteJWKSet(new URL(config.jwksUri));

  return async (accessToken: string): Promise<JWTPayload> => {
    const { payload } = await jwtVerify(accessToken, remoteJwks, {
      algorithms: ['RS256'],
      issuer: config.issuer,
      audience: config.audience,
    });

    return payload;
  };
}

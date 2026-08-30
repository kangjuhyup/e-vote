import { Inject, Injectable } from '@nestjs/common';
import type { JWTPayload } from 'jose';
import type { AccessTokenVerifierPort } from '../../shared/application/port/security/access-token-verifier.port';
import { UserPrincipal } from '../../shared/application/security/user-principal';
import {
  OIDC_AUTHENTICATION_CONFIG,
  OidcAuthenticationConfig,
} from './oidc-authentication.config';
import { OIDC_JWT_VERIFIER, type OidcJwtVerifier } from './oidc-jwt-verifier';

function getStringClaim(
  payload: JWTPayload,
  ...claimNames: string[]
): string | undefined {
  for (const claimName of claimNames) {
    const value = payload[claimName];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function getStringArrayClaim(
  payload: JWTPayload,
  claimName: string,
): readonly string[] {
  const value = payload[claimName];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function getScopes(payload: JWTPayload): readonly string[] {
  const scope = payload.scope;
  if (typeof scope === 'string') {
    return scope.split(/\s+/).filter(Boolean);
  }

  return getStringArrayClaim(payload, 'scp');
}

@Injectable()
export class OidcAccessTokenVerifierAdapter implements AccessTokenVerifierPort {
  constructor(
    @Inject(OIDC_AUTHENTICATION_CONFIG)
    private readonly config: OidcAuthenticationConfig,
    @Inject(OIDC_JWT_VERIFIER)
    private readonly jwtVerifier: OidcJwtVerifier,
  ) {}

  async verify(accessToken: string): Promise<UserPrincipal> {
    const payload = await this.jwtVerifier(accessToken);
    const subject = getStringClaim(payload, 'sub');

    if (!subject) {
      throw new TypeError('verified access token subject is missing');
    }

    return UserPrincipal.of({
      id: subject,
      tenantCode:
        getStringClaim(payload, 'tenant_code', 'tenantCode') ??
        this.config.tenantCode,
      username: getStringClaim(
        payload,
        'preferred_username',
        'username',
        'name',
      ),
      email: getStringClaim(payload, 'email'),
      roles: getStringArrayClaim(payload, 'roles'),
      scopes: getScopes(payload),
    });
  }
}

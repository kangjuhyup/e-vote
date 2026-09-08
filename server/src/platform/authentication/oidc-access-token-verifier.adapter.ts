import { Inject, Injectable } from '@nestjs/common';
import {
  InvalidAccessTokenError,
  type AccessTokenVerifierPort,
} from '../../shared/application/port/security/access-token-verifier.port';
import { UserPrincipal } from '../../shared/application/security/user-principal';
import {
  OIDC_AUTHENTICATION_CONFIG,
  OidcAuthenticationConfig,
} from './oidc-authentication.config';
import {
  OIDC_TOKEN_INTROSPECTOR,
  type OidcTokenIntrospector,
} from './oidc-token-introspector';

@Injectable()
export class OidcAccessTokenVerifierAdapter implements AccessTokenVerifierPort {
  constructor(
    @Inject(OIDC_AUTHENTICATION_CONFIG)
    private readonly config: OidcAuthenticationConfig,
    @Inject(OIDC_TOKEN_INTROSPECTOR)
    private readonly tokenIntrospector: OidcTokenIntrospector,
  ) {}

  async verify(accessToken: string): Promise<UserPrincipal> {
    const result = await this.tokenIntrospector(accessToken);

    if (!result.subject) {
      throw new InvalidAccessTokenError();
    }

    return UserPrincipal.of({
      id: result.subject,
      tenantId: result.tenantId,
      tenantCode: result.tenantCode ?? this.config.tenantCode,
      username: result.username,
      email: result.email,
      roles: result.roles,
      groups: result.groups.map((group) => ({
        id: group.id,
        code: group.code,
        ...(group.parentId ? { parentId: group.parentId } : {}),
        roles: group.roles,
      })),
      scopes: result.scopes,
    });
  }
}

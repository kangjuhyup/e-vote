import { Module } from '@nestjs/common';
import { ACCESS_TOKEN_VERIFIER_PORT } from '../../shared/application/port/security/access-token-verifier.port';
import { OidcAccessTokenVerifierAdapter } from './oidc-access-token-verifier.adapter';
import {
  OIDC_AUTHENTICATION_CONFIG,
  OidcAuthenticationConfig,
} from './oidc-authentication.config';
import {
  createOidcTokenIntrospector,
  OIDC_TOKEN_INTROSPECTOR,
} from './oidc-token-introspector';

@Module({
  providers: [
    {
      provide: OIDC_AUTHENTICATION_CONFIG,
      useFactory: (): OidcAuthenticationConfig =>
        OidcAuthenticationConfig.fromEnvironment(),
    },
    {
      provide: OIDC_TOKEN_INTROSPECTOR,
      inject: [OIDC_AUTHENTICATION_CONFIG],
      useFactory: createOidcTokenIntrospector,
    },
    {
      provide: ACCESS_TOKEN_VERIFIER_PORT,
      useClass: OidcAccessTokenVerifierAdapter,
    },
  ],
  exports: [ACCESS_TOKEN_VERIFIER_PORT],
})
export class AuthenticationModule {}

import { Module } from '@nestjs/common';
import { ACCESS_TOKEN_VERIFIER_PORT } from '../../shared/application/port/security/access-token-verifier.port';
import { OidcAccessTokenVerifierAdapter } from './oidc-access-token-verifier.adapter';
import {
  OIDC_AUTHENTICATION_CONFIG,
  OidcAuthenticationConfig,
} from './oidc-authentication.config';
import { createOidcJwtVerifier, OIDC_JWT_VERIFIER } from './oidc-jwt-verifier';

@Module({
  providers: [
    {
      provide: OIDC_AUTHENTICATION_CONFIG,
      useFactory: (): OidcAuthenticationConfig =>
        OidcAuthenticationConfig.fromEnvironment(),
    },
    {
      provide: OIDC_JWT_VERIFIER,
      inject: [OIDC_AUTHENTICATION_CONFIG],
      useFactory: createOidcJwtVerifier,
    },
    {
      provide: ACCESS_TOKEN_VERIFIER_PORT,
      useClass: OidcAccessTokenVerifierAdapter,
    },
  ],
  exports: [ACCESS_TOKEN_VERIFIER_PORT],
})
export class AuthenticationModule {}

import { Module } from '@nestjs/common';
import { ACCESS_TOKEN_VERIFIER_PORT } from '../../shared/application/port/security/access-token-verifier.port';
import { requireAuthzAssertionKey } from './authz-assertion';
import {
  AUTHZ_ASSERTION_KEY,
  AuthzAssertionVerifierAdapter,
} from './authz-assertion-verifier.adapter';

@Module({
  providers: [
    {
      provide: AUTHZ_ASSERTION_KEY,
      useFactory: requireAuthzAssertionKey,
    },
    {
      provide: ACCESS_TOKEN_VERIFIER_PORT,
      useClass: AuthzAssertionVerifierAdapter,
    },
  ],
  exports: [ACCESS_TOKEN_VERIFIER_PORT],
})
export class AuthenticationModule {}

import { Inject, Injectable } from '@nestjs/common';

import type { AccessTokenVerifierPort } from '../../shared/application/port/security/access-token-verifier.port';
import type { UserPrincipal } from '../../shared/application/security/user-principal';
import { verifyAuthzAssertion } from './authz-assertion';

export const AUTHZ_ASSERTION_KEY = Symbol('AUTHZ_ASSERTION_KEY');

@Injectable()
export class AuthzAssertionVerifierAdapter implements AccessTokenVerifierPort {
  constructor(@Inject(AUTHZ_ASSERTION_KEY) private readonly key: string) {}

  verify(accessToken: string, assertion?: string): Promise<UserPrincipal> {
    return Promise.resolve(
      verifyAuthzAssertion(accessToken, assertion, this.key),
    );
  }
}

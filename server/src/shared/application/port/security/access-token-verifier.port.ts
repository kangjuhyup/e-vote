import type { UserPrincipal } from '../../security/user-principal';

export const ACCESS_TOKEN_VERIFIER_PORT = Symbol('ACCESS_TOKEN_VERIFIER_PORT');

export interface AccessTokenVerifierPort {
  verify(accessToken: string): Promise<UserPrincipal>;
}

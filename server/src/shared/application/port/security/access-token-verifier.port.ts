import type { UserPrincipal } from '../../security/user-principal';

export const ACCESS_TOKEN_VERIFIER_PORT = Symbol('ACCESS_TOKEN_VERIFIER_PORT');

export class InvalidAccessTokenError extends Error {
  constructor() {
    super('access token is inactive or invalid');
    this.name = InvalidAccessTokenError.name;
  }
}

export class AccessTokenVerificationUnavailableError extends Error {
  constructor() {
    super('access token verification service is unavailable');
    this.name = AccessTokenVerificationUnavailableError.name;
  }
}

export interface AccessTokenVerifierPort {
  verify(accessToken: string): Promise<UserPrincipal>;
}

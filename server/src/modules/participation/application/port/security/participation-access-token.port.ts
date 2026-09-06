export const PARTICIPATION_ACCESS_TOKEN_PORT = Symbol(
  'PARTICIPATION_ACCESS_TOKEN_PORT',
);

export class InvalidParticipationAccessTokenError extends Error {
  constructor() {
    super('participation access token is invalid');
    this.name = 'InvalidParticipationAccessTokenError';
  }
}

export class ParticipationAccessNotConfiguredError extends Error {
  constructor() {
    super('participation access signing is not configured');
    this.name = 'ParticipationAccessNotConfiguredError';
  }
}

export interface ParticipationReferenceClaims {
  readonly invitationId: string;
  readonly generation: number;
  readonly keyId: string;
  readonly tokenDigest: string;
}

export interface IssuedParticipationReference {
  readonly token: string;
  readonly tokenDigest: string;
  readonly keyId: string;
}

export interface ParticipantSessionCredentials {
  readonly sessionToken: string;
  readonly sessionTokenDigest: string;
  readonly csrfToken: string;
  readonly csrfTokenDigest: string;
}

export interface ParticipationAccessTokenPort {
  issueReference(
    invitationId: string,
    generation: number,
  ): IssuedParticipationReference;
  verifyReference(token: string): ParticipationReferenceClaims;
  issueSessionCredentials(): ParticipantSessionCredentials;
  deriveCsrfToken(sessionToken: string): string;
  digest(value: string): string;
}

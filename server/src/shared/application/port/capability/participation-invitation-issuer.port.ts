export const PARTICIPATION_INVITATION_ISSUER_PORT = Symbol(
  'PARTICIPATION_INVITATION_ISSUER_PORT',
);

export interface ParticipationInvitationIssuerPort {
  issue(
    voteId: string,
    electorId: string,
  ): Promise<{ readonly rawToken: string; readonly expiresAt: Date }>;
}

export const PARTICIPATION_REMINDER_LINK_ISSUER_PORT = Symbol(
  'PARTICIPATION_REMINDER_LINK_ISSUER_PORT',
);

export interface ParticipationReminderLinkReference {
  readonly electorId: string;
  readonly invitationGeneration: number;
  readonly participationUrl: string;
}

export interface ParticipationReminderLinkIssuerPort {
  issueForNonParticipants(params: {
    readonly voteId: string;
    readonly issuedByUserPrincipalId: string;
  }): Promise<readonly ParticipationReminderLinkReference[]>;
}

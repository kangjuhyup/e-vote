export const PARTICIPATION_INVITATION_RECIPIENT_ACCESS_PORT = Symbol(
  'PARTICIPATION_INVITATION_RECIPIENT_ACCESS_PORT',
);

export interface ParticipationInvitationRecipientReference {
  readonly electorId: string;
  readonly hasPhoneNumber: boolean;
}

export interface ParticipationInvitationRecipientAccessPort {
  findEligibleRecipients(params: {
    readonly voteId: string;
    readonly electorIds?: readonly string[];
  }): Promise<readonly ParticipationInvitationRecipientReference[]>;
  findPhoneNumber(
    voteId: string,
    electorId: string,
  ): Promise<string | undefined>;
}

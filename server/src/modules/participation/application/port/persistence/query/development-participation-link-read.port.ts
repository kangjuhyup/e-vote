export const DEVELOPMENT_PARTICIPATION_LINK_READ_PORT = Symbol(
  'DEVELOPMENT_PARTICIPATION_LINK_READ_PORT',
);

export interface DevelopmentParticipationInvitationReference {
  readonly id: string;
  readonly voteId: string;
  readonly electorId: string;
  readonly tokenDigest: string;
  readonly signingKeyId: string;
  readonly generation: number;
}

export interface DevelopmentParticipationLinkReadPort {
  findCurrentInvitation(params: {
    readonly voteId: string;
    readonly electorId: string;
  }): Promise<DevelopmentParticipationInvitationReference | undefined>;
}

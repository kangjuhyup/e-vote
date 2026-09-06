export const PARTICIPATION_ACCESS_REVOCATION_PORT = Symbol(
  'PARTICIPATION_ACCESS_REVOCATION_PORT',
);

export interface ParticipationAccessRevocationPort {
  revokeAccessForVote(voteId: string, revokedAt: Date): Promise<void>;
  revokeAccessForElector(electorId: string, revokedAt: Date): Promise<void>;
}

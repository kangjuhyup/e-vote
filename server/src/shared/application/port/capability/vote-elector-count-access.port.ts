export const VOTE_ELECTOR_COUNT_ACCESS_PORT = Symbol(
  'VOTE_ELECTOR_COUNT_ACCESS_PORT',
);

export interface VoteElectorCountAccessPort {
  countEligibleElectors(voteId: string): Promise<number>;
}

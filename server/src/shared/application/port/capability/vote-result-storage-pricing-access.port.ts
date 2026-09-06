export const VOTE_RESULT_STORAGE_PRICING_ACCESS_PORT = Symbol(
  'VOTE_RESULT_STORAGE_PRICING_ACCESS_PORT',
);

export interface VoteResultStoragePricingAccessPort {
  countBlockchainVoteDetails(voteId: string): Promise<number>;
}

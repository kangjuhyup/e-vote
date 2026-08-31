export const VOTE_SETUP_LIFECYCLE_PORT = Symbol('VOTE_SETUP_LIFECYCLE_PORT');

export interface VoteSetupLifecyclePort {
  lockVote(voteId: string): Promise<void>;
  finalizeForBilling(params: {
    voteId: string;
    billingOrderId: string;
    finalizedAt: Date;
  }): Promise<void>;
  cancelFinalizedVote(params: {
    voteId: string;
    canceledAt: Date;
  }): Promise<void>;
}

export const VOTE_USAGE_ENTITLEMENT_ACCESS_PORT = Symbol(
  'VOTE_USAGE_ENTITLEMENT_ACCESS_PORT',
);

export interface VoteUsageEntitlementAccessPort {
  hasPaidOrder(voteId: string): Promise<boolean>;
}

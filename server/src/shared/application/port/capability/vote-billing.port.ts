export const VOTE_SETUP_LIFECYCLE_PORT = Symbol('VOTE_SETUP_LIFECYCLE_PORT');

export interface VoteSetupLifecyclePort {
  lockVote(voteId: string): Promise<void>;
  lockForBilling(params: {
    voteId: string;
    billingOrderId: string;
  }): Promise<void>;
  finalizePaidBilling(params: {
    voteId: string;
    billingOrderId: string;
    finalizedAt: Date;
  }): Promise<void>;
  assertBillingCancellationAllowed(params: {
    voteId: string;
    billingOrderId: string;
  }): Promise<void>;
  releaseBilling(params: {
    voteId: string;
    billingOrderId: string;
  }): Promise<void>;
}

export const VOTE_USAGE_ENTITLEMENT_ACCESS_PORT = Symbol(
  'VOTE_USAGE_ENTITLEMENT_ACCESS_PORT',
);

export interface VoteUsageEntitlementAccessPort {
  hasPaidOrder(voteId: string): Promise<boolean>;
  findPaidVoteIds(voteIds: readonly string[]): Promise<ReadonlySet<string>>;
}

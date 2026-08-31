import type { BillingOrderAggregate } from '../../../../domain/billing-order.aggregate';

export const BILLING_ORDER_REPOSITORY_PORT = Symbol(
  'BILLING_ORDER_REPOSITORY_PORT',
);

export interface BillingOrderRepositoryPort {
  nextId(): string;
  findById(orderId: string): Promise<BillingOrderAggregate | undefined>;
  findByIdForUpdate(
    orderId: string,
  ): Promise<BillingOrderAggregate | undefined>;
  findByVoteId(voteId: string): Promise<BillingOrderAggregate | undefined>;
  findByVoteIdForUpdate(
    voteId: string,
  ): Promise<BillingOrderAggregate | undefined>;
  save(order: BillingOrderAggregate): Promise<void>;
}

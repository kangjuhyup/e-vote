import { Inject, Injectable } from '@nestjs/common';
import { type UnpaidVoteBillingExpirationPort } from '../../../../../shared/application/port/capability/vote-billing.port';
import { BillingOrderStatus } from '../../../domain/type/billing-order-status.type';
import {
  BILLING_ORDER_REPOSITORY_PORT,
  type BillingOrderRepositoryPort,
} from '../../port/persistence/command/billing-order-repository.port';
import { BillingOrderOutboxRecorder } from '../../event/billing-order-outbox.recorder';

export const PAYMENT_NOT_COMPLETED_BEFORE_VOTE_START =
  'PAYMENT_NOT_COMPLETED_BEFORE_VOTE_START';

@Injectable()
export class ExpireUnpaidVoteBillingOrdersHandler implements UnpaidVoteBillingExpirationPort {
  constructor(
    @Inject(BILLING_ORDER_REPOSITORY_PORT)
    private readonly billingOrders: BillingOrderRepositoryPort,
    private readonly outboxRecorder: BillingOrderOutboxRecorder,
  ) {}

  async expirePendingOrders(params: {
    voteIds: readonly string[];
    expiredAt: Date;
  }): Promise<ReadonlySet<string>> {
    const expiredVoteIds = new Set<string>();
    for (const voteId of params.voteIds) {
      const order =
        await this.billingOrders.findActiveByVoteIdForUpdate(voteId);
      if (!order || order.status !== BillingOrderStatus.PendingPayment)
        continue;

      order.expirePendingPayment({
        reason: PAYMENT_NOT_COMPLETED_BEFORE_VOTE_START,
        expiredAt: params.expiredAt,
      });
      await this.billingOrders.save(order);
      await this.outboxRecorder.record(order);
      expiredVoteIds.add(voteId);
    }
    return expiredVoteIds;
  }
}

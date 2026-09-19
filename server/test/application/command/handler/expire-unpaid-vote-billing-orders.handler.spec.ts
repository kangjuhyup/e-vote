import {
  ExpireUnpaidVoteBillingOrdersHandler,
  PAYMENT_NOT_COMPLETED_BEFORE_VOTE_START,
} from '../../../../src/modules/billing/application/command/handler/expire-unpaid-vote-billing-orders.handler';
import type { BillingOrderOutboxRecorder } from '../../../../src/modules/billing/application/event/billing-order-outbox.recorder';
import type { BillingOrderRepositoryPort } from '../../../../src/modules/billing/application/port/persistence/command/billing-order-repository.port';
import { BillingOrderAggregate } from '../../../../src/modules/billing/domain/billing-order.aggregate';
import { BillingOrderStatus } from '../../../../src/modules/billing/domain/type/billing-order-status.type';
import { VoteUsagePrice } from '../../../../src/modules/billing/domain/vo/vote-usage-price.vo';

describe('ExpireUnpaidVoteBillingOrdersHandler', () => {
  it('cancels pending orders with an auditable reason and records their outbox events', async () => {
    const pending = issueOrder('pending-order', 'pending-vote');
    pending.clearDomainEvents();
    const paid = issueOrder('paid-order', 'paid-vote');
    paid.markPaid({
      paymentId: 'payment-1',
      paidAmount: 3_000,
      paidCurrency: 'KRW',
      paidAt: new Date('2026-09-06T09:00:00.000Z'),
    });
    paid.clearDomainEvents();
    const orders = new Map([
      [pending.voteId, pending],
      [paid.voteId, paid],
    ]);
    const repository = {
      findActiveByVoteIdForUpdate: jest
        .fn()
        .mockImplementation((voteId: string) =>
          Promise.resolve(orders.get(voteId)),
        ),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<BillingOrderRepositoryPort>;
    const outboxRecorder = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<BillingOrderOutboxRecorder>;
    const expiredAt = new Date('2026-09-06T10:00:00.000Z');

    const expiredVoteIds = await new ExpireUnpaidVoteBillingOrdersHandler(
      repository,
      outboxRecorder,
    ).expirePendingOrders({
      voteIds: ['pending-vote', 'paid-vote', 'missing-vote'],
      expiredAt,
    });

    expect(expiredVoteIds).toEqual(new Set(['pending-vote']));
    expect(pending).toMatchObject({
      status: BillingOrderStatus.Canceled,
      cancellationReason: PAYMENT_NOT_COMPLETED_BEFORE_VOTE_START,
      canceledAt: expiredAt,
    });
    expect(paid.status).toBe(BillingOrderStatus.Paid);
    expect(repository.save.mock.calls).toEqual([[pending]]);
    expect(outboxRecorder.record.mock.calls).toEqual([[pending]]);
  });
});

function issueOrder(id: string, voteId: string): BillingOrderAggregate {
  return BillingOrderAggregate.issue({
    id,
    voteId,
    commissionId: 'commission-1',
    orderedByUserPrincipalId: 'user-1',
    price: VoteUsagePrice.forElectorCount(100),
    issuedAt: new Date('2026-09-01T00:00:00.000Z'),
  });
}

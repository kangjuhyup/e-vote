import { BillingOrderAggregate } from '../../../../src/modules/billing/domain/billing-order.aggregate';
import { BillingOrderOutboxRecorder } from '../../../../src/modules/billing/application/event/billing-order-outbox.recorder';
import { MarkBillingOrderRefundedCommand } from '../../../../src/modules/billing/application/command/dto/request/mark-billing-order-refunded.command';
import { MarkBillingOrderRefundedHandler } from '../../../../src/modules/billing/application/command/handler/mark-billing-order-refunded.handler';
import { VoteUsagePrice } from '../../../../src/modules/billing/domain/vo/vote-usage-price.vo';

describe('refund participation access revocation', () => {
  it('revokes every participation link and session when a refund releases the vote', async () => {
    const refundedAt = new Date('2026-09-06T10:00:00.000Z');
    const order = BillingOrderAggregate.issue({
      id: 'billing-order-1',
      voteId: 'vote-1',
      commissionId: 'commission-1',
      orderedByUserPrincipalId: 'creator-1',
      price: VoteUsagePrice.forElectorCount(1),
      issuedAt: new Date('2026-09-06T08:00:00.000Z'),
    });
    order.markPaid({
      paymentId: 'payment-1',
      paidAmount: order.price.amount,
      paidCurrency: order.price.currency,
      paidAt: new Date('2026-09-06T08:01:00.000Z'),
    });
    order.requestCancellation({
      reason: 'vote canceled',
      canceledAt: new Date('2026-09-06T09:00:00.000Z'),
    });
    order.clearDomainEvents();
    const repository = {
      findById: jest.fn().mockResolvedValue(order),
      findByIdForUpdate: jest.fn().mockResolvedValue(order),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const lifecycle = {
      lockVote: jest.fn().mockResolvedValue(undefined),
      releaseBilling: jest.fn().mockResolvedValue(undefined),
    };
    const revocation = {
      revokeAccessForVote: jest.fn().mockResolvedValue(undefined),
      revokeAccessForElector: jest.fn().mockResolvedValue(undefined),
    };
    const transactionManager = {
      runInTransaction: jest.fn(async (work: () => Promise<unknown>) => work()),
    };
    const outbox = { append: jest.fn().mockResolvedValue(undefined) };

    await new MarkBillingOrderRefundedHandler(
      repository as never,
      lifecycle as never,
      new BillingOrderOutboxRecorder(outbox),
      transactionManager as never,
      revocation,
    ).execute(
      MarkBillingOrderRefundedCommand.of({
        billingOrderId: order.id,
        refundedAt,
      }),
    );

    expect(revocation.revokeAccessForVote).toHaveBeenCalledWith(
      'vote-1',
      refundedAt,
    );
  });
});

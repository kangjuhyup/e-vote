import { BillingOrderAggregate } from '../../../src/modules/billing/domain/billing-order.aggregate';
import { BillingOrderStatus } from '../../../src/modules/billing/domain/type/billing-order-status.type';
import { VoteUsagePrice } from '../../../src/modules/billing/domain/vo/vote-usage-price.vo';

describe('billing order domain', () => {
  const issuedAt = new Date('2026-08-30T00:00:00.000Z');

  it('snapshots the issued product and price', () => {
    const price = VoteUsagePrice.forElectorCount(100);
    const order = issueOrder(price);

    expect(order).toMatchObject({
      productCode: 'VOTE_USAGE',
      productName: '투표 개설 이용료',
      electorCount: 100,
      pricingUnitSize: 100,
      pricingUnitCount: 1,
      unitPrice: 3_000,
      price: { amount: 3_000, currency: 'KRW' },
      status: BillingOrderStatus.PendingPayment,
      version: 1,
      cancellationWindowDays: 7,
      cancelableUntil: new Date('2026-09-06T00:00:00.000Z'),
    });
    expect(order.domainEvents()).toEqual([
      expect.objectContaining({
        type: 'BillingOrderIssued',
        aggregateVersion: 1,
      }),
    ]);
  });

  it.each([
    [1, 1, 3_000],
    [100, 1, 3_000],
    [101, 2, 6_000],
    [200, 2, 6_000],
    [201, 3, 9_000],
  ])(
    'charges 3,000 KRW per started block of 100 electors: %i electors',
    (electorCount, pricingUnitCount, amount) => {
      expect(VoteUsagePrice.forElectorCount(electorCount)).toMatchObject({
        electorCount,
        pricingUnitSize: 100,
        pricingUnitCount,
        unitPrice: { amount: 3_000, currency: 'KRW' },
        money: { amount, currency: 'KRW' },
      });
    },
  );

  it('rejects an order for a vote without eligible electors', () => {
    expect(() => VoteUsagePrice.forElectorCount(0)).toThrow(
      'elector count must be positive',
    );
  });

  it('identifies only the recorded orderer as the order owner', () => {
    const order = issueOrder();

    expect(order.isOrderedBy('user-1')).toBe(true);
    expect(order.isOrderedBy('another-user')).toBe(false);
  });

  it('marks the order paid only when amount and currency match', () => {
    const order = issueOrder();

    expect(() =>
      order.markPaid({
        paymentId: 'payment-1',
        paidAmount: 2_999,
        paidCurrency: 'KRW',
        paidAt: issuedAt,
      }),
    ).toThrow('paid amount does not match');

    order.markPaid({
      paymentId: 'payment-1',
      paidAmount: 3_000,
      paidCurrency: 'KRW',
      paidAt: issuedAt,
    });

    expect(order.status).toBe(BillingOrderStatus.Paid);
    expect(order.version).toBe(2);
    expect(order.grantsVoteUsage()).toBe(true);
  });

  it('handles the same payment success idempotently', () => {
    const order = issueOrder();
    const payment = {
      paymentId: 'payment-1',
      paidAmount: 3_000,
      paidCurrency: 'KRW',
      paidAt: issuedAt,
    };

    order.markPaid(payment);
    order.clearDomainEvents();
    order.markPaid(payment);

    expect(order.version).toBe(2);
    expect(order.domainEvents()).toEqual([]);
    expect(() =>
      order.markPaid({ ...payment, paymentId: 'payment-2' }),
    ).toThrow('already paid by another payment');
  });

  it.each([BillingOrderStatus.RefundPending, BillingOrderStatus.Refunded])(
    'keeps a matching payment replay idempotent after reaching %s',
    (status) => {
      const order = issueOrder();
      const payment = {
        paymentId: 'payment-1',
        paidAmount: 3_000,
        paidCurrency: 'KRW',
        paidAt: issuedAt,
      };
      order.markPaid(payment);
      order.requestCancellation({
        reason: '일정 변경',
        canceledAt: new Date('2026-09-01T00:00:00.000Z'),
      });
      if (status === BillingOrderStatus.Refunded) {
        order.markRefunded(new Date('2026-09-01T00:01:00.000Z'));
      }
      order.clearDomainEvents();
      const version = order.version;

      order.markPaid(payment);

      expect(order.status).toBe(status);
      expect(order.version).toBe(version);
      expect(order.domainEvents()).toEqual([]);
      expect(() =>
        order.markPaid({ ...payment, paymentId: 'payment-2' }),
      ).toThrow('already paid by another payment');
    },
  );

  it('cancels an unpaid order within seven days', () => {
    const order = issueOrder();

    order.requestCancellation({
      reason: '일정 변경',
      canceledAt: new Date('2026-09-06T00:00:00.000Z'),
    });

    expect(order).toMatchObject({
      status: BillingOrderStatus.Canceled,
      cancellationReason: '일정 변경',
      canceledAt: new Date('2026-09-06T00:00:00.000Z'),
    });
    expect(order.version).toBe(2);
    expect(order.domainEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'BillingOrderCanceled',
          aggregateVersion: 2,
        }),
      ]),
    );
  });

  it('requests a refund when a paid order is canceled', () => {
    const order = issueOrder();
    order.markPaid({
      paymentId: 'payment-1',
      paidAmount: 3_000,
      paidCurrency: 'KRW',
      paidAt: issuedAt,
    });

    order.requestCancellation({
      reason: '투표 취소',
      canceledAt: new Date('2026-09-01T00:00:00.000Z'),
    });

    expect(order).toMatchObject({
      status: BillingOrderStatus.RefundPending,
      version: 3,
      refundRequestedAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    order.markRefunded(new Date('2026-09-02T00:00:00.000Z'));
    expect(order.status).toBe(BillingOrderStatus.Refunded);
    expect(order.version).toBe(4);
  });

  it('rejects cancellation after the snapshotted deadline', () => {
    const order = issueOrder();

    expect(() =>
      order.requestCancellation({
        reason: '늦은 취소',
        canceledAt: new Date('2026-09-06T00:00:00.001Z'),
      }),
    ).toThrow('cancellation window has expired');
  });

  it('rejects cancellation timestamps before order issuance', () => {
    const order = issueOrder();

    expect(() =>
      order.requestCancellation({
        reason: '잘못된 시각',
        canceledAt: new Date('2026-08-29T23:59:59.999Z'),
      }),
    ).toThrow('cannot be canceled before it is issued');
  });

  it('reconstitutes a legacy refunded order after migration backfill', () => {
    const refundedAt = new Date('2026-09-01T00:00:00.000Z');
    const order = BillingOrderAggregate.reconstitute({
      id: 'billing-order-1',
      voteId: 'vote-1',
      commissionId: 'commission-1',
      orderedByUserPrincipalId: 'user-1',
      productCode: 'VOTE_USAGE',
      productName: '투표 개설 이용료',
      electorCount: 100,
      pricingUnitSize: 100,
      pricingUnitCount: 1,
      unitPrice: 3_000,
      amount: 3_000,
      currency: 'KRW',
      version: 7,
      status: BillingOrderStatus.Refunded,
      paymentId: 'payment-1',
      issuedAt,
      cancellationWindowDays: 7,
      cancelableUntil: new Date('2026-09-06T00:00:00.000Z'),
      paidAt: issuedAt,
      canceledAt: refundedAt,
      cancellationReason: 'LEGACY_REFUND',
      refundRequestedAt: refundedAt,
      refundedAt,
    });

    expect(order).toMatchObject({
      status: BillingOrderStatus.Refunded,
      version: 7,
      cancellationReason: 'LEGACY_REFUND',
      refundedAt,
    });
    expect(order.domainEvents()).toEqual([]);
  });

  function issueOrder(
    price = VoteUsagePrice.forElectorCount(100),
  ): BillingOrderAggregate {
    return BillingOrderAggregate.issue({
      id: 'billing-order-1',
      voteId: 'vote-1',
      commissionId: 'commission-1',
      orderedByUserPrincipalId: 'user-1',
      price,
      issuedAt,
    });
  }
});

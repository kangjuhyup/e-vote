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
    });
    expect(order.pullEvents()).toEqual([
      expect.objectContaining({ type: 'BillingOrderIssued' }),
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
    order.pullEvents();
    order.markPaid(payment);

    expect(order.pullEvents()).toEqual([]);
    expect(() =>
      order.markPaid({ ...payment, paymentId: 'payment-2' }),
    ).toThrow('already paid by another payment');
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

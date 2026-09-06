import { BillingOrderMapper } from '../../../../src/modules/billing/infrastructure/database/mapper/billing-order.mapper';

describe('BillingOrderMapper', () => {
  it('reconstitutes the immutable base and blockchain price snapshots', () => {
    const order = BillingOrderMapper.toDomain({
      id: 'billing-order-1',
      version: 1,
      voteId: 'vote-1',
      commissionId: 'commission-1',
      orderedByUserPrincipalId: 'user-1',
      productCode: 'VOTE_USAGE',
      productName: '투표 개설 이용료',
      electorCount: 120,
      pricingUnitSize: 100,
      pricingUnitCount: 2,
      unitPrice: 3_000,
      blockchainStorageCount: 2,
      blockchainStorageUnitPrice: 3_000,
      identityVerificationRequired: true,
      identityVerificationUnitPrice: 30_000,
      amount: 72_000,
      currency: 'KRW',
      status: 'PENDING_PAYMENT',
      paymentId: null,
      issuedAt: new Date('2026-09-06T00:00:00.000Z'),
      cancellationWindowDays: 7,
      cancelableUntil: new Date('2026-09-13T00:00:00.000Z'),
      paidAt: null,
      canceledAt: null,
      cancellationReason: null,
      refundRequestedAt: null,
      refundedAt: null,
    });

    expect(order).toMatchObject({
      baseAmount: 6_000,
      blockchainStorageCount: 2,
      blockchainStorageUnitPrice: 3_000,
      blockchainStorageAmount: 6_000,
      identityVerificationRequired: true,
      identityVerificationUnitPrice: 30_000,
      identityVerificationAmount: 60_000,
      price: { amount: 72_000, currency: 'KRW' },
    });
  });
});

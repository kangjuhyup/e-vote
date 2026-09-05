import { BillingOrderIntegrationEventMapper } from '../../../src/modules/billing/application/event/billing-order-integration-event.mapper';
import { BillingOrderAggregate } from '../../../src/modules/billing/domain/billing-order.aggregate';
import { VoteUsagePrice } from '../../../src/modules/billing/domain/vo/vote-usage-price.vo';

describe('billing order integration event mapper', () => {
  const issuedAt = new Date('2026-09-02T00:00:00.000Z');

  it('maps an issued order to a minimal versioned Payment contract', () => {
    const order = issueOrder();
    const [event] = order.domainEvents();

    const envelope = BillingOrderIntegrationEventMapper.toEnvelope(
      order,
      event,
      0,
    );

    expect(envelope).toMatchObject({
      source: 'vote-service',
      eventType: 'billing.order-issued.v1',
      schemaVersion: 1,
      aggregateType: 'BillingOrder',
      aggregateId: '00000000-0000-4000-8000-000000000001',
      aggregateVersion: 1,
      eventPosition: 0,
      deduplicationKey:
        'vote-service:BillingOrder:00000000-0000-4000-8000-000000000001:1:BillingOrderIssued:0',
      occurredAt: issuedAt,
      payload: {
        billingOrderId: '00000000-0000-4000-8000-000000000001',
        voteId: '00000000-0000-4000-8000-000000000002',
        commissionId: '00000000-0000-4000-8000-000000000003',
        productCode: 'VOTE_USAGE',
        amount: 6_000,
        currency: 'KRW',
        issuedAt: issuedAt.toISOString(),
      },
    });
    expect(envelope.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(envelope.payload).not.toHaveProperty('orderedByUserPrincipalId');
    expect(envelope.payload).not.toHaveProperty('cancellationReason');
  });

  it('maps refund requests without exposing the free-text reason', () => {
    const order = issueOrder();
    order.clearDomainEvents();
    order.markPaid({
      paymentId: 'payment-1',
      paidAmount: 6_000,
      paidCurrency: 'KRW',
      paidAt: issuedAt,
    });
    order.clearDomainEvents();
    const requestedAt = new Date('2026-09-03T00:00:00.000Z');
    order.requestCancellation({
      reason: '민감한 내부 사유',
      canceledAt: requestedAt,
    });
    const [event] = order.domainEvents();

    const envelope = BillingOrderIntegrationEventMapper.toEnvelope(
      order,
      event,
      0,
    );

    expect(envelope).toMatchObject({
      eventType: 'billing.refund-requested.v1',
      aggregateVersion: 3,
      payload: {
        billingOrderId: order.id,
        voteId: order.voteId,
        paymentId: 'payment-1',
        amount: 6_000,
        currency: 'KRW',
        requestedAt: requestedAt.toISOString(),
      },
    });
    expect(envelope.payload).not.toHaveProperty('cancellationReason');
  });

  function issueOrder(): BillingOrderAggregate {
    return BillingOrderAggregate.issue({
      id: '00000000-0000-4000-8000-000000000001',
      voteId: '00000000-0000-4000-8000-000000000002',
      commissionId: '00000000-0000-4000-8000-000000000003',
      orderedByUserPrincipalId: 'user-1',
      price: VoteUsagePrice.forElectorCount(120),
      issuedAt,
    });
  }
});

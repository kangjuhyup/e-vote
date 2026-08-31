import { GetBillingOrderQuery } from '../../../../src/modules/billing/application/query/dto/request/get-billing-order.query';
import { BillingOrderView } from '../../../../src/modules/billing/application/query/dto/response/billing-order.view';
import { GetBillingOrderHandler } from '../../../../src/modules/billing/application/query/handler/get-billing-order.handler';
import type { BillingOrderReadRepositoryPort } from '../../../../src/modules/billing/application/port/persistence/query/billing-order-read-repository.port';
import type { ElectionCommissionMembershipAccessPort } from '../../../../src/shared/application/port/capability/election-commission-membership-access.port';

describe('billing query handler', () => {
  const view = BillingOrderView.of({
    id: 'billing-order-1',
    voteId: 'vote-1',
    commissionId: 'commission-1',
    orderedByUserPrincipalId: 'user-1',
    productCode: 'VOTE_USAGE',
    productName: '투표 개설 이용료',
    electorCount: 120,
    pricingUnitSize: 100,
    pricingUnitCount: 2,
    unitPrice: 3_000,
    amount: 6_000,
    currency: 'KRW',
    status: 'PENDING_PAYMENT',
    issuedAt: new Date('2026-08-30T00:00:00.000Z'),
    cancellationWindowDays: 7,
    cancelableUntil: new Date('2026-09-06T00:00:00.000Z'),
  });

  it('returns an order to an active commission member', async () => {
    const handler = createHandler(true);

    await expect(handler.execute(query())).resolves.toBe(view);
  });

  it('does not expose the order outside its commission membership', async () => {
    const handler = createHandler(false);

    await expect(handler.execute(query())).rejects.toThrow(
      'billing order access denied',
    );
  });

  function createHandler(allowed: boolean): GetBillingOrderHandler {
    const repository: BillingOrderReadRepositoryPort = {
      findById: jest.fn().mockResolvedValue(view),
    };
    const membership: ElectionCommissionMembershipAccessPort = {
      isActiveMember: jest.fn().mockResolvedValue(allowed),
    };
    return new GetBillingOrderHandler(repository, membership);
  }

  function query(): GetBillingOrderQuery {
    return GetBillingOrderQuery.of({
      billingOrderId: view.id,
      userPrincipalId: 'user-1',
    });
  }
});

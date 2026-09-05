import { GetBillingOrderQuery } from '../../../../src/modules/billing/application/query/dto/request/get-billing-order.query';
import { BillingOrderView } from '../../../../src/modules/billing/application/query/dto/response/billing-order.view';
import { GetBillingOrderHandler } from '../../../../src/modules/billing/application/query/handler/get-billing-order.handler';
import type { BillingOrderReadRepositoryPort } from '../../../../src/modules/billing/application/port/persistence/query/billing-order-read-repository.port';

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

  it('returns an order to the user who placed it without commission membership', async () => {
    const handler = createHandler();

    await expect(handler.execute(query())).resolves.toBe(view);
  });

  it('does not expose the order to another active commission member', async () => {
    const handler = createHandler();

    await expect(handler.execute(query('another-user'))).rejects.toThrow(
      'billing order access denied',
    );
  });

  function createHandler(): GetBillingOrderHandler {
    const repository: BillingOrderReadRepositoryPort = {
      findById: jest.fn().mockResolvedValue(view),
    };
    return new GetBillingOrderHandler(repository);
  }

  function query(userPrincipalId = 'user-1'): GetBillingOrderQuery {
    return GetBillingOrderQuery.of({
      billingOrderId: view.id,
      userPrincipalId,
    });
  }
});

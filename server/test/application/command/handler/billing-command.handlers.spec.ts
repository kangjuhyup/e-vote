import { CreateVoteUsageBillingOrderCommand } from '../../../../src/modules/billing/application/command/dto/request/create-vote-usage-billing-order.command';
import { MarkBillingOrderPaidCommand } from '../../../../src/modules/billing/application/command/dto/request/mark-billing-order-paid.command';
import { CreateVoteUsageBillingOrderHandler } from '../../../../src/modules/billing/application/command/handler/create-vote-usage-billing-order.handler';
import { MarkBillingOrderPaidHandler } from '../../../../src/modules/billing/application/command/handler/mark-billing-order-paid.handler';
import type { BillingOrderRepositoryPort } from '../../../../src/modules/billing/application/port/persistence/command/billing-order-repository.port';
import { BillingOrderAggregate } from '../../../../src/modules/billing/domain/billing-order.aggregate';
import { VoteUsagePrice } from '../../../../src/modules/billing/domain/vo/vote-usage-price.vo';
import type { ElectionCommissionMembershipAccessPort } from '../../../../src/shared/application/port/capability/election-commission-membership-access.port';
import type { VoteAccessPort } from '../../../../src/shared/application/port/capability/vote-access.port';
import type { VoteElectorCountAccessPort } from '../../../../src/shared/application/port/capability/vote-elector-count-access.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';

describe('billing command handlers', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');

  it('creates one server-priced order for an authorized commission member', async () => {
    const repository = repositoryStub();
    const handler = new CreateVoteUsageBillingOrderHandler(
      repository,
      voteAccessStub(),
      membershipStub(true),
      electorCountStub(120),
      transactionManagerStub(),
    );

    const result = await handler.execute(createCommand());

    expect(result).toMatchObject({
      id: 'billing-order-1',
      voteId: 'vote-1',
      electorCount: 120,
      pricingUnitCount: 2,
      unitPrice: 3_000,
      amount: 6_000,
      currency: 'KRW',
      status: 'PENDING_PAYMENT',
    });
    expect(repository.save.mock.calls).toHaveLength(1);
  });

  it('returns the existing order for a repeated vote request', async () => {
    const existing = order();
    const repository = repositoryStub(existing);
    const countEligibleElectors = jest.fn();
    const handler = new CreateVoteUsageBillingOrderHandler(
      repository,
      voteAccessStub(),
      membershipStub(true),
      { countEligibleElectors },
      transactionManagerStub(),
    );

    await expect(handler.execute(createCommand())).resolves.toMatchObject({
      id: existing.id,
    });
    expect(countEligibleElectors).not.toHaveBeenCalled();
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('rejects users who are not active commission members', async () => {
    const repository = repositoryStub();
    const handler = new CreateVoteUsageBillingOrderHandler(
      repository,
      voteAccessStub(),
      membershipStub(false),
      electorCountStub(120),
      transactionManagerStub(),
    );

    await expect(handler.execute(createCommand())).rejects.toThrow(
      'vote billing access denied',
    );
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('applies a matching payment result through the internal handler', async () => {
    const existing = order();
    const repository = repositoryStub(existing);

    const result = await new MarkBillingOrderPaidHandler(
      repository,
      transactionManagerStub(),
    ).execute(
      MarkBillingOrderPaidCommand.of({
        billingOrderId: existing.id,
        paymentId: 'payment-1',
        amount: 6_000,
        currency: 'KRW',
        paidAt: now,
      }),
    );

    expect(result).toMatchObject({ status: 'PAID', paymentId: 'payment-1' });
    expect(repository.save.mock.calls).toEqual([[existing]]);
  });

  function createCommand(): CreateVoteUsageBillingOrderCommand {
    return CreateVoteUsageBillingOrderCommand.of({
      voteId: 'vote-1',
      orderedByUserPrincipalId: 'user-1',
      issuedAt: now,
    });
  }

  function order(): BillingOrderAggregate {
    return BillingOrderAggregate.issue({
      id: 'billing-order-1',
      voteId: 'vote-1',
      commissionId: 'commission-1',
      orderedByUserPrincipalId: 'user-1',
      price: VoteUsagePrice.forElectorCount(120),
      issuedAt: now,
    });
  }

  function repositoryStub(
    existing?: BillingOrderAggregate,
  ): BillingOrderRepositoryPort & {
    save: jest.MockedFunction<BillingOrderRepositoryPort['save']>;
  } {
    return {
      nextId: jest.fn().mockReturnValue('billing-order-1'),
      findById: jest.fn().mockResolvedValue(existing),
      findByVoteId: jest.fn().mockResolvedValue(existing),
      save: jest.fn().mockResolvedValue(undefined),
    };
  }

  function voteAccessStub(): VoteAccessPort {
    return {
      findById: jest.fn().mockResolvedValue({
        id: 'vote-1',
        commissionId: 'commission-1',
      }),
    };
  }

  function membershipStub(
    allowed: boolean,
  ): ElectionCommissionMembershipAccessPort {
    return { isActiveMember: jest.fn().mockResolvedValue(allowed) };
  }

  function electorCountStub(count: number): VoteElectorCountAccessPort {
    return {
      countEligibleElectors: jest.fn().mockResolvedValue(count),
    };
  }

  function transactionManagerStub(): DatabaseTransactionManager {
    return {
      runInTransaction: jest.fn(async (work) => work()),
    };
  }
});

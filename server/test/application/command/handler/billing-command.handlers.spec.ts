import { CreateVoteUsageBillingOrderCommand } from '../../../../src/modules/billing/application/command/dto/request/create-vote-usage-billing-order.command';
import { MarkBillingOrderPaidCommand } from '../../../../src/modules/billing/application/command/dto/request/mark-billing-order-paid.command';
import { CreateVoteUsageBillingOrderHandler } from '../../../../src/modules/billing/application/command/handler/create-vote-usage-billing-order.handler';
import { MarkBillingOrderPaidHandler } from '../../../../src/modules/billing/application/command/handler/mark-billing-order-paid.handler';
import type { BillingOrderRepositoryPort } from '../../../../src/modules/billing/application/port/persistence/command/billing-order-repository.port';
import { BillingOrderAggregate } from '../../../../src/modules/billing/domain/billing-order.aggregate';
import { VoteUsagePrice } from '../../../../src/modules/billing/domain/vo/vote-usage-price.vo';
import type { VoteAccessPort } from '../../../../src/shared/application/port/capability/vote-access.port';
import type { VoteElectorCountAccessPort } from '../../../../src/shared/application/port/capability/vote-elector-count-access.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';
import type { VoteSetupLifecyclePort } from '../../../../src/shared/application/port/capability/vote-billing.port';
import { CancelVoteUsageBillingOrderCommand } from '../../../../src/modules/billing/application/command/dto/request/cancel-vote-usage-billing-order.command';
import { CancelVoteUsageBillingOrderHandler } from '../../../../src/modules/billing/application/command/handler/cancel-vote-usage-billing-order.handler';
import { BillingOrderOutboxRecorder } from '../../../../src/modules/billing/application/event/billing-order-outbox.recorder';
import type { IntegrationEventOutboxPort } from '../../../../src/shared/application/port/messaging/integration-event-outbox.port';

describe('billing command handlers', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');

  it('creates one server-priced order for the vote creator without commission membership', async () => {
    const repository = repositoryStub();
    const voteLifecycle = voteLifecycleStub();
    const outbox = outboxStub();
    const handler = new CreateVoteUsageBillingOrderHandler(
      repository,
      voteAccessStub(),
      electorCountStub(120),
      voteLifecycle,
      new BillingOrderOutboxRecorder(outbox),
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
    expect(outbox.append.mock.calls).toContainEqual([
      [
        expect.objectContaining({
          eventType: 'billing.order-issued.v1',
          aggregateVersion: 1,
        }),
      ],
    ]);
    expect(repository.save.mock.invocationCallOrder[0]).toBeLessThan(
      outbox.append.mock.invocationCallOrder[0],
    );
    expect(voteLifecycle.finalizeForBilling.mock.calls).toContainEqual([
      {
        voteId: 'vote-1',
        billingOrderId: 'billing-order-1',
        finalizedAt: now,
      },
    ]);
  });

  it('returns the existing order to its owner even when the legacy vote creator is unknown', async () => {
    const existing = order();
    const repository = repositoryStub(existing);
    const countEligibleElectors = jest.fn();
    const outbox = outboxStub();
    const handler = new CreateVoteUsageBillingOrderHandler(
      repository,
      voteAccessStub({}),
      { countEligibleElectors },
      voteLifecycleStub(),
      new BillingOrderOutboxRecorder(outbox),
      transactionManagerStub(),
    );

    await expect(handler.execute(createCommand())).resolves.toMatchObject({
      id: existing.id,
    });
    expect(countEligibleElectors).not.toHaveBeenCalled();
    expect(repository.save.mock.calls).toHaveLength(0);
    expect(outbox.append.mock.calls).toHaveLength(0);
  });

  it('does not return an existing order to a different vote creator', async () => {
    const existing = order('another-user');
    const repository = repositoryStub(existing);
    const handler = new CreateVoteUsageBillingOrderHandler(
      repository,
      voteAccessStub({ createdByUserPrincipalId: 'user-1' }),
      electorCountStub(120),
      voteLifecycleStub(),
      new BillingOrderOutboxRecorder(outboxStub()),
      transactionManagerStub(),
    );

    await expect(handler.execute(createCommand())).rejects.toThrow(
      'vote billing access denied',
    );
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('rejects an active commission member who did not create the vote', async () => {
    const repository = repositoryStub();
    const outbox = outboxStub();
    const handler = new CreateVoteUsageBillingOrderHandler(
      repository,
      voteAccessStub({ createdByUserPrincipalId: 'another-user' }),
      electorCountStub(120),
      voteLifecycleStub(),
      new BillingOrderOutboxRecorder(outbox),
      transactionManagerStub(),
    );

    await expect(handler.execute(createCommand())).rejects.toThrow(
      'vote billing access denied',
    );
    expect(repository.save.mock.calls).toHaveLength(0);
    expect(outbox.append.mock.calls).toHaveLength(0);
  });

  it('rejects a legacy vote whose creator is unknown', async () => {
    const repository = repositoryStub();
    const handler = new CreateVoteUsageBillingOrderHandler(
      repository,
      voteAccessStub({}),
      electorCountStub(120),
      voteLifecycleStub(),
      new BillingOrderOutboxRecorder(outboxStub()),
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
    const outbox = outboxStub();

    const result = await new MarkBillingOrderPaidHandler(
      repository,
      new BillingOrderOutboxRecorder(outbox),
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
    expect(outbox.append.mock.calls).toContainEqual([
      [
        expect.objectContaining({
          eventType: 'billing.order-paid.v1',
          aggregateVersion: 2,
        }),
      ],
    ]);
  });

  it('cancels the finalized vote and requests a refund for a paid order', async () => {
    const existing = order();
    existing.markPaid({
      paymentId: 'payment-1',
      paidAmount: 6_000,
      paidCurrency: 'KRW',
      paidAt: now,
    });
    existing.clearDomainEvents();
    const repository = repositoryStub(existing);
    const voteLifecycle = voteLifecycleStub();
    const outbox = outboxStub();

    const result = await new CancelVoteUsageBillingOrderHandler(
      repository,
      voteLifecycle,
      new BillingOrderOutboxRecorder(outbox),
      transactionManagerStub(),
    ).execute(
      CancelVoteUsageBillingOrderCommand.of({
        billingOrderId: existing.id,
        userPrincipalId: 'user-1',
        reason: '일정 변경',
        canceledAt: new Date('2026-09-01T00:00:00.000Z'),
      }),
    );

    expect(result.status).toBe('REFUND_PENDING');
    expect(voteLifecycle.cancelFinalizedVote.mock.calls).toContainEqual([
      {
        voteId: 'vote-1',
        canceledAt: new Date('2026-09-01T00:00:00.000Z'),
      },
    ]);
    expect(repository.save.mock.calls).toContainEqual([existing]);
    expect(outbox.append.mock.calls).toContainEqual([
      [
        expect.objectContaining({
          eventType: 'billing.refund-requested.v1',
          aggregateVersion: 3,
        }),
      ],
    ]);
  });

  it('cancels an unpaid order only for the recorded order owner', async () => {
    const existing = order();
    const repository = repositoryStub(existing);
    const lifecycle = voteLifecycleStub();
    const outbox = outboxStub();
    const unauthorizedCommand = CancelVoteUsageBillingOrderCommand.of({
      billingOrderId: existing.id,
      userPrincipalId: 'another-user',
      reason: '일정 변경',
      canceledAt: new Date('2026-09-01T00:00:00.000Z'),
    });

    await expect(
      new CancelVoteUsageBillingOrderHandler(
        repository,
        lifecycle,
        new BillingOrderOutboxRecorder(outbox),
        transactionManagerStub(),
      ).execute(unauthorizedCommand),
    ).rejects.toThrow('vote billing access denied');
    expect(lifecycle.lockVote.mock.calls).toHaveLength(0);

    const ownerCommand = CancelVoteUsageBillingOrderCommand.of({
      billingOrderId: existing.id,
      userPrincipalId: 'user-1',
      reason: '일정 변경',
      canceledAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    await expect(
      new CancelVoteUsageBillingOrderHandler(
        repository,
        lifecycle,
        new BillingOrderOutboxRecorder(outbox),
        transactionManagerStub(),
      ).execute(ownerCommand),
    ).resolves.toMatchObject({ status: 'CANCELED' });
    expect(repository.findByIdForUpdate.mock.calls).toHaveLength(1);
    expect(outbox.append.mock.calls).toContainEqual([
      [expect.objectContaining({ eventType: 'billing.order-canceled.v1' })],
    ]);
  });

  it('does not persist cancellation when the finalized vote has opened', async () => {
    const existing = order();
    const repository = repositoryStub(existing);
    const lifecycle = voteLifecycleStub();
    const outbox = outboxStub();
    lifecycle.cancelFinalizedVote.mockRejectedValue(
      new Error('only unopened finalized votes can be canceled'),
    );

    await expect(
      new CancelVoteUsageBillingOrderHandler(
        repository,
        lifecycle,
        new BillingOrderOutboxRecorder(outbox),
        transactionManagerStub(),
      ).execute(
        CancelVoteUsageBillingOrderCommand.of({
          billingOrderId: existing.id,
          userPrincipalId: 'user-1',
          reason: '일정 변경',
          canceledAt: new Date('2026-09-01T00:00:00.000Z'),
        }),
      ),
    ).rejects.toThrow('only unopened finalized votes can be canceled');
    expect(repository.save.mock.calls).toHaveLength(0);
    expect(outbox.append.mock.calls).toHaveLength(0);
  });

  it('keeps domain events pending when the outbox append fails', async () => {
    const repository = repositoryStub();
    const outbox = outboxStub();
    outbox.append.mockRejectedValue(new Error('outbox unavailable'));
    const handler = new CreateVoteUsageBillingOrderHandler(
      repository,
      voteAccessStub(),
      electorCountStub(120),
      voteLifecycleStub(),
      new BillingOrderOutboxRecorder(outbox),
      transactionManagerStub(),
    );

    await expect(handler.execute(createCommand())).rejects.toThrow(
      'outbox unavailable',
    );

    const savedOrder = repository.save.mock.calls[0][0];
    expect(savedOrder.domainEvents()).toHaveLength(1);
  });

  function createCommand(): CreateVoteUsageBillingOrderCommand {
    return CreateVoteUsageBillingOrderCommand.of({
      voteId: 'vote-1',
      orderedByUserPrincipalId: 'user-1',
      issuedAt: now,
    });
  }

  function order(orderedByUserPrincipalId = 'user-1'): BillingOrderAggregate {
    const existing = BillingOrderAggregate.issue({
      id: 'billing-order-1',
      voteId: 'vote-1',
      commissionId: 'commission-1',
      orderedByUserPrincipalId,
      price: VoteUsagePrice.forElectorCount(120),
      issuedAt: now,
    });
    existing.clearDomainEvents();
    return existing;
  }

  function repositoryStub(
    existing?: BillingOrderAggregate,
  ): jest.Mocked<BillingOrderRepositoryPort> {
    return {
      nextId: jest.fn().mockReturnValue('billing-order-1'),
      findById: jest.fn().mockResolvedValue(existing),
      findByIdForUpdate: jest.fn().mockResolvedValue(existing),
      findByVoteId: jest.fn().mockResolvedValue(existing),
      findByVoteIdForUpdate: jest.fn().mockResolvedValue(existing),
      save: jest.fn().mockResolvedValue(undefined),
    };
  }

  function voteAccessStub(
    options: { readonly createdByUserPrincipalId?: string } = {
      createdByUserPrincipalId: 'user-1',
    },
  ): VoteAccessPort {
    return {
      findById: jest.fn().mockResolvedValue({
        id: 'vote-1',
        commissionId: 'commission-1',
        createdByUserPrincipalId: options.createdByUserPrincipalId,
        isCreatedBy: (userPrincipalId) =>
          options.createdByUserPrincipalId === userPrincipalId,
      }),
    };
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

  function outboxStub(): jest.Mocked<IntegrationEventOutboxPort> {
    return {
      append: jest.fn().mockResolvedValue(undefined),
    };
  }

  function voteLifecycleStub(): jest.Mocked<VoteSetupLifecyclePort> {
    return {
      lockVote: jest.fn().mockResolvedValue(undefined),
      finalizeForBilling: jest.fn().mockResolvedValue(undefined),
      cancelFinalizedVote: jest.fn().mockResolvedValue(undefined),
    };
  }
});

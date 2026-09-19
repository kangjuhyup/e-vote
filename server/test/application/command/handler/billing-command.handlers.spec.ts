import { CreateVoteUsageBillingOrderCommand } from '../../../../src/modules/billing/application/command/dto/request/create-vote-usage-billing-order.command';
import { MarkBillingOrderPaidCommand } from '../../../../src/modules/billing/application/command/dto/request/mark-billing-order-paid.command';
import { MarkBillingOrderRefundedCommand } from '../../../../src/modules/billing/application/command/dto/request/mark-billing-order-refunded.command';
import { CreateVoteUsageBillingOrderHandler } from '../../../../src/modules/billing/application/command/handler/create-vote-usage-billing-order.handler';
import { MarkBillingOrderPaidHandler } from '../../../../src/modules/billing/application/command/handler/mark-billing-order-paid.handler';
import { MarkBillingOrderRefundedHandler } from '../../../../src/modules/billing/application/command/handler/mark-billing-order-refunded.handler';
import type { BillingOrderRepositoryPort } from '../../../../src/modules/billing/application/port/persistence/command/billing-order-repository.port';
import { BillingOrderAggregate } from '../../../../src/modules/billing/domain/billing-order.aggregate';
import { VoteUsagePrice } from '../../../../src/modules/billing/domain/vo/vote-usage-price.vo';
import type { VoteAccessPort } from '../../../../src/shared/application/port/capability/vote-access.port';
import type { VoteElectorCountAccessPort } from '../../../../src/shared/application/port/capability/vote-elector-count-access.port';
import type { VoteResultStoragePricingAccessPort } from '../../../../src/shared/application/port/capability/vote-result-storage-pricing-access.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';
import type { VoteSetupLifecyclePort } from '../../../../src/shared/application/port/capability/vote-billing.port';
import { CancelVoteUsageBillingOrderCommand } from '../../../../src/modules/billing/application/command/dto/request/cancel-vote-usage-billing-order.command';
import { CancelVoteUsageBillingOrderHandler } from '../../../../src/modules/billing/application/command/handler/cancel-vote-usage-billing-order.handler';
import { BillingOrderOutboxRecorder } from '../../../../src/modules/billing/application/event/billing-order-outbox.recorder';
import type { IntegrationEventOutboxPort } from '../../../../src/shared/application/port/messaging/integration-event-outbox.port';
import { VoteFinalizationWindowClosedError } from '../../../../src/shared/domain/voting/vote-finalization.error';

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
      blockchainStorageCountStub(2),
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
      baseAmount: 6_000,
      blockchainStorageCount: 2,
      blockchainStorageUnitPrice: 3_000,
      blockchainStorageAmount: 6_000,
      identityVerificationRequired: false,
      identityVerificationUnitPrice: 30_000,
      identityVerificationAmount: 0,
      amount: 12_000,
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
    expect(voteLifecycle.lockForBilling.mock.calls).toContainEqual([
      {
        voteId: 'vote-1',
        billingOrderId: 'billing-order-1',
      },
    ]);
  });

  it('adds the identity verification surcharge when verification is required', async () => {
    const handler = new CreateVoteUsageBillingOrderHandler(
      repositoryStub(),
      voteAccessStub({
        createdByUserPrincipalId: 'user-1',
        identityVerificationRequired: true,
      }),
      electorCountStub(120),
      blockchainStorageCountStub(0),
      voteLifecycleStub(),
      new BillingOrderOutboxRecorder(outboxStub()),
      transactionManagerStub(),
    );

    await expect(handler.execute(createCommand())).resolves.toMatchObject({
      baseAmount: 6_000,
      identityVerificationRequired: true,
      identityVerificationUnitPrice: 30_000,
      identityVerificationAmount: 60_000,
      amount: 66_000,
    });
  });

  it.each([
    ['at', new Date('2026-08-30T00:00:00.000Z')],
    ['after', new Date('2026-08-29T23:59:59.999Z')],
  ])(
    'rejects order creation %s the voting start boundary',
    async (_label, startedAt) => {
      const repository = repositoryStub();
      const lifecycle = voteLifecycleStub();
      const outbox = outboxStub();
      const handler = new CreateVoteUsageBillingOrderHandler(
        repository,
        voteAccessStub({
          createdByUserPrincipalId: 'user-1',
          startedAt,
        }),
        electorCountStub(120),
        blockchainStorageCountStub(0),
        lifecycle,
        new BillingOrderOutboxRecorder(outbox),
        transactionManagerStub(),
      );

      await expect(handler.execute(createCommand())).rejects.toThrow(
        'vote cannot be finalized at or after its start time',
      );
      expect(lifecycle.lockForBilling.mock.calls).toHaveLength(0);
      expect(repository.save.mock.calls).toHaveLength(0);
      expect(outbox.append.mock.calls).toHaveLength(0);
    },
  );

  it('returns the existing order to its owner even when the legacy vote creator is unknown', async () => {
    const existing = order();
    const repository = repositoryStub(existing);
    const countEligibleElectors = jest.fn();
    const countBlockchainVoteDetails = jest.fn();
    const outbox = outboxStub();
    const handler = new CreateVoteUsageBillingOrderHandler(
      repository,
      voteAccessStub({ billingOrderId: existing.id }),
      { countEligibleElectors },
      { countBlockchainVoteDetails },
      voteLifecycleStub(),
      new BillingOrderOutboxRecorder(outbox),
      transactionManagerStub(),
    );

    await expect(handler.execute(createCommand())).resolves.toMatchObject({
      id: existing.id,
    });
    expect(countEligibleElectors).not.toHaveBeenCalled();
    expect(countBlockchainVoteDetails).not.toHaveBeenCalled();
    expect(repository.save.mock.calls).toHaveLength(0);
    expect(outbox.append.mock.calls).toHaveLength(0);
  });

  it('does not return an existing order to a different vote creator', async () => {
    const existing = order('another-user');
    const repository = repositoryStub(existing);
    const handler = new CreateVoteUsageBillingOrderHandler(
      repository,
      voteAccessStub({
        createdByUserPrincipalId: 'user-1',
        billingOrderId: existing.id,
      }),
      electorCountStub(120),
      blockchainStorageCountStub(0),
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
      blockchainStorageCountStub(0),
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
      blockchainStorageCountStub(0),
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
    const voteLifecycle = voteLifecycleStub();
    const outbox = outboxStub();

    const result = await new MarkBillingOrderPaidHandler(
      repository,
      voteLifecycle,
      new BillingOrderOutboxRecorder(outbox),
      transactionManagerStub(),
      () => now,
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
    expect(voteLifecycle.finalizePaidBilling.mock.calls).toEqual([
      [
        {
          voteId: 'vote-1',
          billingOrderId: 'billing-order-1',
          finalizedAt: now,
        },
      ],
    ]);
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

  it('requests a refund without retrying when payment completes after voting starts', async () => {
    const existing = order();
    const repository = repositoryStub(existing);
    const voteLifecycle = voteLifecycleStub();
    const outbox = outboxStub();
    const finalizedAt = new Date('2026-09-08T11:30:00.000Z');
    voteLifecycle.finalizePaidBilling.mockRejectedValue(
      new VoteFinalizationWindowClosedError(),
    );

    const result = await new MarkBillingOrderPaidHandler(
      repository,
      voteLifecycle,
      new BillingOrderOutboxRecorder(outbox),
      transactionManagerStub(),
      () => finalizedAt,
    ).execute(
      MarkBillingOrderPaidCommand.of({
        billingOrderId: existing.id,
        paymentId: 'payment-1',
        amount: 6_000,
        currency: 'KRW',
        paidAt: now,
      }),
    );

    expect(voteLifecycle.finalizePaidBilling.mock.calls).toEqual([
      [
        {
          voteId: 'vote-1',
          billingOrderId: 'billing-order-1',
          finalizedAt,
        },
      ],
    ]);
    expect(result.status).toBe('REFUND_PENDING');
    expect(repository.save.mock.calls).toEqual([[existing]]);
    expect(outbox.append.mock.calls).toEqual([
      [
        [
          expect.objectContaining({ eventType: 'billing.order-paid.v1' }),
          expect.objectContaining({ eventType: 'billing.refund-requested.v1' }),
        ],
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
    expect(
      voteLifecycle.assertBillingCancellationAllowed.mock.calls,
    ).toContainEqual([
      {
        voteId: 'vote-1',
        billingOrderId: 'billing-order-1',
        canceledAt: new Date('2026-09-01T00:00:00.000Z'),
      },
    ]);
    expect(voteLifecycle.releaseBilling.mock.calls).toHaveLength(0);
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

  it('allows a paid order refund after seven days when the vote has not started', async () => {
    const existing = order();
    existing.markPaid({
      paymentId: 'payment-1',
      paidAmount: 6_000,
      paidCurrency: 'KRW',
      paidAt: now,
    });
    existing.clearDomainEvents();
    const repository = repositoryStub(existing);
    const lifecycle = voteLifecycleStub();

    await expect(
      new CancelVoteUsageBillingOrderHandler(
        repository,
        lifecycle,
        new BillingOrderOutboxRecorder(outboxStub()),
        transactionManagerStub(),
      ).execute(
        CancelVoteUsageBillingOrderCommand.of({
          billingOrderId: existing.id,
          userPrincipalId: 'user-1',
          reason: '투표 취소',
          canceledAt: new Date('2026-09-10T00:00:00.000Z'),
        }),
      ),
    ).resolves.toMatchObject({ status: 'REFUND_PENDING' });
    expect(
      lifecycle.assertBillingCancellationAllowed.mock.calls,
    ).toContainEqual([
      {
        voteId: existing.voteId,
        billingOrderId: existing.id,
        canceledAt: new Date('2026-09-10T00:00:00.000Z'),
      },
    ]);
  });

  it('does not request a refund after an upcoming notice dispatch began', async () => {
    const existing = order();
    existing.markPaid({
      paymentId: 'payment-1',
      paidAmount: 6_000,
      paidCurrency: 'KRW',
      paidAt: now,
    });
    existing.clearDomainEvents();
    const repository = repositoryStub(existing);
    const lifecycle = voteLifecycleStub();
    const outbox = outboxStub();
    lifecycle.assertBillingCancellationAllowed.mockRejectedValue(
      new Error(
        'vote billing cannot be canceled after an upcoming vote notice dispatch started',
      ),
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
          reason: '투표 취소',
          canceledAt: new Date('2026-09-01T00:00:00.000Z'),
        }),
      ),
    ).rejects.toThrow('upcoming vote notice dispatch started');
    expect(existing.status).toBe('PAID');
    expect(repository.save.mock.calls).toHaveLength(0);
    expect(outbox.append.mock.calls).toHaveLength(0);
  });

  it.each(['REFUND_PENDING', 'REFUNDED'] as const)(
    'does not finalize the vote when payment success is replayed for a %s order',
    async (status) => {
      const existing = order();
      existing.markPaid({
        paymentId: 'payment-1',
        paidAmount: 6_000,
        paidCurrency: 'KRW',
        paidAt: now,
      });
      existing.requestCancellation({
        reason: '일정 변경',
        canceledAt: new Date('2026-09-01T00:00:00.000Z'),
      });
      if (status === 'REFUNDED') {
        existing.markRefunded(new Date('2026-09-01T00:01:00.000Z'));
      }
      existing.clearDomainEvents();
      const repository = repositoryStub(existing);
      const lifecycle = voteLifecycleStub();
      const outbox = outboxStub();

      await new MarkBillingOrderPaidHandler(
        repository,
        lifecycle,
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

      expect(existing.status).toBe(status);
      expect(lifecycle.finalizePaidBilling.mock.calls).toHaveLength(0);
      expect(outbox.append.mock.calls).toHaveLength(0);
    },
  );

  it('applies a mock payment refund result through the internal handler', async () => {
    const existing = order();
    existing.markPaid({
      paymentId: 'payment-1',
      paidAmount: 6_000,
      paidCurrency: 'KRW',
      paidAt: now,
    });
    existing.requestCancellation({
      reason: '일정 변경',
      canceledAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    existing.clearDomainEvents();
    const repository = repositoryStub(existing);
    const voteLifecycle = voteLifecycleStub();
    const outbox = outboxStub();
    const refundedAt = new Date('2026-09-01T00:01:00.000Z');

    const result = await new MarkBillingOrderRefundedHandler(
      repository,
      voteLifecycle,
      new BillingOrderOutboxRecorder(outbox),
      transactionManagerStub(),
    ).execute(
      MarkBillingOrderRefundedCommand.of({
        billingOrderId: existing.id,
        refundedAt,
      }),
    );

    expect(result).toMatchObject({ status: 'REFUNDED', refundedAt });
    expect(voteLifecycle.releaseBilling.mock.calls).toEqual([
      [
        {
          voteId: 'vote-1',
          billingOrderId: 'billing-order-1',
        },
      ],
    ]);
    expect(repository.save.mock.calls).toEqual([[existing]]);
    expect(outbox.append.mock.calls).toContainEqual([
      [
        expect.objectContaining({
          eventType: 'billing.order-refunded.v1',
          aggregateVersion: 4,
        }),
      ],
    ]);
  });

  it('keeps a replacement billing lock untouched when a refunded event is replayed', async () => {
    const existing = order();
    existing.markPaid({
      paymentId: 'payment-1',
      paidAmount: 6_000,
      paidCurrency: 'KRW',
      paidAt: now,
    });
    existing.requestCancellation({
      reason: '일정 변경',
      canceledAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    existing.markRefunded(new Date('2026-09-01T00:01:00.000Z'));
    existing.clearDomainEvents();
    const repository = repositoryStub(existing);
    const voteLifecycle = voteLifecycleStub();
    const outbox = outboxStub();

    await new MarkBillingOrderRefundedHandler(
      repository,
      voteLifecycle,
      new BillingOrderOutboxRecorder(outbox),
      transactionManagerStub(),
    ).execute(
      MarkBillingOrderRefundedCommand.of({
        billingOrderId: existing.id,
        refundedAt: new Date('2026-09-01T00:02:00.000Z'),
      }),
    );

    expect(voteLifecycle.releaseBilling.mock.calls).toHaveLength(0);
    expect(outbox.append.mock.calls).toHaveLength(0);
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
    expect(lifecycle.releaseBilling.mock.calls).toContainEqual([
      { voteId: 'vote-1', billingOrderId: 'billing-order-1' },
    ]);
    expect(repository.findByIdForUpdate.mock.calls).toHaveLength(1);
    expect(outbox.append.mock.calls).toContainEqual([
      [expect.objectContaining({ eventType: 'billing.order-canceled.v1' })],
    ]);
  });

  it('does not release a later billing lock when cancellation is replayed', async () => {
    const existing = order();
    existing.requestCancellation({
      reason: '일정 변경',
      canceledAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    existing.clearDomainEvents();
    const repository = repositoryStub(existing);
    const lifecycle = voteLifecycleStub();
    const outbox = outboxStub();

    await new CancelVoteUsageBillingOrderHandler(
      repository,
      lifecycle,
      new BillingOrderOutboxRecorder(outbox),
      transactionManagerStub(),
    ).execute(
      CancelVoteUsageBillingOrderCommand.of({
        billingOrderId: existing.id,
        userPrincipalId: 'user-1',
        reason: '일정 변경',
        canceledAt: new Date('2026-09-01T00:01:00.000Z'),
      }),
    );

    expect(lifecycle.assertBillingCancellationAllowed.mock.calls).toHaveLength(
      0,
    );
    expect(lifecycle.releaseBilling.mock.calls).toHaveLength(0);
    expect(outbox.append.mock.calls).toHaveLength(0);
  });

  it('does not persist cancellation when the finalized vote has opened', async () => {
    const existing = order();
    const repository = repositoryStub(existing);
    const lifecycle = voteLifecycleStub();
    const outbox = outboxStub();
    lifecycle.assertBillingCancellationAllowed.mockRejectedValue(
      new Error('only unopened votes can cancel billing'),
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
    ).rejects.toThrow('only unopened votes can cancel billing');
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
      blockchainStorageCountStub(0),
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
      findActiveByVoteIdForUpdate: jest.fn().mockResolvedValue(existing),
      save: jest.fn().mockResolvedValue(undefined),
    };
  }

  function voteAccessStub(
    options: {
      readonly createdByUserPrincipalId?: string;
      readonly billingOrderId?: string;
      readonly identityVerificationRequired?: boolean;
      readonly startedAt?: Date;
    } = {
      createdByUserPrincipalId: 'user-1',
    },
  ): VoteAccessPort {
    return {
      findById: jest.fn().mockResolvedValue({
        id: 'vote-1',
        commissionId: 'commission-1',
        createdByUserPrincipalId: options.createdByUserPrincipalId,
        billingOrderId: options.billingOrderId,
        identityVerificationPolicy: {
          required: options.identityVerificationRequired ?? false,
        },
        isCreatedBy: (userPrincipalId) =>
          options.createdByUserPrincipalId === userPrincipalId,
        assertCanFinalizeAt: (finalizedAt: Date) => {
          const startedAt =
            options.startedAt ?? new Date('2026-08-31T00:00:00.000Z');
          if (finalizedAt.getTime() >= startedAt.getTime()) {
            throw new VoteFinalizationWindowClosedError();
          }
        },
      }),
    };
  }

  function electorCountStub(count: number): VoteElectorCountAccessPort {
    return {
      countEligibleElectors: jest.fn().mockResolvedValue(count),
    };
  }

  function blockchainStorageCountStub(
    count: number,
  ): VoteResultStoragePricingAccessPort {
    return {
      countBlockchainVoteDetails: jest.fn().mockResolvedValue(count),
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
      lockForBilling: jest.fn().mockResolvedValue(undefined),
      finalizePaidBilling: jest.fn().mockResolvedValue(undefined),
      assertBillingCancellationAllowed: jest.fn().mockResolvedValue(undefined),
      releaseBilling: jest.fn().mockResolvedValue(undefined),
    };
  }
});

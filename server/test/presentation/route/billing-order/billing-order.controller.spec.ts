import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { CreateVoteUsageBillingOrderHandler } from '../../../../src/modules/billing/application/command/handler/create-vote-usage-billing-order.handler';
import type { GetBillingOrderHandler } from '../../../../src/modules/billing/application/query/handler/get-billing-order.handler';
import { VoteBillingAccessDeniedError } from '../../../../src/modules/billing/application/billing.error';
import { BillingOrderController } from '../../../../src/modules/billing/presentation/billing-order/billing-order.controller';
import { DomainError } from '../../../../src/shared/domain/domain-error';
import { TEST_USER_PRINCIPAL } from '../../user-principal.fixture';

describe('BillingOrderController', () => {
  const result = {
    id: 'billing-order-1',
    voteId: 'vote-1',
    productCode: 'VOTE_USAGE',
    productName: '투표 개설 이용료',
    electorCount: 120,
    pricingUnitSize: 100,
    pricingUnitCount: 2,
    unitPrice: 3_000,
    baseAmount: 6_000,
    blockchainStorageCount: 2,
    blockchainStorageUnitPrice: 3_000,
    blockchainStorageAmount: 6_000,
    identityVerificationRequired: true,
    identityVerificationUnitPrice: 30_000,
    identityVerificationAmount: 60_000,
    amount: 72_000,
    currency: 'KRW',
    status: 'PENDING_PAYMENT' as const,
    issuedAt: new Date('2026-08-30T00:00:00.000Z'),
    cancellationWindowDays: 7,
    cancelableUntil: new Date('2026-09-06T00:00:00.000Z'),
  };

  it('uses request.user as the order actor and ignores client pricing', async () => {
    const create = handler(result);
    const controller = new BillingOrderController(
      create as unknown as CreateVoteUsageBillingOrderHandler,
      handler() as unknown as GetBillingOrderHandler,
    );

    await expect(
      controller.create(TEST_USER_PRINCIPAL, { voteId: 'vote-1' }),
    ).resolves.toMatchObject({
      id: 'billing-order-1',
      electorCount: 120,
      pricingUnitCount: 2,
      unitPrice: 3_000,
      baseAmount: 6_000,
      blockchainStorageCount: 2,
      blockchainStorageUnitPrice: 3_000,
      blockchainStorageAmount: 6_000,
      identityVerificationRequired: true,
      identityVerificationUnitPrice: 30_000,
      identityVerificationAmount: 60_000,
      amount: 72_000,
      issuedAt: '2026-08-30T00:00:00.000Z',
      cancellationWindowDays: 7,
      cancelableUntil: '2026-09-06T00:00:00.000Z',
    });
    expect(create.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        voteId: 'vote-1',
        orderedByUserPrincipalId: TEST_USER_PRINCIPAL.id,
      }),
    );
  });

  it('maps membership denial and an empty electorate to explicit HTTP errors', async () => {
    const denied = new BillingOrderController(
      rejectingHandler(
        new VoteBillingAccessDeniedError(),
      ) as unknown as CreateVoteUsageBillingOrderHandler,
      handler() as unknown as GetBillingOrderHandler,
    );
    await expect(
      denied.create(TEST_USER_PRINCIPAL, { voteId: 'vote-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const emptyElectorate = new BillingOrderController(
      rejectingHandler(
        new DomainError('vote usage elector count must be positive'),
      ) as unknown as CreateVoteUsageBillingOrderHandler,
      handler() as unknown as GetBillingOrderHandler,
    );
    await expect(
      emptyElectorate.create(TEST_USER_PRINCIPAL, { voteId: 'vote-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps a closed finalization window to HTTP 409 with the domain message', async () => {
    const controller = new BillingOrderController(
      rejectingHandler(
        new DomainError('vote cannot be finalized at or after its start time'),
      ) as unknown as CreateVoteUsageBillingOrderHandler,
      handler() as unknown as GetBillingOrderHandler,
    );

    let caught: unknown;
    try {
      await controller.create(TEST_USER_PRINCIPAL, { voteId: 'vote-1' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConflictException);
    expect((caught as ConflictException).getResponse()).toEqual({
      statusCode: 409,
      message: 'vote cannot be finalized at or after its start time',
      error: 'Conflict',
    });
  });
});

function handler(result?: unknown) {
  return { execute: jest.fn().mockResolvedValue(result) };
}

function rejectingHandler(error: Error) {
  return { execute: jest.fn().mockRejectedValue(error) };
}

import { BadRequestException, ConflictException } from '@nestjs/common';
import type { CancelVoteUsageBillingOrderHandler } from '../../../../src/modules/billing/application/command/handler/cancel-vote-usage-billing-order.handler';
import { BillingOrderCancellationController } from '../../../../src/modules/billing/presentation/billing-order/billing-order-cancellation.controller';
import { DomainError } from '../../../../src/shared/domain/domain-error';
import { TEST_USER_PRINCIPAL } from '../../user-principal.fixture';
import type { CancelVoteUsageBillingOrderCommand } from '../../../../src/modules/billing/application/command/dto/request/cancel-vote-usage-billing-order.command';

describe('BillingOrderCancellationController', () => {
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
    blockchainStorageCount: 0,
    blockchainStorageUnitPrice: 3_000,
    blockchainStorageAmount: 0,
    amount: 6_000,
    currency: 'KRW',
    status: 'REFUND_PENDING' as const,
    paymentId: 'payment-1',
    issuedAt: new Date('2026-08-30T00:00:00.000Z'),
    cancellationWindowDays: 7,
    cancelableUntil: new Date('2026-09-06T00:00:00.000Z'),
    paidAt: new Date('2026-08-30T01:00:00.000Z'),
    canceledAt: new Date('2026-09-01T00:00:00.000Z'),
    cancellationReason: '일정 변경',
    refundRequestedAt: new Date('2026-09-01T00:00:00.000Z'),
  };

  it('uses request.user as the cancellation actor', async () => {
    const execute = jest
      .fn<Promise<typeof result>, [CancelVoteUsageBillingOrderCommand]>()
      .mockResolvedValue(result);
    const controller = new BillingOrderCancellationController({
      execute,
    } as unknown as CancelVoteUsageBillingOrderHandler);

    await expect(
      controller.cancel(
        TEST_USER_PRINCIPAL,
        { billingOrderId: 'billing-order-1' },
        { reason: '일정 변경' },
      ),
    ).resolves.toMatchObject({
      status: 'REFUND_PENDING',
      cancellationReason: '일정 변경',
      refundRequestedAt: '2026-09-01T00:00:00.000Z',
    });
    const command = execute.mock.calls[0]?.[0];
    expect(command).toMatchObject({
      billingOrderId: 'billing-order-1',
      userPrincipalId: TEST_USER_PRINCIPAL.id,
      reason: '일정 변경',
    });
    expect(command?.canceledAt).toBeInstanceOf(Date);
  });

  it('maps an expired cancellation window to conflict', async () => {
    const controller = new BillingOrderCancellationController({
      execute: jest
        .fn()
        .mockRejectedValue(new DomainError('cancellation window has expired')),
    } as unknown as CancelVoteUsageBillingOrderHandler);

    await expect(
      controller.cancel(
        TEST_USER_PRINCIPAL,
        { billingOrderId: 'billing-order-1' },
        { reason: '일정 변경' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a malformed cancellation reason before the handler', async () => {
    const execute = jest.fn();
    const controller = new BillingOrderCancellationController({
      execute,
    } as unknown as CancelVoteUsageBillingOrderHandler);

    await expect(
      controller.cancel(
        TEST_USER_PRINCIPAL,
        { billingOrderId: 'billing-order-1' },
        { reason: undefined as unknown as string },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(execute.mock.calls).toHaveLength(0);
  });
});

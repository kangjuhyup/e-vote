import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../../../shared/domain/domain-error';
import { GetBillingOrderHandler } from '../../query/handler/get-billing-order.handler';
import { GetBillingOrderQuery } from '../../query/dto/request/get-billing-order.query';
import {
  BILLING_PAYMENT_FAILURE_REPOSITORY_PORT,
  type BillingPaymentFailureRepositoryPort,
} from '../../port/persistence/command/billing-payment-failure-repository.port';

@Injectable()
export class RecordBillingPaymentFailureHandler {
  constructor(
    private readonly getOrder: GetBillingOrderHandler,
    @Inject(BILLING_PAYMENT_FAILURE_REPOSITORY_PORT)
    private readonly failures: BillingPaymentFailureRepositoryPort,
  ) {}

  async execute(input: {
    billingOrderId: string;
    userPrincipalId: string;
    failureCode: string;
    failureMessage?: string;
  }): Promise<void> {
    const order = await this.getOrder.execute(
      GetBillingOrderQuery.of({
        billingOrderId: input.billingOrderId,
        userPrincipalId: input.userPrincipalId,
      }),
    );
    if (order.status !== 'PENDING_PAYMENT') {
      throw new DomainError('only pending orders can report a payment failure');
    }
    if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(input.failureCode)) {
      throw new DomainError('invalid payment failure code');
    }
    const failureMessage = input.failureMessage?.trim();
    if (failureMessage && failureMessage.length > 200) {
      throw new DomainError('payment failure message is too long');
    }
    await this.failures.record({
      billingOrderId: order.id,
      failureCode: input.failureCode,
      ...(failureMessage ? { failureMessage } : {}),
      reportedAt: new Date(),
    });
  }
}

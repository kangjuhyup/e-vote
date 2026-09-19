import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../../../shared/domain/domain-error';
import {
  PAYMENT_GATEWAY_PORT,
  type PaymentGatewayPort,
  type ProviderPayment,
} from '../../port/gateway/payment-gateway.port';
import { GetBillingOrderHandler } from '../../query/handler/get-billing-order.handler';
import { GetBillingOrderQuery } from '../../query/dto/request/get-billing-order.query';
import { MarkBillingOrderPaidHandler } from './mark-billing-order-paid.handler';
import { MarkBillingOrderPaidCommand } from '../dto/request/mark-billing-order-paid.command';
import type { BillingOrderResult } from '../dto/response/billing-order-result.dto';
import { TestPaymentUnavailableError } from '../../billing.error';
import { TOSS_TEST_PAYMENT_ENABLED } from '../../port/gateway/toss-test-payment-availability.port';

@Injectable()
export class ConfirmTossTestPaymentHandler {
  constructor(
    private readonly getOrder: GetBillingOrderHandler,
    private readonly markPaid: MarkBillingOrderPaidHandler,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
    @Inject(TOSS_TEST_PAYMENT_ENABLED)
    private readonly testPaymentEnabled: boolean,
  ) {}

  async execute(input: {
    billingOrderId: string;
    userPrincipalId: string;
    paymentKey: string;
    orderId: string;
    amount: number;
  }): Promise<BillingOrderResult> {
    if (!this.testPaymentEnabled) throw new TestPaymentUnavailableError();
    const order = await this.getOrder.execute(
      GetBillingOrderQuery.of({
        billingOrderId: input.billingOrderId,
        userPrincipalId: input.userPrincipalId,
      }),
    );
    if (input.orderId !== order.id || input.amount !== order.amount) {
      throw new DomainError('payment order or amount does not match');
    }
    if (order.status === 'PAID' && order.paymentId === input.paymentKey) {
      return this.markPaid.execute(
        MarkBillingOrderPaidCommand.of({
          billingOrderId: order.id,
          paymentId: input.paymentKey,
          amount: order.amount,
          currency: order.currency,
          paidAt: order.paidAt ?? new Date(),
        }),
      );
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw new DomainError('billing order is not awaiting payment');
    }

    const payment = await this.paymentGateway.confirm({
      paymentKey: input.paymentKey,
      orderId: order.id,
      amount: order.amount,
    });
    this.assertPayment(
      payment,
      order.id,
      input.paymentKey,
      order.amount,
      order.currency,
    );
    return this.markPaid.execute(
      MarkBillingOrderPaidCommand.of({
        billingOrderId: order.id,
        paymentId: payment.paymentKey,
        amount: payment.totalAmount,
        currency: payment.currency,
        paidAt: new Date(payment.approvedAt ?? Date.now()),
      }),
    );
  }

  private assertPayment(
    payment: ProviderPayment,
    orderId: string,
    paymentKey: string,
    amount: number,
    currency: string,
  ): void {
    if (
      payment.status !== 'DONE' ||
      payment.orderId !== orderId ||
      payment.paymentKey !== paymentKey ||
      payment.totalAmount !== amount ||
      payment.currency !== currency ||
      (payment.approvedAt !== undefined &&
        Number.isNaN(Date.parse(payment.approvedAt)))
    ) {
      throw new DomainError('confirmed payment does not match billing order');
    }
  }
}

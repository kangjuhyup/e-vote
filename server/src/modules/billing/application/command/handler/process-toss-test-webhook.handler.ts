import { Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_GATEWAY_PORT,
  type PaymentGatewayPort,
} from '../../port/gateway/payment-gateway.port';
import {
  BILLING_ORDER_REPOSITORY_PORT,
  type BillingOrderRepositoryPort,
} from '../../port/persistence/command/billing-order-repository.port';
import { MarkBillingOrderPaidHandler } from './mark-billing-order-paid.handler';
import { MarkBillingOrderPaidCommand } from '../dto/request/mark-billing-order-paid.command';
import { MarkBillingOrderRefundedHandler } from './mark-billing-order-refunded.handler';
import { MarkBillingOrderRefundedCommand } from '../dto/request/mark-billing-order-refunded.command';
import { TestPaymentUnavailableError } from '../../billing.error';
import { TOSS_TEST_PAYMENT_ENABLED } from '../../port/gateway/toss-test-payment-availability.port';

@Injectable()
export class ProcessTossTestWebhookHandler {
  constructor(
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly gateway: PaymentGatewayPort,
    @Inject(BILLING_ORDER_REPOSITORY_PORT)
    private readonly orders: BillingOrderRepositoryPort,
    private readonly markPaid: MarkBillingOrderPaidHandler,
    private readonly markRefunded: MarkBillingOrderRefundedHandler,
    @Inject(TOSS_TEST_PAYMENT_ENABLED)
    private readonly testPaymentEnabled: boolean,
  ) {}

  async execute(input: {
    eventType: string;
    paymentKey: string;
  }): Promise<void> {
    if (!this.testPaymentEnabled) throw new TestPaymentUnavailableError();
    if (input.eventType !== 'PAYMENT_STATUS_CHANGED') {
      return;
    }
    // General payment webhooks have no signature; query Toss with our secret key.
    const payment = await this.gateway.get(input.paymentKey);
    if (payment.paymentKey !== input.paymentKey) {
      throw new Error('provider payment key mismatch');
    }
    const order = await this.orders.findById(payment.orderId);
    if (
      !order ||
      order.price.amount !== payment.totalAmount ||
      order.price.currency !== payment.currency
    ) {
      throw new Error('provider payment does not match billing order');
    }
    if (payment.status === 'DONE' && order.status === 'PENDING_PAYMENT') {
      const paidAt = new Date(payment.approvedAt ?? Date.now());
      if (Number.isNaN(paidAt.getTime())) {
        throw new Error('provider payment has invalid approval date');
      }
      await this.markPaid.execute(
        MarkBillingOrderPaidCommand.of({
          billingOrderId: order.id,
          paymentId: payment.paymentKey,
          amount: payment.totalAmount,
          currency: payment.currency,
          paidAt,
        }),
      );
    } else if (
      payment.status === 'CANCELED' &&
      order.status === 'REFUND_PENDING' &&
      order.paymentId === payment.paymentKey
    ) {
      await this.markRefunded.execute(
        MarkBillingOrderRefundedCommand.of({
          billingOrderId: order.id,
          refundedAt: new Date(),
        }),
      );
    } else if (payment.status === 'CANCELED' && order.status === 'PAID') {
      throw new Error(
        'unexpected provider cancellation requires reconciliation',
      );
    }
  }
}

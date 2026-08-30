import { DomainError } from '../../../shared/domain/domain-error';
import { createId } from '../../../shared/domain/id';
import {
  BillingOrderIssued,
  BillingOrderPaid,
  BillingOrderRefunded,
  type BillingOrderDomainEvent,
} from './billing-order.events';
import {
  BillingOrderStatus,
  type BillingOrderStatus as BillingOrderStatusType,
} from './type/billing-order-status.type';
import { Money } from './vo/money.vo';
import { VoteUsagePrice } from './vo/vote-usage-price.vo';

type BillingOrderParams = {
  readonly id: string;
  readonly voteId: string;
  readonly commissionId: string;
  readonly orderedByUserPrincipalId: string;
  readonly productCode: string;
  readonly productName: string;
  readonly electorCount: number;
  readonly pricingUnitSize: number;
  readonly pricingUnitCount: number;
  readonly unitPrice: number;
  readonly amount: number;
  readonly currency: string;
  readonly status: BillingOrderStatusType;
  readonly paymentId?: string;
  readonly issuedAt: Date;
  readonly paidAt?: Date;
  readonly refundedAt?: Date;
};

export class BillingOrderAggregate {
  private readonly events: BillingOrderDomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly commissionId: string,
    readonly orderedByUserPrincipalId: string,
    readonly productCode: string,
    readonly productName: string,
    readonly electorCount: number,
    readonly pricingUnitSize: number,
    readonly pricingUnitCount: number,
    readonly unitPrice: number,
    readonly price: Money,
    public status: BillingOrderStatusType,
    public paymentId: string | undefined,
    readonly issuedAt: Date,
    public paidAt: Date | undefined,
    public refundedAt: Date | undefined,
  ) {}

  static issue(params: {
    id: string;
    voteId: string;
    commissionId: string;
    orderedByUserPrincipalId: string;
    price: VoteUsagePrice;
    issuedAt: Date;
  }): BillingOrderAggregate {
    const order = BillingOrderAggregate.build({
      id: params.id,
      voteId: params.voteId,
      commissionId: params.commissionId,
      orderedByUserPrincipalId: params.orderedByUserPrincipalId,
      productCode: params.price.productCode,
      productName: params.price.productName,
      electorCount: params.price.electorCount,
      pricingUnitSize: params.price.pricingUnitSize,
      pricingUnitCount: params.price.pricingUnitCount,
      unitPrice: params.price.unitPrice.amount,
      amount: params.price.money.amount,
      currency: params.price.money.currency,
      status: BillingOrderStatus.PendingPayment,
      issuedAt: params.issuedAt,
    });

    order.events.push(
      BillingOrderIssued.of({
        aggregateId: order.id,
        occurredAt: params.issuedAt,
      }),
    );
    return order;
  }

  static reconstitute(params: BillingOrderParams): BillingOrderAggregate {
    return BillingOrderAggregate.build(params);
  }

  markPaid(params: {
    paymentId: string;
    paidAmount: number;
    paidCurrency: string;
    paidAt: Date;
  }): void {
    const paymentId = createId(params.paymentId);
    const paidPrice = Money.of({
      amount: params.paidAmount,
      currency: params.paidCurrency,
    });

    if (!this.price.equals(paidPrice)) {
      throw new DomainError('paid amount does not match billing order price');
    }
    if (this.status === BillingOrderStatus.Paid) {
      if (this.paymentId !== paymentId) {
        throw new DomainError(
          'billing order is already paid by another payment',
        );
      }
      return;
    }
    if (this.status !== BillingOrderStatus.PendingPayment) {
      throw new DomainError('only pending billing orders can be paid');
    }

    this.status = BillingOrderStatus.Paid;
    this.paymentId = paymentId;
    this.paidAt = params.paidAt;
    this.events.push(
      BillingOrderPaid.of({
        aggregateId: this.id,
        occurredAt: params.paidAt,
      }),
    );
  }

  markRefunded(refundedAt: Date): void {
    if (this.status === BillingOrderStatus.Refunded) return;
    if (this.status !== BillingOrderStatus.Paid) {
      throw new DomainError('only paid billing orders can be refunded');
    }

    this.status = BillingOrderStatus.Refunded;
    this.refundedAt = refundedAt;
    this.events.push(
      BillingOrderRefunded.of({
        aggregateId: this.id,
        occurredAt: refundedAt,
      }),
    );
  }

  grantsVoteUsage(): boolean {
    return this.status === BillingOrderStatus.Paid;
  }

  pullEvents(): BillingOrderDomainEvent[] {
    const events = [...this.events];
    this.events.length = 0;
    return events;
  }

  private static build(params: BillingOrderParams): BillingOrderAggregate {
    const orderedByUserPrincipalId = params.orderedByUserPrincipalId.trim();
    const productCode = params.productCode.trim();
    const productName = params.productName.trim();

    if (orderedByUserPrincipalId.length === 0) {
      throw new DomainError(
        'billing order user principal id must not be empty',
      );
    }
    if (productCode.length === 0 || productName.length === 0) {
      throw new DomainError('billing order product snapshot is required');
    }
    if (params.status === BillingOrderStatus.Paid && !params.paymentId) {
      throw new DomainError('paid billing order must have a payment id');
    }

    const pricing = VoteUsagePrice.reconstitute({
      productCode,
      productName,
      electorCount: params.electorCount,
      pricingUnitSize: params.pricingUnitSize,
      pricingUnitCount: params.pricingUnitCount,
      unitPrice: params.unitPrice,
      amount: params.amount,
      currency: params.currency,
    });

    return new BillingOrderAggregate(
      createId(params.id),
      createId(params.voteId),
      createId(params.commissionId),
      orderedByUserPrincipalId,
      productCode,
      productName,
      pricing.electorCount,
      pricing.pricingUnitSize,
      pricing.pricingUnitCount,
      pricing.unitPrice.amount,
      pricing.money,
      params.status,
      params.paymentId,
      params.issuedAt,
      params.paidAt,
      params.refundedAt,
    );
  }
}

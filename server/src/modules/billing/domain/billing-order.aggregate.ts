import { DomainError } from '../../../shared/domain/domain-error';
import { createId } from '../../../shared/domain/id';
import {
  BillingOrderCanceled,
  BillingOrderIssued,
  BillingOrderPaid,
  BillingOrderRefundRequested,
  BillingOrderRefunded,
  type BillingOrderDomainEvent,
} from './billing-order.events';
import {
  BillingOrderStatus,
  type BillingOrderStatus as BillingOrderStatusType,
} from './type/billing-order-status.type';
import { Money } from './vo/money.vo';
import { VoteUsagePrice } from './vo/vote-usage-price.vo';
import { VoteUsageCancellationPolicy } from './vo/vote-usage-cancellation-policy.vo';

type BillingOrderParams = {
  readonly id: string;
  readonly version: number;
  readonly voteId: string;
  readonly commissionId: string;
  readonly orderedByUserPrincipalId: string;
  readonly productCode: string;
  readonly productName: string;
  readonly electorCount: number;
  readonly pricingUnitSize: number;
  readonly pricingUnitCount: number;
  readonly unitPrice: number;
  readonly blockchainStorageCount: number;
  readonly blockchainStorageUnitPrice: number;
  readonly identityVerificationRequired: boolean;
  readonly identityVerificationUnitPrice: number;
  readonly amount: number;
  readonly currency: string;
  readonly status: BillingOrderStatusType;
  readonly paymentId?: string;
  readonly issuedAt: Date;
  readonly cancellationWindowDays: number;
  readonly cancelableUntil: Date;
  readonly paidAt?: Date;
  readonly canceledAt?: Date;
  readonly cancellationReason?: string;
  readonly refundRequestedAt?: Date;
  readonly refundedAt?: Date;
};

export class BillingOrderAggregate {
  private readonly events: BillingOrderDomainEvent[] = [];

  private constructor(
    readonly id: string,
    public version: number,
    readonly voteId: string,
    readonly commissionId: string,
    readonly orderedByUserPrincipalId: string,
    readonly productCode: string,
    readonly productName: string,
    readonly electorCount: number,
    readonly pricingUnitSize: number,
    readonly pricingUnitCount: number,
    readonly unitPrice: number,
    readonly baseAmount: number,
    readonly blockchainStorageCount: number,
    readonly blockchainStorageUnitPrice: number,
    readonly blockchainStorageAmount: number,
    readonly identityVerificationRequired: boolean,
    readonly identityVerificationUnitPrice: number,
    readonly identityVerificationAmount: number,
    readonly price: Money,
    public status: BillingOrderStatusType,
    public paymentId: string | undefined,
    readonly issuedAt: Date,
    readonly cancellationWindowDays: number,
    readonly cancelableUntil: Date,
    public paidAt: Date | undefined,
    public canceledAt: Date | undefined,
    public cancellationReason: string | undefined,
    public refundRequestedAt: Date | undefined,
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
    const cancellationPolicy = VoteUsageCancellationPolicy.standard();
    const order = BillingOrderAggregate.build({
      id: params.id,
      version: 1,
      voteId: params.voteId,
      commissionId: params.commissionId,
      orderedByUserPrincipalId: params.orderedByUserPrincipalId,
      productCode: params.price.productCode,
      productName: params.price.productName,
      electorCount: params.price.electorCount,
      pricingUnitSize: params.price.pricingUnitSize,
      pricingUnitCount: params.price.pricingUnitCount,
      unitPrice: params.price.unitPrice.amount,
      blockchainStorageCount: params.price.blockchainStorageCount,
      blockchainStorageUnitPrice: params.price.blockchainStorageUnitPrice,
      identityVerificationRequired: params.price.identityVerificationRequired,
      identityVerificationUnitPrice: params.price.identityVerificationUnitPrice,
      amount: params.price.money.amount,
      currency: params.price.money.currency,
      status: BillingOrderStatus.PendingPayment,
      issuedAt: params.issuedAt,
      cancellationWindowDays: cancellationPolicy.windowDays,
      cancelableUntil: cancellationPolicy.calculateCancelableUntil(
        params.issuedAt,
      ),
    });

    order.events.push(
      BillingOrderIssued.of({
        aggregateId: order.id,
        aggregateVersion: order.version,
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
    if (
      this.status === BillingOrderStatus.Paid ||
      this.status === BillingOrderStatus.RefundPending ||
      this.status === BillingOrderStatus.Refunded
    ) {
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
    this.version += 1;
    this.events.push(
      BillingOrderPaid.of({
        aggregateId: this.id,
        aggregateVersion: this.version,
        occurredAt: params.paidAt,
      }),
    );
  }

  markRefunded(refundedAt: Date): void {
    if (this.status === BillingOrderStatus.Refunded) return;
    if (this.status !== BillingOrderStatus.RefundPending) {
      throw new DomainError(
        'only refund-pending billing orders can be refunded',
      );
    }

    this.status = BillingOrderStatus.Refunded;
    this.refundedAt = refundedAt;
    this.version += 1;
    this.events.push(
      BillingOrderRefunded.of({
        aggregateId: this.id,
        aggregateVersion: this.version,
        occurredAt: refundedAt,
      }),
    );
  }

  grantsVoteUsage(): boolean {
    return this.status === BillingOrderStatus.Paid;
  }

  isOrderedBy(userPrincipalId: string): boolean {
    return this.orderedByUserPrincipalId === userPrincipalId;
  }

  requestCancellation(params: { reason: string; canceledAt: Date }): void {
    const reason = params.reason.trim();
    if (reason.length === 0) {
      throw new DomainError('billing order cancellation reason is required');
    }
    if (reason.length > 500) {
      throw new DomainError(
        'billing order cancellation reason must not exceed 500 characters',
      );
    }

    if (
      this.status === BillingOrderStatus.Canceled ||
      this.status === BillingOrderStatus.RefundPending ||
      this.status === BillingOrderStatus.Refunded
    ) {
      if (this.cancellationReason !== reason) {
        throw new DomainError(
          'billing order was already canceled with another reason',
        );
      }
      return;
    }

    if (params.canceledAt.getTime() > this.cancelableUntil.getTime()) {
      throw new DomainError('billing order cancellation window has expired');
    }
    if (params.canceledAt.getTime() < this.issuedAt.getTime()) {
      throw new DomainError(
        'billing order cannot be canceled before it is issued',
      );
    }

    this.canceledAt = params.canceledAt;
    this.cancellationReason = reason;
    if (this.status === BillingOrderStatus.PendingPayment) {
      this.status = BillingOrderStatus.Canceled;
      this.version += 1;
      this.events.push(
        BillingOrderCanceled.of({
          aggregateId: this.id,
          aggregateVersion: this.version,
          occurredAt: params.canceledAt,
        }),
      );
      return;
    }
    if (this.status !== BillingOrderStatus.Paid) {
      throw new DomainError('billing order cannot be canceled');
    }

    this.status = BillingOrderStatus.RefundPending;
    this.refundRequestedAt = params.canceledAt;
    this.version += 1;
    this.events.push(
      BillingOrderRefundRequested.of({
        aggregateId: this.id,
        aggregateVersion: this.version,
        occurredAt: params.canceledAt,
      }),
    );
  }

  requestRefund(params: { reason: string; requestedAt: Date }): void {
    const reason = params.reason.trim();
    if (reason.length === 0) {
      throw new DomainError('billing order refund reason is required');
    }
    if (reason.length > 500) {
      throw new DomainError(
        'billing order refund reason must not exceed 500 characters',
      );
    }
    if (
      this.status === BillingOrderStatus.RefundPending ||
      this.status === BillingOrderStatus.Refunded
    ) {
      if (this.cancellationReason !== reason) {
        throw new DomainError(
          'billing order was already refunded for another reason',
        );
      }
      return;
    }
    if (this.status !== BillingOrderStatus.Paid || !this.paidAt) {
      throw new DomainError('only paid billing orders can request a refund');
    }
    if (params.requestedAt.getTime() < this.paidAt.getTime()) {
      throw new DomainError('billing order cannot be refunded before payment');
    }

    this.status = BillingOrderStatus.RefundPending;
    this.canceledAt = params.requestedAt;
    this.cancellationReason = reason;
    this.refundRequestedAt = params.requestedAt;
    this.version += 1;
    this.events.push(
      BillingOrderRefundRequested.of({
        aggregateId: this.id,
        aggregateVersion: this.version,
        occurredAt: params.requestedAt,
      }),
    );
  }

  domainEvents(): readonly BillingOrderDomainEvent[] {
    return [...this.events];
  }

  clearDomainEvents(): void {
    this.events.length = 0;
  }

  private static build(params: BillingOrderParams): BillingOrderAggregate {
    const orderedByUserPrincipalId = params.orderedByUserPrincipalId.trim();
    const productCode = params.productCode.trim();
    const productName = params.productName.trim();
    const cancellationPolicy = VoteUsageCancellationPolicy.of({
      windowDays: params.cancellationWindowDays,
    });

    if (orderedByUserPrincipalId.length === 0) {
      throw new DomainError(
        'billing order user principal id must not be empty',
      );
    }
    if (productCode.length === 0 || productName.length === 0) {
      throw new DomainError('billing order product snapshot is required');
    }
    if (!Number.isInteger(params.version) || params.version < 1) {
      throw new DomainError('billing order version must be a positive integer');
    }
    if (
      (params.status === BillingOrderStatus.Paid ||
        params.status === BillingOrderStatus.RefundPending ||
        params.status === BillingOrderStatus.Refunded) &&
      (!params.paymentId || !params.paidAt)
    ) {
      throw new DomainError(
        'paid billing order lifecycle must have payment metadata',
      );
    }
    const expectedCancelableUntil = cancellationPolicy.calculateCancelableUntil(
      params.issuedAt,
    );
    if (
      expectedCancelableUntil.getTime() !== params.cancelableUntil.getTime()
    ) {
      throw new DomainError(
        'billing order cancellation deadline does not match policy snapshot',
      );
    }
    if (
      (params.status === BillingOrderStatus.Canceled ||
        params.status === BillingOrderStatus.RefundPending ||
        params.status === BillingOrderStatus.Refunded) &&
      (!params.canceledAt || !params.cancellationReason)
    ) {
      throw new DomainError(
        'canceled billing order must have cancellation metadata',
      );
    }
    if (
      (params.status === BillingOrderStatus.RefundPending ||
        params.status === BillingOrderStatus.Refunded) &&
      !params.refundRequestedAt
    ) {
      throw new DomainError(
        'refunding billing order must have a refund request timestamp',
      );
    }
    if (params.status === BillingOrderStatus.Refunded && !params.refundedAt) {
      throw new DomainError(
        'refunded billing order must have a refund timestamp',
      );
    }

    const pricing = VoteUsagePrice.reconstitute({
      productCode,
      productName,
      electorCount: params.electorCount,
      pricingUnitSize: params.pricingUnitSize,
      pricingUnitCount: params.pricingUnitCount,
      unitPrice: params.unitPrice,
      blockchainStorageCount: params.blockchainStorageCount,
      blockchainStorageUnitPrice: params.blockchainStorageUnitPrice,
      identityVerificationRequired: params.identityVerificationRequired,
      identityVerificationUnitPrice: params.identityVerificationUnitPrice,
      amount: params.amount,
      currency: params.currency,
    });

    return new BillingOrderAggregate(
      createId(params.id),
      params.version,
      createId(params.voteId),
      createId(params.commissionId),
      orderedByUserPrincipalId,
      productCode,
      productName,
      pricing.electorCount,
      pricing.pricingUnitSize,
      pricing.pricingUnitCount,
      pricing.unitPrice.amount,
      pricing.baseAmount,
      pricing.blockchainStorageCount,
      pricing.blockchainStorageUnitPrice,
      pricing.blockchainStorageAmount,
      pricing.identityVerificationRequired,
      pricing.identityVerificationUnitPrice,
      pricing.identityVerificationAmount,
      pricing.money,
      params.status,
      params.paymentId,
      params.issuedAt,
      cancellationPolicy.windowDays,
      params.cancelableUntil,
      params.paidAt,
      params.canceledAt,
      params.cancellationReason,
      params.refundRequestedAt,
      params.refundedAt,
    );
  }
}

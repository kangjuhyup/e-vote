import type { BillingOrderStatus } from '../../../../domain/type/billing-order-status.type';

export class BillingOrderView {
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
    readonly amount: number,
    readonly currency: string,
    readonly status: BillingOrderStatus,
    readonly paymentId: string | undefined,
    readonly issuedAt: Date,
    readonly cancellationWindowDays: number,
    readonly cancelableUntil: Date,
    readonly paidAt: Date | undefined,
    readonly canceledAt: Date | undefined,
    readonly cancellationReason: string | undefined,
    readonly refundRequestedAt: Date | undefined,
    readonly refundedAt: Date | undefined,
  ) {}

  static of(params: {
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
    readonly status: BillingOrderStatus;
    readonly paymentId?: string;
    readonly issuedAt: Date;
    readonly cancellationWindowDays: number;
    readonly cancelableUntil: Date;
    readonly paidAt?: Date;
    readonly canceledAt?: Date;
    readonly cancellationReason?: string;
    readonly refundRequestedAt?: Date;
    readonly refundedAt?: Date;
  }): BillingOrderView {
    return new BillingOrderView(
      params.id,
      params.voteId,
      params.commissionId,
      params.orderedByUserPrincipalId,
      params.productCode,
      params.productName,
      params.electorCount,
      params.pricingUnitSize,
      params.pricingUnitCount,
      params.unitPrice,
      params.amount,
      params.currency,
      params.status,
      params.paymentId,
      params.issuedAt,
      params.cancellationWindowDays,
      params.cancelableUntil,
      params.paidAt,
      params.canceledAt,
      params.cancellationReason,
      params.refundRequestedAt,
      params.refundedAt,
    );
  }

  isOrderedBy(userPrincipalId: string): boolean {
    return this.orderedByUserPrincipalId === userPrincipalId;
  }
}

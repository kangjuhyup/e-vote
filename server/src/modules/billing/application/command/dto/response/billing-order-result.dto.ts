import type { BillingOrderStatus } from '../../../../domain/type/billing-order-status.type';

type BillingOrderResultSource = {
  readonly id: string;
  readonly voteId: string;
  readonly productCode: string;
  readonly productName: string;
  readonly electorCount: number;
  readonly pricingUnitSize: number;
  readonly pricingUnitCount: number;
  readonly unitPrice: number;
  readonly price: { readonly amount: number; readonly currency: string };
  readonly status: BillingOrderStatus;
  readonly paymentId?: string;
  readonly issuedAt: Date;
  readonly paidAt?: Date;
};

export class BillingOrderResult {
  private constructor(
    readonly id: string,
    readonly voteId: string,
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
    readonly paidAt: Date | undefined,
  ) {}

  static of(source: BillingOrderResultSource): BillingOrderResult {
    return new BillingOrderResult(
      source.id,
      source.voteId,
      source.productCode,
      source.productName,
      source.electorCount,
      source.pricingUnitSize,
      source.pricingUnitCount,
      source.unitPrice,
      source.price.amount,
      source.price.currency,
      source.status,
      source.paymentId,
      source.issuedAt,
      source.paidAt,
    );
  }
}

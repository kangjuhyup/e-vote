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
  readonly baseAmount: number;
  readonly blockchainStorageCount: number;
  readonly blockchainStorageUnitPrice: number;
  readonly blockchainStorageAmount: number;
  readonly price: { readonly amount: number; readonly currency: string };
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
    readonly baseAmount: number,
    readonly blockchainStorageCount: number,
    readonly blockchainStorageUnitPrice: number,
    readonly blockchainStorageAmount: number,
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
      source.baseAmount,
      source.blockchainStorageCount,
      source.blockchainStorageUnitPrice,
      source.blockchainStorageAmount,
      source.price.amount,
      source.price.currency,
      source.status,
      source.paymentId,
      source.issuedAt,
      source.cancellationWindowDays,
      source.cancelableUntil,
      source.paidAt,
      source.canceledAt,
      source.cancellationReason,
      source.refundRequestedAt,
      source.refundedAt,
    );
  }
}

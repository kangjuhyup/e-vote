import { BillingOrderAggregate } from '../../../domain/billing-order.aggregate';
import type { BillingOrderStatus } from '../../../domain/type/billing-order-status.type';

export type BillingOrderPersistence = {
  readonly id: string;
  readonly version: number | string;
  readonly voteId: string;
  readonly commissionId: string;
  readonly orderedByUserPrincipalId: string;
  readonly productCode: string;
  readonly productName: string;
  readonly electorCount: number | string;
  readonly pricingUnitSize: number | string;
  readonly pricingUnitCount: number | string;
  readonly unitPrice: number | string;
  readonly blockchainStorageCount: number | string;
  readonly blockchainStorageUnitPrice: number | string;
  readonly amount: number | string;
  readonly currency: string;
  readonly status: BillingOrderStatus;
  readonly paymentId: string | null;
  readonly issuedAt: Date;
  readonly cancellationWindowDays: number | string;
  readonly cancelableUntil: Date;
  readonly paidAt: Date | null;
  readonly canceledAt: Date | null;
  readonly cancellationReason: string | null;
  readonly refundRequestedAt: Date | null;
  readonly refundedAt: Date | null;
};

export class BillingOrderMapper {
  static toDomain(entity: BillingOrderPersistence): BillingOrderAggregate {
    return BillingOrderAggregate.reconstitute({
      id: entity.id,
      version: Number(entity.version),
      voteId: entity.voteId,
      commissionId: entity.commissionId,
      orderedByUserPrincipalId: entity.orderedByUserPrincipalId,
      productCode: entity.productCode,
      productName: entity.productName,
      electorCount: Number(entity.electorCount),
      pricingUnitSize: Number(entity.pricingUnitSize),
      pricingUnitCount: Number(entity.pricingUnitCount),
      unitPrice: Number(entity.unitPrice),
      blockchainStorageCount: Number(entity.blockchainStorageCount),
      blockchainStorageUnitPrice: Number(entity.blockchainStorageUnitPrice),
      amount: Number(entity.amount),
      currency: entity.currency,
      status: entity.status,
      paymentId: entity.paymentId ?? undefined,
      issuedAt: entity.issuedAt,
      cancellationWindowDays: Number(entity.cancellationWindowDays),
      cancelableUntil: entity.cancelableUntil,
      paidAt: entity.paidAt ?? undefined,
      canceledAt: entity.canceledAt ?? undefined,
      cancellationReason: entity.cancellationReason ?? undefined,
      refundRequestedAt: entity.refundRequestedAt ?? undefined,
      refundedAt: entity.refundedAt ?? undefined,
    });
  }
}
